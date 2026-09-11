import { useState } from 'react';
import { Truck, Calendar, Clock, AlertCircle, MapPin, Package, CreditCard, CheckCircle, ArrowRight, Eye, X, User, Phone, FileText } from 'lucide-react';
import { useLogisticasPorRol, useEntregasHoy, useConsultarLogistica, useAvanzarLogistica } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import RouteMonitorCard from './RouteMonitorCard';
import { getEstadoVentaStyle } from '../../utils/estadoVenta';

type EstadoConsulta = 'no_aplica' | 'pendiente_consulta' | 'consultada' | 'aceptada' | 'rechazada';
type EstadoEntrega = 'pendiente' | 'en_camino' | 'entregado' | 'con_problema';

interface LogisticaRow {
  id: number;
  ventaId: number;
  estadoEntrega: EstadoEntrega;
  estadoConsulta: EstadoConsulta;
  costoFlete?: number;
  nombreTransportista?: string;
  telefonoTransp?: string;
  fechaRetiroGalpon?: string;
  horaRetiro?: string;
  horaEstimadaEntrega?: string;
  observaciones?: string;
  consultadaPor?: { nombre: string; apellido: string };
  registradoPor?: { nombre: string; apellido: string };
  venta?: {
    estadoPedido?: string;
    costoFlete?: number;
    fechaEstimEntrega?: string;
    lugarEntrega?: string;
    tipoEntrega?: string;
    cliente?: { razonSocial: string; nombreContacto?: string; telefonoContacto?: string; direccionEntrega?: string; localidad?: string };
    usuario?: { nombre: string; apellido: string; rol: string };
    detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
  };
}

const fmt = (v?: number) =>
  v != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v) : '—';

const fmtFecha = (s?: string) => {
  if (!s) return '—';
  // Parsear como fecha local para evitar off-by-one por UTC
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const consultaBadge: Record<EstadoConsulta, { label: string; bg: string; color: string }> = {
  no_aplica:          { label: 'Sin consulta',  bg: '#F3F4F6', color: '#6B7280' },
  pendiente_consulta: { label: 'Pendiente',     bg: '#FEF3E2', color: '#C4895A' },
  consultada:         { label: 'Consultado',    bg: '#EFF6FF', color: '#2563EB' },
  aceptada:           { label: 'Aceptado',      bg: '#DCFCE7', color: '#15803D' },
  rechazada:          { label: 'Rechazado',     bg: '#FEE2E2', color: '#DC2626' },
};

// ── Tarjeta individual ──────────────────────────────────────────────
function LogisticaCard({
  l, esCarlos, consultarMutation, avanzarMutation,
}: {
  l: LogisticaRow;
  esCarlos: boolean;
  consultarMutation: ReturnType<typeof useConsultarLogistica>;
  avanzarMutation: ReturnType<typeof useAvanzarLogistica>;
}) {
  // Etiqueta de estado: se toma de venta.estadoPedido (misma fuente que la
  // columna "Estado" del módulo de Ventas), para que ambas pantallas muestren
  // siempre la misma etiqueta y color para una misma venta.
  const est   = getEstadoVentaStyle(l.venta?.estadoPedido);
  const badge = consultaBadge[l.estadoConsulta ?? 'no_aplica'];
  const [showDetalle, setShowDetalle] = useState(false);

  const lugarEntrega =
    l.venta?.lugarEntrega ||
    [l.venta?.cliente?.direccionEntrega, l.venta?.cliente?.localidad].filter(Boolean).join(', ') ||
    '—';
  const costoFlete  = l.venta?.costoFlete ?? l.costoFlete;
  const fechaEntrega = l.venta?.fechaEstimEntrega ?? l.fechaRetiroGalpon;

  const fmtHora = (s?: string) => {
    if (!s) return null;
    const d = new Date(s);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    if (hh === '00' && mm === '00') return null;
    return `${hh}:${mm}`;
  };
  const horaEntrega = fmtHora(l.horaEstimadaEntrega);

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
      {/* Fila principal */}
      <div style={{ padding: '0.625rem 0.875rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Badge venta */}
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', background: '#6B3A2A', color: '#fff', borderRadius: '0.2rem', flexShrink: 0 }}>
          #{l.ventaId}
        </span>

        {/* Estado entrega */}
        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', background: est.bg, color: est.color, borderRadius: '0.2rem', flexShrink: 0 }}>
          {est.label}
        </span>

        {/* Estado consulta */}
        {l.estadoConsulta && l.estadoConsulta !== 'no_aplica' && (
          <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', background: badge.bg, color: badge.color, borderRadius: '0.2rem', flexShrink: 0 }}>
            {badge.label}
          </span>
        )}

        {/* Empresa — flex grow */}
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {l.venta?.cliente?.razonSocial ?? '—'}
        </span>

        {/* Fecha */}
        {fechaEntrega && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Calendar size={11} style={{ color: '#9CA3AF' }} />
            <span style={{ fontSize: '0.75rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
              {fmtFecha(fechaEntrega)}{horaEntrega && ` · ${horaEntrega}hs`}
            </span>
          </div>
        )}
      </div>

      {/* Fila secundaria: lugar + flete + vendedor */}
      <div style={{ padding: '0 0.875rem 0.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderTop: '1px solid var(--color-surface-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flex: 1 }}>
          <MapPin size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lugarEntrega}</span>
        </div>
        {costoFlete != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <CreditCard size={11} style={{ color: '#9CA3AF' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B3A2A' }}>{fmt(costoFlete)}</span>
          </div>
        )}
        {esCarlos && l.venta?.usuario && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <Package size={11} style={{ color: '#9CA3AF' }} />
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{l.venta.usuario.nombre} {l.venta.usuario.apellido}</span>
          </div>
        )}
        <button
          onClick={() => setShowDetalle(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, color: '#6B3A2A',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          <Eye size={12} />
          Ver detalle
        </button>
      </div>

      {showDetalle && <LogisticaDetalleModal l={l} onClose={() => setShowDetalle(false)} />}

      {/* Acciones */}
      {(!esCarlos && l.venta?.tipoEntrega === 'envio_woodpallet' && l.estadoConsulta === 'no_aplica') || (esCarlos && l.estadoEntrega !== 'entregado') ? (
        <div style={{ padding: '0.375rem 0.875rem 0.625rem', borderTop: '1px solid var(--color-surface-muted)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {/* Juan: consultar */}
          {!esCarlos && l.estadoConsulta === 'no_aplica' && (
            <button
              onClick={() => consultarMutation.mutate(l.ventaId)}
              disabled={consultarMutation.isPending}
              style={{ background: '#6B3A2A', color: '#fff', border: 'none', borderRadius: '0.2rem', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
              Consultar a Carlos
            </button>
          )}

          {/* Carlos */}
          {esCarlos && (
            <>
              <button
                onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'consultando' })}
                disabled={avanzarMutation.isPending || l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada'}
                style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '0.275rem 0.65rem', borderRadius: '0.2rem', cursor: 'pointer',
                  background: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '#DBEAFE' : '#6B3A2A',
                  color: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '#1D4ED8' : '#fff',
                  border: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '1px solid #93C5FD' : 'none',
                  opacity: avanzarMutation.isPending ? 0.6 : 1,
                }}>Consultando</button>
              <button
                onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'aceptada' })}
                disabled={avanzarMutation.isPending || l.estadoConsulta === 'aceptada'}
                style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '0.275rem 0.65rem', borderRadius: '0.2rem', cursor: 'pointer',
                  background: l.estadoConsulta === 'aceptada' ? '#DCFCE7' : 'var(--color-surface-muted)',
                  color: l.estadoConsulta === 'aceptada' ? '#15803D' : 'var(--color-text-muted)',
                  border: l.estadoConsulta === 'aceptada' ? '1px solid #86EFAC' : '1px solid var(--color-border)',
                  opacity: avanzarMutation.isPending ? 0.6 : 1,
                }}>Aceptada</button>
              <button
                onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'en_camino' })}
                disabled={avanzarMutation.isPending || l.estadoEntrega === 'en_camino'}
                style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '0.275rem 0.65rem', borderRadius: '0.2rem', cursor: 'pointer',
                  background: l.estadoEntrega === 'en_camino' ? '#DBEAFE' : 'var(--color-surface-muted)',
                  color: l.estadoEntrega === 'en_camino' ? '#1D4ED8' : 'var(--color-text-muted)',
                  border: l.estadoEntrega === 'en_camino' ? '1px solid #93C5FD' : '1px solid var(--color-border)',
                  opacity: avanzarMutation.isPending ? 0.6 : 1,
                }}>En camino</button>
              <button
                onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'entregada' })}
                disabled={avanzarMutation.isPending}
                style={{
                  fontSize: '0.72rem', fontWeight: 600, padding: '0.275rem 0.65rem', borderRadius: '0.2rem', cursor: 'pointer',
                  background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)',
                  opacity: avanzarMutation.isPending ? 0.6 : 1,
                }}>Entregada</button>
            </>
          )}
        </div>
      ) : esCarlos && l.estadoEntrega === 'entregado' ? (
        <div style={{ padding: '0.3rem 0.875rem 0.5rem', borderTop: '1px solid var(--color-surface-muted)' }}>
          <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 600 }}>Entregada</span>
        </div>
      ) : null}
    </div>
  );
}

// ── Modal: Ver detalle completo de la logística/venta ──────────────
function LogisticaDetalleModal({ l, onClose }: { l: LogisticaRow; onClose: () => void }) {
  const est = getEstadoVentaStyle(l.venta?.estadoPedido);
  const badge = consultaBadge[l.estadoConsulta ?? 'no_aplica'];
  const cliente = l.venta?.cliente;
  const detalles = l.venta?.detalles ?? [];
  const costoFlete = l.venta?.costoFlete ?? l.costoFlete;
  const fechaEntrega = l.venta?.fechaEstimEntrega ?? l.fechaRetiroGalpon;

  const row = (icon: React.ReactNode, label: string, value?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.4rem 0' }}>
      <div style={{ color: '#9CA3AF', marginTop: 1, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '0.85rem', color: '#111827', fontWeight: 600, margin: '2px 0 0', wordBreak: 'break-word' }}>{value ?? '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal animate-slide-up"
        style={{ maxWidth: '560px', width: '100%', borderRadius: 'var(--radius-lg)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header" style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', background: '#6B3A2A', color: '#fff', borderRadius: '0.25rem' }}>
              Venta #{l.ventaId}
            </span>
            <h2 className="modal-title" style={{ margin: 0 }}>Detalle de la entrega</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '1.1rem 1.4rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Estados */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', background: est.bg, color: est.color, borderRadius: '0.25rem' }}>
              {est.label}
            </span>
            {l.estadoConsulta && l.estadoConsulta !== 'no_aplica' && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', background: badge.bg, color: badge.color, borderRadius: '0.25rem' }}>
                {badge.label}
              </span>
            )}
          </div>

          {/* Cliente */}
          <div style={{ background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: 14 }}>
            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 0 6px' }}>Cliente</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{cliente?.razonSocial ?? '—'}</p>
            {cliente?.nombreContacto && (
              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '2px 0 0' }}>{cliente.nombreContacto}{cliente.telefonoContacto ? ` · ${cliente.telefonoContacto}` : ''}</p>
            )}
          </div>

          {/* Grid de datos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.25rem', borderTop: '1px solid var(--color-surface-muted)', borderBottom: '1px solid var(--color-surface-muted)', marginBottom: 14 }}>
            {row(<MapPin size={13} />, 'Lugar de entrega', l.venta?.lugarEntrega || [cliente?.direccionEntrega, cliente?.localidad].filter(Boolean).join(', ') || '—')}
            {row(<Calendar size={13} />, 'Fecha estimada', fechaEntrega ? fmtFecha(fechaEntrega) : '—')}
            {row(<CreditCard size={13} />, 'Costo de flete', costoFlete != null ? fmt(costoFlete) : '—')}
            {row(<Truck size={13} />, 'Transportista', l.nombreTransportista || '—')}
            {l.telefonoTransp && row(<Phone size={13} />, 'Tel. transportista', l.telefonoTransp)}
            {l.venta?.usuario && row(<User size={13} />, 'Vendedor', `${l.venta.usuario.nombre} ${l.venta.usuario.apellido}`)}
          </div>

          {/* Detalle de productos (detalle de compra/venta) */}
          <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={12} /> Productos de la venta
          </p>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 14 }}>
            {detalles.length ? detalles.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.55rem 0.9rem', fontSize: '0.82rem',
                  borderTop: i === 0 ? 'none' : '1px solid var(--color-surface-muted)',
                  background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-muted)',
                }}
              >
                <span style={{ color: '#374151', fontWeight: 500 }}>{d.producto?.nombre ?? 'Producto'}</span>
                <span style={{ color: '#6B3A2A', fontWeight: 700 }}>{d.cantidadPedida} u</span>
              </div>
            )) : (
              <div style={{ padding: '0.75rem 0.9rem', fontSize: '0.8rem', color: '#9CA3AF' }}>Sin productos registrados</div>
            )}
          </div>

          {/* Observaciones */}
          {l.observaciones && (
            <div>
              <p style={{ fontSize: '0.68rem', color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileText size={12} /> Observaciones
              </p>
              <p style={{ fontSize: '0.82rem', color: '#374151', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', margin: 0 }}>
                {l.observaciones}
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid var(--color-border)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ esCarlos, label }: { esCarlos: boolean; label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
      <Truck size={22} style={{ color: '#D1D5DB', marginBottom: 8 }} />
      <p style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600, margin: '0 0 4px' }}>{label ?? 'Sin entregas registradas'}</p>
      <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
        {esCarlos ? 'Registrá la primera entrega con el botón de arriba' : 'Las entregas aparecen acá cuando se confirmen'}
      </p>
    </div>
  );
}

const PAGE_SIZE = 3;

type FiltroKpi = 'pendiente' | 'en_camino' | 'entregado' | 'hoy' | null;

// ── Lista paginada de tarjetas ──────────────────────────────────────
function LogisticaList({
  items, esCarlos, consultarMutation, avanzarMutation, emptyLabel, filtro, entregasHoy,
}: {
  items: LogisticaRow[];
  esCarlos: boolean;
  consultarMutation: ReturnType<typeof useConsultarLogistica>;
  avanzarMutation: ReturnType<typeof useAvanzarLogistica>;
  emptyLabel?: string;
  filtro?: FiltroKpi;
  entregasHoy?: LogisticaRow[];
}) {
  const [visibles, setVisibles] = useState(PAGE_SIZE);

  // Aplicar filtro de tarjetas
  const itemsFiltrados = filtro
    ? filtro === 'hoy'
      ? (entregasHoy ?? []).filter(h => items.some(i => i.id === h.id))
      : items.filter(l => l.estadoEntrega === filtro)
    : items;

  // Reiniciar paginación cuando cambie el filtro o la lista
  const itemsKey = `${items.length}-${filtro}`;
  const [lastKey, setLastKey] = useState(itemsKey);
  if (itemsKey !== lastKey) {
    setLastKey(itemsKey);
    setVisibles(PAGE_SIZE);
  }

  if (!itemsFiltrados.length) return <EmptyState esCarlos={esCarlos} label={filtro ? 'Sin resultados para este filtro' : emptyLabel} />;

  const mostrados = itemsFiltrados.slice(0, visibles);
  const hayMas    = visibles < itemsFiltrados.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {mostrados.map(l => (
        <LogisticaCard key={l.id} l={l} esCarlos={esCarlos} consultarMutation={consultarMutation} avanzarMutation={avanzarMutation} />
      ))}
      {hayMas && (
        <button
          onClick={() => setVisibles(v => v + PAGE_SIZE)}
          style={{
            marginTop: 2, padding: '0.45rem 1rem', fontSize: '0.78rem', fontWeight: 600,
            background: 'var(--color-surface-muted)', color: '#6B3A2A', border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 6,
          }}
        >
          Ver más
          <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
            ({itemsFiltrados.length - visibles} restante{itemsFiltrados.length - visibles !== 1 ? 's' : ''})
          </span>
        </button>
      )}
    </div>
  );
}

export default function LogisticaPage() {
  const { data: logisticas, isLoading, isError } = useLogisticasPorRol() as {
    data: LogisticaRow[] | undefined; isLoading: boolean; isError: boolean;
  };
  const { data: entregasHoy } = useEntregasHoy() as { data: LogisticaRow[] | undefined };
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const [filtroActivo, setFiltroActivo] = useState<FiltroKpi>(null);
  const [vistaCarlos, setVistaCarlos] = useState<'mis' | 'juan'>('mis');

  const consultarMutation = useConsultarLogistica();
  const avanzarMutation   = useAvanzarLogistica();

  if (isLoading) return <div className="p-8"><LoadingSpinner text="Cargando logística..." /></div>;
  if (isError)   return <div className="p-8"><ErrorMessage message="No se pudo cargar la logística." /></div>;

  // Separar logísticas para Carlos
  const misLogisticas  = logisticas?.filter(l => l.venta?.usuario?.rol === 'propietario_carlos') ?? [];
  const logisticasJuan = logisticas?.filter(l => l.venta?.usuario?.rol !== 'propietario_carlos') ?? [];
  const consultasPendientes = logisticasJuan.filter(l => l.estadoConsulta === 'pendiente_consulta').length;

  const entregadas = logisticas?.filter(l => l.estadoEntrega === 'entregado').length ?? 0;
  void entregadas;
  const hoy = entregasHoy?.length ?? 0;
  void hoy;

  // Para las tarjetas: contar según vista activa (Carlos ve su lista o la de Juan)
  const listaActiva = !esCarlos
    ? (logisticas ?? [])
    : vistaCarlos === 'mis' ? misLogisticas : logisticasJuan;

  const pendientesActivos = listaActiva.filter(l => l.estadoEntrega === 'pendiente').length;
  const enCaminoActivos   = listaActiva.filter(l => l.estadoEntrega === 'en_camino').length;
  const entregadasActivas = listaActiva.filter(l => l.estadoEntrega === 'entregado').length;
  const hoyActivos        = (entregasHoy ?? []).filter(h => listaActiva.some(i => i.id === h.id)).length;

  const tarjetas = [
    { key: 'pendiente' as FiltroKpi, label: 'Pendientes',  val: pendientesActivos, icono: <Clock size={16} />,      sub: 'sin despachar' },
    { key: 'en_camino' as FiltroKpi, label: 'En camino',   val: enCaminoActivos,   icono: <Truck size={16} />,      sub: 'en tránsito ahora' },
    { key: 'entregado' as FiltroKpi, label: 'Entregadas',  val: entregadasActivas, icono: <CheckCircle size={16} />, sub: 'confirmadas' },
    { key: 'hoy'       as FiltroKpi, label: 'Para hoy',    val: hoyActivos,        icono: <Calendar size={16} />,   sub: 'programadas hoy' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="titulo-modulo">Logística</h1>
        <p className="text-sm text-gray-500 mt-1">
          {esCarlos ? 'Coordinación centralizada de todas las entregas' : 'Estado de las entregas de tus ventas'}
        </p>
      </div>

      {/* Tarjetas filtro */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {tarjetas.map(t => {
          const activa = filtroActivo === t.key;
          return (
            <div
              key={t.key}
              className="card-kpi cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              onClick={() => setFiltroActivo(activa ? null : t.key)}
              style={activa ? { outline: '2px solid #7c4b2c', outlineOffset: '-2px' } : {}}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                  {t.icono}
                </div>
                <p className="titulo-card flex-1">{t.label}</p>
                {activa && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', background: '#C4895A', color: '#fff', borderRadius: '0.2rem' }}>
                    ON
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{t.val}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400">{t.sub}</p>
                <ArrowRight size={11} className="text-gray-300" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner consultas pendientes — solo Carlos */}
      {esCarlos && consultasPendientes > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 0.875rem', background: '#FEF3E2', border: '1px solid #FDBA74', borderRadius: 'var(--radius-lg)' }}>
          <AlertCircle size={16} style={{ color: '#C4895A', flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: '#92400E', fontWeight: 600, margin: 0 }}>
            {consultasPendientes} consulta{consultasPendientes > 1 ? 's' : ''} de logística pendiente{consultasPendientes > 1 ? 's' : ''} de Juan Cruz
          </p>
        </div>
      )}

      {/* Vista Juan */}
      {!esCarlos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div>
            <LogisticaList
              items={logisticas ?? []}
              esCarlos={false}
              consultarMutation={consultarMutation}
              avanzarMutation={avanzarMutation}
              filtro={filtroActivo}
              entregasHoy={entregasHoy ?? []}
            />
          </div>
          <div>
            <RouteMonitorCard />
          </div>
        </div>
      )}

      {/* Vista Carlos: dos columnas */}
      {esCarlos && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Columna izquierda: selector + lista */}
          <div>
            {/* Selector tipo tab/dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface-muted)' }}>
              <button
                onClick={() => setVistaCarlos('mis')}
                style={{
                  flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.78rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: vistaCarlos === 'mis' ? '#6B3A2A' : 'transparent',
                  color: vistaCarlos === 'mis' ? '#fff' : '#6B7280',
                  borderRight: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Truck size={12} />
                Mis logísticas
                {misLogisticas.length > 0 && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '0.875rem', background: vistaCarlos === 'mis' ? 'rgba(255,255,255,0.25)' : '#E5E7EB', color: vistaCarlos === 'mis' ? '#fff' : '#6B7280' }}>
                    {misLogisticas.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setVistaCarlos('juan')}
                style={{
                  flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.78rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: vistaCarlos === 'juan' ? '#6B3A2A' : 'transparent',
                  color: vistaCarlos === 'juan' ? '#fff' : '#6B7280',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <AlertCircle size={12} style={{ color: consultasPendientes > 0 && vistaCarlos !== 'juan' ? '#C4895A' : 'inherit' }} />
                Juan Cruz
                {logisticasJuan.length > 0 && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '0.875rem',
                    background: vistaCarlos === 'juan' ? 'rgba(255,255,255,0.25)' : (consultasPendientes > 0 ? '#FEF3E2' : '#E5E7EB'),
                    color: vistaCarlos === 'juan' ? '#fff' : (consultasPendientes > 0 ? '#C4895A' : '#6B7280'),
                  }}>
                    {logisticasJuan.length}
                  </span>
                )}
              </button>
            </div>

            {/* Lista según vista activa */}
            {vistaCarlos === 'mis' ? (
              <LogisticaList
                items={misLogisticas}
                esCarlos={esCarlos}
                consultarMutation={consultarMutation}
                avanzarMutation={avanzarMutation}
                emptyLabel="Sin logísticas propias"
                filtro={filtroActivo}
                entregasHoy={entregasHoy ?? []}
              />
            ) : (
              <LogisticaList
                items={logisticasJuan}
                esCarlos={esCarlos}
                consultarMutation={consultarMutation}
                avanzarMutation={avanzarMutation}
                emptyLabel="Juan no tiene logísticas registradas"
                filtro={filtroActivo}
                entregasHoy={entregasHoy ?? []}
              />
            )}
          </div>

          {/* Columna derecha: solo Monitor de rutas */}
          <div>
            <RouteMonitorCard />
          </div>

        </div>
      )}

    </div>
  );
}


