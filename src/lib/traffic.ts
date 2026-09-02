import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { RoutePoint } from '@/lib/data'
import type { TrafficRouteResult, TrafficSnapshot } from '@/lib/traffic.functions'

export type TrafficRouteDef = {
  id: string
  points: RoutePoint[]
  /** Free-flow duration in seconds (OSRM baseline). */
  baselineSeconds: number
}

let configured = false

function browserKey() {
  return (
    import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ??
    import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] ??
    ''
  )
}

/**
 * Live traffic durations through the already-authorised Maps JavaScript API
 * (Directions with `drivingOptions.departureTime = now` → duration_in_traffic).
 * Read-only: it never modifies any plan.
 */
export async function fetchTrafficDurations(
  defs: TrafficRouteDef[],
): Promise<TrafficSnapshot> {
  const key = browserKey()
  if (!key) {
    return { checkedAt: Date.now(), available: false, reason: 'missing_key', results: [] }
  }
  if (defs.length === 0) {
    return { checkedAt: Date.now(), available: true, results: [] }
  }

  try {
    if (!configured) {
      setOptions({ key, v: 'weekly', region: 'SA' })
      configured = true
    }
    const routesLib = (await importLibrary('routes')) as google.maps.RoutesLibrary
    const service = new routesLib.DirectionsService()

    const results: TrafficRouteResult[] = []
    let anyOk = false
    let reason: string | undefined

    for (const def of defs.slice(0, 12)) {
      const origin = def.points[0]
      const destination = def.points[def.points.length - 1]
      if (!origin || !destination) continue
      try {
        const response = await service.route({
          origin,
          destination,
          waypoints: def.points.slice(1, -1).slice(0, 8).map((point) => ({ location: point })),
          travelMode: 'DRIVING' as google.maps.TravelMode,
          drivingOptions: {
            departureTime: new Date(),
            trafficModel: 'bestguess' as google.maps.TrafficModel,
          },
        })
        const route = response.routes[0]
        if (!route) {
          reason = 'no_route'
          continue
        }
        let traffic = 0
        let free = 0
        for (const leg of route.legs) {
          traffic += leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0
          free += leg.duration?.value ?? 0
        }
        const baseline = def.baselineSeconds > 0 ? def.baselineSeconds : free
        anyOk = true
        results.push({
          id: def.id,
          baselineSeconds: baseline,
          trafficSeconds: traffic,
          delayMinutes: Math.round((traffic - baseline) / 60),
          ok: true,
        })
      } catch (error) {
        reason = error instanceof Error ? error.message : 'request_failed'
        results.push({
          id: def.id,
          baselineSeconds: def.baselineSeconds,
          trafficSeconds: 0,
          delayMinutes: 0,
          ok: false,
        })
      }
    }

    return {
      checkedAt: Date.now(),
      available: anyOk,
      ...(reason ? { reason } : {}),
      results,
    }
  } catch (error) {
    return {
      checkedAt: Date.now(),
      available: false,
      reason: error instanceof Error ? error.message : 'loader_failed',
      results: [],
    }
  }
}
