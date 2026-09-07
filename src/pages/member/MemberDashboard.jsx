import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyActiveWinners } from '../../lib/winners'
import { getAnnouncement, getAnnouncementImageUrl } from '../../lib/announcement'
import { jalaliMonthLabel } from '../../lib/format'

const MEMBER_STAGE_MESSAGE = {
  awaiting_guarantee_type: 'در انتظار بررسی توسط مدیر',
  awaiting_documents: 'مدارک ضمانت خود را بارگذاری کنید',
  awaiting_document_approval: 'مدارک شما در حال بررسی است',
  awaiting_account_info: 'اطلاعات حساب خود را وارد کنید',
  awaiting_account_info_approval: 'اطلاعات حساب شما در حال بررسی است',
  awaiting_deposit: 'در انتظار واریز مبلغ توسط مدیر',
  awaiting_deposit_confirmation: 'دریافت وجه را تایید کنید',
}

const cards = [
  { title: 'سهم‌های من', to: '/member/shares' },
  { title: 'پرداخت قسط', to: '/member/receipts' },
  { title: 'سوابق پرداخت', to: '/member/payment-history' },
  { title: 'گفتگو با مدیر', to: '/member/chat' },
  { title: 'تغییر رمز عبور', to: '/member/change-password' },
]

export default function MemberDashboard() {
  const { profile, logout } = useAuth()
  const [activeWinners, setActiveWinners] = useState([])
  const [announcement, setAnnouncement] = useState(null)

  useEffect(() => {
    if (profile?.id) {
      getMyActiveWinners(profile.id).then(({ data }) => setActiveWinners(data ?? []))
    }
    getAnnouncement().then(({ data }) => setAnnouncement(data))
  }, [profile?.id])

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center justify-between bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="لوگو" className="h-9 w-9 rounded-lg" />
          <span className="font-bold">صندوق قرض‌الحسنه</span>
        </div>
        <button onClick={logout} className="text-sm text-white/80 hover:text-white">
          خروج
        </button>
      </header>
      <main className="p-4">
        <h1 className="text-base font-bold text-brand-purple-900">
          خوش آمدید{profile?.full_name ? `، ${profile.full_name}` : ''}
        </h1>

        {activeWinners.map((w) => (
          <Link
            key={w.id}
            to={`/member/winner/${w.id}`}
            className="mt-3 flex items-center justify-between rounded-xl bg-brand-yellow-300 px-4 py-3 shadow-sm"
          >
            <div>
              <p className="text-sm font-bold text-brand-purple-900">🎉 برنده شدید!</p>
              <p className="text-xs text-brand-purple-900/70">
                {w.fund_months?.funds?.name} — {jalaliMonthLabel(w.fund_months?.jalali_month)}
              </p>
              <p className="text-xs font-semibold text-brand-purple-900/90">{MEMBER_STAGE_MESSAGE[w.status]}</p>
            </div>
          </Link>
        ))}

        <div className="mt-3 grid grid-cols-3 gap-2">
          {cards.map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white px-2 py-3 text-center shadow-sm ring-1 ring-brand-purple-900/5 transition hover:ring-brand-purple-700"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow-300">
                <CardIcon title={c.title} className="h-4.5 w-4.5 text-brand-purple-900" />
              </span>
              <p className="text-xs font-bold leading-tight text-brand-purple-900">{c.title}</p>
            </Link>
          ))}
        </div>

        {(announcement?.image_path || announcement?.message) && (
          <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-purple-900/5">
            {announcement.image_path && (
              <img src={getAnnouncementImageUrl(announcement.image_path)} alt="اعلان" className="w-full object-cover" />
            )}
            {announcement.message && <p className="p-4 text-sm text-brand-purple-900">{announcement.message}</p>}
          </div>
        )}
      </main>
    </div>
  )
}

function CardIcon({ title, className }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className }
  if (title === 'سهم‌های من')
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    )
  if (title === 'پرداخت قسط')
    return (
      <svg {...common}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6" />
      </svg>
    )
  if (title === 'سوابق پرداخت')
    return (
      <svg {...common}>
        <path d="M3 3v18h18" />
        <path d="M7 15l4-4 3 3 5-6" />
      </svg>
    )
  if (title === 'گفتگو با مدیر')
    return (
      <svg {...common}>
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    )
  return (
    <svg {...common}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  )
}
