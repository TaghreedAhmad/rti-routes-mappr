import { useState } from 'react'
import { Boxes, ChevronDown, PackageSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { stopOrders } from '@/lib/orders'
import { planAggregatedOrders, useDailyPlan } from '@/lib/daily-plan'
import { trucks } from '@/lib/data'

export function OrderDetails({ selectedId }: { selectedId?: string | null }) {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [open, setOpen] = useState<string[]>([])

  const plan = useDailyPlan()
  const source = plan ? planAggregatedOrders(plan) : stopOrders
  const orders = selectedId ? source.filter((o) => o.truckId === selectedId) : source
  const totalBoxes = orders.reduce((sum, o) => sum + o.totalBoxes, 0)

  function toggle(key: string) {
    setOpen((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  return (
    <Panel className="flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PackageSearch className="size-4 text-primary" />
          {ar ? 'تفاصيل الطلبية' : 'Order Details'}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground tabular-nums">
          <Boxes className="size-3.5" />
          {totalBoxes} {ar ? 'صندوق' : 'boxes'}
        </span>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {orders.map((order) => {
          const expanded = open.includes(order.key)
          const truck = trucks.find((t) => t.id === order.truckId)
          return (
            <li key={order.key}>
              <button
                onClick={() => toggle(order.key)}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: truck?.identityColor }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {order.place[lang]}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">{order.truckId}</span>
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-primary">
                  {order.totalBoxes} {ar ? 'صندوق' : 'boxes'}
                </span>
                <ChevronDown
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
              </button>

              {expanded && (
                <div className="bg-muted/40 px-4 pb-3">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-2 text-start font-semibold">{ar ? 'الصنف' : 'Item'}</th>
                        <th className="py-2 text-end font-semibold">
                          {ar ? 'الكمية' : 'Quantity'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item) => (
                        <tr key={item.en} className="border-t border-border/60">
                          <td className="py-1.5 text-foreground">{item[lang]}</td>
                          <td className="py-1.5 text-end font-semibold tabular-nums text-foreground">
                            ×{item.qty}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
