import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit, Info, FileText, Shield, ShieldCheck,
  Receipt, AlertTriangle, MapPin, User, Calendar, Building2,
  TrendingUp, Paperclip, CheckCircle2, XCircle, Clock
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { AttachmentLink } from '../components/ui/AttachmentField'
import { clsx } from 'clsx'

const TABS = [
  { id: 'general',   label: 'General',    icon: Info },
  { id: 'contract',  label: 'Contract',   icon: FileText },
  { id: 'bank-bond', label: 'Bank Bonds', icon: Shield },
  { id: 'insurance', label: 'Insurance',  icon: ShieldCheck },
  { id: 'tax',       label: 'Tax',        icon: Receipt },
  { id: 'condition', label: 'Conditions', icon: AlertTriangle },
]

function fmt(val) {
  if (!val && val !== 0) return <span className="text-slate-300">—</span>
  return val
}

function fmtCurrency(val) {
  if (!val && val !== 0) return <span className="text-slate-300">—</span>
  return (
    <span className="font-semibold text-slate-800">
      ฿{new Intl.NumberFormat('en-US').format(val)}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return <span className="text-slate-300">—</span>
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InfoRow({ label, value, wide }) {
  return (
    <div className={clsx('flex flex-col gap-0.5', wide && 'md:col-span-2')}>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-700">{value ?? <span className="text-slate-300">—</span>}</span>
    </div>
  )
}

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getProject } = useData()
  const { can, USERS, hasProjectAccess } = useAuth()
  const [activeTab, setActiveTab] = useState('general')

  const project = getProject(id)

  if (!project) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 gap-3">
        <XCircle size={40} className="text-slate-300" />
        <p className="text-slate-600 font-semibold">Project not found</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/projects')}>Back</Button>
      </Card>
    )
  }

  if (!hasProjectAccess(id)) {
    return (
      <Card className="flex flex-col items-center justify-center py-20 gap-3">
        <XCircle size={40} className="text-rose-300" />
        <p className="text-slate-700 font-semibold">ไม่มีสิทธิ์เข้าถึงโครงการนี้</p>
        <p className="text-slate-400 text-sm">คุณไม่ได้รับมอบหมายให้ดูแลโครงการนี้</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/projects')}>กลับ</Button>
      </Card>
    )
  }

  const pmUser = USERS.find(u => u.id === project.pmId)

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500 mt-0.5">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{project.name}</h1>
              <Badge variant="emerald">{project.status}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{project.contractNo} · {project.clientName}</p>
          </div>
        </div>
        {can('canManageProjects') && (
          <Button icon={Edit} variant="secondary" onClick={() => navigate(`/projects/${id}/edit`)}>
            Edit
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Contract Value', value: `฿${new Intl.NumberFormat('en-US').format(project.contractValue || 0)}`, color: 'text-blue-700' },
          { label: 'Contract Type', value: project.contractType || '—', color: 'text-slate-700' },
          { label: 'Retention', value: project.retentionRequired ? `${project.retentionPercent}%` : 'N/A', color: project.retentionRequired ? 'text-amber-600' : 'text-slate-400' },
          { label: 'Duration', value: project.startDate ? `${project.startDate} → ${project.finishDate}` : '—', color: 'text-slate-600' },
        ].map(s => (
          <Card key={s.label} className="!p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
            <p className={clsx('text-sm font-semibold mt-1 leading-snug', s.color)}>{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Tabbed Detail */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0',
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="p-6">
          {activeTab === 'general'   && <DetailGeneral project={project} pmUser={pmUser} />}
          {activeTab === 'contract'  && <DetailContract project={project} />}
          {activeTab === 'bank-bond' && <DetailBankBond project={project} />}
          {activeTab === 'insurance' && <DetailInsurance project={project} />}
          {activeTab === 'tax'       && <DetailTax project={project} />}
          {activeTab === 'condition' && <DetailCondition project={project} />}
        </div>
      </div>
    </div>
  )
}

function DetailGeneral({ project, pmUser }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      <InfoRow label="Project Name" value={project.name} wide />
      <InfoRow label="Location" value={project.location} />
      <InfoRow label="Client" value={project.clientName} />
      <InfoRow label="Project Manager" value={pmUser?.name ?? '—'} />
      <InfoRow label="Construction Manager" value={project.cm} />
      <InfoRow label="Main Contractor" value={project.mainContractor} />
      <InfoRow label="Sub-Contractor" value={project.subContractor} />
      <InfoRow label="Created" value={fmtDate(project.createdAt)} />
    </div>
  )
}

function DetailContract({ project }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      <InfoRow label="Contract No." value={project.contractNo} />
      <InfoRow label="PO No." value={project.poNo} />
      <InfoRow label="Contract Value" value={fmtCurrency(project.contractValue)} />
      <InfoRow label="Contract Type" value={project.contractType} />
      <InfoRow label="Start Date" value={fmtDate(project.startDate)} />
      <InfoRow label="Finish Date" value={fmtDate(project.finishDate)} />
      <InfoRow
        label="Retention"
        value={project.retentionRequired
          ? <span className="text-amber-600 font-semibold">{project.retentionPercent}%</span>
          : <Badge variant="slate">Not Required</Badge>
        }
      />
      <InfoRow
        label="Attachment"
        value={project.contractAttachment ? <AttachmentLink value={project.contractAttachment} className="flex items-center gap-1" /> : null}
      />
      {project.contractNote && <InfoRow label="Note" value={project.contractNote} wide />}
    </div>
  )
}

function DetailBankBond({ project }) {
  const bonds = [
    { key: 'performanceBond', label: 'Performance Bond', color: 'blue' },
    { key: 'advanceBond',     label: 'Advance Bond',     color: 'amber' },
    { key: 'warrantyBond',    label: 'Warranty Bond',    color: 'emerald' },
  ]
  const headerMap = { blue: 'bg-blue-600', amber: 'bg-amber-500', emerald: 'bg-emerald-600' }
  const borderMap = { blue: 'border-blue-200', amber: 'border-amber-200', emerald: 'border-emerald-200' }

  return (
    <div className="space-y-5">
      {bonds.map(({ key, label, color }) => {
        const bond = project[key]
        if (!bond) return null
        return (
          <div key={key} className={clsx('rounded-xl border overflow-hidden', borderMap[color])}>
            <div className={clsx('px-4 py-2.5', headerMap[color])}>
              <h3 className="text-sm font-semibold text-white">{label}</h3>
            </div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
              <InfoRow label="Bond %" value={bond.percent ? `${bond.percent}%` : null} />
              <InfoRow label="Value" value={fmtCurrency(bond.value)} />
              <InfoRow label="Bank" value={bond.bankName} />
              <InfoRow label="Start Date" value={fmtDate(bond.startDate)} />
              <InfoRow label="End Date" value={fmtDate(bond.endDate)} />
              <InfoRow label="Attachment" value={bond.attachment ? <AttachmentLink value={bond.attachment} className="flex items-center gap-1" /> : null} />
              {bond.note && <InfoRow label="Note" value={bond.note} wide />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DetailInsurance({ project }) {
  const filled = (project.insurances || []).filter(ins => ins.name || ins.no)
  if (!filled.length) return <p className="text-slate-400 text-sm">No insurance records entered.</p>

  return (
    <div className="space-y-4">
      {filled.map((ins, i) => (
        <div key={ins.id || i} className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-700">
            <h3 className="text-sm font-semibold text-white">Insurance {i + 1}: {ins.name}</h3>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
            <InfoRow label="No." value={ins.no} />
            <InfoRow label="Name" value={ins.name} />
            <InfoRow label="Type" value={ins.type ? <Badge variant="blue">{ins.type}</Badge> : null} />
            <InfoRow label="Detail" value={ins.detail} wide />
            {ins.note && <InfoRow label="Note" value={ins.note} wide />}
          </div>
        </div>
      ))}
    </div>
  )
}

function DetailTax({ project }) {
  const statusVariant = { 'Complete pay': 'emerald', 'Not yet': 'amber', 'N/A': 'slate' }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
      <InfoRow label="Tax Invoice / Reference" value={project.taxPay} />
      <InfoRow
        label="Payment Status"
        value={project.taxStatusPay
          ? <Badge variant={statusVariant[project.taxStatusPay] ?? 'slate'}>{project.taxStatusPay}</Badge>
          : null
        }
      />
      {project.taxNote && <InfoRow label="Note" value={project.taxNote} wide />}
    </div>
  )
}

function DetailCondition({ project }) {
  return (
    <div className="space-y-5">
      <InfoRow
        label="Contract Penalty"
        value={<p className="text-sm text-slate-700 whitespace-pre-wrap">{project.contractPenalty || '—'}</p>}
      />
      <InfoRow
        label="Other Conditions"
        value={<p className="text-sm text-slate-700 whitespace-pre-wrap">{project.otherConditions || '—'}</p>}
      />
      {project.conditionNote && (
        <InfoRow label="Note" value={<p className="text-sm text-slate-700 whitespace-pre-wrap">{project.conditionNote}</p>} />
      )}
    </div>
  )
}
