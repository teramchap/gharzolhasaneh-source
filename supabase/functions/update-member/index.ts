// Supabase Edge Function: update-member
// Updates a member's profile fields. If the mobile number changes, the
// underlying auth login email is updated to match. Admin-only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeMobile(input) {
  const englishDigits = String(input ?? '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  const digits = englishDigits.replace(/\D/g, '')
  if (digits.startsWith('98')) return '0' + digits.slice(2)
  if (digits.startsWith('0')) return digits
  return '0' + digits
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization') ?? ''

    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser()

    if (!caller) {
      return new Response(JSON.stringify({ error: 'ورود انجام نشده است.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await admin.from('users').select('role').eq('id', caller.id).single()
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'فقط مدیر می‌تواند اطلاعات عضو را ویرایش کند.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { memberId, full_name, mobile, rubika_number, newPassword } = await req.json()
    if (!memberId || !full_name?.trim() || !mobile?.trim()) {
      return new Response(JSON.stringify({ error: 'شناسه عضو، نام و شماره موبایل الزامی است.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedMobile = normalizeMobile(mobile)
    const newEmail = `${normalizedMobile}@members.gharzolhasaneh.internal`

    const { data: existing } = await admin.from('users').select('mobile').eq('id', memberId).single()
    const emailChanged = existing && existing.mobile !== normalizedMobile

    if (emailChanged || newPassword) {
      const updatePayload = {}
      if (emailChanged) updatePayload.email = newEmail
      if (newPassword) updatePayload.password = newPassword
      const { error: authError } = await admin.auth.admin.updateUserById(memberId, updatePayload)
      if (authError) {
        return new Response(JSON.stringify({ error: 'به‌روزرسانی ورود ناموفق بود: ' + authError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: profileError } = await admin
      .from('users')
      .update({ full_name: full_name.trim(), mobile: normalizedMobile, rubika_number: rubika_number?.trim() || null })
      .eq('id', memberId)

    if (profileError) {
      return new Response(JSON.stringify({ error: 'ثبت اطلاعات ناموفق بود: ' + profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'خطای غیرمنتظره: ' + err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
