import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, FileText, ShoppingCart,
  Truck, Warehouse, Receipt, BarChart3, Bell, LogOut,
  DollarSign
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import { useQueryClient } from '@tanstack/react-query'

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
      { to: '/facturacion',  icon: Receipt,        label: 'Facturación' },
      { to: '/logistica',    icon: Truck,          label: 'Logística' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/compras',    icon: ShoppingCart, label: 'Compras' },
      { to: '/inventario', icon: Warehouse,    label: 'Inventario' },
    ],
  },
  {
    label: 'Finanzas',
    items: [
      { to: '/reportes',    icon: BarChart3,  label: 'Reportes' },
    ],
  },
]

export default function Sidebar() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = () => {
    queryClient.clear()
    logout()
    navigate('/login')
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-65 bg-[#3c250f] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-white/10 shrink-0">
        <img src="/palletlogo.png" alt="WoodPallet logo" className="w-9 h-9 object-contain" />
        <span className="text-white text-xl tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600 }}>WoodPallet</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`aside nav::-webkit-scrollbar{display:none}`}</style>
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
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Cerrar sesión */}
      <div className="shrink-0 border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600, fontSize: '1.05rem' }}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
