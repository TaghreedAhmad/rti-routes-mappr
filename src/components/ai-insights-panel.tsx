import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import { useDailyPlan } from '@/lib/daily-plan'
import { useAllocation } from '@/lib/allocation'
import { trucks } from '@/lib/data'
import {
  generateDailyInsights,
  type InsightsInput,
  type InsightsResult,
} from '@/lib/ai-insights.functions'

export function AiInsightsPanel() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const plan = useDailyPlan()
  const allocation = useAllocation()
  const [result, setResult] = useState<InsightsResult | null>(null)
  const [busy, setBusy] = useState(false)

  const planId = plan ? String(plan.createdAt) : 'baseline'

  const run = useCallback(async () => {
    setBusy(true)
    try {
      const payload: InsightsInput = plan
        ? {
            totalBoxes: plan.totalBoxes,
            stops: plan.stops.length,
            trucksUsed: plan.trucksUsed,
            thirdPartyActivated: plan.thirdPartyActivated,
            emergencyActivated: allocation.emergencyActivated,
            distanceEfficiency: plan.distanceEfficiency,
            totalDistanceKm: plan.totalDistanceKm,
            idealDistanceKm: plan.idealDistanceKm,
            unassignedStops: plan.unassignedStops.length,
            skippedRows: plan.rowErrors.length,
            routes: plan.routes
              .filter((route) => route.stops.length > 0)
              .map((route) => ({
                truckId: route.truckId,
                provider: route.provider,
                stops: route.stops.length,
                boxes: route.totalBoxes,
                capacity: route.capacity,
                utilization: Math.round((route.totalBoxes / route.capacity) * 100),
                distanceKm: route.distanceKm,
                areaKm2: route.areaKm2,
                trips: route.trips,
              })),
          }
        : {
            totalBoxes: allocation.demand,
            stops: trucks.reduce((sum, truck) => sum + truck.stops, 0),
            trucksUsed: trucks.length,
            thirdPartyActivated: allocation.activatedThirdParty,
            emergencyActivated: allocation.emergencyActivated,
            distanceEfficiency: 0,
            totalDistanceKm: 0,
            idealDistanceKm: 0,
            unassignedStops: 0,
            skippedRows: 0,
            routes: trucks.map((truck) => ({
              truckId: truck.id,
              provider: 'own' as const,
              stops: truck.stops,
              boxes: truck.stops,
              capacity: 10,
              utilization: truck.load,
              distanceKm: 0,
              areaKm2: 0,
              trips: 1,
              delayMinutes: truck.delayMin,
            })),
          }

      setResult(await generateDailyInsights({ data: payload }))
    } catch (error) {
      setResult({
        ok: false,
        points: [],
        reason: error instanceof Error ? error.message : 'request_failed',
      })
    } finally {
      setBusy(false)
    }
  }, [allocation.activatedThirdParty, allocation.demand, allocation.emergencyActivated, plan])

  // Re-runs automatically after every new dispatch.
  useEffect(() => {
    void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId])

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Sparkles className="size-4 text-primary" />
            {ar ? 'تحليلات الذكاء الاصطناعي' : 'AI analytics'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar
              ? 'ملاحظات الذكاء الاصطناعي اليوم: أنماط التأخير، استغلال السعة، وأي شذوذ بالبيانات.'
              : 'Today’s AI notes: delay patterns, capacity utilization and data anomalies.'}
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-2" disabled={busy} onClick={() => void run()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {ar ? 'تحديث التحليل' : 'Refresh analysis'}
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
        <div className="text-xs font-bold text-foreground">
          {ar ? 'ملاحظات الذكاء الاصطناعي اليوم' : 'AI notes for today'}
        </div>

        {busy && (
          <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Loader2 className="size-4 animate-spin" />
            {ar ? 'جاري تحليل بيانات اليوم...' : 'Analyzing today’s data...'}
          </div>
        )}

        {!busy && result?.ok && (
          <ul className="mt-3 space-y-2">
            {result.points.map((point, index) => (
              <li key={index} className="flex gap-2 text-xs leading-relaxed text-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}

        {!busy && result && !result.ok && (
          <div className="mt-3 text-xs font-semibold text-muted-foreground">
            {ar
              ? 'تعذر توليد التحليل حاليًا، حاول التحديث بعد قليل.'
              : 'Analysis is unavailable right now, try refreshing shortly.'}
          </div>
        )}
      </div>
    </Panel>
  )
}
