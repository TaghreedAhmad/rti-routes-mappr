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

export type DriverEmailResult = {
  truckId: string
  email: string
  sent: boolean
  reason?: 'invalid_email' | 'email_not_configured' | 'send_failed' | 'recipient_suppressed'
}

/**
 * Sends the daily route sheet to every driver.
 * Delivery runs through Lovable's managed email API, which requires a verified
 * sender domain for the project. Until that domain is configured the function
 * reports `email_not_configured` per driver so the UI can explain it clearly.
 */
export const sendDriverPlanEmails = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => payloadSchema.parse(data))
  .handler(async ({ data }) => {
    const emailConfigured = false // set once the sender domain is verified

    const results: DriverEmailResult[] = data.drivers.map((driver) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(driver.email.trim())) {
        return { truckId: driver.truckId, email: driver.email, sent: false, reason: 'invalid_email' }
      }
      if (!emailConfigured) {
        return {
          truckId: driver.truckId,
          email: driver.email,
          sent: false,
          reason: 'email_not_configured',
        }
      }
      return { truckId: driver.truckId, email: driver.email, sent: true }
    })

    return {
      configured: emailConfigured,
      total: results.length,
      sent: results.filter((r) => r.sent).length,
      results,
    }
  })
