import { supabase } from './supabaseClient'

// همه‌ی جدول‌های اصلی که باید تو بک‌آپ باشن
const BACKUP_TABLES = [
  'users',
  'funds',
  'fund_codes',
  'fund_months',
  'shares',
  'installments',
  'receipts',
  'receipt_images',
  'receipt_installments',
  'winners',
  'messages',
  'thread_reads',
  'dashboard_announcement',
  'notifications',
  'import_payments',
]

export async function fetchBackupData() {
  const result = {}
  for (const table of BACKUP_TABLES) {
    const { data, error } = await supabase.from(table).select('*')
    if (error) throw new Error(`خطا در خواندن جدول ${table}: ${error.message}`)
    result[table] = data ?? []
  }
  return result
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function todayStamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

export async function downloadBackupJSON() {
  const data = await fetchBackupData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `backup-gharzolhasaneh-${todayStamp()}.json`)
}

// xlsx (SheetJS) از CDN بارگذاری می‌شه تا نیازی به اضافه‌شدن به package.json نباشه
export async function downloadBackupExcel() {
  const data = await fetchBackupData()
  const XLSX = await import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm')

  const wb = XLSX.utils.book_new()
  for (const [table, rows] of Object.entries(data)) {
    const sheetRows = rows.length > 0 ? rows : [{ 'بدون داده': '' }]
    const ws = XLSX.utils.json_to_sheet(sheetRows)
    XLSX.utils.book_append_sheet(wb, ws, table.slice(0, 31))
  }

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/octet-stream' })
  triggerDownload(blob, `backup-gharzolhasaneh-${todayStamp()}.xlsx`)
}
