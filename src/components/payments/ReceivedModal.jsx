import { useState } from 'react'
import { CheckCircle2, Calendar, Banknote, Paperclip, Link } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea } from '../ui/FormField'
import { AttachmentField, AttachmentLink } from '../ui/AttachmentField'
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

export default function ReceivedModal({ payment, onClose }) {
  const { updatePayment } = useData()
  const { currentUser } = useAuth()

  // Map old status
  let status = payment.status
  if (status === 'Submitted') status = 'Invoice Submitted'
  if (status === 'Invoice PM Approved') status = 'Invoice Submitted'

  // Determine which stage
  const isAccepting = status === 'Invoice Submitted'              // Stage 3: Accept receipt
  const isConfirmingReceive = status === 'Income Confirm Pending'  // Stage 3.1: Confirm Receive + upload

  const [form, setForm] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    receivedAttachment: '',
    receivedNote: '',
    incomeConfirmedDate: payment.incomeConfirmedDate || new Date().toISOString().split('T')[0],
    incomeConfirmedAmount: payment.incomeConfirmedAmount || payment.balanceValue || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const validate = () => {
    const errs = {}
    if (!form.receivedDate) errs.receivedDate = 'Date is required'
    if (!form.incomeConfirmedAmount) errs.incomeConfirmedAmount = 'Amount is required'
    if (isConfirmingReceive && !form.receivedAttachment) {
      errs.receivedAttachment = 'Attachment is required to complete payment'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))

    let updates = {}

    if (isAccepting) {
      // Stage 3: Accept — move to Income Confirm Pending
      updates = {
        status: 'Income Confirm Pending',
        acceptedBy: currentUser.id,
        acceptedAt: new Date().toISOString().split('T')[0],
        receivedDate: form.receivedDate,
        incomeConfirmedDate: form.receivedDate,
        incomeConfirmedAmount: parseCurrency(form.incomeConfirmedAmount),
        incomeConfirmedBy: currentUser.id,
        incomeConfirmedAt: new Date().toISOString().split('T')[0],
        receivedNote: form.receivedNote,
      }
    } else if (isConfirmingReceive) {
      // Stage 3.1: Confirm Receive — upload attachment → Completed
      updates = {
        status: 'Completed',
        receivedBy: currentUser.id,
        receivedAt: new Date().toISOString().split('T')[0],
        receivedDate: form.receivedDate,
        receivedAttachment: form.receivedAttachment,
        receivedNote: form.receivedNote,
        incomeConfirmedAmount: parseCurrency(form.incomeConfirmedAmount),
      }
    }

    updatePayment(payment.id, updates)
    setSaving(false)
    onClose()
  }

  function parseCurrency(val) {
    return parseFloat(String(val || '').replace(/,/g, '')) || 0
  }

  const isStage31 = isConfirmingReceive

  return (
    <Modal
      title={isStage31 ? 'Confirm Receive' : 'Accept Payment'}
      subtitle={isStage31 ? 'Stage 3.1 — Confirm Receive & Upload Attachment' : 'Stage 3 — Accept Payment from Client'}
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Invoice summary */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">{payment.paymentNo}</span>
            </div>
            <Badge variant="blue">{isStage31 ? 'Income Confirm Pending' : 'Invoice Submitted'}</Badge>
          </div>
          <p className="text-sm text-slate-600">{payment.detail}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            {[
              { label: 'Invoice No.', value: payment.invoiceNo ?? '—' },
              { label: 'Due Date', value: fmtDate(payment.invoiceDueDate) },
              { label: 'Balance Payable', value: fmtCurrency(payment.balanceValue), highlight: true },
              { label: 'Invoice Issued', value: fmtDate(payment.invoiceSubmittedAt) },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{item.label}</p>
                <p className={clsx('text-sm font-semibold mt-0.5', item.highlight ? 'text-emerald-700 text-base' : 'text-slate-700')}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {payment.invoiceNote && (
            <p className="text-xs text-slate-500 italic">"{payment.invoiceNote}"</p>
          )}

          {/* Client Signed Document URL */}
          {payment.clientSignedDoc && (
            <div className="pt-1 border-t border-blue-100">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Paperclip size={10} />
                Client Signed Document
              </p>
              <AttachmentLink value={payment.clientSignedDoc} className="flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-medium" />
            </div>
          )}
        </div>

        {/* Stage 3.1 info banner — shown only when in Stage 3.1 */}
        {isStage31 && payment.acceptedAt && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <CheckCircle2 size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700">
              <p className="font-semibold">Payment Accepted — Pending Confirmation</p>
              <p className="mt-0.5">Accepted on {fmtDate(payment.acceptedAt)}. Please upload the bank slip or receipt to complete.</p>
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className={clsx('flex items-center gap-2 px-4 py-2.5', isStage31 ? 'bg-emerald-600' : 'bg-blue-600')}>
            <CheckCircle2 size={14} className={isStage31 ? 'text-emerald-100' : 'text-blue-100'} />
            <span className="text-sm font-semibold text-white">
              {isStage31 ? 'Confirm Receive Details' : 'Accept Payment Details'}
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date Received" required error={errors.receivedDate}>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="date"
                  value={form.receivedDate}
                  onChange={e => set('receivedDate', e.target.value)}
                  error={errors.receivedDate}
                  className="pl-8"
                />
              </div>
            </FormField>

            <FormField label="Amount Received (฿)" required error={errors.incomeConfirmedAmount}>
              <Input
                type="number"
                value={form.incomeConfirmedAmount}
                onChange={e => set('incomeConfirmedAmount', e.target.value)}
                error={errors.incomeConfirmedAmount}
                placeholder="0.00"
              />
            </FormField>

            <FormField
              label={isStage31 ? 'Receipt / Bank Slip Attachment' : 'Receipt / Bank Slip Attachment (Optional)'}
              required={isStage31}
              error={errors.receivedAttachment}
              className="sm:col-span-2"
            >
              <AttachmentField
                value={form.receivedAttachment}
                onChange={v => set('receivedAttachment', v)}
                folder="payments"
                docId={payment?.projectId}
                uploadedBy={currentUser?.id}
                placeholder="Filename or URL หรือกด Upload"
              />
            </FormField>

            <FormField label="Note" className="sm:col-span-2">
              <Textarea
                rows={2}
                placeholder="e.g. Received via bank transfer, ref no..."
                value={form.receivedNote}
                onChange={e => set('receivedNote', e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <p className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          {isStage31
            ? 'การแนบหลักฐานการรับเงิน (Bank Slip) จะเปลี่ยนสถานะเป็น Completed (Stage 4). QsENG, PM, GM, and MD will be notified.'
            : 'การกด Accept จะเปลี่ยนสถานะเป็น Income Confirm Pending (Stage 3.1). กรุณาแนบหลักฐานในขั้นตอนถัดไปเพื่อ Complete.'
          }
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={isStage31 ? 'emerald' : 'primary'}
          icon={CheckCircle2}
          loading={saving}
          onClick={handleSubmit}
        >
          {isStage31 ? 'Confirm & Complete' : 'Accept'}
        </Button>
      </div>
    </Modal>
  )
}
