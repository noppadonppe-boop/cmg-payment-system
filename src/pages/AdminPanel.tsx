import { useState, useEffect } from 'react'
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { USER_ROLES, type UserProfile, type UserRole } from '../types/auth'
import { Check, X, Trash2, Shield, Users, Clock, UserCheck, UserX, FolderOpen } from 'lucide-react'
import { clsx } from 'clsx'

const ROOT = 'CMG-payment-system/root'

const ROLE_COLORS: Record<string, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-700 border-purple-200',
  Admin:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  MD:         'bg-blue-100 text-blue-700 border-blue-200',
  GM:         'bg-sky-100 text-sky-700 border-sky-200',
  CD:         'bg-cyan-100 text-cyan-700 border-cyan-200',
  PM:         'bg-emerald-100 text-emerald-700 border-emerald-200',
  CM:         'bg-teal-100 text-teal-700 border-teal-200',
  QsEng:      'bg-amber-100 text-amber-700 border-amber-200',
  AccCMG:     'bg-rose-100 text-rose-700 border-rose-200',
}

const STATUS_CONFIG = {
  pending:  { label: 'รอการอนุมัติ', icon: Clock,     color: 'text-amber-600  bg-amber-50  border-amber-200'  },
  approved: { label: 'อนุมัติแล้ว',  icon: UserCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  rejected: { label: 'ถูกปฏิเสธ',   icon: UserX,     color: 'text-rose-600   bg-rose-50   border-rose-200'   },
}

type Tab = 'pending' | 'approved' | 'rejected' | 'all'

export default function AdminPanel() {
  const { userProfile: me } = useAuth()
  const { projects } = useData()
  const [users,        setUsers]        = useState<UserProfile[]>([])
  const [tab,          setTab]          = useState<Tab>('pending')
  const [busyUid,      setBusyUid]      = useState<string | null>(null)
  const [editRoles,    setEditRoles]    = useState<Record<string, UserRole[]>>({})
  const [editProjects, setEditProjects] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, `${ROOT}/users`),
      (snap) => setUsers(snap.docs.map((d) => d.data() as UserProfile)),
      (err)  => console.error('AdminPanel users listener:', err),
    )
    return unsub
  }, [])

  const filtered = tab === 'all'
    ? users
    : users.filter((u) => u.status === tab)

  async function approve(uid: string) {
    setBusyUid(uid)
    try {
      const roles = editRoles[uid] ?? users.find((u) => u.uid === uid)?.role ?? ['QsEng']
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), { status: 'approved', role: roles })
    } finally { setBusyUid(null) }
  }

  async function reject(uid: string) {
    setBusyUid(uid)
    try {
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), { status: 'rejected' })
    } finally { setBusyUid(null) }
  }

  async function updateRoles(uid: string, roles: UserRole[]) {
    if (roles.length === 0) return
    setBusyUid(uid)
    try {
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), { role: roles })
      setEditRoles((p) => {
        const n = { ...p }; delete n[uid]; return n
      })
    } finally { setBusyUid(null) }
  }

  function toggleProject(uid: string, projectId: string) {
    setEditProjects((prev) => {
      const current = prev[uid] ?? users.find((u) => u.uid === uid)?.assignedProjects ?? []
      const next = current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId]
      return { ...prev, [uid]: next }
    })
  }

  async function updateAssignedProjects(uid: string, projectIds: string[]) {
    setBusyUid(uid)
    try {
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), { assignedProjects: projectIds })
      setEditProjects((p) => {
        const n = { ...p }; delete n[uid]; return n
      })
    } finally { setBusyUid(null) }
  }

  async function deleteUser(uid: string) {
    if (!confirm('ยืนยันการลบผู้ใช้งานนี้?')) return
    setBusyUid(uid)
    try {
      await deleteDoc(doc(db, `${ROOT}/users/${uid}`))
    } finally { setBusyUid(null) }
  }

  function toggleRoleEdit(uid: string, role: UserRole) {
    setEditRoles((prev) => {
      const current = prev[uid] ?? users.find((u) => u.uid === uid)?.role ?? ['QsEng']
      const next = current.includes(role)
        ? current.filter((r) => r !== role)
        : [...current, role]
      return { ...prev, [uid]: next }
    })
  }

  const counts = {
    pending:  users.filter((u) => u.status === 'pending').length,
    approved: users.filter((u) => u.status === 'approved').length,
    rejected: users.filter((u) => u.status === 'rejected').length,
    all:      users.length,
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending',  label: `รอการอนุมัติ (${counts.pending})`  },
    { key: 'approved', label: `อนุมัติแล้ว (${counts.approved})`  },
    { key: 'rejected', label: `ถูกปฏิเสธ (${counts.rejected})`   },
    { key: 'all',      label: `ทั้งหมด (${counts.all})`          },
  ]

  const isSuperAdmin = me?.role.includes('SuperAdmin')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
          <Shield size={20} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">จัดการผู้ใช้งาน</h1>
          <p className="text-sm text-slate-500">อนุมัติ / ปฏิเสธ / กำหนดสิทธิ์ผู้ใช้งานระบบ</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'ทั้งหมด',        value: counts.all,      icon: Users,     color: 'bg-slate-50 border-slate-200 text-slate-700' },
          { label: 'รอการอนุมัติ',  value: counts.pending,  icon: Clock,     color: 'bg-amber-50 border-amber-200 text-amber-700'  },
          { label: 'อนุมัติแล้ว',   value: counts.approved, icon: UserCheck, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'ถูกปฏิเสธ',     value: counts.rejected, icon: UserX,     color: 'bg-rose-50 border-rose-200 text-rose-700'     },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={clsx('rounded-xl border px-4 py-3 flex items-center gap-3', color)}>
            <Icon size={18} className="shrink-0 opacity-70" />
            <div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-xs opacity-70 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              tab === key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">ไม่มีผู้ใช้งานในหมวดนี้</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => {
            const isBusy   = busyUid === user.uid
            const isMe     = user.uid === me?.uid
            const cfg      = STATUS_CONFIG[user.status]
            const StatusIcon = cfg.icon
            const roles     = editRoles[user.uid] ?? user.role
            const rolesChanged = JSON.stringify([...roles].sort()) !== JSON.stringify((user.role ?? []).slice().sort())
            const selectedProjects = editProjects[user.uid] ?? user.assignedProjects ?? []
            const projectsChanged = JSON.stringify([...selectedProjects].sort()) !== JSON.stringify((user.assignedProjects ?? []).slice().sort())

            return (
              <div
                key={user.uid}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                      {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {user.firstName} {user.lastName}
                        {isMe && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">คุณ</span>}
                      </p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                      {user.position && <p className="text-xs text-slate-400">{user.position}</p>}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0', cfg.color)}>
                    <StatusIcon size={11} />
                    {cfg.label}
                  </span>
                </div>

                {/* Roles */}
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">สิทธิ์การใช้งาน</p>
                  <div className="flex flex-wrap gap-1.5">
                    {USER_ROLES.map((r) => {
                      const active = roles.includes(r)
                      return (
                        <button
                          key={r}
                          onClick={() => !isMe && toggleRoleEdit(user.uid, r)}
                          disabled={isMe || isBusy}
                          className={clsx(
                            'px-2.5 py-1 rounded-lg text-xs font-semibold border transition',
                            active
                              ? ROLE_COLORS[r]
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300',
                            isMe && 'cursor-not-allowed opacity-70',
                          )}
                        >
                          {r}
                        </button>
                      )
                    })}
                  </div>
                  {rolesChanged && (
                    <button
                      onClick={() => updateRoles(user.uid, roles)}
                      disabled={isBusy}
                      className="mt-2 text-xs text-blue-600 hover:underline font-medium"
                    >
                      บันทึกการเปลี่ยนแปลงสิทธิ์
                    </button>
                  )}
                </div>

                {/* Projects (ซึ่ง user มองเห็นได้) */}
                {user.status === 'approved' && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1.5">
                      <FolderOpen size={12} />
                      โครงการ (กำหนดว่า user นี้มองเห็นโครงการใดบ้าง)
                    </p>
                    {projects.length === 0 ? (
                      <p className="text-xs text-slate-400">ยังไม่มีโครงการในระบบ</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {projects.map((proj) => {
                          const checked = selectedProjects.includes(proj.id)
                          return (
                            <label
                              key={proj.id}
                              className={clsx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition',
                                checked
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300',
                                isMe && 'cursor-not-allowed opacity-70',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => !isMe && toggleProject(user.uid, proj.id)}
                                disabled={isMe || isBusy}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="truncate max-w-[180px]">{proj.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    {projectsChanged && projects.length > 0 && (
                      <button
                        onClick={() => updateAssignedProjects(user.uid, selectedProjects)}
                        disabled={isBusy}
                        className="mt-2 text-xs text-blue-600 hover:underline font-medium"
                      >
                        บันทึกการกำหนดโครงการ
                      </button>
                    )}
                  </div>
                )}

                {/* Actions */}
                {!isMe && (
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    {user.status !== 'approved' && (
                      <button
                        onClick={() => approve(user.uid)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                      >
                        {isBusy ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check size={12} />}
                        อนุมัติ
                      </button>
                    )}
                    {user.status !== 'rejected' && (
                      <button
                        onClick={() => reject(user.uid)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition"
                      >
                        {isBusy ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <X size={12} />}
                        ปฏิเสธ
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => deleteUser(user.uid)}
                        disabled={isBusy}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50 text-slate-500 text-xs font-semibold rounded-lg transition ml-auto"
                      >
                        <Trash2 size={12} />
                        ลบ
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
