import { supabase } from './supabaseClient'

export async function listActiveFunds() {
  const { data, error } = await supabase
    .from('funds')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Months of a fund that haven't had a winner drawn yet.
export async function getUndrawnMonths(fundId) {
  const { data, error } = await supabase
    .from('fund_months')
    .select('*')
    .eq('fund_id', fundId)
    .is('winner_code_id', null)
    .order('sequence', { ascending: true })
  return { data, error }
}

// Records the winning code for a month, and creates one "winners" row per
// effective payer on that code — a share transferred partway through
// produces two payout rows (one per payer), split by how many months
// each was responsible for.
export async function drawWinner({ monthId, codeId, drawDateJalali }) {
  const { error: monthError } = await supabase
    .from('fund_months')
    .update({ winner_code_id: codeId, draw_date_jalali: drawDateJalali, is_completed: true })
    .eq('id', monthId)

  if (monthError) return { error: monthError }

  const { data: shares, error: sharesError } = await supabase
    .from('shares')
    .select('id, amount, user_id')
    .eq('code_id', codeId)

  if (sharesError) return { error: sharesError }

  const winnerRows = []
  for (const share of shares ?? []) {
    const { data: installments } = await supabase
      .from('installments')
      .select('payer_user_id')
      .eq('share_id', share.id)

    const monthCounts = {}
    for (const inst of installments ?? []) {
      const payer = inst.payer_user_id ?? share.user_id
      monthCounts[payer] = (monthCounts[payer] ?? 0) + 1
    }
    if (Object.keys(monthCounts).length === 0) monthCounts[share.user_id] = 0

    for (const [payerId, monthCount] of Object.entries(monthCounts)) {
      winnerRows.push({
        fund_month_id: monthId,
        share_id: share.id,
        payer_user_id: payerId,
        payout_amount: monthCount * Number(share.amount),
        status: 'awaiting_guarantee_type',
      })
    }
  }

  if (winnerRows.length) {
    const { error: winnersError } = await supabase.from('winners').insert(winnerRows)
    if (winnersError) return { error: winnersError }
  }

  return { error: null }
}

// Codes eligible to win: has at least one member, and hasn't already
// won a previous month in this fund (each code can only win once).
export async function getEligibleDrawCodes(fundId) {
  const { data: codes, error } = await supabase
    .from('fund_codes')
    .select('*, shares(*, users!shares_user_id_fkey(full_name))')
    .eq('fund_id', fundId)
    .order('code_number', { ascending: true })
  if (error) return { data: null, error }

  const { data: wonMonths } = await supabase
    .from('fund_months')
    .select('winner_code_id')
    .eq('fund_id', fundId)
    .not('winner_code_id', 'is', null)

  const wonCodeIds = new Set((wonMonths ?? []).map((m) => m.winner_code_id))
  const eligible = (codes ?? []).filter((c) => (c.shares ?? []).length > 0 && !wonCodeIds.has(c.id))
  return { data: eligible, error: null }
}
export async function listDraws(fundId) {
  const { data, error } = await supabase
    .from('fund_months')
    .select(
      `*, fund_codes(code_number),
      winners(payout_amount, payer_user_id, share_id,
        payer:users!winners_payer_user_id_fkey(full_name),
        shares(users!shares_user_id_fkey(full_name)))`
    )
    .eq('fund_id', fundId)
    .not('winner_code_id', 'is', null)
    .order('sequence', { ascending: true })
  return { data, error }
}
