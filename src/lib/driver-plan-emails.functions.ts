import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const stopSchema = z.object({
  order: z.number(),
  place: z.string(),
  address: z.string().optional().default(''),
  totalBoxes: z.number(),
  items: z.array(z.object({ name: z.string(), qty: z.number() })),
})

const driverSchema = z.object({
  truckId: z.string(),
  driverName: z.string(),
  email: z.string(),
  totalBoxes: z.number(),
  stops: z.array(stopSchema),
})

const payloadSchema = z.object({
  planId: z.string(),
  drivers: z.array(driverSchema),
})

type Driver = z.infer<typeof driverSchema>

export type DriverEmailResult = {
  truckId: string
  email: string
  sent: boolean
  skipped?: boolean
  reason?: 'no_email' | 'email_not_configured' | 'send_failed'
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildHtml(driver: Driver) {
  const rows = driver.stops
    .map((stop) => {
      const items = stop.items
        .map((item) => `${escapeHtml(item.name)} ×${item.qty}`)
        .join('، ')
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;color:#2E8B57;">${stop.order}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
            <div style="font-weight:700;color:#111827;">${escapeHtml(stop.place)}</div>
            ${stop.address ? `<div style="font-size:12px;color:#6b7280;">${escapeHtml(stop.address)}</div>` : ''}
          </td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:700;">${stop.totalBoxes}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${items || '—'}</td>
        </tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head><meta charset="utf-8" /></head>
  <body style="margin:0;background:#ffffff;font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="border-radius:16px;background:#2E8B57;color:#ffffff;padding:20px 24px;">
        <div style="font-size:20px;font-weight:800;">RTI Route</div>
        <div style="font-size:13px;opacity:.9;">خطة التوصيل اليومية</div>
      </div>
      <div style="padding:20px 4px;">
        <p style="margin:0 0 6px;font-size:15px;"><strong>السائق:</strong> ${escapeHtml(driver.driverName)}</p>
        <p style="margin:0 0 6px;font-size:15px;"><strong>الشاحنة:</strong> ${escapeHtml(driver.truckId)}</p>
        <p style="margin:0 0 6px;font-size:15px;"><strong>عدد التوقفات:</strong> ${driver.stops.length}</p>
        <p style="margin:0 0 16px;font-size:15px;"><strong>إجمالي الصناديق:</strong> ${driver.totalBoxes}</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <thead>
            <tr style="background:#f0f7f3;">
              <th style="padding:10px;font-size:13px;text-align:center;">#</th>
              <th style="padding:10px;font-size:13px;text-align:right;">المكان</th>
              <th style="padding:10px;font-size:13px;text-align:center;">الصناديق</th>
              <th style="padding:10px;font-size:13px;text-align:right;">الأصناف</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:18px 0 0;font-size:12px;color:#6b7280;">تم إنشاء هذه الخطة تلقائيًا بواسطة RTI Route.</p>
      </div>
    </div>
  </body>
</html>`
}

/**
 * Sends the daily route sheet to every driver that has a registered email.
 * Drivers without an email are skipped silently.
 */
export const sendDriverPlanEmails = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env['RESEND_API_KEY']
    const from = process.env['RESEND_FROM'] ?? 'RTI Route <onboarding@resend.dev>'

    const recipients = data.drivers.filter((d) => EMAIL_RE.test(d.email.trim()))
    const skipped: DriverEmailResult[] = data.drivers
      .filter((d) => !EMAIL_RE.test(d.email.trim()))
      .map((d) => ({ truckId: d.truckId, email: d.email, sent: false, skipped: true, reason: 'no_email' as const }))

    if (!apiKey) {
      return {
        configured: false,
        total: recipients.length,
        sent: 0,
        results: [
          ...recipients.map((d) => ({
            truckId: d.truckId,
            email: d.email,
            sent: false,
            reason: 'email_not_configured' as const,
          })),
          ...skipped,
        ],
      }
    }

    const sentResults: DriverEmailResult[] = await Promise.all(
      recipients.map(async (driver): Promise<DriverEmailResult> => {
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              from,
              to: [driver.email.trim()],
              subject: `خطة التوصيل اليومية — ${driver.truckId} (${driver.stops.length} توقف)`,
              html: buildHtml(driver),
            }),
          })
          if (!response.ok) {
            const body = await response.text()
            console.error(`Resend send failed [${response.status}]: ${body}`)
            return {
              truckId: driver.truckId,
              email: driver.email,
              sent: false,
              reason: 'send_failed',
              error: `${response.status}: ${body}`,
            }
          }
          return { truckId: driver.truckId, email: driver.email, sent: true }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          console.error(`Resend send error: ${message}`)
          return {
            truckId: driver.truckId,
            email: driver.email,
            sent: false,
            reason: 'send_failed',
            error: message,
          }
        }
      }),
    )

    const results = [...sentResults, ...skipped]
    return {
      configured: true,
      total: recipients.length,
      sent: results.filter((r) => r.sent).length,
      results,
    }
  })
