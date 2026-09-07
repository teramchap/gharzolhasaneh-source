import { supabase } from './supabaseClient'
import { getFundGoodwillRanking } from './reports'

function incrementJalaliMonth(ym) {
  const [y, m] = ym.split('-').map(Number)
  const nextMonth = m === 12 ? 1 : m + 1
  const nextYear = m === 12 ? y + 1 : y
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`
}

function computeEndMonth(startMonth, durationMonths) {
  if (!startMonth || !durationMonths) return null
  let cursor = startMonth
  for (let i = 1; i < durationMonths; i++) cursor = incrementJalaliMonth(cursor)
  return cursor
}

function summarize({ shareId, fund, codeId, codeNumber, amount, installments, userId, labelSuffix }) {
  const sorted = installments
    .slice()
    .sort((a, b) => (a.fund_months?.sequence ?? 0) - (b.fund_months?.sequence ?? 0))

  const wonMonth = sorted.find((i) => i.fund_months?.winner_code_id === codeId)?.fund_months?.jalali_month ?? null
  const paidCount = sorted.filter((i) => (i.status === 'confirmed' && !i.is_partial) || i.deducted).length
  const remainingCount = sorted.length - paidCount

  return {
    shareId,
    codeId,
    fundName: (fund?.name ?? '—') + (labelSuffix ?? ''),
    codeNumber,
    amount,
    totalLoan: fund ? Number(amount) * Number(fund.duration_months ?? 0) : null,
    startMonth: sorted[0]?.fund_months?.jalali_month ?? fund?.start_month_jalali,
    endMonth: fund ? computeEndMonth(fund.start_month_jalali, fund.duration_months) : null,
    wonMonth,
    paidCount,
    remainingCount,
    installments: sorted,
  }
}

export async function getMySharesDetailed(userId) {
  const result = []

  // 1) Shares I own outright (or partly own, if some months were
  // transferred away — those months are excluded from my counts here).
  const { data: shares } = await supabase
    .from('shares')
    .select(
      '*, fund_codes(id, code_number, fund_id, funds(name, total_amount, start_month_jalali, duration_months)), installments(*, fund_months(id, jalali_month, sequence, winner_code_id))'
    )
    .eq('user_id', userId)

  const ownedShareIds = new Set()

  for (const share of shares ?? []) {
    ownedShareIds.add(share.id)
    try {
      const myInstallments = (share.installments ?? []).filter((i) => !i.payer_user_id || i.payer_user_id === userId)
      const fund = share.fund_codes?.funds
      const codeId = share.fund_codes?.id

      let ranking = []
      if (share.fund_codes?.fund_id) ranking = await getFundGoodwillRanking(share.fund_codes.fund_id)
      const myIndex = ranking.findIndex((r) => r.userId === userId)

      const summary = summarize({
        shareId: share.id,
        fund,
        codeId,
        codeNumber: share.fund_codes?.code_number,
        amount: share.amount,
        installments: myInstallments,
        userId,
      })
      result.push({ ...summary, rank: myIndex >= 0 ? myIndex + 1 : null, totalRanked: ranking.length })
    } catch (err) {
      console.error('Skipping a share that failed to process:', share?.id, err)
    }
  }

  // 2) Months reassigned to me from someone else's share ("انتقال باقیمانده").
  const { data: reassigned } = await supabase
    .from('installments')
    .select(
      '*, fund_months(id, jalali_month, sequence, winner_code_id), shares(id, amount, user_id, fund_codes(id, code_number, fund_id, funds(name, total_amount, start_month_jalali, duration_months)))'
    )
    .eq('payer_user_id', userId)

  const bySourceShare = {}
  for (const inst of reassigned ?? []) {
    if (ownedShareIds.has(inst.share_id)) continue
    if (!bySourceShare[inst.share_id]) bySourceShare[inst.share_id] = { share: inst.shares, installments: [] }
    bySourceShare[inst.share_id].installments.push(inst)
  }

  for (const { share, installments } of Object.values(bySourceShare)) {
    try {
      const fund = share.fund_codes?.funds
      const codeId = share.fund_codes?.id

      let ranking = []
      if (share.fund_codes?.fund_id) ranking = await getFundGoodwillRanking(share.fund_codes.fund_id)
      const myIndex = ranking.findIndex((r) => r.userId === userId)

      const summary = summarize({
        shareId: `${share.id}-transferred-${userId}`,
        fund,
        codeId,
        codeNumber: share.fund_codes?.code_number,
        amount: share.amount,
        installments,
        userId,
        labelSuffix: ' (بخش منتقل‌شده به شما)',
      })
      result.push({ ...summary, rank: myIndex >= 0 ? myIndex + 1 : null, totalRanked: ranking.length })
    } catch (err) {
      console.error('Skipping a transferred share that failed to process:', share?.id, err)
    }
  }

  return result
}
