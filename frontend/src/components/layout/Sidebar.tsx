import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Users, FileText,
  Truck, Receipt,
  ClipboardList, Package, Warehouse, Building2,
  BarChart3, LogOut, DollarSign, RotateCcw, FileCheck, Mail,
  UserCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useQueryClient } from '@tanstack/react-query';

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
      { path: '/ventas',       label: 'Ventas',       icon: DollarSign },
      { path: '/logistica',    label: 'Logística',    icon: Truck },
      { path: '/retiros',      label: 'Retiros',      icon: Warehouse },
      { path: '/remitos',      label: 'Remitos',      icon: FileCheck },
      { path: '/facturacion',  label: 'Facturación',  icon: Receipt },
      { path: '/seguimientos', label: 'Seguimientos', icon: Mail },
    ]
  },
  {
    label: 'Operaciones',
    items: [
      { path: '/compras',      label: 'Compras',      icon: ClipboardList },
      { path: '/proveedores',  label: 'Proveedores',  icon: Building2 },
      { path: '/productos',    label: 'Productos',    icon: Package },
      { path: '/inventario',   label: 'Inventario',   icon: Warehouse },
      { path: '/devoluciones', label: 'Devoluciones', icon: RotateCcw },
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
  const { logout, usuario } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-65 bg-[#3c250f] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center justify-center border-b border-white/10 shrink-0 py-4">
        <span className="text-white tracking-tight text-center" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 600, fontSize: '1.6rem', lineHeight: 1.2 }}>Wood Pallet</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`aside nav::-webkit-scrollbar{display:none}`}</style>
        {grupos.map(grupo => (
          <div key={grupo.label} className="mb-5">
            <p className="text-white/30 text-[10px] font-semibold uppercase tracking-widest px-3 mb-2">
              {grupo.label}
            </p>
            <div className="space-y-0.5">
              {grupo.items.map(item => (
                <NavLink key={item.path} to={item.path}
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

      {/* Mi Cuenta + Cerrar sesión */}
      <div className="shrink-0 border-t border-white/10 p-3 space-y-1">
        {/* Mi Cuenta — con avatar */}
        <NavLink to="/mi-cuenta"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
              isActive ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white'
            }`
          }
        >
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 flex items-center justify-center bg-white/10">
            {usuario?.fotoPerfil
              ? <img src={usuario.fotoPerfil} alt="foto" className="w-full h-full object-cover" />
              : <UserCircle className="w-4 h-4" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {usuario ? `${usuario.nombre} ${usuario.apellido}` : 'Mi Cuenta'}
            </p>
            <p className="text-[10px] text-white/40 leading-tight">Mi Cuenta</p>
          </div>
        </NavLink>

        {/* Cerrar sesión */}
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
  );
}
