import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { registerWithEmail } from '../lib/authService'
import { useAuth } from '../context/AuthContext'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'อีเมลนี้ถูกใช้งานแล้ว',
  'auth/weak-password':        'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร',
  'auth/invalid-email':        'รูปแบบอีเมลไม่ถูกต้อง',
}

function friendlyError(code: string) {
  return ERROR_MESSAGES[code] ?? `เกิดข้อผิดพลาด (${code})`
}

interface Field {
  label: string
  key: 'firstName' | 'lastName' | 'position' | 'email' | 'password' | 'confirm'
  type?: string
  placeholder?: string
}

const FIELDS: Field[] = [
  { label: 'ชื่อ',        key: 'firstName', placeholder: 'สมชาย' },
  { label: 'นามสกุล',    key: 'lastName',  placeholder: 'ใจดี' },
  { label: 'ตำแหน่ง',   key: 'position',  placeholder: 'Project Manager' },
  { label: 'อีเมล',      key: 'email',     type: 'email',    placeholder: 'you@example.com' },
  { label: 'รหัสผ่าน',  key: 'password',  type: 'password', placeholder: '••••••••' },
  { label: 'ยืนยันรหัสผ่าน', key: 'confirm', type: 'password', placeholder: '••••••••' },
]

export default function RegisterPage() {
  const { firebaseUser, userProfile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    firstName: '', lastName: '', position: '', email: '', password: '', confirm: '',
  })
  const [showPw,  setShowPw]  = useState(false)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (loading || !firebaseUser || !userProfile) return
    if (userProfile.status === 'approved') { navigate('/dashboard', { replace: true }); return }
    if (userProfile.status === 'pending')  { navigate('/pending',   { replace: true }); return }
  }, [firebaseUser, userProfile, loading, navigate])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('รหัสผ่านไม่ตรงกัน')
      return
    }
    if (form.password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    setBusy(true)
    try {
      const profile = await registerWithEmail(
        form.email, form.password, form.firstName, form.lastName, form.position,
      )
      await refreshProfile()
      if (profile.isFirstUser) {
        setSuccess('ยินดีต้อนรับ! คุณเป็นผู้ใช้คนแรก บัญชีของคุณได้รับสิทธิ์ SuperAdmin แล้ว')
        setTimeout(() => navigate('/dashboard', { replace: true }), 2000)
      } else {
        navigate('/pending', { replace: true })
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <span className="text-white text-2xl font-bold">C</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">CMG Payment System</h1>
          <p className="text-slate-500 text-sm mt-1">สมัครสมาชิกเพื่อเข้าใช้งาน</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-5">
          <h2 className="text-lg font-semibold text-slate-700">สร้างบัญชีใหม่</h2>

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              {(['firstName', 'lastName'] as const).map((k) => {
                const f = FIELDS.find((x) => x.key === k)!
                return (
                  <div key={k}>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                    <input
                      value={form[k]}
                      onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      required
                      placeholder={f.placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                )
              })}
            </div>

            {/* Position, email, passwords */}
            {(['position', 'email', 'password', 'confirm'] as const).map((k) => {
              const f = FIELDS.find((x) => x.key === k)!
              const isPw = k === 'password' || k === 'confirm'
              return (
                <div key={k}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{f.label}</label>
                  <div className="relative">
                    <input
                      type={isPw ? (showPw ? 'text' : 'password') : (f.type ?? 'text')}
                      value={form[k]}
                      onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                      required
                      placeholder={f.placeholder}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    {isPw && k === 'password' && (
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            <p className="text-xs text-slate-400 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ผู้ดูแลระบบจะต้องอนุมัติบัญชีของคุณก่อนเข้าใช้งาน (ยกเว้นผู้ใช้คนแรก)
            </p>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-xl transition"
            >
              {busy ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              สมัครสมาชิก
            </button>
          </form>

          <p className="text-center text-sm text-slate-500">
            มีบัญชีแล้ว?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              เข้าสู่ระบบ
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
