import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart,
  Truck, Warehouse, Receipt, BarChart3, Bell, LogOut,
  Package2, DollarSign
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'

const groups = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/alertas',   icon: Bell,            label: 'Alertas', badge: true },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/clientes',     icon: Users,         label: 'Clientes' },
      { to: '/productos',    icon: Package,        label: 'Productos' },
      { to: '/cotizaciones', icon: FileText,       label: 'Cotizaciones' },
      { to: '/ventas',       icon: DollarSign,     label: 'Ventas' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/compras',    icon: ShoppingCart, label: 'Compras' },
      { to: '/inventario', icon: Warehouse,    label: 'Inventario' },
      { to: '/logistica',  icon: Truck,        label: 'Logística' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/facturacion', icon: Receipt,    label: 'Facturación' },
      { to: '/reportes',    icon: BarChart3,  label: 'Reportes' },
    ],
  },
]

export default function Sidebar() {
  const { usuario, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = usuario?.nombre
    ? usuario.nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  return (
    <aside className="fixed top-0 left-0 h-screen w-[260px] bg-[#1e3a5f] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 flex-shrink-0">
        <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
          <Package2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">WoodPallet</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {groups.map(group => (
          <div key={group.label} className="mb-5">
            <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/8 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="flex-shrink-0 border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{usuario?.nombre ?? 'Usuario'}</p>
            <p className="text-white/40 text-xs truncate">{usuario?.email ?? ''}</p>
          </div>
          <button onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            title="Cerrar sesión">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
