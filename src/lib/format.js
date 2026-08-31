// Groups a number every 3 digits: 4000000 -> "4,000,000"
export function formatAmount(value) {
  const n = Number(value ?? 0)
  return n.toLocaleString('en-US')
}

// Formats a JS Date (or ISO string) as a Jalali (Shamsi) date string, e.g. "1404/02/15"
export function toJalali(date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
    calendar: 'persian',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}
export function todayJalali() {
  return toJalali(new Date())
}

// Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to plain ASCII 0-9,
// so phone numbers etc. work the same whether typed in Persian or English.
export function toEnglishDigits(str) {
  return String(str ?? '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
}

const JALALI_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
]

// "1404-08" -> "آبان 1404". Returns an empty string for missing/invalid input
// instead of throwing, so a bad row of data never crashes a whole page.
export function jalaliMonthLabel(ym) {
  if (!ym || typeof ym !== 'string' || !ym.includes('-')) return ''
  const [y, m] = ym.split('-').map(Number)
  const name = JALALI_MONTH_NAMES[m - 1] ?? ym
  return `${name} ${y}`
}
