import { useState } from 'react'
import {
  Shield, CheckCircle2, Clock, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Save, Check, Building2,
  MapPin, Calendar, Banknote, Paperclip, Lock
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { FormField, Input, Select, Textarea } from '../components/ui/FormField'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { clsx } from 'clsx'

const SUBMIT_STATUSES = ['Not finish', 'Submitted', 'N/A']

const STATUS_CONFIG = {
  'Submitted':  { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-200', badge: 'emerald', dot: 'bg-emerald-500' },
  'Not finish': { icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-200',   badge: 'amber',   dot: 'bg-amber-400'  },
  'N/A':        { icon: XCircle,      color: 'text-slate-400',   bg: 'bg-slate-50',    border: 'border-slate-200',   badge: 'slate',   dot: 'bg-slate-300'  },
}

const BOND_TYPES = [
  { key: 'performanceBond', label: 'Performance Bond', shortLabel: 'Performance', projectKey: 'performanceBond', color: 'blue'    },
  { key: 'advanceBond',     label: 'Advance Bond',     shortLabel: 'Advance',     projectKey: 'advanceBond',     color: 'amber'   },
  { key: 'warrantyBond',    label: 'Warranty Bond',    shortLabel: 'Warranty',    projectKey: 'warrantyBond',    color: 'emerald' },
]

const BOND_HEADER_COLORS = {
  blue:    { header: 'bg-blue-600',    light: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700'    },
  amber:   { header: 'bg-amber-500',   light: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700'   },
  emerald: { header: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtCurrency(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(val)}`
}

// Summary stats across all visible bond records
function computeStats(bondStatuses, projects, hasProjectAccess) {
  let total = 0, submitted = 0, notFinish = 0, na = 0
  bondStatuses.forEach(bs => {
    if (!hasProjectAccess(bs.projectId)) return
    BOND_TYPES.forEach(({ key }) => {
      total++
      const s = bs[key]?.status
      if (s === 'Submitted')  submitted++
      else if (s === 'N/A')   na++
      else                    notFinish++
    })
  })
  return { total, submitted, notFinish, na }
}

export default function BondStatusPage() {
  const { projects, bondStatuses, updateBondStatus } = useData()
  const { currentUser, can, hasProjectAccess } = useAuth()
  const isAccCMG = currentUser.role === 'AccCMG'

  // Per-project expanded state
  const [expanded, setExpanded] = useState(() => {
    const init = {}
    bondStatuses.forEach(bs => { init[bs.projectId] = true })
    return init
  })

  // Editing state: { [projectId]: { [bondKey]: { status, submitDate, note } } }
  const [editing, setEditing] = useState({})
  const [saving, setSaving] = useState({})
  const [saved, setSaved] = useState({})

  const visibleBondStatuses = bondStatuses.filter(bs => hasProjectAccess(bs.projectId))
  const stats = computeStats(bondStatuses, projects, hasProjectAccess)

  const toggleExpand = (projectId) =>
    setExpanded(prev => ({ ...prev, [projectId]: !prev[projectId] }))

  // Start editing a bond field for a project
  const startEdit = (projectId) => {
    const bs = bondStatuses.find(b => b.projectId === projectId)
    if (!bs) return
    setEditing(prev => ({
      ...prev,
      [projectId]: {
        performanceBond: { ...bs.performanceBond },
        advanceBond:     { ...bs.advanceBond },
        warrantyBond:    { ...bs.warrantyBond },
      }
    }))
  }

  const cancelEdit = (projectId) => {
    setEditing(prev => { const n = { ...prev }; delete n[projectId]; return n })
  }

  const setEditField = (projectId, bondKey, field, value) => {
    setEditing(prev => ({
      ...prev,
      [projectId]: {
        ...prev[projectId],
        [bondKey]: { ...prev[projectId][bondKey], [field]: value }
      }
    }))
  }

  const handleSave = async (projectId) => {
    setSaving(prev => ({ ...prev, [projectId]: true }))
    await new Promise(r => setTimeout(r, 350))
    updateBondStatus(projectId, editing[projectId])
    setSaving(prev => ({ ...prev, [projectId]: false }))
    setSaved(prev => ({ ...prev, [projectId]: true }))
    setEditing(prev => { const n = { ...prev }; delete n[projectId]; return n })
    setTimeout(() => setSaved(prev => ({ ...prev, [projectId]: false })), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Bond Records', value: stats.total,     color: 'text-slate-800',    bg: 'bg-slate-100',    icon: Shield        },
          { label: 'Submitted',          value: stats.submitted, color: 'text-emerald-700',  bg: 'bg-emerald-50',   icon: CheckCircle2  },
          { label: 'Not Finished',       value: stats.notFinish, color: 'text-amber-700',    bg: 'bg-amber-50',     icon: Clock         },
          { label: 'N/A',                value: stats.na,        color: 'text-slate-500',    bg: 'bg-slate-50',     icon: XCircle       },
        ].map(s => {
          const Icon = s.icon
          return (
            <Card key={s.label} className="!p-4 flex items-center gap-4">
              <div className={clsx('p-2.5 rounded-xl shrink-0', s.bg)}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Role notice */}
      {!isAccCMG && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Lock size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Read-only view.</span> Only <span className="font-semibold">AccCMG</span> can update bond submission statuses.
            Switch user to <span className="font-semibold">Rattana Boonmee (AccCMG)</span> to edit.
          </p>
        </div>
      )}

      {/* Per-Project Bond Cards */}
      <div className="space-y-4">
        {visibleBondStatuses.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 gap-3">
            <Shield size={40} className="text-slate-300" />
            <p className="text-slate-500 font-medium">No bond records available</p>
          </Card>
        ) : visibleBondStatuses.map(bs => {
          const project = projects.find(p => p.id === bs.projectId)
          if (!project) return null
          const isExpanded = !!expanded[bs.projectId]
          const isEditing  = !!editing[bs.projectId]
          const isSaving   = !!saving[bs.projectId]
          const isSaved    = !!saved[bs.projectId]

          // Overall project bond health
          const bonds = BOND_TYPES.map(bt => bs[bt.key])
          const allDone = bonds.every(b => b.status === 'Submitted' || b.status === 'N/A')
          const anyPending = bonds.some(b => b.status === 'Not finish')

          return (
            <Card key={bs.id} padding={false} className="overflow-hidden">
              {/* Project Header Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                onClick={() => toggleExpand(bs.projectId)}
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600 shrink-0">
                  <Building2 size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800 truncate">{project.name}</p>
                    {isSaved && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Check size={12} /> Saved
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <MapPin size={10} /> {project.location}
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{project.contractNo}</span>
                  </div>
                </div>

                {/* Bond pills summary */}
                <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {BOND_TYPES.map(bt => {
                    const bData = bs[bt.key]
                    const sc = STATUS_CONFIG[bData?.status] ?? STATUS_CONFIG['Not finish']
                    return (
                      <div
                        key={bt.key}
                        title={`${bt.shortLabel}: ${bData?.status}`}
                        className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border', sc.bg, sc.border, sc.color)}
                      >
                        <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                        {bt.shortLabel}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge variant={allDone ? 'emerald' : anyPending ? 'amber' : 'slate'}>
                    {allDone ? 'Complete' : anyPending ? 'Pending' : 'N/A'}
                  </Badge>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Bond Detail */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {/* Project meta strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                    <div><span className="font-semibold text-slate-600">Client:</span> {project.clientName}</div>
                    <div><span className="font-semibold text-slate-600">Contract Value:</span> {fmtCurrency(project.contractValue)}</div>
                    <div><span className="font-semibold text-slate-600">Start:</span> {fmtDate(project.startDate)}</div>
                    <div><span className="font-semibold text-slate-600">Finish:</span> {fmtDate(project.finishDate)}</div>
                  </div>

                  {/* Three bond panels */}
                  <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {BOND_TYPES.map(bt => {
                      const projectBond = project[bt.projectKey]
                      const bStatus = isEditing ? editing[bs.projectId][bt.key] : bs[bt.key]
                      const sc = STATUS_CONFIG[bStatus?.status] ?? STATUS_CONFIG['Not finish']
                      const hc = BOND_HEADER_COLORS[bt.color]
                      const StatusIcon = sc.icon

                      return (
                        <div key={bt.key} className={clsx('rounded-xl border overflow-hidden', hc.border)}>
                          {/* Bond type header */}
                          <div className={clsx('px-4 py-2.5 flex items-center justify-between', hc.header)}>
                            <span className="text-sm font-semibold text-white">{bt.label}</span>
                            <Badge variant="slate" className="!bg-white/20 !text-white !border-white/30 text-[10px]">
                              {projectBond?.percent ? `${projectBond.percent}%` : '—'}
                            </Badge>
                          </div>

                          {/* Bond contract data (read-only) */}
                          <div className={clsx('px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-b text-xs', hc.light, hc.border)}>
                            <div>
                              <span className="text-slate-400 font-medium">Value</span>
                              <p className={clsx('font-semibold mt-0.5', hc.text)}>{fmtCurrency(projectBond?.value)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Bank</span>
                              <p className="text-slate-700 font-medium mt-0.5">{projectBond?.bankName || '—'}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Bond Start</span>
                              <p className="text-slate-700 mt-0.5">{fmtDate(projectBond?.startDate)}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-medium">Bond Expiry</span>
                              <p className="text-slate-700 mt-0.5">{fmtDate(projectBond?.endDate)}</p>
                            </div>
                            {projectBond?.attachment && (
                              <div className="col-span-2">
                                <a href="#" className={clsx('flex items-center gap-1 font-medium hover:underline', hc.text)}>
                                  <Paperclip size={10} /> {projectBond.attachment}
                                </a>
                              </div>
                            )}
                          </div>

                          {/* Submission tracking section */}
                          <div className="px-4 py-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <StatusIcon size={14} className={sc.color} />
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Submission Status</span>
                            </div>

                            {isEditing ? (
                              <div className="space-y-2.5">
                                <FormField label="Submit Status">
                                  <Select
                                    value={bStatus.status}
                                    onChange={e => setEditField(bs.projectId, bt.key, 'status', e.target.value)}
                                  >
                                    {SUBMIT_STATUSES.map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </Select>
                                </FormField>
                                <FormField label="Date of Submit">
                                  <Input
                                    type="date"
                                    value={bStatus.submitDate || ''}
                                    disabled={bStatus.status === 'N/A'}
                                    onChange={e => setEditField(bs.projectId, bt.key, 'submitDate', e.target.value)}
                                  />
                                </FormField>
                                <FormField label="Note">
                                  <Textarea
                                    rows={2}
                                    placeholder="Add a note..."
                                    value={bStatus.note || ''}
                                    onChange={e => setEditField(bs.projectId, bt.key, 'note', e.target.value)}
                                  />
                                </FormField>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className={clsx('flex items-center justify-between p-2.5 rounded-lg', sc.bg)}>
                                  <span className="text-xs text-slate-500 font-medium">Status</span>
                                  <Badge variant={sc.badge}>{bStatus?.status || 'Not finish'}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-slate-400">Date Submitted</span>
                                  <span className="text-xs font-medium text-slate-700">
                                    {bStatus?.submitDate ? fmtDate(bStatus.submitDate) : <span className="text-slate-300">Not yet</span>}
                                  </span>
                                </div>
                                {bStatus?.note && (
                                  <p className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-2 rounded-lg border border-slate-100">
                                    "{bStatus.note}"
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50 border-t border-slate-100">
                    {isAccCMG && (
                      isEditing ? (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => cancelEdit(bs.projectId)}>
                            Cancel
                          </Button>
                          <Button
                            variant="emerald"
                            size="sm"
                            icon={isSaving ? undefined : Save}
                            loading={isSaving}
                            onClick={() => handleSave(bs.projectId)}
                          >
                            {isSaving ? 'Saving…' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={isSaved ? Check : Shield}
                          onClick={() => startEdit(bs.projectId)}
                        >
                          {isSaved ? 'Saved!' : 'Update Bond Status'}
                        </Button>
                      )
                    )}
                    {!isAccCMG && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Lock size={12} /> AccCMG only
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
