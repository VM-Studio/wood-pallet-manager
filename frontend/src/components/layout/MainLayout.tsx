import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import Sidebar from './Sidebar';

export default function MainLayout() {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#d0ccc6' }}>
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen overflow-y-auto" style={{ backgroundColor: '#d0ccc6' }}>
        <div className="p-8 max-w-[1400px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
