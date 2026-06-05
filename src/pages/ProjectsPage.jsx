import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, FolderOpen, MapPin, User, Calendar, TrendingUp, Edit, Eye, Trash2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { clsx } from 'clsx'

const STATUS_VARIANT = { Active: 'emerald', Completed: 'blue', 'On Hold': 'amber', Cancelled: 'rose' }

function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('th-TH', { style: 'decimal', minimumFractionDigits: 0 }).format(val) + ' ฿'
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ProjectsPage() {
  const { projects, deleteProject } = useData()
  const { can, hasProjectAccess, userProfile } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const isSuperAdmin = userProfile?.role?.includes('SuperAdmin') || userProfile?.role?.includes('MasterAdmin')

  async function handleDeleteProject(id, name) {
    if (!window.confirm(`ยืนยันการลบโปรเจกต์ "${name}"?\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return
    await deleteProject(id)
  }

  const visible = projects.filter(p =>
    hasProjectAccess(p.id) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) ||
     p.clientName?.toLowerCase().includes(search.toLowerCase()) ||
     p.location?.toLowerCase().includes(search.toLowerCase()))
  )

  const activeProjects = visible.filter(p => p.status === 'Active')
  const otherProjects = visible.filter(p => p.status !== 'Active')

  const renderTable = (projectList, title) => {
    if (projectList.length === 0) return null
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-4 last:mb-0">
        {title && (
          <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50/80">
            <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Project No</th>
                <th className="px-2 py-1.5 font-semibold">Project Name</th>
                <th className="px-2 py-1.5 font-semibold">Client</th>
                <th className="px-2 py-1.5 font-semibold">Location</th>
                <th className="px-2 py-1.5 font-semibold text-right">Value</th>
                <th className="px-2 py-1.5 font-semibold text-center">Status</th>
                <th className="px-2 py-1.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectList.map(project => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  canEdit={can('canManageProjects')}
                  canDelete={isSuperAdmin && !project.isMaster}
                  onView={() => navigate(`/projects/${project.id}`)}
                  onEdit={() => navigate(`/projects/${project.id}/edit`)}
                  onDelete={() => handleDeleteProject(project.id, project.name)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
          />
        </div>
        {can('canManageProjects') && (
          <Button icon={Plus} onClick={() => navigate('/projects/new')}>
            New Project
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: visible.length, color: 'text-blue-600' },
          { label: 'Active', value: visible.filter(p => p.status === 'Active').length, color: 'text-emerald-600' },
          { label: 'Total Value', value: formatCurrency(visible.reduce((s, p) => s + (p.contractValue || 0), 0)), color: 'text-slate-800' },
          { label: 'On Hold', value: visible.filter(p => p.status === 'On Hold').length, color: 'text-amber-600' },
        ].map(stat => (
          <Card key={stat.label} className="!p-4">
            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
            <p className={clsx('text-xl font-bold mt-1', stat.color)}>{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Projects Grid */}
      {visible.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-3">
          <FolderOpen size={40} className="text-slate-300" />
          <p className="text-slate-500 font-medium">No projects found</p>
          <p className="text-slate-400 text-sm">
            {can('canManageProjects') ? 'Create your first project to get started.' : 'No projects are currently assigned to you.'}
          </p>
          {can('canManageProjects') && (
            <Button icon={Plus} size="sm" className="mt-1" onClick={() => navigate('/projects/new')}>
              New Project
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-0">
          {renderTable(activeProjects, 'Active Projects')}
          {renderTable(otherProjects, 'Other Projects')}
        </div>
      )}
    </div>
  )
}

function ProjectListItem({ project, canEdit, canDelete, onView, onEdit, onDelete }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
      <td className="px-2 py-1 font-medium text-slate-700">{project.jobNo || '—'}</td>
      <td className="px-2 py-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">{project.name}</span>
          {project.isMaster && (
            <span className="text-[9px] font-medium text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 leading-none">Master</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full leading-none">{project.contractType || '—'}</span>
        </div>
      </td>
      <td className="px-2 py-1 text-slate-600">{project.clientName || '—'}</td>
      <td className="px-2 py-1 text-slate-600 truncate max-w-[150px]">{project.location || '—'}</td>
      <td className="px-2 py-1 font-medium text-slate-700 text-right">{formatCurrency(project.contractValue)}</td>
      <td className="px-2 py-1 text-center">
        <Badge variant={STATUS_VARIANT[project.status] ?? 'slate'}>{project.status}</Badge>
      </td>
      <td className="px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onView} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View">
            <Eye size={14} />
          </button>
          {canEdit && (
            <button onClick={onEdit} className="p-1 text-slate-500 hover:bg-slate-100 rounded transition-colors" title="Edit">
              <Edit size={14} />
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors" title="Delete">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  )
}
