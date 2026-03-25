import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './layouts/MainLayout'

// Auth pages
import LoginPage          from './pages/LoginPage'
import RegisterPage       from './pages/RegisterPage'
import PendingApprovalPage from './pages/PendingApprovalPage'
import AdminPanel         from './pages/AdminPanel'

// App pages
import DashboardPage    from './pages/DashboardPage'
import ProjectsPage     from './pages/ProjectsPage'
import ProjectFormPage  from './pages/ProjectFormPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import PlaceholderPage  from './pages/PlaceholderPage'
import BondStatusPage   from './pages/BondStatusPage'
import PaymentsPage     from './pages/PaymentsPage'
import ChangeOrdersPage from './pages/ChangeOrdersPage'
import ReportsPage      from './pages/ReportsPage'
import UserManualPage  from './pages/UserManualPage'

/* ─── Loading spinner ─────────────────────────────────────────────────── */
function LoadingScreen({ message = 'กำลังโหลด…' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        <span className="text-slate-600 font-medium text-sm">{message}</span>
      </div>
      <p className="text-xs text-slate-400">CMG Payment Management System</p>
    </div>
  )
}

/* ─── Protected main app (requires approved user + Firestore data) ─────── */
function ProtectedApp() {
  return (
    <ProtectedRoute requireApproved>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ProtectedRoute>
  )
}

function AppContent() {
  const { loading } = useData()
  if (loading) return <LoadingScreen message="กำลังเชื่อมต่อฐานข้อมูล…" />

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/"               element={<DashboardPage />} />
        <Route path="/dashboard"      element={<DashboardPage />} />
        <Route path="/projects"       element={<ProjectsPage />} />
        <Route path="/projects/new"   element={<ProjectFormPage />} />
        <Route path="/projects/:id"   element={<ProjectDetailPage />} />
        <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
        <Route path="/bonds"          element={<BondStatusPage />} />
        <Route path="/payments"       element={<PaymentsPage />} />
        <Route path="/change-orders"  element={<ChangeOrdersPage />} />
        <Route path="/reports"        element={<ReportsPage />} />
        <Route path="/manual"         element={<UserManualPage />} />
        <Route path="/placeholder"    element={<PlaceholderPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireRoles={['SuperAdmin', 'Admin']}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

/* ─── Error boundary ──────────────────────────────────────────────────── */
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-8">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-lg p-8 max-w-md w-full text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
              <span className="text-rose-600 text-xl font-bold">!</span>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
            <p className="text-sm text-slate-500">{this.state.error?.message ?? 'Unknown error'}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="mt-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/* ─── Root ────────────────────────────────────────────────────────────── */
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/pending"  element={<PendingApprovalPage />} />

            {/* Protected routes (approved users only) */}
            <Route path="/*" element={<ProtectedApp />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
