import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Component } from 'react'
import { AuthProvider } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import MainLayout from './layouts/MainLayout'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectFormPage from './pages/ProjectFormPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import PlaceholderPage from './pages/PlaceholderPage'
import BondStatusPage from './pages/BondStatusPage'
import PaymentsPage from './pages/PaymentsPage'
import ChangeOrdersPage from './pages/ChangeOrdersPage'
import ReportsPage from './pages/ReportsPage'

/* ─── Loading gate ── shown while Firestore first-load is in flight ─── */
function AppRoutes() {
  const { loading } = useData()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <span className="text-slate-600 font-medium text-sm">Connecting to database…</span>
        </div>
        <p className="text-xs text-slate-400">CMG Payment Management System</p>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<ProjectFormPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
          <Route path="/bonds" element={<BondStatusPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/change-orders" element={<ChangeOrdersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

/* ─── Error boundary ── catches any runtime errors and shows a recovery UI ─ */
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

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppRoutes />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
