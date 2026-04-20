import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Users, FileText,
  ShoppingCart, Truck, Receipt,
  ClipboardList, Package, Warehouse,
  BarChart3, LogOut, Package2, ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useAlertas } from '../../hooks/useDashboard';
import { useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';

const grupos = [
  {
    label: 'Principal',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/alertas',   label: 'Alertas',   icon: Bell },
    ]
  },
  {
    label: 'Comercial',
    items: [
      { path: '/clientes',     label: 'Clientes',     icon: Users },
      { path: '/cotizaciones', label: 'Cotizaciones', icon: FileText },
      { path: '/ventas',       label: 'Ventas',       icon: ShoppingCart },
      { path: '/logistica',    label: 'Logística',    icon: Truck },
      { path: '/facturacion',  label: 'Facturación',  icon: Receipt },
    ]
  },
  {
    label: 'Operaciones',
    items: [
      { path: '/compras',    label: 'Compras',    icon: ClipboardList },
      { path: '/productos',  label: 'Productos',  icon: Package },
      { path: '/inventario', label: 'Inventario', icon: Warehouse },
    ]
  },
  {
    label: 'Finanzas',
    items: [
      { path: '/reportes', label: 'Reportes', icon: BarChart3 },
    ]
  },
];

export default function Sidebar() {
  const { usuario, logout } = useAuthStore();
  const { data: alertas } = useAlertas();
  const queryClient = useQueryClient();
  const iniciales = `${usuario?.nombre?.[0] || ''}${usuario?.apellido?.[0] || ''}`;
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const handleLogout = () => {
    queryClient.clear();
    logout();
  };

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-50 overflow-hidden"
      style={{
        width: 'var(--sidebar-width, 260px)',
        backgroundColor: '#111827',
        boxShadow: '4px 0 24px 0 rgb(0 0 0 / 0.15)'
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)' }}
        >
          <Package2 size={18} className="text-white" />
        </div>
        <div>
          <p style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '17px',
            fontStyle: 'italic',
            fontWeight: 600,
            color: 'white',
            lineHeight: 1,
          }}>
            WoodPallet
          </p>
          <p className="text-gray-500 text-xs mt-0.5">Manager v1.0</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" style={{ scrollbarWidth: 'none' }}>
        <style>{`aside nav::-webkit-scrollbar{display:none}`}</style>
        {grupos.map(({ label, items }) => (
          <div key={label} className="mb-3">
            <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
              {label}
            </p>
            {items.map(({ path, label: itemLabel, icon: Icon }) => (
              <NavLink key={path} to={path}>
                {({ isActive }) => (
                  <div
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium mb-0.5 transition-all duration-150',
                      isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/8'
                    )}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #6B3A2A, #C4895A)',
                      boxShadow: '0 2px 8px rgba(107,58,42,0.4)'
                    } : {}}
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="flex-1">{itemLabel}</span>
                    {path === '/alertas' && alertas && alertas.total > 0 && (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-5 text-center text-white"
                        style={{ background: alertas.alta > 0 ? '#EF4444' : '#F59E0B' }}
                      >
                        {alertas.total}
                      </span>
                    )}
                    {isActive && <ChevronRight size={14} className="opacity-60" />}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Usuario */}
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)' }}
          >
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {usuario?.nombre} {usuario?.apellido}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {esCarlos ? 'Propietario' : 'Propietario Digital'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1 rounded-lg hover:bg-white/10"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
