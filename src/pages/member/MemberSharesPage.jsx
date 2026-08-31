import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMySharesDetailed } from '../../lib/memberShares'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'
import { installmentStatusLabel } from '../../lib/installmentStatus'

export default function MemberSharesPage() {
  const { profile } = useAuth()
  const [shares, setShares] = useState([])
  const [loading, setLoading] = useState(true)
  const [openShareId, setOpenShareId] = useState(null)

  useEffect(() => {
    if (profile?.id) {
      getMySharesDetailed(profile.id).then((data) => {
        setShares(data)
        setLoading(false)
      })
    }
  }, [profile?.id])

  const openShare = shares.find((s) => s.shareId === openShareId)

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">سهم‌های من</span>
      </header>

      <main className="space-y-2 p-4">
        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}
        {!loading && shares.length === 0 && (
          <p className="text-sm text-brand-purple-900/60">هنوز سهمی برای شما ثبت نشده است.</p>
        )}

        {shares.map((s) => (
          <div key={s.shareId} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
            <div className="flex items-center justify-between">
              <p className="font-bold text-brand-purple-900">
                {s.fundName} — کد {s.codeNumber}
              </p>
              {s.wonMonth ? (
                <span className="rounded-full bg-brand-yellow-300 px-2.5 py-0.5 text-xs font-bold text-brand-purple-900">
                  برنده {jalaliMonthLabel(s.wonMonth)}
                </span>
              ) : (
                <span className="text-xs font-bold text-brand-red-600">هنوز برنده نشدید</span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-brand-purple-900/70">
              <p>شروع صندوق: {jalaliMonthLabel(s.startMonth)}</p>
              <p>پایان صندوق: {jalaliMonthLabel(s.endMonth)}</p>
              <p>
                مبلغ کل وام: <span className="tnum">{formatAmount(s.totalLoan)}</span>
              </p>
              <p>
                مبلغ هر قسط: <span className="tnum">{formatAmount(s.amount)}</span>
              </p>
              <p className="text-brand-green-600">اقساط پرداخت‌شده: {s.paidCount}</p>
              <p className="text-brand-red-600">اقساط باقیمانده: {s.remainingCount}</p>
            </div>

            <p className="mt-2 text-xs text-brand-purple-900/60">
              رتبه خوش‌حسابی:{' '}
              {s.rank ? (
                <span className="font-bold">
                  {s.rank} از {s.totalRanked}
                </span>
              ) : (
                'هنوز امتیازی ثبت نشده'
              )}
            </p>

            <button
              onClick={() => setOpenShareId(s.shareId)}
              className="mt-2 text-sm font-semibold text-brand-purple-700 hover:underline"
            >
              جزئیات ماه‌ها
            </button>
          </div>
        ))}
      </main>

      {openShare && <ShareDetailModal share={openShare} onClose={() => setOpenShareId(null)} />}
    </div>
  )
}

function ShareDetailModal({ share, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-purple-900">
            {share.fundName} — کد {share.codeNumber}
          </h2>
          <button onClick={onClose} className="text-brand-purple-900/50 hover:text-brand-purple-900">
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-1.5">
          {share.installments.map((inst) => {
            const status = installmentStatusLabel(inst)
            return (
              <div key={inst.id} className="flex items-center justify-between rounded-lg bg-brand-purple-100 px-3 py-2 text-sm">
                <span className="text-brand-purple-900">{jalaliMonthLabel(inst.fund_months?.jalali_month)}</span>
                <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + status.className}>
                  {status.text}
                </span>
              </div>
            )
          })}
        </div>
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
