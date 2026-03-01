import { useState } from 'react'
import { X, Save, Calculator, Paperclip } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea, Select } from '../ui/FormField'
import Button from '../ui/Button'
import { clsx } from 'clsx'

function parseCurrency(val) {
  return parseFloat(String(val || '').replace(/,/g, '')) || 0
}

function fmtInput(val) {
  const n = parseCurrency(val)
  if (!n && n !== 0) return ''
  return n.toLocaleString('en-US')
}

export default function PaymentCreateModal({ projects, onClose }) {
  const { addPayment, payments } = useData()
  const { currentUser } = useAuth()

  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? '',
    paymentNo: '',
    detail: '',
    value: '',
    advanceDeduction: '',
    retentionReduce: '',
    attachment: '',
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  // Auto-generate payment number based on project
  const autoGenNo = () => {
    const proj = projects.find(p => p.id === form.projectId)
    if (!proj) return
    const existing = payments.filter(p => p.projectId === form.projectId && p.type === 'main').length
    const prefix = proj.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
    set('paymentNo', `PMT-${prefix}-${String(existing + 1).padStart(3, '0')}`)
  }

  const value = parseCurrency(form.value)
  const adv   = parseCurrency(form.advanceDeduction)
  const ret   = parseCurrency(form.retentionReduce)
  const balance = value - adv - ret

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
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    addPayment({
      projectId:        form.projectId,
      type:             'main',
      paymentNo:        form.paymentNo,
      detail:           form.detail,
      value,
      advanceDeduction: adv,
      retentionReduce:  ret,
      balanceValue:     balance,
      attachment:       form.attachment,
      note:             form.note,
      status:           'In Progress',
      createdBy:        currentUser.id,
      invoiceNo:        null, invoiceDueDate: null, invoiceNote: null,
      invoiceSubmittedAt: null,
      receivedDate: null, receivedAttachment: null, receivedNote: null,
      receivedBy: null, receivedAt: null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <Modal title="New Payment Claim" subtitle="Step 1 — Submit for PM Approval" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Project" required error={errors.projectId} className="sm:col-span-2">
            <Select value={form.projectId} onChange={e => set('projectId', e.target.value)} error={errors.projectId}>
              <option value="">— Select project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </FormField>

          <FormField label="Payment No." required error={errors.paymentNo}>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. PMT-CPT-001"
                value={form.paymentNo}
                onChange={e => set('paymentNo', e.target.value)}
                error={errors.paymentNo}
                className="flex-1"
              />
              <button
                type="button"
                onClick={autoGenNo}
                className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 shrink-0 transition-colors"
              >
                Auto
              </button>
            </div>
          </FormField>

          <FormField label="Attachment">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Filename or URL"
                value={form.attachment}
                onChange={e => set('attachment', e.target.value)}
                className="flex-1"
              />
              <button className="flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs shrink-0">
                <Paperclip size={13} />
              </button>
            </div>
          </FormField>

          <FormField label="Description" required error={errors.detail} className="sm:col-span-2">
            <Textarea
              rows={2}
              placeholder="Progress claim description, work items completed..."
              value={form.detail}
              onChange={e => set('detail', e.target.value)}
              error={errors.detail}
            />
          </FormField>
        </div>

        {/* Financial Calculation Section */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700">
            <Calculator size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-white">Financial Calculation</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Claim Value (฿)" required error={errors.value}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <Input
                    placeholder="0"
                    value={fmtInput(form.value)}
                    onChange={e => set('value', e.target.value.replace(/,/g, ''))}
                    error={errors.value}
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="Advance Deduction (฿)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <Input
                    placeholder="0"
                    value={fmtInput(form.advanceDeduction)}
                    onChange={e => set('advanceDeduction', e.target.value.replace(/,/g, ''))}
                    className="pl-7"
                  />
                </div>
              </FormField>
              <FormField label="Retention Reduce (฿)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
                  <Input
                    placeholder="0"
                    value={fmtInput(form.retentionReduce)}
                    onChange={e => set('retentionReduce', e.target.value.replace(/,/g, ''))}
                    className="pl-7"
                  />
                </div>
              </FormField>
            </div>

            {/* Balance Display */}
            <div className={clsx(
              'flex items-center justify-between px-4 py-3 rounded-lg border',
              balance >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
            )}>
              <div className="text-sm text-slate-600">
                <span className="font-medium">Balance Value</span>
                <span className="text-slate-400 ml-2 text-xs">= Claim − Advance − Retention</span>
              </div>
              <span className={clsx(
                'text-lg font-bold',
                balance >= 0 ? 'text-emerald-700' : 'text-rose-600'
              )}>
                ฿{balance.toLocaleString('en-US')}
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
          Submit for Approval
        </Button>
      </div>
    </Modal>
  )
}

export function Modal({ title, subtitle, onClose, children, maxWidth = 'max-w-2xl' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={clsx('relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[90vh]', maxWidth)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0 mt-0.5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
