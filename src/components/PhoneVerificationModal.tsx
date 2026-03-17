import { useState, useEffect, useRef, useCallback } from 'react'
import { Phone, Shield, RefreshCw, CheckCircle, Loader2 } from 'lucide-react'
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  saveUserPhone,
  toE164Thai,
  resetRecaptchaVerifier,
} from '../lib/authService'
import type { UserProfile } from '../types/auth'

interface Props {
  userProfile: UserProfile
  onVerified: () => void
}

type Phase = 'enterPhone' | 'sendingOTP' | 'enterOTP' | 'verifying' | 'success'

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `XXX-XXX-${digits.slice(-4)}`
}

function friendlyError(code: string): string {
  const map: Record<string, string> = {
    'auth/invalid-phone-number':      'รูปแบบเบอร์โทรไม่ถูกต้อง (ตัวอย่าง: 089-123-4567)',
    'auth/too-many-requests':         'ส่ง OTP บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่',
    'auth/invalid-verification-code': 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
    'auth/code-expired':              'รหัส OTP หมดอายุแล้ว กรุณากด "ส่งรหัสใหม่"',
    'auth/session-expired':           'รหัส OTP หมดอายุแล้ว กรุณากด "ส่งรหัสใหม่"',
    'auth/missing-phone-number':      'กรุณากรอกเบอร์โทรศัพท์',
    'auth/quota-exceeded':            'ระบบ SMS ขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง',
    'auth/invalid-app-credential':    'reCAPTCHA ไม่ผ่าน กรุณากด "ส่งรหัสใหม่"',
    'auth/internal-error':            'Firebase ขัดข้องชั่วคราว กรุณากด "ส่งรหัสใหม่"',
    'auth/google-session-expired':    'Google session หมดอายุ กรุณา Login ใหม่',
    'auth/captcha-check-failed':      'reCAPTCHA ไม่ผ่าน กรุณากด "ส่งรหัสใหม่"',
  }
  return map[code] ?? `เกิดข้อผิดพลาด: ${code}`
}

export default function PhoneVerificationModal({ userProfile, onVerified }: Props) {
  const hasPhone = Boolean(userProfile.phone)

  const [phase, setPhase]           = useState<Phase>(hasPhone ? 'sendingOTP' : 'enterPhone')
  const [phone, setPhone]           = useState(userProfile.phone ?? '')
  const [verificationId, setVerificationId] = useState('')
  const [otp, setOtp]               = useState('')
  const [countdown, setCountdown]   = useState(0)
  const [error, setError]           = useState('')
  const [targetPhone, setTargetPhone] = useState(userProfile.phone ?? '')

  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const otpInputRef = useRef<HTMLInputElement>(null)

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current) }

  const startCountdown = useCallback(() => {
    setCountdown(60)
    clearTimer()
    timerRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearTimer(); return 0 } return prev - 1 })
    }, 1000)
  }, [])

  const doSendOTP = useCallback(async (phoneE164: string) => {
    setError('')
    setPhase('sendingOTP')
    try {
      const vid = await sendPhoneOTP(phoneE164)
      setVerificationId(vid)
      setTargetPhone(phoneE164)
      setOtp('')
      setPhase('enterOTP')
      startCountdown()
      setTimeout(() => otpInputRef.current?.focus(), 100)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
      setPhase(hasPhone ? 'enterOTP' : 'enterPhone')
    }
  }, [startCountdown, hasPhone])

  useEffect(() => {
    if (hasPhone && userProfile.phone) doSendOTP(userProfile.phone)
    return () => clearTimer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveAndSend = async () => {
    if (!phone.trim()) { setError('กรุณากรอกเบอร์โทรศัพท์'); return }
    const e164 = toE164Thai(phone)
    setError('')
    try {
      await saveUserPhone(userProfile.uid, e164)
      await doSendOTP(e164)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) { setError('กรุณากรอกรหัส OTP 6 หลัก'); return }
    setError('')
    setPhase('verifying')
    try {
      await verifyPhoneOTP(verificationId, otp)
      setPhase('success')
      setTimeout(onVerified, 1000)
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? (err as Error).message
      setError(friendlyError(code))
      setPhase('enterOTP')
    }
  }

  const handleResend = () => {
    resetRecaptchaVerifier()
    doSendOTP(targetPhone)
  }

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-5 text-white text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              {phase === 'success'
                ? <CheckCircle size={28} className="text-green-300" />
                : <Shield size={28} />}
            </div>
          </div>
          <h2 className="text-lg font-bold">ยืนยันตัวตน 2 ขั้นตอน</h2>
          <p className="text-blue-200 text-sm mt-1">
            {phase === 'enterPhone' && 'กรอกเบอร์โทรศัพท์เพื่อรับรหัส OTP'}
            {phase === 'sendingOTP' && 'กำลังส่งรหัส OTP…'}
            {phase === 'enterOTP'   && `ส่งรหัสไปแล้วที่ ${maskPhone(targetPhone)}`}
            {phase === 'verifying'  && 'กำลังตรวจสอบ…'}
            {phase === 'success'    && 'ยืนยันสำเร็จ!'}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Enter Phone */}
          {phase === 'enterPhone' && (
            <>
              <p className="text-sm text-slate-500 text-center">
                บัญชีของคุณยังไม่มีเบอร์โทร กรุณากรอกเพื่อรับ OTP
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">เบอร์โทรศัพท์</label>
                <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="tel"
                    placeholder="089-123-4567"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveAndSend()}
                    className="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">รองรับเบอร์ไทย เช่น 089-123-4567</p>
              </div>
              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <button
                onClick={handleSaveAndSend}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
              >
                บันทึกและส่งรหัส OTP
              </button>
            </>
          )}

          {/* Sending OTP */}
          {phase === 'sendingOTP' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 size={32} className="text-blue-500 animate-spin" />
              <p className="text-sm text-slate-600">กำลังส่ง SMS…</p>
            </div>
          )}

          {/* Enter OTP */}
          {(phase === 'enterOTP' || phase === 'verifying') && (
            <>
              <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-blue-600 font-medium">ส่งรหัส 6 หลักไปที่</p>
                <p className="text-lg font-bold text-blue-700 tracking-widest mt-0.5">{maskPhone(targetPhone)}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 text-center">กรอกรหัส OTP 6 หลัก</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={handleOtpChange}
                  onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOTP()}
                  placeholder="○ ○ ○ ○ ○ ○"
                  disabled={phase === 'verifying'}
                  className="w-full text-center text-2xl font-bold tracking-[0.5em] border-2 border-slate-300 rounded-xl py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 transition"
                />
              </div>

              {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>}

              <button
                onClick={handleVerifyOTP}
                disabled={otp.length < 6 || phase === 'verifying'}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                {phase === 'verifying' && <Loader2 size={14} className="animate-spin" />}
                ยืนยัน OTP
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-xs text-slate-400">
                    ส่งรหัสใหม่ได้ในอีก <span className="font-bold text-blue-600">{countdown}</span> วินาที
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    className="flex items-center gap-1.5 mx-auto text-xs text-blue-600 hover:text-blue-700 font-medium transition"
                  >
                    <RefreshCw size={12} />ส่งรหัสใหม่อีกครั้ง
                  </button>
                )}
              </div>
            </>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle size={40} className="text-green-500" />
              <p className="text-sm font-semibold text-slate-700">ยืนยันตัวตนสำเร็จ!</p>
              <p className="text-xs text-slate-400">กำลังเข้าสู่ระบบ…</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
