import { useState } from 'react'
import { AlertCircle, Send, FileText, RotateCcw } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Textarea } from '../ui/FormField'
import Button from '../ui/Button'
import { Modal } from './PaymentCreateModal'
import { clsx } from 'clsx'

export default function RequestRevisionModal({ payment, onClose }) {
  const { updatePayment } = useData()
  const { currentUser, can } = useAuth()
  const [revisionType, setRevisionType] = useState(null) // 'payment' | 'invoice'
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isQsENG = can('canCreateClaims')

  // Map old status
  let status = payment.status
  if (status === 'Submitted') status = 'Invoice Submitted'
  if (status === 'Invoice PM Approved') status = 'Invoice Submitted'

  // Determine if invoice has been created
  const hasInvoice = !!payment.invoiceNo || status.startsWith('Invoice') || status === 'Client Sign Pending' || status === 'Invoice Submitted'
  const isFromPMApproved = status === 'PM Approved'

  const handleSubmit = async () => {
    if (!revisionType) {
      setError('กรุณาเลือกประเภทการแก้ไข')
      return
    }
    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลในการขอแก้ไข')
      return
    }

    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      if (revisionType === 'payment') {
        if (isFromPMApproved && isQsENG) {
          // QsENG at PM Approved — create revision request for PM to approve
          await updatePayment(payment.id, {
            revisionRequest: {
              status: 'Pending',
              reason: reason.trim(),
              requestedBy: currentUser.id,
              requestedAt: today,
            }
          })
        } else {
          // From invoice stage — send back to PM Rejected, clear invoice data
          await updatePayment(payment.id, {
            status: 'PM Rejected',
            rejectedBy: currentUser.id,
            rejectedAt: today,
            rejectionNote: reason.trim(),
            // Clear invoice data
            invoiceNo: null,
            invoiceDate: null,
            invoiceDueDate: null,
            invoiceNote: null,
            invoiceCreatedAt: null,
            invoiceSubmittedAt: null,
            invoiceIssuedBy: null,
            paymentApprovedDoc: null,
            clientSignedDoc: null,
            clientSignedAt: null,
            invoiceApprovedBy: null,
            invoiceApprovedAt: null,
            invoiceRejectedBy: null,
            invoiceRejectedAt: null,
            invoiceRejectionNote: null,
          })
        }
      } else if (revisionType === 'invoice') {
        // Send back to Invoice PM Rejected for invoice editing
        await updatePayment(payment.id, {
          status: 'Invoice PM Rejected',
          invoiceRejectedBy: currentUser.id,
          invoiceRejectedAt: today,
          invoiceRejectionNote: reason.trim(),
        })
      }

      onClose()
    } finally {
      setSaving(false)
    }
  }

  const options = [
    {
      key: 'payment',
      label: 'แก้ไข Payment',
      desc: hasInvoice
        ? 'ส่งกลับไปให้ QsENG แก้ไข Payment Claim ใหม่ (Invoice ที่สร้างไว้จะถูกล้าง)'
        : 'ส่งคำขอให้ PM อนุมัติการแก้ไข Payment',
      icon: RotateCcw,
      available: true,
    },
    {
      key: 'invoice',
      label: 'แก้ไข Invoice',
      desc: 'ส่งกลับไปให้ QsENG แก้ไข Invoice และ Upload เอกสารใหม่',
      icon: FileText,
      available: hasInvoice,
    },
  ]

  return (
    <Modal
      title="Request Revision"
      subtitle={`${payment.paymentNo} — เลือกประเภทการแก้ไขที่ต้องการ`}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold">ขอแก้ไข Payment / Invoice</p>
            <p className="mt-1">
              เลือกประเภทการแก้ไขที่ต้องการ ระบบจะส่งกลับไปยังขั้นตอนที่เลือกโดยอัตโนมัติ
            </p>
          </div>
        </div>

        {/* Option Cards */}
        <div className="space-y-2">
          {options.filter(o => o.available).map(opt => {
            const Icon = opt.icon
            const selected = revisionType === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setRevisionType(opt.key)
                  if (error) setError('')
                }}
                className={clsx(
                  'w-full text-left rounded-xl border p-3 transition-all',
                  selected
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  )}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={clsx('text-sm font-semibold', selected ? 'text-blue-800' : 'text-slate-700')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <div className={clsx(
                    'w-5 h-5 rounded-full border-2 shrink-0 ml-auto',
                    selected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  )}>
                    {selected && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <FormField
          label="เหตุผลในการขอแก้ไข"
          required
          error={error}
        >
          <Textarea
            rows={4}
            placeholder="กรุณาระบุเหตุผลที่ต้องการแก้ไข..."
            value={reason}
            onChange={e => {
              setReason(e.target.value)
              if (error) setError('')
            }}
            error={error}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          icon={Send}
          loading={saving}
          onClick={handleSubmit}
        >
          Send Request
        </Button>
      </div>
    </Modal>
  )
}
