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

export type Assignment = {
  truckId: string
  provider: 'own' | 'thirdParty'
  capacity: number
  assigned: number
  /** Percentage of the truck capacity that is used */
  utilization: number
  active: boolean
}

export type AllocationResult = {
  demand: number
  ownAssigned: number
  overflow: number
  unassigned: number
  activatedThirdParty: number
  assignments: Assignment[]
}

/**
 * Fills our own fleet first (up to capacity, balanced), then activates
 * Third Party trucks only for the overflow.
 */
export function allocateDemand(demand: number): AllocationResult {
  const own: Assignment[] = trucks.map((truck) => ({
    truckId: truck.id,
    provider: 'own' as const,
    capacity: OWN_TRUCK_CAPACITY,
    assigned: 0,
    utilization: 0,
    active: false,
  }))

  let remaining = Math.max(0, Math.round(demand))

  // Balanced round-robin fill of our own fleet.
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

  const external: Assignment[] = thirdPartyTrucks.map((truck) => ({
    truckId: truck.id,
    provider: 'thirdParty' as const,
    capacity: truck.capacity,
    assigned: 0,
    utilization: 0,
    active: false,
  }))

  const overflow = remaining
  // Largest contracted truck first, so we activate as few as possible.
  for (const a of [...external].sort((x, y) => y.capacity - x.capacity)) {
    if (remaining === 0) break
    const take = Math.min(a.capacity, remaining)
    a.assigned = take
    remaining -= take
  }

  const assignments = [...own, ...external]
  for (const a of assignments) {
    a.utilization = a.capacity === 0 ? 0 : Math.round((a.assigned / a.capacity) * 100)
    a.active = a.assigned > 0
  }

  const ownAssigned = own.reduce((s, a) => s + a.assigned, 0)

  return {
    demand: Math.max(0, Math.round(demand)),
    ownAssigned,
    overflow,
    unassigned: remaining,
    activatedThirdParty: external.filter((a) => a.active).length,
    assignments,
  }
}

/* ------------------------------------------------------------------ *
 * Tiny shared store so the dashboard stress test and the fleet table
 * read the same simulated demand.
 * ------------------------------------------------------------------ */

let simulatedDemand = BASELINE_DEMAND
const listeners = new Set<() => void>()

export function setSimulatedDemand(next: number) {
  simulatedDemand = Math.max(0, Math.round(next))
  listeners.forEach((l) => l())
}

export function resetSimulatedDemand() {
  setSimulatedDemand(BASELINE_DEMAND)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return simulatedDemand
}

export function useSimulatedDemand() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useAllocation(): AllocationResult {
  const demand = useSimulatedDemand()
  return allocateDemand(demand)
}
