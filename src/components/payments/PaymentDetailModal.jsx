import {
  FileText, User, Calendar, Paperclip, CheckCircle2,
  Clock, Send, Banknote, XCircle, Hash, AlertCircle
} from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from './PaymentCreateModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-slate-700 mt-0.5 font-medium">{value ?? <span className="text-slate-300 font-normal">—</span>}</p>
    </div>
  )
}

export default function PaymentDetailModal({ payment, onClose, onAction }) {
  const { projects } = useData()
  const { currentUser, USERS } = useAuth()

  const project = projects.find(p => p.id === payment.projectId)
  const creator = USERS.find(u => u.id === payment.createdBy)
  const approver = USERS.find(u => u.id === payment.approvedBy)
  const receiver = USERS.find(u => u.id === payment.receivedBy)
  const rejecter = USERS.find(u => u.id === payment.rejectedBy)

  const isPM     = currentUser.role === 'PM'
  const isQsEng  = currentUser.role === 'QsEng'
  const isAccCMG = currentUser.role === 'AccCMG'

  return (
    <Modal
      title={payment.paymentNo}
      subtitle={project?.name ?? '—'}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Visual 3-Step Stepper */}
        <WorkflowStepper payment={payment} USERS={USERS} />

        {/* Step 1: Claim Info */}
        <StepSection
          step={1}
          title="Payment Claim"
          subtitle="Submitted by QsEng"
          status={payment.status}
          activeStep={1}
          color="blue"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
            <InfoRow label="Payment No." value={payment.paymentNo} />
            <InfoRow label="Submitted By" value={creator?.name} />
            <InfoRow label="Date" value={fmtDate(payment.createdAt)} />
            <InfoRow label="Description" value={payment.detail} />
            {payment.attachment && (
              <InfoRow
                label="Attachment"
                value={<a href="#" className="flex items-center gap-1 text-blue-600 hover:underline text-sm"><Paperclip size={12}/>{payment.attachment}</a>}
              />
            )}
            {payment.note && <InfoRow label="Note" value={`"${payment.note}"`} />}
          </div>

          {/* Financial breakdown */}
          <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-4 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50 px-4 py-2 border-b border-slate-200">
              <span>Claim Value</span>
              <span>Advance Ded.</span>
              <span>Retention</span>
              <span className="text-emerald-700">Balance</span>
            </div>
            <div className="grid grid-cols-4 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">{fmtCurrency(payment.value)}</span>
              <span className="text-sm font-medium text-rose-500">−{fmtCurrency(payment.advanceDeduction)}</span>
              <span className="text-sm font-medium text-rose-500">−{fmtCurrency(payment.retentionReduce)}</span>
              <span className="text-base font-bold text-emerald-700">{fmtCurrency(payment.balanceValue)}</span>
            </div>
          </div>

          {/* Rejection notice */}
          {payment.status === 'Rejected' && (
            <div className="mt-3 flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
              <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-rose-700">Rejected by {rejecter?.name ?? 'PM'} on {fmtDate(payment.rejectedAt)}</p>
                {payment.rejectionNote && <p className="text-xs text-rose-600 mt-0.5">"{payment.rejectionNote}"</p>}
              </div>
            </div>
          )}

          {isPM && payment.status === 'In Progress' && (
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={() => onAction?.('approve')}>
                Review & Approve / Reject
              </Button>
            </div>
          )}
        </StepSection>

        {/* Step 2: Invoice */}
        <StepSection
          step={2}
          title="Client Invoice"
          subtitle="Issued by QsEng after PM approval"
          status={payment.status}
          activeStep={payment.status === 'Submitted' || payment.status === 'Received' ? 2 : null}
          color="blue"
          locked={payment.status === 'In Progress' || payment.status === 'Rejected'}
        >
          {payment.invoiceNo ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <InfoRow label="Invoice No." value={payment.invoiceNo} />
              <InfoRow label="Due Date" value={fmtDate(payment.invoiceDueDate)} />
              <InfoRow label="Issued On" value={fmtDate(payment.invoiceSubmittedAt)} />
              {payment.invoiceNote && <InfoRow label="Note" value={`"${payment.invoiceNote}"`} />}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {payment.status === 'In Progress' || payment.status === 'Rejected'
                ? 'Awaiting PM approval before invoice can be issued.'
                : 'Invoice not yet issued.'}
            </p>
          )}

          {isQsEng && payment.status === 'Submitted' && !payment.invoiceNo && (
            <div className="mt-3">
              <Button variant="primary" size="sm" icon={Send} onClick={() => onAction?.('invoice')}>
                Issue Invoice
              </Button>
            </div>
          )}
        </StepSection>

        {/* Step 3: Payment Received */}
        <StepSection
          step={3}
          title="Payment Received"
          subtitle="Confirmed by AccCMG"
          status={payment.status}
          activeStep={payment.status === 'Received' ? 3 : null}
          color="emerald"
          locked={payment.status !== 'Received' && !(isAccCMG && payment.status === 'Submitted' && payment.invoiceNo)}
        >
          {payment.receivedDate ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
              <InfoRow label="Received Date" value={fmtDate(payment.receivedDate)} />
              <InfoRow label="Confirmed By" value={receiver?.name} />
              <InfoRow label="Confirmed On" value={fmtDate(payment.receivedAt)} />
              {payment.receivedAttachment && (
                <InfoRow
                  label="Receipt / Bank Slip"
                  value={<a href="#" className="flex items-center gap-1 text-blue-600 hover:underline text-sm"><Paperclip size={12}/>{payment.receivedAttachment}</a>}
                />
              )}
              {payment.receivedNote && <InfoRow label="Note" value={`"${payment.receivedNote}"`} />}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              {isAccCMG && payment.status === 'Submitted' && payment.invoiceNo
                ? 'Ready to confirm payment receipt.'
                : 'Awaiting payment from client.'}
            </p>
          )}

          {isAccCMG && payment.status === 'Submitted' && payment.invoiceNo && !payment.receivedDate && (
            <div className="mt-3">
              <Button variant="emerald" size="sm" icon={CheckCircle2} onClick={() => onAction?.('received')}>
                Confirm Receipt
              </Button>
            </div>
          )}
        </StepSection>
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

/* ─── Visual Workflow Stepper ─────────────────────────────────────────────── */
function WorkflowStepper({ payment, USERS }) {
  const currentStep =
    payment.status === 'Received'    ? 3 :
    payment.status === 'Submitted'   ? 2 :
    payment.status === 'In Progress' ? 1 : 1
  const isRejected = payment.status === 'Rejected'

  const steps = [
    {
      num: 1,
      label: 'Internal Approval',
      sublabel: 'QsEng submits → PM reviews',
      icon: Clock,
      doneIcon: CheckCircle2,
      statusLabel: isRejected ? 'Rejected' : currentStep > 1 ? 'Approved' : 'In Progress',
      statusVariant: isRejected ? 'rose' : currentStep > 1 ? 'emerald' : 'amber',
    },
    {
      num: 2,
      label: 'Invoice Sent',
      sublabel: 'QsEng issues invoice to client',
      icon: Send,
      doneIcon: CheckCircle2,
      statusLabel: currentStep > 2 ? 'Sent' : currentStep === 2 ? 'Waiting Pay' : 'Pending',
      statusVariant: currentStep > 2 ? 'emerald' : currentStep === 2 ? 'blue' : 'slate',
    },
    {
      num: 3,
      label: 'Payment Received',
      sublabel: 'AccCMG confirms receipt',
      icon: Banknote,
      doneIcon: CheckCircle2,
      statusLabel: currentStep === 3 ? 'Received' : 'Pending',
      statusVariant: currentStep === 3 ? 'emerald' : 'slate',
    },
  ]

  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-2">
        {steps.map((step, i) => {
          const done   = currentStep > step.num
          const active = currentStep === step.num
          const Icon   = done ? step.doneIcon : step.icon
          const rejected = active && isRejected

          return (
            <div key={step.num} className="flex items-start gap-0 flex-1">
              {/* Step node */}
              <div className="flex flex-col items-center flex-1">
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  done     && 'bg-emerald-500 border-emerald-500',
                  active && !rejected && 'bg-blue-600 border-blue-600',
                  rejected && 'bg-rose-500 border-rose-500',
                  !done && !active && 'bg-white border-slate-300',
                )}>
                  <Icon size={18} className={clsx(
                    done || active ? 'text-white' : 'text-slate-400'
                  )} />
                </div>
                <div className="mt-2 text-center">
                  <p className={clsx(
                    'text-xs font-semibold',
                    done     && 'text-emerald-700',
                    active && !rejected && 'text-blue-700',
                    rejected && 'text-rose-600',
                    !done && !active && 'text-slate-400',
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{step.sublabel}</p>
                  <Badge variant={step.statusVariant} className="mt-1.5 text-[9px]">
                    {rejected && step.num === 1 ? 'Rejected' : step.statusLabel}
                  </Badge>
                </div>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="flex items-center mt-5 shrink-0 w-8">
                  <div className={clsx(
                    'w-full h-0.5 transition-all',
                    currentStep > step.num ? 'bg-emerald-400' : 'bg-slate-200'
                  )} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step Section wrapper ────────────────────────────────────────────────── */
function StepSection({ step, title, subtitle, children, locked = false, color = 'blue' }) {
  const colorMap = {
    blue:    { border: 'border-blue-200',    bg: 'bg-blue-600',    num: 'bg-blue-600' },
    emerald: { border: 'border-emerald-200', bg: 'bg-emerald-600', num: 'bg-emerald-600' },
  }
  const c = colorMap[color] ?? colorMap.blue

  return (
    <div className={clsx(
      'rounded-xl border overflow-hidden transition-all',
      locked ? 'border-slate-100 opacity-60' : c.border
    )}>
      <div className={clsx(
        'flex items-center gap-3 px-4 py-2.5',
        locked ? 'bg-slate-100' : c.bg
      )}>
        <div className={clsx(
          'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
          locked ? 'bg-slate-300 text-slate-500' : 'bg-white/20 text-white'
        )}>
          {step}
        </div>
        <div>
          <p className={clsx('text-sm font-semibold', locked ? 'text-slate-500' : 'text-white')}>{title}</p>
          <p className={clsx('text-[10px]', locked ? 'text-slate-400' : 'text-white/70')}>{subtitle}</p>
        </div>
      </div>
      <div className="p-4 bg-white">
        {children}
      </div>
    </div>
  )
}
