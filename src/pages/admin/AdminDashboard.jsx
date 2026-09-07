import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { countFunds } from '../../lib/funds'
import { countMembers } from '../../lib/members'
import { countPendingReceipts } from '../../lib/receipts'
import { getUnreadCountsForReader } from '../../lib/messages'

export default function AdminDashboard() {
  const { profile, logout } = useAuth()
  const [fundsCount, setFundsCount] = useState(null)
  const [membersCount, setMembersCount] = useState(null)
  const [receiptsCount, setReceiptsCount] = useState(null)
  const [unreadCount, setUnreadCount] = useState(null)

  useEffect(() => {
    countFunds().then(({ count }) => setFundsCount(count))
    countMembers().then(({ count }) => setMembersCount(count))
    countPendingReceipts().then(({ count }) => setReceiptsCount(count))
    if (profile?.id) {
      getUnreadCountsForReader(profile.id).then((counts) =>
        setUnreadCount(Object.values(counts).reduce((a, b) => a + b, 0))
      )
    }
  }, [profile?.id])

  const cards = [
    { title: 'صندوق‌ها', to: '/admin/funds', count: fundsCount },
    { title: 'قرعه‌کشی', to: '/admin/draw' },
    { title: 'فیش‌های پرداخت‌شده', to: '/admin/receipts', count: receiptsCount },
    { title: 'برندگان', to: '/admin/winners' },
    { title: 'کاربران', to: '/admin/users', count: membersCount },
    { title: 'گزارشات', to: '/admin/reports' },
    { title: 'گفتگوها', to: '/admin/chat', count: unreadCount },
    { title: 'اعلان صفحه اعضا', to: '/admin/announcement' },
  ]

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center justify-between bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="لوگو" className="h-9 w-9 rounded-lg" />
          <span className="font-bold">پنل مدیریت</span>
        </div>
        <button onClick={logout} className="text-sm text-white/80 hover:text-white">
          خروج
        </button>
      </header>
      <main className="p-4">
        <h1 className="text-base font-bold text-brand-purple-900">
          خوش آمدید{profile?.full_name ? `، ${profile.full_name}` : ''}
        </h1>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {cards.map((c) =>
            c.to ? (
              <Link
                key={c.title}
                to={c.to}
                className="relative flex flex-col items-center gap-1.5 rounded-xl bg-white px-2 py-3 text-center shadow-sm ring-1 ring-brand-purple-900/5 transition hover:ring-brand-purple-700"
              >
                {typeof c.count === 'number' && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-yellow-300 px-1.5 py-0.5 text-[10px] font-bold text-brand-purple-900">
                    {c.count}
                  </span>
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow-300">
                  <CardIcon title={c.title} className="h-4.5 w-4.5 text-brand-purple-900" />
                </span>
                <p className="text-xs font-bold leading-tight text-brand-purple-900">{c.title}</p>
              </Link>
            ) : (
              <div
                key={c.title}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-white px-2 py-3 text-center opacity-50 shadow-sm ring-1 ring-brand-purple-900/5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple-100">
                  <CardIcon title={c.title} className="h-4.5 w-4.5 text-brand-purple-900" />
                </span>
                <p className="text-xs font-bold leading-tight text-brand-purple-900">{c.title}</p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  )
}

function CardIcon({ title, className }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, className }
  if (title === 'صندوق‌ها')
    return (
      <svg {...common}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M3 10h18M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
      </svg>
    )
  if (title === 'قرعه‌کشی')
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    )
  if (title === 'فیش‌های پرداخت‌شده')
    return (
      <svg {...common}>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
        <path d="M9 8h6M9 12h6" />
      </svg>
    )
  if (title === 'برندگان')
    return (
      <svg {...common}>
        <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4z" />
        <path d="M5 6H3v2a4 4 0 004 4M19 6h2v2a4 4 0 01-4 4" />
      </svg>
    )
  if (title === 'گفتگوها')
    return (
      <svg {...common}>
        <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    )
  if (title === 'اعلان صفحه اعضا')
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 21h8M12 18v3" />
      </svg>
    )
  if (title === 'کاربران')
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6M16 8a3 3 0 110 6M22 20c0-2.6-2-4.7-5-5.6" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M4 20V4h12l4 4v12H4z" />
      <path d="M8 12h8M8 16h5" />
    </svg>
  )
}
