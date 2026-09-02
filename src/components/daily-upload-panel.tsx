import { useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Mail,
  RotateCcw,
  Upload,
} from 'lucide-react'
import { useApp } from '@/components/app-providers'
import { Panel } from '@/components/panel'
import { Button } from '@/components/ui/button'
import {
  buildDailyPlan,
  clearDailyPlan,
  readSpreadsheet,
  setDailyPlan,
  useDailyPlan,
} from '@/lib/daily-plan'
import { getDriverEmails } from '@/lib/driver-emails'
import { sendDriverPlanEmails, type DriverEmailResult } from '@/lib/driver-plan-emails.functions'

type EmailState = {
  total: number
  sent: number
  configured: boolean
  results: DriverEmailResult[]
} | null

export function DailyUploadPanel() {
  const { lang } = useApp()
  const ar = lang === 'ar'
  const plan = useDailyPlan()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailState, setEmailState] = useState<EmailState>(null)

  async function process(selected: File) {
    setBusy(true)
    setError(null)
    setEmailState(null)
    try {
      const rows = await readSpreadsheet(selected)
      if (rows.length === 0) {
        setError(ar ? 'الملف فارغ أو غير مقروء.' : 'The file is empty or unreadable.')
        return
      }
      const next = buildDailyPlan(selected.name, rows)
      if (next.stops.length === 0) {
        setError(
          ar
            ? 'لم يتم العثور على صفوف صحيحة. تأكد من وجود أعمدة: اسم المكان، الصنف، الكمية.'
            : 'No valid rows found. Ensure columns exist: place, item, quantity.',
        )
        return
      }
      setDailyPlan(next)

      const emails = getDriverEmails()
      const drivers = next.routes
        .filter((route) => route.stops.length > 0)
        .map((route) => ({
          truckId: route.truckId,
          driverName: route.driver[lang],
          email: emails[route.truckId] ?? '',
          totalBoxes: route.totalBoxes,
          stops: route.stops.map((stop, index) => ({
            order: index + 1,
            place: stop.place,
            address: stop.address,
            totalBoxes: stop.totalBoxes,
            items: stop.items,
          })),
        }))

      const response = await sendDriverPlanEmails({
        data: { planId: String(next.createdAt), drivers },
      })
      setEmailState(response)
    } catch (e) {
      setError(
        (ar ? 'تعذر تحليل الملف: ' : 'Could not parse the file: ') +
          (e instanceof Error ? e.message : String(e)),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileSpreadsheet className="size-4 text-primary" />
            {ar ? 'بيانات الطلبات اليومية' : 'Daily order data'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar
              ? 'ارفع ملف اليوم (Excel أو CSV) ليتم تجميع الطلبيات وتوزيعها تلقائيًا على الشاحنات.'
              : 'Upload today’s file (Excel or CSV) to aggregate orders and dispatch them automatically.'}
          </p>
        </div>
        {plan && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              clearDailyPlan()
              setFile(null)
              setEmailState(null)
              setError(null)
            }}
          >
            <RotateCcw className="size-4" />
            {ar ? 'إعادة تعيين' : 'Reset'}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null
            setFile(selected)
            setError(null)
            setEmailState(null)
            if (selected) void process(selected)
          }}
        />
        <Button className="gap-2" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" />
          {ar ? 'رفع ملف بيانات اليوم' : 'Upload today’s data file'}
        </Button>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {file
            ? file.name
            : ar
              ? 'الصيغ المدعومة: .xlsx، .xls، .csv'
              : 'Supported: .xlsx, .xls, .csv'}
        </span>
        {file && !busy && (
          <Button variant="outline" size="sm" onClick={() => void process(file)}>
            {ar ? 'معالجة البيانات' : 'Process data'}
          </Button>
        )}
      </div>

      {busy && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-primary/5 p-3 text-sm font-semibold text-primary">
          <Loader2 className="size-4 animate-spin" />
          {ar ? 'جاري تحليل البيانات وتوزيع الطلبات...' : 'Analyzing data and dispatching orders...'}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {plan && !busy && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Summary label={ar ? 'صفوف مستلمة' : 'Rows received'} value={String(plan.receivedRows)} />
            <Summary
              label={ar ? 'نقاط التوصيل' : 'Delivery stops'}
              value={`${plan.stops.length} · ${plan.totalBoxes} ${ar ? 'صندوق' : 'boxes'}`}
            />
            <Summary label={ar ? 'شاحنات مستخدمة' : 'Trucks used'} value={String(plan.trucksUsed)} />
            <Summary
              label={ar ? 'طرف ثالث' : 'Third party'}
              value={
                plan.thirdPartyActivated > 0
                  ? `${plan.thirdPartyActivated} ${ar ? 'مفعّلة' : 'activated'}`
                  : ar
                    ? 'غير مفعّل'
                    : 'Not needed'
              }
              tone={plan.thirdPartyActivated > 0 ? 'warning' : 'primary'}
            />
          </div>

          {plan.rowErrors.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-3.5" />
                {ar
                  ? `تم تجاهل ${plan.rowErrors.length} صف لوجود مشكلة`
                  : `${plan.rowErrors.length} rows skipped due to issues`}
              </div>
              <ul className="mt-2 space-y-1">
                {plan.rowErrors.slice(0, 5).map((rowError) => (
                  <li key={rowError.row}>
                    {ar ? `صف ${rowError.row}: ` : `Row ${rowError.row}: `}
                    {rowError.reason[lang]}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.unassignedStops.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              {ar
                ? `${plan.unassignedStops.length} نقطة توصيل تجاوزت طاقة الأسطول بالكامل ولم يتم إسنادها.`
                : `${plan.unassignedStops.length} stops exceeded the total fleet capacity and stayed unassigned.`}
            </div>
          )}

          {emailState && (
            <div
              className={`flex items-start gap-2 rounded-xl p-3 text-xs font-semibold ${
                emailState.sent === emailState.total && emailState.total > 0
                  ? 'bg-primary/10 text-primary'
                  : 'bg-warning/10 text-warning'
              }`}
            >
              {emailState.sent === emailState.total && emailState.total > 0 ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <Mail className="mt-0.5 size-4 shrink-0" />
              )}
              <div className="space-y-1">
                <div>
                  {ar
                    ? `تم إرسال البريد لـ ${emailState.sent} من أصل ${emailState.total} سائق`
                    : `Emails sent to ${emailState.sent} of ${emailState.total} drivers`}
                </div>
                {!emailState.configured && (
                  <div className="font-normal">
                    {ar
                      ? 'لتفعيل الإرسال الفعلي يلزم إعداد نطاق البريد الخاص بالشركة أولًا.'
                      : 'Actual delivery requires configuring your company sender domain first.'}
                  </div>
                )}
                {emailState.results
                  .filter((result) => !result.sent && result.reason === 'invalid_email')
                  .map((result) => (
                    <div key={result.truckId} className="font-normal">
                      {ar
                        ? `${result.truckId}: بريد السائق غير مسجل أو غير صحيح`
                        : `${result.truckId}: driver email missing or invalid`}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

function Summary({
  label,
  value,
  tone = 'primary',
}: {
  label: string
  value: string
  tone?: 'primary' | 'warning'
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-sm font-black tabular-nums ${tone === 'warning' ? 'text-warning' : 'text-foreground'}`}
      >
        {value}
      </div>
    </div>
  )
}
