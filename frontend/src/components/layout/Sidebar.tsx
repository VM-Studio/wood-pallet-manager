import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart,
  Truck, Warehouse, Receipt, BarChart3, Settings,
  ClipboardList, Bell, LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { clsx } from 'clsx';

const menuItems = [
  { path: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { path: '/clientes',      label: 'Clientes',      icon: Users },
  { path: '/productos',     label: 'Productos',     icon: Package },
  { path: '/cotizaciones',  label: 'Cotizaciones',  icon: FileText },
  { path: '/ventas',        label: 'Ventas',        icon: ShoppingCart },
  { path: '/compras',       label: 'Compras',       icon: ClipboardList },
  { path: '/inventario',    label: 'Inventario',    icon: Warehouse },
  { path: '/logistica',     label: 'Logística',     icon: Truck },
  { path: '/facturacion',   label: 'Facturación',   icon: Receipt },
  { path: '/reportes',      label: 'Reportes',      icon: BarChart3 },
  { path: '/alertas',       label: 'Alertas',       icon: Bell },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
];

export default function Sidebar() {
  const { usuario, logout } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-navy-900 flex flex-col z-50">
      <div className="p-6 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">WP</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">WoodPallet</h1>
            <p className="text-navy-400 text-xs">Manager</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {menuItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-navy-300 hover:bg-navy-800 hover:text-white'
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-navy-800">
        <div className="flex items-center gap-3 mb-3">
          <div className={clsx(
            'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm',
            esCarlos ? 'bg-teal-600' : 'bg-primary-600'
          )}>
            {usuario?.nombre[0]}{usuario?.apellido[0]}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {usuario?.nombre} {usuario?.apellido}
            </p>
            <p className="text-navy-400 text-xs truncate">
              {esCarlos ? 'Propietario' : 'Propietario Digital'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-navy-400 hover:text-white hover:bg-navy-800 rounded-lg text-sm transition-colors"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
