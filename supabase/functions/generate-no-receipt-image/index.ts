import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeXml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildSvg(date: string, amount: string, cardLast4: string): string {
  const width = 1200
  const height = 760
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="40" y="40" width="1120" height="680" rx="28" fill="#ffffff" stroke="#1f2937" stroke-width="3"/>
  <text x="600" y="125" text-anchor="middle" direction="rtl" unicode-bidi="plaintext" font-family="Tahoma, Arial, sans-serif" font-size="42" font-weight="700" fill="#111827">رسید ثبت واریز بدون تصویر فیش</text>
  <line x1="100" y1="170" x2="1100" y2="170" stroke="#d1d5db" stroke-width="2"/>
  <text x="1010" y="270" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="700" fill="#374151">تاریخ واریز</text>
  <text x="190" y="270" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Tahoma, Arial, sans-serif" font-size="34" fill="#111827">${escapeXml(date)}</text>
  <text x="1010" y="390" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="700" fill="#374151">مبلغ</text>
  <text x="190" y="390" text-anchor="start" direction="rtl" unicode-bidi="plaintext" font-family="Tahoma, Arial, sans-serif" font-size="34" fill="#111827">${escapeXml(amount)}</text>
  <text x="1010" y="510" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Tahoma, Arial, sans-serif" font-size="34" font-weight="700" fill="#374151">چهار رقم آخر کارت</text>
  <text x="190" y="510" text-anchor="start" direction="ltr" font-family="Tahoma, Arial, sans-serif" font-size="34" fill="#111827">${escapeXml(cardLast4)}</text>
</svg>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization is required')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!anonKey || !serviceRoleKey) throw new Error('Supabase server keys are not configured')
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, { global: { headers: { Authorization: authHeader } } })
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) throw new Error('Unauthorized')
    const body = await req.json()
    const receiptId = String(body.receipt_id ?? '')
    const preview = body.preview === true
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceRoleKey)
    let date = String(body.deposit_date_jalali ?? '')
    let amount = String(body.total_amount ?? '')
    let cardLast4 = String(body.card_last4 ?? '')
    let userId = authData.user.id
    if (receiptId) {
      const { data: receipt, error: receiptError } = await admin.from('receipts').select('id,user_id,total_amount,card_last4,deposit_date_jalali,has_image').eq('id', receiptId).single()
      if (receiptError || !receipt) throw new Error('Receipt not found')
      if (receipt.user_id !== authData.user.id) throw new Error('Receipt does not belong to the logged-in user')
      userId = receipt.user_id
      date = String(receipt.deposit_date_jalali ?? '')
      amount = String(receipt.total_amount ?? '')
      cardLast4 = String(receipt.card_last4 ?? '')
      const { data: existing } = await admin.from('receipt_images').select('id,storage_path').eq('receipt_id', receiptId).order('id', { ascending: false }).limit(1)
      if (existing?.length) return new Response(JSON.stringify({ ok: true, already_exists: true, path: existing[0].storage_path }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!date || !amount || !/^\d{4}$/.test(cardLast4)) throw new Error('deposit_date_jalali, total_amount and 4-digit card_last4 are required')
    const svg = buildSvg(date, amount, cardLast4)
    if (preview) return new Response(svg, { headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml; charset=utf-8' } })
    if (!receiptId) throw new Error('receipt_id is required when saving the image')
    const path = `${userId}/${receiptId}/no-receipt-${crypto.randomUUID()}.svg`
    const { error: uploadError } = await admin.storage.from('receipts').upload(path, new Blob([svg], { type: 'image/svg+xml' }), { contentType: 'image/svg+xml', cacheControl: '31536000', upsert: false })
    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`)
    const { error: imageError } = await admin.from('receipt_images').insert({ receipt_id: receiptId, storage_path: path })
    if (imageError) { await admin.storage.from('receipts').remove([path]); throw new Error(`receipt_images insert failed: ${imageError.message}`) }
    const { error: updateError } = await admin.from('receipts').update({ has_image: true }).eq('id', receiptId)
    if (updateError) { await admin.from('receipt_images').delete().eq('receipt_id', receiptId).eq('storage_path', path); await admin.storage.from('receipts').remove([path]); throw new Error(`Receipt update failed: ${updateError.message}`) }
    return new Response(JSON.stringify({ ok: true, path, has_image: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
