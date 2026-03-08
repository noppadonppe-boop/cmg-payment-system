import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Shield, CreditCard,
  GitPullRequest, BarChart3, ChevronLeft, ChevronRight,
  Building2, Users
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { clsx } from 'clsx'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/dashboard',
    roles: ['SuperAdmin', 'Admin', 'MD', 'GM', 'CD', 'PM', 'QsEng', 'AccCMG'],
  },
  {
    label: 'Projects',
    icon: FolderOpen,
    path: '/projects',
    roles: ['SuperAdmin', 'Admin', 'MD', 'GM', 'CD', 'PM', 'QsEng', 'AccCMG'],
  },
  {
    label: 'Bank Bonds',
    icon: Shield,
    path: '/bonds',
    roles: ['SuperAdmin', 'Admin', 'MD', 'GM', 'CD', 'PM', 'AccCMG'],
  },
  {
    label: 'Payments',
    icon: CreditCard,
    path: '/payments',
    roles: ['SuperAdmin', 'Admin', 'MD', 'GM', 'CD', 'PM', 'QsEng', 'AccCMG'],
  },
  {
    label: 'Change Orders',
    icon: GitPullRequest,
    path: '/change-orders',
    roles: ['SuperAdmin', 'Admin', 'MD', 'GM', 'CD', 'PM', 'QsEng', 'AccCMG'],
  },
  {
    label: 'Reports',
    icon: BarChart3,
    path: '/reports',
    roles: ['SuperAdmin', 'Admin', 'MD', 'GM', 'CD', 'PM', 'QsEng', 'AccCMG'],
  },
  {
    label: 'User Mgmt',
    icon: Users,
    path: '/admin',
    roles: ['SuperAdmin', 'Admin'],
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { userProfile } = useAuth()
  const location = useLocation()

  const userRoles = userProfile?.role ?? []
  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.some(r => userRoles.includes(r))
  )

  return (
    <aside
      className={clsx(
        'flex flex-col bg-slate-900 text-slate-100 transition-all duration-300 ease-in-out shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand */}
      <div className={clsx(
        'flex items-center gap-3 px-4 py-5 border-b border-slate-700/60',
        collapsed && 'justify-center px-0'
      )}>
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
          <Building2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">CMG</p>
            <p className="text-[10px] text-slate-400 leading-tight truncate">Payment System</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-0.5 px-2">
          {visibleItems.map(({ label, icon: Icon, path }) => {
            const isActive = path === '/dashboard'
              ? location.pathname === '/dashboard' || location.pathname === '/'
              : location.pathname.startsWith(path)

            return (
              <li key={path}>
                <NavLink
                  to={path}
                  title={collapsed ? label : undefined}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                  )}
                >
                  <Icon size={18} className={clsx('shrink-0', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200')} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-slate-700/60 p-2">
        <button
          onClick={onToggle}
          className={clsx(
            'flex items-center justify-center w-full rounded-lg py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors',
            collapsed ? 'px-0' : 'gap-2 px-3'
          )}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
