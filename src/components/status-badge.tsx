
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TruckStatus } from '@/lib/data'
import { useApp } from '@/components/app-providers'

const config: Record<
  TruckStatus,
  { icon: typeof CheckCircle2; classes: string; ar: string; en: string }
> = {
  onTime: {
    icon: CheckCircle2,
    classes: 'bg-primary/10 text-primary',
    ar: 'في الوقت',
    en: 'On time',
  },
  delayed: {
    icon: Clock,
    classes: 'bg-warning/10 text-warning',
    ar: 'تأخير',
    en: 'Delayed',
  },
  exception: {
    icon: TriangleAlert,
    classes: 'bg-destructive/10 text-destructive',
    ar: 'استثناء',
    en: 'Exception',
  },
}

export function StatusBadge({ status, label }: { status: TruckStatus; label?: string }) {
  const { lang } = useApp()
  const entry = config[status]
  const Icon = entry.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold',
        entry.classes,
      )}
    >
      <Icon className="size-3.5" />
      {label ?? entry[lang]}
    </span>
  )
}
