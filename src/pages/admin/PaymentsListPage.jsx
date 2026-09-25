import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMembers } from '../../lib/members'
import { listReceiptsByUser, getReceiptImageUrl } from '../../lib/receipts'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'

const STATUS_LABELS = {
  pending_review: { text: 'در انتظار تایید فیش', color: 'bg-brand-yellow-200 text-brand-purple-900' },
  pending_transfer: { text: 'در انتظار تایید نهایی', color: 'bg-brand-yellow-200 text-brand-purple-900' },
  confirmed: { text: 'تایید نهایی شده', color: 'bg-brand-green-100 text-brand-green-600' },
  rejected: { text: 'رد شده', color: 'bg-brand-red-100 text-brand-red-600' },
}

export default function PaymentsListPage() {
  const [members, setMembers] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listMembers().then(({ data }) => setMembers(data ?? []))
  }, [])

  const suggestions =
    query.trim().length > 0 && !selected
      ? members.filter((m) => m.full_name?.includes(query.trim())).slice(0, 8)
      : []

  async function selectMember(member) {
    setSelected(member)
    setQuery(member.full_name)
    setLoading(true)
    const { data } = await listReceiptsByUser(member.id)
    setReceipts(data ?? [])
    setLoading(false)
  }

  function clearSelection() {
    setSelected(null)
    setQuery('')
    setReceipts([])
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">لیست واریزها</span>
      </header>

      <main className="space-y-3 p-4">
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (selected) setSelected(null)
            }}
            placeholder="جستجوی نام عضو…"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-right outline-none focus:border-brand-purple-700"
          />
          {selected && (
            <button
              onClick={clearSelection}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-brand-purple-900/50 hover:text-brand-purple-900"
            >
              پاک کردن ✕
            </button>
          )}

          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
              {suggestions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMember(m)}
                  className="block w-full border-b border-gray-100 px-4 py-2.5 text-right text-sm last:border-b-0 hover:bg-brand-purple-100"
                >
                  {m.full_name}
                  <span className="tnum mr-2 text-xs text-brand-purple-900/50" dir="ltr">
                    {m.mobile}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!selected && (
          <p className="pt-8 text-center text-sm text-brand-purple-900/50">
            برای دیدن لیست واریزها، نام یک عضو را جستجو کنید.
          </p>
        )}

        {selected && loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}

        {selected && !loading && receipts.length === 0 && (
          <p className="text-sm text-brand-purple-900/60">{selected.full_name} هنوز فیشی ثبت نکرده است.</p>
        )}

        {selected && !loading && receipts.length > 0 && (
          <div className="space-y-2">
            {receipts.map((r) => (
              <ReceiptRow key={r.id} receipt={r} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function ReceiptRow({ receipt }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_LABELS[receipt.status] ?? { text: receipt.status, color: 'bg-gray-100 text-gray-600' }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-right">
        <div className="space-y-1">
          <p className="tnum font-bold text-brand-purple-900">{formatAmount(receipt.total_amount)} تومان</p>
          <p className="text-xs text-brand-purple-900/50" dir="ltr">
            {receipt.deposit_date_jalali}
          </p>
        </div>
        <span className={'rounded-full px-2.5 py-1 text-[11px] font-bold ' + status.color}>{status.text}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-brand-purple-100 pt-3">
          {receipt.card_last4 && (
            <p className="text-xs text-brand-purple-900/60" dir="ltr">
              کارت: ****{receipt.card_last4}
            </p>
          )}

          {receipt.status === 'rejected' && receipt.rejection_reason && (
            <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-xs text-brand-red-600">
              دلیل رد: {receipt.rejection_reason}
            </p>
          )}

          {(receipt.receipt_images ?? []).length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {receipt.receipt_images.map((img, i) => (
                <a key={i} href={getReceiptImageUrl(img.storage_path)} target="_blank" rel="noreferrer">
                  <img
                    src={getReceiptImageUrl(img.storage_path)}
                    alt="فیش"
                    className="h-28 w-28 rounded-lg object-cover ring-1 ring-brand-purple-900/10"
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
