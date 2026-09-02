import { createServerFn } from '@tanstack/react-start'

export type TrafficRouteInput = {
  id: string
  points: { lat: number; lng: number }[]
  /** Free-flow duration in seconds (from the OSRM plan). */
  baselineSeconds: number
}

export type TrafficRouteResult = {
  id: string
  baselineSeconds: number
  trafficSeconds: number
  delayMinutes: number
  ok: boolean
}

export type TrafficSnapshot = {
  checkedAt: number
  /** false when the traffic provider could not be reached at all. */
  available: boolean
  reason?: string
  results: TrafficRouteResult[]
}

type ComputeRoutesResponse = {
  routes?: { duration?: string; staticDuration?: string }[]
  error?: { message?: string }
}

function toWaypoint(point: { lat: number; lng: number }) {
  return { location: { latLng: { latitude: point.lat, longitude: point.lng } } }
}

function seconds(value: string | undefined) {
  if (!value) return 0
  return Number(String(value).replace(/s$/, '')) || 0
}

/**
 * Pulls live traffic-aware durations from Google for the active routes.
 * Read-only: it never rewrites the plan, it only reports the delta.
 */
export const fetchTrafficSnapshot = createServerFn({ method: 'POST' })
  .inputValidator((input: { routes: TrafficRouteInput[] }) => input)
  .handler(async ({ data }): Promise<TrafficSnapshot> => {
    const apiKey =
      process.env['GOOGLE_MAPS_API_KEY'] ??
      process.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'] ??
      ''

    if (!apiKey) {
      return {
        checkedAt: Date.now(),
        available: false,
        reason: 'missing_key',
        results: [],
      }
    }

    const routes = data.routes.filter((route) => route.points.length >= 2).slice(0, 12)
    if (routes.length === 0) {
      return { checkedAt: Date.now(), available: true, results: [] }
    }

    const results: TrafficRouteResult[] = []
    let anyOk = false
    let reason: string | undefined

    for (const route of routes) {
      const origin = route.points[0]!
      const destination = route.points[route.points.length - 1]!
      const intermediates = route.points.slice(1, -1).slice(0, 8).map(toWaypoint)

      try {
        const response = await fetch(
          'https://routes.googleapis.com/directions/v2:computeRoutes',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'routes.duration,routes.staticDuration',
            },
            body: JSON.stringify({
              origin: toWaypoint(origin),
              destination: toWaypoint(destination),
              intermediates,
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_AWARE',
            }),
          },
        )

        const payload = (await response.json()) as ComputeRoutesResponse
        const first = payload.routes?.[0]
        if (!response.ok || !first) {
          reason = payload.error?.message ?? `http_${response.status}`
          results.push({
            id: route.id,
            baselineSeconds: route.baselineSeconds,
            trafficSeconds: 0,
            delayMinutes: 0,
            ok: false,
          })
          continue
        }

        const trafficSeconds = seconds(first.duration)
        const staticSeconds = seconds(first.staticDuration)
        const baseline = route.baselineSeconds > 0 ? route.baselineSeconds : staticSeconds
        anyOk = true
        results.push({
          id: route.id,
          baselineSeconds: baseline,
          trafficSeconds,
          delayMinutes: Math.round((trafficSeconds - baseline) / 60),
          ok: true,
        })
      } catch (error) {
        reason = error instanceof Error ? error.message : 'request_failed'
        results.push({
          id: route.id,
          baselineSeconds: route.baselineSeconds,
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
  })
