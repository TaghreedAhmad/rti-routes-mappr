import { useSyncExternalStore } from 'react'
import { DEPOT, trucks, type RoutePoint } from '@/lib/data'
import { stopOrders } from '@/lib/orders'

/** Capacity in delivery units (boxes) for each truck of our own fleet. */
export const OWN_TRUCK_CAPACITY = 10

export type ContractedTruck = {
  id: string
  provider: 'thirdParty'
  name: { ar: string; en: string }
  capacity: number
  identityColor: string
  start: RoutePoint
}

/** External contractor ("Third Party") fleet — inactive until our fleet overflows. */
export const thirdPartyTrucks: ContractedTruck[] = [
  {
    id: 'Third Party - 1',
    provider: 'thirdParty',
    name: { ar: 'الطرف الثالث - 1', en: 'Third Party - 1' },
    capacity: 6,
    identityColor: '#9333ea',
    start: DEPOT,
  },
  {
    id: 'Third Party - 2',
    provider: 'thirdParty',
    name: { ar: 'الطرف الثالث - 2', en: 'Third Party - 2' },
    capacity: 8,
    identityColor: '#db2777',
    start: DEPOT,
  },
]

export const OWN_FLEET_CAPACITY = trucks.length * OWN_TRUCK_CAPACITY
export const THIRD_PARTY_CAPACITY = thirdPartyTrucks.reduce((s, t) => s + t.capacity, 0)

/** Baseline demand = all aggregated order boxes coming from the source rows. */
export const BASELINE_DEMAND = stopOrders.reduce((sum, o) => sum + o.totalBoxes, 0)

/* ------------------------------------------------------------------ *
 * Emergency classification (separate from ordinary demand overflow)
 * ------------------------------------------------------------------ */

export type EmergencyReason = 'truckBreakdown' | 'suddenCancellation' | 'urgentOrder'

export const emergencyLabels: Record<EmergencyReason, { ar: string; en: string }> = {
  truckBreakdown: { ar: 'تعطل شاحنة من أسطولنا', en: 'Own truck breakdown' },
  suddenCancellation: { ar: 'إلغاء مفاجئ', en: 'Sudden cancellation' },
  urgentOrder: { ar: 'طلب عاجل خارج الجدول', en: 'Urgent unscheduled order' },
}

export type EmergencyState = {
  active: boolean
  reason: EmergencyReason | null
  /** Extra urgent boxes injected outside the normal plan. */
  extraDemand: number
  /** Own truck taken out of service (breakdown scenarios). */
  disabledTruckId: string | null
  at: number | null
}

const NO_EMERGENCY: EmergencyState = {
  active: false,
  reason: null,
  extraDemand: 0,
  disabledTruckId: null,
  at: null,
}

/** Which trigger activated a truck — drives the visual distinction in the UI. */
export type ActivationKind = 'none' | 'overflow' | 'emergency'

export type Assignment = {
  truckId: string
  provider: 'own' | 'thirdParty'
  capacity: number
  assigned: number
  /** Percentage of the truck capacity that is used */
  utilization: number
  active: boolean
  activation: ActivationKind
  /** Own truck removed from service by an emergency. */
  outOfService?: boolean
}

export type AllocationResult = {
  demand: number
  ownAssigned: number
  overflow: number
  unassigned: number
  activatedThirdParty: number
  emergencyActivated: number
  emergency: EmergencyState
  assignments: Assignment[]
}

/**
 * Fills our own fleet first (up to capacity, balanced), then activates
 * Third Party trucks only for the overflow.
 *
 * During an emergency the priority flips: urgent volume goes straight to the
 * contracted fleet (highest priority), and a broken-down own truck is skipped.
 */
export function allocateDemand(
  demand: number,
  emergency: EmergencyState = NO_EMERGENCY,
): AllocationResult {
  const disabledId =
    emergency.active && emergency.reason === 'truckBreakdown'
      ? (emergency.disabledTruckId ?? trucks[0]?.id ?? null)
      : null

  const own: Assignment[] = trucks.map((truck) => ({
    truckId: truck.id,
    provider: 'own' as const,
    capacity: truck.id === disabledId ? 0 : OWN_TRUCK_CAPACITY,
    assigned: 0,
    utilization: 0,
    active: false,
    activation: 'none' as ActivationKind,
    outOfService: truck.id === disabledId,
  }))

  const external: Assignment[] = thirdPartyTrucks.map((truck) => ({
    truckId: truck.id,
    provider: 'thirdParty' as const,
    capacity: truck.capacity,
    assigned: 0,
    utilization: 0,
    active: false,
    activation: 'none' as ActivationKind,
  }))

  const baseDemand = Math.max(0, Math.round(demand))
  const urgent = emergency.active ? Math.max(0, Math.round(emergency.extraDemand)) : 0

  // 1) Emergency volume goes to contracted trucks first (immediate activation).
  let remainingUrgent = urgent
  const bySizeDesc = [...external].sort((x, y) => y.capacity - x.capacity)
  for (const a of bySizeDesc) {
    if (remainingUrgent === 0) break
    const take = Math.min(a.capacity - a.assigned, remainingUrgent)
    if (take > 0) {
      a.assigned += take
      a.activation = 'emergency'
      remainingUrgent -= take
    }
  }

  // 2) Regular demand across our own (available) fleet, balanced round-robin.
  let remaining = baseDemand + remainingUrgent
  let progressed = true
  while (remaining > 0 && progressed) {
    progressed = false
    for (const a of own) {
      if (remaining === 0) break
      if (a.assigned < a.capacity) {
        a.assigned += 1
        remaining -= 1
        progressed = true
      }
    }
  }

  // 3) Ordinary overflow spills onto whatever contracted capacity is left.
  const overflow = remaining
  for (const a of bySizeDesc) {
    if (remaining === 0) break
    const take = Math.min(a.capacity - a.assigned, remaining)
    if (take > 0) {
      a.assigned += take
      if (a.activation !== 'emergency') a.activation = 'overflow'
      remaining -= take
    }
  }

  const assignments = [...own, ...external]
  for (const a of assignments) {
    a.utilization = a.capacity === 0 ? 0 : Math.round((a.assigned / a.capacity) * 100)
    a.active = a.assigned > 0
    if (a.active && a.provider === 'own' && a.activation === 'none') a.activation = 'overflow'
    if (!a.active) a.activation = 'none'
  }

  const ownAssigned = own.reduce((s, a) => s + a.assigned, 0)

  return {
    demand: baseDemand + urgent,
    ownAssigned,
    overflow,
    unassigned: remaining,
    activatedThirdParty: external.filter((a) => a.active).length,
    emergencyActivated: external.filter((a) => a.activation === 'emergency').length,
    emergency,
    assignments,
  }
}

/* ------------------------------------------------------------------ *
 * Tiny shared store so the dashboard stress test and the fleet table
 * read the same simulated demand.
 * ------------------------------------------------------------------ */

let simulatedDemand = BASELINE_DEMAND
let emergencyState: EmergencyState = NO_EMERGENCY
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function setSimulatedDemand(next: number) {
  simulatedDemand = Math.max(0, Math.round(next))
  emit()
}

export function resetSimulatedDemand() {
  setSimulatedDemand(BASELINE_DEMAND)
}

export function triggerEmergency(
  reason: EmergencyReason,
  options?: { extraDemand?: number; disabledTruckId?: string | null },
) {
  const defaults: Record<EmergencyReason, number> = {
    truckBreakdown: OWN_TRUCK_CAPACITY,
    suddenCancellation: 4,
    urgentOrder: 6,
  }
  emergencyState = {
    active: true,
    reason,
    extraDemand: options?.extraDemand ?? defaults[reason],
    disabledTruckId:
      options?.disabledTruckId ??
      (reason === 'truckBreakdown' ? (trucks[0]?.id ?? null) : null),
    at: Date.now(),
  }
  emit()
}

export function clearEmergency() {
  emergencyState = NO_EMERGENCY
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return simulatedDemand
}

function getEmergencySnapshot() {
  return emergencyState
}

export function useSimulatedDemand() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useEmergency() {
  return useSyncExternalStore(subscribe, getEmergencySnapshot, getEmergencySnapshot)
}

export function useAllocation(): AllocationResult {
  const demand = useSimulatedDemand()
  const emergency = useEmergency()
  return allocateDemand(demand, emergency)
}
