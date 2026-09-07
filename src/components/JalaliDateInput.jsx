const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

function daysInMonth(month) {
  if (month <= 6) return 31
  if (month <= 11) return 30
  return 29
}

// value: "1404-05-12" (or "1404-05" when monthOnly). onChange receives the same shape.
export default function JalaliDateInput({ value, onChange, monthOnly = false }) {
  const [y, m, d] = (value || '').split('-')
  const year = Number(y) || 1404
  const month = Number(m) || 1
  const day = Number(d) || 1

  function emit(newYear, newMonth, newDay) {
    const yy = String(newYear)
    const mm = String(newMonth).padStart(2, '0')
    if (monthOnly) return onChange(`${yy}-${mm}`)
    const dd = String(Math.min(newDay, daysInMonth(newMonth))).padStart(2, '0')
    onChange(`${yy}-${mm}-${dd}`)
  }

  const selectClass =
    'rounded-xl border border-gray-200 px-2 py-3 text-right outline-none focus:border-brand-purple-700 bg-white'

  return (
    <div className={'grid gap-2 ' + (monthOnly ? 'grid-cols-2' : 'grid-cols-3')}>
      {!monthOnly && (
        <select value={day} onChange={(e) => emit(year, month, Number(e.target.value))} className={selectClass}>
          {Array.from({ length: daysInMonth(month) }, (_, i) => i + 1).map((dNum) => (
            <option key={dNum} value={dNum}>
              {dNum}
            </option>
          ))}
        </select>
      )}
      <select value={month} onChange={(e) => emit(year, Number(e.target.value), day)} className={selectClass}>
        {MONTH_NAMES.map((name, i) => (
          <option key={i} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select value={year} onChange={(e) => emit(Number(e.target.value), month, day)} className={selectClass}>
        {Array.from({ length: 16 }, (_, i) => 1400 + i).map((yNum) => (
          <option key={yNum} value={yNum}>
            {yNum}
          </option>
        ))}
      </select>
    </div>
  )
}
