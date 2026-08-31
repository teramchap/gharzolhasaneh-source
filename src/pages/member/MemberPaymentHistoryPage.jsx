import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyReceipts } from '../../lib/receipts'
import { getMyDeductions } from '../../lib/deductions'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'

const RECEIPT_STATUS_LABEL = {
  pending_review: { text: 'در انتظار تایید فیش', className: 'bg-brand-yellow-200 text-brand-purple-900' },
  pending_transfer: { text: 'در انتظار تایید نهایی', className: 'bg-brand-yellow-200 text-brand-purple-900' },
  confirmed: { text: 'تایید شده', className: 'bg-brand-green-100 text-brand-green-600' },
  rejected: { text: 'رد شده', className: 'bg-brand-red-100 text-brand-red-600' },
}

export default function MemberPaymentHistoryPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    if (!profile?.id) return
    Promise.all([getMyReceipts(profile.id), getMyDeductions(profile.id)]).then(([{ data: receipts }, deductions]) => {
      const receiptRows = (receipts ?? []).map((r) => {
        const labels = (r.receipt_installments ?? []).map((ri) => {
          const fundName = ri.installments?.shares?.fund_codes?.funds?.name
          const month = jalaliMonthLabel(ri.installments?.fund_months?.jalali_month)
          return `${fundName} — ${month}`
        })
        return {
          key: `receipt-${r.id}`,
          date: r.deposit_date_jalali,
          amount: r.total_amount,
          statusLabel: RECEIPT_STATUS_LABEL[r.status] ?? RECEIPT_STATUS_LABEL.pending_review,
          detail: labels.join('، '),
          sortKey: r.deposit_date_jalali ?? r.created_at,
        }
      })

      const deductionRows = deductions.map((d) => ({
        key: `deduction-${d.id}`,
        date: d.paid_on_jalali,
        amount: d.due_amount,
        statusLabel: { text: 'کسر از سهم', className: 'bg-brand-green-100 text-brand-green-600' },
        detail: `${d.shares?.fund_codes?.funds?.name} — کد ${d.shares?.fund_codes?.code_number} — ${jalaliMonthLabel(d.fund_months?.jalali_month)}`,
        sortKey: d.paid_on_jalali,
      }))

      const all = [...receiptRows, ...deductionRows].sort((a, b) => (b.sortKey ?? '').localeCompare(a.sortKey ?? ''))
      setRows(all)
    })
  }, [profile?.id])

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">سوابق پرداخت</span>
      </header>

      <main className="space-y-2 p-4">
        {rows === null && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}
        {rows?.length === 0 && <p className="text-sm text-brand-purple-900/60">هنوز پرداختی ثبت نشده است.</p>}

        {rows?.map((row) => (
          <div key={row.key} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-purple-900/70">{row.date ?? '—'}</span>
              <span className={'rounded-full px-2.5 py-0.5 text-xs font-semibold ' + row.statusLabel.className}>
                {row.statusLabel.text}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs text-brand-purple-900/60">{row.detail}</span>
              <span className="tnum font-bold text-brand-purple-900">{formatAmount(row.amount)}</span>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
