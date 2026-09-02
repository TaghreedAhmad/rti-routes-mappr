import { createServerFn } from '@tanstack/react-start'

export type InsightsInput = {
  totalBoxes: number
  stops: number
  trucksUsed: number
  thirdPartyActivated: number
  emergencyActivated: number
  distanceEfficiency: number
  totalDistanceKm: number
  idealDistanceKm: number
  unassignedStops: number
  skippedRows: number
  routes: Array<{
    truckId: string
    provider: 'own' | 'thirdParty'
    stops: number
    boxes: number
    capacity: number
    utilization: number
    distanceKm: number
    areaKm2: number
    trips: number
    delayMinutes?: number
  }>
}

export type InsightsResult = {
  ok: boolean
  /** 3-5 short Arabic bullet points. */
  points: string[]
  reason?: string
}

const MODEL = 'google/gemini-3.6-flash'

export const generateDailyInsights = createServerFn({ method: 'POST' })
  .inputValidator((input: InsightsInput) => input)
  .handler(async ({ data }): Promise<InsightsResult> => {
    const apiKey = process.env['LOVABLE_API_KEY']
    if (!apiKey) {
      return { ok: false, points: [], reason: 'missing_key' }
    }

    const prompt = `أنت محلل عمليات لوجستية لمنصة RTI Route في جدة. حلّل بيانات توزيع اليوم التالية وأعطني من 3 إلى 5 نقاط قصيرة بالعربية فقط.
ركّز على: أنماط تكرار التأخير (أي مسارات/مناطق تتأخر أكثر)، كفاءة استغلال سعة الشاحنات، وأي ملاحظات غير طبيعية بالبيانات.
أعد النتيجة كنقاط، كل نقطة في سطر يبدأ بـ "- "، بدون مقدمات ولا خواتيم.

البيانات (JSON):
${JSON.stringify(data)}`

    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        return {
          ok: false,
          points: [],
          reason: response.status === 429 ? 'rate_limited' : `http_${response.status}: ${text.slice(0, 200)}`,
        }
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const content = payload.choices?.[0]?.message?.content ?? ''
      const points = content
        .split('\n')
        .map((line) => line.replace(/^[-*•\d.\s]+/, '').trim())
        .filter((line) => line.length > 0)
        .slice(0, 5)

      if (points.length === 0) return { ok: false, points: [], reason: 'empty_response' }
      return { ok: true, points }
    } catch (error) {
      return {
        ok: false,
        points: [],
        reason: error instanceof Error ? error.message : 'request_failed',
      }
    }
  })
