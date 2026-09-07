import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) return setError('رمز جدید باید حداقل ۶ کاراکتر باشد.')
    if (newPassword !== confirmPassword) return setError('تکرار رمز با رمز جدید یکسان نیست.')

    setSubmitting(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setSubmitting(false)

    if (err) return setError('خطا در تغییر رمز. دوباره تلاش کنید.')
    setSuccess(true)
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center gap-2 bg-brand-purple-900 px-4 py-4 text-white">
        <Link to="/" className="text-white/80 hover:text-white">
          <BackIcon className="h-5 w-5" />
        </Link>
        <span className="font-bold">تغییر رمز عبور</span>
      </header>

      <main className="p-4">
        {success ? (
          <p className="rounded-2xl bg-brand-green-100 p-4 text-center text-sm font-bold text-brand-green-600">
            رمز عبور با موفقیت تغییر کرد ✓
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-brand-purple-900/5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">رمز عبور جدید</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-purple-900">تکرار رمز جدید</label>
              <input
                type="text"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
              />
            </div>
            {error && <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'در حال ذخیره…' : 'تغییر رمز'}
            </button>
          </form>
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
