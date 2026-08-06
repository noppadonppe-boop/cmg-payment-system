import { useState } from 'react'
import {
  Plus, ChevronDown, CreditCard, CheckCircle2, Clock,
  Send, Banknote, Filter, AlertCircle, ArrowRight,
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
import PaymentEditModal from '../components/payments/PaymentEditModal'
import InvoiceModal from '../components/payments/InvoiceModal'
import ReceivedModal from '../components/payments/ReceivedModal'
import ApproveModal from '../components/payments/ApproveModal'
import RequestRevisionModal from '../components/payments/RequestRevisionModal'
import ApproveRevisionModal from '../components/payments/ApproveRevisionModal'
import DraftEditModal from '../components/payments/DraftEditModal'
import { PAYMENT_STATUS, normalizePaymentStatus } from '../lib/paymentStatus'

export { PAYMENT_STATUS }

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  // ปัดเศษทศนิยมตำแหน่งที่ 3: 5 ขึ้นไปปัดขึ้น, 4 ลงมาปัดลง
  const rounded = Math.round(val * 100) / 100
  return `฿${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PaymentsPage() {
  const { projects, payments, getProjectPayments, deletePayment } = useData()
  const { currentUser, can, hasProjectAccess, USERS, userProfile } = useAuth()
  const isSuperAdmin = userProfile?.role?.includes('SuperAdmin') || userProfile?.role?.includes('MasterAdmin')

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
  const [editPayment, setEditPayment] = useState(null)
  const [requestRevisionPayment, setRequestRevisionPayment] = useState(null)
  const [approveRevisionPayment, setApproveRevisionPayment] = useState(null)
  const [approveRevisionAction, setApproveRevisionAction] = useState(null)
  const [draftEditPayment, setDraftEditPayment] = useState(null)
  
  // detailPayment will now store { pay, actions } so the modal can render the actions
  const [detailModalData, setDetailModalData] = useState(null)

  const visibleProjects = projects.filter(p => hasProjectAccess(p.id))

  const visiblePayments = payments.filter(pay => {
    if (!hasProjectAccess(pay.projectId)) return false
    // Show both 'main' and 'coa' type payments
    if (pay.type !== 'main' && pay.type !== 'coa') return false
    if (selectedProjectId !== 'all' && pay.projectId !== selectedProjectId) return false
    
    // Map old status to new for filtering
    const mappedStatus = normalizePaymentStatus(pay)
    
    // ถ้าเลือกสถานะเฉพาะ ให้กรองตามนั้น
    if (statusFilter !== 'all' && mappedStatus !== statusFilter) return false
    
    return true
  })

  // Stats - with backward compatibility mapping
  const allVisible = payments.filter(p => hasProjectAccess(p.projectId) && (p.type === 'main' || p.type === 'coa'))
  
  const mapStatus = normalizePaymentStatus
  
  const stats = {
    total:         allVisible.length,
    draft:         allVisible.filter(p => {
      const s = mapStatus(p)
      return s === 'Draft' || s === 'Invoice Draft'
    }).length,
    pendingPM:     allVisible.filter(p => {
      const s = mapStatus(p)
      return s === 'Pending PM' || s === 'Invoice Pending PM'
    }).length,
    pmApproved:    allVisible.filter(p => {
      const s = mapStatus(p)
      return s === 'PM Approved' || s === 'Client Sign Pending'
    }).length,
    invoiceSubmit: allVisible.filter(p => {
      const s = mapStatus(p)
      return s === 'Invoice Submitted' || s === 'Income Confirm Pending'
    }).length,
    completed:     allVisible.filter(p => mapStatus(p) === 'Completed').length,
    rejected:      allVisible.filter(p => {
      const s = mapStatus(p)
      return s === 'PM Rejected' || s === 'Invoice PM Rejected'
    }).length,
    totalCompleted: allVisible.filter(p => mapStatus(p) === 'Completed').reduce((s, p) => s + (p.balanceValue || 0), 0),
  }

  // Check user roles using can() for better multi-role support
  const isQsEng   = can('canCreateClaims')
  const isPM      = can('canApprovePayments')
  const isAccCMG  = can('canUpdateBonds')

  // What action buttons to show per payment
  const getActions = (pay) => {
    const actions = []
    
    // Helper to wrap the click handlers so they also close the detail modal if it's open
    const handleAction = (setter) => () => {
      setDetailModalData(null)
      setter(pay)
    }
    const handleRevisionAction = (actionType) => () => {
      setDetailModalData(null)
      setApproveRevisionPayment(pay)
      setApproveRevisionAction(actionType)
    }
    
    // Map old statuses to new ones for backward compatibility
    const status = normalizePaymentStatus(pay)
    
    // Stage 1: ISSUE PAYMENT
    // 1.0: Draft - QsENG can edit and submit
    if (isQsEng && status === 'Draft') {
      actions.push({ label: 'Edit & Submit', variant: 'primary', onClick: handleAction(setDraftEditPayment) })
    }
    
    // 1.1: Pending PM - PM can review and approve/reject
    if (isPM && status === 'Pending PM') {
      actions.push({ label: 'Review & Approve', variant: 'primary', onClick: handleAction(setApprovePayment) })
    }
    
    // 1.1: PM Rejected - QsENG can edit and resubmit
    if (isQsEng && status === 'PM Rejected') {
      actions.push({ label: 'Edit & Resubmit', variant: 'primary', onClick: handleAction(setEditPayment) })
    }
    
    // Stage 1.x: Revision Request - PM can approve/reject revision request
    if (isPM && pay.revisionRequest && pay.revisionRequest.status === 'Pending') {
      actions.push({ label: 'Review Revision Request', variant: 'amber', onClick: handleRevisionAction('approve') })
    }
    
    // Stage 2: ISSUE INVOICE
    // 2.0: PM Approved - QsENG can create invoice draft or request revision
    if (isQsEng && status === 'PM Approved' && !pay.revisionRequest) {
      actions.push({ label: 'Create Invoice', variant: 'primary', onClick: handleAction(setInvoicePayment) })
      actions.push({ label: 'Request Edit', variant: 'secondary', onClick: handleAction(setRequestRevisionPayment) })
    }
    
    // 2.0: Invoice Draft - QsENG can submit invoice for PM review
    if (isQsEng && status === 'Invoice Draft') {
      actions.push({ label: 'Submit Invoice', variant: 'primary', onClick: handleAction(setInvoicePayment) })
    }
    
    // 2.1: Invoice Pending PM - PM can review invoice and approve/reject
    if (isPM && status === 'Invoice Pending PM') {
      actions.push({ label: 'Review Invoice', variant: 'primary', onClick: handleAction(setApprovePayment) })
    }
    
    // 2.1: Invoice PM Rejected - QsENG can edit and resubmit invoice
    if (isQsEng && status === 'Invoice PM Rejected') {
      actions.push({ label: 'Edit & Resubmit Invoice', variant: 'primary', onClick: handleAction(setInvoicePayment) })
    }
    
    // 2.2: Client Sign Pending - QsENG can upload signed document
    if (isQsEng && status === 'Client Sign Pending') {
      actions.push({ label: 'Upload Signed Invoice', variant: 'primary', onClick: handleAction(setInvoicePayment) })
    }
    
    // Stage 3: ACC RECEIVE
    // 3.0: Invoice Submitted - AccCMG can accept
    if (isAccCMG && status === 'Invoice Submitted') {
      actions.push({ label: 'Accept', variant: 'primary', onClick: handleAction(setReceivedPayment) })
      actions.push({ label: 'Request Edit', variant: 'secondary', onClick: handleAction(setRequestRevisionPayment) })
    }
    
    // 3.1: Income Confirm Pending - AccCMG can confirm receive with attachment
    if (isAccCMG && status === 'Income Confirm Pending') {
      actions.push({ label: 'Confirm Receive', variant: 'emerald', onClick: handleAction(setReceivedPayment) })
    }
    
    return actions
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Claims',   value: stats.total,         color: 'text-slate-800',   bg: 'bg-slate-100'    },
          { label: 'Draft',          value: stats.draft,         color: 'text-slate-700',   bg: 'bg-slate-50'     },
          { label: 'Pending PM',     value: stats.pendingPM,     color: 'text-amber-700',   bg: 'bg-amber-50'     },
          { label: 'PM Approved',    value: stats.pmApproved,    color: 'text-blue-700',    bg: 'bg-blue-50'      },
          { label: 'Invoice Process',value: stats.invoiceSubmit, color: 'text-blue-700',    bg: 'bg-blue-50'      },
          { label: 'Completed',      value: stats.completed,     color: 'text-emerald-700', bg: 'bg-emerald-50'   },
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
              {visibleProjects
                .filter(p => p.status?.toUpperCase() === 'ACTIVE')
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.jobNo ? `${p.jobNo} - ${p.name}` : p.name}
                  </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="flex gap-1.5 flex-wrap">
            {['all', 'Draft', 'Pending PM', 'PM Approved', 'Invoice Submitted', 'Completed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap',
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
            
            // Map old statuses to new ones for backward compatibility
            const mappedStatus = normalizePaymentStatus(pay)
            
            const sc = PAYMENT_STATUS[mappedStatus] ?? PAYMENT_STATUS['Pending PM']

            return (
              <PaymentRow
                key={pay.id}
                pay={pay}
                project={project}
                creator={creator}
                sc={sc}
                actions={actions}
                canDelete={isSuperAdmin}
                onView={() => setDetailModalData({ pay, actions })}
                onDelete={() => handleDeletePayment(pay)}
              />
            )
          })}
        </div>
      )}

      {/* Modals */}
      {createOpen && (
        <PaymentCreateModal
          projects={visibleProjects.filter(p => p.status?.toUpperCase() === 'ACTIVE')}
          onClose={() => setCreateOpen(false)}
        />
      )}
      {detailModalData && (
        <PaymentDetailModal
          payment={detailModalData.pay}
          actions={detailModalData.actions}
          onClose={() => setDetailModalData(null)}
          onAction={(action) => {
            // Keep onAction for any internal components that might still use it
            setDetailModalData(null)
            const detailPayment = detailModalData.pay
            if (action === 'approve') setApprovePayment(detailPayment)
            if (action === 'invoice') setInvoicePayment(detailPayment)
            if (action === 'received') setReceivedPayment(detailPayment)
            if (action === 'edit') setEditPayment(detailPayment)
            if (action === 'editDraft') setDraftEditPayment(detailPayment)
            if (action === 'requestRevision') setRequestRevisionPayment(detailPayment)
            if (action === 'approveRevision') {
              setApproveRevisionPayment(detailPayment)
              setApproveRevisionAction('approve')
            }
            if (action === 'rejectRevision') {
              setApproveRevisionPayment(detailPayment)
              setApproveRevisionAction('reject')
            }
          }}
        />
      )}
      {editPayment && (
        <PaymentEditModal
          payment={editPayment}
          projects={visibleProjects}
          onClose={() => setEditPayment(null)}
          onSaved={() => setEditPayment(null)}
        />
      )}
      {draftEditPayment && (
        <DraftEditModal
          payment={draftEditPayment}
          onClose={() => setDraftEditPayment(null)}
          onSaved={() => setDraftEditPayment(null)}
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
          onEditPayment={() => {
            setEditPayment(invoicePayment)
            setInvoicePayment(null)
          }}
        />
      )}
      {receivedPayment && (
        <ReceivedModal
          payment={receivedPayment}
          onClose={() => setReceivedPayment(null)}
          onRequestRevision={() => setRequestRevisionPayment(receivedPayment)}
        />
      )}
      {requestRevisionPayment && (
        <RequestRevisionModal
          payment={requestRevisionPayment}
          onClose={() => setRequestRevisionPayment(null)}
        />
      )}
      {approveRevisionPayment && (
        <ApproveRevisionModal
          payment={approveRevisionPayment}
          action={approveRevisionAction}
          onClose={() => {
            setApproveRevisionPayment(null)
            setApproveRevisionAction(null)
          }}
        />
      )}
    </div>
  )
}

function PaymentRow({ pay, project, creator, sc, actions, canDelete, onView, onDelete }) {
  const StatusIcon = sc.icon
  
  // Map old statuses to new ones for backward compatibility
  const status = normalizePaymentStatus(pay)

  return (
    <Card padding={false} className="overflow-hidden hover:shadow-md transition-shadow" onDoubleClick={onView}>
      {/* Left accent bar */}
      <div className="flex">
        <div className={clsx(
          'w-1 shrink-0',
          status === 'Completed'             && 'bg-emerald-500',
          status === 'Income Confirm Pending'&& 'bg-emerald-400',
          status === 'Invoice Submitted'     && 'bg-blue-500',
          status === 'Client Sign Pending'   && 'bg-blue-400',
          status === 'Invoice Pending PM'    && 'bg-amber-500',
          status === 'Invoice Draft'         && 'bg-slate-400',
          status === 'PM Approved'           && 'bg-blue-300',
          status === 'Pending PM'            && 'bg-amber-400',
          (status === 'PM Rejected' || status === 'Invoice PM Rejected') && 'bg-rose-500',
          status === 'Draft'                 && 'bg-slate-300',
        )} />

        <div className="flex-1 py-2 px-3 sm:py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-4 lg:gap-5">
            {/* Identity */}
            <div className="flex-1 min-w-[280px] space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-slate-800">{pay.paymentNo}</span>
                <Badge variant={sc.badge} className="scale-90 origin-left">
                  <StatusIcon size={10} className="mr-1" />
                  {sc.label}
                </Badge>
                {pay.type === 'coa' && <Badge variant="purple" className="scale-90 origin-left">COA</Badge>}
                {pay.revisionRequest && pay.revisionRequest.status === 'Pending' && (
                  <Badge variant="amber" className="scale-90 origin-left">Revision</Badge>
                )}
                
                <div className="flex items-center gap-2.5 text-[10px] text-slate-400 ml-1 border-l border-slate-200 pl-2.5">
                  <span className="flex items-center gap-1 whitespace-nowrap"><FileText size={10} />{project?.name ?? '—'}</span>
                  <span className="flex items-center gap-1 whitespace-nowrap"><User size={10} />{creator?.name ?? '—'}</span>
                  <span className="flex items-center gap-1 whitespace-nowrap"><Calendar size={10} />{pay.createdAt}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <p className="truncate max-w-xs xl:max-w-md" title={pay.detail}>{pay.detail || 'No description'}</p>
                {pay.invoiceNo && (
                  <span className="flex items-center gap-1 text-slate-400 whitespace-nowrap border-l border-slate-200 pl-2.5 ml-1">
                    <Hash size={10} />{pay.invoiceNo}
                  </span>
                )}
              </div>
            </div>

            {/* Financials */}
            <div className="flex items-center shrink-0">
              <div className="grid grid-cols-3 gap-x-4 text-right">
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Claim Value</p>
                  <p className="text-xs font-semibold text-slate-700">{fmtCurrency(pay.value)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Deductions</p>
                  <p className="text-xs font-medium text-rose-500">
                    -{fmtCurrency((pay.advanceDeduction || 0) + (pay.retentionReduce || 0) + (pay.withTaxValue || 0))}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Balance</p>
                  <p className="text-xs font-bold text-emerald-700">{fmtCurrency(pay.balanceValue)}</p>
                </div>
              </div>
            </div>

            {/* Workflow Stepper (mini) */}
            <div className="shrink-0 -my-1 overflow-x-auto max-w-[280px] xl:max-w-none pb-1 xl:pb-0 scrollbar-hide">
              <MiniStepper status={pay.status} />
            </div>

            {/* Actions */}
            <div className="hidden xl:flex items-center gap-2 shrink-0">
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
  // Map old statuses to new ones for backward compatibility
  const mappedStatus = normalizePaymentStatus(status)
  
  // Define main steps with sub-steps
  const steps = [
    { 
      key: 'step1', 
      label: 'Payment',
      subSteps: [
        { key: 'sub1', label: 'PM review', statuses: ['Pending PM', 'PM Rejected'] }
      ]
    },
    { 
      key: 'step2', 
      label: 'Invoice',
      subSteps: [
        { key: 'sub2', label: 'PM review', statuses: ['Invoice Pending PM', 'Invoice PM Rejected'] },
        { key: 'sub3', label: 'Client Sign', statuses: ['Client Sign Pending'] }
      ]
    },
    { 
      key: 'step3', 
      label: 'Receive',
      subSteps: [
        { key: 'sub4', label: 'Confirm', statuses: ['Income Confirm Pending'] }
      ]
    },
    { 
      key: 'step4', 
      label: 'Complete',
      subSteps: []
    },
  ]

  // Determine current step and sub-step
  const getCurrentStep = () => {
    if (mappedStatus === 'Completed') return { step: 4, subStep: null }
    if (mappedStatus === 'Income Confirm Pending') return { step: 3, subStep: 1 }
    if (mappedStatus === 'Invoice Submitted') return { step: 3, subStep: 0 }
    if (mappedStatus === 'PM Approved' || mappedStatus === 'Invoice Draft' || 
        mappedStatus === 'Invoice Pending PM' || mappedStatus === 'Invoice PM Rejected' || 
        mappedStatus === 'Client Sign Pending') {
      if (mappedStatus === 'Invoice Pending PM' || mappedStatus === 'Invoice PM Rejected') return { step: 2, subStep: 1 }
      if (mappedStatus === 'Client Sign Pending') return { step: 2, subStep: 2 }
      return { step: 2, subStep: 0 }
    }
    if (mappedStatus === 'Pending PM' || mappedStatus === 'PM Rejected') return { step: 1, subStep: 1 }
    if (mappedStatus === 'Draft') return { step: 1, subStep: 0 }
    return { step: 1, subStep: 0 }
  }

  const { step: currentStep, subStep: currentSubStep } = getCurrentStep()
  const isRejected = mappedStatus === 'PM Rejected' || mappedStatus === 'Invoice PM Rejected'
  const isDraft = mappedStatus === 'Draft' || mappedStatus === 'Invoice Draft'

  return (
    <div className="flex items-center gap-0.5">
      {steps.map((step, stepIndex) => {
        const stepNum = stepIndex + 1
        const done = currentStep > stepNum
        const active = currentStep === stepNum
        const pending = currentStep < stepNum

        return (
          <div key={step.key} className="flex items-center gap-0.5">
            {/* Main Step Circle */}
            <div className="flex flex-col items-center gap-0.5">
              <div className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                done && 'bg-emerald-500 border-emerald-500 text-white',
                active && !isRejected && 'bg-blue-600 border-blue-600 text-white',
                active && isRejected && 'bg-rose-500 border-rose-500 text-white',
                pending && 'bg-white border-slate-200 text-slate-400',
              )}>
                {done ? <CheckCircle2 size={12} /> : stepNum}
              </div>
              <span className={clsx(
                'text-[9px] font-medium whitespace-nowrap',
                done && 'text-emerald-600',
                active && !isRejected && 'text-blue-600',
                active && isRejected && 'text-rose-500',
                pending && 'text-slate-400',
              )}>
                {step.label}
              </span>
            </div>

            {/* Sub-steps (small dots) */}
            {step.subSteps.length > 0 && stepIndex < steps.length - 1 && (
              <>
                {step.subSteps.map((subStep, subIndex) => {
                  const subNum = subIndex + 1
                  const subDone = done || (active && currentSubStep !== null && currentSubStep > subNum)
                  const subActive = active && currentSubStep === subNum
                  const subPending = pending || (active && currentSubStep !== null && currentSubStep < subNum)

                  return (
                    <div key={subStep.key} className="flex items-center gap-0.5">
                      {/* Connector line before sub-step */}
                      <div className={clsx(
                        'w-3 h-0.5 mb-3 transition-all',
                        (done || subDone) ? 'bg-emerald-400' : 'bg-slate-200'
                      )} />
                      
                      {/* Sub-step dot */}
                      <div className="flex flex-col items-center gap-0.5">
                        <div className={clsx(
                          'w-3 h-3 rounded-full border transition-all',
                          (done || subDone) && 'bg-emerald-400 border-emerald-400',
                          subActive && !isRejected && 'bg-blue-500 border-blue-500',
                          subActive && isRejected && 'bg-rose-400 border-rose-400',
                          subPending && 'bg-white border-slate-200',
                        )} />
                        <span className={clsx(
                          'text-[8px] font-medium whitespace-nowrap',
                          (done || subDone) && 'text-emerald-600',
                          subActive && !isRejected && 'text-blue-600',
                          subActive && isRejected && 'text-rose-500',
                          subPending && 'text-slate-400',
                        )}>
                          {subStep.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* Connector line to next main step */}
            {stepIndex < steps.length - 1 && (
              <div className={clsx(
                'w-3 h-0.5 mb-3 transition-all',
                done ? 'bg-emerald-400' : 'bg-slate-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
