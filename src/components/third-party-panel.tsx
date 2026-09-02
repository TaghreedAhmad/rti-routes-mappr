import { Building2, Truck as TruckIcon, Zap } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import {
  BASELINE_DEMAND,
  OWN_FLEET_CAPACITY,
  THIRD_PARTY_CAPACITY,
  resetSimulatedDemand,
  setSimulatedDemand,
  thirdPartyTrucks,
  useAllocation,
  useSimulatedDemand,
} from '@/lib/allocation'

export function ThirdPartyPanel() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const demand = useSimulatedDemand()
  const allocation = useAllocation()

  const externalAssignments = allocation.assignments.filter((a) => a.provider === 'thirdParty')

  const presets = [
    { label: ar ? 'الطلب الحالي' : 'Current demand', value: BASELINE_DEMAND },
    { label: ar ? 'ذروة' : 'Peak', value: OWN_FLEET_CAPACITY + 5 },
    {
      label: ar ? 'اختبار إجهاد' : 'Stress test',
      value: OWN_FLEET_CAPACITY + THIRD_PARTY_CAPACITY + 6,
    },
  ]

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Building2 className="size-4 text-primary" />
            {ar ? 'شاحنات الطرف الثالث' : 'Third-party trucks'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {allocation.activatedThirdParty > 0
              ? ar
                ? `تم تفعيل ${allocation.activatedThirdParty} من شاحنات الطرف الثالث بسبب زيادة الطلب`
                : `${allocation.activatedThirdParty} third-party truck(s) activated due to demand overflow`
              : ar
                ? 'لم يتم تفعيل أي شاحنة طرف ثالث — أسطولنا يغطي الطلب'
                : 'No third-party truck activated — our own fleet covers demand'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant={demand === preset.value ? 'default' : 'outline'}
              className="gap-1.5"
              onClick={() => setSimulatedDemand(preset.value)}
            >
              <Zap className="size-3.5" />
              {preset.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={resetSimulatedDemand}>
            {ar ? 'إعادة تعيين' : 'Reset'}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={ar ? 'الطلب المحاكى' : 'Simulated demand'} value={`${allocation.demand}`} />
        <Stat
          label={ar ? 'على أسطولنا' : 'On own fleet'}
          value={`${allocation.ownAssigned}/${OWN_FLEET_CAPACITY}`}
        />
        <Stat label={ar ? 'الفائض' : 'Overflow'} value={`${allocation.overflow}`} />
        <Stat
          label={ar ? 'غير موزّع' : 'Unassigned'}
          value={`${allocation.unassigned}`}
          tone={allocation.unassigned > 0 ? 'destructive' : 'default'}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {externalAssignments.map((assignment) => {
          const meta = thirdPartyTrucks.find((t) => t.id === assignment.truckId)
          return (
            <li
              key={assignment.truckId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-lg"
                  style={{
                    background: `${meta?.identityColor ?? '#9333ea'}1a`,
                    color: meta?.identityColor ?? '#9333ea',
                  }}
                >
                  <TruckIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-foreground">
                    {meta?.name[lang] ?? assignment.truckId}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {ar ? 'السعة' : 'Capacity'}: {assignment.capacity} ·{' '}
                    {ar ? 'محمّل' : 'Loaded'}: {assignment.assigned}
                  </div>
                </div>
              </div>
              <span
                className={
                  assignment.activation === 'emergency'
                    ? 'rounded-full bg-destructive/15 px-2.5 py-1 text-[11px] font-bold text-destructive'
                    : assignment.active
                      ? 'rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary'
                      : 'rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground'
                }
              >
                {assignment.activation === 'emergency'
                  ? ar
                    ? `🚨 تفعيل طارئ (${assignment.utilization}%)`
                    : `🚨 Emergency (${assignment.utilization}%)`
                  : assignment.active
                    ? ar
                      ? `نشطة — خارجية (${assignment.utilization}%)`
                      : `Active — external (${assignment.utilization}%)`
                    : ar
                      ? 'غير مستخدمة'
                      : 'Unused'}
              </span>

            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'destructive'
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="truncate text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-xl font-black tabular-nums ${
          tone === 'destructive' ? 'text-destructive' : 'text-foreground'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
