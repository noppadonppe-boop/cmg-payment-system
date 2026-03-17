import { useState } from 'react'
import { CheckCircle2, XCircle, FileText, Calculator, User, Calendar, Paperclip } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Textarea } from '../ui/FormField'
import { AttachmentLink } from '../ui/AttachmentField'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from './PaymentCreateModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

export default function ApproveModal({ payment, onClose }) {
  const { updatePayment } = useData()
  const { currentUser, USERS } = useAuth()

  const [action, setAction] = useState(null) // 'approve' | 'reject'
  const [rejectNote, setRejectNote] = useState('')
  const [saving, setSaving] = useState(false)

  const creator = USERS.find(u => u.id === payment.createdBy)

  const handleApprove = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    updatePayment(payment.id, {
      status: 'Submitted',
      approvedBy: currentUser.id,
      approvedAt: new Date().toISOString().split('T')[0],
      rejectionNote: null,
    })
    setSaving(false)
    onClose()
  }

  const handleReject = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    updatePayment(payment.id, {
      status: 'Rejected',
      rejectedBy: currentUser.id,
      rejectedAt: new Date().toISOString().split('T')[0],
      rejectionNote: rejectNote,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title="Review Payment Claim"
      subtitle="Step 1 — PM Approval Decision"
      onClose={onClose}
    >
      {/* Payment Summary */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-300" />
              <span className="text-sm font-semibold text-white">{payment.paymentNo}</span>
            </div>
            <Badge variant="amber">Pending Approval</Badge>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-slate-700">{payment.detail}</p>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <User size={11} /> {creator?.name ?? '—'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={11} /> Submitted {payment.createdAt}
              </span>
              {payment.attachment && (
                <AttachmentLink value={payment.attachment} className="flex items-center gap-1" />
              )}
            </div>

            {payment.note && (
              <p className="text-xs text-slate-500 italic bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                "{payment.note}"
              </p>
            )}
          </div>
        </div>

        {/* Financial breakdown */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200">
            <Calculator size={14} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Financial Breakdown</span>
          </div>
          <div className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Claim Value</span>
                <span className="font-semibold text-slate-800">{fmtCurrency(payment.value)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Advance Deduction</span>
                <span className="font-medium text-rose-500">− {fmtCurrency(payment.advanceDeduction)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-slate-500">Retention Reduce</span>
                <span className="font-medium text-rose-500">− {fmtCurrency(payment.retentionReduce)}</span>
              </div>
              <div className="flex justify-between items-center py-2 bg-emerald-50 px-3 rounded-lg mt-1">
                <span className="font-semibold text-slate-700">Balance Payable</span>
                <span className="text-lg font-bold text-emerald-700">{fmtCurrency(payment.balanceValue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decision buttons */}
        {!action && (
          <div className="flex gap-3">
            <button
              onClick={() => setAction('reject')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-700 font-semibold text-sm hover:bg-rose-100 hover:border-rose-300 transition-all"
            >
              <XCircle size={18} /> Reject
            </button>
            <button
              onClick={() => setAction('approve')}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 hover:border-emerald-300 transition-all"
            >
              <CheckCircle2 size={18} /> Approve
            </button>
          </div>
        )}

        {/* Approve confirm */}
        {action === 'approve' && (
          <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={18} />
              <span className="font-semibold text-sm">Confirm Approval</span>
            </div>
            <p className="text-sm text-slate-600">
              Approving this claim will advance it to <strong>Step 2: Invoice Submission</strong>.
              QsEng will be notified to issue the official invoice to the client.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setAction(null)}>Back</Button>
              <Button variant="emerald" size="sm" icon={CheckCircle2} loading={saving} onClick={handleApprove}>
                Confirm Approve
              </Button>
            </div>
          </div>
        )}

        {/* Reject form */}
        {action === 'reject' && (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-700">
              <XCircle size={18} />
              <span className="font-semibold text-sm">Confirm Rejection</span>
            </div>
            <p className="text-sm text-slate-600">
              Provide a reason so QsEng can revise and resubmit the claim.
            </p>
            <FormField label="Rejection Reason">
              <Textarea
                rows={3}
                placeholder="Explain what needs to be corrected..."
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
              />
            </FormField>
            <div className="flex gap-2 pt-1">
              <Button variant="secondary" size="sm" onClick={() => setAction(null)}>Back</Button>
              <Button variant="danger" size="sm" icon={XCircle} loading={saving} onClick={handleReject}>
                Confirm Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
