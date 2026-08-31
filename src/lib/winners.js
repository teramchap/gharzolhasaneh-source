import { supabase } from './supabaseClient'
import { getReceiptImageUrl } from './receipts'

export { getReceiptImageUrl as getWinnerImageUrl }

const SELECT = `*, fund_months(jalali_month, sequence, fund_id, funds(name)),
  shares(user_id, amount, code_id, users!shares_user_id_fkey(full_name)),
  payer:users!winners_payer_user_id_fkey(id, full_name, mobile)`

export async function listAllWinners(monthFilter) {
  let query = supabase
    .from('winners')
    .select(SELECT)
    .order('jalali_month', { foreignTable: 'fund_months', ascending: true })
  if (monthFilter) query = query.eq('fund_month_id', monthFilter)
  const { data, error } = await query
  return { data, error }
}

export async function getWinner(id) {
  const { data, error } = await supabase.from('winners').select(SELECT).eq('id', id).single()
  return { data, error }
}

export async function getMyActiveWinners(userId) {
  const { data, error } = await supabase
    .from('winners')
    .select(SELECT)
    .eq('payer_user_id', userId)
    .neq('status', 'completed')
  return { data, error }
}

// The winner record (if any) that blocks the member from doing anything
// else until they confirm receiving their payout.
export async function getBlockingWinner(userId) {
  const { data, error } = await supabase
    .from('winners')
    .select('id')
    .eq('payer_user_id', userId)
    .eq('status', 'awaiting_deposit_confirmation')
    .limit(1)
    .maybeSingle()
  return { data, error }
}

// ---------- Admin actions ----------

export async function setGuaranteeType(winnerId, types) {
  const nextStatus = types.length > 0 ? 'awaiting_documents' : 'awaiting_account_info'
  const { error } = await supabase
    .from('winners')
    .update({ guarantee_type: types, status: nextStatus })
    .eq('id', winnerId)
  return { error }
}

export async function approveDocuments(winnerId) {
  const { error } = await supabase
    .from('winners')
    .update({ status: 'awaiting_account_info', document_rejection_reason: null })
    .eq('id', winnerId)
  return { error }
}

export async function rejectDocuments(winnerId, reason) {
  const { error } = await supabase
    .from('winners')
    .update({ status: 'awaiting_documents', document_rejection_reason: reason })
    .eq('id', winnerId)
  return { error }
}

export async function approveAccountInfo(winnerId) {
  const { error } = await supabase
    .from('winners')
    .update({ status: 'awaiting_deposit', account_info_rejection_reason: null })
    .eq('id', winnerId)
  return { error }
}

export async function rejectAccountInfo(winnerId, reason) {
  const { error } = await supabase
    .from('winners')
    .update({ status: 'awaiting_account_info', account_info_rejection_reason: reason })
    .eq('id', winnerId)
  return { error }
}

// file is optional — admin may not have a payout receipt image to attach.
export async function uploadPayoutReceipt(winnerId, file) {
  let path = null
  if (file) {
    path = `payouts/${winnerId}/${crypto.randomUUID()}-${file.name}`
    const { error: upErr } = await supabase.storage.from('receipts').upload(path, file)
    if (upErr) return { error: upErr }
  }
  const { error } = await supabase
    .from('winners')
    .update({ payout_receipt_path: path, status: 'awaiting_deposit_confirmation' })
    .eq('id', winnerId)
  return { error }
}

// ---------- Member actions ----------

export async function uploadGuaranteeDocuments(winnerId, files) {
  const paths = []
  for (const file of files) {
    const path = `guarantees/${winnerId}/${crypto.randomUUID()}-${file.name}`
    const { error } = await supabase.storage.from('receipts').upload(path, file)
    if (!error) paths.push(path)
  }
  const { error } = await supabase
    .from('winners')
    .update({ guarantee_documents: paths, status: 'awaiting_document_approval' })
    .eq('id', winnerId)
  return { error }
}

export async function submitAccountInfo(winnerId, { shebaNumber, bankName, accountHolderName }) {
  const { error } = await supabase
    .from('winners')
    .update({
      sheba_number: shebaNumber,
      bank_name: bankName,
      account_holder_name: accountHolderName,
      status: 'awaiting_account_info_approval',
    })
    .eq('id', winnerId)
  return { error }
}

export async function confirmReceived(winnerId) {
  const { error } = await supabase
    .from('winners')
    .update({ status: 'completed', member_confirmed_at: new Date().toISOString() })
    .eq('id', winnerId)
  return { error }
}
