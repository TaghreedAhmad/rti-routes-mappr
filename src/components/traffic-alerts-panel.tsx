import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Waypoints } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { DEPOT, trucks, type RoutePoint } from '@/lib/data'
import { replanDailyPlan, useDailyPlan } from '@/lib/daily-plan'
import { fetchOsrmRoute } from '@/lib/osrm'
import { fetchTrafficDurations } from '@/lib/traffic'

import {
  fetchTrafficSnapshot,
  type TrafficRouteInput,
  type TrafficSnapshot,
} from '@/lib/traffic.functions'

/** Refresh cadence for live traffic (7 minutes — inside the 5-10 min window). */
const POLL_MS = 7 * 60 * 1000
/** A delay is "material" at 8+ minutes or 15%+ over the free-flow duration. */
const MIN_DELAY_MIN = 8
const MIN_DELAY_RATIO = 0.15

type RouteDef = { id: string; label: string; points: RoutePoint[] }

export function TrafficAlertsPanel() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const plan = useDailyPlan()
  const [snapshot, setSnapshot] = useState<TrafficSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const baselines = useRef<Map<string, number>>(new Map())

  const routeDefs: RouteDef[] = plan
    ? plan.routes
        .filter((route) => route.stops.some((stop) => stop.point))
        .map((route) => ({
          id: route.truckId,
          label: route.label[lang],
          points: [
            DEPOT,
            ...route.stops
              .map((stop) => stop.point)
              .filter((point): point is RoutePoint => Boolean(point)),
          ],
        }))
        .filter((def) => def.points.length >= 2)
    : trucks.map((truck) => ({
        id: truck.id,
        label: truck.area[lang],
        points: [truck.route.origin, ...truck.route.waypoints, truck.route.destination],
      }))

  const key = routeDefs.map((def) => `${def.id}:${def.points.length}`).join('|')

  const refresh = useCallback(
    async (defs: RouteDef[]) => {
      if (defs.length === 0) {
        setSnapshot(null)
        return
      }
      setBusy(true)
      try {
        const inputs: TrafficRouteInput[] = []
        for (const def of defs) {
          let baseline = baselines.current.get(def.id) ?? 0
          if (!baseline) {
            const osrm = await fetchOsrmRoute(def.points)
            baseline = osrm?.duration ?? 0
            if (baseline) baselines.current.set(def.id, baseline)
          }
          inputs.push({ id: def.id, points: def.points, baselineSeconds: baseline })
        }
        // Primary: Maps JavaScript API in the browser (authorised key).
        let result = await fetchTrafficDurations(inputs)
        // Fallback: server-side Routes API when a server key is configured.
        if (!result.available) {
          const server = await fetchTrafficSnapshot({ data: { routes: inputs } })
          if (server.available) result = server
        }
        setSnapshot(result)
      } catch {
        setSnapshot({
          checkedAt: Date.now(),
          available: false,
          reason: 'request_failed',
          results: [],
        })
      } finally {
        setBusy(false)
      }
    },
    [],
  )


  useEffect(() => {
    const defs = routeDefs
    void refresh(defs)
    const timer = window.setInterval(() => void refresh(defs), POLL_MS)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh])

  const alerts = (snapshot?.results ?? []).filter(
    (result) =>
      result.ok &&
      result.baselineSeconds > 0 &&
      result.delayMinutes >= MIN_DELAY_MIN &&
      result.delayMinutes * 60 >= result.baselineSeconds * MIN_DELAY_RATIO,
  )

  function labelFor(id: string) {
    return routeDefs.find((def) => def.id === id)?.label ?? id
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Waypoints className="size-4 text-primary" />
            {ar ? 'حركة المرور الحية' : 'Live traffic awareness'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar
              ? 'تحديث تلقائي كل 7 دقائق للمسارات النشطة — التنبيه فقط، وقرار إعادة الحساب لك.'
              : 'Active routes refresh every 7 minutes — alerts only, recalculation stays your call.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          disabled={busy}
          onClick={() => {
            baselines.current.clear()
            replanDailyPlan()
            void refresh(routeDefs)
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {ar ? 'إعادة الحساب' : 'Recalculate'}
        </Button>
      </div>

      {busy && !snapshot && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-semibold text-primary">
          <Loader2 className="size-4 animate-spin" />
          {ar ? 'جاري قراءة بيانات المرور الحية...' : 'Reading live traffic data...'}
        </div>
      )}

      {snapshot && !snapshot.available && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-semibold text-warning">
          {ar
            ? 'تعذر قراءة بيانات المرور الحية حاليًا (تأكد من تفعيل Routes API لمفتاح الخريطة). المسارات تعمل بالوقت المقدّر بدون ازدحام.'
            : 'Live traffic is unavailable right now (enable Routes API for the map key). Routes fall back to free-flow durations.'}
        </div>
      )}

      {snapshot?.available && alerts.length === 0 && (
        <div className="mt-4 rounded-xl bg-primary/5 p-3 text-xs font-semibold text-primary">
          {ar
            ? 'لا يوجد ازدحام مؤثر على المسارات النشطة الآن.'
            : 'No material congestion on the active routes right now.'}
        </div>
      )}

      {alerts.length > 0 && (
        <ul className="mt-4 space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3"
            >
              <div className="flex min-w-0 items-start gap-2 text-warning">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 text-xs font-bold">
                  {ar
                    ? `⚠️ تأخير متوقع بمسار ${labelFor(alert.id)} بسبب الازدحام`
                    : `⚠️ Congestion delay expected on route ${labelFor(alert.id)}`}
                  <div className="mt-1 font-normal tabular-nums">
                    {ar
                      ? `+${alert.delayMinutes} دقيقة عن الوقت المخطط`
                      : `+${alert.delayMinutes} min over the planned duration`}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  baselines.current.delete(alert.id)
                  replanDailyPlan()
                  void refresh(routeDefs)
                }}
              >
                {ar ? 'إعادة الحساب' : 'Recalculate'}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {snapshot && (
        <div className="mt-3 text-[11px] text-muted-foreground">
          {ar ? 'آخر تحديث: ' : 'Last update: '}
          {new Date(snapshot.checkedAt).toLocaleTimeString(ar ? 'ar-SA' : 'en-GB')}
        </div>
      )}
    </Panel>
  )
}
