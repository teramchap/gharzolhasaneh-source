import { supabase } from './supabaseClient'

// Full transfer: the share simply belongs to the new person from now on.
// Since installments are keyed by share_id, everything (past + future)
// follows automatically — no other rows need to change.
export async function transferShareFull(shareId, newUserId) {
  const { error } = await supabase.from('shares').update({ user_id: newUserId }).eq('id', shareId)
  return { error }
}

// Partial transfer: months before `fromSequence` keep their original payer;
// months from `fromSequence` onward become the new person's responsibility.
export async function transferShareRemaining(shareId, newUserId, fromSequence) {
  const { data: share, error: shareError } = await supabase
    .from('shares')
    .select('code_id, fund_codes(fund_id)')
    .eq('id', shareId)
    .single()
  if (shareError) return { error: shareError }

  const { data: months, error: monthsError } = await supabase
    .from('fund_months')
    .select('id')
    .eq('fund_id', share.fund_codes.fund_id)
    .gte('sequence', fromSequence)
  if (monthsError) return { error: monthsError }

  const monthIds = (months ?? []).map((m) => m.id)
  if (monthIds.length === 0) return { error: null }

  const { error } = await supabase
    .from('installments')
    .update({ payer_user_id: newUserId })
    .eq('share_id', shareId)
    .in('fund_month_id', monthIds)
  return { error }
}
