import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFunds, createFund } from '../../lib/funds'
import { formatAmount, todayJalali } from '../../lib/format'
import AmountInput from '../../components/AmountInput'
import JalaliDateInput from '../../components/JalaliDateInput'

export default function FundsPage() {
  const [funds, setFunds] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function refresh() {
    setLoading(true)
    const { data, error } = await listFunds()
    if (!error) setFunds(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center justify-between bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="text-white/80 hover:text-white">
            <BackIcon className="h-5 w-5" />
          </Link>
          <span className="font-bold">صندوق‌ها</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-yellow-300 px-3 py-1.5 text-sm font-bold text-brand-purple-900"
        >
          + صندوق جدید
        </button>
      </header>

      <main className="p-4">
        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}

        {!loading && funds.length === 0 && (
          <p className="text-sm text-brand-purple-900/60">هنوز هیچ صندوقی ثبت نشده است.</p>
        )}

        <div className="space-y-3">
          {funds.map((f) => (
            <Link
              to={`/admin/funds/${f.id}`}
              key={f.id}
              className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5 transition hover:ring-brand-purple-700"
            >              <div className="flex items-center justify-between">
                <p className="font-bold text-brand-purple-900">{f.name}</p>
                <span
                  className={
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                    (f.status === 'active'
                      ? 'bg-brand-green-100 text-brand-green-600'
                      : 'bg-gray-100 text-gray-500')
                  }
                >
                  {f.status === 'active' ? 'فعال' : 'تکمیل‌شده'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-brand-purple-900/70">
                <div>
                  <p className="tnum font-bold text-brand-purple-900">{formatAmount(f.total_amount)}</p>
                  <p>مبلغ کل (تومان)</p>
                </div>
                <div>
                  <p className="tnum font-bold text-brand-purple-900">{f.share_count}</p>
                  <p>تعداد کد</p>
                </div>
                <div>
                  <p className="tnum font-bold text-brand-purple-900">
                    {formatAmount(f.installment_amount)}
                  </p>
                  <p>قسط هر کد (تومان)</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {showForm && (
        <NewFundModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function NewFundModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [shareCount, setShareCount] = useState('')
  const [startMonth, setStartMonth] = useState(todayJalali().replaceAll('/', '-').slice(0, 7))
  const [durationMonths, setDurationMonths] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const total = Number(totalAmount)
    const count = Number(shareCount)
    const duration = Number(durationMonths)

    if (!name.trim()) return setError('نام صندوق را وارد کنید.')
    if (!total || total <= 0) return setError('مبلغ کل باید عددی بزرگ‌تر از صفر باشد.')
    if (!count || count <= 0 || !Number.isInteger(count)) {
      return setError('تعداد کد باید یک عدد صحیح بزرگ‌تر از صفر باشد.')
    }
    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      return setError('ماه شروع را به شکل ۱۴۰۴-۰۵ وارد کنید.')
    }
    if (!duration || duration <= 0 || !Number.isInteger(duration)) {
      return setError('مدت زمان (تعداد ماه) باید یک عدد صحیح بزرگ‌تر از صفر باشد.')
    }

    setSubmitting(true)
    const { error: createError } = await createFund({
      name: name.trim(),
      total_amount: total,
      share_count: count,
      start_month_jalali: startMonth,
      duration_months: duration,
    })
    setSubmitting(false)

    if (createError) {
      setError('خطا در ثبت صندوق. دوباره تلاش کنید.')
      return
    }
    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-brand-purple-900">صندوق جدید</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">نام صندوق</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: صندوق بهار ۱۴۰۴"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              مبلغ کل صندوق (تومان)
            </label>
            <AmountInput
              value={totalAmount}
              onChange={setTotalAmount}
              placeholder="مثال: 400,000,000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">تعداد کد</label>
            <input
              type="number"
              inputMode="numeric"
              value={shareCount}
              onChange={(e) => {
                setShareCount(e.target.value)
                if (!durationMonths) setDurationMonths(e.target.value)
              }}
              placeholder="مثال: 20"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              ماه شروع
            </label>
            <JalaliDateInput value={startMonth} onChange={setStartMonth} monthOnly />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              مدت (ماه)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              placeholder="مثال: 20"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          {totalAmount && shareCount && Number(shareCount) > 0 && (
            <p className="text-xs text-brand-purple-900/60">
              قسط هر کد: <span className="tnum font-bold">{formatAmount(Number(totalAmount) / Number(shareCount))}</span> تومان
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'در حال ثبت…' : 'ثبت صندوق'}
            </button>
          </div>
        </form>
      </div>
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
