import { useState } from 'react'
import {
  Plus, ChevronDown, CreditCard, CheckCircle2, Clock,
  Send, Banknote, Filter, AlertCircle, Eye, ArrowRight,
  FileText, User, Calendar, Hash, Trash2
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { clsx } from 'clsx'
import PaymentDetailModal from '../components/payments/PaymentDetailModal'
import PaymentCreateModal from '../components/payments/PaymentCreateModal'
import InvoiceModal from '../components/payments/InvoiceModal'
import ReceivedModal from '../components/payments/ReceivedModal'
import ApproveModal from '../components/payments/ApproveModal'

export const PAYMENT_STATUS = {
  'In Progress': { step: 1, label: 'In Progress',   badge: 'amber',   icon: Clock,         description: 'Awaiting PM approval' },
  'Rejected':    { step: 1, label: 'Rejected',       badge: 'rose',    icon: AlertCircle,   description: 'Rejected — needs revision' },
  'Submitted':   { step: 2, label: 'Submitted',      badge: 'blue',    icon: Send,          description: 'Invoice sent, awaiting payment' },
  'Received':    { step: 3, label: 'Received',       badge: 'emerald', icon: CheckCircle2,  description: 'Payment received' },
}

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PaymentsPage() {
  const { projects, payments, getProjectPayments, deletePayment } = useData()
  const { currentUser, can, hasProjectAccess, USERS } = useAuth()
  const isSuperAdmin = currentUser?.role === 'SuperAdmin'

  async function handleDeletePayment(pay) {
    if (!window.confirm(`ยืนยันการลบ Payment Claim "${pay.paymentNo}"?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return
    await deletePayment(pay.id)
  }

  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detailPayment, setDetailPayment]   = useState(null)
  const [createOpen, setCreateOpen]         = useState(false)
  const [invoicePayment, setInvoicePayment] = useState(null)
  const [receivedPayment, setReceivedPayment] = useState(null)
  const [approvePayment, setApprovePayment] = useState(null)

  const visibleProjects = projects.filter(p => hasProjectAccess(p.id))

  const visiblePayments = payments.filter(pay => {
    if (!hasProjectAccess(pay.projectId)) return false
    if (pay.type !== 'main') return false
    if (selectedProjectId !== 'all' && pay.projectId !== selectedProjectId) return false
    if (statusFilter !== 'all' && pay.status !== statusFilter) return false
    return true
  })

  // Stats
  const allVisible = payments.filter(p => hasProjectAccess(p.projectId) && p.type === 'main')
  const stats = {
    total:      allVisible.length,
    inProgress: allVisible.filter(p => p.status === 'In Progress').length,
    submitted:  allVisible.filter(p => p.status === 'Submitted').length,
    received:   allVisible.filter(p => p.status === 'Received').length,
    rejected:   allVisible.filter(p => p.status === 'Rejected').length,
    totalReceived: allVisible.filter(p => p.status === 'Received').reduce((s, p) => s + (p.balanceValue || 0), 0),
  }

  const isQsEng   = currentUser.role === 'QsEng'
  const isPM      = currentUser.role === 'PM'
  const isAccCMG  = currentUser.role === 'AccCMG'

  // What action buttons to show per payment
  const getActions = (pay) => {
    const actions = []
    if (isQsEng && pay.status === 'In Progress' && pay.createdBy === currentUser.id) {
      // QsEng can edit their own pending claim — reuse create modal in edit mode
    }
    if (isPM && pay.status === 'In Progress') {
      actions.push({ label: 'Review', variant: 'primary', onClick: () => setApprovePayment(pay) })
    }
    if (isQsEng && pay.status === 'Submitted' && !pay.invoiceNo) {
      actions.push({ label: 'Issue Invoice', variant: 'primary', onClick: () => setInvoicePayment(pay) })
    }
    if (isAccCMG && pay.status === 'Submitted' && pay.invoiceNo) {
      actions.push({ label: 'Confirm Receipt', variant: 'emerald', onClick: () => setReceivedPayment(pay) })
    }
    return actions
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Claims',  value: stats.total,      color: 'text-slate-800',   bg: 'bg-slate-100'    },
          { label: 'In Progress',   value: stats.inProgress, color: 'text-amber-700',   bg: 'bg-amber-50'     },
          { label: 'Submitted',     value: stats.submitted,  color: 'text-blue-700',    bg: 'bg-blue-50'      },
          { label: 'Received',      value: stats.received,   color: 'text-emerald-700', bg: 'bg-emerald-50'   },
          { label: 'Rejected',      value: stats.rejected,   color: 'text-rose-700',    bg: 'bg-rose-50'      },
          { label: 'Total Received',value: fmtCurrency(stats.totalReceived), color: 'text-emerald-700', bg: 'bg-emerald-50' },
        ].map(s => (
          <Card key={s.label} className={clsx('!p-4', s.bg, '!border-0')}>
            <p className="text-xs text-slate-500 font-medium leading-tight">{s.label}</p>
            <p className={clsx('text-lg font-bold mt-1 leading-tight', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2 flex-wrap">
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

          {/* Status filter */}
          <div className="flex gap-1.5">
            {['all', 'In Progress', 'Submitted', 'Received', 'Rejected'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all',
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {can('canCreateClaims') && (
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New Payment Claim
          </Button>
        )}
      </div>

      {/* Payment List */}
      {visiblePayments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 gap-3">
          <CreditCard size={40} className="text-slate-300" />
          <p className="text-slate-500 font-medium">No payment claims found</p>
          <p className="text-slate-400 text-sm">
            {can('canCreateClaims') ? 'Create your first payment claim to get started.' : 'No payment claims match the current filter.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visiblePayments.map(pay => {
            const project  = projects.find(p => p.id === pay.projectId)
            const creator  = USERS.find(u => u.id === pay.createdBy)
            const actions  = getActions(pay)
            const sc       = PAYMENT_STATUS[pay.status] ?? PAYMENT_STATUS['In Progress']

            return (
              <PaymentRow
                key={pay.id}
                pay={pay}
                project={project}
                creator={creator}
                sc={sc}
                actions={actions}
                canDelete={isSuperAdmin}
                onView={() => setDetailPayment(pay)}
                onDelete={() => handleDeletePayment(pay)}
              />
            )
          })}
        </div>
      )}

      {/* Modals */}
      {createOpen && (
        <PaymentCreateModal
          projects={visibleProjects}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
          onAction={(action) => {
            setDetailPayment(null)
            if (action === 'approve') setApprovePayment(detailPayment)
            if (action === 'invoice') setInvoicePayment(detailPayment)
            if (action === 'received') setReceivedPayment(detailPayment)
          }}
        />
      )}
      {approvePayment && (
        <ApproveModal
          payment={approvePayment}
          onClose={() => setApprovePayment(null)}
        />
      )}
      {invoicePayment && (
        <InvoiceModal
          payment={invoicePayment}
          onClose={() => setInvoicePayment(null)}
        />
      )}
      {receivedPayment && (
        <ReceivedModal
          payment={receivedPayment}
          onClose={() => setReceivedPayment(null)}
        />
      )}
    </div>
  )
}

function PaymentRow({ pay, project, creator, sc, actions, canDelete, onView, onDelete }) {
  const StatusIcon = sc.icon

  return (
    <Card padding={false} className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Left accent bar */}
      <div className="flex">
        <div className={clsx(
          'w-1 shrink-0',
          pay.status === 'Received'   && 'bg-emerald-500',
          pay.status === 'Submitted'  && 'bg-blue-500',
          pay.status === 'In Progress'&& 'bg-amber-400',
          pay.status === 'Rejected'   && 'bg-rose-500',
        )} />

        <div className="flex-1 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Identity */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{pay.paymentNo}</span>
                <Badge variant={sc.badge}>
                  <StatusIcon size={10} className="mr-1" />
                  {sc.label}
                </Badge>
                {pay.type === 'coa' && <Badge variant="purple">COA</Badge>}
              </div>
              <p className="text-sm text-slate-600 leading-snug">{pay.detail}</p>
              <div className="flex items-center gap-4 flex-wrap text-xs text-slate-400">
                <span className="flex items-center gap-1"><FileText size={11} />{project?.name ?? '—'}</span>
                <span className="flex items-center gap-1"><User size={11} />{creator?.name ?? '—'}</span>
                <span className="flex items-center gap-1"><Calendar size={11} />{pay.createdAt}</span>
                {pay.invoiceNo && <span className="flex items-center gap-1"><Hash size={11} />{pay.invoiceNo}</span>}
              </div>
            </div>

            {/* Financials */}
            <div className="flex items-center gap-6 shrink-0">
              <div className="grid grid-cols-3 gap-x-5 gap-y-1 text-right">
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Claim Value</p>
                  <p className="text-sm font-semibold text-slate-700">{fmtCurrency(pay.value)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Deductions</p>
                  <p className="text-sm font-medium text-rose-500">
                    -{fmtCurrency((pay.advanceDeduction || 0) + (pay.retentionReduce || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Balance</p>
                  <p className="text-sm font-bold text-emerald-700">{fmtCurrency(pay.balanceValue)}</p>
                </div>
              </div>
            </div>

            {/* Workflow Stepper (mini) */}
            <div className="shrink-0">
              <MiniStepper status={pay.status} />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onView}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Eye size={13} /> Detail
              </button>
              {actions.map((a, i) => (
                <Button key={i} variant={a.variant} size="sm" onClick={a.onClick}>
                  {a.label}
                </Button>
              ))}
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
    </Card>
  )
}

export function MiniStepper({ status }) {
  const steps = [
    { key: 'step1', label: 'Approve',  statuses: ['In Progress', 'Rejected'] },
    { key: 'step2', label: 'Invoice',  statuses: ['Submitted'] },
    { key: 'step3', label: 'Received', statuses: ['Received'] },
  ]

  const currentStep =
    status === 'Received'    ? 3 :
    status === 'Submitted'   ? 2 :
    status === 'In Progress' ? 1 :
    status === 'Rejected'    ? 1 : 1

  const isRejected = status === 'Rejected'

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, i) => {
        const stepNum  = i + 1
        const done     = currentStep > stepNum
        const active   = currentStep === stepNum
        const rejected = active && isRejected

        return (
          <div key={step.key} className="flex items-center gap-0.5">
            <div className="flex flex-col items-center gap-0.5">
              <div className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                done     && 'bg-emerald-500 border-emerald-500 text-white',
                active && !rejected && 'bg-blue-600 border-blue-600 text-white',
                rejected && 'bg-rose-500 border-rose-500 text-white',
                !done && !active && 'bg-white border-slate-200 text-slate-400',
              )}>
                {done ? <CheckCircle2 size={12} /> : stepNum}
              </div>
              <span className={clsx(
                'text-[9px] font-medium whitespace-nowrap',
                done     && 'text-emerald-600',
                active && !rejected && 'text-blue-600',
                rejected && 'text-rose-500',
                !done && !active && 'text-slate-400',
              )}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={clsx(
                'w-5 h-0.5 mb-3 transition-all',
                done ? 'bg-emerald-400' : 'bg-slate-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
