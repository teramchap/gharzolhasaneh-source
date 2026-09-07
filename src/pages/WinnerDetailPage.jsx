import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getWinner,
  setGuaranteeType,
  approveDocuments,
  rejectDocuments,
  approveAccountInfo,
  rejectAccountInfo,
  uploadPayoutReceipt,
  uploadGuaranteeDocuments,
  submitAccountInfo,
  confirmReceived,
  getWinnerImageUrl,
} from '../lib/winners'
import { formatAmount, jalaliMonthLabel } from '../lib/format'
import ImageUploadInput from '../components/ImageUploadInput'

const STAGES = [
  { key: 'awaiting_guarantee_type', label: 'تعیین نوع ضمانت' },
  { key: 'awaiting_documents', label: 'ارائه مدارک ضمانت' },
  { key: 'awaiting_document_approval', label: 'تایید مدارک' },
  { key: 'awaiting_account_info', label: 'اطلاعات حساب' },
  { key: 'awaiting_account_info_approval', label: 'تایید اطلاعات حساب' },
  { key: 'awaiting_deposit', label: 'واریز مبلغ' },
  { key: 'awaiting_deposit_confirmation', label: 'تایید دریافت وجه' },
  { key: 'completed', label: 'تکمیل' },
]

export default function WinnerDetailPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [winner, setWinner] = useState(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const { data } = await getWinner(id)
    setWinner(data)
    setLoading(false)
    // Once the member confirms receipt, send them back to their dashboard
    // right away instead of waiting for a manual "back" click.
    if (data?.status === 'completed' && profile?.role === 'member') {
      navigate('/', { replace: true })
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-purple-100 text-brand-purple-900/60">
        در حال بارگذاری…
      </div>
    )
  }
  if (!winner) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-purple-100 text-brand-purple-900/60">
        یافت نشد.
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const isOwner = winner.payer?.id === profile?.id || winner.shares?.user_id === profile?.id
  const backTo = isAdmin ? '/admin/winners' : '/'

  if (!isAdmin && !isOwner) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-purple-100 text-brand-purple-900/60">
        دسترسی ندارید.
      </div>
    )
  }

  const currentIndex = STAGES.findIndex((s) => s.key === winner.status)

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <Link to={backTo} className="text-white/80 hover:text-white">
            <BackIcon className="h-5 w-5" />
          </Link>
          <span className="font-bold">فرآیند پرداخت به برنده</span>
        </div>
        <p className="mt-1 text-sm text-white/80">
          {winner.payer?.full_name ?? winner.shares?.users?.full_name} — {winner.fund_months?.funds?.name} —{' '}
          {jalaliMonthLabel(winner.fund_months?.jalali_month)}
        </p>
        <p className="tnum mt-0.5 text-sm font-bold">{formatAmount(winner.payout_amount)} تومان</p>
      </header>

      <main className="p-4">
        <div className="mb-4 space-y-1">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <span
                className={
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ' +
                  (i < currentIndex
                    ? 'bg-brand-green-600 text-white'
                    : i === currentIndex
                    ? 'bg-brand-yellow-300 text-brand-purple-900'
                    : 'bg-gray-200 text-gray-400')
                }
              >
                {i < currentIndex ? '✓' : i + 1}
              </span>
              <span className={'text-sm ' + (i === currentIndex ? 'font-bold text-brand-purple-900' : 'text-brand-purple-900/50')}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
          <StageAction winner={winner} isAdmin={isAdmin} onDone={refresh} />
        </div>
      </main>
    </div>
  )
}

function StageAction({ winner, isAdmin, onDone }) {
  if (winner.status === 'awaiting_guarantee_type') {
    if (!isAdmin) return <WaitingMessage text="در انتظار تعیین نوع ضمانت توسط مدیر." />
    return <GuaranteeTypeForm winnerId={winner.id} onDone={onDone} />
  }

  if (winner.status === 'awaiting_documents') {
    if (isAdmin) return <WaitingMessage text="در انتظار بارگذاری مدارک توسط برنده." />
    return <UploadDocsForm winnerId={winner.id} rejectionReason={winner.document_rejection_reason} onDone={onDone} />
  }

  if (winner.status === 'awaiting_document_approval') {
    if (!isAdmin) return <WaitingMessage text="مدارک شما در حال بررسی توسط مدیر است." />
    return <ReviewDocsPanel winner={winner} onDone={onDone} />
  }

  if (winner.status === 'awaiting_account_info') {
    if (isAdmin) return <WaitingMessage text="در انتظار ثبت اطلاعات حساب توسط برنده." />
    return <AccountInfoForm winnerId={winner.id} rejectionReason={winner.account_info_rejection_reason} onDone={onDone} />
  }

  if (winner.status === 'awaiting_account_info_approval') {
    if (!isAdmin) return <WaitingMessage text="اطلاعات حساب شما در حال بررسی توسط مدیر است." />
    return <ReviewAccountInfoPanel winner={winner} onDone={onDone} />
  }

  if (winner.status === 'awaiting_deposit') {
    if (!isAdmin) {
      return (
        <div className="space-y-2 text-sm text-brand-purple-900/70">
          <p>در انتظار واریز مبلغ توسط مدیر.</p>
          <div className="rounded-lg bg-brand-purple-100 p-3">
            <p>شبا: {winner.sheba_number}</p>
            <p>بانک: {winner.bank_name}</p>
            <p>صاحب حساب: {winner.account_holder_name}</p>
          </div>
        </div>
      )
    }
    return <UploadPayoutForm winnerId={winner.id} winner={winner} onDone={onDone} />
  }

  if (winner.status === 'awaiting_deposit_confirmation') {
    if (isAdmin) return <WaitingMessage text="در انتظار تایید دریافت وجه توسط برنده." />
    return <ConfirmReceiptPanel winner={winner} onDone={onDone} />
  }

  return <WaitingMessage text="این فرآیند تکمیل شده است. ✓" success />
}

function WaitingMessage({ text, success }) {
  return <p className={'text-sm ' + (success ? 'font-bold text-brand-green-600' : 'text-brand-purple-900/60')}>{text}</p>
}

function GuaranteeTypeForm({ winnerId, onDone }) {
  const [checkSelected, setCheckSelected] = useState(false)
  const [noteSelected, setNoteSelected] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    const types = []
    if (checkSelected) types.push('check')
    if (noteSelected) types.push('promissory_note')
    await setGuaranteeType(winnerId, types)
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-brand-purple-900">آیا از برنده ضمانت لازم دارید؟</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={checkSelected} onChange={(e) => setCheckSelected(e.target.checked)} />
        چک
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={noteSelected} onChange={(e) => setNoteSelected(e.target.checked)} />
        سفته
      </label>
      <p className="text-xs text-brand-purple-900/50">اگر هیچ‌کدام را انتخاب نکنید، مستقیم به مرحله دریافت اطلاعات حساب می‌رود.</p>
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ثبت…' : 'ثبت و ادامه'}
      </button>
    </div>
  )
}

function UploadDocsForm({ winnerId, rejectionReason, onDone }) {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    if (files.length === 0) return setError('حداقل یک تصویر مدرک را انتخاب کنید.')
    setSubmitting(true)
    const { error: err } = await uploadGuaranteeDocuments(winnerId, files)
    setSubmitting(false)
    if (err) return setError('خطا در بارگذاری.')
    onDone()
  }

  return (
    <div className="space-y-3">
      {rejectionReason && (
        <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">
          مدارک قبلی رد شد: {rejectionReason}
        </p>
      )}
      <p className="text-sm font-semibold text-brand-purple-900">تصاویر مدارک ضمانت (چک/سفته) را بارگذاری کنید.</p>
      <div className="space-y-3 rounded-lg bg-brand-purple-100 p-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-brand-purple-900">راهنمای تکمیل چک:</p>
          <img src="/check-guide.jpg" alt="راهنمای تکمیل چک" className="w-full rounded-lg" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-brand-purple-900">راهنمای تکمیل سفته:</p>
          <img src="/promissory-note-guide.jpg" alt="راهنمای تکمیل سفته" className="w-full rounded-lg" />
        </div>
      </div>
      <ImageUploadInput files={files} onChange={setFiles} multiple />
      {error && <p className="text-xs text-brand-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ارسال…' : 'ارسال مدارک'}
      </button>
    </div>
  )
}

function ReviewDocsPanel({ winner, onDone }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove() {
    setSubmitting(true)
    await approveDocuments(winner.id)
    setSubmitting(false)
    onDone()
  }

  async function handleReject() {
    setError('')
    if (!reason.trim()) return setError('علت رد را بنویسید.')
    setSubmitting(true)
    await rejectDocuments(winner.id, reason.trim())
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-brand-purple-900">مدارک ارسالی:</p>
      <div className="flex gap-2 overflow-x-auto">
        {(winner.guarantee_documents ?? []).map((path, i) => (
          <a key={i} href={getWinnerImageUrl(path)} target="_blank" rel="noreferrer">
            <img src={getWinnerImageUrl(path)} alt="مدرک" className="h-24 w-24 rounded-lg object-cover ring-1 ring-brand-purple-900/10" />
          </a>
        ))}
      </div>

      {!showReject ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowReject(true)}
            className="flex-1 rounded-xl border border-brand-red-600 py-3 text-sm font-semibold text-brand-red-600"
          >
            رد مدارک
          </button>
          <button
            disabled={submitting}
            onClick={handleApprove}
            className="flex-1 rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ثبت…' : 'تایید مدارک'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="علت رد مدارک را بنویسید…"
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
              {submitting ? 'در حال ثبت…' : 'ثبت رد مدارک'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AccountInfoForm({ winnerId, rejectionReason, onDone }) {
  const [sheba, setSheba] = useState('')
  const [bankName, setBankName] = useState('')
  const [holderName, setHolderName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!sheba.trim() || !bankName.trim() || !holderName.trim()) return setError('همه فیلدها اجباری است.')
    setSubmitting(true)
    const { error: err } = await submitAccountInfo(winnerId, {
      shebaNumber: sheba.trim(),
      bankName: bankName.trim(),
      accountHolderName: holderName.trim(),
    })
    setSubmitting(false)
    if (err) return setError('خطا در ثبت.')
    onDone()
  }

  return (
    <div className="space-y-3">
      {rejectionReason && (
        <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">
          اطلاعات قبلی رد شد: {rejectionReason}
        </p>
      )}
      <div>
        <label className="mb-1 block text-sm font-semibold text-brand-purple-900">شماره شبا *</label>
        <input
          value={sheba}
          onChange={(e) => setSheba(e.target.value)}
          placeholder="IR..."
          dir="ltr"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-brand-purple-900">نام بانک *</label>
        <input
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-brand-purple-900">نام صاحب حساب *</label>
        <input
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
        />
      </div>
      {error && <p className="text-xs text-brand-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ثبت…' : 'ثبت اطلاعات'}
      </button>
    </div>
  )
}

function ReviewAccountInfoPanel({ winner, onDone }) {
  const [showReject, setShowReject] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleApprove() {
    setSubmitting(true)
    await approveAccountInfo(winner.id)
    setSubmitting(false)
    onDone()
  }

  async function handleReject() {
    setError('')
    if (!reason.trim()) return setError('علت رد را بنویسید.')
    setSubmitting(true)
    await rejectAccountInfo(winner.id, reason.trim())
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-brand-purple-100 p-3 text-sm text-brand-purple-900">
        <p>شبا: {winner.sheba_number}</p>
        <p>بانک: {winner.bank_name}</p>
        <p>صاحب حساب: {winner.account_holder_name}</p>
      </div>

      {!showReject ? (
        <div className="flex gap-2">
          <button
            onClick={() => setShowReject(true)}
            className="flex-1 rounded-xl border border-brand-red-600 py-3 text-sm font-semibold text-brand-red-600"
          >
            رد اطلاعات
          </button>
          <button
            disabled={submitting}
            onClick={handleApprove}
            className="flex-1 rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ثبت…' : 'تایید اطلاعات'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
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
              {submitting ? 'در حال ثبت…' : 'ثبت رد اطلاعات'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function UploadPayoutForm({ winnerId, winner, onDone }) {
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    const { error: err } = await uploadPayoutReceipt(winnerId, file)
    setSubmitting(false)
    if (err) return setError('خطا در ثبت.')
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-brand-purple-100 p-3 text-sm text-brand-purple-900">
        <p>شبا: {winner.sheba_number}</p>
        <p>بانک: {winner.bank_name}</p>
        <p>صاحب حساب: {winner.account_holder_name}</p>
      </div>
      <p className="text-sm font-semibold text-brand-purple-900">بعد از واریز، در صورت داشتن تصویر فیش آن را بارگذاری کنید (اختیاری).</p>
      <ImageUploadInput files={file ? [file] : []} onChange={(files) => setFile(files[0] ?? null)} multiple={false} />
      {error && <p className="text-xs text-brand-red-600">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ثبت…' : 'ثبت واریز'}
      </button>
    </div>
  )
}

function ConfirmReceiptPanel({ winner, onDone }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setSubmitting(true)
    const { error: err } = await confirmReceived(winner.id)
    setSubmitting(false)
    if (err) return setError('خطا در ثبت تایید.')
    onDone()
  }

  return (
    <div className="space-y-3">
      {winner.payout_receipt_path ? (
        <>
          <p className="text-sm font-semibold text-brand-purple-900">تصویر فیش واریزی:</p>
          <a href={getWinnerImageUrl(winner.payout_receipt_path)} target="_blank" rel="noreferrer">
            <img
              src={getWinnerImageUrl(winner.payout_receipt_path)}
              alt="فیش واریز"
              className="h-40 w-full rounded-lg object-cover ring-1 ring-brand-purple-900/10"
            />
          </a>
        </>
      ) : (
        <p className="text-sm text-brand-purple-900/70">مدیر مبلغ را واریز کرده است (بدون تصویر فیش).</p>
      )}
      {error && <p className="text-xs text-brand-red-600">{error}</p>}
      <button
        disabled={submitting}
        onClick={handleConfirm}
        className="w-full rounded-xl bg-brand-green-600 py-3 font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ثبت…' : 'تایید می‌کنم پول به حسابم رسید'}
      </button>
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
