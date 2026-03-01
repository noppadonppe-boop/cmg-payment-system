import { createContext, useContext, useState } from 'react'

export const ROLES = {
  MD: 'MD',
  GM: 'GM',
  CD: 'CD',
  PM: 'PM',
  QsEng: 'QsEng',
  AccCMG: 'AccCMG',
}

export const USERS = [
  { id: 'u1', name: 'Somchai Jaidee', role: ROLES.MD, avatar: 'SJ', assignedProjects: [] },
  { id: 'u2', name: 'Wanchai Pradit', role: ROLES.GM, avatar: 'WP', assignedProjects: [] },
  { id: 'u3', name: 'Chalee Nontri', role: ROLES.CD, avatar: 'CN', assignedProjects: [] },
  { id: 'u4', name: 'Priya Tanaka', role: ROLES.PM, avatar: 'PT', assignedProjects: ['p1', 'p2'] },
  { id: 'u5', name: 'Nattapol Siri', role: ROLES.PM, avatar: 'NS', assignedProjects: ['p3'] },
  { id: 'u6', name: 'Kamon Watcharee', role: ROLES.QsEng, avatar: 'KW', assignedProjects: ['p1', 'p2'] },
  { id: 'u7', name: 'Sunisa Lertpong', role: ROLES.QsEng, avatar: 'SL', assignedProjects: ['p3'] },
  { id: 'u8', name: 'Rattana Boonmee', role: ROLES.AccCMG, avatar: 'RB', assignedProjects: [] },
]

export const ROLE_PERMISSIONS = {
  [ROLES.MD]:     { canManageProjects: true,  canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: false, globalView: true },
  [ROLES.GM]:     { canManageProjects: true,  canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: false, globalView: true },
  [ROLES.CD]:     { canManageProjects: true,  canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: false, globalView: true },
  [ROLES.PM]:     { canManageProjects: true,  canApprovePayments: true,  canConvertCOR: true,  canUpdateBonds: false, canCreateClaims: false, globalView: false },
  [ROLES.QsEng]:  { canManageProjects: false, canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: true,  globalView: false },
  [ROLES.AccCMG]: { canManageProjects: false, canApprovePayments: false, canConvertCOR: false, canUpdateBonds: true,  canCreateClaims: false, globalView: true },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(USERS[0])

  const permissions = ROLE_PERMISSIONS[currentUser.role]

  const can = (permission) => !!permissions[permission]

  const hasProjectAccess = (projectId) => {
    if (permissions.globalView) return true
    return currentUser.assignedProjects.includes(projectId)
  }

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, permissions, can, hasProjectAccess, USERS }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
