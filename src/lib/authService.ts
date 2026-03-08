import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc,
} from 'firebase/firestore'
import { auth, db } from '../firebase'
import { setSessionExpiry, clearSession } from './session'
import type { UserProfile, AppMetaConfig } from '../types/auth'

const APP_NAME = 'CMG-payment-system'
const ROOT = `${APP_NAME}/root`

const userRef = (uid: string) => doc(db, `${ROOT}/users/${uid}`)
const metaRef = () => doc(db, `${ROOT}/appMeta/config`)

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(userRef(uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  } catch {
    return null
  }
}

async function createUserProfile(
  uid: string,
  email: string,
  firstName: string,
  lastName: string,
  position: string,
  photoURL?: string,
): Promise<UserProfile> {
  return runTransaction(db, async (tx) => {
    const metaSnap = await tx.get(metaRef())
    const meta = metaSnap.exists() ? (metaSnap.data() as AppMetaConfig) : null
    const isFirstUser = !meta?.firstUserRegistered

    const profile: UserProfile = {
      uid,
      email,
      firstName,
      lastName,
      position,
      role: isFirstUser ? ['SuperAdmin'] : ['QsEng'],
      status: isFirstUser ? 'approved' : 'pending',
      assignedProjects: [],
      createdAt: serverTimestamp() as UserProfile['createdAt'],
      isFirstUser,
      ...(photoURL ? { photoURL } : {}),
    }

    tx.set(userRef(uid), profile)
    tx.set(metaRef(), {
      firstUserRegistered: true,
      totalUsers: (meta?.totalUsers ?? 0) + 1,
      createdAt: meta?.createdAt ?? serverTimestamp(),
    })

    return profile
  })
}

function logActivity(action: string, uid: string, email: string): void {
  addDoc(collection(db, `${ROOT}/activityLogs`), {
    action,
    uid,
    email,
    timestamp: serverTimestamp(),
  }).catch(() => {})
}

// ─── public API ─────────────────────────────────────────────────────────────

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<UserProfile> {
  // Must call setSessionExpiry BEFORE any awaits to prevent race with onAuthStateChanged
  setSessionExpiry()
  const { user } = await signInWithEmailAndPassword(auth, email, password)
  await user.getIdToken(true)
  const profile = await fetchProfile(user.uid)
  if (!profile) throw new Error('user-profile-not-found')
  logActivity('LOGIN', user.uid, email)
  return profile
}

export async function loginWithGoogle(): Promise<UserProfile> {
  setSessionExpiry()
  const provider = new GoogleAuthProvider()
  const { user } = await signInWithPopup(auth, provider)
  await user.getIdToken(true)

  let profile = await fetchProfile(user.uid)
  if (!profile) {
    const parts = (user.displayName ?? '').split(' ')
    profile = await createUserProfile(
      user.uid,
      user.email ?? '',
      parts[0] ?? '',
      parts.slice(1).join(' '),
      '',
      user.photoURL ?? undefined,
    )
    logActivity('REGISTER', user.uid, user.email ?? '')
  } else {
    logActivity('LOGIN', user.uid, user.email ?? '')
  }
  return profile
}

export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  position: string,
): Promise<UserProfile> {
  setSessionExpiry()
  const { user } = await createUserWithEmailAndPassword(auth, email, password)
  await user.getIdToken(true)
  const profile = await createUserProfile(user.uid, email, firstName, lastName, position)
  logActivity('REGISTER', user.uid, email)
  return profile
}

export async function logout(): Promise<void> {
  await signOut(auth)
  clearSession()
}

export { fetchProfile }
