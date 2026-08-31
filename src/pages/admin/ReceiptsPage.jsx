import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listReceiptsByStatus,
  getReceiptImageUrl,
  approveReceipt,
  rejectReceipt,
  finalConfirmReceipt,
} from '../../lib/receipts'
import { listDeductionRequests, approveDeduction, rejectDeduction } from '../../lib/deductions'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'

export default function AdminReceiptsPage() {
  const [tab, setTab] = useState('review')
  const [reviewList, setReviewList] = useState([])
  const [transferList, setTransferList] = useState([])
  const [deductionList, setDeductionList] = useState([])
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const [{ data: r }, { data: t }, { data: d }] = await Promise.all([
      listReceiptsByStatus('pending_review'),
      listReceiptsByStatus('pending_transfer'),
      listDeductionRequests(),
    ])
    setReviewList(r ?? [])
    setTransferList(t ?? [])
    setDeductionList(d ?? [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">فیش‌های پرداختی</span>
      </header>

      <main className="p-4">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setTab('review')}
            className={
              'flex-1 rounded-xl py-2 text-xs font-bold ' +
              (tab === 'review' ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900')
            }
          >
            تایید فیش ({reviewList.length})
          </button>
          <button
            onClick={() => setTab('transfer')}
            className={
              'flex-1 rounded-xl py-2 text-xs font-bold ' +
              (tab === 'transfer' ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900')
            }
          >
            تایید نهایی ({transferList.length})
          </button>
          <button
            onClick={() => setTab('deduction')}
            className={
              'flex-1 rounded-xl py-2 text-xs font-bold ' +
              (tab === 'deduction' ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900')
            }
          >
            کسر از سهم ({deductionList.length})
          </button>
        </div>

        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}

        {tab === 'review' && (
          <div className="space-y-3">
            {reviewList.length === 0 && !loading && (
              <p className="text-sm text-brand-purple-900/60">فیشی در انتظار بررسی نیست.</p>
            )}
            {reviewList.map((r) => (
              <ReviewCard key={r.id} receipt={r} onDone={refresh} />
            ))}
          </div>
        )}

        {tab === 'transfer' && (
          <div className="space-y-3">
            {transferList.length === 0 && !loading && (
              <p className="text-sm text-brand-purple-900/60">فیشی در انتظار تایید نهایی نیست.</p>
            )}
            {transferList.map((r) => (
              <TransferCard key={r.id} receipt={r} onDone={refresh} />
            ))}
          </div>
        )}

        {tab === 'deduction' && (
          <div className="space-y-3">
            {deductionList.length === 0 && !loading && (
              <p className="text-sm text-brand-purple-900/60">درخواست کسر از سهمی در انتظار نیست.</p>
            )}
            {deductionList.map((inst) => (
              <DeductionCard key={inst.id} installment={inst} onDone={refresh} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ReviewCard({ receipt, onDone }) {
  const [expanded, setExpanded] = useState(false)
  const [cardLast4, setCardLast4] = useState(receipt.card_last4 ?? '')
  const [rejectReason, setRejectReason] = useState('')
  const [showReject, setShowReject] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove() {
    setError('')
    if (!/^\d{4}$/.test(cardLast4)) return setError('۴ رقم آخر کارت را درست وارد کنید.')
    setSubmitting(true)
    const { error: err } = await approveReceipt(receipt.id, cardLast4)
    setSubmitting(false)
    if (err) return setError('خطا در تایید فیش.')
    onDone()
  }

  async function handleReject() {
    setError('')
    if (!rejectReason.trim()) return setError('علت رد را بنویسید.')
    setSubmitting(true)
    const { error: err } = await rejectReceipt(receipt.id, rejectReason.trim())
    setSubmitting(false)
    if (err) return setError('خطا در رد فیش.')
    onDone()
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-right">
        <div>
          <p className="font-bold text-brand-purple-900">{receipt.users?.full_name}</p>
        </div>
        <span className="tnum font-bold text-brand-purple-900">{formatAmount(receipt.total_amount)}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-brand-purple-100 pt-3">
          {!receipt.has_image && (
            <p className="text-xs text-brand-purple-900/60">
              بدون تصویر فیش — تاریخ واریز اعلام‌شده: {receipt.deposit_date_jalali}
            </p>
          )}
          {(receipt.receipt_images ?? []).length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {receipt.receipt_images.map((img, i) => (
                <a key={i} href={getReceiptImageUrl(img.storage_path)} target="_blank" rel="noreferrer">
                  <img
                    src={getReceiptImageUrl(img.storage_path)}
                    alt="فیش"
                    className="h-24 w-24 rounded-lg object-cover ring-1 ring-brand-purple-900/10"
                  />
                </a>
              ))}
            </div>
          )}

          <div className="space-y-1">
            {(receipt.receipt_installments ?? []).map((ri, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-brand-purple-100 px-3 py-1.5 text-sm">
                <span className="text-brand-purple-900">
                  {ri.installments?.shares?.fund_codes?.funds?.name} — کد {ri.installments?.shares?.fund_codes?.code_number} —{' '}
                  {jalaliMonthLabel(ri.installments?.fund_months?.jalali_month)}
                </span>
                <span className="tnum text-brand-purple-900/70">{formatAmount(ri.amount_applied)}</span>
              </div>
            ))}
          </div>

          {!showReject ? (
            <div className="space-y-2">
              <input
                value={cardLast4}
                onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="۴ رقم آخر کارت واریزی"
                dir="ltr"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
              />
              {error && <p className="text-xs text-brand-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 rounded-lg border border-brand-red-600 py-2 text-sm font-semibold text-brand-red-600"
                >
                  رد فیش
                </button>
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-purple-900 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? 'در حال ثبت…' : 'تایید فیش'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="علت رد فیش را بنویسید…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
                rows={2}
              />
              {error && <p className="text-xs text-brand-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReject(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-brand-purple-900"
                >
                  انصراف
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-red-600 py-2 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? 'در حال ثبت…' : 'ثبت رد فیش'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TransferCard({ receipt, onDone }) {
  const [submitting, setSubmitting] = useState(false)

  async function handleConfirm() {
    setSubmitting(true)
    await finalConfirmReceipt(receipt.id)
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <div>
        <p className="font-bold text-brand-purple-900">{receipt.users?.full_name}</p>
        <p className="text-xs text-brand-purple-900/50" dir="ltr">
          کارت: ****{receipt.card_last4}
        </p>
        <p className="tnum text-sm text-brand-purple-900/70">{formatAmount(receipt.total_amount)} تومان</p>
      </div>
      <button
        onClick={handleConfirm}
        disabled={submitting}
        className="rounded-lg bg-brand-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {submitting ? '…' : 'تایید نهایی'}
      </button>
    </div>
  )
}

function DeductionCard({ installment, onDone }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove() {
    setSubmitting(true)
    await approveDeduction(installment.id)
    setSubmitting(false)
    onDone()
  }

  async function handleReject() {
    setError('')
    if (!reason.trim()) return setError('علت رد را بنویسید.')
    setSubmitting(true)
    await rejectDeduction(installment.id, reason.trim())
    setSubmitting(false)
    onDone()
  }

  const payerName = installment.payer?.full_name ?? installment.shares?.users?.full_name

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-brand-purple-900">{payerName}</p>
          <p className="text-xs text-brand-purple-900/50">
            {installment.shares?.fund_codes?.funds?.name} — کد {installment.shares?.fund_codes?.code_number} —{' '}
            {jalaliMonthLabel(installment.fund_months?.jalali_month)}
          </p>
        </div>
        <span className="tnum font-bold text-brand-purple-900">{formatAmount(installment.due_amount)}</span>
      </div>

      {!showReject ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShowReject(true)}
            className="flex-1 rounded-lg border border-brand-red-600 py-2 text-sm font-semibold text-brand-red-600"
          >
            رد درخواست
          </button>
          <button
            onClick={handleApprove}
            disabled={submitting}
            className="flex-1 rounded-lg bg-brand-purple-900 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ثبت…' : 'تایید کسر از سهم'}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="علت رد را بنویسید…"
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
          />
          {error && <p className="text-xs text-brand-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => setShowReject(false)}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-brand-purple-900"
            >
              انصراف
            </button>
            <button
              onClick={handleReject}
              disabled={submitting}
              className="flex-1 rounded-lg bg-brand-red-600 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'در حال ثبت…' : 'ثبت رد'}
            </button>
          </div>
        </div>
      )}
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
