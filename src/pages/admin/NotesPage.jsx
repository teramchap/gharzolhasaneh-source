import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getMyNotes, saveMyNotes } from '../../lib/notes'

export default function NotesPage() {
  const { profile } = useAuth()
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('') // '' | 'saving' | 'saved'
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!profile?.id) return
    getMyNotes(profile.id).then(({ data }) => {
      setContent(data)
      setLoading(false)
    })
  }, [profile?.id])

  function handleChange(e) {
    const value = e.target.value
    setContent(value)
    setStatus('saving')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      await saveMyNotes(profile.id, value)
      setStatus('saved')
    }, 800)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className="flex min-h-dvh flex-col bg-brand-purple-100">
      <header className="flex items-center justify-between gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="text-white/80 hover:text-white">
            <BackIcon className="h-5 w-5" />
          </Link>
          <span className="font-bold">یادداشت‌ها</span>
        </div>
        <span className="text-xs text-white/60">
          {status === 'saving' ? 'در حال ذخیره…' : status === 'saved' ? 'ذخیره شد ✓' : ''}
        </span>
      </header>

      <main className="flex flex-1 flex-col p-3">
        {loading ? (
          <p className="p-4 text-center text-sm text-brand-purple-900/60">در حال بارگذاری…</p>
        ) : (
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="هر چی می‌خوای یادداشت کن…"
            dir="rtl"
            className="notebook-paper flex-1 resize-none rounded-xl bg-white p-4 text-[15px] text-brand-purple-900 shadow-sm outline-none ring-1 ring-brand-purple-900/5 placeholder:text-brand-purple-900/30"
            style={{
              lineHeight: '32px',
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(37,99,235,0.22) 31px, rgba(37,99,235,0.22) 32px)',
              backgroundAttachment: 'local',
              backgroundPositionY: '14px',
            }}
          />
        )}
      </main>
    </div>
  )
}

function BackIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
