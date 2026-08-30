import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { RouteReview } from '@/components/route-review'

const title = 'مراجعة المسارات — RTI Route Review'
const description =
  'متابعة حية لشاحنات RTI Route ومساراتها في جدة على خريطة Google مع رسم المسار عند اختيار أي شاحنة.'

export const Route = createFileRoute('/routes')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: RoutesPage,
})

function RoutesPage() {
  return (
    <AppShell>
      <div className="h-full">
        <RouteReview />
      </div>
    </AppShell>
  )
}
