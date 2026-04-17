import { Outlet, Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import Sidebar from './Sidebar'

export default function MainLayout() {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-[#F4F6FA]">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="p-8 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
