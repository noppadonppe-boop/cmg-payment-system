import { useState, useRef, useCallback } from 'react'
import { Phone, X, Loader2, CheckCircle, RefreshCw } from 'lucide-react'
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  saveUserPhone,
  toE164Thai,
  resetRecaptchaVerifier,
} from '../lib/authService'

interface Props {
  uid: string
  currentPhone?: string
  onSaved: (newPhone: string) => void
  onClose: () => void
}

type Phase = 'enterPhone' | 'sendingOTP' | 'enterOTP' | 'verifying' | 'success'

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const last4 = digits.slice(-4)
  return `XXX-XXX-${last4}`
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-phone-number':      'รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 089-123-4567)',
    'auth/too-many-requests':         'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่',
    'auth/invalid-verification-code': 'รหัส OTP ไม่ถูกต้อง',
    'auth/code-expired':              'รหัส OTP หมดอายุ กรุณากด "ส่งใหม่"',
    'auth/session-expired':           'รหัส OTP หมดอายุ กรุณากด "ส่งใหม่"',
    'auth/quota-exceeded':            'ระบบ SMS ขัดข้องชั่วคราว ลองใหม่ภายหลัง',
    'auth/invalid-app-credential':    'reCAPTCHA ไม่ผ่าน กรุณาลองใหม่',
    'auth/internal-error':            'ระบบ Firebase ขัดข้องชั่วคราว กรุณากด "ส่งใหม่"',
    'auth/captcha-check-failed':      'reCAPTCHA ไม่ผ่าน กรุณาลองใหม่',
  }
  return map[code] ?? `เกิดข้อผิดพลาด: ${code}`
}

export default function EditPhoneModal({ uid, currentPhone, onSaved, onClose }: Props) {
  const [phone, setPhone]               = useState(currentPhone ?? '')
  const [verificationId, setVerificationId] = useState('')
  const [otp, setOtp]                   = useState('')
  const [phase, setPhase]               = useState<Phase>('enterPhone')
  const [countdown, setCountdown]       = useState(0)
  const [error, setError]               = useState('')
  const [targetPhone, setTargetPhone]   = useState('')

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  const startCountdown = useCallback(() => {
    setCountdown(60)
    clearTimer()
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearTimer(); return 0 } return prev - 1 })
    }, 1000)
  }, [])

  const handleSendOTP = async () => {
    if (!phone.trim()) { setError('กรุณากรอกเบอร์โทรศัพท์'); return }
    const e164 = toE164Thai(phone)
    setError('')
    setPhase('sendingOTP')
    setTargetPhone(e164)
    try {
      const vid = await sendPhoneOTP(e164)
      setVerificationId(vid)
      setOtp('')
      setPhase('enterOTP')
      startCountdown()
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
      resetRecaptchaVerifier()
      setPhase('enterPhone')
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) { setError('กรุณากรอกรหัส OTP 6 หลัก'); return }
    setError('')
    setPhase('verifying')
    try {
      await verifyPhoneOTP(verificationId, otp)
      await saveUserPhone(uid, targetPhone)
      setPhase('success')
      setTimeout(() => onSaved(targetPhone), 1000)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
      setPhase('enterOTP')
    }
  }

  const handleResend = () => { resetRecaptchaVerifier(); handleSendOTP() }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Phone size={16} className="text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">
                {currentPhone ? 'เปลี่ยนเบอร์โทรศัพท์' : 'เพิ่มเบอร์โทรศัพท์'}
              </h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-5 space-y-4">

            {/* Enter Phone */}
            {phase === 'enterPhone' && (
              <>
                {currentPhone && (
                  <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                    เบอร์ปัจจุบัน: <span className="font-medium text-slate-700">{maskPhone(currentPhone)}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    {currentPhone ? 'เบอร์โทรใหม่' : 'เบอร์โทรศัพท์'}
                  </label>
                  <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                    <Phone size={15} className="text-slate-400 shrink-0" />
                    <input
                      type="tel"
                      placeholder="089-123-4567"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
                      className="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">รองรับเบอร์ไทย เช่น 089-123-4567</p>
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition">ยกเลิก</button>
                  <button onClick={handleSendOTP} className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition">ส่ง OTP</button>
                </div>
              </>
            )}

            {/* Sending OTP */}
            {phase === 'sendingOTP' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 size={28} className="text-blue-500 animate-spin" />
                <p className="text-sm text-slate-600">กำลังส่ง SMS…</p>
              </div>
            )}

            {/* Enter OTP */}
            {(phase === 'enterOTP' || phase === 'verifying') && (
              <>
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
                  <p className="text-xs text-blue-600 font-medium">ส่งรหัสไปที่</p>
                  <p className="text-base font-bold text-blue-700 tracking-widest mt-0.5">{maskPhone(targetPhone)}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5 text-center">รหัส OTP 6 หลัก</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOTP()}
                    placeholder="○ ○ ○ ○ ○ ○"
                    disabled={phase === 'verifying'}
                    className="w-full text-center text-2xl font-bold tracking-[0.5em] border-2 border-slate-300 rounded-xl py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 transition"
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>}
                <button
                  onClick={handleVerifyOTP}
                  disabled={otp.length < 6 || phase === 'verifying'}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm transition flex items-center justify-center gap-2"
                >
                  {phase === 'verifying' && <Loader2 size={14} className="animate-spin" />}
                  ยืนยัน OTP
                </button>
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-slate-400">
                      ส่งใหม่ได้ใน <span className="font-bold text-blue-600">{countdown}</span> วินาที
                    </p>
                  ) : (
                    <button onClick={handleResend} className="flex items-center gap-1.5 mx-auto text-xs text-blue-600 hover:text-blue-700 font-medium transition">
                      <RefreshCw size={12} />ส่งรหัสใหม่
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Success */}
            {phase === 'success' && (
              <div className="flex flex-col items-center gap-3 py-4">
                <CheckCircle size={36} className="text-green-500" />
                <p className="text-sm font-semibold text-slate-700">บันทึกเบอร์โทรสำเร็จ!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
