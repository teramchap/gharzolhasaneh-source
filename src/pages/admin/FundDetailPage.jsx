import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getFund,
  getFundCodesWithShares,
  addShare,
  deleteShare,
  getFundMonthsWithPayments,
  updateFund,
  setFundStatus,
  getFundAllShares,
  setCodeCustomAmount,
} from '../../lib/funds'
import { listMembers } from '../../lib/members'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'
import AmountInput from '../../components/AmountInput'
import { installmentStatusLabel } from '../../lib/installmentStatus'
import { transferShareFull, transferShareRemaining } from '../../lib/shareTransfer'

export default function FundDetailPage() {
  const { id } = useParams()
  const [fund, setFund] = useState(null)
  const [codes, setCodes] = useState([])
  const [months, setMonths] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [openCodeId, setOpenCodeId] = useState(null)
  const [tab, setTab] = useState('codes')
  const [showEdit, setShowEdit] = useState(false)
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [transferShare, setTransferShare] = useState(null)
  const [editCapCode, setEditCapCode] = useState(null)

  async function refresh() {
    setLoading(true)
    const [{ data: f }, { data: c }, { data: mo }, { data: m }] = await Promise.all([
      getFund(id),
      getFundCodesWithShares(id),
      getFundMonthsWithPayments(id),
      listMembers(),
    ])
    setFund(f)
    setCodes(c ?? [])
    setMonths(mo ?? [])
    setMembers(m ?? [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleRemoveShare(shareId) {
    await deleteShare(shareId)
    refresh()
  }

  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)

  async function handleMarkComplete() {
    setShowCompleteConfirm(false)
    await setFundStatus(fund.id, 'completed')
    refresh()
  }

  async function handleReactivate() {
    await setFundStatus(fund.id, 'active')
    refresh()
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-purple-100 text-brand-purple-900/60">
        در حال بارگذاری…
      </div>
    )
  }

  if (!fund) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-purple-100 text-brand-purple-900/60">
        صندوق پیدا نشد.
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/admin/funds" className="text-white/80 hover:text-white">
              <BackIcon className="h-5 w-5" />
            </Link>
            <span className="font-bold">{fund.name}</span>
            <span
              className={
                'rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                (fund.status === 'active' ? 'bg-brand-yellow-300 text-brand-purple-900' : 'bg-white/30 text-white')
              }
            >
              {fund.status === 'active' ? 'فعال' : 'اتمام‌یافته'}
            </span>
          </div>
          <button onClick={() => setShowEdit(true)} className="text-white/80 hover:text-white" aria-label="ویرایش">
            <EditIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="tnum font-bold">{formatAmount(fund.total_amount)}</p>
            <p className="text-white/70">مبلغ کل</p>
          </div>
          <div>
            <p className="tnum font-bold">{fund.share_count}</p>
            <p className="text-white/70">تعداد کد</p>
          </div>
          <div>
            <p className="tnum font-bold">{formatAmount(fund.installment_amount)}</p>
            <p className="text-white/70">قسط هر کد</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setShowAllMembers(true)}
            className="flex-1 rounded-lg bg-white/15 py-1.5 text-xs font-semibold hover:bg-white/25"
          >
            نمایش تمام اعضا
          </button>
          {fund.status === 'active' ? (
            <button
              onClick={() => setShowCompleteConfirm(true)}
              className="flex-1 rounded-lg bg-white/15 py-1.5 text-xs font-semibold hover:bg-white/25"
            >
              پایان صندوق
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              className="flex-1 rounded-lg bg-white/15 py-1.5 text-xs font-semibold hover:bg-white/25"
            >
              فعال‌سازی مجدد
            </button>
          )}
        </div>
      </header>

      <main className="space-y-2 p-4">
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setTab('codes')}
            className={
              'flex-1 rounded-xl py-2 text-sm font-bold ' +
              (tab === 'codes' ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900')
            }
          >
            کدها
          </button>
          <button
            onClick={() => setTab('months')}
            className={
              'flex-1 rounded-xl py-2 text-sm font-bold ' +
              (tab === 'months' ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900')
            }
          >
            ماه‌ها
          </button>
        </div>

        {tab === 'months' && (
          <div className="space-y-2">
            {months.map((m) => (
              <MonthRow key={m.id} month={m} fundTotal={fund.total_amount} />
            ))}
          </div>
        )}

        {tab === 'codes' &&
          codes.map((code) => {
            const shares = code.shares ?? []
            const codeCap = code.custom_amount ?? fund.installment_amount
            const assignedTotal = shares.reduce((sum, s) => sum + Number(s.amount), 0)
            const remaining = Number(codeCap) - assignedTotal

            return (
              <div key={code.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-brand-purple-900">کد {code.code_number}</p>
                    <button
                      onClick={() => setEditCapCode(code)}
                      className="text-brand-purple-700/60 hover:text-brand-purple-700"
                      aria-label="ویرایش سقف این کد"
                    >
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                    {code.custom_amount != null && (
                      <span className="rounded-full bg-brand-purple-100 px-2 py-0.5 text-[10px] text-brand-purple-900">
                        سقف اختصاصی: {formatAmount(codeCap)}
                      </span>
                    )}
                  </div>
                  <span
                    className={
                      'rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
                      (remaining <= 0
                        ? 'bg-brand-green-100 text-brand-green-600'
                        : 'bg-brand-yellow-200 text-brand-purple-900')
                    }
                  >
                    {remaining <= 0 ? 'تکمیل' : `باقیمانده: ${formatAmount(remaining)}`}
                  </span>
                </div>

                {shares.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {shares.map((s) => {
                      const extraPayers = (s.payerBreakdown ?? []).filter((p) => p.userId !== s.user_id)
                      return (
                        <div key={s.id} className="rounded-lg bg-brand-purple-100 px-3 py-1.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-brand-purple-900">{s.users?.full_name}</span>
                            <div className="flex items-center gap-2">
                              <span className="tnum text-brand-purple-900/70">{formatAmount(s.amount)}</span>
                              <button
                                onClick={() => setTransferShare(s)}
                                className="text-brand-purple-700 hover:opacity-70"
                                aria-label="انتقال سهم"
                              >
                                <TransferIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRemoveShare(s.id)}
                                className="text-brand-red-600 hover:opacity-70"
                                aria-label="حذف"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {extraPayers.map((p) => (
                            <div key={p.userId} className="mt-1 flex items-center justify-between pr-3 text-xs text-brand-purple-900/70">
                              <span>↳ {p.name} (باقیمانده منتقل‌شده)</span>
                              <span>{p.monthCount} ماه</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )}

                {remaining > 0 &&
                  (openCodeId === code.id ? (
                    <AddShareForm
                      members={members}
                      maxAmount={remaining}
                      defaultAmount={remaining}
                      onCancel={() => setOpenCodeId(null)}
                      onAdd={async (userId, amount) => {
                        await addShare({ code_id: code.id, user_id: userId, amount, fund_id: fund.id })
                        setOpenCodeId(null)
                        refresh()
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => setOpenCodeId(code.id)}
                      className="mt-2 text-sm font-semibold text-brand-purple-700 hover:underline"
                    >
                      + افزودن عضو
                    </button>
                  ))}
              </div>
            )
          })}
      </main>

      {showEdit && (
        <EditFundModal fund={fund} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); refresh() }} />
      )}

      {showAllMembers && (
        <AllMembersModal fundId={fund.id} onClose={() => setShowAllMembers(false)} />
      )}

      {transferShare && (
        <TransferShareModal
          share={transferShare}
          members={members}
          months={months}
          onClose={() => setTransferShare(null)}
          onDone={() => {
            setTransferShare(null)
            refresh()
          }}
        />
      )}

      {editCapCode && (
        <EditCapModal
          code={editCapCode}
          fund={fund}
          onClose={() => setEditCapCode(null)}
          onDone={() => {
            setEditCapCode(null)
            refresh()
          }}
        />
      )}

      {showCompleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => setShowCompleteConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-6 text-center sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-brand-purple-900">پایان صندوق «{fund.name}»</h2>
            <p className="mt-2 text-sm text-brand-purple-900/70">
              این صندوق به‌عنوان «اتمام‌یافته» علامت‌گذاری می‌شود. بعداً هم می‌توانید دوباره فعالش کنید، ولی مطمئن شوید
              اشتباهی این دکمه را نزده‌اید.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowCompleteConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
              >
                انصراف
              </button>
              <button
                onClick={handleMarkComplete}
                className="flex-1 rounded-xl bg-brand-red-600 py-3 font-bold text-white"
              >
                بله، پایان صندوق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MonthRow({ month, fundTotal }) {
  const [expanded, setExpanded] = useState(false)
  const [unpaidOnly, setUnpaidOnly] = useState(false)
  const installments = month.installments ?? []
  const totalPaid = installments.reduce((sum, i) => sum + Number(i.paid_amount || 0), 0)
  const remaining = Number(fundTotal) - totalPaid

  const visibleInstallments = unpaidOnly
    ? installments.filter((i) => i.status !== 'confirmed' || i.is_partial)
    : installments

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between text-right">
        <span className="font-bold text-brand-purple-900">{jalaliMonthLabel(month.jalali_month)}</span>
        <span
          className={
            'rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
            (remaining <= 0 ? 'bg-brand-green-100 text-brand-green-600' : 'bg-brand-yellow-200 text-brand-purple-900')
          }
        >
          {remaining <= 0 ? 'کامل واریز شده' : `باقیمانده: ${formatAmount(remaining)}`}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-brand-purple-100 pt-3">
          {installments.length === 0 && (
            <p className="text-xs text-brand-purple-900/50">هنوز سهمی به این صندوق وصل نشده است.</p>
          )}
          {installments.length > 0 && (
            <label className="mb-1 flex items-center gap-2 text-xs text-brand-purple-900">
              <input type="checkbox" checked={unpaidOnly} onChange={(e) => setUnpaidOnly(e.target.checked)} />
              فقط پرداخت‌نشده‌ها و ناقص‌ها
            </label>
          )}
          {visibleInstallments.map((inst, i) => {
            const status = installmentStatusLabel(inst)
            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-brand-purple-100 px-3 py-1.5 text-sm">
                <span className="text-brand-purple-900">{inst.payer?.full_name ?? inst.shares?.users?.full_name}</span>
                <div className="flex items-center gap-2">
                  <span className="tnum text-brand-purple-900/70">{formatAmount(inst.due_amount)}</span>
                  <span className={'rounded-full px-2 py-0.5 text-[10px] font-semibold ' + status.className}>
                    {status.text}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AddShareForm({ members, maxAmount, defaultAmount, onCancel, onAdd }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState(defaultAmount)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filteredMembers = members.filter(
    (m) => m.full_name.includes(search) || (m.mobile ?? '').includes(search)
  )

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!userId) return setError('عضو را انتخاب کنید.')
    if (!amount || Number(amount) <= 0) return setError('مبلغ سهم را وارد کنید.')
    if (Number(amount) > maxAmount) {
      return setError(`مبلغ سهم نمی‌تواند بیشتر از باقیمانده این کد (${formatAmount(maxAmount)} تومان) باشد.`)
    }

    setSubmitting(true)
    await onAdd(userId, Number(amount))
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2 border-t border-brand-purple-100 pt-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="جستجوی نام یا شماره موبایل…"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1.5">
        {filteredMembers.length === 0 && (
          <p className="px-2 py-3 text-center text-xs text-brand-purple-900/40">موردی یافت نشد.</p>
        )}
        {filteredMembers.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setUserId(m.id)}
            className={
              'block w-full rounded-md px-3 py-2 text-right text-sm ' +
              (userId === m.id
                ? 'bg-brand-purple-900 text-white'
                : 'text-brand-purple-900 hover:bg-brand-purple-100')
            }
          >
            {m.full_name}
          </button>
        ))}
      </div>
      <AmountInput
        value={amount}
        onChange={setAmount}
        placeholder="مبلغ سهم (تومان)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
      />
      <p className="text-xs text-brand-purple-900/50">
        حداکثر: <span className="tnum">{formatAmount(maxAmount)}</span> تومان
      </p>
      {error && <p className="text-xs text-brand-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-brand-purple-900"
        >
          انصراف
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-brand-purple-900 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? 'در حال ثبت…' : 'ثبت'}
        </button>
      </div>
    </form>
  )
}

function EditFundModal({ fund, onClose, onSaved }) {
  const [name, setName] = useState(fund.name)
  const [totalAmount, setTotalAmount] = useState(String(fund.total_amount))
  const [shareCount, setShareCount] = useState(String(fund.share_count))
  const [durationMonths, setDurationMonths] = useState(String(fund.duration_months ?? fund.share_count))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('نام صندوق را وارد کنید.')
    if (!Number(totalAmount) || Number(totalAmount) <= 0) return setError('مبلغ کل نامعتبر است.')
    if (!Number(shareCount) || Number(shareCount) <= 0) return setError('تعداد کد نامعتبر است.')
    if (!Number(durationMonths) || Number(durationMonths) <= 0) return setError('مدت زمان نامعتبر است.')

    setSubmitting(true)
    const { error: updateError } = await updateFund(fund.id, {
      name: name.trim(),
      total_amount: Number(totalAmount),
      share_count: Number(shareCount),
      duration_months: Number(durationMonths),
    })
    setSubmitting(false)

    if (updateError) return setError(updateError.message || 'خطا در ذخیره تغییرات.')
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-brand-purple-900">ویرایش صندوق</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">نام صندوق</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">مبلغ کل صندوق (تومان)</label>
            <AmountInput
              value={totalAmount}
              onChange={setTotalAmount}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">تعداد کد</label>
              <input
                type="number"
                inputMode="numeric"
                value={shareCount}
                onChange={(e) => setShareCount(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">مدت (ماه)</label>
              <input
                type="number"
                inputMode="numeric"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
              />
            </div>
          </div>
          <p className="text-xs text-brand-purple-900/50">
            قسط هر کد به‌طور خودکار دوباره محاسبه می‌شود: {formatAmount(Number(totalAmount || 0) / Number(shareCount || 1))} تومان.
            کم‌کردن تعداد کد یا مدت زمان فقط وقتی ممکنه که کدها/ماه‌های اضافه هنوز عضو یا برنده نداشته باشن.
          </p>
          {error && <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'در حال ذخیره…' : 'ذخیره'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AllMembersModal({ fundId, onClose }) {
  const [rows, setRows] = useState(null)

  useEffect(() => {
    getFundAllShares(fundId).then(({ data }) => {
      const flat = (data ?? []).flatMap((code) =>
        (code.shares ?? []).flatMap((s) =>
          (s.payerBreakdown ?? []).map((p) => ({
            code_number: code.code_number,
            full_name: p.name,
            mobile: p.mobile,
            amount: s.amount,
            monthCount: p.monthCount,
          }))
        )
      )
      setRows(flat)
    })
  }, [fundId])

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
          <h2 className="text-lg font-bold text-brand-purple-900">تمام اعضای صندوق</h2>
          <button onClick={onClose} className="text-brand-purple-900/50 hover:text-brand-purple-900">
            ✕
          </button>
        </div>

        {rows === null && <p className="mt-4 text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}
        {rows?.length === 0 && <p className="mt-4 text-sm text-brand-purple-900/60">هنوز عضوی ثبت نشده است.</p>}

        <div className="mt-4 space-y-2">
          {rows?.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-brand-purple-100 px-3 py-2 text-sm">
              <div>
                <p className="font-semibold text-brand-purple-900">{r.full_name}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-brand-purple-900/60">کد {r.code_number}</p>
                <p className="tnum font-bold text-brand-purple-900">{formatAmount(r.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TransferShareModal({ share, members, months, onClose, onDone }) {
  const [mode, setMode] = useState('full') // 'full' | 'remaining'
  const [newUserId, setNewUserId] = useState('')
  const [search, setSearch] = useState('')
  const [fromSequence, setFromSequence] = useState(months[0]?.sequence ?? 1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filteredMembers = members.filter(
    (m) => m.id !== share.user_id && (m.full_name.includes(search) || (m.mobile ?? '').includes(search))
  )

  async function handleSubmit() {
    setError('')
    if (!newUserId) return setError('عضو جدید را انتخاب کنید.')

    setSubmitting(true)
    const { error: err } =
      mode === 'full'
        ? await transferShareFull(share.id, newUserId)
        : await transferShareRemaining(share.id, newUserId, Number(fromSequence))
    setSubmitting(false)

    if (err) return setError(err.message || 'خطا در ثبت انتقال.')
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-brand-purple-900">انتقال سهم {share.users?.full_name}</h2>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setMode('full')}
            className={
              'flex-1 rounded-xl py-2 text-sm font-bold ' +
              (mode === 'full' ? 'bg-brand-purple-900 text-white' : 'bg-brand-purple-100 text-brand-purple-900')
            }
          >
            انتقال کامل (از ابتدا)
          </button>
          <button
            onClick={() => setMode('remaining')}
            className={
              'flex-1 rounded-xl py-2 text-sm font-bold ' +
              (mode === 'remaining' ? 'bg-brand-purple-900 text-white' : 'bg-brand-purple-100 text-brand-purple-900')
            }
          >
            انتقال باقیمانده
          </button>
        </div>

        <p className="mt-3 text-xs text-brand-purple-900/50">
          {mode === 'full'
            ? 'کل سهم (تاریخچه پرداخت‌ها هم شامل می‌شود) از این پس به‌نام عضو جدید خواهد بود.'
            : 'ماه‌های قبل از نقطه‌ی انتخاب‌شده همچنان مال همین عضو می‌ماند؛ از آن ماه به بعد مسئولیت با عضو جدید است. موقع قرعه‌کشی، مبلغ برنده‌شدن بین این دو نفر متناسب با تعداد ماه‌هایشان تقسیم می‌شود.'}
        </p>

        {mode === 'remaining' && (
          <div className="mt-3">
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">از کدام ماه به بعد؟</label>
            <select
              value={fromSequence}
              onChange={(e) => setFromSequence(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            >
              {months.map((m) => (
                <option key={m.id} value={m.sequence}>
                  {jalaliMonthLabel(m.jalali_month)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3">
          <label className="mb-1 block text-sm font-semibold text-brand-purple-900">عضو جدید</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجوی نام یا شماره موبایل…"
            className="mb-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-purple-700"
          />
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-1.5">
            {filteredMembers.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-brand-purple-900/40">موردی یافت نشد.</p>
            )}
            {filteredMembers.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setNewUserId(m.id)}
                className={
                  'block w-full rounded-md px-3 py-2 text-right text-sm ' +
                  (newUserId === m.id
                    ? 'bg-brand-purple-900 text-white'
                    : 'text-brand-purple-900 hover:bg-brand-purple-100')
                }
              >
                {m.full_name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
          >
            انصراف
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ثبت…' : 'ثبت انتقال'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditCapModal({ code, fund, onClose, onDone }) {
  const assignedTotal = (code.shares ?? []).reduce((sum, s) => sum + Number(s.amount), 0)
  const [amount, setAmount] = useState(String(code.custom_amount ?? fund.installment_amount))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setError('')
    if (!Number(amount) || Number(amount) <= 0) return setError('سقف نامعتبر است.')
    if (Number(amount) < assignedTotal) {
      return setError(`سقف نمی‌تواند از مجموع سهم‌های فعلی این کد (${formatAmount(assignedTotal)}) کمتر باشد.`)
    }
    setSubmitting(true)
    const { error: err } = await setCodeCustomAmount(code.id, Number(amount))
    setSubmitting(false)
    if (err) return setError('خطا در ذخیره.')
    onDone()
  }

  async function handleReset() {
    setSubmitting(true)
    await setCodeCustomAmount(code.id, null)
    setSubmitting(false)
    onDone()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-brand-purple-900">سقف کد {code.code_number}</h2>
        <p className="mt-1 text-xs text-brand-purple-900/50">
          سقف پیش‌فرض این صندوق {formatAmount(fund.installment_amount)} تومان است. اگر لازم بود این کد به‌طور جداگانه
          مبلغی متفاوت داشته باشد (مثلاً بعد از جابه‌جایی سهم بین دو کد)، اینجا تنظیم کنید.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-semibold text-brand-purple-900">سقف این کد (تومان)</label>
          <AmountInput
            value={amount}
            onChange={setAmount}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
          >
            انصراف
          </button>
          {code.custom_amount != null && (
            <button
              onClick={handleReset}
              disabled={submitting}
              className="flex-1 rounded-xl border border-brand-purple-700 py-3 font-semibold text-brand-purple-700 disabled:opacity-60"
            >
              بازگشت به پیش‌فرض
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
          >
            {submitting ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
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
function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6" />
    </svg>
  )
}
function TransferIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  )
}
function EditIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
