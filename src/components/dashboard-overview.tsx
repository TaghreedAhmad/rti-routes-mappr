import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AlertTriangle, Clock, Package, Truck } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusBadge } from '@/components/status-badge'
import { dailyOrders, fleetDistribution, performanceSeries, trucks } from '@/lib/data'

const CHART = {
  primary: '#2E8B57',
  warning: '#c2740b',
  destructive: '#dc2626',
  muted: '#6b7280',
  border: '#e2e5ea',
  card: '#ffffff',
}

const fleetLabels: Record<string, { ar: string; en: string; color: string }> = {
  active: { ar: 'نشطة', en: 'Active', color: CHART.primary },
  idle: { ar: 'متوقفة', en: 'Idle', color: CHART.muted },
  maintenance: { ar: 'صيانة', en: 'Maintenance', color: CHART.warning },
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'primary',
}: {
  icon: typeof Truck
  label: string
  value: string
  hint: string
  tone?: 'primary' | 'warning' | 'destructive'
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  } as const

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-black tabular-nums text-foreground">{value}</div>
          <div className="mt-1 truncate text-[11px] text-muted-foreground">{hint}</div>
        </div>
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
      </div>
    </Panel>
  )
}

export function DashboardOverview() {
  const { lang } = useApp()
  const ar = lang === 'ar'

  const delayed = trucks.filter((t) => t.status === 'delayed').length
  const exceptions = trucks.filter((t) => t.status === 'exception').length
  const totalStops = trucks.reduce((sum, t) => sum + t.stops, 0)
  const completed = trucks.reduce((sum, t) => sum + t.completed, 0)
  const onTimeRate = Math.round(((trucks.length - delayed - exceptions) / trucks.length) * 100)

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title={ar ? 'لوحة التحكم' : 'Dashboard'}
        subtitle={
          ar
            ? 'مؤشرات الأداء التشغيلي لأسطول التوزيع في جدة'
            : 'Operational performance for the Jeddah distribution fleet'
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Truck}
          label={ar ? 'الشاحنات النشطة' : 'Active trucks'}
          value={String(trucks.length)}
          hint={ar ? 'جميع الشاحنات في الخدمة' : 'All trucks in service'}
        />
        <Kpi
          icon={Package}
          label={ar ? 'التوقفات المنفذة' : 'Stops completed'}
          value={`${completed}/${totalStops}`}
          hint={`${Math.round((completed / totalStops) * 100)}% ${ar ? 'إنجاز' : 'complete'}`}
        />
        <Kpi
          icon={Clock}
          label={ar ? 'الالتزام بالوقت' : 'On-time rate'}
          value={`${onTimeRate}%`}
          hint={`${delayed} ${ar ? 'مسار متأخر' : 'delayed routes'}`}
          tone="warning"
        />
        <Kpi
          icon={AlertTriangle}
          label={ar ? 'الاستثناءات' : 'Exceptions'}
          value={String(exceptions)}
          hint={ar ? 'تحتاج متابعة فورية' : 'Need immediate follow-up'}
          tone="destructive"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-foreground">
            {ar ? 'أداء التسليم خلال اليوم' : 'Delivery performance today'}
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke=CHART.border />
                <XAxis dataKey="time" stroke=CHART.muted fontSize={11} />
                <YAxis stroke=CHART.muted fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: CHART.card,
                    border: `1px solid ${CHART.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="onTime"
                  stroke=CHART.primary
                  fill=CHART.primary
                  fillOpacity={0.18}
                  strokeWidth={2}
                  name={ar ? 'في الوقت' : 'On time'}
                />
                <Area
                  type="monotone"
                  dataKey="delayed"
                  stroke=CHART.warning
                  fill=CHART.warning
                  fillOpacity={0.14}
                  strokeWidth={2}
                  name={ar ? 'تأخير' : 'Delayed'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="text-sm font-bold text-foreground">
            {ar ? 'توزيع الأسطول' : 'Fleet distribution'}
          </h2>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetDistribution}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={45}
                  outerRadius={72}
                  paddingAngle={2}
                >
                  {fleetDistribution.map((entry) => (
                    <Cell key={entry.key} fill={fleetLabels[entry.key]?.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-2">
            {fleetDistribution.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ background: fleetLabels[entry.key]?.color }}
                  />
                  {fleetLabels[entry.key]?.[lang]}
                </span>
                <span className="font-bold tabular-nums text-foreground">{entry.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="text-sm font-bold text-foreground">
            {ar ? 'الطلبات الأسبوعية' : 'Weekly orders'}
          </h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyOrders.map((d) => ({ ...d, label: d.day[lang] }))}>
                <CartesianGrid strokeDasharray="3 3" stroke=CHART.border />
                <XAxis dataKey="label" stroke=CHART.muted fontSize={11} />
                <YAxis stroke=CHART.muted fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: CHART.card,
                    border: `1px solid ${CHART.border}`,
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="orders" fill=CHART.primary radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="flex flex-col p-5">
          <h2 className="text-sm font-bold text-foreground">
            {ar ? 'تنبيهات تشغيلية' : 'Operational alerts'}
          </h2>
          <ul className="mt-4 space-y-2">
            {trucks
              .filter((t) => t.status !== 'onTime')
              .map((truck) => (
                <li
                  key={truck.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-foreground">{truck.id}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {truck.driver[lang]} · {truck.area[lang]}
                    </div>
                  </div>
                  <StatusBadge
                    status={truck.status}
                    label={`${truck.delayMin} ${ar ? 'دقيقة تأخير' : 'min late'}`}
                  />
                </li>
              ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
