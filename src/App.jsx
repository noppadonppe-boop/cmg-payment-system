import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
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

function App() {
  return (
    <AuthProvider>
      <DataProvider>
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
      </DataProvider>
    </AuthProvider>
  )
}

export default App
