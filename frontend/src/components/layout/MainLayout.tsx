import { useState } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import Sidebar from './Sidebar';
import { Menu, UserCircle } from 'lucide-react';
import logoWood from '/sistemalogo.png';

export default function MainLayout() {
  const { token, usuario } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F2EDE7' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 md:ml-63 overflow-y-auto" style={{ backgroundColor: '#F2EDE7', overscrollBehavior: 'none' }}>

        {/* ── Navbar top (desktop + mobile) ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 navbar-safe"
          style={{
            background: '#FAFAF8',
            borderBottom: '1px solid #E8E2DA',
            minHeight: '60px',
            paddingTop: '0.5rem',
            paddingBottom: '0.5rem',
          }}
        >
          {/* Izquierda: hamburger (mobile) / spacer (desktop) */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-1 flex items-center justify-center"
            style={{ color: '#7C4A2D', minWidth: 40, minHeight: 40 }}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="hidden md:block" />

          {/* Centro: logo + nombre (solo mobile) */}
          <div className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
            <img
              src={logoWood}
              alt="WoodPallet"
              style={{ width: 26, height: 26, objectFit: 'contain', borderRadius: '0.25rem' }}
            />
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '1.15rem',
              color: '#111111',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}>
              WoodPallet
            </span>
          </div>

          {/* Derecha: usuario — clic abre Mi Cuenta */}
          <button
            onClick={() => navigate('/mi-cuenta')}
            className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-stone-100"
            style={{ cursor: 'pointer', border: 'none', background: 'transparent', minHeight: 40 }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              background: '#F0E8DF',
              border: '1.5px solid #E8E2DA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {usuario?.fotoPerfil
                ? <img src={usuario.fotoPerfil} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <UserCircle size={18} style={{ color: '#C4895A' }} />
              }
            </div>
            <div className="text-left hidden sm:block">
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#111111', lineHeight: 1.2 }}>
                {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#777', lineHeight: 1 }}>
                Mi cuenta
              </p>
            </div>
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
