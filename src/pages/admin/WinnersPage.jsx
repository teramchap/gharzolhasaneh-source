import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllWinners } from '../../lib/winners'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'

const STATUS_LABEL = {
  awaiting_guarantee_type: 'در انتظار تعیین ضمانت',
  awaiting_documents: 'در انتظار ارائه مدارک',
  awaiting_document_approval: 'در انتظار تایید مدارک',
  awaiting_account_info: 'در انتظار اطلاعات حساب',
  awaiting_deposit: 'در انتظار واریز مبلغ',
  awaiting_deposit_confirmation: 'در انتظار تایید واریز',
  completed: 'تکمیل (پرداخت‌شده)',
}

export default function WinnersPage() {
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthFilter, setMonthFilter] = useState('')

  useEffect(() => {
    listAllWinners().then(({ data }) => {
      setWinners(data ?? [])
      setLoading(false)
    })
  }, [])

  const months = Array.from(
    new Map(winners.map((w) => [w.fund_months?.jalali_month, w.fund_months])).entries()
  )

  const filtered = monthFilter ? winners.filter((w) => w.fund_months?.jalali_month === monthFilter) : winners

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">برندگان</span>
      </header>

      <main className="p-4">
        {months.length > 0 && (
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-right outline-none focus:border-brand-purple-700"
          >
            <option value="">همه ماه‌ها</option>
            {months.map(([ym]) => (
              <option key={ym} value={ym}>
                {jalaliMonthLabel(ym)}
              </option>
            ))}
          </select>
        )}

        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-brand-purple-900/60">هنوز برنده‌ای ثبت نشده است.</p>
        )}

        <div className="space-y-2">
          {filtered.map((w) => (
            <Link
              key={w.id}
              to={`/admin/winners/${w.id}`}
              className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5 transition hover:ring-brand-purple-700"
            >
              <div>
                <p className="font-bold text-brand-purple-900">
                  {w.payer?.full_name ?? w.shares?.users?.full_name}
                </p>
                <p className="text-xs text-brand-purple-900/50">
                  {w.fund_months?.funds?.name} — {jalaliMonthLabel(w.fund_months?.jalali_month)}
                </p>
              </div>
              <div className="text-left">
                <p className="tnum font-bold text-brand-purple-900">{formatAmount(w.payout_amount)}</p>
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold ' +
                    (w.status === 'completed'
                      ? 'bg-brand-green-100 text-brand-green-600'
                      : 'bg-brand-yellow-200 text-brand-purple-900')
                  }
                >
                  {STATUS_LABEL[w.status]}
                </span>
              </div>
            </Link>
          ))}
        </div>
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
