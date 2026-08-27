
import { Languages, Moon, Sun } from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Button } from '@/components/ui/button'

export function TopHeader() {
  const { lang, setLang, theme, setTheme, t } = useApp()

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
          VRP
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold text-foreground">
            {lang === 'ar' ? 'كنزة VRP' : 'Kinza VRP'}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {lang === 'ar' ? 'محرك تحسين المسارات' : 'Route Optimization Engine'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground sm:inline-flex">
          <span className="size-1.5 rounded-full bg-primary" />
          {lang === 'ar' ? 'رؤية السعودية 2030' : 'Saudi Vision 2030'}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        >
          <Languages className="size-4" />
          {lang === 'ar' ? 'English' : 'العربية'}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </div>
    </header>
  )
}
