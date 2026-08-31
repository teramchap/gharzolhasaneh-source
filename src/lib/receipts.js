import { supabase } from './supabaseClient'

// Makes sure every existing month of a share's fund has a matching
// installment row (due amount). Safe to call repeatedly — only inserts
// what's missing, e.g. after a fund's duration is extended.
export async function ensureInstallmentsForShare(shareId, fundId, amount) {
  const { data: months } = await supabase.from('fund_months').select('id').eq('fund_id', fundId)
  const { data: existing } = await supabase.from('installments').select('fund_month_id').eq('share_id', shareId)
  const existingIds = new Set((existing ?? []).map((e) => e.fund_month_id))
  const missing = (months ?? []).filter((m) => !existingIds.has(m.id))
  if (missing.length) {
    const rows = missing.map((m) => ({ share_id: shareId, fund_month_id: m.id, due_amount: amount }))
    await supabase.from('installments').insert(rows)
  }
}

// All receipts this member has ever submitted, most recent first.
export async function getMyReceipts(userId) {
  const { data, error } = await supabase
    .from('receipts')
    .select('*, receipt_installments(amount_applied, installments(fund_months(jalali_month), shares(fund_codes(code_number, funds(name)))))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data, error }
}

// ---------- Member side ----------

// All of a member's installments (dues), across every fund/code/month,
// with fund/month labels attached. Backfills any missing installment
// rows first (covers shares created before this feature existed).
// An installment belongs to this member if either: (a) it was directly
// reassigned to them (payer_user_id), or (b) it's untouched (no override)
// and they own the underlying share.
export async function getMyInstallments(userId) {
  const { data: shares } = await supabase
    .from('shares')
    .select('id, amount, fund_codes(code_number, fund_id, funds(name))')
    .eq('user_id', userId)

  for (const s of shares ?? []) {
    await ensureInstallmentsForShare(s.id, s.fund_codes.fund_id, s.amount)
  }

  const selectCols =
    '*, shares!inner(user_id, amount, code_id, fund_codes(code_number, funds(name))), fund_months(jalali_month, sequence, winner_code_id), receipt_installments(amount_applied, receipts(status))'

  const [ownedResult, reassignedResult] = await Promise.all([
    supabase.from('installments').select(selectCols).eq('shares.user_id', userId).is('payer_user_id', null),
    supabase.from('installments').select(selectCols).eq('payer_user_id', userId),
  ])

  if (ownedResult.error) return { data: null, error: ownedResult.error }
  if (reassignedResult.error) return { data: null, error: reassignedResult.error }

  const byId = new Map()
  for (const row of [...(ownedResult.data ?? []), ...(reassignedResult.data ?? [])]) {
    byId.set(row.id, row)
  }

  const sorted = Array.from(byId.values()).sort((a, b) => {
    const am = a.fund_months?.jalali_month ?? ''
    const bm = b.fund_months?.jalali_month ?? ''
    return am.localeCompare(bm)
  })

  return { data: sorted, error: null }
}

// Sum of amounts already submitted for this installment via receipts that
// are still awaiting admin review/transfer — not yet confirmed, but also
// not free to submit again for the same portion.
export function getPendingAmount(inst) {
  return (inst.receipt_installments ?? [])
    .filter((ri) => ri.receipts?.status === 'pending_review' || ri.receipts?.status === 'pending_transfer')
    .reduce((sum, ri) => sum + Number(ri.amount_applied), 0)
}

export async function submitReceipt({ userId, totalAmount, images, allocations, hasImage, depositDateJalali, cardLast4 }) {
  const { data: receipt, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      total_amount: totalAmount,
      status: 'pending_review',
      has_image: hasImage,
      deposit_date_jalali: depositDateJalali,
      card_last4: hasImage ? null : cardLast4,
    })
    .select()
    .single()
  if (error) return { data: null, error }

  if (hasImage) {
    for (const file of images) {
      const path = `${userId}/${receipt.id}/${crypto.randomUUID()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file)
      if (!upErr) {
        await supabase.from('receipt_images').insert({ receipt_id: receipt.id, storage_path: path })
      }
    }
  }

  const rows = allocations.map((a) => ({
    receipt_id: receipt.id,
    installment_id: a.installmentId,
    amount_applied: a.amount,
  }))
  const { error: allocError } = await supabase.from('receipt_installments').insert(rows)
  if (allocError) return { data: receipt, error: allocError }

  const instIds = allocations.map((a) => a.installmentId)
  await supabase.from('installments').update({ status: 'pending_review' }).in('id', instIds)

  return { data: receipt, error: null }
}

// ---------- Admin side ----------

export async function listReceiptsByStatus(status) {
  const { data, error } = await supabase
    .from('receipts')
    .select(
      '*, users(full_name, mobile), receipt_images(storage_path), receipt_installments(amount_applied, installments(due_amount, paid_amount, fund_months(jalali_month), shares(fund_codes(code_number, funds(name)))))'
    )
    .eq('status', status)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function countPendingReceipts() {
  const { count, error } = await supabase
    .from('receipts')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending_review', 'pending_transfer'])
  return { count: count ?? 0, error }
}

export function getReceiptImageUrl(path) {
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

export async function approveReceipt(receiptId, cardLast4) {
  const { data: receipt } = await supabase
    .from('receipts')
    .select('id, receipt_installments(installment_id)')
    .eq('id', receiptId)
    .single()

  const { error } = await supabase
    .from('receipts')
    .update({ status: 'pending_transfer', card_last4: cardLast4 })
    .eq('id', receiptId)
  if (error) return { error }

  const instIds = (receipt?.receipt_installments ?? []).map((ri) => ri.installment_id)
  if (instIds.length) await supabase.from('installments').update({ status: 'pending_transfer' }).in('id', instIds)
  return { error: null }
}

export async function rejectReceipt(receiptId, reason) {
  const { data: receipt } = await supabase
    .from('receipts')
    .select('id, receipt_installments(installment_id)')
    .eq('id', receiptId)
    .single()

  const { error } = await supabase
    .from('receipts')
    .update({ status: 'rejected', rejection_reason: reason })
    .eq('id', receiptId)
  if (error) return { error }

  const instIds = (receipt?.receipt_installments ?? []).map((ri) => ri.installment_id)
  if (instIds.length) await supabase.from('installments').update({ status: null }).in('id', instIds)
  return { error: null }
}

export async function finalConfirmReceipt(receiptId) {
  const { data: receipt } = await supabase
    .from('receipts')
    .select('id, deposit_date_jalali, receipt_installments(installment_id, amount_applied, installments(due_amount, paid_amount))')
    .eq('id', receiptId)
    .single()

  const { error } = await supabase.from('receipts').update({ status: 'confirmed' }).eq('id', receiptId)
  if (error) return { error }

  // Goodwill: +1 per day paid before the 15th, -1 per day after. Payment day
  // taken from this receipt's deposit date (last portion paid wins, per spec).
  const depositDay = Number(receipt?.deposit_date_jalali?.split('-')?.[2])
  const goodwillScore = Number.isFinite(depositDay) ? 15 - depositDay : null

  for (const ri of receipt?.receipt_installments ?? []) {
    const newPaid = Number(ri.installments.paid_amount || 0) + Number(ri.amount_applied)
    const isPartial = newPaid < Number(ri.installments.due_amount)
    await supabase
      .from('installments')
      .update({ paid_amount: newPaid, is_partial: isPartial, status: 'confirmed', goodwill_score: goodwillScore })
      .eq('id', ri.installment_id)
  }
  return { error: null }
}
