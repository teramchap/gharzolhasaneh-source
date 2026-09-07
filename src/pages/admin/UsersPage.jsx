import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMembers, createMember, updateMember, getLastLogins } from '../../lib/members'
import { toJalali } from '../../lib/format'

export default function UsersPage() {
  const [members, setMembers] = useState([])
  const [lastLogins, setLastLogins] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editMember, setEditMember] = useState(null)
  const [search, setSearch] = useState('')

  async function refresh() {
    setLoading(true)
    const [{ data, error }, { data: logins }] = await Promise.all([listMembers(), getLastLogins()])
    if (!error) setMembers(data)
    if (logins) setLastLogins(logins)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  const filteredMembers = members.filter(
    (m) => m.full_name.includes(search) || (m.mobile ?? '').includes(search)
  )

  return (
    <div className="min-h-dvh bg-brand-purple-100">
      <header className="flex items-center justify-between bg-brand-purple-900 px-4 py-4 text-white">
        <div className="flex items-center gap-2">
          <Link to="/admin" className="text-white/80 hover:text-white">
            <BackIcon className="h-5 w-5" />
          </Link>
          <span className="font-bold">کاربران</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-yellow-300 px-3 py-1.5 text-sm font-bold text-brand-purple-900"
        >
          + عضو جدید
        </button>
      </header>

      <main className="p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام یا شماره موبایل…"
          className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-right outline-none focus:border-brand-purple-700"
        />

        {loading && <p className="text-sm text-brand-purple-900/60">در حال بارگذاری…</p>}

        {!loading && filteredMembers.length === 0 && (
          <p className="text-sm text-brand-purple-900/60">
            {members.length === 0 ? 'هنوز هیچ عضوی ثبت نشده است.' : 'موردی یافت نشد.'}
          </p>
        )}

        <div className="space-y-2">
          {filteredMembers.map((m) => {
            const lastLogin = lastLogins[m.id]
            return (
              <button
                key={m.id}
                onClick={() => setEditMember(m)}
                className="flex w-full items-center justify-between rounded-2xl bg-white p-4 text-right shadow-sm ring-1 ring-brand-purple-900/5 transition hover:ring-brand-purple-700"
              >
                <div>
                  <p className="font-bold text-brand-purple-900">{m.full_name}</p>
                  <p className="mt-0.5 text-xs text-brand-purple-900/50">
                    آخرین ورود: {lastLogin ? toJalali(lastLogin) : 'هنوز وارد نشده'}
                  </p>
                </div>
                {m.rubika_number && (
                  <span className="rounded-full bg-brand-purple-100 px-2.5 py-1 text-xs text-brand-purple-900">
                    روبیکا: {m.rubika_number}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </main>

      {showForm && (
        <NewMemberModal
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}

      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => {
            setEditMember(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function NewMemberModal({ onClose, onCreated }) {
  const [fullName, setFullName] = useState('')
  const [mobile, setMobile] = useState('')
  const [rubika, setRubika] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) return setError('نام و نام خانوادگی را وارد کنید.')
    if (!mobile.trim()) return setError('شماره موبایل را وارد کنید.')
    if (!password || password.length < 6) return setError('رمز عبور باید حداقل ۶ کاراکتر باشد.')

    setSubmitting(true)
    const { error: createError } = await createMember({
      full_name: fullName,
      mobile,
      rubika_number: rubika,
      password,
    })
    setSubmitting(false)

    if (createError) {
      setError(createError.message || 'خطا در ثبت عضو. دوباره تلاش کنید.')
      return
    }
    onCreated()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-brand-purple-900">عضو جدید</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              نام و نام خانوادگی
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="مثال: علی محمدی"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">شماره موبایل</label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="مثال: 09123456789"
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              شماره روبیکا <span className="font-normal text-brand-purple-900/50">(اختیاری)</span>
            </label>
            <input
              value={rubika}
              onChange={(e) => setRubika(e.target.value)}
              placeholder="مثال: 09123456789@"
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              رمز عبور اولیه
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="یک رمز ساده برای عضو انتخاب کنید"
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-purple-900 py-3 font-bold text-white disabled:opacity-60"
            >
              {submitting ? 'در حال ثبت…' : 'ثبت عضو'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditMemberModal({ member, onClose, onSaved }) {
  const [fullName, setFullName] = useState(member.full_name)
  const [mobile, setMobile] = useState(member.mobile)
  const [rubika, setRubika] = useState(member.rubika_number ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!fullName.trim()) return setError('نام و نام خانوادگی را وارد کنید.')
    if (!mobile.trim()) return setError('شماره موبایل را وارد کنید.')
    if (newPassword && newPassword.length < 6) return setError('رمز جدید باید حداقل ۶ کاراکتر باشد.')

    setSubmitting(true)
    const { error: updateError } = await updateMember({
      memberId: member.id,
      full_name: fullName,
      mobile,
      rubika_number: rubika,
      newPassword: newPassword || undefined,
    })
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message || 'خطا در ذخیره تغییرات.')
      return
    }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-brand-purple-900">ویرایش عضو</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              نام و نام خانوادگی
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">شماره موبایل</label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
            <p className="mt-1 text-xs text-brand-purple-900/50">با تغییر شماره، ورود عضو هم با شماره جدید خواهد بود.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              شماره روبیکا <span className="font-normal text-brand-purple-900/50">(اختیاری)</span>
            </label>
            <input
              value={rubika}
              onChange={(e) => setRubika(e.target.value)}
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-brand-purple-900">
              رمز عبور جدید <span className="font-normal text-brand-purple-900/50">(اختیاری — برای بازیابی رمز فراموش‌شده)</span>
            </label>
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="خالی بگذارید تا تغییر نکند"
              dir="ltr"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-brand-purple-700"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-brand-red-100 px-3 py-2 text-sm text-brand-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-brand-purple-900"
            >
              انصراف
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
      </div>
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
