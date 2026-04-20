import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useAlertas } from '../../hooks/useDashboard';
import Sidebar from './Sidebar';
import DropdownVista from '../ui/DropdownVista';

const routeTitles: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/alertas':       'Alertas',
  '/clientes':      'Clientes',
  '/cotizaciones':  'Cotizaciones',
  '/ventas':        'Ventas',
  '/logistica':     'Logística',
  '/facturacion':   'Facturación',
  '/compras':       'Compras',
  '/productos':     'Productos',
  '/inventario':    'Inventario',
  '/reportes':      'Reportes',
  '/configuracion': 'Configuración',
};

export default function MainLayout() {
  const { isAuthenticated, usuario } = useAuthStore();
  const { data: alertas } = useAlertas();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const titulo = routeTitles[location.pathname] || 'WoodPallet Manager';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#d0ccc6' }}>
      <Sidebar />

      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ marginLeft: 'var(--sidebar-width, 260px)' }}
      >
        {/* Header */}
        <header
          className="shrink-0 h-16 flex items-center px-6 gap-4 z-40"
          style={{
            backgroundColor: '#d0ccc6',
            borderBottom: '1px solid rgba(0,0,0,0.06)'
          }}
        >
          <div className="flex-1">
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '22px',
              fontStyle: 'italic',
              fontWeight: 600,
              color: '#1f2937',
              lineHeight: 1,
            }}>
              {titulo}
            </h2>
          </div>

          {/* Dropdown de vista */}
          <DropdownVista />

          {/* Campana */}
          <button
            className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
            onClick={() => window.location.href = '/alertas'}
          >
            <Bell size={16} className="text-gray-500" />
            {alertas && alertas.alta > 0 && (
              <span
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)' }}
              >
                {alertas.alta}
              </span>
            )}
          </button>

          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)' }}
          >
            {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#d0ccc6' }}>
          <div className="p-6 max-w-350 mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
