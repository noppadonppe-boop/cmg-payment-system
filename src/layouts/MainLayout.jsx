import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="flex h-screen print:h-auto bg-slate-50 print:bg-white overflow-hidden print:overflow-visible">
      <Sidebar 
        className="print:hidden" 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(c => !c)} 
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:overflow-visible print:block">
        <Header className="print:hidden" />
        <main className="flex-1 overflow-y-auto print:overflow-visible p-6 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
