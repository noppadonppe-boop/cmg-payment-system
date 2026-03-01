import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChevronDown, User } from 'lucide-react'
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext'
import { clsx } from 'clsx'

const ROLE_BADGE_COLORS = {
  MD:     'bg-purple-100 text-purple-700',
  GM:     'bg-indigo-100 text-indigo-700',
  CD:     'bg-blue-100 text-blue-700',
  PM:     'bg-emerald-100 text-emerald-700',
  QsEng:  'bg-amber-100 text-amber-700',
  AccCMG: 'bg-rose-100 text-rose-700',
}

const PAGE_TITLES = {
  '/':              'Dashboard',
  '/projects':      'Projects',
  '/projects/new':  'New Project',
  '/bonds':         'Bank Bond Status',
  '/payments':      'Payment Tracking',
  '/change-orders': 'Change Orders',
  '/reports':       'Reports & Analytics',
}

function getPageTitle(pathname) {
  if (pathname.startsWith('/projects/') && pathname.endsWith('/edit')) return 'Edit Project'
  if (pathname.startsWith('/projects/')) return 'Project Details'
  return PAGE_TITLES[pathname] ?? 'CMG Payment System'
}

export default function Header() {
  const { currentUser, setCurrentUser, USERS } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const location = useLocation()

  const title = getPageTitle(location.pathname)

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 shrink-0">
      {/* Page Title */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
        <p className="text-xs text-slate-400">CMG Construction Progress Payment System</p>
      </div>

      {/* Switch User */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="flex items-center gap-3 pl-3 pr-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all text-sm"
        >
          {/* Avatar */}
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">
            {currentUser.avatar}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-slate-700 leading-tight">{currentUser.name}</p>
            <p className="text-xs text-slate-400 leading-tight">{currentUser.role}</p>
          </div>
          <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-md hidden sm:inline-block', ROLE_BADGE_COLORS[currentUser.role])}>
            {currentUser.role}
          </span>
          <ChevronDown size={14} className={clsx('text-slate-400 transition-transform', dropdownOpen && 'rotate-180')} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Switch User (Testing)</p>
            </div>
            <ul className="py-1 max-h-80 overflow-y-auto">
              {USERS.map(user => (
                <li key={user.id}>
                  <button
                    onClick={() => { setCurrentUser(user); setDropdownOpen(false) }}
                    className={clsx(
                      'flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors',
                      user.id === currentUser.id && 'bg-blue-50'
                    )}
                  >
                    <div className={clsx(
                      'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0',
                      user.id === currentUser.id ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    )}>
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-medium truncate', user.id === currentUser.id ? 'text-blue-700' : 'text-slate-700')}>
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-400">{user.role}</p>
                    </div>
                    <span className={clsx('text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0', ROLE_BADGE_COLORS[user.role])}>
                      {user.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Backdrop */}
        {dropdownOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
        )}
      </div>
    </header>
  )
}
