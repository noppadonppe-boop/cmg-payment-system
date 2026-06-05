import { useState, useEffect, useRef } from 'react'
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
import { Check, X, Trash2, Shield, Users, Clock, UserCheck, UserX, FolderOpen, Pencil, Save, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'

const ROOT = 'CMG-payment-system/root'

const ROLE_COLORS: Record<string, string> = {
  MasterAdmin: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-300 font-bold',
  SuperAdmin:  'bg-purple-100 text-purple-700 border-purple-200',
  Admin:       'bg-indigo-100 text-indigo-700 border-indigo-200',
  MD:          'bg-blue-100 text-blue-700 border-blue-200',
  GM:          'bg-sky-100 text-sky-700 border-sky-200',
  CD:          'bg-cyan-100 text-cyan-700 border-cyan-200',
  PM:          'bg-emerald-100 text-emerald-700 border-emerald-200',
  CM:          'bg-teal-100 text-teal-700 border-teal-200',
  QsEng:       'bg-amber-100 text-amber-700 border-amber-200',
  AccCMG:      'bg-rose-100 text-rose-700 border-rose-200',
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
  const activeProjects = projects.filter(p => p.status?.toUpperCase() === 'ACTIVE')
  const [users,       setUsers]       = useState<UserProfile[]>([])
  const [tab,         setTab]         = useState<Tab>('pending')
  const [busyUid,     setBusyUid]     = useState<string | null>(null)

  // ── Edit mode state (one user at a time) ──────────────────────────────────
  const [editingUid,     setEditingUid]     = useState<string | null>(null)
  const [editRoles,      setEditRoles]      = useState<UserRole[]>([])
  const [editProjects,   setEditProjects]   = useState<string[]>([])

  // ── Dropdown state ────────────────────────────────────────────────────────
  const [openRoleDropdown,    setOpenRoleDropdown]    = useState<string | null>(null)
  const [openProjectDropdown, setOpenProjectDropdown] = useState<string | null>(null)
  const roleDropdownRef    = useRef<HTMLDivElement>(null)
  const projectDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setOpenRoleDropdown(null)
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setOpenProjectDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // ── Edit helpers ──────────────────────────────────────────────────────────
  function startEdit(user: UserProfile) {
    setEditingUid(user.uid)
    setEditRoles([...user.role])
    setEditProjects([...(user.assignedProjects ?? [])])
  }

  function cancelEdit() {
    setEditingUid(null)
    setEditRoles([])
    setEditProjects([])
    setOpenRoleDropdown(null)
    setOpenProjectDropdown(null)
  }

  async function saveEdit(uid: string) {
    if (editRoles.length === 0) return
    setBusyUid(uid)
    try {
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), {
        role: editRoles,
        assignedProjects: editProjects,
      })
      setEditingUid(null)
      setEditRoles([])
      setEditProjects([])
      setOpenRoleDropdown(null)
      setOpenProjectDropdown(null)
    } finally {
      setBusyUid(null)
    }
  }

  function toggleRole(role: UserRole) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    )
  }

  function toggleProject(projectId: string) {
    setEditProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    )
  }

  // ── Approve / Reject / Delete ─────────────────────────────────────────────
  async function approve(uid: string) {
    setBusyUid(uid)
    try {
      const user = users.find((u) => u.uid === uid)
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), {
        status: 'approved',
        role: user?.role ?? ['QsEng'],
      })
    } finally { setBusyUid(null) }
  }

  async function reject(uid: string) {
    setBusyUid(uid)
    try {
      await updateDoc(doc(db, `${ROOT}/users/${uid}`), { status: 'rejected' })
    } finally { setBusyUid(null) }
  }

  async function deleteUser(uid: string) {
    if (!confirm('ยืนยันการลบผู้ใช้งานนี้?')) return
    setBusyUid(uid)
    try {
      await deleteDoc(doc(db, `${ROOT}/users/${uid}`))
    } finally { setBusyUid(null) }
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
  const isMasterAdmin = me?.role.includes('MasterAdmin')

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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">ผู้ใช้งาน</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">อีเมล</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">ตำแหน่ง</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">สถานะ</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">สิทธิ์การใช้งาน</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600">โครงการ</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => {
                const isBusy     = busyUid === user.uid
                const isMe       = user.uid === me?.uid
                const isEditing  = editingUid === user.uid
                const cfg        = STATUS_CONFIG[user.status]
                const StatusIcon = cfg.icon

                // Display values: use edit draft when in edit mode, otherwise Firestore data
                const displayRoles    = isEditing ? editRoles    : user.role
                const displayProjects = isEditing ? editProjects : (user.assignedProjects ?? [])

                return (
                  <tr
                    key={user.uid}
                    className={clsx(
                      'border-b border-slate-100 hover:bg-slate-50 transition',
                      isEditing && 'bg-blue-50/30',
                    )}
                  >
                    {/* User info */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={`${user.firstName} ${user.lastName}`}
                            className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={clsx(
                          'w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0',
                          user.photoURL && 'hidden'
                        )}>
                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {user.firstName} {user.lastName}
                            {isMe && <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">คุณ</span>}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">{user.email}</p>
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">{user.position || '-'}</p>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border', cfg.color)}>
                        <StatusIcon size={10} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Roles - Dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative" ref={openRoleDropdown === user.uid ? roleDropdownRef : null}>
                        <button
                          onClick={() => {
                            if (isEditing && !isMe) {
                              setOpenRoleDropdown(openRoleDropdown === user.uid ? null : user.uid)
                            }
                          }}
                          disabled={!isEditing || isMe}
                          className={clsx(
                            'w-full min-w-[160px] px-2.5 py-1.5 rounded-lg border text-xs font-medium text-left flex items-center justify-between gap-2 transition',
                            isEditing && !isMe
                              ? 'bg-white border-slate-300 hover:border-blue-400 cursor-pointer'
                              : 'bg-slate-50 border-slate-200 cursor-default',
                          )}
                        >
                          <span className="truncate">
                            {displayRoles.length === 0 ? (
                              <span className="text-slate-400">เลือกสิทธิ์...</span>
                            ) : displayRoles.length === 1 ? (
                              displayRoles[0]
                            ) : (
                              `${displayRoles.length} สิทธิ์`
                            )}
                          </span>
                          {isEditing && !isMe && <ChevronDown size={14} className="shrink-0 text-slate-400" />}
                        </button>

                        {/* Dropdown menu */}
                        {openRoleDropdown === user.uid && isEditing && !isMe && (
                          <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                            {USER_ROLES.map((role) => {
                              const checked = displayRoles.includes(role)
                              return (
                                <label
                                  key={role}
                                  className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleRole(role)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className={clsx(
                                    'text-xs font-medium px-2 py-0.5 rounded border',
                                    checked ? ROLE_COLORS[role] : 'bg-slate-50 text-slate-600 border-slate-200',
                                  )}>
                                    {role}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {isEditing && editRoles.length === 0 && (
                        <p className="mt-1 text-xs text-rose-500">เลือกอย่างน้อย 1</p>
                      )}
                    </td>

                    {/* Projects - Dropdown */}
                    <td className="px-4 py-3">
                      {user.status === 'approved' ? (
                        <div className="relative" ref={openProjectDropdown === user.uid ? projectDropdownRef : null}>
                          <button
                            onClick={() => {
                              if (isEditing && !isMe) {
                                setOpenProjectDropdown(openProjectDropdown === user.uid ? null : user.uid)
                              }
                            }}
                            disabled={!isEditing || isMe || projects.length === 0}
                            className={clsx(
                              'w-full min-w-[160px] px-2.5 py-1.5 rounded-lg border text-xs font-medium text-left flex items-center justify-between gap-2 transition',
                              isEditing && !isMe && projects.length > 0
                                ? 'bg-white border-slate-300 hover:border-blue-400 cursor-pointer'
                                : 'bg-slate-50 border-slate-200 cursor-default',
                            )}
                          >
                            <span className="truncate">
                              {projects.length === 0 ? (
                                <span className="text-slate-400">ไม่มีโครงการ</span>
                              ) : displayProjects.length === 0 ? (
                                <span className="text-slate-400">เลือกโครงการ...</span>
                              ) : displayProjects.length === 1 ? (
                                projects.find((p) => p.id === displayProjects[0])?.name || displayProjects[0]
                              ) : (
                                `${displayProjects.length} โครงการ`
                              )}
                            </span>
                            {isEditing && !isMe && projects.length > 0 && <ChevronDown size={14} className="shrink-0 text-slate-400" />}
                          </button>

                          {/* Dropdown menu */}
                          {openProjectDropdown === user.uid && isEditing && !isMe && projects.length > 0 && (
                            <div className="absolute z-50 mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                              {activeProjects.map((proj) => {
                                const checked = displayProjects.includes(proj.id)
                                return (
                                  <label
                                    key={proj.id}
                                    className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer transition"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleProject(proj.id)}
                                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-slate-700 truncate">{proj.name}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit / Save / Cancel */}
                        {!isMe && user.status === 'approved' && (
                          isEditing ? (
                            <>
                              <button
                                onClick={() => saveEdit(user.uid)}
                                disabled={isBusy || editRoles.length === 0}
                                title="บันทึก"
                                className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition"
                              >
                                {isBusy ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Save size={14} />
                                )}
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={isBusy}
                                title="ยกเลิก"
                                className="p-1.5 border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-slate-600 rounded-lg transition"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => startEdit(user)}
                              disabled={isBusy || editingUid !== null}
                              title="แก้ไข"
                              className="p-1.5 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:opacity-40 text-slate-600 rounded-lg transition"
                            >
                              <Pencil size={14} />
                            </button>
                          )
                        )}

                        {/* Approve */}
                        {!isMe && user.status !== 'approved' && (
                          <button
                            onClick={() => approve(user.uid)}
                            disabled={isBusy}
                            title="อนุมัติ"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition"
                          >
                            {isBusy ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                          </button>
                        )}

                        {/* Reject */}
                        {!isMe && user.status !== 'rejected' && (
                          <button
                            onClick={() => reject(user.uid)}
                            disabled={isBusy}
                            title="ปฏิเสธ"
                            className="p-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg transition"
                          >
                            {isBusy ? (
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X size={14} />
                            )}
                          </button>
                        )}

                        {/* Delete */}
                        {!isMe && (isSuperAdmin || isMasterAdmin) && (
                          <button
                            onClick={() => deleteUser(user.uid)}
                            disabled={isBusy}
                            title="ลบ"
                            className="p-1.5 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 disabled:opacity-50 text-slate-500 rounded-lg transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
