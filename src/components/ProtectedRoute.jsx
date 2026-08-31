import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getBlockingWinner } from '../lib/winners'

export default function ProtectedRoute({ role, children }) {
  const { isLoading, isAuthenticated, profile } = useAuth()
  const location = useLocation()
  const [blockingWinner, setBlockingWinner] = useState(undefined) // undefined = checking

  useEffect(() => {
    if (profile?.role === 'member' && profile?.id) {
      getBlockingWinner(profile.id).then(({ data }) => setBlockingWinner(data ?? null))
    } else {
      setBlockingWinner(null)
    }
    // Re-check on every navigation attempt too, not just when profile
    // loads — otherwise a stale "blocked" flag can outlive the moment
    // the member actually confirms and the winner record is no longer
    // blocking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, profile?.role, location.pathname])

  if (isLoading || blockingWinner === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-purple-900 text-white">
        در حال بارگذاری…
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (role && profile && profile.role !== role) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/'} replace />
  }

  // Member must confirm they received their winning payout before doing
  // anything else in the app.
  if (blockingWinner && location.pathname !== `/member/winner/${blockingWinner.id}`) {
    return <Navigate to={`/member/winner/${blockingWinner.id}`} replace />
  }

  return children
}
