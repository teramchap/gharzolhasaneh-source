import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listActiveFunds, getUndrawnMonths, drawWinner, listDraws, getEligibleDrawCodes } from '../../lib/draws'
import { formatAmount, todayJalali, jalaliMonthLabel } from '../../lib/format'
import JalaliDateInput from '../../components/JalaliDateInput'

export default function DrawPage() {
  const [funds, setFunds] = useState([])
  const [fundId, setFundId] = useState('')
  const [months, setMonths] = useState([])
  const [codes, setCodes] = useState([])
  const [draws, setDraws] = useState([])
  const [monthId, setMonthId] = useState('')
  const [codeId, setCodeId] = useState('')
  const [drawDate, setDrawDate] = useState(todayJalaliDash())
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingFunds, setLoadingFunds] = useState(true)

  useEffect(() => {
    listActiveFunds().then(({ data }) => {
      setFunds(data ?? [])
      setLoadingFunds(false)
    })
  }, [])

  async function loadFundData(id) {
    const [{ data: mo }, { data: co }, { data: dr }] = await Promise.all([
      getUndrawnMonths(id),
      getEligibleDrawCodes(id),
      listDraws(id),
    ])
    setMonths(mo ?? [])
    setCodes(co ?? [])
    setDraws(dr ?? [])
    setMonthId('')
    setCodeId('')
  }

  function handleFundChange(id) {
    setFundId(id)
    setError('')
    if (id) loadFundData(id)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!monthId) return setError('ماه را انتخاب کنید.')
    if (!codeId) return setError('کد برنده را انتخاب کنید.')
    if (!drawDate || drawDate.split('-').length !== 3) {
      return setError('تاریخ قرعه‌کشی را انتخاب کنید.')
    }

    setSubmitting(true)
    const { error: drawError } = await drawWinner({ monthId, codeId, drawDateJalali: drawDate })
    setSubmitting(false)

    if (drawError) {
      setError('خطا در ثبت قرعه‌کشی. دوباره تلاش کنید.')
      return
    }
    loadFundData(fundId)
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">قرعه‌کشی</span>
      </header>

      <main className="space-y-4 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
          <label className="mb-1 block text-sm font-semibold text-brand-purple-900">صندوق</label>
          <select
            value={fundId}
            onChange={(e) => handleFundChange(e.target.value)}
            disabled={loadingFunds}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
          >
            <option value="">انتخاب صندوق…</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {fundId && (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5"
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">ماه</label>
              {months.length === 0 ? (
                <p className="text-xs text-brand-purple-900/50">
                  همه‌ی ماه‌های این صندوق قرعه‌کشی شده‌اند.
                </p>
              ) : (
                <select
                  value={monthId}
                  onChange={(e) => setMonthId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
                  dir="ltr"
                >
                  <option value="">انتخاب ماه…</option>
                  {months.map((m) => (
                    <option key={m.id} value={m.id}>
                      {jalaliMonthLabel(m.jalali_month)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">کد برنده</label>
              {codes.length === 0 ? (
                <p className="text-xs text-brand-purple-900/50">
                  هیچ کد واجد شرایطی نمانده (باید عضو داشته باشد و قبلاً برنده نشده باشد).
                </p>
              ) : (
                <select
                  value={codeId}
                  onChange={(e) => setCodeId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
                >
                  <option value="">انتخاب کد…</option>
                  {codes.map((c) => (
                    <option key={c.id} value={c.id}>
                      کد {c.code_number}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
                تاریخ قرعه‌کشی
              </label>
              <JalaliDateInput value={drawDate} onChange={setDrawDate} />
            </div>

            {error && (
              <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || months.length === 0 || codes.length === 0}
              className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'در حال ثبت…' : 'ثبت قرعه‌کشی'}
            </button>
          </form>
        )}

        {fundId && draws.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-purple-900">قرعه‌کشی‌های قبلی</p>
            <div className="space-y-2">
              {draws.map((d) => (
                <div
                  key={d.id}
                  className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-purple-900">
                      {jalaliMonthLabel(d.jalali_month)}
                    </span>
                    <span className="rounded-full bg-brand-green-100 px-2.5 py-0.5 text-xs font-semibold text-brand-green-600">
                      کد {d.fund_codes?.code_number}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {(d.winners ?? []).map((w, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-brand-purple-900/80">
                          {w.payer?.full_name ?? w.shares?.users?.full_name}
                        </span>
                        <span className="tnum text-brand-purple-900/60">{formatAmount(w.payout_amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function todayJalaliDash() {
  return todayJalali().replaceAll('/', '-')
}

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
