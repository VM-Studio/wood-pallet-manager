import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import Sidebar from './Sidebar';
import { Menu, UserCircle } from 'lucide-react';

export default function MainLayout() {
  const { token, usuario } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F2EDE7' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-63 min-h-screen overflow-y-auto" style={{ backgroundColor: '#F2EDE7' }}>

        {/* ── Navbar top (desktop + mobile) ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-0"
          style={{
            background: '#FAFAF8',
            borderBottom: '1px solid #E8E2DA',
            height: '67px',
          }}
        >
          {/* Izquierda: hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1 -ml-1"
            style={{ color: '#7C4A2D' }}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          {/* Espacio vacío en desktop para empujar usuario a la derecha */}
          <div className="hidden md:block" />

          {/* Derecha: usuario */}
          <button
            type="button"
            onClick={() => navigate('/mi-cuenta')}
            className="flex items-center gap-2.5 text-left"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            aria-label="Abrir Mi Cuenta"
          >
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              background: '#F0E8DF',
              border: '1.5px solid #E8E2DA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {usuario?.fotoPerfil
                ? <img src={usuario.fotoPerfil} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <UserCircle size={17} style={{ color: '#C4895A' }} />
              }
            </div>
            <div>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111111', lineHeight: 1.2 }}>
                {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#777', lineHeight: 1 }}>
                {usuario?.rol === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
