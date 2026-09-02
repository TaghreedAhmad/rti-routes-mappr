import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Loader2, RefreshCw, Waypoints } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { trucks } from '@/lib/data'
import { replanDailyPlan, useDailyPlan } from '@/lib/daily-plan'

/** Refresh cadence for the simulated traffic feed (6 minutes — inside the 5-7 min window). */
const POLL_MS = 6 * 60 * 1000

type Level = 'light' | 'moderate' | 'heavy'

type SimResult = {
  id: string
  label: string
  level: Level
  congestionPct: number
  delayMinutes: number
  baselineMinutes: number
}

type SimSnapshot = {
  checkedAt: number
  results: SimResult[]
}

type RouteDef = { id: string; label: string; baselineMinutes: number }

function levelOf(pct: number): Level {
  if (pct >= 45) return 'heavy'
  if (pct >= 20) return 'moderate'
  return 'light'
}

function simulate(defs: RouteDef[]): SimSnapshot {
  return {
    checkedAt: Date.now(),
    results: defs.map((def) => {
      // Skewed distribution: most routes light, some moderate, few heavy.
      const roll = Math.random()
      const pct =
        roll < 0.55
          ? Math.round(Math.random() * 19)
          : roll < 0.85
            ? 20 + Math.round(Math.random() * 24)
            : 45 + Math.round(Math.random() * 35)
      const delayMinutes = Math.max(1, Math.round((def.baselineMinutes * pct) / 100))
      return {
        id: def.id,
        label: def.label,
        level: levelOf(pct),
        congestionPct: pct,
        delayMinutes,
        baselineMinutes: def.baselineMinutes,
      }
    }),
  }
}

export function TrafficAlertsPanel() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const plan = useDailyPlan()
  const [snapshot, setSnapshot] = useState<SimSnapshot | null>(null)
  const [busy, setBusy] = useState(false)

  const routeDefs: RouteDef[] = plan
    ? plan.routes
        .filter((route) => route.stops.length > 0)
        .map((route) => ({
          id: route.truckId,
          label: route.label[lang],
          // ~32 km/h average urban speed → minutes.
          baselineMinutes: Math.max(15, Math.round(((route.distanceKm || 20) / 32) * 60)),
        }))
    : trucks.map((truck) => ({
        id: truck.id,
        label: truck.area[lang],
        baselineMinutes: 45,
      }))

  const key = routeDefs.map((def) => def.id).join('|')

  const refresh = useCallback((defs: RouteDef[]) => {
    if (defs.length === 0) {
      setSnapshot(null)
      return
    }
    setBusy(true)
    // Small delay so the loading state reads naturally.
    window.setTimeout(() => {
      setSnapshot(simulate(defs))
      setBusy(false)
    }, 450)
  }, [])

  useEffect(() => {
    const defs = routeDefs
    refresh(defs)
    const timer = window.setInterval(() => refresh(defs), POLL_MS)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh])

  const alerts = (snapshot?.results ?? []).filter((result) => result.level !== 'light')

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold text-foreground">
            <Waypoints className="size-4 text-primary" />
            {ar ? 'حركة المرور الحية' : 'Live traffic awareness'}
            <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
              {ar ? 'بيانات محاكاة توضيحية' : 'Demo mode — simulated data'}
            </span>
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar
              ? 'محاكاة ازدحام تتحدّث كل 6 دقائق للمسارات النشطة — التنبيه فقط، وقرار إعادة الحساب لك.'
              : 'Simulated congestion refreshes every 6 minutes — alerts only, recalculation stays your call.'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          disabled={busy}
          onClick={() => {
            replanDailyPlan()
            refresh(routeDefs)
          }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {ar ? 'إعادة الحساب' : 'Recalculate'}
        </Button>
      </div>

      {busy && !snapshot && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-semibold text-primary">
          <Loader2 className="size-4 animate-spin" />
          {ar ? 'جاري توليد بيانات المرور...' : 'Generating traffic data...'}
        </div>
      )}

      {snapshot && alerts.length === 0 && (
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
              className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${
                alert.level === 'heavy'
                  ? 'border-destructive/40 bg-destructive/10'
                  : 'border-warning/40 bg-warning/10'
              }`}
            >
              <div
                className={`flex min-w-0 items-start gap-2 ${
                  alert.level === 'heavy' ? 'text-destructive' : 'text-warning'
                }`}
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 text-xs font-bold">
                  {ar
                    ? `⚠️ تأخير متوقع بمسار ${alert.label} بسبب الازدحام`
                    : `⚠️ Congestion delay expected on route ${alert.label}`}
                  <div className="mt-1 font-normal tabular-nums">
                    {ar
                      ? `${alert.level === 'heavy' ? 'ازدحام كثيف' : 'ازدحام متوسط'} · ${alert.congestionPct}% · +${alert.delayMinutes} دقيقة عن الوقت المخطط`
                      : `${alert.level === 'heavy' ? 'Heavy' : 'Moderate'} · ${alert.congestionPct}% · +${alert.delayMinutes} min over plan`}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  replanDailyPlan()
                  refresh(routeDefs)
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
