import { supabase } from './supabaseClient'

export async function getLiveStream() {
  const { data, error } = await supabase.from('live_stream').select('url, is_active').eq('id', true).maybeSingle()
  return { data, error }
}

export async function setLiveStream(url, isActive) {
  return supabase
    .from('live_stream')
    .update({ url, is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', true)
}
