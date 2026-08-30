export type OsrmRoute = {
  /** [lat, lng] pairs ready for a Google Maps Polyline path. */
  path: { lat: number; lng: number }[]
  /** Meters */
  distance: number
  /** Seconds */
  duration: number
}

const OSRM_BASE = 'https://router.project-osrm.org'

/**
 * Computes a multi-stop driving route with the free public OSRM server.
 * Returns null when OSRM has no route or the request fails.
 */
export async function fetchOsrmRoute(
  points: { lat: number; lng: number }[],
): Promise<OsrmRoute | null> {
  if (points.length < 2) return null

  const coords = points.map((point) => `${point.lng},${point.lat}`).join(';')
  const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`

  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const payload = (await response.json()) as {
      code?: string
      routes?: {
        distance?: number
        duration?: number
        geometry?: { coordinates?: [number, number][] }
      }[]
    }
    if (payload.code !== 'Ok') return null
    const route = payload.routes?.[0]
    const coordinates = route?.geometry?.coordinates
    if (!route || !coordinates?.length) return null

    return {
      path: coordinates.map(([lng, lat]) => ({ lat, lng })),
      distance: route.distance ?? 0,
      duration: route.duration ?? 0,
    }
  } catch {
    return null
  }
}

export function formatDistance(meters: number, lang: 'ar' | 'en') {
  const km = meters / 1000
  const value = km >= 10 ? Math.round(km) : Math.round(km * 10) / 10
  return lang === 'ar' ? `${value} كم` : `${value} km`
}

export function formatDuration(seconds: number, lang: 'ar' | 'en') {
  const total = Math.max(1, Math.round(seconds / 60))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (lang === 'ar') {
    if (hours === 0) return `${minutes} د`
    return minutes === 0 ? `${hours} س` : `${hours} س ${minutes} د`
  }
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}
