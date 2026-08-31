import { useEffect, useRef, useState } from 'react'
import { listMessages, sendMessage, subscribeToThread, markThreadRead } from '../lib/messages'

export default function ChatThread({ memberId, currentUserId, title }) {
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listMessages(memberId).then(({ data }) => {
      if (active) {
        setMessages(data ?? [])
        setLoading(false)
        markThreadRead(memberId, currentUserId)
      }
    })

    const unsubscribe = subscribeToThread(memberId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      markThreadRead(memberId, currentUserId)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [memberId, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    const text = body.trim()
    setBody('')
    const { data, error } = await sendMessage({ memberId, senderId: currentUserId, body: text })
    setSending(false)
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-brand-purple-100">
      {title}

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading && <p className="text-sm text-brand-purple-900/50">در حال بارگذاری…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-center text-sm text-brand-purple-900/50">هنوز پیامی رد و بدل نشده است.</p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId
          return (
            <div key={m.id} className={'flex ' + (mine ? 'justify-start' : 'justify-end')}>
              <div
                className={
                  'max-w-[75%] rounded-2xl px-4 py-2 text-sm ' +
                  (mine ? 'bg-brand-purple-900 text-white' : 'bg-white text-brand-purple-900 shadow-sm')
                }
              >
                {m.body}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-brand-purple-900/10 bg-white p-3">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="پیام خود را بنویسید…"
          className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-right outline-none focus:border-brand-purple-700"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-xl bg-brand-purple-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          ارسال
        </button>
      </form>
    </div>
  )
}
