import { useState } from 'react'
import { GitMerge, Save, CheckCircle2, GitPullRequest } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea } from '../ui/FormField'
import { AttachmentField } from '../ui/AttachmentField'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { Modal } from '../payments/PaymentCreateModal'
import { clsx } from 'clsx'

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function parseCurrency(val) {
  return parseFloat(String(val || '').replace(/,/g, '')) || 0
}

function fmtInput(val) {
  const n = parseCurrency(val)
  if (!n && n !== 0) return ''
  return n.toLocaleString('en-US')
}

export default function ConvertToCOAModal({ cor, onClose, onDone }) {
  const { addCOA, coas, projects } = useData()
  const { currentUser } = useAuth()

  const project = projects.find(p => p.id === cor.projectId)

  // Auto-generate COA number
  const existingCOAs = coas.filter(c => c.projectId === cor.projectId).length
  const prefix = project?.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3) ?? 'PRJ'
  const autoCoaNo = `COA-${prefix}-${String(existingCOAs + 1).padStart(3, '0')}`

  const [form, setForm] = useState({
    coaNo:       autoCoaNo,
    description: cor.detail,
    value:       String(cor.value),
    attachment:  '',
    note:        '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const validate = () => {
    const errs = {}
    if (!form.coaNo.trim())       errs.coaNo       = 'COA number is required'
    if (!form.description.trim()) errs.description  = 'Description is required'
    if (!form.value || parseCurrency(form.value) <= 0) errs.value = 'Valid value is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    addCOA({
      projectId:   cor.projectId,
      corId:       cor.id,
      coaNo:       form.coaNo,
      description: form.description,
      value:       parseCurrency(form.value),
      attachment:  form.attachment,
      note:        form.note,
      approvedBy:  currentUser.id,
    })
    setSaving(false)
    onDone()
  }

  return (
    <Modal
      title="Convert COR to COA"
      subtitle="Stage 4.1 Step 2 — PM Exclusive: Change Order Approval"
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Source COR summary */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
            <GitPullRequest size={14} className="text-blue-100" />
            <span className="text-sm font-semibold text-white">Source COR</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">COR No.</p>
              <p className="font-semibold text-blue-800 mt-0.5">{cor.corNo}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Project</p>
              <p className="font-medium text-slate-700 mt-0.5">{project?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">COR Value</p>
              <p className="font-bold text-blue-800 mt-0.5">{fmtCurrency(cor.value)}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">COR Detail</p>
              <p className="text-slate-600 mt-0.5 text-xs">{cor.detail}</p>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wide">Reason</p>
              <p className="text-slate-500 italic text-xs mt-0.5">"{cor.reason}"</p>
            </div>
          </div>
        </div>

        {/* COA Form */}
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
            <GitMerge size={14} className="text-emerald-100" />
            <span className="text-sm font-semibold text-white">COA Details</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="COA No." required error={errors.coaNo}>
                <Input
                  placeholder="e.g. COA-CPT-001"
                  value={form.coaNo}
                  onChange={e => set('coaNo', e.target.value)}
                  error={errors.coaNo}
                />
              </FormField>

              <FormField label="Approved Value (฿)" required error={errors.value}>
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

              <FormField label="Description" required error={errors.description} className="sm:col-span-2">
                <Textarea
                  rows={3}
                  placeholder="Official description of the approved change order..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  error={errors.description}
                />
              </FormField>

              <FormField label="Attachment (Client Approval Doc)">
                <AttachmentField
                  value={form.attachment}
                  onChange={v => set('attachment', v)}
                  folder="coa"
                  docId={cor?.id}
                  uploadedBy={currentUser?.id}
                  placeholder="Filename or URL หรือกด Upload"
                />
              </FormField>

              <FormField label="Note">
                <Textarea
                  rows={2}
                  placeholder="e.g. Approved by client via letter dated..."
                  value={form.note}
                  onChange={e => set('note', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Value comparison */}
        {parseCurrency(form.value) !== cor.value && parseCurrency(form.value) > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <div className="text-xs text-amber-800">
              <span className="font-semibold">Note:</span> COA value (
              <span className="font-bold">{fmtCurrency(parseCurrency(form.value))}</span>
              ) differs from the original COR value (
              <span className="font-bold">{fmtCurrency(cor.value)}</span>
              ). This is allowed if the client negotiated a different amount.
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
          Converting this COR will create a new COA record and lock the COR from further editing.
          The COA can then be tracked through the standard <strong>3-step payment workflow</strong>.
        </p>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="emerald" icon={GitMerge} loading={saving} onClick={handleSubmit}>
          Confirm — Create COA
        </Button>
      </div>
    </Modal>
  )
}
