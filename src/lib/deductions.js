import { supabase } from './supabaseClient'
import { todayJalali } from './format'

// The set of jalali calendar months (e.g. "1404-08") in which this member
// has won something, across every fund. Any of their installments due in
// one of these months (in any fund) becomes eligible for deduction.
export async function getMyWinningMonths(userId) {
  const { data } = await supabase.from('winners').select('fund_months(jalali_month)').eq('payer_user_id', userId)
  return new Set((data ?? []).map((w) => w.fund_months?.jalali_month).filter(Boolean))
}

export async function requestDeduction(installmentId) {
  const { error } = await supabase
    .from('installments')
    .update({ deduction_requested: true, deduction_rejection_reason: null })
    .eq('id', installmentId)
  return { error }
}

// All of this member's deducted (settled-via-deduction) installments —
// covers both their own shares and any months reassigned to them.
export async function getMyDeductions(userId) {
  const selectCols =
    '*, fund_months(jalali_month), shares!inner(user_id, fund_codes(code_number, funds(name)))'

  const [ownedResult, reassignedResult] = await Promise.all([
    supabase.from('installments').select(selectCols).eq('shares.user_id', userId).is('payer_user_id', null).eq('deducted', true),
    supabase.from('installments').select(selectCols).eq('payer_user_id', userId).eq('deducted', true),
  ])

  const byId = new Map()
  for (const row of [...(ownedResult.data ?? []), ...(reassignedResult.data ?? [])]) {
    byId.set(row.id, row)
  }
  return Array.from(byId.values())
}

// ---------- Admin ----------

export async function listDeductionRequests() {
  const { data, error } = await supabase
    .from('installments')
    .select(
      '*, fund_months(jalali_month), shares(fund_codes(code_number, funds(name)), users!shares_user_id_fkey(full_name)), payer:users!installments_payer_user_id_fkey(full_name)'
    )
    .eq('deduction_requested', true)
    .eq('deducted', false)
  return { data, error }
}

export async function approveDeduction(installmentId) {
  const { data: inst } = await supabase.from('installments').select('due_amount').eq('id', installmentId).single()
  const { error } = await supabase
    .from('installments')
    .update({
      deducted: true,
      deduction_requested: false,
      paid_amount: inst?.due_amount ?? 0,
      is_partial: false,
      status: 'confirmed',
      paid_on_jalali: todayJalali().replaceAll('/', '-'),
    })
    .eq('id', installmentId)
  return { error }
}

export async function rejectDeduction(installmentId, reason) {
  const { error } = await supabase
    .from('installments')
    .update({ deduction_requested: false, deduction_rejection_reason: reason })
    .eq('id', installmentId)
  return { error }
}
