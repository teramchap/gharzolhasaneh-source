import { supabase } from './supabaseClient'

export async function getMyNotes(userId) {
  const { data, error } = await supabase.from('admin_notes').select('content').eq('user_id', userId).maybeSingle()
  return { data: data?.content ?? '', error }
}

export async function saveMyNotes(userId, content) {
  return supabase.from('admin_notes').upsert({ user_id: userId, content, updated_at: new Date().toISOString() })
}
