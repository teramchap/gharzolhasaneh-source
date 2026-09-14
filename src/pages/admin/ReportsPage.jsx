import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listFunds } from '../../lib/funds'
import { getFundReport } from '../../lib/reports'
import { formatAmount, jalaliMonthLabel } from '../../lib/format'
import { downloadBackupJSON, downloadBackupExcel } from '../../lib/backup'

export default function ReportsPage() {
  const [funds, setFunds] = useState([])
  const [fundId, setFundId] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(null) // 'json' | 'excel' | null
  const [backupError, setBackupError] = useState('')

  async function handleBackup(format) {
    setBackupError('')
    setBackupLoading(format)
    try {
      if (format === 'json') await downloadBackupJSON()
      else await downloadBackupExcel()
    } catch (err) {
      setBackupError('خطا در تهیه‌ی بک‌آپ. دوباره تلاش کنید.')
    } finally {
      setBackupLoading(null)
    }
  }

  useEffect(() => {
    listFunds().then(({ data }) => {
      setFunds(data ?? [])
      setLoading(false)
    })
  }, [])

  function handleSelect(id) {
    setFundId(id)
    if (id) getFundReport(id).then(setReport)
    else setReport(null)
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">گزارشات</span>
      </header>

      <main className="space-y-4 p-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
          <p className="mb-1 text-sm font-bold text-brand-purple-900">بک‌آپ کامل سیستم</p>
          <p className="mb-3 text-xs text-brand-purple-900/60">
            خروجی کامل تمام اطلاعات صندوق‌ها، اعضا، فیش‌ها و اقساط، برای ذخیره روی سیستم یا موبایل.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleBackup('excel')}
              disabled={backupLoading !== null}
              className="flex-1 rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {backupLoading === 'excel' ? 'در حال آماده‌سازی…' : 'دانلود اکسل'}
            </button>
            <button
              type="button"
              onClick={() => handleBackup('json')}
              disabled={backupLoading !== null}
              className="flex-1 rounded-xl bg-brand-purple-100 py-3 text-sm font-bold text-brand-purple-900 disabled:opacity-60"
            >
              {backupLoading === 'json' ? 'در حال آماده‌سازی…' : 'دانلود JSON'}
            </button>
          </div>
          {backupError && <p className="mt-2 text-xs text-brand-red-600">{backupError}</p>}
        </div>

        {loading ? (
          <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>
        ) : (
          <select
            value={fundId}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-right outline-none focus:border-brand-purple-700"
          >
            <option value="">انتخاب صندوق…</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        )}

        {report && (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
              <p className="mb-2 text-sm font-bold text-brand-purple-900">وضعیت کلی صندوق</p>
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div className="rounded-xl bg-brand-purple-100 p-3">
                  <p className="tnum text-lg font-bold text-brand-purple-900">
                    {report.closedMonths} / {report.totalMonths}
                  </p>
                  <p className="text-xs text-brand-purple-900/60">ماه‌های بسته‌شده</p>
                </div>
                <div className="rounded-xl bg-brand-purple-100 p-3">
                  <p className="tnum text-lg font-bold text-brand-purple-900">
                    {formatAmount(report.totalDue - report.totalPaid)}
                  </p>
                  <p className="text-xs text-brand-purple-900/60">مبلغ باقیمانده</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-brand-purple-900/60">
                از مجموع <span className="tnum">{formatAmount(report.totalDue)}</span> تومان،{' '}
                <span className="tnum">{formatAmount(report.totalPaid)}</span> تومان دریافت شده است.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
              <p className="mb-2 text-sm font-bold text-brand-purple-900">وضعیت ماه‌ها</p>
              <div className="space-y-1.5">
                {report.months.map((m) => {
                  const paid = (m.installments ?? []).reduce((s, i) => s + Number(i.paid_amount || 0), 0)
                  const remaining = report.fundTotal - paid
                  return (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-brand-purple-900">{jalaliMonthLabel(m.jalali_month)}</span>
                      <span className={'tnum ' + (remaining > 0 ? 'text-brand-red-600' : 'text-brand-green-600')}>
                        {remaining > 0 ? `${formatAmount(remaining)} باقیمانده` : 'کامل'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
              <p className="mb-2 text-sm font-bold text-brand-purple-900">پرداخت‌های اعضا</p>
              {report.memberPayments.length === 0 && (
                <p className="text-xs text-brand-purple-900/50">هنوز قسطی برای این صندوق ثبت نشده است.</p>
              )}
              <div className="space-y-2">
                {report.memberPayments.map((mp) => (
                  <div key={mp.userId} className="rounded-xl border border-gray-100 p-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-brand-purple-900">{mp.name}</span>
                      <span className={'tnum text-xs font-bold ' + (mp.remaining > 0 ? 'text-brand-red-600' : 'text-brand-green-600')}>
                        {mp.remaining > 0 ? `${formatAmount(mp.remaining)} ناقص` : 'کامل'}
                      </span>
                    </div>
                    <p className="tnum mt-0.5 text-xs text-brand-purple-900/60">
                      پرداخت‌شده: {formatAmount(mp.paid)} از {formatAmount(mp.due)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
              <p className="mb-2 text-sm font-bold text-brand-purple-900">خوش‌حسابی (بر اساس میانگین امتیاز)</p>
              {report.goodwillList.length === 0 && (
                <p className="text-xs text-brand-purple-900/50">هنوز پرداخت تاییدشده‌ای برای محاسبه وجود ندارد.</p>
              )}
              <div className="space-y-1.5">
                {report.goodwillList.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-brand-purple-900">
                      {i + 1}. {g.name}
                    </span>
                    <span className="tnum font-semibold text-brand-purple-900/70">
                      {g.avg > 0 ? '+' : ''}
                      {g.avg.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
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
