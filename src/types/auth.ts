import type { Timestamp } from 'firebase/firestore'

export const USER_ROLES = [
  'SuperAdmin',
  'Admin',
  'MD',
  'GM',
  'CD',
  'PM',
  'CM',
  'QsEng',
  'AccCMG',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export interface UserProfile {
  uid: string
  email: string
  firstName: string
  lastName: string
  position: string
  /** A user can have more than one role */
  role: UserRole[]
  status: 'pending' | 'approved' | 'rejected'
  assignedProjects: string[]
  createdAt: Timestamp
  photoURL?: string
  isFirstUser: boolean
  /** Phone number in E.164 format e.g. +66891234567 */
  phone?: string
}

export interface AppMetaConfig {
  firstUserRegistered: boolean
  totalUsers: number
  createdAt: Timestamp
}

/** Permissions shape kept identical to the legacy mock-auth system */
export interface RolePermissions {
  canManageProjects: boolean
  canApprovePayments: boolean
  canConvertCOR: boolean
  canUpdateBonds: boolean
  canCreateClaims: boolean
  globalView: boolean
}

/** Minimal shape the legacy JSX pages expect from currentUser */
export interface LegacyUser {
  id: string
  name: string
  role: UserRole
  /** Full role list from Firestore (for filtering PM/CM in dropdowns) */
  roles?: UserRole[]
  avatar: string
  assignedProjects: string[]
}
