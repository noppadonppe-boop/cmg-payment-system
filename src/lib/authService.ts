import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithCredential,
  type ConfirmationResult,
  type ApplicationVerifier,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  collection,
  addDoc,
  updateDoc,
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

// ─── Google credential cache (for restoring session after phone OTP) ─────────
const GCRED_KEY = '_gcred'

export async function loginWithGoogle(): Promise<UserProfile> {
  setSessionExpiry()
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(auth, provider)
  const { user } = result

  // Save the raw Google OAuth credential so we can restore the session
  // after phone OTP verification (which temporarily signs in as phone user)
  const gCred = GoogleAuthProvider.credentialFromResult(result)
  if (gCred?.idToken) {
    sessionStorage.setItem(GCRED_KEY, JSON.stringify({
      idToken:     gCred.idToken,
      accessToken: gCred.accessToken ?? null,
    }))
  }

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

// ─── Phone OTP (2FA) ─────────────────────────────────────────────────────────

/** Singleton RecaptchaVerifier — สร้างครั้งเดียว อ้างอิง container ใน index.html */
let _recaptchaVerifier: RecaptchaVerifier | null = null
/** เก็บ ConfirmationResult จาก signInWithPhoneNumber ระหว่าง OTP flow */
let _confirmation: ConfirmationResult | null = null

/** แปลงเบอร์ไทย 0XXXXXXXXX → +66XXXXXXXXX สำหรับ Firebase */
export function toE164Thai(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (phone.startsWith('+')) return phone
  if (digits.startsWith('66')) return `+${digits}`
  return `+66${digits.replace(/^0/, '')}`
}

/** รีเซ็ต RecaptchaVerifier singleton (เรียกหลังส่ง OTP ผิดพลาด) */
export function resetRecaptchaVerifier(): void {
  try { _recaptchaVerifier?.clear() } catch { /* ignore */ }
  _recaptchaVerifier = null
}

/**
 * Singleton RecaptchaVerifier — ใช้ container #recaptcha-container ใน index.html
 * สร้างครั้งเดียวและ render ก่อน เพื่อป้องกัน auth/invalid-app-credential
 */
async function getRecaptchaVerifier(): Promise<ApplicationVerifier> {
  if (!_recaptchaVerifier) {
    _recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        // Token หมดอายุ → reset ให้ create ใหม่ครั้งต่อไป
        _recaptchaVerifier = null
      },
    })
    await _recaptchaVerifier.render()
  }
  return _recaptchaVerifier
}

/**
 * ส่ง OTP ด้วย signInWithPhoneNumber (standard Firebase API)
 * RecaptchaVerifier จัดการภายใน — caller ไม่ต้องส่งมา
 */
export async function sendPhoneOTP(phoneE164: string): Promise<string> {
  try {
    const verifier = await getRecaptchaVerifier()
    const cr = await signInWithPhoneNumber(auth, phoneE164, verifier)
    _confirmation = cr
    return cr.verificationId
  } catch (err) {
    // Reset verifier on any error so next attempt gets a fresh token
    resetRecaptchaVerifier()
    throw err
  }
}

/**
 * ตรวจสอบ OTP แล้ว restore Google session กลับ
 * - confirm(otp) จะเปลี่ยน auth state เป็น phone user ชั่วคราว
 * - จากนั้น sign back in ด้วย Google credential ที่ save ไว้
 */
export async function verifyPhoneOTP(
  _verificationId: string,
  otp: string,
): Promise<void> {
  if (!_confirmation) throw new Error('ไม่พบ OTP session กรุณากด "ส่งรหัสใหม่"')

  // ยืนยัน OTP — ถ้า OTP ผิดจะ throw auth/invalid-verification-code
  await _confirmation.confirm(otp.trim())
  _confirmation = null

  // Restore Google Auth session using the saved credential
  const raw = sessionStorage.getItem(GCRED_KEY)
  if (raw) {
    try {
      const { idToken, accessToken } = JSON.parse(raw) as { idToken: string; accessToken: string | null }
      const googleCred = GoogleAuthProvider.credential(idToken, accessToken ?? undefined)
      await signInWithCredential(auth, googleCred)
      sessionStorage.removeItem(GCRED_KEY)
    } catch {
      // Google ID token expired (>1 hour) — force re-login
      await signOut(auth)
      clearSession()
      throw Object.assign(new Error('Google session หมดอายุ กรุณา Login ใหม่'), { code: 'auth/google-session-expired' })
    }
  }
}

/** บันทึก / อัปเดตเบอร์โทรใน Firestore profile */
export async function saveUserPhone(uid: string, phoneE164: string): Promise<void> {
  await updateDoc(doc(db, `${ROOT}/users/${uid}`), { phone: phoneE164 })
}

export { fetchProfile }
