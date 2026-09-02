import { useSyncExternalStore } from 'react'
import { DEPOT, trucks, type RoutePoint } from '@/lib/data'
import {
  OWN_TRUCK_CAPACITY,
  resetSimulatedDemand,
  setSimulatedDemand,
  thirdPartyTrucks,
} from '@/lib/allocation'
import type { AggregatedOrder } from '@/lib/orders'

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export type PlanItem = { name: string; qty: number }

export type PlanStop = {
  key: string
  place: string
  address: string
  point: RoutePoint | null
  totalBoxes: number
  items: PlanItem[]
}

export type RowError = { row: number; reason: { ar: string; en: string } }

export type PlanRoute = {
  truckId: string
  provider: 'own' | 'thirdParty'
  label: { ar: string; en: string }
  driver: { ar: string; en: string }
  identityColor: string
  capacity: number
  /** Trips allowed per day for this truck. */
  maxTripsPerDay: number
  /** Trips actually needed for the assigned load. */
  trips: number
  stops: PlanStop[]
  totalBoxes: number
  /** Round-trip distance depot → stops → depot (km). */
  distanceKm: number
  /** Geographic spread of the assigned stops (km², bounding box). */
  areaKm2: number
}

export type DailyPlan = {
  fileName: string
  createdAt: number
  receivedRows: number
  rowErrors: RowError[]
  stops: PlanStop[]
  routes: PlanRoute[]
  unassignedStops: PlanStop[]
  totalBoxes: number
  trucksUsed: number
  thirdPartyActivated: number
  /** Sum of all route distances (km). */
  totalDistanceKm: number
  /** Theoretical lower bound (minimum spanning tree over depot + stops, km). */
  idealDistanceKm: number
  /** ideal / actual as a percentage — "كفاءة توزيع المسافات". */
  distanceEfficiency: number
}


/* ------------------------------------------------------------------ *
 * Parsing (Excel / CSV)
 * ------------------------------------------------------------------ */

const HEADERS = {
  place: ['place', 'name', 'store', 'warehouse', 'customer', 'stop', 'المكان', 'اسم المكان', 'المستودع', 'المتجر', 'العميل', 'نقطة التوصيل'],
  address: ['address', 'location', 'العنوان', 'الموقع'],
  lat: ['lat', 'latitude', 'خط العرض', 'العرض'],
  lng: ['lng', 'lon', 'long', 'longitude', 'خط الطول', 'الطول'],
  item: ['item', 'product', 'sku', 'الصنف', 'المنتج', 'البضاعة'],
  qty: ['qty', 'quantity', 'boxes', 'cases', 'الكمية', 'عدد الصناديق', 'الصناديق'],
}

function normalizeKey(key: string) {
  return String(key).trim().toLowerCase().replace(/[_\-\s]+/g, ' ')
}

function pick(row: Record<string, unknown>, candidates: string[]) {
  const entries = Object.entries(row).map(([k, v]) => [normalizeKey(k), v] as const)
  for (const candidate of candidates) {
    const hit = entries.find(([k]) => k === candidate || k.includes(candidate))
    if (hit && hit[1] !== undefined && hit[1] !== null && String(hit[1]).trim() !== '') {
      return String(hit[1]).trim()
    }
  }
  return ''
}

export function parseCsv(text: string): Array<Record<string, unknown>> {
  const clean = text.replace(/^\uFEFF/, '').trim()
  if (!clean) return []
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== '')
  const firstLine = lines[0] ?? ''
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const header = splitCsvLine(firstLine, delimiter)
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line, delimiter)
    const row: Record<string, unknown> = {}
    header.forEach((h, i) => {
      row[h] = cells[i] ?? ''
    })
    return row
  })
}

function splitCsvLine(line: string, delimiter: string) {
  const out: string[] = []
  let current = ''
  let quoted = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else quoted = !quoted
    } else if (char === delimiter && !quoted) {
      out.push(current.trim())
      current = ''
    } else current += char
  }
  out.push(current.trim())
  return out
}

export async function readSpreadsheet(file: File): Promise<Array<Record<string, unknown>>> {
  if (/\.csv$/i.test(file.name)) return parseCsv(await file.text())
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  if (!sheet) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
}

/** Groups repeated rows for the same place into one order per stop. */
export function buildStops(rows: Array<Record<string, unknown>>) {
  const map = new Map<string, PlanStop>()
  const rowErrors: RowError[] = []

  rows.forEach((row, index) => {
    const rowNumber = index + 2 // +1 header, +1 to be 1-based
    const place = pick(row, HEADERS.place)
    const item = pick(row, HEADERS.item)
    const qtyRaw = pick(row, HEADERS.qty)
    const qty = Number(String(qtyRaw).replace(/[^\d.-]/g, ''))

    if (!place) {
      rowErrors.push({
        row: rowNumber,
        reason: { ar: 'اسم نقطة التوصيل مفقود', en: 'Missing delivery point name' },
      })
      return
    }
    if (!qtyRaw || !Number.isFinite(qty) || qty <= 0) {
      rowErrors.push({
        row: rowNumber,
        reason: { ar: 'الكمية غير صحيحة أو مفقودة', en: 'Invalid or missing quantity' },
      })
      return
    }

    const address = pick(row, HEADERS.address)
    const lat = Number(pick(row, HEADERS.lat))
    const lng = Number(pick(row, HEADERS.lng))
    const point =
      Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0 ? { lat, lng } : null

    const key = place.trim().toLowerCase()
    let stop = map.get(key)
    if (!stop) {
      stop = { key, place, address, point, totalBoxes: 0, items: [] }
      map.set(key, stop)
    }
    if (!stop.address && address) stop.address = address
    if (!stop.point && point) stop.point = point

    const label = item || (/* fallback */ 'صنف غير محدد')
    const existing = stop.items.find((i) => i.name === label)
    if (existing) existing.qty += qty
    else stop.items.push({ name: label, qty })
    stop.totalBoxes += qty
  })

  const stops = [...map.values()]
  stops.forEach((s) => s.items.sort((a, b) => b.qty - a.qty))
  return { stops, rowErrors }
}

/* ------------------------------------------------------------------ *
 * VRP: geography + trips + distance aware assignment
 * ------------------------------------------------------------------ */

function distance(a: RoutePoint, b: RoutePoint) {
  const dLat = a.lat - b.lat
  const dLng = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111
}

/** Trips a truck is allowed to run per working day. */
export const OWN_MAX_TRIPS_PER_DAY = 2
export const THIRD_PARTY_MAX_TRIPS_PER_DAY = 1

type Vehicle = {
  truckId: string
  provider: 'own' | 'thirdParty'
  label: { ar: string; en: string }
  driver: { ar: string; en: string }
  identityColor: string
  capacity: number
  maxTripsPerDay: number
}

function vehicles(): Vehicle[] {
  return [
    ...trucks.map((truck) => ({
      truckId: truck.id,
      provider: 'own' as const,
      label: { ar: truck.id, en: truck.id },
      driver: truck.driver,
      identityColor: truck.identityColor,
      capacity: OWN_TRUCK_CAPACITY,
      maxTripsPerDay: OWN_MAX_TRIPS_PER_DAY,
    })),
    ...thirdPartyTrucks.map((truck) => ({
      truckId: truck.id,
      provider: 'thirdParty' as const,
      label: truck.name,
      driver: { ar: 'مقدم خدمة متعاقد', en: 'Contracted provider' },
      identityColor: truck.identityColor,
      capacity: truck.capacity,
      maxTripsPerDay: THIRD_PARTY_MAX_TRIPS_PER_DAY,
    })),
  ]
}

/** Daily allowance = capacity × allowed trips. */
function dailyAllowance(v: Vehicle) {
  return v.capacity * v.maxTripsPerDay
}

function centroid(points: RoutePoint[]): RoutePoint {
  if (points.length === 0) return DEPOT
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length
  return { lat, lng }
}

function boundingArea(points: RoutePoint[]) {
  if (points.length < 2) return 0
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const height = (maxLat - minLat) * 111
  const width =
    (maxLng - minLng) * 111 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180)
  return Math.round(height * width * 10) / 10
}

/** Round-trip distance depot → stops (in order) → depot, km. */
export function routeDistanceKm(stops: PlanStop[]) {
  const points = stops.map((s) => s.point).filter((p): p is RoutePoint => Boolean(p))
  if (points.length === 0) return 0
  let total = 0
  let cursor: RoutePoint = DEPOT
  for (const point of points) {
    total += distance(cursor, point)
    cursor = point
  }
  total += distance(cursor, DEPOT)
  return Math.round(total * 10) / 10
}

/** Minimum spanning tree over depot + all stops — theoretical distance floor. */
function idealDistance(stops: PlanStop[]) {
  const points = [DEPOT, ...stops.map((s) => s.point).filter((p): p is RoutePoint => Boolean(p))]
  if (points.length < 2) return 0
  const visited = new Set<number>([0])
  let total = 0
  while (visited.size < points.length) {
    let best = Infinity
    let bestIndex = -1
    points.forEach((point, index) => {
      if (visited.has(index)) return
      for (const seen of visited) {
        const from = points[seen]
        if (!from) continue
        const d = distance(from, point)
        if (d < best) {
          best = d
          bestIndex = index
        }
      }
    })
    if (bestIndex === -1) break
    visited.add(bestIndex)
    total += best
  }
  return Math.round(total * 10) / 10
}

export function planRoutes(stops: PlanStop[]) {
  const fleet = vehicles()
  const routes: PlanRoute[] = fleet.map((v) => ({
    ...v,
    stops: [],
    totalBoxes: 0,
    trips: 0,
    distanceKm: 0,
    areaKm2: 0,
  }))
  // Farthest-first seeding keeps distant clusters together instead of
  // greedily filling the first truck with whatever is heaviest.
  const pending = [...stops].sort((a, b) => {
    const da = a.point ? distance(DEPOT, a.point) : 0
    const db = b.point ? distance(DEPOT, b.point) : 0
    if (db !== da) return db - da
    return b.totalBoxes - a.totalBoxes
  })
  const unassignedStops: PlanStop[] = []

  for (const route of routes) {
    if (pending.length === 0) break
    const allowance = dailyAllowance(route as unknown as Vehicle)
    let cursor: RoutePoint = DEPOT
    const assignedPoints: RoutePoint[] = []

    // Seed with the farthest remaining stop that fits — anchors the cluster.
    const seedIndex = pending.findIndex((stop) => stop.totalBoxes <= allowance)
    if (seedIndex === -1) continue
    const [seed] = pending.splice(seedIndex, 1)
    if (!seed) continue
    route.stops.push(seed)
    route.totalBoxes += seed.totalBoxes
    if (seed.point) {
      cursor = seed.point
      assignedPoints.push(seed.point)
    }

    let guard = pending.length + 1
    while (guard-- > 0) {
      const anchor = centroid(assignedPoints)
      let bestIndex = -1
      let bestScore = Infinity
      pending.forEach((stop, index) => {
        if (route.totalBoxes + stop.totalBoxes > allowance) return
        // Cost = travel from the current position + how much the stop
        // stretches the truck's geographic area (compactness penalty).
        const score = stop.point
          ? distance(cursor, stop.point) + 0.4 * distance(anchor, stop.point)
          : 1000 + index
        if (score < bestScore) {
          bestScore = score
          bestIndex = index
        }
      })
      if (bestIndex === -1) break
      const [stop] = pending.splice(bestIndex, 1)
      if (!stop) break
      route.stops.push(stop)
      route.totalBoxes += stop.totalBoxes
      if (stop.point) {
        cursor = stop.point
        assignedPoints.push(stop.point)
      }
    }

    // Order the cluster with a nearest-neighbour sweep from the depot,
    // so the driving sequence itself is short.
    const ordered: PlanStop[] = []
    const remaining = [...route.stops]
    let seq: RoutePoint = DEPOT
    while (remaining.length > 0) {
      let best = 0
      let bestScore = Infinity
      remaining.forEach((stop, index) => {
        const score = stop.point ? distance(seq, stop.point) : Infinity - index
        if (score < bestScore) {
          bestScore = score
          best = index
        }
      })
      const [next] = remaining.splice(best, 1)
      if (!next) break
      ordered.push(next)
      if (next.point) seq = next.point
    }
    route.stops = ordered
    route.trips = Math.min(
      route.maxTripsPerDay,
      Math.max(1, Math.ceil(route.totalBoxes / route.capacity)),
    )
    route.distanceKm = routeDistanceKm(route.stops)
    route.areaKm2 = boundingArea(assignedPoints)
  }

  // Anything still pending exceeds the whole fleet (own + third party).
  unassignedStops.push(...pending)

  const used = routes.filter((r) => r.stops.length > 0)
  const totalDistanceKm = Math.round(used.reduce((s, r) => s + r.distanceKm, 0) * 10) / 10
  const idealDistanceKm = idealDistance(stops)
  const distanceEfficiency =
    totalDistanceKm > 0 && idealDistanceKm > 0
      ? Math.min(100, Math.round((idealDistanceKm / totalDistanceKm) * 100))
      : 0

  return {
    routes,
    unassignedStops,
    trucksUsed: used.length,
    thirdPartyActivated: used.filter((r) => r.provider === 'thirdParty').length,
    totalDistanceKm,
    idealDistanceKm,
    distanceEfficiency,
  }
}

export function buildDailyPlan(
  fileName: string,
  rows: Array<Record<string, unknown>>,
): DailyPlan {
  const { stops, rowErrors } = buildStops(rows)
  const {
    routes,
    unassignedStops,
    trucksUsed,
    thirdPartyActivated,
    totalDistanceKm,
    idealDistanceKm,
    distanceEfficiency,
  } = planRoutes(stops)
  const totalBoxes = stops.reduce((sum, s) => sum + s.totalBoxes, 0)

  return {
    fileName,
    createdAt: Date.now(),
    receivedRows: rows.length,
    rowErrors,
    stops,
    routes,
    unassignedStops,
    totalBoxes,
    trucksUsed,
    thirdPartyActivated,
    totalDistanceKm,
    idealDistanceKm,
    distanceEfficiency,
  }
}


/* ------------------------------------------------------------------ *
 * Shared store
 * ------------------------------------------------------------------ */

let plan: DailyPlan | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function setDailyPlan(next: DailyPlan) {
  plan = next
  setSimulatedDemand(next.totalBoxes)
  emit()
}

export function clearDailyPlan() {
  plan = null
  resetSimulatedDemand()
  emit()
}

export function useDailyPlan() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => plan,
    () => null,
  )
}

/** Uploaded stops mapped to the shape the existing Order Details panel renders. */
export function planAggregatedOrders(current: DailyPlan): AggregatedOrder[] {
  return current.routes.flatMap((route) =>
    route.stops.map((stop, index) => ({
      key: `${route.truckId}::${stop.key}`,
      truckId: route.truckId,
      place: { ar: stop.place, en: stop.place },
      totalBoxes: stop.totalBoxes,
      items: stop.items.map((item) => ({ ar: item.name, en: item.name, qty: item.qty })),
      order: index + 1,
    })),
  ) as AggregatedOrder[]
}
