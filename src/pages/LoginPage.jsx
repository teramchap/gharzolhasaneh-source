import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!mobile.trim() || !password) {
      setError('شماره موبایل و رمز عبور را وارد کنید.')
      return
    }

    setSubmitting(true)
    const { data, error: authError } = await login(mobile, password)

    if (authError) {
      setSubmitting(false)
      setError('شماره موبایل یا رمز عبور اشتباه است.')
      return
    }

    // Look up the role right away so we land on the correct dashboard
    // instead of waiting for the AuthContext's async profile fetch.
    const userId = data?.user?.id
    let role = 'member'
    if (userId) {
      const { data: userRow } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      if (userRow?.role) role = userRow.role
    }

    setSubmitting(false)
    navigate(role === 'admin' ? '/admin' : '/', { replace: true })
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-brand-purple-900 p-4 relative overflow-hidden">
      {/* decorative background dots, echoing the mock */}
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute right-6 top-8 grid grid-cols-5 gap-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <span key={i} className="block h-1.5 w-1.5 rounded-full bg-white" />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-brand-purple-800/60" />

      <div className="relative w-full max-w-sm rounded-3xl bg-brand-yellow-300 p-6 pt-8 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="لوگوی صندوق قرض‌الحسنه"
            className="h-28 w-28 rounded-2xl object-contain"
          />
        </div>

        <h1 className="mt-5 text-center text-2xl font-extrabold text-brand-purple-900">
          صندوق قرض‌الحسنه
        </h1>
        <p className="mt-1 text-center text-sm text-brand-purple-800/80">
          مدیریت هوشمند، اعتماد ماندگار
        </p>

        <div className="my-4 flex items-center justify-center">
          <span className="h-px w-16 bg-brand-purple-800/30" />
          <span className="mx-2 h-1.5 w-1.5 rotate-45 bg-brand-purple-800/50" />
          <span className="h-px w-16 bg-brand-purple-800/30" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="mobile" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-purple-900">
              <PhoneIcon className="h-4 w-4" />
              شماره موبایل
            </label>
            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="مثال: 09123456789"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full rounded-xl border-0 bg-white px-4 py-3 text-right text-brand-purple-900 placeholder:text-gray-400 shadow-sm outline-none ring-1 ring-transparent focus:ring-2 focus:ring-brand-purple-700"
              dir="ltr"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-purple-900">
              <LockIcon className="h-4 w-4" />
              رمز عبور
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="رمز عبور خود را وارد کنید"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border-0 bg-white px-4 py-3 pl-11 text-right text-brand-purple-900 placeholder:text-gray-400 shadow-sm outline-none ring-1 ring-transparent focus:ring-2 focus:ring-brand-purple-700"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-purple-700"
                aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
              >
                <EyeIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-brand-purple-900">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-purple-800 focus:ring-brand-purple-700"
            />
            مرا به خاطر بسپار
          </label>

          {error && (
            <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-purple-900 py-3.5 font-bold text-white shadow-md transition hover:bg-brand-purple-800 disabled:opacity-60"
          >
            {submitting ? 'در حال ورود…' : 'ورود به حساب کاربری'}
            <LoginIcon className="h-5 w-5" />
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-brand-purple-800/20" />
          <span className="text-xs text-brand-purple-800/60">یا</span>
          <span className="h-px flex-1 bg-brand-purple-800/20" />
        </div>

        <button
          type="button"
          onClick={() => setShowForgot(true)}
          className="mx-auto flex items-center gap-1.5 text-sm font-medium text-brand-purple-900 hover:underline"
        >
          <LockIcon className="h-4 w-4" />
          رمز عبور خود را فراموش کرده‌اید؟
        </button>
      </div>

      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowForgot(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-bold text-brand-purple-900">فراموشی رمز عبور</h2>
            <p className="mt-2 text-sm text-brand-purple-900/70">
              برای بازیابی رمز عبور، با مدیر صندوق تماس بگیرید تا رمز جدیدی برایتان تنظیم کند.
            </p>
            <button
              onClick={() => setShowForgot(false)}
              className="mt-4 w-full rounded-xl bg-brand-purple-900 py-3 font-bold text-white"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}

      <footer className="absolute bottom-0 left-0 right-0 bg-brand-purple-950/80 py-3 text-center text-xs text-white/80">
        <p>تمامی حقوق محفوظ است © ۱۴۰۴</p>
        <p className="mt-0.5 text-white/50">نسخه ۱.۰.۰</p>
      </footer>
    </div>
  )
}

function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function LockIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function LoginIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  )
}
