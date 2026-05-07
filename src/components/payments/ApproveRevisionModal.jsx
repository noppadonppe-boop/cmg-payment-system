import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { deleteField } from 'firebase/firestore'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Textarea } from '../ui/FormField'
import Button from '../ui/Button'
import { Modal } from './PaymentCreateModal'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ApproveRevisionModal({ payment, onClose, action }) {
  const { updatePayment } = useData()
  const { currentUser, USERS } = useAuth()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const isApprove = action === 'approve'
  const requester = USERS.find(u => u.id === payment.revisionRequest?.requestedBy)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      
      if (isApprove) {
        // Approve: เพิ่ม Rev และเปลี่ยนเป็น Draft
        const currentRev = payment.revision || 0
        const newRev = currentRev + 1
        const basePaymentNo = payment.paymentNo.replace(/\s*Rev\.\d+$/, '')
        const newPaymentNo = `${basePaymentNo} Rev.${newRev}`
        
        await updatePayment(payment.id, {
          revision: newRev,
          paymentNo: newPaymentNo,
          status: 'Draft',
          revisionRequest: deleteField(),
          revisionApprovedBy: currentUser.id,
          revisionApprovedAt: today,
          revisionApprovalNote: note.trim() || null,
          // Clear invoice data if exists
          invoiceNo: deleteField(),
          invoiceDueDate: deleteField(),
          invoiceNote: deleteField(),
          invoiceSubmittedAt: deleteField(),
        })
      } else {
        // Reject: ลบ revision request
        await updatePayment(payment.id, {
          revisionRequest: deleteField(),
          revisionRejectedBy: currentUser.id,
          revisionRejectedAt: today,
          revisionRejectionNote: note.trim() || null,
        })
      }
      
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isApprove ? 'Approve Revision Request' : 'Reject Revision Request'}
      subtitle={payment.paymentNo}
      onClose={onClose}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="text-xs text-slate-600">
            <span className="font-semibold">Requested by:</span> {requester?.name || '—'}
          </div>
          <div className="text-xs text-slate-600">
            <span className="font-semibold">Requested on:</span> {fmtDate(payment.revisionRequest?.requestedAt)}
          </div>
          <div className="text-xs text-slate-600">
            <span className="font-semibold">Reason:</span>
            <p className="mt-1 text-slate-700">"{payment.revisionRequest?.reason}"</p>
          </div>
        </div>

        {isApprove && (
          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-700">
              <p className="font-semibold">การอนุมัติคำขอแก้ไข</p>
              <p className="mt-1">
                Payment นี้จะเพิ่ม Rev. และเปลี่ยนสถานะเป็น Draft 
                QS จะสามารถแก้ไขและ Submit ใหม่ได้
                {payment.invoiceNo && ' (Invoice ที่ออกไปแล้วจะถูกยกเลิก)'}
              </p>
            </div>
          </div>
        )}

        {!isApprove && (
          <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5">
            <XCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-700">
              <p className="font-semibold">การปฏิเสธคำขอแก้ไข</p>
              <p className="mt-1">
                Payment จะยังคงสถานะเดิม (Submitted) และ QS จะไม่สามารถแก้ไขได้
              </p>
            </div>
          </div>
        )}

        <FormField label="Note (Optional)">
          <Textarea
            rows={3}
            placeholder={isApprove ? 'เพิ่มหมายเหตุ (ถ้ามี)...' : 'เหตุผลในการปฏิเสธ (ถ้ามี)...'}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant={isApprove ? 'emerald' : 'rose'} 
          icon={isApprove ? CheckCircle2 : XCircle}
          loading={saving} 
          onClick={handleSubmit}
        >
          {isApprove ? 'Approve Revision' : 'Reject Request'}
        </Button>
      </div>
    </Modal>
  )
}
