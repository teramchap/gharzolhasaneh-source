// Supabase Edge Function: list-last-logins
// Returns { id, last_sign_in_at } for every auth user. Admin-only — this
// data lives in the protected auth schema and needs the service role key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      return new Response(JSON.stringify({ error: 'فقط مدیر می‌تواند این اطلاعات را ببیند.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const logins = []
    let page = 1
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      for (const u of data.users) {
        logins.push({ id: u.id, last_sign_in_at: u.last_sign_in_at })
      }
      if (data.users.length < 1000) break
      page++
    }

    return new Response(JSON.stringify({ logins }), {
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
