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
  stops: PlanStop[]
  totalBoxes: number
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
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
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
 * VRP: capacity-aware nearest-neighbour assignment
 * ------------------------------------------------------------------ */

function distance(a: RoutePoint, b: RoutePoint) {
  const dLat = a.lat - b.lat
  const dLng = (a.lng - b.lng) * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180))
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111
}

type Vehicle = {
  truckId: string
  provider: 'own' | 'thirdParty'
  label: { ar: string; en: string }
  driver: { ar: string; en: string }
  identityColor: string
  capacity: number
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
    })),
    ...thirdPartyTrucks.map((truck) => ({
      truckId: truck.id,
      provider: 'thirdParty' as const,
      label: truck.name,
      driver: { ar: 'مقدم خدمة متعاقد', en: 'Contracted provider' },
      identityColor: truck.identityColor,
      capacity: truck.capacity,
    })),
  ]
}

export function planRoutes(stops: PlanStop[]) {
  const fleet = vehicles()
  const routes: PlanRoute[] = fleet.map((v) => ({ ...v, stops: [], totalBoxes: 0 }))
  const pending = [...stops].sort((a, b) => b.totalBoxes - a.totalBoxes)
  const unassignedStops: PlanStop[] = []

  for (const route of routes) {
    if (pending.length === 0) break
    let cursor: RoutePoint = DEPOT
    let guard = pending.length + 1
    while (guard-- > 0) {
      // Nearest stop that still fits the remaining capacity.
      let bestIndex = -1
      let bestScore = Infinity
      pending.forEach((stop, index) => {
        if (route.totalBoxes + stop.totalBoxes > route.capacity) return
        const score = stop.point ? distance(cursor, stop.point) : index
        if (score < bestScore) {
          bestScore = score
          bestIndex = index
        }
      })
      if (bestIndex === -1) break
      const [stop] = pending.splice(bestIndex, 1)
      route.stops.push(stop)
      route.totalBoxes += stop.totalBoxes
      if (stop.point) cursor = stop.point
    }
  }

  // Anything still pending exceeds the whole fleet (own + third party).
  unassignedStops.push(...pending)

  const used = routes.filter((r) => r.stops.length > 0)
  return {
    routes,
    unassignedStops,
    trucksUsed: used.length,
    thirdPartyActivated: used.filter((r) => r.provider === 'thirdParty').length,
  }
}

export function buildDailyPlan(
  fileName: string,
  rows: Array<Record<string, unknown>>,
): DailyPlan {
  const { stops, rowErrors } = buildStops(rows)
  const { routes, unassignedStops, trucksUsed, thirdPartyActivated } = planRoutes(stops)
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
