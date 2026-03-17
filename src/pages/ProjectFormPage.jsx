import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Info, FileText, Shield, ShieldCheck, Receipt, AlertTriangle,
  ChevronRight, Save, ArrowLeft, Check, Paperclip, Plus, Trash2
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { FormField, Input, Textarea, Select, Toggle } from '../components/ui/FormField'
import { AttachmentField } from '../components/ui/AttachmentField'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'
import { clsx } from 'clsx'

const TABS = [
  { id: 'general',   label: 'General',     icon: Info,         part: 'Part 1' },
  { id: 'contract',  label: 'Contract',    icon: FileText,     part: 'Part 2' },
  { id: 'bank-bond', label: 'Bank Bond',   icon: Shield,       part: 'Part 3' },
  { id: 'insurance', label: 'Insurance',   icon: ShieldCheck,  part: 'Part 4' },
  { id: 'tax',       label: 'Tax Record',  icon: Receipt,      part: 'Part 5' },
  { id: 'condition', label: 'Conditions',  icon: AlertTriangle,part: 'Part 6' },
]

const CONTRACT_TYPES = ['Lump Sum', 'Unit Rate', 'Cost Plus', 'GMP', 'Design & Build', 'Framework']
const TAX_STATUS_OPTIONS = ['N/A', 'Not yet', 'Complete pay']
const INSURANCE_TYPES = ['CAR', 'TPL', 'WC', 'EAR', 'Marine', 'Other']

const EMPTY_BOND = { percent: '', value: '', bankName: '', attachment: '', startDate: '', endDate: '', note: '' }
const EMPTY_INSURANCE = { id: '', no: '', name: '', detail: '', type: '', note: '' }

const EMPTY_FORM = {
  name: '', location: '', pmId: '', cmId: '', cm: '', mainContractor: '', subContractor: '', clientName: '',
  contractNo: '', poNo: '', contractValue: '', contractAttachment: '', startDate: '', finishDate: '',
  contractType: 'Lump Sum', retentionRequired: false, retentionPercent: '', contractNote: '',
  performanceBond: { ...EMPTY_BOND },
  advanceBond:     { ...EMPTY_BOND },
  warrantyBond:    { ...EMPTY_BOND },
  insurances: [
    { ...EMPTY_INSURANCE, id: 'i1' },
    { ...EMPTY_INSURANCE, id: 'i2' },
    { ...EMPTY_INSURANCE, id: 'i3' },
  ],
  taxPay: '', taxStatusPay: 'N/A', taxNote: '',
  contractPenalty: '', otherConditions: '', conditionNote: '',
}

function formatCurrencyInput(val) {
  if (!val && val !== 0) return ''
  const num = parseFloat(String(val).replace(/,/g, ''))
  if (isNaN(num)) return val
  return num.toLocaleString('en-US')
}

function parseCurrency(val) {
  if (!val) return ''
  return String(val).replace(/,/g, '')
}

export default function ProjectFormPage() {
  const { id } = useParams()
  const isEditing = !!id
  const navigate = useNavigate()
  const { getProject, addProject, updateProject } = useData()
  const { can, USERS, currentUser } = useAuth()

  const [activeTab, setActiveTab] = useState('general')
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const pmUsers = USERS.filter(u => (u.roles && u.roles.includes('PM')) || u.role === 'PM')
  const cmUsers = USERS.filter(u => (u.roles && u.roles.includes('CM')) || u.role === 'CM')

  useEffect(() => {
    if (isEditing) {
      const project = getProject(id)
      if (project) {
        const cmList = USERS.filter(u => (u.roles && u.roles.includes('CM')) || u.role === 'CM')
        const resolvedCmId = project.cmId ?? (project.cm && cmList.find(u => u.name === project.cm)?.id) ?? ''
        setForm({
          ...EMPTY_FORM,
          ...project,
          cmId: resolvedCmId,
          contractValue: project.contractValue ?? '',
          performanceBond: { ...EMPTY_BOND, ...(project.performanceBond || {}) },
          advanceBond:     { ...EMPTY_BOND, ...(project.advanceBond || {}) },
          warrantyBond:    { ...EMPTY_BOND, ...(project.warrantyBond || {}) },
          insurances: project.insurances?.length
            ? project.insurances.map((ins, i) => ({ ...EMPTY_INSURANCE, ...ins, id: ins.id || `i${i + 1}` }))
            : [{ ...EMPTY_INSURANCE, id: 'i1' }, { ...EMPTY_INSURANCE, id: 'i2' }, { ...EMPTY_INSURANCE, id: 'i3' }],
        })
      }
    }
  }, [id, isEditing, getProject, USERS])

  if (!can('canManageProjects')) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 gap-4">
        <Shield size={48} className="text-slate-300" />
        <p className="text-slate-600 font-semibold">Access Denied</p>
        <p className="text-slate-400 text-sm">You do not have permission to manage projects.</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/projects')}>Back to Projects</Button>
      </Card>
    )
  }

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e })
  }

  const setBond = (bondKey, field, value) => {
    setForm(prev => ({
      ...prev,
      [bondKey]: { ...prev[bondKey], [field]: value }
    }))
  }

  const setInsurance = (index, field, value) => {
    setForm(prev => {
      const ins = [...prev.insurances]
      ins[index] = { ...ins[index], [field]: value }
      return { ...prev, insurances: ins }
    })
  }

  const validate = () => {
    const errs = {}
    if (!form.name?.trim()) errs.name = 'Project name is required'
    if (!form.clientName?.trim()) errs.clientName = 'Client name is required'
    if (!form.contractNo?.trim()) errs.contractNo = 'Contract number is required'
    if (!form.contractValue || isNaN(parseCurrency(form.contractValue))) errs.contractValue = 'Valid contract value is required'
    if (!form.startDate) errs.startDate = 'Start date is required'
    if (!form.finishDate) errs.finishDate = 'Finish date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      const firstErrorTab = getFirstErrorTab(errors)
      if (firstErrorTab) setActiveTab(firstErrorTab)
      return
    }
    setSaving(true)
    const selectedCmName = cmUsers.find(u => u.id === form.cmId)?.name ?? form.cm
    const payload = {
      ...form,
      cm: selectedCmName,
      contractValue: parseFloat(parseCurrency(form.contractValue)) || 0,
      retentionPercent: parseFloat(form.retentionPercent) || 0,
    }
    if (isEditing) {
      await updateProject(id, payload)
    } else {
      await addProject(payload)
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); navigate('/projects') }, 800)
  }

  const getFirstErrorTab = (errs) => {
    const keys = Object.keys(errs)
    if (keys.some(k => ['name', 'location', 'pmId', 'clientName'].includes(k))) return 'general'
    if (keys.some(k => ['contractNo', 'contractValue', 'startDate', 'finishDate'].includes(k))) return 'contract'
    return null
  }

  const tabHasError = (tabId) => {
    const tabFields = {
      general:   ['name', 'location', 'clientName'],
      contract:  ['contractNo', 'contractValue', 'startDate', 'finishDate'],
    }
    return (tabFields[tabId] || []).some(f => !!errors[f])
  }

  const currentTabIndex = TABS.findIndex(t => t.id === activeTab)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isEditing ? 'Edit Project' : 'New Project'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEditing ? `Editing: ${form.name || '—'}` : 'Fill in all 6 parts to create a new project record'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => navigate('/projects')}>Cancel</Button>
          <Button
            icon={saved ? Check : Save}
            variant={saved ? 'emerald' : 'primary'}
            loading={saving}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Project'}
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {TABS.map((tab, i) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab
            const hasErr = tabHasError(tab.id)
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0',
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : hasErr
                    ? 'border-rose-400 text-rose-600 bg-rose-50/40 hover:bg-rose-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={15} className="shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="text-xs text-slate-400 hidden md:inline">({tab.part})</span>
                {hasErr && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'general'   && <TabGeneral   form={form} set={set} errors={errors} pmUsers={pmUsers} cmUsers={cmUsers} />}
          {activeTab === 'contract'  && <TabContract  form={form} set={set} errors={errors} projectId={id} currentUserId={currentUser?.id} />}
          {activeTab === 'bank-bond' && <TabBankBond  form={form} setBond={setBond} projectId={id} currentUserId={currentUser?.id} />}
          {activeTab === 'insurance' && <TabInsurance form={form} setInsurance={setInsurance} />}
          {activeTab === 'tax'       && <TabTax       form={form} set={set} />}
          {activeTab === 'condition' && <TabCondition form={form} set={set} />}
        </div>

        {/* Tab Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            size="sm"
            disabled={currentTabIndex === 0}
            onClick={() => setActiveTab(TABS[currentTabIndex - 1].id)}
          >
            Previous
          </Button>
          <span className="text-xs text-slate-400">{currentTabIndex + 1} / {TABS.length}</span>
          {currentTabIndex < TABS.length - 1 ? (
            <Button
              variant="secondary"
              iconRight={ChevronRight}
              size="sm"
              onClick={() => setActiveTab(TABS[currentTabIndex + 1].id)}
            >
              Next
            </Button>
          ) : (
            <Button
              icon={saved ? Check : Save}
              variant={saved ? 'emerald' : 'primary'}
              size="sm"
              loading={saving}
              onClick={handleSave}
            >
              {saved ? 'Saved!' : 'Save Project'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Part 1: General ─────────────────────────────────────────────────────── */
function TabGeneral({ form, set, errors, pmUsers, cmUsers }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="General Information" subtitle="Basic project and stakeholder details" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Project Name" required error={errors.name} className="md:col-span-2">
          <Input
            placeholder="e.g. Central Plaza Office Tower"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={errors.name}
          />
        </FormField>

        <FormField label="Location" error={errors.location}>
          <Input
            placeholder="City, Area"
            value={form.location}
            onChange={e => set('location', e.target.value)}
          />
        </FormField>

        <FormField label="Project Manager (PM)" error={errors.pmId}>
          <Select value={form.pmId} onChange={e => set('pmId', e.target.value)}>
            <option value="">— Select PM —</option>
            {pmUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Construction Manager (CM)">
          <Select value={form.cmId} onChange={e => set('cmId', e.target.value)}>
            <option value="">— Select CM —</option>
            {cmUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Client Name" required error={errors.clientName}>
          <Input
            placeholder="e.g. Central Property Group"
            value={form.clientName}
            onChange={e => set('clientName', e.target.value)}
            error={errors.clientName}
          />
        </FormField>

        <FormField label="Main Contractor">
          <Input
            placeholder="e.g. CMG Construction Co., Ltd."
            value={form.mainContractor}
            onChange={e => set('mainContractor', e.target.value)}
          />
        </FormField>

        <FormField label="Sub-Contractor">
          <Input
            placeholder="e.g. ElectroPower Thailand"
            value={form.subContractor}
            onChange={e => set('subContractor', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}

/* ─── Part 2: Contract ────────────────────────────────────────────────────── */
function TabContract({ form, set, errors, projectId, currentUserId }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Contract Details" subtitle="Financial and timeline information for the contract" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Contract No." required error={errors.contractNo}>
          <Input
            placeholder="e.g. CMG-2024-001"
            value={form.contractNo}
            onChange={e => set('contractNo', e.target.value)}
            error={errors.contractNo}
          />
        </FormField>

        <FormField label="PO No.">
          <Input
            placeholder="e.g. PO-CP-2024-88"
            value={form.poNo}
            onChange={e => set('poNo', e.target.value)}
          />
        </FormField>

        <FormField label="Contract Value (THB)" required error={errors.contractValue}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
            <Input
              placeholder="0"
              value={formatCurrencyInput(form.contractValue)}
              onChange={e => set('contractValue', parseCurrency(e.target.value))}
              error={errors.contractValue}
              className="pl-7"
            />
          </div>
        </FormField>

        <FormField label="Contract Type">
          <Select value={form.contractType} onChange={e => set('contractType', e.target.value)}>
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FormField>

        <FormField label="Start Date" required error={errors.startDate}>
          <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} error={errors.startDate} />
        </FormField>

        <FormField label="Finish Date" required error={errors.finishDate}>
          <Input type="date" value={form.finishDate} onChange={e => set('finishDate', e.target.value)} error={errors.finishDate} />
        </FormField>

        <FormField label="Contract Attachment">
          <AttachmentField
            value={form.contractAttachment}
            onChange={v => set('contractAttachment', v)}
            folder="contracts"
            docId={projectId || ''}
            uploadedBy={currentUserId || ''}
            placeholder="Filename or URL หรือกด Upload"
          />
        </FormField>

        <div className="md:col-span-2">
          <div className="flex items-center gap-8 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <FormField label="Retention Required">
              <Toggle
                checked={form.retentionRequired}
                onChange={v => set('retentionRequired', v)}
                label={form.retentionRequired ? 'Yes' : 'No'}
              />
            </FormField>
            {form.retentionRequired && (
              <FormField label="Retention %" className="w-32">
                <div className="relative">
                  <Input
                    type="number" min="0" max="100" step="0.5"
                    placeholder="5"
                    value={form.retentionPercent}
                    onChange={e => set('retentionPercent', e.target.value)}
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </FormField>
            )}
          </div>
        </div>

        <FormField label="Note" className="md:col-span-2">
          <Textarea
            placeholder="Additional notes about the contract..."
            value={form.contractNote}
            onChange={e => set('contractNote', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}

/* ─── Part 3: Bank Bond ───────────────────────────────────────────────────── */
function TabBankBond({ form, setBond, projectId, currentUserId }) {
  const bonds = [
    { key: 'performanceBond', label: 'Performance Bond', color: 'blue' },
    { key: 'advanceBond',     label: 'Advance Bond',     color: 'amber' },
    { key: 'warrantyBond',    label: 'Warranty Bond',    color: 'emerald' },
  ]

  return (
    <div className="space-y-6">
      <SectionTitle title="Bank Bond Details" subtitle="Performance, Advance, and Warranty bond information" />
      <div className="space-y-5">
        {bonds.map(({ key, label, color }) => (
          <BondSection
            key={key}
            label={label}
            color={color}
            data={form[key]}
            onChange={(field, val) => setBond(key, field, val)}
            projectId={projectId}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}

function BondSection({ label, color, data, onChange, projectId, currentUserId }) {
  const colorMap = {
    blue:    'border-blue-200 bg-blue-50/40',
    amber:   'border-amber-200 bg-amber-50/40',
    emerald: 'border-emerald-200 bg-emerald-50/40',
  }
  const headerMap = {
    blue:    'bg-blue-600',
    amber:   'bg-amber-500',
    emerald: 'bg-emerald-600',
  }

  return (
    <div className={clsx('rounded-xl border overflow-hidden', colorMap[color])}>
      <div className={clsx('px-4 py-2.5', headerMap[color])}>
        <h3 className="text-sm font-semibold text-white">{label}</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Bond %">
          <div className="relative">
            <Input
              type="number" min="0" max="100" step="0.5"
              placeholder="5"
              value={data.percent}
              onChange={e => onChange('percent', e.target.value)}
              className="pr-7"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
          </div>
        </FormField>

        <FormField label="Bond Value (THB)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">฿</span>
            <Input
              placeholder="0"
              value={formatCurrencyInput(data.value)}
              onChange={e => onChange('value', parseCurrency(e.target.value))}
              className="pl-7"
            />
          </div>
        </FormField>

        <FormField label="Bank Name">
          <Input
            placeholder="e.g. Bangkok Bank"
            value={data.bankName}
            onChange={e => onChange('bankName', e.target.value)}
          />
        </FormField>

        <FormField label="Start Date">
          <Input type="date" value={data.startDate} onChange={e => onChange('startDate', e.target.value)} />
        </FormField>

        <FormField label="End Date">
          <Input type="date" value={data.endDate} onChange={e => onChange('endDate', e.target.value)} />
        </FormField>

        <FormField label="Attachment">
          <AttachmentField
            value={data.attachment}
            onChange={v => onChange('attachment', v)}
            folder="bonds"
            docId={projectId || ''}
            uploadedBy={currentUserId || ''}
            placeholder="Filename or URL หรือกด Upload"
          />
        </FormField>

        <FormField label="Note" className="md:col-span-3">
          <Textarea
            rows={2}
            placeholder={`Notes for ${label.toLowerCase()}...`}
            value={data.note}
            onChange={e => onChange('note', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}

/* ─── Part 4: Insurance ───────────────────────────────────────────────────── */
function TabInsurance({ form, setInsurance }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Insurance Records" subtitle="Up to 3 insurance policy slots" />
      <div className="space-y-4">
        {form.insurances.map((ins, i) => (
          <div key={ins.id} className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-700 flex items-center gap-2">
              <span className="text-sm font-semibold text-white">Insurance {i + 1}</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Insurance No.">
                <Input
                  placeholder="e.g. INS-001"
                  value={ins.no}
                  onChange={e => setInsurance(i, 'no', e.target.value)}
                />
              </FormField>

              <FormField label="Insurance Name">
                <Input
                  placeholder="e.g. Construction All Risk"
                  value={ins.name}
                  onChange={e => setInsurance(i, 'name', e.target.value)}
                />
              </FormField>

              <FormField label="Detail">
                <Input
                  placeholder="Coverage detail"
                  value={ins.detail}
                  onChange={e => setInsurance(i, 'detail', e.target.value)}
                />
              </FormField>

              <FormField label="Type">
                <Select value={ins.type} onChange={e => setInsurance(i, 'type', e.target.value)}>
                  <option value="">— Select Type —</option>
                  {INSURANCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>

              <FormField label="Note" className="md:col-span-2">
                <Textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={ins.note}
                  onChange={e => setInsurance(i, 'note', e.target.value)}
                />
              </FormField>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Part 5: Tax Record ──────────────────────────────────────────────────── */
function TabTax({ form, set }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Tax Record" subtitle="Tax payment status and documentation" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FormField label="Tax Invoice / Reference">
          <Input
            placeholder="e.g. Tax Invoice CMG-2024-001-TX"
            value={form.taxPay}
            onChange={e => set('taxPay', e.target.value)}
          />
        </FormField>

        <FormField label="Payment Status">
          <Select value={form.taxStatusPay} onChange={e => set('taxStatusPay', e.target.value)}>
            {TAX_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>

        <FormField label="Note" className="md:col-span-2">
          <Textarea
            placeholder="Additional tax notes (e.g. withholding tax rate, deduction method)..."
            value={form.taxNote}
            onChange={e => set('taxNote', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}

/* ─── Part 6: Conditions ──────────────────────────────────────────────────── */
function TabCondition({ form, set }) {
  return (
    <div className="space-y-6">
      <SectionTitle title="Contract Conditions" subtitle="Penalties, special conditions, and legal clauses" />
      <div className="grid grid-cols-1 gap-5">
        <FormField label="Contract Penalty Clause">
          <Textarea
            rows={3}
            placeholder="e.g. 0.1% of contract value per day, max 10%"
            value={form.contractPenalty}
            onChange={e => set('contractPenalty', e.target.value)}
          />
        </FormField>

        <FormField label="Other Conditions">
          <Textarea
            rows={4}
            placeholder="Describe any other contractual conditions, milestone requirements, or special clauses..."
            value={form.otherConditions}
            onChange={e => set('otherConditions', e.target.value)}
          />
        </FormField>

        <FormField label="Note">
          <Textarea
            rows={3}
            placeholder="Additional notes..."
            value={form.conditionNote}
            onChange={e => set('conditionNote', e.target.value)}
          />
        </FormField>
      </div>
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function SectionTitle({ title, subtitle }) {
  return (
    <div className="pb-4 border-b border-slate-100">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}
