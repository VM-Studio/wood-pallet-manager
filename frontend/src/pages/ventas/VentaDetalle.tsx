import React, { useState } from 'react';
import {
  X, Truck, Receipt, Plus, AlertCircle, Send,
  Package, ChevronRight, CheckCircle, Clock, MapPin,
  CreditCard, FileText, Building2
} from 'lucide-react';
import { useVenta, useActualizarEstadoVenta, useRegistrarRetiro } from '../../hooks/useVentas';
import { useAuthStore } from '../../store/auth.store';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import SolicitudLogisticaModal from './SolicitudLogisticaModal';

interface VentaDetalleProps {
  ventaId: number;
  onClose: () => void;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const estadosOrden = ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito', 'entregado'];

const estadoLabel: Record<string, string> = {
  confirmado:        'Confirmado',
  en_preparacion:    'En preparación',
  listo_para_envio:  'Listo para envío',
  en_transito:       'En tránsito',
  entregado:         'Entregado',
  entregado_parcial: 'Entregado parcial',
  cancelado:         'Cancelado',
};

// ── Sección con título ────────────────────────────────────────────
function Seccion({ icon: Icon, titulo, children, accent = false }: {
  icon: React.ElementType;
  titulo: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div style={{ borderBottom: '1px solid #F3F4F6', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
        <div style={{
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: accent ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#F3EDE8',
          borderRadius: '0.25rem', flexShrink: 0,
        }}>
          <Icon size={14} style={{ color: accent ? '#fff' : '#6B3A2A' }} />
        </div>
        <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>{titulo}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Dato individual ──────────────────────────────────────────────
function Dato({ label, value, span = false }: { label: string; value: React.ReactNode; span?: boolean }) {
  return (
    <div style={{
      padding: '0.625rem 0.75rem',
      background: '#F9FAFB',
      border: '1px solid #E5E7EB',
      borderRadius: '0.25rem',
      gridColumn: span ? 'span 2' : undefined,
    }}>
      <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>{label}</p>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{value}</div>
    </div>
  );
}

export default function VentaDetalle({ ventaId, onClose }: VentaDetalleProps) {
  const { data: venta, isLoading } = useVenta(ventaId);
  const actualizarEstado = useActualizarEstadoVenta();
  const registrarRetiro = useRegistrarRetiro();
  const { usuario } = useAuthStore();
  const esJuan = usuario?.rol === 'propietario_juancruz';

  const [retiroDetalle, setRetiroDetalle] = useState<number | null>(null);
  const [cantidadRetiro, setCantidadRetiro] = useState(0);
  const [errorRetiro, setErrorRetiro] = useState('');
  const [showSolicitudModal, setShowSolicitudModal] = useState(false);

  const handleRetiro = async (detalleId: number) => {
    setErrorRetiro('');
    if (!cantidadRetiro || cantidadRetiro < 1) { setErrorRetiro('Ingresá una cantidad válida'); return; }
    try {
      await registrarRetiro.mutateAsync({ ventaId, detalleVentaId: detalleId, cantidadRetirada: cantidadRetiro });
      setRetiroDetalle(null);
      setCantidadRetiro(0);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setErrorRetiro(error.response?.data?.error || 'Error al registrar el retiro');
    }
  };

  const siguienteEstado = (actual: string): string | null => {
    const idx = estadosOrden.indexOf(actual);
    return idx >= 0 && idx < estadosOrden.length - 1 ? estadosOrden[idx + 1] : null;
  };

  const btnBrown: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
    color: '#fff', fontWeight: 600, fontSize: '0.82rem',
    padding: '0.45rem 0.875rem', borderRadius: '0.25rem', border: 'none', cursor: 'pointer',
  };

  const btnOutline: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
    fontWeight: 600, fontSize: '0.82rem',
    padding: '0.45rem 0.875rem', borderRadius: '0.25rem', cursor: 'pointer',
  };

  return (
    <>
      <div className="modal-overlay">
        <div className="modal animate-slide-up" style={{
          maxWidth: 740, borderRadius: '0.5rem', display: 'flex', flexDirection: 'column',
          maxHeight: '90vh',
        }}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '1.25rem 1.5rem', borderBottom: '1px solid #E5E7EB', flexShrink: 0,
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px',
                  background: '#6B3A2A', color: '#fff', borderRadius: '0.25rem', letterSpacing: '0.04em',
                }}>VENTA #{ventaId}</span>
                {venta && <EstadoBadge estado={venta.estadoPedido} />}
              </div>
              {venta && (
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '6px 0 2px' }}>
                  {venta.cliente?.razonSocial}
                </p>
              )}
              {venta && (
                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
                  {formatFecha(venta.fechaVenta)}
                  {venta.cliente?.cuit ? ` · CUIT ${venta.cliente.cuit}` : ''}
                </p>
              )}
            </div>
            <button onClick={onClose} className="btn-icon" style={{ borderRadius: '0.25rem', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────── */}
          {isLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : venta && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>

              {/* ══ 1. PEDIDO ══════════════════════════════════════ */}
              <Seccion icon={Package} titulo="Pedido" accent>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Dato label="Tipo de entrega" value={
                    venta.tipoEntrega === 'retira_cliente'
                      ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building2 size={13} /> Retira el cliente</span>
                      : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Truck size={13} /> Envío coordinado</span>
                  } />
                  <Dato label="Fecha estimada de entrega" value={
                    venta.fechaEstimEntrega ? formatFecha(venta.fechaEstimEntrega) : '—'
                  } />
                  {venta.lugarEntrega && (
                    <Dato label="Lugar de entrega" value={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} style={{ color: '#9CA3AF' }} />{venta.lugarEntrega}
                      </span>
                    } span />
                  )}
                </div>

                {/* Productos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {venta.detalles?.map(d => {
                    const totalRetirado = (d.retiros as { cantidadRetirada: number }[] | undefined)
                      ?.reduce((a, r) => a + r.cantidadRetirada, 0) || 0;
                    const pendiente = d.cantidadPedida - totalRetirado;
                    const pct = d.cantidadPedida > 0 ? Math.round((totalRetirado / d.cantidadPedida) * 100) : 0;
                    return (
                      <div key={d.id} style={{
                        padding: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>{d.producto?.nombre}</p>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: 0, flexShrink: 0 }}>{formatPesos(d.subtotal)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: '#6B7280', marginBottom: 6 }}>
                          <span>Pedido: <strong>{d.cantidadPedida} u</strong></span>
                          <span style={{ color: '#6B3A2A' }}>Entregado: <strong>{totalRetirado} u</strong></span>
                          <span style={{ color: pendiente > 0 ? '#D97706' : '#9CA3AF' }}>Pendiente: <strong>{pendiente} u</strong></span>
                        </div>
                        <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem',
                }}>
                  <div style={{ padding: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 3px' }}>Subtotal</p>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: 0 }}>{formatPesos(venta.totalSinIva || 0)}</p>
                  </div>
                  {venta.costoFlete ? (
                    <div style={{ padding: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 3px' }}>Flete</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: 0 }}>{formatPesos(venta.costoFlete)}</p>
                    </div>
                  ) : <div />}
                  <div style={{
                    padding: '0.75rem', background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                    borderRadius: '0.25rem', textAlign: 'center',
                  }}>
                    <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', margin: '0 0 3px' }}>Total c/ IVA</p>
                    <p style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: 0 }}>{formatPesos(venta.totalConIva || 0)}</p>
                  </div>
                </div>

                {/* Avanzar estado */}
                {siguienteEstado(venta.estadoPedido) && (
                  <button
                    onClick={() => actualizarEstado.mutate({ id: ventaId, estado: siguienteEstado(venta.estadoPedido)! })}
                    disabled={actualizarEstado.isPending}
                    style={{ ...btnBrown, opacity: actualizarEstado.isPending ? 0.5 : 1 }}
                  >
                    <ChevronRight size={14} />
                    Avanzar a: {estadoLabel[siguienteEstado(venta.estadoPedido)!]}
                  </button>
                )}

                {venta.requiereSenasa && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem',
                    background: '#FDF6EE', border: '1px solid #C4895A', borderRadius: '0.25rem', marginTop: 8,
                  }}>
                    <AlertCircle size={13} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.8rem', color: '#6B3A2A', fontWeight: 600, margin: 0 }}>
                      Requiere tratamiento SENASA
                      {venta.costoSenasa ? ` · ${formatPesos(venta.costoSenasa)}` : ''}
                    </p>
                  </div>
                )}
              </Seccion>

              {/* ══ 2. RETIRO ══════════════════════════════════════ */}
              <Seccion icon={Clock} titulo="Retiro parcial">
                <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.875rem' }}>
                  Registrá cada vez que el cliente retira o se despacha una parte del pedido.
                  El stock se descuenta automáticamente.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {venta.detalles?.map(d => {
                    const retiros = d.retiros as { fechaRetiro: string; cantidadRetirada: number }[] | undefined;
                    const totalRetirado = retiros?.reduce((a, r) => a + r.cantidadRetirada, 0) || 0;
                    const pendiente = d.cantidadPedida - totalRetirado;

                    return (
                      <div key={d.id} style={{ padding: '0.875rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>{d.producto?.nombre}</p>
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>
                              {totalRetirado} / {d.cantidadPedida} unidades entregadas
                            </p>
                          </div>
                          {pendiente > 0
                            ? <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', background: '#FEF3C7', color: '#D97706', borderRadius: 999 }}>{pendiente} pendientes</span>
                            : <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', background: '#DCFCE7', color: '#15803D', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 3 }}><CheckCircle size={11} /> Completo</span>
                          }
                        </div>

                        {retiros && retiros.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                            {retiros.map((r, i) => (
                              <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '4px 10px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0.25rem', fontSize: '0.78rem',
                              }}>
                                <span style={{ color: '#6B7280' }}>{formatFecha(r.fechaRetiro)}</span>
                                <span style={{ fontWeight: 700, color: '#374151' }}>{r.cantidadRetirada} unidades</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {pendiente > 0 && (
                          retiroDetalle === d.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                  type="number" min={1} max={pendiente}
                                  value={cantidadRetiro || ''}
                                  onChange={e => setCantidadRetiro(parseInt(e.target.value) || 0)}
                                  placeholder={`Máx. ${pendiente} u`}
                                  style={{
                                    flex: 1, padding: '0.4rem 0.625rem', fontSize: '0.82rem',
                                    border: '1px solid #E5E7EB', borderRadius: '0.25rem', outline: 'none',
                                  }}
                                  autoFocus
                                />
                                <button onClick={() => handleRetiro(d.id)} disabled={registrarRetiro.isPending}
                                  style={{ ...btnBrown, opacity: registrarRetiro.isPending ? 0.5 : 1 }}>
                                  {registrarRetiro.isPending ? '...' : 'Registrar'}
                                </button>
                                <button onClick={() => { setRetiroDetalle(null); setErrorRetiro(''); }} style={btnOutline}>
                                  <X size={13} />
                                </button>
                              </div>
                              {errorRetiro && (
                                <p style={{ fontSize: '0.78rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.25rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                                  <AlertCircle size={12} /> {errorRetiro}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setRetiroDetalle(d.id); setCantidadRetiro(0); setErrorRetiro(''); }}
                              style={{ ...btnOutline, width: '100%', justifyContent: 'center' }}>
                              <Plus size={13} /> Registrar retiro parcial
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </Seccion>

              {/* ══ 3. LOGÍSTICA ══════════════════════════════════ */}
              <Seccion icon={Truck} titulo="Logística">
                {esJuan && (
                  <div style={{ marginBottom: '0.875rem' }}>
                    <button onClick={() => setShowSolicitudModal(true)} style={btnBrown}>
                      <Send size={13} /> Solicitar logística a Carlos
                    </button>
                  </div>
                )}

                {venta.logistica ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <Dato label="Transportista" value={
                        <span>
                          {venta.logistica.nombreTransportista || '—'}
                          {venta.logistica.telefonoTransp && (
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', marginLeft: 6 }}>
                              {venta.logistica.telefonoTransp}
                            </span>
                          )}
                        </span>
                      } />
                      <Dato label="Estado de entrega" value={<EstadoBadge estado={venta.logistica.estadoEntrega} />} />
                      {venta.logistica.fechaRetiroGalpon && (
                        <Dato label="Fecha retiro del galpón" value={formatFecha(venta.logistica.fechaRetiroGalpon)} />
                      )}
                      {venta.logistica.costoFlete && (
                        <Dato label="Costo del flete" value={formatPesos(venta.logistica.costoFlete)} />
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: 4 }}>
                      {[
                        { ok: venta.logistica.confTransportista, label: 'Confirmación transportista' },
                        { ok: venta.logistica.confCliente, label: 'Confirmación cliente' },
                      ].map(({ ok, label }) => (
                        <div key={label} style={{
                          padding: '0.625rem 0.75rem', textAlign: 'center', borderRadius: '0.25rem',
                          background: ok ? '#FDF6EE' : '#F9FAFB',
                          border: `1px solid ${ok ? '#C4895A' : '#E5E7EB'}`,
                        }}>
                          <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 3px' }}>{label}</p>
                          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: ok ? '#6B3A2A' : '#9CA3AF', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            {ok ? <><CheckCircle size={12} /> Confirmado</> : <><Clock size={12} /> Pendiente</>}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '1.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem', textAlign: 'center',
                  }}>
                    <Truck size={20} style={{ color: '#D1D5DB', marginBottom: 8 }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', margin: '0 0 4px' }}>Sin logística coordinada</p>
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>
                      {venta.tipoEntrega === 'retira_cliente'
                        ? 'El cliente retira directamente del galpón'
                        : 'Coordiná la entrega desde el módulo de Logística'}
                    </p>
                  </div>
                )}
              </Seccion>

              {/* ══ 4. FACTURA ════════════════════════════════════ */}
              <Seccion icon={Receipt} titulo="Facturación">
                {venta.facturas && venta.facturas.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(venta.facturas as Record<string, unknown>[]).map(f => (
                      <div key={f.id as number} style={{ padding: '0.875rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: '0 0 2px' }}>
                              {f.esSinFactura ? 'Operación SN (sin factura)' : `Factura A ${f.nroFactura || ''}`}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>
                              Emitida: {formatFecha(f.fechaEmision as string)}
                              {f.fechaVencimiento && ` · Vence: ${formatFecha(f.fechaVencimiento as string)}`}
                            </p>
                          </div>
                          <EstadoBadge estado={f.estadoCobro as string} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: 8 }}>
                          <div style={{ padding: '0.5rem', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 2px' }}>Neto</p>
                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', margin: 0 }}>{formatPesos(f.totalNeto as number)}</p>
                          </div>
                          <div style={{ padding: '0.5rem', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 2px' }}>IVA 21%</p>
                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', margin: 0 }}>{formatPesos(f.iva as number)}</p>
                          </div>
                          <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', margin: '0 0 2px' }}>Total</p>
                            <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', margin: 0 }}>{formatPesos(f.totalConIva as number)}</p>
                          </div>
                        </div>
                        {(f.pagos as Record<string, unknown>[] | undefined)?.length ? (
                          <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 8 }}>
                            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 5 }}>
                              <CreditCard size={11} /> Pagos recibidos
                            </p>
                            {(f.pagos as Record<string, unknown>[]).map(p => (
                              <div key={p.id as number} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6B7280', padding: '3px 0', borderBottom: '1px solid #F3F4F6' }}>
                                <span>{formatFecha(p.fechaPago as string)} · {p.medioPago as string}</span>
                                <span style={{ fontWeight: 700, color: '#6B3A2A' }}>{formatPesos(p.monto as number)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '1.5rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem', textAlign: 'center',
                  }}>
                    <FileText size={20} style={{ color: '#D1D5DB', marginBottom: 8 }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', margin: '0 0 4px' }}>Sin factura emitida</p>
                    <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>
                      Emitila desde ARCA y registrala en el módulo de Facturación
                    </p>
                  </div>
                )}
              </Seccion>

            </div>
          )}
        </div>
      </div>

      {showSolicitudModal && venta && (
        <SolicitudLogisticaModal
          ventaId={ventaId}
          clienteNombre={venta.cliente?.razonSocial}
          onClose={() => setShowSolicitudModal(false)}
        />
      )}
    </>
  );
}

