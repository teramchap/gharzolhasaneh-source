import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyInstallments, submitReceipt, getPendingAmount } from '../../lib/receipts'
import { getMyWinningMonths, requestDeduction } from '../../lib/deductions'
import { formatAmount, jalaliMonthLabel, todayJalali } from '../../lib/format'
import AmountInput from '../../components/AmountInput'
import JalaliDateInput from '../../components/JalaliDateInput'
import ImageUploadInput from '../../components/ImageUploadInput'

export default function MemberReceiptsPage() {
  const { profile } = useAuth()
  const [installments, setInstallments] = useState([])
  const [winningMonths, setWinningMonths] = useState(new Set())
  const [loading, setLoading] = useState(true)

  async function refresh() {
    if (!profile?.id) return
    setLoading(true)
    const [{ data }, months] = await Promise.all([getMyInstallments(profile.id), getMyWinningMonths(profile.id)])
    setInstallments(data ?? [])
    setWinningMonths(months)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  // Not-yet-settled installments, excluding ones already awaiting a
  // deduction decision (those show their own status instead). Accounts
  // for amounts already submitted but still pending admin review/transfer,
  // so the leftover portion of a partial payment stays selectable.
  const unsettled = installments.filter((i) => {
    if (i.deducted || i.deduction_requested) return false
    const pending = getPendingAmount(i)
    const remaining = Number(i.due_amount) - Number(i.paid_amount || 0) - pending
    return remaining > 0
  })

  // Payable by normal receipt: same as above, split out below for the form.
  const eligible = unsettled

  const pendingDeductions = installments.filter((i) => i.deduction_requested && !i.deducted)

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">پرداخت قسط</span>
      </header>

      <main className="space-y-3 p-4">
        {loading ? (
          <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>
        ) : (
          <>
            {pendingDeductions.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
                <p className="mb-2 text-sm font-bold text-brand-purple-900">در انتظار تایید کسر از سهم</p>
                <div className="space-y-1.5">
                  {pendingDeductions.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between rounded-lg bg-brand-yellow-200 px-3 py-2 text-sm">
                      <span className="text-brand-purple-900">
                        {inst.shares?.fund_codes?.funds?.name} — {jalaliMonthLabel(inst.fund_months?.jalali_month)}
                      </span>
                      <span className="tnum text-brand-purple-900/70">{formatAmount(inst.due_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PaymentForm
              eligible={eligible}
              winningMonths={winningMonths}
              userId={profile.id}
              onDone={refresh}
            />
          </>
        )}
      </main>
    </div>
  )
}

function PaymentForm({ eligible, winningMonths, userId, onDone }) {
  const [hasImage, setHasImage] = useState(true)
  const [totalAmount, setTotalAmount] = useState('')
  const [images, setImages] = useState([])
  const [depositDate, setDepositDate] = useState(todayJalaliDash())
  const [cardLast4, setCardLast4] = useState('')
  const [selected, setSelected] = useState({}) // installmentId -> amount string
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [requestingId, setRequestingId] = useState(null)

  function toggle(inst) {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[inst.id] !== undefined) {
        delete next[inst.id]
      } else {
        const remaining = Number(inst.due_amount) - Number(inst.paid_amount || 0) - getPendingAmount(inst)
        next[inst.id] = String(remaining)
      }
      return next
    })
  }

  async function handleRequestDeduction(inst) {
    if (!confirm('درخواست کسر از سهم برای این قسط ثبت شود؟ بعد از تایید مدیر، این قسط تسویه‌شده حساب می‌شود.')) return
    setRequestingId(inst.id)
    await requestDeduction(inst.id)
    setRequestingId(null)
    onDone()
  }

  const sumSelected = Object.values(selected).reduce((sum, v) => sum + (Number(v) || 0), 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!totalAmount || Number(totalAmount) <= 0) return setError('مبلغ کل واریزی را وارد کنید.')
    if (Object.keys(selected).length === 0) return setError('حداقل یک سهم را برای این فیش انتخاب کنید.')
    if (sumSelected !== Number(totalAmount)) {
      return setError(`مجموع مبالغ انتخاب‌شده (${formatAmount(sumSelected)}) باید برابر مبلغ کل واریزی باشد.`)
    }
    if (hasImage && images.length === 0) return setError('حداقل یک عکس از فیش را ضمیمه کنید.')
    if (!depositDate || depositDate.split('-').length !== 3) return setError('تاریخ واریز را انتخاب کنید.')
    if (!hasImage && !/^\d{4}$/.test(cardLast4)) return setError('۴ رقم آخر کارت را درست وارد کنید.')

    setSubmitting(true)
    const allocations = Object.entries(selected).map(([installmentId, amount]) => ({
      installmentId,
      amount: Number(amount),
    }))
    const { error: submitError } = await submitReceipt({
      userId,
      totalAmount: Number(totalAmount),
      images,
      allocations,
      hasImage,
      depositDateJalali: depositDate,
      cardLast4,
    })
    setSubmitting(false)

    if (submitError) return setError('خطا در ثبت فیش. دوباره تلاش کنید.')
    setTotalAmount('')
    setImages([])
    setSelected({})
    onDone()
  }

  if (eligible.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-center text-sm text-brand-purple-900/60 shadow-sm ring-1 ring-brand-purple-900/5">
        فعلاً قسط پرداخت‌نشده‌ای ندارید. 🎉
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <label className="flex items-center gap-2 text-sm text-brand-purple-900">
        <input type="checkbox" checked={!hasImage} onChange={(e) => setHasImage(!e.target.checked)} />
        تصویر فیش را ندارم
      </label>

      {hasImage ? (
        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-purple-900">عکس فیش</label>
          <ImageUploadInput files={images} onChange={setImages} multiple />
        </div>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-semibold text-brand-purple-900">۴ رقم آخر کارت</label>
          <input
            value={cardLast4}
            onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
            dir="ltr"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-right outline-none focus:border-brand-purple-700"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-brand-purple-900">تاریخ واریز</label>
        <JalaliDateInput value={depositDate} onChange={setDepositDate} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-brand-purple-900">مبلغ کل واریزی (تومان)</label>
        <AmountInput
          value={totalAmount}
          onChange={setTotalAmount}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
          این واریزی بابت کدام سهم‌هاست؟
        </label>
        <div className="space-y-2">
          {eligible.map((inst) => {
            const remaining = Number(inst.due_amount) - Number(inst.paid_amount || 0) - getPendingAmount(inst)
            const checked = selected[inst.id] !== undefined
            const isWinningMonth = winningMonths.has(inst.fund_months?.jalali_month)

            return (
              <div key={inst.id} className="rounded-xl border border-gray-200 p-3">
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input type="checkbox" checked={checked} onChange={() => toggle(inst)} />
                    <span className="font-semibold text-brand-purple-900">
                      {inst.shares?.fund_codes?.funds?.name} — کد {inst.shares?.fund_codes?.code_number} —{' '}
                      {jalaliMonthLabel(inst.fund_months?.jalali_month)}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-xs text-brand-purple-900/50">{formatAmount(remaining)}</span>
                </label>

                {checked && (
                  <div className="mt-2">
                    <AmountInput
                      value={selected[inst.id]}
                      onChange={(v) => setSelected((prev) => ({ ...prev, [inst.id]: v }))}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
                    />
                    <p className="mt-1 text-xs text-brand-purple-900/50">
                      باقیمانده این سهم: {formatAmount(remaining)} تومان
                    </p>
                  </div>
                )}

                {isWinningMonth && (
                  <button
                    type="button"
                    onClick={() => handleRequestDeduction(inst)}
                    disabled={requestingId === inst.id}
                    className="mt-2 w-full rounded-lg bg-brand-yellow-300 py-2 text-xs font-bold text-brand-purple-900 disabled:opacity-60"
                  >
                    {requestingId === inst.id ? 'در حال ثبت…' : 'درخواست کسر از سهم (به‌جای واریز)'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {Object.keys(selected).length > 0 && (
          <p className="mt-2 text-xs text-brand-purple-900/60">
            مجموع انتخاب‌شده: <span className="tnum font-bold">{formatAmount(sumSelected)}</span> تومان
          </p>
        )}
      </div>

      {error && <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ارسال…' : 'ارسال فیش'}
      </button>
    </form>
  )
}

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

function todayJalaliDash() {
  return todayJalali().replaceAll('/', '-')
}
