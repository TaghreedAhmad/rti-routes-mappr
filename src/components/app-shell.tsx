import { Link } from '@tanstack/react-router'
import { LayoutDashboard, Map, Truck } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { TopHeader } from '@/components/top-header'

const nav = [
  { to: '/', icon: LayoutDashboard, ar: 'لوحة التحكم', en: 'Dashboard' },
  { to: '/routes', icon: Map, ar: 'مراجعة المسارات', en: 'Route Review' },
  { to: '/fleet', icon: Truck, ar: 'الأسطول', en: 'Fleet' },
] as const

export function AppShell({ children }: { children: React.ReactNode }) {
  const { lang } = useApp()

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopHeader />
      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-60 shrink-0 flex-col gap-1 border-border bg-card p-3 md:flex ltr:border-r rtl:border-l">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === '/' }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              <item.icon className="size-4 shrink-0" />
              <span className="truncate">{item[lang]}</span>
            </Link>
          ))}
          <div className="mt-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-muted-foreground">
            {lang === 'ar'
              ? 'RTI Route — بيانات أسطول جدة الحقيقية.'
              : 'RTI Route — real Jeddah fleet data.'}
          </div>
        </nav>

        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>

      <nav className="flex border-t border-border bg-card md:hidden">
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === '/' }}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="size-4" />
            <span className="truncate">{item[lang]}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
