import { useState } from 'react'
import { AlertCircle, Send } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Textarea } from '../ui/FormField'
import Button from '../ui/Button'
import { Modal } from './PaymentCreateModal'

export default function RequestRevisionModal({ payment, onClose }) {
  const { updatePayment } = useData()
  const { currentUser, can } = useAuth()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Determine who is requesting
  const isQsENG = can('canCreateClaims')
  const isAccCMG = can('canUpdateBonds')
  
  // Map old status to new for backward compatibility
  let status = payment.status
  if (status === 'Submitted') status = 'PM Approved' // Old 'Submitted' after PM approval
  
  // Determine the context
  const isFromPMApproved = status === 'PM Approved' // QsENG requesting edit after PM approval
  const isFromInvoicePMApproved = status === 'Invoice PM Approved' // AccCMG requesting edit

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('กรุณาระบุเหตุผลในการขอแก้ไข')
      return
    }

    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      if (isFromInvoicePMApproved && isAccCMG) {
        // AccCMG requesting edit - change status back to Invoice PM Rejected
        await updatePayment(payment.id, {
          status: 'Invoice PM Rejected',
          invoiceRejectedBy: currentUser.id,
          invoiceRejectedAt: today,
          invoiceRejectionNote: reason.trim(),
        })
      } else if (isFromPMApproved && isQsENG) {
        // QsENG requesting revision after PM approval
        await updatePayment(payment.id, {
          revisionRequest: {
            status: 'Pending',
            reason: reason.trim(),
            requestedBy: currentUser.id,
            requestedAt: today,
          }
        })
      }
      
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isFromInvoicePMApproved ? "Request Invoice Edit" : "Request Revision"}
      subtitle={`${payment.paymentNo} - ${isFromInvoicePMApproved ? 'ขอแก้ไข Invoice' : 'ขอแก้ไข Payment ที่ Submit แล้ว'}`}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
          <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold">{isFromInvoicePMApproved ? 'การขอแก้ไข Invoice' : 'การขอแก้ไข Payment'}</p>
            <p className="mt-1">
              {isFromInvoicePMApproved 
                ? 'Invoice จะถูกส่งกลับไปให้ QsENG แก้ไขและ Submit ใหม่'
                : 'เมื่อ PM อนุมัติคำขอแก้ไขแล้ว Payment นี้จะเพิ่ม Rev. และเปลี่ยนสถานะเป็น Draft คุณจะสามารถแก้ไขและ Submit ใหม่ได้'
              }
            </p>
          </div>
        </div>

        <FormField 
          label="เหตุผลในการขอแก้ไข" 
          required 
          error={error}
        >
          <Textarea
            rows={4}
            placeholder="กรุณาระบุเหตุผลที่ต้องการแก้ไข Payment นี้..."
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
          {isFromInvoicePMApproved ? 'Send Request' : 'Send Request to PM'}
        </Button>
      </div>
    </Modal>
  )
}
