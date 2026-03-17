import { useState } from 'react'
import {
  Plus, ChevronDown, GitPullRequest, CheckCircle2, Clock,
  AlertCircle, XCircle, ArrowRight, FileText, User,
  Calendar, Banknote, Eye, GitMerge, CreditCard, Trash2
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { clsx } from 'clsx'
import CORCreateModal from '../components/changeorders/CORCreateModal'
import CORDetailModal from '../components/changeorders/CORDetailModal'
import ConvertToCOAModal from '../components/changeorders/ConvertToCOAModal'
import COAPaymentModal from '../components/changeorders/COAPaymentModal'

export const COR_STATUS_CONFIG = {
  'Prepare doc': { badge: 'slate',   icon: Clock,        label: 'Prepare Doc'  },
  'Submitted':   { badge: 'blue',    icon: ArrowRight,   label: 'Submitted'    },
  'Rejected':    { badge: 'rose',    icon: XCircle,      label: 'Rejected'     },
}

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ChangeOrdersPage() {
  const { projects, cors, coas, payments, deleteCOR, deleteCOA } = useData()
  const { currentUser, can, hasProjectAccess, USERS } = useAuth()
  const isSuperAdmin = currentUser?.role === 'SuperAdmin'

  async function handleDeleteCOR(cor) {
    if (!window.confirm(`ยืนยันการลบ COR "${cor.corNo}"?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return
    await deleteCOR(cor.id)
  }

  async function handleDeleteCOA(coa) {
    if (!window.confirm(`ยืนยันการลบ COA "${coa.coaNo}"?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return
    await deleteCOA(coa.id)
  }

  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [tab, setTab]                 = useState('cor')  // 'cor' | 'coa'
  const [createCOROpen, setCreateCOROpen]   = useState(false)
  const [detailCOR, setDetailCOR]           = useState(null)
  const [convertCOR, setConvertCOR]         = useState(null)
  const [coaPaymentCOA, setCoaPaymentCOA]   = useState(null)

  const isPM    = can('canApprovePayments')
  const isQsEng = can('canCreateClaims')

  const visibleProjects = projects.filter(p => hasProjectAccess(p.id))

  const visibleCORs = cors.filter(c => {
    if (!hasProjectAccess(c.projectId)) return false
    if (selectedProjectId !== 'all' && c.projectId !== selectedProjectId) return false
    return true
  })

  const visibleCOAs = coas.filter(c => {
    if (!hasProjectAccess(c.projectId)) return false
    if (selectedProjectId !== 'all' && c.projectId !== selectedProjectId) return false
    return true
  })

  // Stats
  const allCORs = cors.filter(c => hasProjectAccess(c.projectId))
  const allCOAs = coas.filter(c => hasProjectAccess(c.projectId))
  const stats = {
    totalCOR:   allCORs.length,
    prepDoc:    allCORs.filter(c => c.status === 'Prepare doc').length,
    submitted:  allCORs.filter(c => c.status === 'Submitted').length,
    converted:  allCORs.filter(c => c.convertedToCOA).length,
    totalCOA:   allCOAs.length,
    totalCOAValue: allCOAs.reduce((s, c) => s + (c.value || 0), 0),
  }

  // Get COA payment summary
  const getCOAPayment = (coaId) =>
    payments.filter(p => p.coaId === coaId && p.type === 'coa')

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total CORs',    value: stats.totalCOR,   color: 'text-slate-800',   bg: 'bg-slate-100'  },
          { label: 'Prepare Doc',   value: stats.prepDoc,    color: 'text-slate-600',   bg: 'bg-slate-50'   },
          { label: 'Submitted',     value: stats.submitted,  color: 'text-blue-700',    bg: 'bg-blue-50'    },
          { label: 'Converted→COA', value: stats.converted,  color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Total COAs',    value: stats.totalCOA,   color: 'text-purple-700',  bg: 'bg-purple-50'  },
          { label: 'Total COA Value', value: fmtCurrency(stats.totalCOAValue), color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(s => (
          <Card key={s.label} className={clsx('!p-4', s.bg, '!border-0')}>
            <p className="text-xs text-slate-500 font-medium leading-tight">{s.label}</p>
            <p className={clsx('text-lg font-bold mt-1 leading-tight', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2 flex-wrap items-center">
          {/* Tab switcher */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden bg-white">
            {[
              { key: 'cor', label: 'Change Order Requests', icon: GitPullRequest },
              { key: 'coa', label: 'Approved COAs',         icon: GitMerge       },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all',
                  tab === key
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{key.toUpperCase()}</span>
              </button>
            ))}
          </div>

          {/* Project filter */}
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
            >
              <option value="all">All Projects</option>
              {visibleProjects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {isQsEng && tab === 'cor' && (
          <Button icon={Plus} onClick={() => setCreateCOROpen(true)}>
            New COR
          </Button>
        )}
      </div>

      {/* COR Tab */}
      {tab === 'cor' && (
        visibleCORs.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            message="No Change Order Requests found"
            sub={isQsEng ? 'Create a new COR to get started.' : 'No CORs match the current filter.'}
            action={isQsEng ? <Button icon={Plus} size="sm" onClick={() => setCreateCOROpen(true)}>New COR</Button> : null}
          />
        ) : (
          <div className="space-y-3">
            {visibleCORs.map(cor => {
              const project = projects.find(p => p.id === cor.projectId)
              const creator = USERS.find(u => u.id === cor.createdBy)
              const sc = COR_STATUS_CONFIG[cor.status] ?? COR_STATUS_CONFIG['Prepare doc']
              const coa = cor.convertedToCOA ? coas.find(c => c.id === cor.coaId) : null

              return (
                <CORRow
                  key={cor.id}
                  cor={cor}
                  project={project}
                  creator={creator}
                  sc={sc}
                  coa={coa}
                  canConvert={isPM && !cor.convertedToCOA && cor.status === 'Submitted'}
                  canDelete={isSuperAdmin}
                  onView={() => setDetailCOR(cor)}
                  onConvert={() => setConvertCOR(cor)}
                  onDelete={() => handleDeleteCOR(cor)}
                />
              )
            })}
          </div>
        )
      )}

      {/* COA Tab */}
      {tab === 'coa' && (
        visibleCOAs.length === 0 ? (
          <EmptyState
            icon={GitMerge}
            message="No Approved Change Orders"
            sub="COAs are created when a PM converts an approved COR."
          />
        ) : (
          <div className="space-y-3">
            {visibleCOAs.map(coa => {
              const project  = projects.find(p => p.id === coa.projectId)
              const cor      = cors.find(c => c.id === coa.corId)
              const approver = USERS.find(u => u.id === coa.approvedBy)
              const coaPays  = getCOAPayment(coa.id)

              return (
                <COARow
                  key={coa.id}
                  coa={coa}
                  cor={cor}
                  project={project}
                  approver={approver}
                  payments={coaPays}
                  currentUser={currentUser}
                  canDelete={isSuperAdmin}
                  onManagePayment={() => setCoaPaymentCOA(coa)}
                  onDelete={() => handleDeleteCOA(coa)}
                />
              )
            })}
          </div>
        )
      )}

      {/* Modals */}
      {createCOROpen && (
        <CORCreateModal
          projects={visibleProjects}
          onClose={() => setCreateCOROpen(false)}
        />
      )}
      {detailCOR && (
        <CORDetailModal
          cor={detailCOR}
          onClose={() => setDetailCOR(null)}
          onConvert={() => { setDetailCOR(null); setConvertCOR(detailCOR) }}
        />
      )}
      {convertCOR && (
        <ConvertToCOAModal
          cor={convertCOR}
          onClose={() => setConvertCOR(null)}
          onDone={() => { setConvertCOR(null); setTab('coa') }}
        />
      )}
      {coaPaymentCOA && (
        <COAPaymentModal
          coa={coaPaymentCOA}
          onClose={() => setCoaPaymentCOA(null)}
        />
      )}
    </div>
  )
}

/* ─── COR Row ─────────────────────────────────────────────────────────────── */
function CORRow({ cor, project, creator, sc, coa, canConvert, canDelete, onView, onConvert, onDelete }) {
  const StatusIcon = sc.icon
  return (
    <Card padding={false} className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        <div className={clsx(
          'w-1 shrink-0',
          cor.status === 'Submitted'   && !cor.convertedToCOA && 'bg-blue-500',
          cor.status === 'Prepare doc' && 'bg-slate-300',
          cor.status === 'Rejected'    && 'bg-rose-500',
          cor.convertedToCOA          && 'bg-emerald-500',
        )} />
        <div className="flex-1 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{cor.corNo}</span>
                <Badge variant={sc.badge}>
                  <StatusIcon size={10} className="mr-1 inline" />
                  {sc.label}
                </Badge>
                {cor.convertedToCOA && (
                  <Badge variant="emerald">
                    <CheckCircle2 size={10} className="mr-1 inline" />
                    Converted → {coa?.coaNo}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-snug line-clamp-2">{cor.detail}</p>
              <p className="text-xs text-slate-400 italic">{cor.reason}</p>
              <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400">
                <span className="flex items-center gap-1"><FileText size={11} />{project?.name ?? '—'}</span>
                <span className="flex items-center gap-1"><User size={11} />{creator?.name ?? '—'}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />Submitted {fmtDate(cor.submitDate)}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />Expected {fmtDate(cor.expectedApprovalDate)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">COR Value</p>
                <p className="text-base font-bold text-slate-800">{fmtCurrency(cor.value)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onView}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Eye size={13} /> Detail
                </button>
                {canConvert && (
                  <Button variant="primary" size="sm" icon={GitMerge} onClick={onConvert}>
                    Convert to COA
                  </Button>
                )}
                {canDelete && (
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                    title="ลบรายการ (SuperAdmin)"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ─── COA Row ─────────────────────────────────────────────────────────────── */
function COARow({ coa, cor, project, approver, payments, currentUser, canDelete, onManagePayment, onDelete }) {
  const latestPay   = payments[payments.length - 1]
  const totalPaid   = payments.filter(p => p.status === 'Received').reduce((s, p) => s + (p.balanceValue || 0), 0)
  const balance     = (coa.value || 0) - totalPaid

  const canAct = ['PM', 'QsEng', 'AccCMG'].includes(currentUser.role)

  return (
    <Card padding={false} className="overflow-hidden hover:shadow-md transition-shadow">
      <div className="flex">
        <div className="w-1 shrink-0 bg-purple-500" />
        <div className="flex-1 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{coa.coaNo}</span>
                <Badge variant="purple">COA Approved</Badge>
                {cor && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <GitPullRequest size={10} /> from {cor.corNo}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-snug">{coa.description}</p>
              <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400">
                <span className="flex items-center gap-1"><FileText size={11} />{project?.name ?? '—'}</span>
                <span className="flex items-center gap-1"><User size={11} />Approved by {approver?.name ?? '—'}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />{fmtDate(coa.approvedAt)}</span>
              </div>
            </div>

            {/* Financials */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="grid grid-cols-3 gap-x-5 text-right">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">COA Value</p>
                  <p className="text-sm font-bold text-purple-700">{fmtCurrency(coa.value)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Received</p>
                  <p className="text-sm font-semibold text-emerald-700">{fmtCurrency(totalPaid)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Balance</p>
                  <p className={clsx('text-sm font-bold', balance > 0 ? 'text-amber-600' : 'text-emerald-700')}>{fmtCurrency(balance)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {canAct && (
                  <Button variant="secondary" size="sm" icon={CreditCard} onClick={onManagePayment}>
                    Payments
                  </Button>
                )}
                {canDelete && (
                  <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors"
                    title="ลบรายการ (SuperAdmin)"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function EmptyState({ icon: Icon, message, sub, action }) {
  return (
    <Card className="flex flex-col items-center justify-center py-20 gap-3">
      <Icon size={40} className="text-slate-300" />
      <p className="text-slate-500 font-medium">{message}</p>
      <p className="text-slate-400 text-sm text-center max-w-xs">{sub}</p>
      {action}
    </Card>
  )
}
