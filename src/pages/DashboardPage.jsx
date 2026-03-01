import { useNavigate } from 'react-router-dom'
import {
  FolderOpen, CreditCard, GitPullRequest, Shield,
  TrendingUp, CheckCircle2, Clock, AlertCircle, ArrowRight
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  if (val >= 1_000_000) return `฿${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `฿${(val / 1_000).toFixed(0)}K`
  return `฿${val}`
}

const STATUS_COLORS = {
  'Received':    { dot: 'bg-emerald-500', badge: 'emerald', label: 'Received' },
  'Submitted':   { dot: 'bg-blue-500',    badge: 'blue',    label: 'Submitted' },
  'In Progress': { dot: 'bg-amber-500',   badge: 'amber',   label: 'In Progress' },
  'Rejected':    { dot: 'bg-rose-500',    badge: 'rose',    label: 'Rejected' },
}

export default function DashboardPage() {
  const { projects, payments, cors, coas, bondStatuses } = useData()
  const { currentUser, hasProjectAccess } = useAuth()
  const navigate = useNavigate()

  const visibleProjects = projects.filter(p => hasProjectAccess(p.id))
  const visiblePayments = payments.filter(p => hasProjectAccess(p.projectId))
  const visibleCORs     = cors.filter(c => hasProjectAccess(c.projectId))

  const totalContractValue = visibleProjects.reduce((s, p) => s + (p.contractValue || 0), 0)
  const totalReceived      = visiblePayments.filter(p => p.status === 'Received').reduce((s, p) => s + (p.balanceValue || 0), 0)
  const pendingPayments    = visiblePayments.filter(p => p.status !== 'Received').length
  const openCORs           = visibleCORs.filter(c => !c.convertedToCOA).length

  const recentPayments = [...visiblePayments]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Welcome back, <span className="text-blue-600">{currentUser.name.split(' ')[0]}</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Data
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Active Projects',
            value: visibleProjects.filter(p => p.status === 'Active').length,
            sub: `of ${visibleProjects.length} total`,
            icon: FolderOpen,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            iconColor: 'text-blue-500',
            onClick: () => navigate('/projects'),
          },
          {
            label: 'Total Contract Value',
            value: fmtCurrency(totalContractValue),
            sub: `${visibleProjects.length} projects`,
            icon: TrendingUp,
            color: 'text-slate-800',
            bg: 'bg-slate-100',
            iconColor: 'text-slate-500',
            onClick: () => navigate('/projects'),
          },
          {
            label: 'Payments Received',
            value: fmtCurrency(totalReceived),
            sub: `${pendingPayments} pending`,
            icon: CheckCircle2,
            color: 'text-emerald-700',
            bg: 'bg-emerald-50',
            iconColor: 'text-emerald-500',
            onClick: () => navigate('/payments'),
          },
          {
            label: 'Open Change Orders',
            value: openCORs,
            sub: `${visibleCORs.length} total CORs`,
            icon: GitPullRequest,
            color: 'text-amber-700',
            bg: 'bg-amber-50',
            iconColor: 'text-amber-500',
            onClick: () => navigate('/change-orders'),
          },
        ].map(kpi => {
          const Icon = kpi.icon
          return (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 text-left hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className={clsx('p-2 rounded-lg', kpi.bg)}>
                  <Icon size={18} className={kpi.iconColor} />
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400 mt-1 transition-colors" />
              </div>
              <p className={clsx('text-2xl font-bold mt-3', kpi.color)}>{kpi.value}</p>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">{kpi.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
            </button>
          )
        })}
      </div>

      {/* Content Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Payments */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Recent Payments</h3>
                <p className="text-xs text-slate-400">Latest payment claims across projects</p>
              </div>
              <button onClick={() => navigate('/payments')} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {recentPayments.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm">No payments yet</div>
              ) : recentPayments.map(pay => {
                const project = projects.find(p => p.id === pay.projectId)
                const sc = STATUS_COLORS[pay.status] ?? STATUS_COLORS['In Progress']
                return (
                  <div key={pay.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={clsx('w-2 h-2 rounded-full shrink-0', sc.dot)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{pay.paymentNo}</p>
                      <p className="text-xs text-slate-400 truncate">{project?.name ?? '—'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-800">฿{new Intl.NumberFormat('en-US').format(pay.balanceValue || 0)}</p>
                      <Badge variant={sc.badge} className="mt-0.5">{sc.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Project Overview */}
        <div className="space-y-4">
          <Card padding={false}>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 text-sm">Projects Overview</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {visibleProjects.slice(0, 4).map(p => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">{p.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{p.clientName}</p>
                  </div>
                  <Badge variant="emerald" className="shrink-0">{p.status}</Badge>
                </button>
              ))}
              {visibleProjects.length > 4 && (
                <button
                  onClick={() => navigate('/projects')}
                  className="w-full px-5 py-3 text-xs text-blue-600 hover:text-blue-800 font-medium text-center hover:bg-slate-50 transition-colors"
                >
                  View all {visibleProjects.length} projects →
                </button>
              )}
            </div>
          </Card>

          {/* Bond Status Summary */}
          <Card padding={false}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Bond Status</h3>
              <button onClick={() => navigate('/bonds')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">View</button>
            </div>
            <div className="p-4 space-y-2.5">
              {bondStatuses.filter(b => hasProjectAccess(b.projectId)).map(bs => {
                const proj = projects.find(p => p.id === bs.projectId)
                const allSubmitted = [bs.advanceBond, bs.performanceBond, bs.warrantyBond]
                  .filter(b => b.status !== 'N/A')
                  .every(b => b.status === 'Submitted')
                return (
                  <div key={bs.id} className="flex items-center gap-2.5">
                    <div className={clsx('w-2 h-2 rounded-full shrink-0', allSubmitted ? 'bg-emerald-500' : 'bg-amber-400')} />
                    <span className="text-xs text-slate-600 truncate flex-1">{proj?.name ?? '—'}</span>
                    <Badge variant={allSubmitted ? 'emerald' : 'amber'} className="shrink-0 text-[10px]">
                      {allSubmitted ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
