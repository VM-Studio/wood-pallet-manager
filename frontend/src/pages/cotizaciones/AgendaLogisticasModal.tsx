import { X, Clock, MapPin, User, Calendar, CheckCircle } from 'lucide-react';
import { useLogisticasAceptadas } from '../../hooks/useLogistica';
import type { LogisticaAceptada } from '../../hooks/useLogistica';

interface Props {
  onClose: () => void;
}

// Formatea "HH:MM" extraído de un ISO string
function formatHora(iso: string | null): string {
  if (!iso) return 'Sin horario';
  try {
    const d = new Date(iso);
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    if (hh === '00' && mm === '00') return 'Sin horario';
    return `${hh}:${mm}`;
  } catch {
    return 'Sin horario';
  }
}

// Devuelve "DD/MM/YYYY" de un ISO o de fechaEstimEntrega
function fechaBase(log: LogisticaAceptada): string {
  const iso = log.horaEstimadaEntrega || log.venta.fechaEstimEntrega;
  if (!iso) return 'Sin fecha';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return 'Sin fecha';
  }
}

// Clave para agrupar por día (YYYY-MM-DD)
function claveAgrupacion(log: LogisticaAceptada): string {
  const iso = log.horaEstimadaEntrega || log.venta.fechaEstimEntrega;
  if (!iso) return 'sin-fecha';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return 'sin-fecha';
  }
}

function labelVendedor(rol: string, nombre: string, apellido: string): { label: string; color: string; bg: string } {
  if (rol === 'propietario_carlos') return { label: 'Carlos', color: '#1D4ED8', bg: '#EFF6FF' };
  if (rol === 'propietario_juancruz') return { label: 'Juan Cruz', color: '#7E22CE', bg: '#FAF5FF' };
  return { label: `${nombre} ${apellido}`, color: '#374151', bg: '#F3F4F6' };
}

export default function AgendaLogisticasModal({ onClose }: Props) {
  const { data: logisticas = [], isLoading } = useLogisticasAceptadas();

  // Agrupar por día
  const grouped = logisticas.reduce<Record<string, LogisticaAceptada[]>>((acc, log) => {
    const key = claveAgrupacion(log);
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  // Ordenar claves cronológicamente (sin-fecha al final)
  const diasOrdenados = Object.keys(grouped).sort((a, b) => {
    if (a === 'sin-fecha') return 1;
    if (b === 'sin-fecha') return -1;
    return a.localeCompare(b);
  });

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 60 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal animate-slide-up" style={{ maxWidth: 580, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={18} style={{ color: '#6B3A2A' }} />
              Agenda de entregas
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isLoading ? 'Cargando…' : `${logisticas.length} logística${logisticas.length !== 1 ? 's' : ''} aceptada${logisticas.length !== 1 ? 's' : ''} pendiente${logisticas.length !== 1 ? 's' : ''} de entrega`}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Body con scroll */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>

          {isLoading && (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <span className="animate-spin">⏳</span> Cargando agenda…
            </div>
          )}

          {!isLoading && logisticas.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '3rem 1rem',
              color: '#9CA3AF', fontSize: '0.875rem',
            }}>
              <Calendar size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p className="font-medium">No hay logísticas aceptadas</p>
              <p className="text-xs mt-1">Todos los días están libres — podés elegir cualquier fecha</p>
            </div>
          )}

          {!isLoading && diasOrdenados.map(clave => {
            const items = grouped[clave];
            const primeraFecha = fechaBase(items[0]);

            return (
              <div key={clave} style={{ marginBottom: '1.5rem' }}>
                {/* Encabezado del día */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: '0.625rem',
                }}>
                  <div style={{
                    height: 1, flex: 1, background: '#E5E7EB',
                  }} />
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, color: '#6B7280',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    background: '#F9FAFB', padding: '2px 10px', border: '1px solid #E5E7EB',
                  }}>
                    {clave === 'sin-fecha' ? 'Sin fecha asignada' : primeraFecha}
                  </span>
                  <div style={{
                    height: 1, flex: 1, background: '#E5E7EB',
                  }} />
                </div>

                {/* Items del día */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {items.map(log => {
                    const vendedor = labelVendedor(log.venta.usuario.rol, log.venta.usuario.nombre, log.venta.usuario.apellido);
                    const hora = formatHora(log.horaEstimadaEntrega);
                    const direccion = log.lugarEntrega || log.venta.lugarEntrega || '—';

                    return (
                      <div key={log.id} style={{
                        background: '#fff',
                        border: '1px solid #E5E7EB',
                        borderLeft: '3px solid #16A34A',
                        padding: '0.75rem 1rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr auto',
                        gap: '0.5rem',
                        alignItems: 'start',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                          {/* Cliente */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                              {log.venta.cliente.razonSocial}
                            </span>
                          </div>

                          {/* Dirección */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MapPin size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                              {direccion}
                            </span>
                          </div>

                          {/* Hora */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            <span style={{
                              fontSize: '0.78rem',
                              color: hora === 'Sin horario' ? '#D1D5DB' : '#374151',
                              fontStyle: hora === 'Sin horario' ? 'italic' : 'normal',
                            }}>
                              {hora}
                            </span>
                          </div>
                        </div>

                        {/* Columna derecha: vendedor + badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span style={{
                            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                            background: vendedor.bg, color: vendedor.color,
                            border: `1px solid ${vendedor.color}30`,
                          }}>
                            {vendedor.label}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                            background: '#F0FDF4', color: '#15803D',
                            border: '1px solid #BBF7D0',
                          }}>
                            <CheckCircle size={10} /> Aceptada
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button className="btn-secondary" onClick={onClose}>Cerrar y volver al formulario</button>
        </div>
      </div>
    </div>
  );
}
