import { supabase } from './supabaseClient'

export async function listMessages(memberId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: true })
  return { data, error }
}

export async function sendMessage({ memberId, senderId, body }) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ member_id: memberId, sender_id: senderId, body })
    .select()
    .single()
  return { data, error }
}

// Calls onInsert(newMessage) whenever a new message arrives in this thread.
// Returns an unsubscribe function.
export function subscribeToThread(memberId, onInsert) {
  const channel = supabase
    .channel(`messages-${memberId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `member_id=eq.${memberId}` },
      (payload) => onInsert(payload.new)
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

// For the admin's thread list: every member, with their last message (if any).
export async function listThreadsForAdmin(members) {
  const { data: allMessages } = await supabase
    .from('messages')
    .select('member_id, body, created_at, sender_id')
    .order('created_at', { ascending: false })

  const lastByMember = {}
  for (const m of allMessages ?? []) {
    if (!lastByMember[m.member_id]) lastByMember[m.member_id] = m
  }

  return members
    .map((member) => ({ member, lastMessage: lastByMember[member.id] ?? null }))
    .sort((a, b) => {
      const at = a.lastMessage?.created_at ?? ''
      const bt = b.lastMessage?.created_at ?? ''
      return bt.localeCompare(at)
    })
}

export async function markThreadRead(memberId, readerId) {
  await supabase
    .from('thread_reads')
    .upsert({ member_id: memberId, reader_id: readerId, last_read_at: new Date().toISOString() }, { onConflict: 'member_id,reader_id' })
}

// How many messages in this thread (sent by the other party) arrived
// after `readerId` last read it.
export async function getUnreadCountsForReader(readerId) {
  const { data: reads } = await supabase.from('thread_reads').select('member_id, last_read_at').eq('reader_id', readerId)
  const readMap = new Map((reads ?? []).map((r) => [r.member_id, r.last_read_at]))

  const { data: messages } = await supabase
    .from('messages')
    .select('member_id, sender_id, created_at')
    .neq('sender_id', readerId)

  const counts = {}
  for (const m of messages ?? []) {
    const lastRead = readMap.get(m.member_id)
    if (!lastRead || m.created_at > lastRead) {
      counts[m.member_id] = (counts[m.member_id] ?? 0) + 1
    }
  }
  return counts
}
