import { supabase } from './supabaseClient'

export async function listMembers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'member')
    .order('created_at', { ascending: false })
  return { data, error }
}

export async function countMembers() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'member')
  return { count: count ?? 0, error }
}

// Calls the secure Edge Function (create-member) which creates the
// auth account + profile row using the service role key server-side.
export async function createMember({ full_name, mobile, rubika_number, password }) {
  const { data, error } = await supabase.functions.invoke('create-member', {
    body: { full_name, mobile, rubika_number, password },
  })

  if (error) return { data: null, error }
  if (data?.error) return { data: null, error: { message: data.error } }
  return { data, error: null }
}

// Calls the secure Edge Function (update-member) which updates the
// profile (and login email if the mobile changed) server-side.
export async function updateMember({ memberId, full_name, mobile, rubika_number, newPassword }) {
  const { data, error } = await supabase.functions.invoke('update-member', {
    body: { memberId, full_name, mobile, rubika_number, newPassword },
  })

  if (error) return { data: null, error }
  if (data?.error) return { data: null, error: { message: data.error } }
  return { data, error: null }
}

// Calls the secure Edge Function (list-last-logins) to get each member's
// last sign-in time from Supabase Auth (not exposed via the public schema).
export async function getLastLogins() {
  const { data, error } = await supabase.functions.invoke('list-last-logins')
  if (error) return { data: null, error }
  if (data?.error) return { data: null, error: { message: data.error } }

  const map = {}
  for (const row of data?.logins ?? []) {
    map[row.id] = row.last_sign_in_at
  }
  return { data: map, error: null }
}
