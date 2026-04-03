import { useState, useEffect } from 'react'
import { X, Save, Calculator } from 'lucide-react'
import { deleteField } from 'firebase/firestore'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea, Select } from '../ui/FormField'
import { AttachmentField } from '../ui/AttachmentField'
import { calculatePaymentBalance } from '../../lib/paymentCalculations'
import Button from '../ui/Button'
import { Modal } from './PaymentCreateModal'
import { clsx } from 'clsx'

function parseCurrency(val) {
  return parseFloat(String(val || '').replace(/,/g, '')) || 0
}

function sanitizeCurrencyInput(val) {
  const cleaned = String(val ?? '').replace(/,/g, '').replace(/[^\d.]/g, '')
  if (!cleaned) return ''

  const [whole = '', ...decimalParts] = cleaned.split('.')
  const decimal = decimalParts.join('').slice(0, 2)
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0'

  if (cleaned.startsWith('.')) return `0.${decimal}`
  if (cleaned.includes('.')) return `${normalizedWhole}.${decimal}`
  return normalizedWhole
}

function fmtInput(val) {
  const raw = sanitizeCurrencyInput(val)
  if (!raw) return ''

  const hasDecimal = raw.includes('.')
  const [whole, decimal = ''] = raw.split('.')
  const formattedWhole = Number(whole || 0).toLocaleString('en-US')

  return hasDecimal ? `${formattedWhole}.${decimal}` : formattedWhole
}

export default function PaymentEditModal({ payment, projects, onClose, onSaved }) {
  const { updatePayment } = useData()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    projectId: '',
    paymentNo: '',
    detail: '',
    value: '',
    advanceDeduction: '',
    retentionReduce: '',
    withTaxPercent: '',
    attachment: '',
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!payment) return
    setForm({
      projectId: payment.projectId ?? '',
      paymentNo: payment.paymentNo ?? '',
      detail: payment.detail ?? '',
      value: payment.value != null ? String(payment.value) : '',
      advanceDeduction: payment.advanceDeduction != null ? String(payment.advanceDeduction) : '',
      retentionReduce: payment.retentionReduce != null ? String(payment.retentionReduce) : '',
      withTaxPercent: payment.withTaxPercent != null ? String(payment.withTaxPercent) : '',
      attachment: payment.attachment ?? '',
      note: payment.note ?? '',
    })
  }, [payment])

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const value = parseCurrency(form.value)
  const adv   = parseCurrency(form.advanceDeduction)
  const ret   = parseCurrency(form.retentionReduce)
  const withTaxPercent = parseCurrency(form.withTaxPercent)
  const { grossClaim, withTaxAmount, balanceValue: balance } = calculatePaymentBalance(value, adv, ret, withTaxPercent)

  const validate = () => {
    const errs = {}
    if (!form.projectId)        errs.projectId = 'Select a project'
    if (!form.paymentNo.trim()) errs.paymentNo = 'Payment number is required'
    if (!form.detail.trim())    errs.detail    = 'Description is required'
    if (!form.value || value <= 0) errs.value  = 'Enter a valid claim value'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate() || !payment?.id) return
    setSaving(true)
    try {
      await updatePayment(payment.id, {
        projectId:        form.projectId,
        paymentNo:        form.paymentNo,
        detail:           form.detail,
        value,
        advanceDeduction: adv,
        retentionReduce:  ret,
        withTaxPercent,
        withTaxValue:     withTaxAmount,
        grossClaimValue:  grossClaim,
        balanceValue:     balance,
        attachment:       form.attachment,
        note:             form.note,
        status:           'In Progress',
        rejectedAt:       deleteField(),
        rejectionNote:    deleteField(),
        rejectedBy:       deleteField(),
      })
      onSaved?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!payment) return null

  return (
    <Modal
      title="Edit Payment Claim"
      subtitle="แก้ไขแล้วส่งให้ PM อนุมัติอีกครั้ง (flow เริ่มใหม่)"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Project" required error={errors.projectId} className="sm:col-span-2">
            <Select value={form.projectId} onChange={e => set('projectId', e.target.value)} error={errors.projectId}>
              <option value="">— Select project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>

          <FormField label="Payment No." required error={errors.paymentNo}>
            <Input
              placeholder="e.g. PMT-CPT-001"
              value={form.paymentNo}
              onChange={e => set('paymentNo', e.target.value)}
              error={errors.paymentNo}
            />
          </FormField>

          <FormField label="Attachment">
            <AttachmentField
              value={form.attachment}
              onChange={v => set('attachment', v)}
              folder="payments"
              docId={form.projectId}
              uploadedBy={currentUser?.id}
              placeholder="Filename or URL หรือกด Upload"
            />
          </FormField>

          <FormField label="Description" required error={errors.detail} className="sm:col-span-2">
            <Textarea
              rows={2}
              placeholder="Progress claim description..."
              value={form.detail}
              onChange={e => set('detail', e.target.value)}
              error={errors.detail}
            />
          </FormField>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700">
            <Calculator size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-white">Financial Calculation</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <FormField label="Claim Value (฿)" required error={errors.value}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={fmtInput(form.value)}
                    onChange={e => set('value', sanitizeCurrencyInput(e.target.value))}
                    error={errors.value}
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="Advance Deduction (฿)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={fmtInput(form.advanceDeduction)}
                    onChange={e => set('advanceDeduction', sanitizeCurrencyInput(e.target.value))}
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="Retention Reduce (฿)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <Input
                    inputMode="decimal"
                    placeholder="0"
                    value={fmtInput(form.retentionReduce)}
                    onChange={e => set('retentionReduce', sanitizeCurrencyInput(e.target.value))}
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="With Tax (%)">
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    placeholder="0.00"
                    value={fmtInput(form.withTaxPercent)}
                    onChange={e => set('withTaxPercent', sanitizeCurrencyInput(e.target.value))}
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </FormField>
            </div>
            <div className={clsx(
              'flex items-center justify-between px-4 py-3 rounded-lg border',
              balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            )}>
              <div className="text-sm text-slate-600">
                <span className="font-medium">Balance Value</span>
                <span className="text-slate-400 ml-2 text-xs">= Claim x 1.07 - Advance - Retention - With Tax</span>
              </div>
              <span className={clsx('text-lg font-bold', balance >= 0 ? 'text-emerald-700' : 'text-rose-600')}>
                ฿{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <FormField label="Note">
          <Textarea rows={2} placeholder="Additional notes..." value={form.note} onChange={e => set('note', e.target.value)} />
        </FormField>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Save} loading={saving} onClick={handleSubmit}>
          Save & Resubmit for Approval
        </Button>
      </div>
    </Modal>
  )
}
