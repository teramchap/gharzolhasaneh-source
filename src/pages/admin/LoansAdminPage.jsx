import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMembers } from '../../lib/members'
import { jalaliMonthLabel } from '../../lib/format'
import {
  listPendingLoanRequests,
  listActiveLoanRequests,
  getLoanHistory,
  getGoodwillRankMap,
  completeLoanMonth,
  attachLoanLetter,
  completeLoanRequest,
  listLoanBlacklist,
  addToLoanBlacklist,
  removeFromLoanBlacklist,
  getLoanLetterUrl,
  LOAN_LETTER_NOTE,
  LOAN_STATUS_LABELS,
} from '../../lib/loans'

export default function LoansAdminPage() {
  const [tab, setTab] = useState('requests')
  const [pending, setPending] = useState([])
  const [active, setActive] = useState([])
  const [blacklist, setBlacklist] = useState([])
  const [rankMap, setRankMap] = useState({})
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    const [{ data: p }, { data: a }, { data: b }, ranks] = await Promise.all([
      listPendingLoanRequests(),
      listActiveLoanRequests(),
      listLoanBlacklist(),
      getGoodwillRankMap(),
    ])
    setPending(p ?? [])
    setActive(a ?? [])
    setBlacklist(b ?? [])
    setRankMap(ranks)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const tabs = [
    { key: 'requests', label: `درخواست‌ها (${pending.length})` },
    { key: 'active', label: `در حال پیگیری (${active.length})` },
    { key: 'blacklist', label: 'لیست سیاه' },
  ]

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">درخواست‌های وام ۴ درصدی</span>
      </header>

      <main className="p-4">
        <div className="mb-3 flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                'flex-1 rounded-xl py-2 text-xs font-bold ' +
                (tab === t.key ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900')
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}

        {!loading && tab === 'requests' && <RequestsTab pending={pending} rankMap={rankMap} onDone={refresh} />}
        {!loading && tab === 'active' && (
          <div className="space-y-3">
            {active.length === 0 && <p className="text-sm text-brand-purple-900/60">مورد در حال پیگیری وجود ندارد.</p>}
            {active.map((r) => (
              <ActiveCard key={r.id} request={r} onDone={refresh} />
            ))}
          </div>
        )}
        {!loading && tab === 'blacklist' && <BlacklistTab list={blacklist} onDone={refresh} />}
      </main>
    </div>
  )
}

function rankLabel(info) {
  if (!info) return 'بدون امتیاز'
  return `رتبه ${info.rank} از ${info.total}`
}

function RequestsTab({ pending, rankMap, onDone }) {
  const months = Array.from(new Set(pending.map((r) => r.month))).sort().reverse()
  const [month, setMonth] = useState(months[0] ?? '')
  const [selected, setSelected] = useState({})
  const [historyOpen, setHistoryOpen] = useState(null)
  const [history, setHistory] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const activeMonth = months.includes(month) ? month : months[0] ?? ''
  const list = pending
    .filter((r) => r.month === activeMonth)
    .sort((a, b) => (rankMap[a.user_id]?.rank ?? 1e9) - (rankMap[b.user_id]?.rank ?? 1e9))
  const selectedIds = list.filter((r) => selected[r.id]).map((r) => r.id)

  async function toggleHistory(userId) {
    if (historyOpen === userId) return setHistoryOpen(null)
    setHistoryOpen(userId)
    setHistory([])
    const { data } = await getLoanHistory(userId)
    setHistory(data ?? [])
  }

  async function handleComplete() {
    setError('')
    if (selectedIds.length === 0) return setError('حداقل یک درخواست را انتخاب کنید.')
    if (
      !confirm(
        `${selectedIds.length} نفر انتخاب شده‌اند. با تکمیل، درخواست‌های این ماه بسته می‌شود و برای بقیه نتیجه‌ی «پذیرفته نشد» ثبت می‌شود. ادامه می‌دهید؟`
      )
    )
      return
    setSubmitting(true)
    const { error: err } = await completeLoanMonth(activeMonth, selectedIds)
    setSubmitting(false)
    if (err) return setError('خطا در تکمیل. دوباره تلاش کنید.')
    setSelected({})
    onDone()
  }

  if (pending.length === 0) {
    return <p className="text-sm text-brand-purple-900/60">درخواستی در انتظار بررسی نیست.</p>
  }

  return (
    <div className="space-y-3">
      {months.length > 1 && (
        <select
          value={activeMonth}
          onChange={(e) => {
            setMonth(e.target.value)
            setSelected({})
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {jalaliMonthLabel(m)}
            </option>
          ))}
        </select>
      )}

      {list.map((r) => (
        <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex flex-1 items-center gap-2">
              <input type="checkbox" checked={!!selected[r.id]} onChange={() => setSelected((p) => ({ ...p, [r.id]: !p[r.id] }))} />
              <span className="font-bold text-brand-purple-900">{r.users?.full_name}</span>
            </label>
            <span className="tnum rounded-full bg-brand-yellow-200 px-2.5 py-1 text-[11px] font-bold text-brand-purple-900">
              {rankLabel(rankMap[r.user_id])}
            </span>
          </div>

          <button
            onClick={() => toggleHistory(r.user_id)}
            className="mt-2 w-full rounded-lg border border-brand-purple-900/20 py-1.5 text-xs font-semibold text-brand-purple-900"
          >
            سوابق دریافت
          </button>

          {historyOpen === r.user_id && (
            <div className="mt-2 space-y-1">
              {history.length === 0 ? (
                <p className="text-xs text-brand-purple-900/60">سابقه‌ی دریافت وام ۴ درصدی ندارد.</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg bg-brand-purple-100 px-3 py-1.5 text-xs">
                    <span className="text-brand-purple-900">
                      {jalaliMonthLabel(h.month)}
                      {h.recipient_full_name ? ` — ${h.recipient_full_name}` : ''}
                    </span>
                    <span className="text-brand-purple-900/70">{LOAN_STATUS_LABELS[h.status]}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ))}

      {error && <p className="text-xs text-brand-red-600">{error}</p>}
      <button
        onClick={handleComplete}
        disabled={submitting}
        className="w-full rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {submitting ? 'در حال ثبت…' : `تکمیل (${selectedIds.length} انتخاب‌شده)`}
      </button>
    </div>
  )
}

function ActiveCard({ request, onDone }) {
  const [file, setFile] = useState(null)
  const [note, setNote] = useState(LOAN_LETTER_NOTE)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const s = request.status

  async function handleAttach() {
    setError('')
    if (!file) return setError('فایل نامه را انتخاب کنید.')
    setSubmitting(true)
    const { error: err } = await attachLoanLetter(request, file, note.trim())
    setSubmitting(false)
    if (err) return setError('ارسال نامه انجام نشد. دوباره تلاش کنید.')
    onDone()
  }

  async function handleComplete() {
    if (!confirm('نامه‌ی امضاشده دریافت شده و این درخواست تکمیل شود؟')) return
    setSubmitting(true)
    await completeLoanRequest(request.id)
    setSubmitting(false)
    onDone()
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <div className="flex items-center justify-between">
        <p className="font-bold text-brand-purple-900">{request.users?.full_name}</p>
        <span className="text-xs text-brand-purple-900/60">{jalaliMonthLabel(request.month)}</span>
      </div>
      <p className="mt-1 text-xs font-semibold text-brand-purple-900/70">{LOAN_STATUS_LABELS[s]}</p>

      {s !== 'awaiting_info' && (
        <div className="mt-2 space-y-0.5 rounded-lg bg-brand-purple-100 px-3 py-2 text-sm text-brand-purple-900">
          <p>دریافت‌کننده: {request.recipient_full_name}</p>
          <p>
            کد ملی: <span className="tnum">{request.recipient_national_id}</span>
          </p>
        </div>
      )}

      {s === 'awaiting_letter' && (
        <div className="mt-3 space-y-2">
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
          />
          {error && <p className="text-xs text-brand-red-600">{error}</p>}
          <button
            onClick={handleAttach}
            disabled={submitting}
            className="w-full rounded-lg bg-brand-purple-900 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ارسال…' : 'ارسال نامه برای متقاضی'}
          </button>
        </div>
      )}

      {s === 'awaiting_signature' && (
        <div className="mt-3 space-y-2">
          {request.letter_path && (
            <a
              href={getLoanLetterUrl(request.letter_path)}
              target="_blank"
              rel="noreferrer"
              className="block text-xs font-semibold text-brand-purple-700 underline"
            >
              مشاهده‌ی نامه‌ی ارسال‌شده
            </a>
          )}
          <button
            onClick={handleComplete}
            disabled={submitting}
            className="w-full rounded-lg bg-brand-green-600 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? '…' : 'تکمیل (نامه‌ی امضاشده دریافت شد)'}
          </button>
        </div>
      )}
    </div>
  )
}

function BlacklistTab({ list, onDone }) {
  const [members, setMembers] = useState([])
  const [query, setQuery] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listMembers().then(({ data }) => setMembers(data ?? []))
  }, [])

  const blockedIds = new Set(list.map((b) => b.user_id))
  const suggestions =
    query.trim().length > 0
      ? members.filter((m) => m.full_name?.includes(query.trim()) && !blockedIds.has(m.id)).slice(0, 6)
      : []

  async function add(member) {
    setBusy(true)
    await addToLoanBlacklist(member.id, reason.trim())
    setBusy(false)
    setQuery('')
    setReason('')
    onDone()
  }

  async function remove(userId) {
    if (!confirm('این عضو از لیست سیاه خارج شود؟')) return
    await removeFromLoanBlacklist(userId)
    onDone()
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
        <p className="text-sm font-bold text-brand-purple-900">افزودن به لیست سیاه</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام عضو…"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-right text-sm outline-none focus:border-brand-purple-700"
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="دلیل (اختیاری)"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-right text-sm outline-none focus:border-brand-purple-700"
        />
        {suggestions.map((m) => (
          <button
            key={m.id}
            disabled={busy}
            onClick={() => add(m)}
            className="block w-full rounded-lg bg-brand-purple-100 px-3 py-2 text-right text-sm text-brand-purple-900 disabled:opacity-60"
          >
            افزودن «{m.full_name}»
          </button>
        ))}
      </div>

      {list.length === 0 && <p className="text-sm text-brand-purple-900/60">لیست سیاه خالی است.</p>}
      {list.map((b) => (
        <div key={b.user_id} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
          <div>
            <p className="font-bold text-brand-purple-900">{b.users?.full_name}</p>
            {b.reason && <p className="text-xs text-brand-purple-900/60">{b.reason}</p>}
          </div>
          <button onClick={() => remove(b.user_id)} className="text-xs font-semibold text-brand-red-600">
            خروج از لیست
          </button>
        </div>
      ))}
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
