import { supabase } from './supabaseClient'

export async function listFunds() {
  const { data, error } = await supabase
    .from('funds')
    .select('*')
    .order('created_at', { ascending: false })
  return { data, error }
}

// Creates a fund, then generates its codes (1..share_count) and its
// monthly schedule (duration_months rows, starting at start_month_jalali).
export async function createFund({ name, total_amount, share_count, start_month_jalali, duration_months }) {
  const { data: fund, error } = await supabase
    .from('funds')
    .insert({ name, total_amount, share_count, start_month_jalali, duration_months })
    .select()
    .single()

  if (error) return { data: null, error }

  const codes = Array.from({ length: share_count }, (_, i) => ({
    fund_id: fund.id,
    code_number: i + 1,
  }))
  const { error: codesError } = await supabase.from('fund_codes').insert(codes)
  if (codesError) return { data: fund, error: codesError }

  const months = []
  let cursor = start_month_jalali
  for (let seq = 1; seq <= duration_months; seq++) {
    months.push({ fund_id: fund.id, jalali_month: cursor, sequence: seq })
    cursor = incrementJalaliMonth(cursor)
  }
  const { error: monthsError } = await supabase.from('fund_months').insert(months)

  return { data: fund, error: monthsError }
}

// "1404-05" -> "1404-06" (wraps month 12 -> 01 of next year)
function incrementJalaliMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

export async function getFundMonths(fundId) {
  const { data, error } = await supabase
    .from('fund_months')
    .select('*')
    .eq('fund_id', fundId)
    .order('sequence', { ascending: true })
  return { data, error }
}

// Months with their installments (due/paid/status) nested, for the
// "remaining amount per month" view + click-to-expand share list.
export async function getFundMonthsWithPayments(fundId) {
  const { data, error } = await supabase
    .from('fund_months')
    .select(
      '*, installments(due_amount, paid_amount, status, is_partial, deducted, deduction_requested, payer:users!installments_payer_user_id_fkey(full_name), shares(amount, users!shares_user_id_fkey(full_name)))'
    )
    .eq('fund_id', fundId)
    .order('sequence', { ascending: true })
  return { data, error }
}

export async function getFund(fundId) {
  const { data, error } = await supabase.from('funds').select('*').eq('id', fundId).single()
  return { data, error }
}

// Fetches a fund's codes, each with its assigned shares (member + amount),
// and for each share a payer breakdown — normally just the owner, but
// split into segments if part of the share was transferred to someone else.
export async function getFundCodesWithShares(fundId) {
  const { data, error } = await supabase
    .from('fund_codes')
    .select(
      `*, shares(*, users!shares_user_id_fkey(full_name, mobile),
        installments(payer_user_id, payer:users!installments_payer_user_id_fkey(full_name, mobile)))`
    )
    .eq('fund_id', fundId)
    .order('code_number', { ascending: true })

  if (error) return { data: null, error }

  const withBreakdown = (data ?? []).map((code) => ({
    ...code,
    shares: (code.shares ?? []).map((s) => ({ ...s, payerBreakdown: computePayerBreakdown(s) })),
  }))
  return { data: withBreakdown, error: null }
}

// Groups a share's installments by effective payer (the transfer override,
// falling back to the original owner). One entry per distinct payer, with
// how many months they're responsible for.
function computePayerBreakdown(share) {
  const groups = {}
  const installments = share.installments ?? []
  if (installments.length === 0) {
    return [{ userId: share.user_id, name: share.users?.full_name, mobile: share.users?.mobile, monthCount: 0 }]
  }
  for (const inst of installments) {
    const isOverride = !!inst.payer_user_id
    const userId = isOverride ? inst.payer_user_id : share.user_id
    const name = isOverride ? inst.payer?.full_name : share.users?.full_name
    const mobile = isOverride ? inst.payer?.mobile : share.users?.mobile
    if (!groups[userId]) groups[userId] = { userId, name, mobile, monthCount: 0 }
    groups[userId].monthCount++
  }
  return Object.values(groups)
}

// Overrides a specific code's cap (instead of the fund's standard
// installment_amount). Pass null to reset it back to the fund default.
export async function setCodeCustomAmount(codeId, amount) {
  const { data, error } = await supabase
    .from('fund_codes')
    .update({ custom_amount: amount })
    .eq('id', codeId)
    .select()
    .single()
  return { data, error }
}

export async function addShare({ code_id, user_id, amount, fund_id }) {
  const { data, error } = await supabase
    .from('shares')
    .insert({ code_id, user_id, amount })
    .select()
    .single()

  if (error) return { data: null, error }

  // Generate one installment (due amount) per existing month of this fund.
  const { data: months } = await supabase.from('fund_months').select('id').eq('fund_id', fund_id)
  if (months?.length) {
    const rows = months.map((m) => ({ share_id: data.id, fund_month_id: m.id, due_amount: amount }))
    await supabase.from('installments').insert(rows)
  }

  return { data, error: null }
}

export async function deleteShare(shareId) {
  const { error } = await supabase.from('shares').delete().eq('id', shareId)
  return { error }
}

// Full edit: name/amount always; share_count and duration_months can grow
// or shrink (shrinking is blocked if it would delete codes/months that
// already have members or a recorded winner).
export async function updateFund(fundId, { name, total_amount, share_count, duration_months }) {
  const { data: current, error: fetchError } = await supabase.from('funds').select('*').eq('id', fundId).single()
  if (fetchError) return { data: null, error: fetchError }

  if (share_count !== current.share_count) {
    if (share_count > current.share_count) {
      const newCodes = Array.from({ length: share_count - current.share_count }, (_, i) => ({
        fund_id: fundId,
        code_number: current.share_count + i + 1,
      }))
      const { error } = await supabase.from('fund_codes').insert(newCodes)
      if (error) return { data: null, error }
    } else {
      const { data: toRemove } = await supabase
        .from('fund_codes')
        .select('id, code_number, shares(id)')
        .eq('fund_id', fundId)
        .gt('code_number', share_count)
      const occupied = (toRemove ?? []).filter((c) => (c.shares ?? []).length > 0)
      if (occupied.length > 0) {
        return {
          data: null,
          error: { message: `کدهای ${occupied.map((c) => c.code_number).join('، ')} عضو دارند، نمی‌توان تعداد کد را کمتر از این کرد.` },
        }
      }
      const ids = (toRemove ?? []).map((c) => c.id)
      if (ids.length) await supabase.from('fund_codes').delete().in('id', ids)
    }
  }

  if (duration_months !== current.duration_months) {
    if (duration_months > current.duration_months) {
      const { data: existingMonths } = await supabase
        .from('fund_months')
        .select('jalali_month, sequence')
        .eq('fund_id', fundId)
        .order('sequence', { ascending: false })
        .limit(1)
      let cursor = existingMonths?.[0] ? incrementJalaliMonth(existingMonths[0].jalali_month) : current.start_month_jalali
      const startSeq = (existingMonths?.[0]?.sequence ?? 0) + 1
      const newMonths = []
      for (let seq = startSeq; seq <= duration_months; seq++) {
        newMonths.push({ fund_id: fundId, jalali_month: cursor, sequence: seq })
        cursor = incrementJalaliMonth(cursor)
      }
      const { data: insertedMonths, error } = await supabase.from('fund_months').insert(newMonths).select()
      if (error) return { data: null, error }

      // Backfill: any member already assigned to a code needs an
      // installment for these newly added months too.
      const { data: codes } = await supabase.from('fund_codes').select('id').eq('fund_id', fundId)
      const codeIds = (codes ?? []).map((c) => c.id)
      if (codeIds.length) {
        const { data: existingShares } = await supabase.from('shares').select('id, amount').in('code_id', codeIds)
        if (existingShares?.length && insertedMonths?.length) {
          const backfillRows = []
          for (const share of existingShares) {
            for (const month of insertedMonths) {
              backfillRows.push({ share_id: share.id, fund_month_id: month.id, due_amount: share.amount })
            }
          }
          await supabase.from('installments').insert(backfillRows)
        }
      }
    } else {
      const { data: toRemove } = await supabase
        .from('fund_months')
        .select('id, sequence, winner_code_id')
        .eq('fund_id', fundId)
        .gt('sequence', duration_months)
      const drawn = (toRemove ?? []).filter((m) => m.winner_code_id)
      if (drawn.length > 0) {
        return {
          data: null,
          error: { message: `ماه‌های ${drawn.map((m) => m.sequence).join('، ')} قرعه‌کشی شده‌اند، نمی‌توان مدت را کمتر از این کرد.` },
        }
      }
      const ids = (toRemove ?? []).map((m) => m.id)
      if (ids.length) await supabase.from('fund_months').delete().in('id', ids)
    }
  }

  const { data, error } = await supabase
    .from('funds')
    .update({ name, total_amount, share_count, duration_months })
    .eq('id', fundId)
    .select()
    .single()
  return { data, error }
}

export async function setFundStatus(fundId, status) {
  const { data, error } = await supabase
    .from('funds')
    .update({ status })
    .eq('id', fundId)
    .select()
    .single()
  return { data, error }
}

// Flat list of every effective payer across every code in a fund, for the
// "نمایش تمام اعضا" view — a transferred share appears as separate rows,
// one per payer, so nobody's responsibility goes unlisted.
export async function getFundAllShares(fundId) {
  const { data, error } = await supabase
    .from('fund_codes')
    .select(
      `code_number, shares(id, user_id, amount, users!shares_user_id_fkey(full_name, mobile),
        installments(payer_user_id, payer:users!installments_payer_user_id_fkey(full_name, mobile)))`
    )
    .eq('fund_id', fundId)
    .order('code_number', { ascending: true })

  if (error) return { data: null, error }

  const withBreakdown = (data ?? []).map((code) => ({
    code_number: code.code_number,
    shares: (code.shares ?? []).map((s) => ({ amount: s.amount, payerBreakdown: computePayerBreakdown(s) })),
  }))
  return { data: withBreakdown, error: null }
}

export async function countFunds() {
  const { count, error } = await supabase.from('funds').select('*', { count: 'exact', head: true })
  return { count: count ?? 0, error }
}
