import { Siren, TriangleAlert, X } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import {
  clearEmergency,
  emergencyLabels,
  thirdPartyTrucks,
  triggerEmergency,
  useAllocation,
  type EmergencyReason,
} from '@/lib/allocation'

const reasons: EmergencyReason[] = ['truckBreakdown', 'suddenCancellation', 'urgentOrder']

export function EmergencyPanel() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const allocation = useAllocation()
  const { emergency } = allocation

  const emergencyTrucks = allocation.assignments.filter((a) => a.activation === 'emergency')

  return (
    <Panel
      className={`p-5 ${emergency.active ? 'border-destructive/50 bg-destructive/5' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Siren className={`size-4 ${emergency.active ? 'text-destructive' : 'text-primary'}`} />
            {ar ? 'الحالات الطارئة' : 'Emergency dispatch'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar
              ? 'الطوارئ تُفعّل شاحنات الطرف الثالث فورًا وبأولوية أعلى من ذروة الطلب العادية.'
              : 'Emergencies activate third-party trucks immediately, ahead of ordinary demand peaks.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {reasons.map((reason) => (
            <Button
              key={reason}
              size="sm"
              variant={emergency.reason === reason ? 'destructive' : 'outline'}
              className="gap-1.5"
              onClick={() => triggerEmergency(reason)}
            >
              <TriangleAlert className="size-3.5" />
              {emergencyLabels[reason][lang]}
            </Button>
          ))}
          {emergency.active && (
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={clearEmergency}>
              <X className="size-3.5" />
              {ar ? 'إنهاء الطارئ' : 'Clear emergency'}
            </Button>
          )}
        </div>
      </div>

      {emergency.active && emergency.reason && (
        <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs font-bold text-destructive">
          {ar
            ? `🚨 تفعيل طارئ لشاحنة طرف ثالث بسبب ${emergencyLabels[emergency.reason].ar}`
            : `🚨 Emergency third-party activation due to ${emergencyLabels[emergency.reason].en}`}
          {emergency.disabledTruckId && (
            <div className="mt-1 font-semibold">
              {ar
                ? `الشاحنة الخارجة عن الخدمة: ${emergency.disabledTruckId}`
                : `Out of service: ${emergency.disabledTruckId}`}
            </div>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {emergencyTrucks.length === 0 && (
          <li className="rounded-xl bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
            {ar
              ? 'لا يوجد تفعيل طارئ حاليًا.'
              : 'No emergency activation right now.'}
          </li>
        )}
        {emergencyTrucks.map((assignment) => {
          const meta = thirdPartyTrucks.find((t) => t.id === assignment.truckId)
          return (
            <li
              key={assignment.truckId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-foreground">
                  {meta?.name[lang] ?? assignment.truckId}
                </div>
                <div className="text-[11px] tabular-nums text-muted-foreground">
                  {ar ? 'محمّل' : 'Loaded'}: {assignment.assigned}/{assignment.capacity} ·{' '}
                  {assignment.utilization}%
                </div>
              </div>
              <span className="rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive">
                {ar ? 'تفعيل طارئ' : 'Emergency activation'}
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
