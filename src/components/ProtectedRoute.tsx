import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'

interface Props {
  children: ReactNode
  requireApproved?: boolean
  requireRoles?: UserRole[]
}

function Spinner() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-slate-600 font-medium text-sm">กำลังโหลด…</span>
      </div>
    </div>
  )
}

export default function ProtectedRoute({
  children,
  requireApproved = true,
  requireRoles,
}: Props) {
  const { firebaseUser, userProfile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!firebaseUser) return <Navigate to="/login" state={{ from: location }} replace />
  if (!userProfile) return <Spinner />
  if (requireApproved && userProfile.status === 'pending') return <Navigate to="/pending" replace />
  if (requireApproved && userProfile.status === 'rejected') return <Navigate to="/login" replace />
  if (requireRoles && !userProfile.role.some((r) => requireRoles.includes(r))) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
