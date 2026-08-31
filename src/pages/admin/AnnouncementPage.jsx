import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnnouncement, getAnnouncementImageUrl, updateAnnouncement, clearAnnouncement } from '../../lib/announcement'
import ImageUploadInput from '../../components/ImageUploadInput'

export default function AnnouncementPage() {
  const [current, setCurrent] = useState(null)
  const [message, setMessage] = useState('')
  const [image, setImage] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function refresh() {
    setLoading(true)
    const { data } = await getAnnouncement()
    setCurrent(data)
    setMessage(data?.message ?? '')
    setImage(null)
    setRemoveImage(false)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSubmitting(true)
    const { error: err } = await updateAnnouncement({
      message: message.trim() || null,
      imageFile: image,
      removeImage,
    })
    setSubmitting(false)
    if (err) return setError('خطا در ذخیره.')
    setSuccess(true)
    refresh()
  }

  async function handleClear() {
    if (!confirm('بنر کاملاً حذف شود؟')) return
    setSubmitting(true)
    await clearAnnouncement()
    setSubmitting(false)
    refresh()
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/admin" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">اعلان صفحه اعضا</span>
      </header>

      <main className="p-4">
        {loading ? (
          <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>
        ) : (
          <>
            {(current?.image_path || current?.message) && (
              <div className="mb-4">
                <p className="mb-2 text-sm font-bold text-brand-purple-900">پیش‌نمایش فعلی:</p>
                <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-brand-purple-900/5">
                  {current.image_path && (
                    <img src={getAnnouncementImageUrl(current.image_path)} alt="اعلان" className="w-full object-cover" />
                  )}
                  {current.message && <p className="p-4 text-sm text-brand-purple-900">{current.message}</p>}
                </div>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-purple-900">متن اعلان</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  placeholder="مثلاً: عید نوروز مبارک! جدول اقساط ماه بعد به‌زودی اعلام می‌شود."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-brand-purple-900">تصویر (اختیاری)</label>
                <ImageUploadInput files={image ? [image] : []} onChange={(files) => { setImage(files[0] ?? null); setRemoveImage(false) }} multiple={false} />
                {current?.image_path && !image && (
                  <label className="mt-2 flex items-center gap-2 text-xs text-brand-purple-900">
                    <input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />
                    تصویر فعلی حذف شود
                  </label>
                )}
              </div>

              {error && <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>}
              {success && <p className="rounded-lg bg-brand-green-100 px-3 py-2 text-sm text-brand-green-600">ذخیره شد ✓</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={submitting}
                  className="flex-1 rounded-xl border border-brand-red-600 py-3 font-semibold text-brand-red-600 disabled:opacity-60"
                >
                  حذف کامل بنر
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
                >
                  {submitting ? 'در حال ذخیره…' : 'ذخیره'}
                </button>
              </div>
            </form>
          </>
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
