import { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Sector,
} from 'recharts'
import {
  BarChart3, TrendingUp, GitPullRequest, Shield, CreditCard,
  CheckCircle2, Clock, Send, AlertCircle, ChevronDown,
  ArrowUpRight, ArrowDownRight, Minus, FileText
} from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { clsx } from 'clsx'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(val) {
  if (!val && val !== 0) return '—'
  return `฿${new Intl.NumberFormat('en-US').format(Math.round(val))}`
}

function fmtM(val) {
  if (!val && val !== 0) return '฿0'
  if (Math.abs(val) >= 1_000_000) return `฿${(val / 1_000_000).toFixed(2)}M`
  if (Math.abs(val) >= 1_000)     return `฿${(val / 1_000).toFixed(0)}K`
  return `฿${val}`
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function pct(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

const REPORT_TABS = [
  { id: 'contract',  label: 'Contract vs Payment',  icon: TrendingUp    },
  { id: 'coa',       label: 'COA vs Payment',        icon: GitPullRequest },
  { id: 'followup',  label: 'Follow-up Tracker',     icon: BarChart3     },
]

/* ─── Custom Tooltip ──────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-xs">
      <p className="font-semibold text-slate-700 mb-2 text-sm">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{fmtM(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Progress Bar ────────────────────────────────────────────────────────── */
function ProgressBar({ value, max, color = 'bg-blue-500', className }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className={clsx('w-full h-1.5 bg-slate-100 rounded-full overflow-hidden', className)}>
      <div className={clsx('h-full rounded-full transition-all duration-500', color)} style={{ width: `${width}%` }} />
    </div>
  )
}

/* ─── KPI Tile ────────────────────────────────────────────────────────────── */
function KpiTile({ label, value, sub, color = 'text-slate-800', bg = 'bg-slate-50', icon: Icon, trend }) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 p-4 flex items-start gap-3', bg)}>
      {Icon && (
        <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
          <Icon size={16} className={color} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium leading-tight">{label}</p>
        <p className={clsx('text-xl font-bold mt-0.5 leading-tight truncate', color)}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const { projects, payments, cors, coas, bondStatuses } = useData()
  const { hasProjectAccess, currentUser } = useAuth()
  const [activeTab, setActiveTab]         = useState('contract')
  const [selectedProject, setSelectedProject] = useState('all')

  const visibleProjects    = projects.filter(p => hasProjectAccess(p.id))
  const visiblePayments    = payments.filter(p => hasProjectAccess(p.projectId))
  const visibleCORs        = cors.filter(c => hasProjectAccess(c.projectId))
  const visibleCOAs        = coas.filter(c => hasProjectAccess(c.projectId))
  const visibleBondStatuses = bondStatuses.filter(b => hasProjectAccess(b.projectId))

  /* ── Global KPIs ── */
  const totalContractValue = visibleProjects.reduce((s, p) => s + (p.contractValue || 0), 0)
  const totalMainReceived  = visiblePayments.filter(p => p.type === 'main' && p.status === 'Received').reduce((s, p) => s + (p.balanceValue || 0), 0)
  const totalCOAValue      = visibleCOAs.reduce((s, c) => s + (c.value || 0), 0)
  const totalCOAReceived   = visiblePayments.filter(p => p.type === 'coa' && p.status === 'Received').reduce((s, p) => s + (p.balanceValue || 0), 0)
  const totalRetention     = visiblePayments.filter(p => p.type === 'main').reduce((s, p) => s + (p.retentionReduce || 0), 0)

  return (
    <div className="space-y-6">
      {/* Global KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiTile label="Total Contract Value"  value={fmtM(totalContractValue)} color="text-blue-700"    bg="bg-blue-50"    icon={FileText}      />
        <KpiTile label="Main Contract Received" value={fmtM(totalMainReceived)}  color="text-emerald-700" bg="bg-emerald-50" icon={CheckCircle2}   sub={`${pct(totalMainReceived, totalContractValue)}% of contract`} />
        <KpiTile label="Total COA Value"        value={fmtM(totalCOAValue)}      color="text-purple-700"  bg="bg-purple-50"  icon={GitPullRequest} />
        <KpiTile label="COA Received"           value={fmtM(totalCOAReceived)}   color="text-emerald-700" bg="bg-emerald-50" icon={CheckCircle2}   sub={`${pct(totalCOAReceived, totalCOAValue)}% of COA`} />
        <KpiTile label="Total Retention Held"   value={fmtM(totalRetention)}     color="text-amber-700"   bg="bg-amber-50"   icon={Shield}         />
      </div>

      {/* Report Tabs */}
      <Card padding={false}>
        {/* Tab nav */}
        <div className="flex overflow-x-auto border-b border-slate-200">
          {REPORT_TABS.map(tab => {
            const Icon = tab.icon
            const active = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0',
                  active
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
          {/* Project filter */}
          <div className="flex-1 flex items-center justify-end px-4">
            <div className="relative">
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="pl-3 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 appearance-none cursor-pointer"
              >
                <option value="all">All Projects</option>
                {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'contract' && (
            <Report1
              projects={visibleProjects}
              payments={visiblePayments}
              selectedProject={selectedProject}
            />
          )}
          {activeTab === 'coa' && (
            <Report2
              projects={visibleProjects}
              coas={visibleCOAs}
              cors={visibleCORs}
              payments={visiblePayments}
              selectedProject={selectedProject}
            />
          )}
          {activeTab === 'followup' && (
            <Report3
              projects={visibleProjects}
              payments={visiblePayments}
              cors={visibleCORs}
              coas={visibleCOAs}
              bondStatuses={visibleBondStatuses}
              selectedProject={selectedProject}
            />
          )}
        </div>
      </Card>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT 1 — Contract vs Payment
═══════════════════════════════════════════════════════════════════════════ */
function Report1({ projects, payments, selectedProject }) {
  const filteredProjects = selectedProject === 'all'
    ? projects
    : projects.filter(p => p.id === selectedProject)

  const rows = filteredProjects.map(proj => {
    const mainPays      = payments.filter(p => p.projectId === proj.id && p.type === 'main')
    const receivedPays  = mainPays.filter(p => p.status === 'Received')
    const submittedPays = mainPays.filter(p => p.status === 'Submitted')
    const pendingPays   = mainPays.filter(p => p.status === 'In Progress')

    const contractValue    = proj.contractValue || 0
    const totalClaimed     = mainPays.reduce((s, p) => s + (p.value || 0), 0)
    const totalReceived    = receivedPays.reduce((s, p) => s + (p.balanceValue || 0), 0)
    const totalSubmitted   = submittedPays.reduce((s, p) => s + (p.balanceValue || 0), 0)
    const totalRetention   = mainPays.reduce((s, p) => s + (p.retentionReduce || 0), 0)
    const totalAdvDed      = mainPays.reduce((s, p) => s + (p.advanceDeduction || 0), 0)
    const balance          = contractValue - totalReceived - totalSubmitted
    const progressPct      = pct(totalReceived + totalSubmitted, contractValue)

    return {
      proj, contractValue, totalClaimed, totalReceived,
      totalSubmitted, totalRetention, totalAdvDed, balance,
      progressPct, claimsCount: mainPays.length,
    }
  })

  // Bar chart data
  const chartData = rows.map(r => ({
    name: r.proj.name.split(' ').slice(0, 2).join(' '),
    'Contract Value':  r.contractValue,
    'Received':        r.totalReceived,
    'Submitted':       r.totalSubmitted,
    'Balance':         Math.max(0, r.balance),
  }))

  // Summary totals
  const totals = rows.reduce((acc, r) => ({
    contractValue:  acc.contractValue  + r.contractValue,
    totalReceived:  acc.totalReceived  + r.totalReceived,
    totalSubmitted: acc.totalSubmitted + r.totalSubmitted,
    totalRetention: acc.totalRetention + r.totalRetention,
    balance:        acc.balance        + r.balance,
  }), { contractValue: 0, totalReceived: 0, totalSubmitted: 0, totalRetention: 0, balance: 0 })

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Report 1 — Contract vs Payment Summary"
        subtitle="Tracks payment progress against the main contract value for each project"
      />

      {/* Stacked Bar Chart */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">Payment Progress by Project</p>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11, fill: '#64748b' }} width={70} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="Received"  stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Submitted" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Balance"   stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contract Value</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Received</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Retention Held</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Claims</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(r => (
              <tr key={r.proj.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800 text-xs leading-snug">{r.proj.name}</p>
                  <p className="text-xs text-slate-400">{r.proj.contractNo}</p>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(r.contractValue)}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmt(r.totalReceived)}</td>
                <td className="px-4 py-3 text-right font-medium text-blue-600">{fmt(r.totalSubmitted)}</td>
                <td className="px-4 py-3 text-right font-medium text-amber-600">{fmt(r.totalRetention)}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">{fmt(Math.max(0, r.balance))}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <ProgressBar
                      value={r.totalReceived + r.totalSubmitted}
                      max={r.contractValue}
                      color={r.progressPct >= 80 ? 'bg-emerald-500' : r.progressPct >= 40 ? 'bg-blue-500' : 'bg-amber-400'}
                      className="flex-1"
                    />
                    <span className="text-xs font-bold text-slate-600 w-8 text-right shrink-0">{r.progressPct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="slate">{r.claimsCount}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                <td className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">TOTAL</td>
                <td className="px-4 py-3 text-right text-slate-800">{fmt(totals.contractValue)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{fmt(totals.totalReceived)}</td>
                <td className="px-4 py-3 text-right text-blue-600">{fmt(totals.totalSubmitted)}</td>
                <td className="px-4 py-3 text-right text-amber-600">{fmt(totals.totalRetention)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fmt(Math.max(0, totals.balance))}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-bold text-slate-600">
                    {pct(totals.totalReceived + totals.totalSubmitted, totals.contractValue)}%
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Retention Detail */}
      {rows.some(r => r.totalRetention > 0) && (
        <RetentionDetail rows={rows} />
      )}
    </div>
  )
}

function RetentionDetail({ rows }) {
  return (
    <div className="rounded-xl border border-amber-200 overflow-hidden">
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
        <Shield size={14} className="text-amber-600" />
        <p className="text-sm font-semibold text-amber-800">Retention Summary</p>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.filter(r => r.totalRetention > 0).map(r => (
            <div key={r.proj.id} className="bg-white rounded-lg border border-amber-100 p-3">
              <p className="text-xs font-semibold text-slate-600 truncate">{r.proj.name}</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-[10px] text-slate-400">Rate</p>
                  <p className="text-sm font-bold text-amber-700">{r.proj.retentionPercent}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Held to date</p>
                  <p className="text-sm font-bold text-amber-700">{fmt(r.totalRetention)}</p>
                </div>
              </div>
              <ProgressBar
                value={r.totalRetention}
                max={r.contractValue * (r.proj.retentionPercent / 100)}
                color="bg-amber-400"
                className="mt-2"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT 2 — COA vs Payment
═══════════════════════════════════════════════════════════════════════════ */
function Report2({ projects, coas, cors, payments, selectedProject }) {
  const filteredCOAs = selectedProject === 'all'
    ? coas
    : coas.filter(c => c.projectId === selectedProject)

  const rows = filteredCOAs.map(coa => {
    const proj       = projects.find(p => p.id === coa.projectId)
    const cor        = cors.find(c => c.id === coa.corId)
    const coaPays    = payments.filter(p => p.coaId === coa.id && p.type === 'coa')
    const received   = coaPays.filter(p => p.status === 'Received').reduce((s, p) => s + (p.balanceValue || 0), 0)
    const submitted  = coaPays.filter(p => p.status === 'Submitted').reduce((s, p) => s + (p.balanceValue || 0), 0)
    const retention  = coaPays.reduce((s, p) => s + (p.retentionReduce || 0), 0)
    const balance    = coa.value - received - submitted
    const progress   = pct(received + submitted, coa.value)
    return { coa, proj, cor, received, submitted, retention, balance, progress, claimsCount: coaPays.length }
  })

  const totals = rows.reduce((acc, r) => ({
    coaValue:   acc.coaValue   + r.coa.value,
    received:   acc.received   + r.received,
    submitted:  acc.submitted  + r.submitted,
    retention:  acc.retention  + r.retention,
    balance:    acc.balance    + r.balance,
  }), { coaValue: 0, received: 0, submitted: 0, retention: 0, balance: 0 })

  // Pie chart: COR value breakdown — converted vs pending
  const allProjectCORs = cors.filter(c =>
    selectedProject === 'all' || c.projectId === selectedProject
  )
  const convertedVal = allProjectCORs.filter(c => c.convertedToCOA).reduce((s, c) => s + c.value, 0)
  const pendingVal   = allProjectCORs.filter(c => !c.convertedToCOA).reduce((s, c) => s + c.value, 0)
  const pieData = [
    { name: 'Converted to COA', value: convertedVal, color: '#10b981' },
    { name: 'Pending COR',      value: pendingVal,   color: '#f59e0b' },
  ].filter(d => d.value > 0)

  // Bar chart: COA value vs received per COA
  const chartData = rows.map(r => ({
    name:      r.coa.coaNo,
    'COA Value': r.coa.value,
    'Received':  r.received,
    'Submitted': r.submitted,
    'Balance':   Math.max(0, r.balance),
  }))

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Report 2 — COA vs Payment Summary"
        subtitle="Tracks payment progress against each approved Change Order (COA)"
      />

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-slate-50 rounded-xl border border-slate-200">
          <GitPullRequest size={36} className="text-slate-300" />
          <p className="text-slate-500 font-medium">No COAs found for this filter</p>
          <p className="text-slate-400 text-sm">COAs are created when a PM converts an approved COR</p>
        </div>
      ) : (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* COA payment bar chart */}
            <div className="lg:col-span-2 rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-700">COA Payment Progress</p>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top: 5, right: 15, left: 15, bottom: 5 }} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tickFormatter={v => fmtM(v)} tick={{ fontSize: 11, fill: '#64748b' }} width={65} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                    <Bar dataKey="Received"  stackId="a" fill="#10b981" />
                    <Bar dataKey="Submitted" stackId="a" fill="#8b5cf6" />
                    <Bar dataKey="Balance"   stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* COR conversion pie */}
            {pieData.length > 0 && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">COR Conversion Status</p>
                </div>
                <div className="p-4 flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={45}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => fmtM(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 w-full mt-1">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                        <span className="text-slate-500 flex-1">{d.name}</span>
                        <span className="font-semibold text-slate-700">{fmtM(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detail Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">COA</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source COR</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">COA Value</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Received</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Retention</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => (
                  <tr key={r.coa.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 text-xs">{r.coa.coaNo}</p>
                      <p className="text-xs text-slate-400 truncate max-w-[180px]">{r.coa.description}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{r.proj?.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.cor ? (
                        <div>
                          <p className="text-xs font-medium text-slate-700">{r.cor.corNo}</p>
                          <p className="text-[10px] text-slate-400">{fmt(r.cor.value)}</p>
                        </div>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700">{fmt(r.coa.value)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmt(r.received)}</td>
                    <td className="px-4 py-3 text-right font-medium text-blue-600">{r.submitted > 0 ? fmt(r.submitted) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right font-medium text-amber-600">{r.retention > 0 ? fmt(r.retention) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">{fmt(Math.max(0, r.balance))}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-[90px]">
                        <ProgressBar value={r.received + r.submitted} max={r.coa.value} color="bg-purple-500" className="flex-1" />
                        <span className="text-xs font-bold text-slate-600 w-8 text-right shrink-0">{r.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows.length > 1 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={2} className="px-4 py-3 text-xs font-bold text-slate-700 uppercase tracking-wide">TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold text-purple-700">{fmt(totals.coaValue)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmt(totals.received)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{fmt(totals.submitted)}</td>
                    <td className="px-4 py-3 text-right font-bold text-amber-600">{fmt(totals.retention)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-700">{fmt(Math.max(0, totals.balance))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-bold text-slate-600">{pct(totals.received + totals.submitted, totals.coaValue)}%</span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   REPORT 3 — Follow-up Status Tracker
═══════════════════════════════════════════════════════════════════════════ */
const KANBAN_COLS = {
  bonds: {
    label: 'Bank Bonds',
    icon: Shield,
    color: 'border-blue-400',
    headerBg: 'bg-blue-600',
    lightBg: 'bg-blue-50',
  },
  payments: {
    label: 'Payments',
    icon: CreditCard,
    color: 'border-emerald-400',
    headerBg: 'bg-emerald-600',
    lightBg: 'bg-emerald-50',
  },
  changeorders: {
    label: 'Change Orders',
    icon: GitPullRequest,
    color: 'border-purple-400',
    headerBg: 'bg-purple-600',
    lightBg: 'bg-purple-50',
  },
}

function StatusDot({ status }) {
  const map = {
    'Received':    'bg-emerald-500',
    'Submitted':   'bg-blue-500',
    'In Progress': 'bg-amber-400',
    'Rejected':    'bg-rose-500',
    'Converted':   'bg-emerald-500',
    'Pending':     'bg-amber-400',
    'N/A':         'bg-slate-300',
    'Complete':    'bg-emerald-500',
  }
  return <span className={clsx('w-2 h-2 rounded-full shrink-0', map[status] ?? 'bg-slate-300')} />
}

function KanbanCard({ label, value, status, sub }) {
  const badgeMap = {
    'Received':    'emerald',
    'Submitted':   'blue',
    'In Progress': 'amber',
    'Rejected':    'rose',
    'Converted':   'emerald',
    'Pending':     'amber',
    'N/A':         'slate',
    'Complete':    'emerald',
  }
  return (
    <div className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700 leading-snug flex-1 min-w-0">{label}</p>
        <Badge variant={badgeMap[status] ?? 'slate'} className="text-[9px] shrink-0">{status}</Badge>
      </div>
      {value && <p className="text-xs font-bold text-slate-800 mt-1">{value}</p>}
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Report3({ projects, payments, cors, coas, bondStatuses, selectedProject }) {
  const filteredProjects = selectedProject === 'all'
    ? projects
    : projects.filter(p => p.id === selectedProject)

  // Build per-project kanban data
  const projectItems = filteredProjects.map(proj => {
    // Bonds
    const bs = bondStatuses.find(b => b.projectId === proj.id)
    const bondItems = bs ? [
      { label: 'Performance Bond', status: bs.performanceBond?.status === 'Submitted' ? 'Complete' : bs.performanceBond?.status === 'N/A' ? 'N/A' : 'Pending', sub: bs.performanceBond?.submitDate ? `Submitted ${fmtDate(bs.performanceBond.submitDate)}` : null },
      { label: 'Advance Bond',     status: bs.advanceBond?.status    === 'Submitted' ? 'Complete' : bs.advanceBond?.status    === 'N/A' ? 'N/A' : 'Pending', sub: bs.advanceBond?.submitDate    ? `Submitted ${fmtDate(bs.advanceBond.submitDate)}`    : null },
      { label: 'Warranty Bond',    status: bs.warrantyBond?.status   === 'Submitted' ? 'Complete' : bs.warrantyBond?.status   === 'N/A' ? 'N/A' : 'Pending', sub: bs.warrantyBond?.submitDate   ? `Submitted ${fmtDate(bs.warrantyBond.submitDate)}`   : null },
    ] : []

    // Payments (main)
    const mainPays = payments.filter(p => p.projectId === proj.id && p.type === 'main')
    const payItems = mainPays.map(p => ({
      label: p.paymentNo,
      value: fmt(p.balanceValue),
      status: p.status,
      sub: p.detail?.slice(0, 40) + (p.detail?.length > 40 ? '…' : ''),
    }))

    // CORs + COAs
    const projCORs = cors.filter(c => c.projectId === proj.id)
    const coItems = projCORs.map(c => ({
      label: c.corNo,
      value: fmt(c.value),
      status: c.convertedToCOA ? 'Converted' : c.status === 'Submitted' ? 'Submitted' : 'Pending',
      sub: c.convertedToCOA ? `→ COA: ${coas.find(a => a.id === c.coaId)?.coaNo ?? '—'}` : c.detail?.slice(0, 40),
    }))

    return { proj, bondItems, payItems, coItems }
  })

  // Summary stats for each column
  const bondSummary = {
    complete: bondStatuses.filter(b => filteredProjects.some(p => p.id === b.projectId))
      .flatMap(b => [b.performanceBond, b.advanceBond, b.warrantyBond])
      .filter(b => b?.status === 'Submitted').length,
    total: bondStatuses.filter(b => filteredProjects.some(p => p.id === b.projectId)).length * 3,
  }
  const paymentSummary = {
    received:   payments.filter(p => p.type === 'main' && filteredProjects.some(pr => pr.id === p.projectId) && p.status === 'Received').length,
    inProgress: payments.filter(p => p.type === 'main' && filteredProjects.some(pr => pr.id === p.projectId) && p.status !== 'Received').length,
  }
  const corSummary = {
    converted: cors.filter(c => filteredProjects.some(p => p.id === c.projectId) && c.convertedToCOA).length,
    total:     cors.filter(c => filteredProjects.some(p => p.id === c.projectId)).length,
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Report 3 — Follow-up Status Tracker"
        subtitle="High-level Kanban board showing real-time status of Bonds, Payments, and Change Orders across projects"
      />

      {/* Summary Pills */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl border border-blue-200 px-4 py-3">
          <Shield size={20} className="text-blue-600 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 font-medium">Bonds Submitted</p>
            <p className="text-xl font-bold text-blue-700">{bondSummary.complete}<span className="text-sm text-slate-400 font-normal"> / {bondSummary.total}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3">
          <CreditCard size={20} className="text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 font-medium">Payments Received</p>
            <p className="text-xl font-bold text-emerald-700">{paymentSummary.received}<span className="text-sm text-slate-400 font-normal"> / {paymentSummary.received + paymentSummary.inProgress}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-purple-50 rounded-xl border border-purple-200 px-4 py-3">
          <GitPullRequest size={20} className="text-purple-600 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 font-medium">CORs Converted</p>
            <p className="text-xl font-bold text-purple-700">{corSummary.converted}<span className="text-sm text-slate-400 font-normal"> / {corSummary.total}</span></p>
          </div>
        </div>
      </div>

      {/* Kanban Board — per project */}
      {projectItems.map(({ proj, bondItems, payItems, coItems }) => (
        <div key={proj.id} className="rounded-xl border border-slate-200 overflow-hidden">
          {/* Project header */}
          <div className="flex items-center justify-between px-5 py-3 bg-slate-800">
            <div>
              <p className="text-sm font-bold text-white">{proj.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{proj.clientName} · {proj.contractNo}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="emerald">{proj.status}</Badge>
              <span className="text-xs text-slate-400">{fmt(proj.contractValue)}</span>
            </div>
          </div>

          {/* 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Bonds */}
            <KanbanColumn
              label="Bank Bonds"
              icon={Shield}
              headerBg="bg-blue-600"
              items={bondItems}
              emptyMsg="No bond data"
            />
            {/* Payments */}
            <KanbanColumn
              label="Payment Claims"
              icon={CreditCard}
              headerBg="bg-emerald-600"
              items={payItems}
              emptyMsg="No payment claims"
            />
            {/* Change Orders */}
            <KanbanColumn
              label="Change Orders"
              icon={GitPullRequest}
              headerBg="bg-purple-600"
              items={coItems}
              emptyMsg="No change orders"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function KanbanColumn({ label, icon: Icon, headerBg, items, emptyMsg }) {
  return (
    <div className="flex flex-col">
      <div className={clsx('flex items-center gap-2 px-4 py-2.5', headerBg)}>
        <Icon size={13} className="text-white/80" />
        <span className="text-xs font-semibold text-white">{label}</span>
        <span className="ml-auto text-[10px] font-bold text-white/60 bg-white/10 px-1.5 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="p-3 flex-1 bg-slate-50 space-y-2 min-h-[80px]">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">{emptyMsg}</p>
        ) : items.map((item, i) => (
          <KanbanCard key={i} {...item} />
        ))}
      </div>
    </div>
  )
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="pb-4 border-b border-slate-100">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}
