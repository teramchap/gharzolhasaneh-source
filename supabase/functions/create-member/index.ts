// Supabase Edge Function: create-member
// Creates a new member's login account (mobile + password) and their
// profile row. Only callable by an already-authenticated admin — the
// service role key stays on the server and is never exposed to the browser.

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

    // Client bound to the caller's own JWT — used only to verify who's calling.
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

    // Admin client (service role) — used for privileged operations below.
    const admin = createClient(supabaseUrl, serviceRoleKey)

    const { data: callerProfile } = await admin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'فقط مدیر می‌تواند عضو جدید اضافه کند.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { full_name, mobile, rubika_number, password } = await req.json()

    if (!full_name?.trim() || !mobile?.trim() || !password) {
      return new Response(JSON.stringify({ error: 'نام، شماره موبایل و رمز عبور الزامی است.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const normalizedMobile = normalizeMobile(mobile)
    const email = `${normalizedMobile}@members.gharzolhasaneh.internal`

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return new Response(JSON.stringify({ error: 'ساخت حساب ناموفق بود: ' + createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: profileError } = await admin.from('users').insert({
      id: created.user.id,
      full_name: full_name.trim(),
      mobile: normalizedMobile,
      rubika_number: rubika_number?.trim() || null,
      role: 'member',
    })

    if (profileError) {
      // Roll back the auth user so we don't leave an orphaned account.
      await admin.auth.admin.deleteUser(created.user.id)
      return new Response(JSON.stringify({ error: 'ثبت پروفایل ناموفق بود: ' + profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: created.user.id }), {
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
