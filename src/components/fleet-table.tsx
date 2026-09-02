import { Building2, Fuel, Gauge, Package } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusBadge } from '@/components/status-badge'
import { trucks } from '@/lib/data'
import { thirdPartyTrucks, useAllocation } from '@/lib/allocation'

export function FleetTable() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const allocation = useAllocation()
  const byTruck = new Map(allocation.assignments.map((a) => [a.truckId, a]))


  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title={ar ? 'الأسطول' : 'Fleet'}
        subtitle={
          ar
            ? 'حالة كل شاحنة: السرعة، الحمولة، الوقود، ووقت الوصول المتوقع'
            : 'Per-truck status: speed, load, fuel and ETA'
        }
      />

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr className="text-start">
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'الشاحنة' : 'Truck'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'السائق' : 'Driver'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'المسار' : 'Route'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'التوقفات' : 'Stops'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'السرعة' : 'Speed'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'الحمولة' : 'Load'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'الوقود' : 'Fuel'}</th>
                <th className="px-4 py-3 font-semibold text-start">{ar ? 'الوصول' : 'ETA'}</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((truck) => (
                <tr key={truck.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3 font-bold text-foreground">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: truck.identityColor }}
                      />
                      {truck.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{truck.driver[lang]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{truck.area[lang]}</td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={truck.status}
                      label={
                        truck.status === 'delayed'
                          ? `${truck.delayMin} ${ar ? 'دقيقة' : 'min'}`
                          : undefined
                      }
                    />
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Package className="size-3.5" />
                      {truck.completed}/{truck.stops}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Gauge className="size-3.5" />
                      {truck.speed} {ar ? 'كم/س' : 'km/h'}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{truck.load}%</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Fuel className="size-3.5" />
                      {truck.fuel}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-foreground">
                    {truck.eta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
