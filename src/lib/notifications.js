import { supabase } from './supabaseClient'

export async function createNotification(userId, message, actionUrl = null) {
  return supabase.from('notifications').insert({ user_id: userId, message, action_url: actionUrl })
}

export async function getMyNotifications(userId) {
  return supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
}

export async function getUnreadCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  return count ?? 0
}

export async function markNotificationRead(id) {
  return supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllNotificationsRead(userId) {
  return supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
}
