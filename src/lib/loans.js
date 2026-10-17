import { supabase } from './supabaseClient'
import { todayJalali, formatAmount } from './format'
import { createNotification } from './notifications'

export const LOAN_LETTER_NOTE = 'لطفا نسخه چاپ شده نامه پیوستی را جهت امضا تحویل دهید'
export const LOAN_REJECT_MESSAGE =
  'متاسفانه شما در اولویت دریافت وام ۴ درصدی این ماه قرار نگرفتید. لطفا ماه‌های آینده مجددا درخواست خود را ثبت کنید.'

export const LOAN_STATUS_LABELS = {
  pending: 'در انتظار بررسی',
  rejected: 'پذیرفته نشد',
  awaiting_info: 'در انتظار اطلاعات متقاضی',
  awaiting_letter: 'در انتظار ارسال نامه',
  awaiting_signature: 'در انتظار تحویل نامه امضاشده',
  completed: 'تکمیل شد',
}

const ACTIVE_STATUSES = ['awaiting_info', 'awaiting_letter', 'awaiting_signature']
const RECEIVED_STATUSES = [...ACTIVE_STATUSES, 'completed']

// ماه درخواست: از ۱۶ هر ماه تا ۱۵ ماه بعد، «درخواست ماه بعد» حساب می‌شود. (مثلاً ۱۶ مهر تا ۱۵ آبان = آبان) خروجی مثل 1405-08
export function currentLoanMonth() {
  const [y, m, d] = digitsToEnglish(todayJalali()).split(/[/-]/).map(Number)
  if (d >= 16) {
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  }
  return `${y}-${String(m).padStart(2, '0')}`
}

export function digitsToEnglish(str) {
  return String(str ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

function safeExtension(filename) {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename || '')
  return match ? match[1].toLowerCase() : 'pdf'
}

export function getLoanLetterUrl(path) {
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

// ---------- Member side ----------

// اگر عضو در لیست سیاه باشد ردیفش (شامل دلیل) برمی‌گردد، وگرنه null
export async function getMyLoanBlacklistEntry(userId) {
  const { data } = await supabase
    .from('loan_blacklist')
    .select('user_id, reason')
    .eq('user_id', userId)
    .maybeSingle()
  return data
}

export async function getMyLoanRequests(userId) {
  return supabase.from('loan_requests').select('*').eq('user_id', userId).order('created_at', { ascending: false })
}

export async function getMyActiveLoanRequests(userId) {
  return supabase
    .from('loan_requests')
    .select('id, month, status')
    .eq('user_id', userId)
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: false })
}

export async function submitLoanRequest(userId) {
  return supabase.from('loan_requests').insert({ user_id: userId, month: currentLoanMonth() })
}

export async function submitLoanRecipientInfo(requestId, fullName, nationalId) {
  return supabase
    .from('loan_requests')
    .update({ recipient_full_name: fullName, recipient_national_id: nationalId, status: 'awaiting_letter' })
    .eq('id', requestId)
}

// ---------- Admin side ----------

export async function countPendingLoanRequests() {
  const { count } = await supabase
    .from('loan_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'awaiting_letter'])
  return count ?? 0
}

export async function listPendingLoanRequests() {
  return supabase
    .from('loan_requests')
    .select('*, users(full_name, mobile)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
}

export async function listActiveLoanRequests() {
  return supabase
    .from('loan_requests')
    .select('*, users(full_name, mobile)')
    .in('status', ACTIVE_STATUSES)
    .order('created_at', { ascending: true })
}

export async function getLoanHistory(userId) {
  return supabase
    .from('loan_requests')
    .select('id, month, status, recipient_full_name, created_at')
    .eq('user_id', userId)
    .in('status', RECEIVED_STATUSES)
    .order('created_at', { ascending: false })
}

// رتبه‌ی خوش‌حسابی همه‌ی اعضا: { [userId]: { rank, total, avg } }
export async function getGoodwillRankMap() {
  const { data } = await supabase.rpc('goodwill_ranking')
  const map = {}
  for (const r of data ?? []) {
    map[r.user_id] = { rank: Number(r.rank), total: Number(r.total), avg: Number(r.avg_score) }
  }
  return map
}

// بستن درخواست‌های یک ماه: انتخاب‌شده‌ها (با مبلغ وام و تعداد قسط مخصوص هرکدام) به مرحله‌ی تکمیل اطلاعات می‌روند، بقیه رد می‌شوند.
// selections: [{ id, amount, installments }]
export async function completeLoanMonth(month, selections) {
  const { data: pending, error } = await supabase
    .from('loan_requests')
    .select('id, user_id')
    .eq('month', month)
    .eq('status', 'pending')
  if (error) return { error }

  const byId = new Map(selections.map((s) => [s.id, s]))
  const selected = (pending ?? []).filter((r) => byId.has(r.id))
  const others = (pending ?? []).filter((r) => !byId.has(r.id))

  for (const r of selected) {
    const sel = byId.get(r.id)
    const { error: e1 } = await supabase
      .from('loan_requests')
      .update({ status: 'awaiting_info', loan_amount: sel.amount, loan_installments: sel.installments })
      .eq('id', r.id)
    if (e1) return { error: e1 }
  }
  if (others.length) {
    const { error: e2 } = await supabase
      .from('loan_requests')
      .update({ status: 'rejected' })
      .in('id', others.map((r) => r.id))
    if (e2) return { error: e2 }
  }

  for (const r of selected) {
    const sel = byId.get(r.id)
    await createNotification(
      r.user_id,
      `🎉 درخواست وام ۴ درصدی شما به مبلغ ${formatAmount(sel.amount)} تومان در ${sel.installments} قسط پذیرفته شد. لطفا اطلاعات دریافت‌کننده را تکمیل کنید.`,
      '/member/loans'
    )
  }
  for (const r of others) {
    await createNotification(r.user_id, 'نتیجه‌ی درخواست وام ۴ درصدی شما مشخص شد.', '/member/loans')
  }
  return { error: null }
}

export async function attachLoanLetter(request, file, note) {
  const path = `loans/${request.id}/${crypto.randomUUID()}.${safeExtension(file.name)}`
  const { error: upErr } = await supabase.storage.from('receipts').upload(path, file)
  if (upErr) return { error: upErr }

  const { error } = await supabase
    .from('loan_requests')
    .update({ letter_path: path, letter_note: note, status: 'awaiting_signature' })
    .eq('id', request.id)
  if (error) return { error }

  await createNotification(
    request.user_id,
    'نامه‌ی وام ۴ درصدی شما آماده است. لطفا وارد شوید و دستور را مشاهده کنید.',
    '/member/loans'
  )
  return { error: null }
}

export async function completeLoanRequest(requestId) {
  return supabase.from('loan_requests').update({ status: 'completed' }).eq('id', requestId)
}

export async function listLoanBlacklist() {
  return supabase
    .from('loan_blacklist')
    .select('user_id, reason, created_at, users(full_name, mobile)')
    .order('created_at', { ascending: false })
}

export async function addToLoanBlacklist(userId, reason) {
  return supabase.from('loan_blacklist').upsert({ user_id: userId, reason: reason || null })
}

export async function removeFromLoanBlacklist(userId) {
  return supabase.from('loan_blacklist').delete().eq('user_id', userId)
}

// ثبت سابقه‌ی دریافت وام برای کسانی که قبل از راه‌اندازی این بخش وام گرفته‌اند
export async function addPastLoan(userId, month, recipientName) {
  return supabase.from('loan_requests').insert({
    user_id: userId,
    month,
    status: 'completed',
    recipient_full_name: recipientName || null,
  })
}

export async function deleteCompletedLoan(requestId) {
  return supabase.from('loan_requests').delete().eq('id', requestId).eq('status', 'completed')
}
