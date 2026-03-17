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
  const { can, hasProjectAccess, currentUser } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const isSuperAdmin = currentUser?.role === 'SuperAdmin'

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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {visible.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              canEdit={can('canManageProjects')}
              canDelete={isSuperAdmin}
              onView={() => navigate(`/projects/${project.id}`)}
              onEdit={() => navigate(`/projects/${project.id}/edit`)}
              onDelete={() => handleDeleteProject(project.id, project.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, canEdit, canDelete, onView, onEdit, onDelete }) {
  return (
    <Card padding={false} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
      {/* Color bar */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-blue-700" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 truncate text-sm leading-snug">{project.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{project.contractNo}</p>
          </div>
          <Badge variant={STATUS_VARIANT[project.status] ?? 'slate'}>{project.status}</Badge>
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{project.clientName}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span className="truncate">{project.location}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar size={12} className="text-slate-400 shrink-0" />
            <span>{formatDate(project.startDate)} – {formatDate(project.finishDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <TrendingUp size={12} className="text-slate-400 shrink-0" />
            <span className="font-medium text-slate-700">{formatCurrency(project.contractValue)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{project.contractType}</span>
          {project.retentionRequired && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Ret. {project.retentionPercent}%</span>
          )}
          <div className="flex-1" />
          <button onClick={onView} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
            <Eye size={13} /> View
          </button>
          {canEdit && (
            <button onClick={onEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors ml-2">
              <Edit size={13} /> Edit
            </button>
          )}
          {canDelete && (
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-700 font-medium transition-colors ml-2">
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
