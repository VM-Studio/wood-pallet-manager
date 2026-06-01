import { useState } from 'react';
import { Truck, Calendar, Clock, CheckCircle, AlertCircle, X, MapPin, Package, CreditCard } from 'lucide-react';
import { useLogisticasPorRol, useEntregasHoy, useConsultarLogistica, useAvanzarLogistica } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

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
    costoFlete?: number;
    fechaEstimEntrega?: string;
    lugarEntrega?: string;
    tipoEntrega?: string;
    cliente?: { razonSocial: string; direccionEntrega?: string; localidad?: string };
    usuario?: { nombre: string; apellido: string; rol: string };
    detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
  };
}

const fmt = (v?: number) =>
  v != null ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v) : '—';

const fmtFecha = (s?: string) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const estadoEntregaStyle = (e: EstadoEntrega) => ({
  bg:    e === 'pendiente' ? '#FEF3E2' : e === 'en_camino' ? '#EFF6FF' : e === 'entregado' ? '#DCFCE7' : '#FEE2E2',
  color: e === 'pendiente' ? '#C4895A' : e === 'en_camino' ? '#2563EB' : e === 'entregado' ? '#15803D' : '#DC2626',
  label: e === 'pendiente' ? 'Pendiente' : e === 'en_camino' ? 'En camino' : e === 'entregado' ? 'Entregado' : 'Con problema',
});

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
  const est   = estadoEntregaStyle(l.estadoEntrega);
  const badge = consultaBadge[l.estadoConsulta ?? 'no_aplica'];

  const lugarEntrega =
    l.venta?.lugarEntrega ||
    [l.venta?.cliente?.direccionEntrega, l.venta?.cliente?.localidad].filter(Boolean).join(', ') ||
    '—';
  const costoFlete  = l.venta?.costoFlete ?? l.costoFlete;
  const fechaEntrega = l.venta?.fechaEstimEntrega ?? l.fechaRetiroGalpon;

  return (
    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0.5rem', overflow: 'hidden' }}>
      {/* Cabecera */}
      <div style={{ padding: '0.875rem 1rem 0.625rem', borderBottom: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', background: '#6B3A2A', color: '#fff', borderRadius: '0.25rem' }}>
            Venta #{l.ventaId}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: est.bg, color: est.color }}>
            {est.label}
          </span>
          {l.estadoConsulta && l.estadoConsulta !== 'no_aplica' && (
            <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          )}
        </div>
        <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>
          {l.venta?.cliente?.razonSocial ?? '—'}
        </p>
      </div>

      {/* Datos */}
      <div style={{ padding: '0.625rem 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
        <div>
          <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px' }}>Lugar de entrega</p>
          <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>📍 {lugarEntrega}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px' }}>Fecha de entrega</p>
          <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>📅 {fmtFecha(fechaEntrega)}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px' }}>Costo flete</p>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#6B3A2A', margin: 0 }}>{fmt(costoFlete)}</p>
        </div>
        {esCarlos && l.venta?.usuario && (
          <div>
            <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px' }}>Vendedor</p>
            <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>{l.venta.usuario.nombre} {l.venta.usuario.apellido}</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div style={{ padding: '0 1rem 0.875rem' }}>
        {/* Juan: consultar a Carlos */}
        {!esCarlos && l.venta?.tipoEntrega === 'envio_woodpallet' && l.estadoConsulta === 'no_aplica' && (
          <button
            onClick={() => consultarMutation.mutate(l.ventaId)}
            disabled={consultarMutation.isPending}
            style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', border: 'none', borderRadius: '0.25rem', padding: '0.4rem 0.875rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            Consultar a Carlos
          </button>
        )}

        {/* Carlos: 3 botones de progresión en TODAS las tarjetas */}
        {esCarlos && l.estadoEntrega !== 'entregado' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {/* Consultando */}
            <button
              onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'consultando' })}
              disabled={avanzarMutation.isPending || l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '#DBEAFE' : 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                color: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '#1D4ED8' : '#fff',
                border: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '1px solid #93C5FD' : 'none',
                borderRadius: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                cursor: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? 'default' : 'pointer',
                opacity: avanzarMutation.isPending ? 0.6 : 1,
              }}>
              Consultando
            </button>

            {/* Aceptada */}
            <button
              onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'aceptada' })}
              disabled={avanzarMutation.isPending || l.estadoConsulta === 'aceptada'}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: l.estadoConsulta === 'aceptada' ? '#DCFCE7' : '#F3F4F6',
                color: l.estadoConsulta === 'aceptada' ? '#15803D' : '#374151',
                border: l.estadoConsulta === 'aceptada' ? '1px solid #86EFAC' : '1px solid #E5E7EB',
                borderRadius: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                cursor: l.estadoConsulta === 'aceptada' ? 'default' : 'pointer',
                opacity: avanzarMutation.isPending ? 0.6 : 1,
              }}>
              Aceptada
            </button>

            {/* Entregada */}
            <button
              onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'entregada' })}
              disabled={avanzarMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: '#F3F4F6', color: '#374151',
                border: '1px solid #E5E7EB',
                borderRadius: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer',
                opacity: avanzarMutation.isPending ? 0.6 : 1,
              }}>
              Entregada
            </button>
          </div>
        )}

        {/* Carlos: entregada — estado final */}
        {esCarlos && l.estadoEntrega === 'entregado' && (
          <p style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: 600, margin: 0 }}>Entregada</p>
        )}
      </div>
    </div>
  );
}

function EmptyState({ esCarlos, label }: { esCarlos: boolean; label?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 1rem', textAlign: 'center', background: '#F9FAFB', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
      <Truck size={22} style={{ color: '#D1D5DB', marginBottom: 8 }} />
      <p style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 600, margin: '0 0 4px' }}>{label ?? 'Sin entregas registradas'}</p>
      <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
        {esCarlos ? 'Registrá la primera entrega con el botón de arriba' : 'Las entregas aparecen acá cuando se confirmen'}
      </p>
    </div>
  );
}

type FiltroKpi = 'pendiente' | 'en_camino' | 'entregado' | 'hoy' | null;

// ── Modal de KPI ────────────────────────────────────────────────────
function KpiModal({
  filtro, logisticas, entregasHoy, esCarlos, onClose,
  avanzarMutation,
}: {
  filtro: FiltroKpi;
  logisticas: LogisticaRow[];
  entregasHoy: LogisticaRow[];
  esCarlos: boolean;
  onClose: () => void;
  avanzarMutation: ReturnType<typeof useAvanzarLogistica>;
}) {
  const titulos: Record<string, string> = {
    pendiente:  'Entregas pendientes',
    en_camino:  'En camino ahora',
    entregado:  'Entregadas',
    hoy:        'Entregas de hoy',
  };

  const items = filtro === 'hoy'
    ? entregasHoy
    : logisticas.filter(l => l.estadoEntrega === filtro);

  const fmtHora = (s?: string) =>
    s ? new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs' : null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '0.5rem', width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #E5E7EB', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
              {filtro ? titulos[filtro] : ''}
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>
              {items.length} entrega{items.length !== 1 ? 's' : ''}
              {filtro === 'hoy' && ` · ${new Date().toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1rem 1.25rem' }}>
          {items.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1rem', textAlign: 'center' }}>
              <Truck size={24} style={{ color: '#D1D5DB', marginBottom: 10 }} />
              <p style={{ fontSize: '0.875rem', color: '#9CA3AF', margin: 0 }}>
                {filtro === 'hoy' ? 'No hay entregas programadas para hoy' : 'No hay entregas en este estado'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {items.map(l => {
                const est = estadoEntregaStyle(l.estadoEntrega);
                const lugarEntrega =
                  l.venta?.lugarEntrega ||
                  [l.venta?.cliente?.direccionEntrega, l.venta?.cliente?.localidad].filter(Boolean).join(', ') || '—';
                const costoFlete = l.venta?.costoFlete ?? l.costoFlete;
                const fechaEntrega = l.venta?.fechaEstimEntrega ?? l.fechaRetiroGalpon;

                return (
                  <div key={l.id} style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', overflow: 'hidden' }}>
                    {/* Cabecera tarjeta */}
                    <div style={{ padding: '0.75rem 1rem', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', background: '#6B3A2A', color: '#fff', borderRadius: '0.25rem' }}>
                          Venta #{l.ventaId}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827' }}>
                          {l.venta?.cliente?.razonSocial ?? '—'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: est.bg, color: est.color }}>
                        {est.label}
                      </span>
                    </div>

                    {/* Datos principales */}
                    <div style={{ padding: '0.75rem 1rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem 1.5rem' }}>
                      <div>
                        <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={9} /> Lugar de entrega
                        </p>
                        <p style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500, margin: 0 }}>{lugarEntrega}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Truck size={9} /> Transportista
                        </p>
                        <p style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500, margin: 0 }}>
                          {l.nombreTransportista ?? '—'}
                          {l.telefonoTransp && <span style={{ color: '#6B7280', marginLeft: 6 }}>{l.telefonoTransp}</span>}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={9} /> Fecha / Hora retiro
                        </p>
                        <p style={{ fontSize: '0.82rem', color: '#374151', fontWeight: 500, margin: 0 }}>
                          {fmtFecha(fechaEntrega)}
                          {l.horaRetiro && <span style={{ color: '#6B7280', marginLeft: 6 }}>{fmtHora(l.horaRetiro)}</span>}
                        </p>
                      </div>
                      {costoFlete != null && (
                        <div>
                          <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <CreditCard size={9} /> Costo flete
                          </p>
                          <p style={{ fontSize: '0.82rem', color: '#6B3A2A', fontWeight: 700, margin: 0 }}>{fmt(costoFlete)}</p>
                        </div>
                      )}
                    </div>

                    {/* Productos */}
                    {l.venta?.detalles && l.venta.detalles.length > 0 && (
                      <div style={{ padding: '0 1rem 0.75rem', borderTop: '1px solid #F3F4F6' }}>
                        <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0.625rem 0 0.375rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Package size={9} /> Productos
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {l.venta.detalles.map(d => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 10px', background: '#F9FAFB', borderRadius: '0.25rem', border: '1px solid #E5E7EB' }}>
                              <span style={{ fontSize: '0.8rem', color: '#374151' }}>{d.producto?.nombre ?? '—'}</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B3A2A' }}>{d.cantidadPedida} u</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observaciones */}
                    {l.observaciones && (
                      <div style={{ padding: '0 1rem 0.75rem' }}>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', fontStyle: 'italic', margin: 0 }}>"{l.observaciones}"</p>
                      </div>
                    )}

                    {/* Acciones en modal */}
                    {esCarlos && l.estadoEntrega !== 'entregado' && (
                      <div style={{ padding: '0 1rem 0.75rem', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'consultando' })}
                          disabled={avanzarMutation.isPending || l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada'}
                          style={{
                            fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '0.25rem', border: 'none', cursor: 'pointer',
                            background: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '#DBEAFE' : 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                            color: (l.estadoConsulta === 'consultada' || l.estadoConsulta === 'aceptada') ? '#1D4ED8' : '#fff',
                          }}>
                          Consultando
                        </button>
                        <button
                          onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'aceptada' })}
                          disabled={avanzarMutation.isPending || l.estadoConsulta === 'aceptada'}
                          style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '0.25rem', border: '1px solid #E5E7EB', cursor: 'pointer', background: l.estadoConsulta === 'aceptada' ? '#DCFCE7' : '#F3F4F6', color: l.estadoConsulta === 'aceptada' ? '#15803D' : '#374151' }}>
                          Aceptada
                        </button>
                        <button
                          onClick={() => avanzarMutation.mutate({ ventaId: l.ventaId, accion: 'entregada' })}
                          disabled={avanzarMutation.isPending}
                          style={{ fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: '0.25rem', border: '1px solid #E5E7EB', cursor: 'pointer', background: '#F3F4F6', color: '#374151' }}>
                          Entregada
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
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

  const consultarMutation = useConsultarLogistica();
  const avanzarMutation   = useAvanzarLogistica();

  if (isLoading) return <div className="p-8"><LoadingSpinner text="Cargando logística..." /></div>;
  if (isError)   return <div className="p-8"><ErrorMessage message="No se pudo cargar la logística." /></div>;

  // Separar logísticas para Carlos
  const misLogisticas  = logisticas?.filter(l => l.venta?.usuario?.rol === 'propietario_carlos') ?? [];
  const logisticasJuan = logisticas?.filter(l => l.venta?.usuario?.rol !== 'propietario_carlos') ?? [];
  const consultasPendientes = logisticasJuan.filter(l => l.estadoConsulta === 'pendiente_consulta').length;

  // KPIs
  const pendientes = logisticas?.filter(l => l.estadoEntrega === 'pendiente').length ?? 0;
  const enCamino   = logisticas?.filter(l => l.estadoEntrega === 'en_camino').length ?? 0;
  const entregadas = logisticas?.filter(l => l.estadoEntrega === 'entregado').length ?? 0;

  const cardProps = { esCarlos, consultarMutation, avanzarMutation };

  const kpis = [
    { icon: Clock,       color: '#C4895A', bg: '#FEF3E2', val: pendientes,              label: 'Pendientes',  filtro: 'pendiente' as FiltroKpi },
    { icon: Truck,       color: '#6B3A2A', bg: '#F3EDE8', val: enCamino,                label: 'En camino',   filtro: 'en_camino' as FiltroKpi },
    { icon: CheckCircle, color: '#15803D', bg: '#DCFCE7', val: entregadas,              label: 'Entregadas',  filtro: 'entregado' as FiltroKpi },
    ...(esCarlos ? [{ icon: Calendar, color: '#6B3A2A', bg: '#F3EDE8', val: entregasHoy?.length ?? 0, label: 'Hoy', filtro: 'hoy' as FiltroKpi }] : []),
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

      {/* KPIs clicables */}
      <div className={`grid ${esCarlos ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'} gap-4`}>
        {kpis.map(({ icon: Icon, color, bg, val, label, filtro }) => (
          <button
            key={label}
            onClick={() => setFiltroActivo(filtroActivo === filtro ? null : filtro)}
            style={{
              background: '#fff',
              border: `1.5px solid ${filtroActivo === filtro ? color : '#E5E7EB'}`,
              borderRadius: '0.5rem',
              padding: '0.875rem 1rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              boxShadow: filtroActivo === filtro ? `0 0 0 3px ${color}22` : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, borderRadius: '0.25rem', flexShrink: 0 }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: '1.375rem', fontWeight: 800, color: filtroActivo === filtro ? color : '#6B3A2A', margin: 0, lineHeight: 1 }}>{val}</p>
                <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {label}
                  <span style={{ fontSize: '0.65rem', color: filtroActivo === filtro ? color : '#9CA3AF' }}>
                    {filtroActivo === filtro ? '▲' : '▼'}
                  </span>
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Banner consultas pendientes — solo Carlos */}
      {esCarlos && consultasPendientes > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 0.875rem', background: '#FEF3E2', border: '1px solid #FDBA74', borderRadius: '0.5rem' }}>
          <AlertCircle size={16} style={{ color: '#C4895A', flexShrink: 0 }} />
          <p style={{ fontSize: '0.85rem', color: '#92400E', fontWeight: 600, margin: 0 }}>
            {consultasPendientes} consulta{consultasPendientes > 1 ? 's' : ''} de logística pendiente{consultasPendientes > 1 ? 's' : ''} de Juan Cruz
          </p>
        </div>
      )}

      {/* Vista Juan */}
      {!esCarlos && (
        !logisticas?.length
          ? <EmptyState esCarlos={false} />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logisticas.map(l => <LogisticaCard key={l.id} l={l} {...cardProps} />)}
            </div>
      )}

      {/* Vista Carlos: dos columnas */}
      {esCarlos && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>

          {/* Mis logísticas */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #6B3A2A' }}>
              <Truck size={15} style={{ color: '#6B3A2A' }} />
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6B3A2A', margin: 0 }}>
                Mis logísticas{misLogisticas.length > 0 ? ` (${misLogisticas.length})` : ''}
              </h2>
            </div>
            {!misLogisticas.length
              ? <EmptyState esCarlos label="Sin logísticas propias" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {misLogisticas.map(l => <LogisticaCard key={l.id} l={l} {...cardProps} />)}
                </div>
            }
          </div>

          {/* Consultas de Juan */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 8, borderBottom: `2px solid ${consultasPendientes > 0 ? '#C4895A' : '#E5E7EB'}` }}>
              <AlertCircle size={15} style={{ color: consultasPendientes > 0 ? '#C4895A' : '#9CA3AF' }} />
              <h2 style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0, color: consultasPendientes > 0 ? '#C4895A' : '#6B7280' }}>
                Consultas de Juan Cruz{logisticasJuan.length > 0 ? ` (${logisticasJuan.length})` : ''}
              </h2>
            </div>
            {!logisticasJuan.length
              ? <EmptyState esCarlos label="Juan no tiene logísticas registradas" />
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {logisticasJuan.map(l => <LogisticaCard key={l.id} l={l} {...cardProps} />)}
                </div>
            }
          </div>

        </div>
      )}

      {/* Modal KPI */}
      {filtroActivo && (
        <KpiModal
          filtro={filtroActivo}
          logisticas={logisticas ?? []}
          entregasHoy={entregasHoy ?? []}
          esCarlos={esCarlos}
          onClose={() => setFiltroActivo(null)}
          avanzarMutation={avanzarMutation}
        />
      )}
    </div>
  );
}

