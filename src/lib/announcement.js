import { supabase } from './supabaseClient'

export async function getAnnouncement() {
  const { data, error } = await supabase.from('dashboard_announcement').select('*').eq('id', 'main').single()
  return { data, error }
}

export function getAnnouncementImageUrl(path) {
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

export async function updateAnnouncement({ message, imageFile, removeImage }) {
  let imagePath
  if (imageFile) {
    const path = `announcements/${crypto.randomUUID()}-${imageFile.name}`
    const { error: upErr } = await supabase.storage.from('receipts').upload(path, imageFile)
    if (upErr) return { error: upErr }
    imagePath = path
  } else if (removeImage) {
    imagePath = null
  }

  const update = { message: message ?? null, updated_at: new Date().toISOString() }
  if (imagePath !== undefined) update.image_path = imagePath

  const { error } = await supabase.from('dashboard_announcement').update(update).eq('id', 'main')
  return { error }
}

export async function clearAnnouncement() {
  const { error } = await supabase
    .from('dashboard_announcement')
    .update({ message: null, image_path: null, updated_at: new Date().toISOString() })
    .eq('id', 'main')
  return { error }
}
