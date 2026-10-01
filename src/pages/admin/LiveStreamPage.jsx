import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLiveStream, setLiveStream } from '../../lib/liveStream'

export default function LiveStreamPage() {
  const [url, setUrl] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getLiveStream().then(({ data }) => {
      setUrl(data?.url ?? '')
      setIsActive(data?.is_active ?? false)
      setLoading(false)
    })
  }, [])

  async function handleSave(nextActive) {
    if (nextActive && !url.trim()) {
      setMessage('اول لینک embed آپارات را وارد کنید.')
      return
    }
    setSaving(true)
    setMessage('')
    const { error } = await setLiveStream(url.trim(), nextActive)
    setIsActive(nextActive)
    setSaving(false)
    setMessage(error ? 'خطا در ذخیره‌سازی.' : nextActive ? 'پخش زنده فعال شد و برای اعضا نمایش داده می‌شود.' : 'پخش زنده غیرفعال شد.')
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">پخش زنده‌ی قرعه‌کشی</span>
      </header>

      <main className="space-y-4 p-4">
        {loading ? (
          <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>
        ) : (
          <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">لینک embed آپارات</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                dir="ltr"
                placeholder="https://www.aparat.com/video/video/embed/videohash/xxxxxxx/vt/frame"
                className="w-full rounded-xl border border-gray-200 px-3 py-3 text-left text-sm outline-none focus:border-brand-purple-700"
              />
              <p className="mt-1 text-xs text-brand-purple-900/50">
                تو صفحه‌ی ویدیو/لایو آپارات، روی «اشتراک‌گذاری» → «دریافت کد» بزنید؛ از داخل کدی که می‌ده، فقط آدرس داخل
                src="…" را اینجا بچسبانید.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-brand-purple-100 px-3 py-2.5">
              <span className="text-sm font-semibold text-brand-purple-900">
                وضعیت فعلی: {isActive ? '🔴 فعال (برای اعضا نمایش داده می‌شود)' : 'غیرفعال'}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="flex-1 rounded-xl bg-brand-purple-900 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? 'در حال ذخیره…' : 'شروع پخش زنده'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="flex-1 rounded-xl bg-brand-purple-100 py-3 text-sm font-bold text-brand-purple-900 disabled:opacity-60"
              >
                پایان پخش
              </button>
            </div>

            {message && <p className="text-xs text-brand-purple-900/70">{message}</p>}

            {isActive && url && (
              <div className="overflow-hidden rounded-xl ring-1 ring-brand-purple-900/10">
                <iframe
                  src={url}
                  allowFullScreen
                  className="aspect-video w-full"
                  title="پیش‌نمایش پخش زنده"
                />
              </div>
            )}
          </div>
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
