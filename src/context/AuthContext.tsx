import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { isSessionExpired, clearSession, getRemainingMinutes } from '../lib/session'
import { logout as firebaseLogout } from '../lib/authService'
import type { UserProfile, UserRole, RolePermissions, LegacyUser } from '../types/auth'

// ─── Role → permission map ────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  SuperAdmin: { canManageProjects: true,  canApprovePayments: true,  canConvertCOR: true,  canUpdateBonds: true,  canCreateClaims: true,  globalView: true  },
  Admin:      { canManageProjects: true,  canApprovePayments: true,  canConvertCOR: true,  canUpdateBonds: true,  canCreateClaims: true,  globalView: true  },
  MD:         { canManageProjects: true,  canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: false, globalView: true  },
  GM:         { canManageProjects: true,  canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: false, globalView: true  },
  CD:         { canManageProjects: true,  canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: false, globalView: true  },
  PM:         { canManageProjects: true,  canApprovePayments: true,  canConvertCOR: true,  canUpdateBonds: false, canCreateClaims: false, globalView: false },
  QsEng:      { canManageProjects: false, canApprovePayments: false, canConvertCOR: false, canUpdateBonds: false, canCreateClaims: true,  globalView: false },
  AccCMG:     { canManageProjects: false, canApprovePayments: false, canConvertCOR: false, canUpdateBonds: true,  canCreateClaims: false, globalView: true  },
}

/** Merge permissions from all roles (OR logic) */
function mergePermissions(roles: UserRole[]): RolePermissions {
  const base: RolePermissions = {
    canManageProjects: false,
    canApprovePayments: false,
    canConvertCOR: false,
    canUpdateBonds: false,
    canCreateClaims: false,
    globalView: false,
  }
  for (const r of roles) {
    const p = ROLE_PERMISSIONS[r]
    if (!p) continue
    base.canManageProjects  = base.canManageProjects  || p.canManageProjects
    base.canApprovePayments = base.canApprovePayments || p.canApprovePayments
    base.canConvertCOR      = base.canConvertCOR      || p.canConvertCOR
    base.canUpdateBonds     = base.canUpdateBonds     || p.canUpdateBonds
    base.canCreateClaims    = base.canCreateClaims    || p.canCreateClaims
    base.globalView         = base.globalView         || p.globalView
  }
  return base
}

// ─── Context type ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  // Firebase auth state
  firebaseUser: FirebaseUser | null
  userProfile: UserProfile | null
  loading: boolean
  sessionMinutesLeft: number
  refreshProfile: () => Promise<void>

  // Legacy interface used by existing JSX pages
  currentUser: LegacyUser | null
  setCurrentUser: (u: LegacyUser) => void
  permissions: RolePermissions
  can: (permission: keyof RolePermissions) => boolean
  hasProjectAccess: (projectId: string) => boolean
  USERS: LegacyUser[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ROOT = 'CMG-payment-system/root'

const EMPTY_PERMISSIONS: RolePermissions = {
  canManageProjects: false,
  canApprovePayments: false,
  canConvertCOR: false,
  canUpdateBonds: false,
  canCreateClaims: false,
  globalView: false,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile]   = useState<UserProfile | null>(null)
  const [loading, setLoading]           = useState(true)
  const [sessionMinutesLeft, setSessionMinutesLeft] = useState(0)
  const [allUsers, setAllUsers]         = useState<LegacyUser[]>([])

  // ── fetch profile from Firestore ────────────────────────────────────────
  const fetchAndSetProfile = useCallback(async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, `${ROOT}/users/${uid}`))
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile)
      } else {
        setUserProfile(null)
      }
    } catch {
      setUserProfile(null)
    }
  }, [])

  // Use auth.currentUser directly — avoids stale closure when called right after sign-in
  const refreshProfile = useCallback(async () => {
    const uid = auth.currentUser?.uid
    if (uid) await fetchAndSetProfile(uid)
  }, [fetchAndSetProfile])

  // ── listen to Firebase auth state ───────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)

      if (!fbUser) {
        setUserProfile(null)
        setLoading(false)
        return
      }

      // Session expired → sign out silently
      if (isSessionExpired()) {
        clearSession()
        await firebaseLogout()
        setUserProfile(null)
        setLoading(false)
        return
      }

      await fetchAndSetProfile(fbUser.uid)
      setLoading(false)
    })
    return unsub
  }, [fetchAndSetProfile])

  // ── session countdown ticker (every 60 s) ───────────────────────────────
  useEffect(() => {
    setSessionMinutesLeft(getRemainingMinutes())
    const id = setInterval(() => {
      const mins = getRemainingMinutes()
      setSessionMinutesLeft(mins)
      if (mins <= 0 && firebaseUser) {
        clearSession()
        firebaseLogout().catch(() => {})
      }
    }, 60_000)
    return () => clearInterval(id)
  }, [firebaseUser])

  // ── load all approved users for USERS legacy compat ─────────────────────
  useEffect(() => {
    if (!firebaseUser || !userProfile) return
    getDocs(collection(db, `${ROOT}/users`))
      .then((snap) => {
        const mapped: LegacyUser[] = snap.docs
          .map((d) => {
            const p = d.data() as UserProfile
            return {
              id: p.uid,
              name: `${p.firstName} ${p.lastName}`,
              role: p.role[0] ?? 'QsEng',
              avatar: `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase(),
              assignedProjects: p.assignedProjects,
            } satisfies LegacyUser
          })
        setAllUsers(mapped)
      })
      .catch(() => {})
  }, [firebaseUser, userProfile])

  // ── derived legacy values ────────────────────────────────────────────────
  const permissions = userProfile
    ? mergePermissions(userProfile.role)
    : EMPTY_PERMISSIONS

  const currentUser: LegacyUser | null = userProfile
    ? {
        id: userProfile.uid,
        name: `${userProfile.firstName} ${userProfile.lastName}`,
        role: userProfile.role[0] ?? 'QsEng',
        avatar: `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}`.toUpperCase(),
        assignedProjects: userProfile.assignedProjects,
      }
    : null

  const can = (permission: keyof RolePermissions) => !!permissions[permission]

  const hasProjectAccess = (projectId: string) => {
    if (permissions.globalView) return true
    return (userProfile?.assignedProjects ?? []).includes(projectId)
  }

  // noop — real auth doesn't allow arbitrary user switching
  const setCurrentUser = (_u: LegacyUser) => {}

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        sessionMinutesLeft,
        refreshProfile,
        currentUser,
        setCurrentUser,
        permissions,
        can,
        hasProjectAccess,
        USERS: allUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Legacy named exports kept for backward compat with Header.jsx imports
export const ROLES = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  MD: 'MD',
  GM: 'GM',
  CD: 'CD',
  PM: 'PM',
  QsEng: 'QsEng',
  AccCMG: 'AccCMG',
} as const
