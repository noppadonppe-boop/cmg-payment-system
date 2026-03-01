import { useState } from 'react'
import { Save, Paperclip, GitPullRequest } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { FormField, Input, Textarea, Select } from '../ui/FormField'
import Button from '../ui/Button'
import { Modal } from '../payments/PaymentCreateModal'
import { clsx } from 'clsx'

const COR_STATUSES = ['Prepare doc', 'Submitted', 'Rejected']

function parseCurrency(val) {
  return parseFloat(String(val || '').replace(/,/g, '')) || 0
}

function fmtInput(val) {
  const n = parseCurrency(val)
  if (!n && n !== 0) return ''
  return n.toLocaleString('en-US')
}

export default function CORCreateModal({ projects, cor: editCOR = null, onClose }) {
  const { addCOR, updateCOR, cors } = useData()
  const { currentUser } = useAuth()
  const isEditing = !!editCOR

  const [form, setForm] = useState({
    projectId:            editCOR?.projectId         ?? (projects[0]?.id ?? ''),
    corNo:                editCOR?.corNo              ?? '',
    detail:               editCOR?.detail             ?? '',
    reason:               editCOR?.reason             ?? '',
    value:                editCOR?.value              ?? '',
    submitDate:           editCOR?.submitDate         ?? new Date().toISOString().split('T')[0],
    expectedApprovalDate: editCOR?.expectedApprovalDate ?? '',
    status:               editCOR?.status             ?? 'Prepare doc',
    note:                 editCOR?.note               ?? '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    if (errors[k]) setErrors(p => { const e = { ...p }; delete e[k]; return e })
  }

  const autoGenNo = () => {
    const proj = projects.find(p => p.id === form.projectId)
    if (!proj) return
    const existing = cors.filter(c => c.projectId === form.projectId).length
    const prefix = proj.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
    set('corNo', `COR-${prefix}-${String(existing + 1).padStart(3, '0')}`)
  }

  const validate = () => {
    const errs = {}
    if (!form.projectId)        errs.projectId = 'Select a project'
    if (!form.corNo.trim())     errs.corNo     = 'COR number is required'
    if (!form.detail.trim())    errs.detail    = 'Detail is required'
    if (!form.reason.trim())    errs.reason    = 'Reason is required'
    if (!form.value || parseCurrency(form.value) <= 0) errs.value = 'Enter a valid value'
    if (!form.submitDate)       errs.submitDate = 'Submit date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 350))
    const payload = {
      projectId:            form.projectId,
      corNo:                form.corNo,
      detail:               form.detail,
      reason:               form.reason,
      value:                parseCurrency(form.value),
      submitDate:           form.submitDate,
      expectedApprovalDate: form.expectedApprovalDate,
      status:               form.status,
      note:                 form.note,
      createdBy:            currentUser.id,
    }
    if (isEditing) {
      updateCOR(editCOR.id, payload)
    } else {
      addCOR(payload)
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title={isEditing ? `Edit ${editCOR.corNo}` : 'New Change Order Request'}
      subtitle="Stage 4.1 Step 1 — COR submitted by QsEng"
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

          <FormField label="COR No." required error={errors.corNo}>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. COR-CPT-001"
                value={form.corNo}
                onChange={e => set('corNo', e.target.value)}
                error={errors.corNo}
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

          <FormField label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {COR_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </FormField>

          <FormField label="Detail / Description" required error={errors.detail} className="sm:col-span-2">
            <Textarea
              rows={3}
              placeholder="Describe the change order in detail..."
              value={form.detail}
              onChange={e => set('detail', e.target.value)}
              error={errors.detail}
            />
          </FormField>

          <FormField label="Reason" required error={errors.reason} className="sm:col-span-2">
            <Textarea
              rows={2}
              placeholder="Why is this change required? (e.g. design change, unforeseen condition...)"
              value={form.reason}
              onChange={e => set('reason', e.target.value)}
              error={errors.reason}
            />
          </FormField>

          <FormField label="COR Value (฿)" required error={errors.value}>
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

          <FormField label="Submit Date" required error={errors.submitDate}>
            <Input
              type="date"
              value={form.submitDate}
              onChange={e => set('submitDate', e.target.value)}
              error={errors.submitDate}
            />
          </FormField>

          <FormField label="Expected Approval Date">
            <Input
              type="date"
              value={form.expectedApprovalDate}
              onChange={e => set('expectedApprovalDate', e.target.value)}
            />
          </FormField>

          <FormField label="Note">
            <Textarea
              rows={2}
              placeholder="Additional notes..."
              value={form.note}
              onChange={e => set('note', e.target.value)}
            />
          </FormField>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={Save} loading={saving} onClick={handleSubmit}>
          {isEditing ? 'Save Changes' : 'Submit COR'}
        </Button>
      </div>
    </Modal>
  )
}
