import { useState, useEffect, useRef, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { loginWithEmail, loginWithGoogle } from '../lib/authService'
import { useAuth } from '../context/AuthContext'
import PhoneVerificationModal from '../components/PhoneVerificationModal'
import type { UserProfile } from '../types/auth'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':   'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  'auth/user-not-found':       'ไม่พบบัญชีนี้ในระบบ',
  'auth/wrong-password':       'รหัสผ่านไม่ถูกต้อง',
  'auth/too-many-requests':    'คำขอมากเกินไป กรุณารอสักครู่',
  'auth/popup-closed-by-user': 'ปิด Popup ก่อนเข้าสู่ระบบ กรุณาลองใหม่',
  'auth/unauthorized-domain':  'โดเมนนี้ไม่ได้รับอนุญาต',
  'user-profile-not-found':    'ไม่พบข้อมูลผู้ใช้ในระบบ',
}

function friendlyError(code: string) {
  return ERROR_MESSAGES[code] ?? `เกิดข้อผิดพลาด (${code})`
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      <path fill="none" d="M0 0h48v48H0z"/>
    </svg>
  )
}

export default function LoginPage() {
  const { firebaseUser, userProfile, loading, refreshProfile } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState('')

  /** Profile pending phone OTP verification before navigating */
  const [pendingProfile, setPendingProfile] = useState<UserProfile | null>(null)

  /**
   * Ref-based flag set BEFORE loginWithGoogle() resolves so the useEffect below
   * never redirects while phone verification is in progress.
   * (useState would be too slow — the effect fires before the next render.)
   */
  const awaitingPhoneRef = useRef(false)

  // Fallback: redirect if user arrives at /login while already logged-in + approved
  useEffect(() => {
    if (loading || !firebaseUser || !userProfile) return
    // Block redirect while phone 2FA is pending (either mid-login or modal open)
    if (awaitingPhoneRef.current || pendingProfile) return
    if (userProfile.status === 'pending')  { navigate('/pending',   { replace: true }); return }
    if (userProfile.status === 'approved') { navigate(from,         { replace: true }); return }
  }, [firebaseUser, userProfile, loading, navigate, from, pendingProfile])

  function redirectByStatus(status: string) {
    if (status === 'rejected') {
      setError('บัญชีของคุณถูกปฏิเสธ กรุณาติดต่อผู้ดูแลระบบ')
    } else if (status === 'pending') {
      navigate('/pending', { replace: true })
    } else {
      navigate(from, { replace: true })
    }
  }

  /** Called after phone OTP is verified successfully */
  function handlePhoneVerified() {
    if (!pendingProfile) return
    const status = pendingProfile.status
    awaitingPhoneRef.current = false
    setPendingProfile(null)
    refreshProfile().catch(() => {})
    redirectByStatus(status)
  }

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const profile = await loginWithEmail(email, password)
      refreshProfile().catch(() => {})
      redirectByStatus(profile.status)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
      setBusy(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setBusy(true)
    // Set the ref BEFORE the async Google popup so the useEffect never fires early
    awaitingPhoneRef.current = true
    try {
      const profile = await loginWithGoogle()
      // Only approved/pending accounts go through phone 2FA
      if (profile.status === 'approved' || profile.status === 'pending') {
        setPendingProfile(profile)
        setBusy(false)
        // awaitingPhoneRef stays true until handlePhoneVerified clears it
      } else {
        awaitingPhoneRef.current = false
        refreshProfile().catch(() => {})
        redirectByStatus(profile.status)
      }
    } catch (err: unknown) {
      awaitingPhoneRef.current = false
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
      setBusy(false)
    }
  }

  return (
    <>
    {/* Phone 2FA modal — shown after Google sign-in */}
    {pendingProfile && (
      <PhoneVerificationModal
        userProfile={pendingProfile}
        onVerified={handlePhoneVerified}
      />
    )}

    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f1f3d 0%, #1a3560 40%, #0d2952 100%)' }}
    >
      {/* Logo + Brand */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
        >
          {/* Payment / credit card icon */}
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="white" strokeWidth="1.8"/>
            <path d="M2 9h20" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <rect x="5" y="13" width="5" height="2.5" rx="1" fill="white" fillOpacity="0.85"/>
            <rect x="13" y="13" width="3" height="2.5" rx="1" fill="white" fillOpacity="0.5"/>
            <rect x="17" y="13" width="2" height="2.5" rx="1" fill="white" fillOpacity="0.5"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-wide">CMG-Payment-System</h1>
          <p className="text-blue-300 text-sm mt-1">CMG Engineering &amp; Construction</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl px-8 py-8 space-y-5">
        <p className="text-center text-slate-500 text-sm">เข้าสู่ระบบเพื่อใช้งาน</p>

        {/* Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm text-center">
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleLogin}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 font-medium text-sm rounded-xl shadow-sm transition"
        >
          {busy ? (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Sign in with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 whitespace-nowrap">หรือใช้ Email / Password</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@cmg.co.th"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">รหัสผ่าน</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md hover:shadow-lg active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
          >
            {busy ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight size={16} />
            )}
            เข้าสู่ระบบด้วย Email
          </button>
        </form>

        {/* Register */}
        <p className="text-center text-sm text-slate-500">
          ยังไม่มีบัญชี?{' '}
          <Link to="/register" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">
            สมัครสมาชิก
          </Link>
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-blue-300/50 text-xs">
        © 2026 CMG Engineering &amp; Construction
      </p>
    </div>
    </>
  )
}
