import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

// Normalizes a Persian/Iranian mobile number to local format starting with 0
// (e.g. "912..." or "+98912..." -> "0912..."). Accepts Persian/Arabic-Indic
// digits too (۰۹۱۲... works the same as 0912...).
export function normalizeMobile(input) {
  const englishDigits = String(input ?? '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
  const digits = englishDigits.replace(/\D/g, '')
  if (digits.startsWith('98')) return '0' + digits.slice(2)
  if (digits.startsWith('0')) return digits
  return '0' + digits
}

// Supabase's email/password auth is used under the hood (no SMS provider
// required). The mobile number is mapped to an internal, never-shown email
// like "09123456789@members.gharzolhasaneh.internal".
export function mobileToInternalEmail(mobile) {
  return `${normalizeMobile(mobile)}@members.gharzolhasaneh.internal`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading, null = signed out
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) {
      setProfile(null)
      return
    }
    supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [session])

  async function login(mobile, password) {
    const email = mobileToInternalEmail(mobile)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const value = {
    session,
    profile, // { id, full_name, mobile, rubika_number, role, note, ... }
    isLoading: session === undefined,
    isAuthenticated: !!session,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود')
  return ctx
}
