import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/app-shell'
import { FleetTable } from '@/components/fleet-table'

const title = 'الأسطول — RTI Route Fleet'
const description =
  'قائمة تفصيلية لشاحنات RTI Route في جدة: السائق، الحالة، السرعة، الحمولة، الوقود، ووقت الوصول المتوقع.'

export const Route = createFileRoute('/fleet')({
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
  component: FleetPage,
})

function FleetPage() {
  return (
    <AppShell>
      <FleetTable />
    </AppShell>
  )
}
