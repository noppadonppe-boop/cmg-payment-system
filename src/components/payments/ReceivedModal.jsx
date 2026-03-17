import { useState } from 'react'
import { CheckCircle2, Calendar, Banknote } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea } from '../ui/FormField'
import { AttachmentField } from '../ui/AttachmentField'
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

  const [form, setForm] = useState({
    receivedDate: new Date().toISOString().split('T')[0],
    receivedAttachment: '',
    receivedNote: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const validate = () => {
    const errs = {}
    if (!form.receivedDate) errs.receivedDate = 'Received date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    updatePayment(payment.id, {
      status:             'Received',
      receivedDate:       form.receivedDate,
      receivedAttachment: form.receivedAttachment,
      receivedNote:       form.receivedNote,
      receivedBy:         currentUser.id,
      receivedAt:         new Date().toISOString().split('T')[0],
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title="Confirm Payment Received"
      subtitle="Step 3 — AccCMG Payment Receipt Confirmation"
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
            <Badge variant="blue">Invoice Submitted</Badge>
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
        </div>

        {/* Receipt confirmation fields */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
            <CheckCircle2 size={14} className="text-emerald-100" />
            <span className="text-sm font-semibold text-white">Payment Receipt Details</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Date Payment Received" required error={errors.receivedDate}>
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

            <FormField label="Receipt / Bank Slip Attachment">
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
          Confirming receipt will mark this payment as <strong>"Received"</strong> and complete the payment workflow. QsEng, PM, GM, and MD will be notified.
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="emerald" icon={CheckCircle2} loading={saving} onClick={handleSubmit}>
          Confirm Payment Received
        </Button>
      </div>
    </Modal>
  )
}
