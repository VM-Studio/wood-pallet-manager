import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function MainLayout() {
  const { token } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#d0ccc6' }}>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-[260px] min-h-screen overflow-y-auto" style={{ backgroundColor: '#d0ccc6' }}>
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-10 bg-[#3c250f]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/80 hover:text-white p-1 -ml-1"
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <span
            className="text-white"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600, fontSize: '1.4rem', lineHeight: 1.2 }}
          >
            Wood Pallet
          </span>
        </div>

        <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
