import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  currentLoanMonth,
  isLoanBlacklisted,
  getMyLoanRequests,
  submitLoanRequest,
  submitLoanRecipientInfo,
  getLoanLetterUrl,
  digitsToEnglish,
  LOAN_REJECT_MESSAGE,
  LOAN_STATUS_LABELS,
} from '../../lib/loans'
import { jalaliMonthLabel } from '../../lib/format'

export default function LoanRequestPage() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [blacklisted, setBlacklisted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function refresh() {
    if (!profile?.id) return
    const [{ data }, bl] = await Promise.all([getMyLoanRequests(profile.id), isLoanBlacklisted(profile.id)])
    setRequests(data ?? [])
    setBlacklisted(bl)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  const thisMonth = currentLoanMonth()
  const hasThisMonth = requests.some((r) => r.month === thisMonth)

  async function handleSubmit() {
    setError('')
    setSubmitting(true)
    const { error: err } = await submitLoanRequest(profile.id)
    setSubmitting(false)
    if (err) return setError('ثبت درخواست انجام نشد. ممکن است قبلاً در این ماه درخواست داده باشید.')
    refresh()
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">درخواست وام ۴ درصدی</span>
      </header>

      <main className="space-y-3 p-4">
        {loading ? (
          <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>
        ) : (
          <>
            {!hasThisMonth && (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
                {blacklisted ? (
                  <p className="text-sm text-brand-purple-900/70">
                    در حال حاضر امکان ثبت درخواست وام ۴ درصدی برای شما فعال نیست.
                  </p>
                ) : (
                  <>
                    <p className="mb-3 text-sm text-brand-purple-900/70">
                      هر عضو در هر ماه فقط یک بار می‌تواند درخواست وام ۴ درصدی ثبت کند.
                    </p>
                    {error && <p className="mb-2 text-xs text-brand-red-600">{error}</p>}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {submitting ? 'در حال ثبت…' : `ثبت درخواست برای ${jalaliMonthLabel(thisMonth)}`}
                    </button>
                  </>
                )}
              </div>
            )}

            {requests.map((r) => (
              <RequestCard key={r.id} request={r} onDone={refresh} />
            ))}
          </>
        )}
      </main>
    </div>
  )
}

function RequestCard({ request, onDone }) {
  const [fullName, setFullName] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleInfo(e) {
    e.preventDefault()
    setError('')
    const nid = digitsToEnglish(nationalId).trim()
    if (!fullName.trim()) return setError('نام و نام خانوادگی را وارد کنید.')
    if (!/^\d{10}$/.test(nid)) return setError('کد ملی باید ۱۰ رقم باشد.')
    setSubmitting(true)
    const { error: err } = await submitLoanRecipientInfo(request.id, fullName.trim(), nid)
    setSubmitting(false)
    if (err) return setError('ثبت اطلاعات انجام نشد. دوباره تلاش کنید.')
    onDone()
  }

  const s = request.status

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-brand-purple-900">{jalaliMonthLabel(request.month)}</p>
        <span className="rounded-full bg-brand-purple-100 px-2.5 py-1 text-[11px] font-bold text-brand-purple-900">
          {LOAN_STATUS_LABELS[s]}
        </span>
      </div>

      {s === 'pending' && (
        <p className="text-sm text-brand-purple-900/70">درخواست شما ثبت شد و در انتظار بررسی مدیر است.</p>
      )}

      {s === 'rejected' && <p className="text-sm text-brand-red-600">{LOAN_REJECT_MESSAGE}</p>}

      {s === 'awaiting_info' && (
        <form onSubmit={handleInfo} className="space-y-3">
          <p className="text-sm font-semibold text-brand-purple-900">
            🎉 درخواست شما پذیرفته شد. نام و کد ملی دریافت‌کننده‌ی وام را وارد کنید.
          </p>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="نام و نام خانوادگی"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-right outline-none focus:border-brand-purple-700"
          />
          <input
            value={nationalId}
            onChange={(e) => setNationalId(digitsToEnglish(e.target.value).replace(/\D/g, '').slice(0, 10))}
            placeholder="کد ملی"
            inputMode="numeric"
            dir="ltr"
            className="w-full rounded-xl border border-gray-200 px-3 py-3 text-right outline-none focus:border-brand-purple-700"
          />
          {error && <p className="text-xs text-brand-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ثبت…' : 'ثبت اطلاعات'}
          </button>
        </form>
      )}

      {(s === 'awaiting_letter' || s === 'awaiting_signature' || s === 'completed') && (
        <div className="space-y-2 text-sm text-brand-purple-900">
          <p>
            دریافت‌کننده: <span className="font-semibold">{request.recipient_full_name}</span>
          </p>
          <p dir="rtl">
            کد ملی: <span className="tnum font-semibold">{request.recipient_national_id}</span>
          </p>

          {s === 'awaiting_letter' && (
            <p className="text-brand-purple-900/70">اطلاعات شما ثبت شد. در انتظار ارسال نامه توسط مدیر هستید.</p>
          )}

          {s === 'awaiting_signature' && (
            <>
              {request.letter_note && (
                <p className="rounded-lg bg-brand-yellow-200 px-3 py-2 font-semibold">{request.letter_note}</p>
              )}
              {request.letter_path && (
                <a
                  href={getLoanLetterUrl(request.letter_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl bg-brand-purple-900 py-3 text-center text-sm font-bold text-white"
                >
                  مشاهده و دریافت نامه
                </a>
              )}
            </>
          )}

          {s === 'completed' && <p className="text-brand-green-600">این درخواست تکمیل شده است. ✓</p>}
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
