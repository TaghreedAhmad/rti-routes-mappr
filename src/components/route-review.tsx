
import { useRef, useState } from 'react'
import { Crosshair, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useApp } from '@/components/app-providers'
import { PageHeader } from '@/components/page-header'
import { Panel } from '@/components/panel'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { RouteMap, type RouteMapHandle } from '@/components/route-map'
import { trucks } from '@/lib/data'

export function RouteReview() {
  const { t, lang } = useApp()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const mapRef = useRef<RouteMapHandle>(null)

  function handleSelect(id: string) {
    setSelectedId(id)
    mapRef.current?.flyTo(id)
  }

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-5 p-4 md:p-6">
      <PageHeader
        title={t('rr.title')}
        subtitle={t('rr.subtitle')}
        action={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              setSelectedId(null)
              mapRef.current?.recenter()
            }}
          >
            <Crosshair className="size-4" />
            {lang === 'ar' ? 'عرض الكل' : 'Show all'}
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[320px_1fr] xl:grid-cols-[300px_1fr_320px]">
        {/* Active routes list */}
        <Panel className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold text-foreground">{t('rr.activeRoutes')}</h2>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
              {trucks.length}
            </span>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {trucks.map((truck) => {
              const active = truck.id === selectedId
              const progress = Math.round((truck.completed / truck.stops) * 100)
              return (
                <li key={truck.id}>
                  <button
                    onClick={() => handleSelect(truck.id)}
                    aria-pressed={active}
                    className={cn(
                      'w-full rounded-xl border p-3.5 text-start transition-all',
                      active
                        ? 'border-primary bg-accent shadow-sm ltr:border-l-4 rtl:border-r-4'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{truck.id}</span>
                      <StatusBadge
                        status={truck.status}
                        label={
                          truck.status === 'delayed'
                            ? `${truck.delayMin} ${t('ft.minLate')}`
                            : undefined
                        }
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5" />
                      {truck.driver[lang]}
                      <span className="text-border">·</span>
                      <MapPin className="size-3.5" />
                      {truck.area[lang]}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {truck.completed}/{truck.stops} {t('rr.stops')}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        {/* Map */}
        <Panel className="relative min-h-[420px] overflow-hidden">
          <RouteMap
            ref={mapRef}
            selectedId={selectedId}
            onSelect={handleSelect}
            lang={lang}
          />
          {!selectedId && (
            <div className="pointer-events-none absolute bottom-4 z-[500] rounded-full border border-border bg-card/95 px-4 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur ltr:left-4 rtl:right-4">
              {t('rr.selectHint')}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
