import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bell, Users, FileText,
  Truck, Receipt,
  ClipboardList, Package, Warehouse, Building2,
  BarChart3, LogOut, DollarSign, RotateCcw, FileCheck, Mail,
  X, UserCircle, Globe, UserCog } from 'lucide-react';
import logoWood from '/sistemalogo.png';
import { useAuthStore } from '../../store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import api from '../../services/api';
import { tieneAccesoAModulo } from '../../utils/modulos';
import { useUsuarios } from '../../hooks/useUsuarios';

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
      { path: '/clientes',       label: 'Clientes',           icon: Users },
      { path: '/cotizaciones',   label: 'Cotizaciones',       icon: FileText },
      { path: '/solicitudes-web', label: 'Solicitudes web',   icon: Globe, badgeKey: 'web' },
      { path: '/ventas',         label: 'Ventas',             icon: DollarSign },
      { path: '/logistica',      label: 'Logística',          icon: Truck },
      { path: '/retiros',        label: 'Retiros',            icon: Warehouse },
      { path: '/remitos',        label: 'Remitos',            icon: FileCheck },
      { path: '/facturacion',    label: 'Facturación',        icon: Receipt },
      { path: '/seguimientos',   label: 'Seguimientos',       icon: Mail },
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

// Paleta
const C = {
  bg:         '#FAFAF8',
  border:     '#E8E2DA',
  accent:     '#7C4A2D',
  accentSoft: '#F0E8DF',
  accentMid:  '#C4895A',
  text:       '#111111',   // negro
  textMuted:  '#444444',   // gris oscuro
  label:      '#999999',   // etiquetas de grupo
};

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { logout, usuario } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pendientesWeb, setPendientesWeb] = useState(0);
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const { data: usuariosSistema } = useUsuarios();
  const pendientesUsuarios = esCarlos
    ? (usuariosSistema?.filter(u => u.estadoCuenta === 'pendiente').length ?? 0)
    : 0;

  // Filtra los módulos según los permisos del usuario logueado.
  // Carlos y Juan Cruz siempre ven todo (comportamiento sin cambios).
  const gruposVisibles = grupos
    .map(grupo => ({
      ...grupo,
      items: grupo.items.filter(item => tieneAccesoAModulo(usuario, item.path.slice(1))),
    }))
    .filter(grupo => grupo.items.length > 0);

  // "Usuarios" solo aparece en el perfil de Carlos
  if (esCarlos) {
    const finanzas = gruposVisibles.find(g => g.label === 'Finanzas');
    if (finanzas) {
      finanzas.items = [
        ...finanzas.items,
        { path: '/usuarios', label: 'Usuarios', icon: UserCog, badgeKey: 'usuarios' as const },
      ];
    }
  }

  // Polling cada 60s para el badge de solicitudes web
  useEffect(() => {
    const fetch = () => {
      api.get('/cotizaciones-web/contador')
        .then(r => setPendientesWeb(r.data?.pendientes ?? 0))
        .catch(() => {});
    };
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = () => {
    queryClient.clear();
    logout();
    navigate('/login');
  };

  return (
    <aside
      style={{ background: C.bg, borderRight: `1px solid ${C.border}` }}
      className={`fixed top-0 left-0 h-screen h-dvh w-[252px] flex flex-col z-30 transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
    >
      {/* ── Header / Logo ── */}
      <div
        style={{ borderBottom: `1px solid ${C.border}`, padding: '1rem 1.125rem 1rem' }}
        className="flex items-center justify-between shrink-0"
      >
        <div className="flex items-center gap-2.5">
          <img
            src={logoWood}
            alt="Wood Pallet logo"
            style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: '0.25rem' }}
          />
          <span style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: '1.35rem',
            color: '#111111',
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}>
            WoodPallet
          </span>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden flex items-center justify-center rounded-md transition-colors"
          style={{ color: C.textMuted, minWidth: 40, minHeight: 40 }}
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        <style>{`aside nav::-webkit-scrollbar{display:none}`}</style>

        {gruposVisibles.map((grupo, gi) => (
          <div key={grupo.label} style={{ marginBottom: gi < gruposVisibles.length - 1 ? '1.25rem' : 0 }}>
            {/* Etiqueta de grupo */}
            <p style={{
              color: C.label,
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              padding: '0 0.625rem',
              marginBottom: '0.25rem',
            }}>
              {grupo.label}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {grupo.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.5625rem 0.625rem',
                    borderRadius: '0.375rem',
                    fontSize: '0.8375rem',
                    fontWeight: isActive ? 600 : 450,
                    color: isActive ? C.accent : C.textMuted,
                    background: isActive ? C.accentSoft : 'transparent',
                    transition: 'all 0.13s',
                    textDecoration: 'none',
                    borderLeft: isActive ? `2.5px solid ${C.accentMid}` : '2.5px solid transparent',
                    minHeight: '40px',
                  })}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!el.style.borderLeftColor.includes('rgb(196')) {
                      el.style.background = '#F5EFE8';
                      el.style.color = C.text;
                    }
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    if (!el.style.borderLeftColor.includes('rgb(196')) {
                      el.style.background = 'transparent';
                      el.style.color = C.textMuted;
                    }
                  }}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        size={15}
                        style={{ color: isActive ? C.accentMid : C.label, flexShrink: 0 }}
                      />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {'badgeKey' in item && item.badgeKey === 'web' && pendientesWeb > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 18, height: 18, padding: '0 5px',
                          background: '#D97706', color: '#fff',
                          borderRadius: 99, fontSize: '0.62rem', fontWeight: 700,
                        }}>
                          {pendientesWeb}
                        </span>
                      )}
                      {'badgeKey' in item && item.badgeKey === 'usuarios' && pendientesUsuarios > 0 && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          minWidth: 18, height: 18, padding: '0 5px',
                          background: '#D97706', color: '#fff',
                          borderRadius: 99, fontSize: '0.62rem', fontWeight: 700,
                        }}>
                          {pendientesUsuarios}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer: Mi Cuenta + Cerrar sesión ── */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.625rem 0.625rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '1px', paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))' }}>
        <NavLink
          to="/mi-cuenta"
          onClick={onClose}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.5625rem 0.625rem',
            borderRadius: '0.375rem',
            fontSize: '0.8375rem',
            fontWeight: isActive ? 600 : 450,
            color: isActive ? C.accent : C.textMuted,
            background: isActive ? C.accentSoft : 'transparent',
            transition: 'all 0.13s',
            textDecoration: 'none',
            borderLeft: isActive ? `2.5px solid ${C.accentMid}` : '2.5px solid transparent',
            minHeight: '40px',
          })}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement;
            if (!el.style.borderLeftColor.includes('rgb(196')) {
              el.style.background = '#F5EFE8';
              el.style.color = C.text;
            }
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement;
            if (!el.style.borderLeftColor.includes('rgb(196')) {
              el.style.background = 'transparent';
              el.style.color = C.textMuted;
            }
          }}
        >
          {({ isActive }) => (
            <>
              <UserCircle size={15} style={{ color: isActive ? C.accentMid : C.label, flexShrink: 0 }} />
              Mi cuenta
            </>
          )}
        </NavLink>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5625rem 0.625rem',
            borderRadius: '0.375rem',
            border: 'none', cursor: 'pointer',
            background: 'transparent',
            color: C.textMuted,
            fontSize: '0.8125rem',
            fontWeight: 500,
            transition: 'all 0.13s',
            minHeight: '40px',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = '#FEF2F2';
            (e.currentTarget as HTMLElement).style.color = '#B91C1C';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = C.textMuted;
          }}
        >
          <LogOut size={14} style={{ flexShrink: 0 }} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
