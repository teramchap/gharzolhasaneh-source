import { supabase } from './supabaseClient'

// Ranked (desc) average goodwill score per member, within one fund.
// Only members with at least one confirmed+scored installment are ranked.
export async function getFundGoodwillRanking(fundId) {
  const { data: months } = await supabase
    .from('fund_months')
    .select('installments(goodwill_score, shares(users!shares_user_id_fkey(id, full_name)))')
    .eq('fund_id', fundId)

  const goodwillMap = {}
  for (const m of months ?? []) {
    for (const inst of m.installments ?? []) {
      const user = inst.shares?.users
      if (user && inst.goodwill_score !== null && inst.goodwill_score !== undefined) {
        if (!goodwillMap[user.id]) goodwillMap[user.id] = { userId: user.id, name: user.full_name, scores: [] }
        goodwillMap[user.id].scores.push(Number(inst.goodwill_score))
      }
    }
  }

  return Object.values(goodwillMap)
    .map((g) => ({ userId: g.userId, name: g.name, avg: g.scores.reduce((a, b) => a + b, 0) / g.scores.length }))
    .sort((a, b) => b.avg - a.avg)
}

export async function getFundReport(fundId) {
  const { data: fund } = await supabase.from('funds').select('total_amount').eq('id', fundId).single()
  const { data: months } = await supabase
    .from('fund_months')
    .select(
      '*, installments(due_amount, paid_amount, goodwill_score, shares(users!shares_user_id_fkey(id, full_name)))'
    )
    .eq('fund_id', fundId)
    .order('sequence', { ascending: true })

  const fundTotal = Number(fund?.total_amount ?? 0)
  let totalPaid = 0
  let closedMonths = 0
  const goodwillMap = {}

  for (const m of months ?? []) {
    if (m.is_completed) closedMonths++
    for (const inst of m.installments ?? []) {
      totalPaid += Number(inst.paid_amount || 0)
      const user = inst.shares?.users
      if (user && inst.goodwill_score !== null && inst.goodwill_score !== undefined) {
        if (!goodwillMap[user.id]) goodwillMap[user.id] = { name: user.full_name, scores: [] }
        goodwillMap[user.id].scores.push(Number(inst.goodwill_score))
      }
    }
  }

  const totalMonths = (months ?? []).length
  const totalDue = fundTotal * totalMonths

  const goodwillList = Object.values(goodwillMap)
    .map((g) => ({ name: g.name, avg: g.scores.reduce((a, b) => a + b, 0) / g.scores.length }))
    .sort((a, b) => b.avg - a.avg)

  return {
    months: months ?? [],
    fundTotal,
    totalDue,
    totalPaid,
    closedMonths,
    totalMonths,
    goodwillList,
  }
}
