import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listMembers } from '../../lib/members'
import { listThreadsForAdmin, getUnreadCountsForReader } from '../../lib/messages'

export default function AdminChatListPage() {
  const { profile } = useAuth()
  const [threads, setThreads] = useState([])
  const [unreadCounts, setUnreadCounts] = useState({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    listMembers().then(async ({ data }) => {
      const [t, counts] = await Promise.all([
        listThreadsForAdmin(data ?? []),
        getUnreadCountsForReader(profile.id),
      ])
      setThreads(t)
      setUnreadCounts(counts)
      setLoading(false)
    })
  }, [profile?.id])

  const filtered = threads.filter(({ member }) => member.full_name.includes(search) || (member.mobile ?? '').includes(search))

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">گفتگوها</span>
      </header>

      <main className="p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام یا شماره موبایل…"
          className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-right outline-none focus:border-brand-purple-700"
        />

        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-brand-purple-900/60">موردی یافت نشد.</p>
        )}
        <div className="space-y-2">
          {filtered.map(({ member, lastMessage }) => {
            const unread = unreadCounts[member.id] ?? 0
            return (
              <Link
                key={member.id}
                to={`/admin/chat/${member.id}`}
                className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5 transition hover:ring-brand-purple-700"
              >
                <div className="min-w-0">
                  <p className={'font-bold ' + (unread > 0 ? 'text-brand-purple-900' : 'text-brand-purple-900')}>
                    {member.full_name}
                  </p>
                  <p className={'truncate text-xs ' + (unread > 0 ? 'font-semibold text-brand-purple-900' : 'text-brand-purple-900/50')}>
                    {lastMessage ? lastMessage.body : 'هنوز پیامی نیست'}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-yellow-300 px-2 py-0.5 text-xs font-bold text-brand-purple-900">
                    {unread}
                  </span>
                )}
              </Link>
            )
          })}
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
