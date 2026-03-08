import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, LogOut, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { logout } from '../lib/authService'

export default function PendingApprovalPage() {
  const { firebaseUser, userProfile, loading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!firebaseUser) { navigate('/login', { replace: true }); return }
    if (userProfile?.status === 'approved') { navigate('/dashboard', { replace: true }); return }
    if (userProfile?.status === 'rejected') { navigate('/login', { replace: true }); return }
  }, [firebaseUser, userProfile, loading, navigate])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  async function handleRefresh() {
    await refreshProfile()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center space-y-6">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mx-auto">
            <Clock size={40} className="text-amber-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-800">รอการอนุมัติ</h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              บัญชีของคุณกำลังรอการอนุมัติจากผู้ดูแลระบบ
              <br />
              กรุณารอสักครู่แล้วลองรีเฟรชหน้า
            </p>
          </div>

          {userProfile && (
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">ข้อมูลบัญชี</p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-400">ชื่อ: </span>
                {userProfile.firstName} {userProfile.lastName}
              </p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-400">อีเมล: </span>
                {userProfile.email}
              </p>
              <p className="text-sm text-slate-700">
                <span className="text-slate-400">ตำแหน่ง: </span>
                {userProfile.position || '—'}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  <Clock size={11} />
                  รอการอนุมัติ
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRefresh}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition"
            >
              <RefreshCw size={15} />
              รีเฟรชสถานะ
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm rounded-xl transition"
            >
              <LogOut size={15} />
              ออกจากระบบ
            </button>
          </div>

          <p className="text-xs text-slate-400">
            หากมีปัญหา กรุณาติดต่อผู้ดูแลระบบ CMG
          </p>
        </div>
      </div>
    </div>
  )
}
