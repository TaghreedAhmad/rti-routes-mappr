
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import { LoaderCircle, MapPinned, TriangleAlert } from 'lucide-react'
import { JEDDAH_CENTER, trucks, type Truck, type TruckStatus } from '@/lib/data'
import type { Lang } from '@/lib/i18n'

export type RouteMapHandle = {
  flyTo: (id: string) => void
  recenter: () => void
}

type RouteRecord = Record<string, google.maps.DirectionsResult>
type RendererRecord = Record<string, google.maps.DirectionsRenderer>

const statusColor: Record<TruckStatus, string> = {
  onTime: '#2e8b57',
  delayed: '#d97706',
  exception: '#dc2626',
}

const lightMapStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ saturation: -18 }, { lightness: 8 }] },
]

const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#17231e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#17231e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#92a49b' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#30443a' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#26372f' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#17231e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#385044' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b252b' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6f8f91' }] },
]

let loaderConfigured = false
function configureLoader(apiKey: string) {
  if (loaderConfigured) return
  setOptions({ key: apiKey, v: 'weekly', region: 'SA' })
  loaderConfigured = true
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    }
    return entities[character] ?? character
  })
}

function markerIcon(truck: Truck, selected: boolean): google.maps.Icon {
  const color = truck.identityColor
  const ring = selected ? `<circle cx="30" cy="30" r="27" fill="none" stroke="${color}" stroke-width="4" opacity=".3"/>` : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <defs><filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-opacity=".3"/></filter></defs>
    ${ring}
    <g filter="url(#s)">
      <path d="M30 4C17.85 4 8 13.62 8 25.5 8 42 30 56 30 56s22-14 22-30.5C52 13.62 42.15 4 30 4Z" fill="${color}" stroke="#fff" stroke-width="2.5"/>
      <g transform="translate(18 17)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 3h12v13H2z"/><path d="M14 8h4l4 5v3h-8z"/><circle cx="7" cy="18" r="2.4" fill="#fff"/><circle cx="18" cy="18" r="2.4" fill="#fff"/><path d="M2 16h2.6m4.8 0h6.2"/>
      </g>
    </g>
  </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(selected ? 60 : 50, selected ? 60 : 50),
    anchor: new google.maps.Point(selected ? 30 : 25, selected ? 56 : 47),
  }
}

function infoWindowHtml(truck: Truck, lang: Lang) {
  const status =
    truck.status === 'onTime'
      ? lang === 'ar' ? 'في الوقت' : 'On time'
      : truck.status === 'delayed'
        ? lang === 'ar' ? `متأخرة ${truck.delayMin} د` : `${truck.delayMin} min late`
        : lang === 'ar' ? 'استثناء' : 'Exception'
  const labels = lang === 'ar'
    ? { driver: 'السائق', stops: 'التوقفات' }
    : { driver: 'Driver', stops: 'Stops' }

  return `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="min-width:220px;padding:6px 4px 8px;font-family:Arial,sans-serif;color:#1f2937">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px">
      <span style="width:12px;height:12px;border-radius:4px;background:${truck.identityColor};box-shadow:0 0 0 3px ${truck.identityColor}22"></span>
      <strong style="font-size:15px">${escapeHtml(truck.id)}</strong>
      <span style="margin-inline-start:auto;border-radius:999px;padding:4px 9px;background:${statusColor[truck.status]}18;color:${statusColor[truck.status]};font-size:11px;font-weight:700">${escapeHtml(status)}</span>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:12px;line-height:1.6">
      <span style="color:#64748b">${labels.driver}</span><strong>${escapeHtml(truck.driver[lang])}</strong>
      <span style="color:#64748b">${labels.stops}</span><strong>${truck.stops}</strong>
    </div>
  </div>`
}

export const RouteMap = forwardRef<
  RouteMapHandle,
  { selectedId: string | null; onSelect: (id: string) => void; lang: Lang }
>(function RouteMap({ selectedId, onSelect, lang }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<Record<string, google.maps.Marker>>({})
  const routesRef = useRef<RouteRecord>({})
  const renderersRef = useRef<RendererRecord>({})
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
  const allBoundsRef = useRef<google.maps.LatLngBounds | null>(null)
  const selectRef = useRef(onSelect)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [routeFailures, setRouteFailures] = useState(0)
  const [routeVersion, setRouteVersion] = useState(0)
  selectRef.current = onSelect

  function showTruck(id: string) {
    const truck = trucks.find((item) => item.id === id)
    const map = mapRef.current
    const marker = markersRef.current[id]
    if (!truck || !map || !marker) return

    const routeBounds = routesRef.current[id]?.routes[0]?.bounds
    if (routeBounds) map.fitBounds(routeBounds, 70)
    else {
      map.panTo({ lat: truck.lat, lng: truck.lng })
      map.setZoom(14)
    }
    infoWindowRef.current?.setContent(infoWindowHtml(truck, lang))
    infoWindowRef.current?.open({ map, anchor: marker })
  }

  function showAll() {
    infoWindowRef.current?.close()
    if (allBoundsRef.current && !allBoundsRef.current.isEmpty()) {
      mapRef.current?.fitBounds(allBoundsRef.current, 55)
    } else {
      mapRef.current?.setCenter({ lat: JEDDAH_CENTER[0], lng: JEDDAH_CENTER[1] })
      mapRef.current?.setZoom(12)
    }
  }

  useImperativeHandle(ref, () => ({
    flyTo: showTruck,
    recenter: showAll,
  }))

  useEffect(() => {
    let cancelled = false
    const apiKey = import.meta.env['VITE_GOOGLE_MAPS_API_KEY'] ?? import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY']

    async function initialize() {
      if (!apiKey || !containerRef.current) {
        setLoadState('error')
        return
      }

      try {
        configureLoader(apiKey)
        const [{ Map, InfoWindow }, { DirectionsService, DirectionsRenderer }] = await Promise.all([
          importLibrary('maps'),
          importLibrary('routes'),
        ])
        if (cancelled || !containerRef.current) return

        const isDark = document.documentElement.classList.contains('dark')
        const map = new Map(containerRef.current, {
          center: { lat: JEDDAH_CENTER[0], lng: JEDDAH_CENTER[1] },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: isDark ? darkMapStyles : lightMapStyles,
          gestureHandling: 'greedy',
        })
        mapRef.current = map
        infoWindowRef.current = new InfoWindow({ disableAutoPan: true })

        const bounds = new google.maps.LatLngBounds()
        allBoundsRef.current = bounds
        trucks.forEach((truck) => {
          const marker = new google.maps.Marker({
            map,
            position: { lat: truck.lat, lng: truck.lng },
            title: truck.id,
            icon: markerIcon(truck, false),
            optimized: true,
          })
          marker.addListener('click', () => selectRef.current(truck.id))
          markersRef.current[truck.id] = marker
          bounds.extend(marker.getPosition()!)
        })

        const directionsService = new DirectionsService()
        let failures = 0
        await Promise.all(trucks.map(async (truck) => {
          try {
            const result = await directionsService.route({
              origin: truck.route.origin,
              destination: truck.route.destination,
              waypoints: truck.route.waypoints.map((location) => ({ location, stopover: true })),
              optimizeWaypoints: false,
              travelMode: google.maps.TravelMode.DRIVING,
              region: 'SA',
            })
            if (cancelled) return
            routesRef.current[truck.id] = result
            const renderer = new DirectionsRenderer({
              map,
              directions: result,
              suppressMarkers: true,
              preserveViewport: true,
              polylineOptions: {
                strokeColor: truck.identityColor,
                strokeOpacity: 0.82,
                strokeWeight: 5,
              },
            })
            renderersRef.current[truck.id] = renderer
            const routeBounds = result.routes[0]?.bounds
            if (routeBounds) {
              bounds.extend(routeBounds.getNorthEast())
              bounds.extend(routeBounds.getSouthWest())
            }
          } catch {
            failures += 1
          }
        }))

        if (cancelled) return
        setRouteFailures(failures)
        setRouteVersion((value) => value + 1)
        map.fitBounds(bounds, 55)
        setLoadState('ready')

        const observer = new MutationObserver(() => {
          map.setOptions({
            styles: document.documentElement.classList.contains('dark') ? darkMapStyles : lightMapStyles,
          })
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        ;(map as google.maps.Map & { __themeObserver?: MutationObserver }).__themeObserver = observer
      } catch {
        if (!cancelled) setLoadState('error')
      }
    }

    initialize()

    return () => {
      cancelled = true
      const map = mapRef.current as (google.maps.Map & { __themeObserver?: MutationObserver }) | null
      map?.__themeObserver?.disconnect()
      Object.values(renderersRef.current).forEach((renderer) => renderer.setMap(null))
      Object.values(markersRef.current).forEach((marker) => marker.setMap(null))
      infoWindowRef.current?.close()
      renderersRef.current = {}
      markersRef.current = {}
      routesRef.current = {}
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (loadState !== 'ready') return
    trucks.forEach((truck) => {
      const selected = truck.id === selectedId
      markersRef.current[truck.id]?.setOptions({
        icon: markerIcon(truck, selected),
        zIndex: selected ? 1000 : 1,
        opacity: selectedId && !selected ? 0.58 : 1,
      })
      renderersRef.current[truck.id]?.setOptions({
        polylineOptions: {
          strokeColor: truck.identityColor,
          strokeOpacity: selectedId ? (selected ? 1 : 0.1) : 0.82,
          strokeWeight: selected ? 7 : selectedId ? 3 : 5,
          zIndex: selected ? 100 : 1,
        },
      })
    })

    if (selectedId) showTruck(selectedId)
    else showAll()
    // routeVersion re-applies selection after asynchronous Directions results arrive.
  }, [selectedId, lang, loadState, routeVersion])

  const errorText = lang === 'ar'
    ? 'تعذر تحميل Google Maps. تحقق من تفعيل Maps JavaScript API وDirections API للمفتاح.'
    : 'Google Maps could not load. Check that Maps JavaScript API and Directions API are enabled.'
  const routesWarning = lang === 'ar'
    ? `تعذر تحميل ${routeFailures} من المسارات عبر Directions API.`
    : `${routeFailures} routes could not be loaded from Directions API.`

  return (
    <div className="relative h-full w-full" aria-label={lang === 'ar' ? 'خريطة أسطول جدة' : 'Jeddah fleet map'}>
      <div ref={containerRef} className="h-full w-full" />
      {loadState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted text-muted-foreground">
          <LoaderCircle className="size-7 animate-spin text-primary" />
          <span className="text-sm font-medium">{lang === 'ar' ? 'جاري تحميل خريطة Google…' : 'Loading Google Maps…'}</span>
        </div>
      )}
      {loadState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted px-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"><MapPinned className="size-6" /></span>
          <p className="max-w-sm text-sm font-medium leading-6 text-foreground">{errorText}</p>
        </div>
      )}
      {loadState === 'ready' && routeFailures > 0 && (
        <div className="absolute top-3 z-10 flex items-center gap-2 rounded-lg border border-warning/30 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur ltr:left-3 rtl:right-3">
          <TriangleAlert className="size-4 text-warning" />
          {routesWarning}
        </div>
      )}
    </div>
  )
})
