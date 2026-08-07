import { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import Sidebar from './Sidebar';
import ModuleGuard from './ModuleGuard';
import { Menu, UserCircle } from 'lucide-react';
import logoWood from '/sistemalogo.png';
import api from '../../services/api';

export default function MainLayout() {
  const { token, usuario, patchUsuario, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Sincroniza periódicamente los permisos/estado del usuario logueado.
  // Así, si Carlos le cambia el acceso a alguien que ya tiene sesión abierta,
  // se aplica sin necesidad de volver a loguearse.
  useEffect(() => {
    if (!token) return;
    const sync = () => {
      api.get('/auth/me/completo')
        .then(r => {
          const d = r.data;
          if (d.activo === false || d.estadoCuenta === 'rechazado') {
            logout();
            navigate('/login');
            return;
          }
          patchUsuario({
            tieneModulosLimitados: d.tieneModulosLimitados,
            modulosPermitidos: d.modulosPermitidos,
            rol: d.rol,
          });
        })
        .catch(() => {});
    };
    sync();
    const id = setInterval(sync, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F2EDE7' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 lg:ml-63 overflow-y-auto" style={{ backgroundColor: '#F2EDE7', overscrollBehavior: 'none' }}>

        {/* ── Navbar top (desktop + mobile) ── */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-8 navbar-safe navbar-top"
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
            onTouchEnd={(e) => { e.preventDefault(); setSidebarOpen(true); }}
            className="lg:hidden p-2 -ml-1 flex items-center justify-center"
            style={{ color: '#7C4A2D', minWidth: 44, minHeight: 44, cursor: 'pointer' }}
            aria-label="Abrir menú"
          >
            <Menu size={22} />
          </button>
          <div className="hidden lg:block" />

          {/* Centro: logo + nombre (solo mobile) */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
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
            className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 transition-colors hover:bg-stone-100"
            style={{ cursor: 'pointer', border: 'none', background: 'transparent', minHeight: 40 }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              overflow: 'hidden', flexShrink: 0,
              background: '#F0E8DF',
              border: '1.5px solid #E8E2DA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {usuario?.fotoPerfil
                ? <img src={usuario.fotoPerfil} alt="foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <UserCircle size={20} style={{ color: '#C4895A' }} />
              }
            </div>
            <div className="text-left hidden sm:block">
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111111', lineHeight: 1.2 }}>
                {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Usuario'}
              </p>
              <p style={{ fontSize: '0.7rem', color: '#777', lineHeight: 1 }}>
                Mi cuenta
              </p>
            </div>
          </button>
        </div>

        <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-fade-in main-content-mobile" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
          <ModuleGuard>
            <Outlet />
          </ModuleGuard>
        </div>
      </main>
    </div>
  );
}
