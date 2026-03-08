import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, Shield, Clock } from 'lucide-react'
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext'
import { logout } from '../lib/authService'
import { clsx } from 'clsx'

export { ROLE_PERMISSIONS }

const ROLE_BADGE_COLORS = {
  SuperAdmin: 'bg-purple-100 text-purple-700',
  Admin:      'bg-indigo-100 text-indigo-700',
  MD:         'bg-purple-100 text-purple-700',
  GM:         'bg-indigo-100 text-indigo-700',
  CD:         'bg-blue-100 text-blue-700',
  PM:         'bg-emerald-100 text-emerald-700',
  QsEng:      'bg-amber-100 text-amber-700',
  AccCMG:     'bg-rose-100 text-rose-700',
}

const PAGE_TITLES = {
  '/':              'Dashboard',
  '/dashboard':     'Dashboard',
  '/projects':      'Projects',
  '/projects/new':  'New Project',
  '/bonds':         'Bank Bond Status',
  '/payments':      'Payment Tracking',
  '/change-orders': 'Change Orders',
  '/reports':       'Reports & Analytics',
  '/admin':         'User Management',
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/projects/') && pathname.endsWith('/edit')) return 'Edit Project'
  if (pathname.startsWith('/projects/')) return 'Project Details'
  return PAGE_TITLES[pathname] ?? 'CMG Payment System'
}

export default function Header() {
  const { currentUser, userProfile, sessionMinutesLeft } = useAuth()
  const [open, setOpen] = useState(false)
  const location  = useLocation()
  const navigate  = useNavigate()
  const title     = getPageTitle(location.pathname)

  const primaryRole = userProfile?.role?.[0] ?? 'QsEng'
  const badgeColor  = ROLE_BADGE_COLORS[primaryRole] ?? 'bg-slate-100 text-slate-600'
  const avatarText  = currentUser?.avatar ?? '?'
  const displayName = currentUser?.name ?? userProfile?.email ?? '—'

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  const sessionWarn = sessionMinutesLeft > 0 && sessionMinutesLeft <= 10

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        <p className="text-xs text-slate-400">CMG Construction Progress Payment System</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Session countdown */}
        {sessionWarn && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-600 text-xs font-medium">
            <Clock size={12} />
            เซสชันหมดใน {sessionMinutesLeft} นาที
          </div>
        )}

        {/* Admin shortcut */}
        {userProfile?.role?.some((r) => ['SuperAdmin', 'Admin'].includes(r)) && (
          <button
            onClick={() => navigate('/admin')}
            title="User Management"
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 transition text-slate-400 hover:text-purple-600"
          >
            <Shield size={14} />
          </button>
        )}

        {/* Profile dropdown */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-sm"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
              {avatarText}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-slate-700 leading-tight">{displayName}</p>
              <p className="text-xs text-slate-400 leading-tight">{primaryRole}</p>
            </div>
            <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-md hidden sm:inline-block', badgeColor)}>
              {primaryRole}
            </span>
            <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', open && 'rotate-180')} />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                <p className="text-xs text-slate-500 mt-0.5">{userProfile?.email}</p>
                {userProfile?.position && (
                  <p className="text-xs text-slate-400 mt-0.5">{userProfile.position}</p>
                )}
                {/* All roles */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(userProfile?.role ?? [primaryRole]).map((r) => (
                    <span
                      key={r}
                      className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', ROLE_BADGE_COLORS[r] ?? 'bg-slate-100 text-slate-600')}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Session info */}
              {sessionMinutesLeft > 0 && (
                <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={12} className={sessionWarn ? 'text-amber-500' : 'text-slate-400'} />
                  <span>เซสชันหมดใน <strong className={sessionWarn ? 'text-amber-600' : ''}>{sessionMinutesLeft}</strong> นาที</span>
                </div>
              )}

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium"
              >
                <LogOut size={14} />
                ออกจากระบบ
              </button>
            </div>
          )}

          {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
        </div>
      </div>
    </header>
  )
}
