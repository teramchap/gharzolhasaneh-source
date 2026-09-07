import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import ChatThread from '../../components/ChatThread'

export default function AdminChatPage() {
  const { id } = useParams()
  const { profile } = useAuth()
  const [member, setMember] = useState(null)

  useEffect(() => {
    supabase.from('users').select('full_name').eq('id', id).single().then(({ data }) => setMember(data))
  }, [id])

  if (!profile?.id) return null

  return (
    <ChatThread
      memberId={id}
      currentUserId={profile.id}
      title={
        <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
          <Link to="/admin/chat" className="text-white/80 hover:text-white">
            <BackIcon className="h-5 w-5" />
          </Link>
          <span className="font-bold">{member?.full_name ?? 'گفتگو'}</span>
        </header>
      }
    />
  )
}

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
