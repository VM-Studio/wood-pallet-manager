import { useState, useMemo } from 'react';
import {
  RotateCcw, Plus, Search, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle,
  Truck, Leaf, Package, DollarSign, X, Clock, Ban
} from 'lucide-react';
import {
  useDevoluciones,
  useCrearDevolucion,
  useConfirmarDeposito,
  useCancelarDevolucion,
  useRestaurarStock,
  useRegistrarTransferenciaDevuelta,
  type Devolucion,
  type CrearDevolucionPayload,
} from '../../hooks/useDevoluciones';
import { useVentas } from '../../hooks/useVentas';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const CASO_CONFIG: Record<string, { label: string; desc: string }> = {
  pallet_danado:          { label: 'Pallets dañados',        desc: 'Mercadería llegó dañada. WoodPallet asume responsabilidad.' },
  cliente_no_quiere:      { label: 'Cliente no quiere',      desc: 'El cliente recibió y decide devolver.' },
  devolucion_parcial:     { label: 'Devolución parcial',     desc: 'El cliente devuelve solo una parte.' },
  cancelacion_anticipada: { label: 'Cancelación anticipada', desc: 'Canceló antes de la entrega.' },
};

const CASO_STYLE: Record<string, { bg: string; color: string }> = {
  pallet_danado:          { bg: '#FFF7ED', color: '#C2410C' },
  cliente_no_quiere:      { bg: '#FEF2F2', color: '#B91C1C' },
  devolucion_parcial:     { bg: '#FFFBEB', color: '#92400E' },
  cancelacion_anticipada: { bg: '#EFF6FF', color: '#1D4ED8' },
};

const ESTADO_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  pendiente:                       { label: 'Pendiente',     badgeClass: 'badge-yellow' },
  esperando_confirmacion_deposito: { label: 'Esp. depósito', badgeClass: 'badge-yellow' },
  confirmada:                      { label: 'Confirmada',    badgeClass: 'badge-blue'   },
  procesada:                       { label: 'Procesada',     badgeClass: 'badge-green'  },
  cancelada:                       { label: 'Cancelada',     badgeClass: 'badge-gray'   },
};

function NuevaDevolucionModal({ onClose }: { onClose: () => void }) {
  const { data: ventas = [] } = useVentas();
  const crear = useCrearDevolucion();

  const [ventaId, setVentaId] = useState<number | ''>('');
  const [tipoCaso, setTipoCaso] = useState<CrearDevolucionPayload['tipoCaso'] | ''>('');
  const [devuelveFlete, setDevuelveFlete] = useState(false);
  const [devuelveSenasa, setDevuelveSenasa] = useState(false);
  const [compensaSiguiente, setCompensaSiguiente] = useState(false);
  const [metodoPago, setMetodoPago] = useState('');
  const [cuentaDestino, setCuentaDestino] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [detalles, setDetalles] = useState<{
    detalleVentaId?: number;
    productoId: number;
    nombre: string;
    condicion: string;
    cantidadDisponible: number;
    cantidadDevuelta: number;
    precioUnitario: number;
  }[]>([]);
  const [error, setError] = useState('');

  const ventaSeleccionada = ventas.find(v => v.id === ventaId);

  const handleSelectVenta = (id: number) => {
    setVentaId(id);
    const v = ventas.find(v => v.id === id);
    if (v?.detalles) {
      setDetalles(v.detalles.map(d => ({
        detalleVentaId: d.id,
        productoId: d.productoId,
        nombre: d.producto?.nombre ?? `Producto #${d.productoId}`,
        condicion: d.producto?.condicion ?? '',
        cantidadDisponible: d.cantidadEntregada || d.cantidadPedida,
        cantidadDevuelta: 0,
        precioUnitario: Number(d.precioUnitario),
      })));
    } else {
      setDetalles([]);
    }
  };

  const montoPallets = detalles.reduce((acc, d) => acc + d.cantidadDevuelta * d.precioUnitario, 0);
  const montoFlete = devuelveFlete ? Number(ventaSeleccionada?.costoFlete ?? 0) : 0;
  const montoTotal = montoPallets + montoFlete;
  const incluyeIva = ventaSeleccionada
    ? Math.abs(Number(ventaSeleccionada.totalConIva ?? 0) - Number(ventaSeleccionada.totalSinIva ?? 0)) > 1
    : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!ventaId || !tipoCaso) { setError('Completá todos los campos obligatorios.'); return; }
    const detallesValidos = detalles.filter(d => d.cantidadDevuelta > 0);
    if (detallesValidos.length === 0) { setError('Indicá al menos un producto con cantidad a devolver.'); return; }
    try {
      await crear.mutateAsync({
        ventaId: ventaId as number,
        tipoCaso: tipoCaso as CrearDevolucionPayload['tipoCaso'],
        devuelveFlete,
        devuelveSenasa,
        compensaEnSiguientePedido: compensaSiguiente,
        metodoPago: metodoPago || undefined,
        cuentaDestino: cuentaDestino || undefined,
        observaciones: observaciones || undefined,
        detalles: detallesValidos.map(d => ({
          detalleVentaId: d.detalleVentaId,
          productoId: d.productoId,
          cantidadDevuelta: d.cantidadDevuelta,
          precioUnitario: d.precioUnitario,
        })),
      });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al registrar la devolución.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={18} style={{ color: '#6B3A2A' }} />
            </div>
            <div>
              <h2 className="modal-title">Nueva devolución</h2>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Registrá una devolución de mercadería</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Selector de venta */}
            <div>
              <label className="label">Venta asociada *</label>
              <select className="select" value={ventaId} onChange={e => handleSelectVenta(Number(e.target.value))} required>
                <option value="">— Seleccioná una venta —</option>
                {ventas.filter(v => v.estadoPedido !== 'cancelado').map(v => (
                  <option key={v.id} value={v.id}>
                    #{v.id} — {v.cliente?.razonSocial}{v.cliente?.nombreContacto ? ` (${v.cliente.nombreContacto})` : ''} — {formatPesos(Number(v.totalConIva ?? 0))}
                  </option>
                ))}
              </select>
            </div>

            {/* Detalle de la venta seleccionada */}
            {ventaSeleccionada && (
              <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Detalle de la venta #{ventaSeleccionada.id}</p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111827' }}>{ventaSeleccionada.cliente?.razonSocial}</span>
                  {ventaSeleccionada.cliente?.nombreContacto && (
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>· {ventaSeleccionada.cliente.nombreContacto}</span>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.75rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                    📅 {formatFecha(ventaSeleccionada.fechaVenta)}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: ventaSeleccionada.incluyeFlete ? '#EFF6FF' : '#F3F4F6', color: ventaSeleccionada.incluyeFlete ? '#1D4ED8' : '#6B7280', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                    🚛 Flete: {ventaSeleccionada.incluyeFlete ? `Sí (${formatPesos(Number(ventaSeleccionada.costoFlete ?? 0))})` : 'No'}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: ventaSeleccionada.requiereSenasa ? '#F0FDF4' : '#F3F4F6', color: ventaSeleccionada.requiereSenasa ? '#15803D' : '#6B7280', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                    🌿 SENASA: {ventaSeleccionada.requiereSenasa ? 'Sí' : 'No'}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: incluyeIva ? '#FEF3C7' : '#F3F4F6', color: incluyeIva ? '#92400E' : '#6B7280', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                    💰 IVA: {incluyeIva ? 'Incluido' : 'Sin IVA'}
                  </span>
                  <span style={{ fontSize: '0.75rem', background: ventaSeleccionada.origenStock === 'stock_propio' ? '#F0FDF4' : '#EFF6FF', color: ventaSeleccionada.origenStock === 'stock_propio' ? '#15803D' : '#1D4ED8', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontWeight: 500 }}>
                    📦 {ventaSeleccionada.origenStock === 'stock_propio' ? 'Stock propio' : 'Compra reventa'}
                  </span>
                </div>

                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.625rem' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', marginBottom: '0.375rem' }}>PRODUCTOS DE LA VENTA</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {ventaSeleccionada.detalles?.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Package size={12} color="#9CA3AF" />
                          {d.producto?.nombre}
                          {d.producto?.condicion && <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>({d.producto.condicion})</span>}
                        </span>
                        <span style={{ color: '#6B7280' }}>
                          {d.cantidadEntregada || d.cantidadPedida} u. × {formatPesos(Number(d.precioUnitario))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#6B7280' }}>Total venta:</span>
                  <strong style={{ color: '#111827' }}>{formatPesos(Number(ventaSeleccionada.totalConIva ?? 0))}</strong>
                </div>
              </div>
            )}

            {/* Tipo de devolución */}
            <div>
              <label className="label">Tipo de devolución *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(CASO_CONFIG).map(([key, val]) => {
                  const s = CASO_STYLE[key];
                  return (
                    <button key={key} type="button"
                      onClick={() => setTipoCaso(key as CrearDevolucionPayload['tipoCaso'])}
                      style={{ padding: '0.625rem 0.75rem', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', border: tipoCaso === key ? '2px solid #6B3A2A' : '2px solid #E5E7EB', background: tipoCaso === key ? '#FDF5F0' : '#fff' }}
                    >
                      <span style={{ display: 'inline-block', marginBottom: 4, padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem', fontWeight: 600, background: s.bg, color: s.color }}>{val.label}</span>
                      <p style={{ fontSize: '0.71rem', color: '#6B7280', margin: 0 }}>{val.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {(tipoCaso === 'cliente_no_quiere' || tipoCaso === 'devolucion_parcial') && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
                <strong>Requiere confirmación del depósito:</strong> El reintegro se procesa recién cuando el galpón confirma la recepción.
              </div>
            )}

            {/* Cantidades */}
            {detalles.length > 0 && (
              <div>
                <label className="label">Cantidad a devolver por producto *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detalles.map((d, i) => (
                    <div key={d.productoId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F9FAFB', borderRadius: '0.25rem', padding: '0.625rem 0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', margin: 0 }}>{d.nombre}</p>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>
                          {d.condicion && `${d.condicion} · `}{formatPesos(d.precioUnitario)} / u · máx {d.cantidadDisponible} u.
                        </p>
                      </div>
                      <input type="number" min={0} max={d.cantidadDisponible} className="input"
                        style={{ width: '5rem', textAlign: 'center' }}
                        value={d.cantidadDevuelta || ''} placeholder="0"
                        onChange={e => setDetalles(prev => prev.map((x, j) =>
                          j === i ? { ...x, cantidadDevuelta: Math.max(0, Math.min(d.cantidadDisponible, parseInt(e.target.value) || 0)) } : x
                        ))} />
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', width: '5.5rem', textAlign: 'right', margin: 0 }}>
                        {formatPesos(d.cantidadDevuelta * d.precioUnitario)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ventaSeleccionada && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: devuelveFlete ? '#EFF6FF' : '#F9FAFB', border: devuelveFlete ? '2px solid #3B82F6' : '2px solid #E5E7EB', borderRadius: '0.25rem', padding: '0.625rem 0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={devuelveFlete} onChange={e => setDevuelveFlete(e.target.checked)} />
                  <div>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, color: '#1D4ED8', margin: 0 }}><Truck size={13} /> Devolver flete</p>
                    <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>{formatPesos(Number(ventaSeleccionada.costoFlete ?? 0))}</p>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: devuelveSenasa ? '#F0FDF4' : '#F9FAFB', border: devuelveSenasa ? '2px solid #16A34A' : '2px solid #E5E7EB', borderRadius: '0.25rem', padding: '0.625rem 0.75rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={devuelveSenasa} onChange={e => setDevuelveSenasa(e.target.checked)} />
                  <div>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, color: '#15803D', margin: 0 }}><Leaf size={13} /> Devolver SENASA</p>
                    <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>Solo si no se tramitó</p>
                  </div>
                </label>
              </div>
            )}

            {tipoCaso === 'pallet_danado' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', background: compensaSiguiente ? '#FAF5FF' : '#F9FAFB', border: compensaSiguiente ? '2px solid #9333EA' : '2px solid #E5E7EB', borderRadius: '0.25rem', padding: '0.625rem 0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={compensaSiguiente} onChange={e => setCompensaSiguiente(e.target.checked)} />
                <div>
                  <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#7E22CE', margin: 0 }}>Compensar en siguiente pedido</p>
                  <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>Los pallets se agregarán sin costo en la próxima compra</p>
                </div>
              </label>
            )}

            {!compensaSiguiente && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="label">Método de reintegro</label>
                  <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                    <option value="">— Sin definir —</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="e_check">E-Check</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>
                <div>
                  <label className="label">Cuenta / CBU destino</label>
                  <input type="text" className="input" placeholder="CBU o alias" value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <label className="label">Observaciones</label>
              <textarea className="input" style={{ resize: 'none' }} rows={2} placeholder="Detalle adicional..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
            </div>

            {montoTotal > 0 && (
              <div style={{ background: '#F9FAFB', borderRadius: '0.25rem', border: '1px solid #E5E7EB', padding: '0.875rem' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Resumen del reintegro</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280' }}>
                    <span>Pallets</span><span>{formatPesos(montoPallets)}</span>
                  </div>
                  {devuelveFlete && montoFlete > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280' }}>
                      <span>Flete</span><span>{formatPesos(montoFlete)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: '#111827', paddingTop: '0.375rem', borderTop: '1px solid #E5E7EB', marginTop: '0.25rem' }}>
                    <span>Total a reintegrar</span>
                    <span style={{ color: '#15803D' }}>{formatPesos(montoTotal)}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.625rem 0.875rem', borderRadius: '0.25rem' }}>
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-brand" disabled={crear.isPending}>
              {crear.isPending ? 'Registrando...' : 'Registrar devolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DevolucionRow({ dev }: { dev: Devolucion }) {
  const [expanded, setExpanded] = useState(false);
  const confirmar = useConfirmarDeposito();
  const cancelar = useCancelarDevolucion();
  const restaurar = useRestaurarStock();
  const transferencia = useRegistrarTransferenciaDevuelta();

  const estado = ESTADO_CONFIG[dev.estado] ?? { label: dev.estado, badgeClass: 'badge-gray' };
  const caso = CASO_CONFIG[dev.tipoCaso] ?? { label: dev.tipoCaso, desc: '' };
  const casoStyle = CASO_STYLE[dev.tipoCaso] ?? { bg: '#F3F4F6', color: '#4B5563' };

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: expanded ? '#FAFAF8' : undefined }}
        onClick={() => setExpanded(p => !p)}
      >
        {/* # */}
        <td style={{ paddingLeft: '0.875rem' }}>
          <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#9CA3AF' }}>#{dev.id}</span>
        </td>
        {/* Cliente */}
        <td>
          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', margin: 0 }}>{dev.cliente.razonSocial}</p>
          {dev.cliente.nombreContacto && (
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>Venta #{dev.ventaId}</p>
          )}
        </td>
        {/* Tipo */}
        <td>
          <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.71rem', fontWeight: 600, background: casoStyle.bg, color: casoStyle.color, whiteSpace: 'nowrap' }}>
            {caso.label}
          </span>
        </td>
        {/* Productos */}
        <td>
          <p style={{ fontSize: '0.78rem', color: '#374151', margin: 0 }}>
            {dev.detalles.map(d => `${d.cantidadDevuelta} × ${d.producto.nombre}`).join(', ')}
          </p>
        </td>
        {/* Monto */}
        <td style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap' }}>
            {formatPesos(Number(dev.montoTotal))}
          </p>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 2 }}>
            {dev.devuelveFlete && <Truck size={11} color="#1D4ED8" />}
            {dev.devuelveSenasa && <Leaf size={11} color="#15803D" />}
          </div>
        </td>
        {/* Estado */}
        <td>
          <span className={estado.badgeClass} style={{ borderRadius: '0.25rem', whiteSpace: 'nowrap' }}>{estado.label}</span>
        </td>
        {/* Fecha */}
        <td style={{ color: '#9CA3AF', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
          {formatFecha(dev.fechaSolicitud)}
        </td>
        {/* Chevron */}
        <td style={{ paddingRight: '0.875rem', textAlign: 'right' }}>
          {expanded ? <ChevronUp size={14} color="#9CA3AF" /> : <ChevronDown size={14} color="#9CA3AF" />}
        </td>
      </tr>

      {/* ── Fila expandida ── */}
      {expanded && (
        <tr style={{ background: '#FAFAF8' }}>
          <td colSpan={8} style={{ padding: '0.875rem 1rem 1rem', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {dev.estado === 'esperando_confirmacion_deposito' && (
                  <button className="btn-brand-sm" disabled={confirmar.isPending}
                    onClick={e => { e.stopPropagation(); confirmar.mutate(dev.id); }}>
                    <CheckCircle size={13} />
                    {confirmar.isPending ? 'Confirmando...' : 'Confirmar recepción en depósito'}
                  </button>
                )}
                {!dev.stockRestaurado && (dev.estado === 'confirmada' || dev.estado === 'esperando_confirmacion_deposito') && (
                  <button className="btn-brand-sm"
                    style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}
                    disabled={restaurar.isPending}
                    onClick={e => { e.stopPropagation(); restaurar.mutate(dev.id); }}>
                    <Package size={13} />
                    {restaurar.isPending ? 'Registrando...' : 'Devolución restaurada'}
                  </button>
                )}
                {dev.stockRestaurado && !dev.transferenciaDevuelta && !dev.compensaEnSiguientePedido && (
                  <button className="btn-brand-sm"
                    style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                    disabled={transferencia.isPending}
                    onClick={e => { e.stopPropagation(); transferencia.mutate(dev.id); }}>
                    <DollarSign size={13} />
                    {transferencia.isPending ? 'Registrando...' : 'Transferencia devuelta'}
                  </button>
                )}
                {(dev.estado === 'pendiente' || dev.estado === 'esperando_confirmacion_deposito') && (
                  <button className="btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', color: '#DC2626', borderColor: '#FECACA' }}
                    disabled={cancelar.isPending}
                    onClick={e => { e.stopPropagation(); if (confirm('¿Cancelar esta devolución?')) cancelar.mutate(dev.id); }}>
                    Cancelar
                  </button>
                )}
                {dev.compensaEnSiguientePedido && (
                  <span style={{ fontSize: '0.75rem', background: '#FAF5FF', color: '#7E22CE', padding: '0.3rem 0.6rem', borderRadius: '0.25rem', border: '1px solid #E9D5FF', fontWeight: 600 }}>Compensa próx. pedido</span>
                )}
                {dev.stockRestaurado && (
                  <span style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 3, color: '#15803D', fontWeight: 600 }}>
                    <CheckCircle size={13} /> Stock restaurado
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                {/* Productos devueltos */}
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Productos devueltos</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {dev.detalles.map(d => (
                      <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Package size={12} color="#9CA3AF" /> {d.producto.nombre}
                        </span>
                        <span style={{ color: '#6B7280' }}>{d.cantidadDevuelta} u. = <strong>{formatPesos(Number(d.subtotal))}</strong></span>
                      </div>
                    ))}
                    {dev.devuelveFlete && dev.montoFlete && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#1D4ED8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Truck size={12} /> Flete</span>
                        <strong>{formatPesos(Number(dev.montoFlete))}</strong>
                      </div>
                    )}
                  </div>
                  {dev.cuentaDestino && (
                    <p style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <DollarSign size={11} /> Cuenta: <strong>{dev.cuentaDestino}</strong>
                    </p>
                  )}
                  {dev.observaciones && (
                    <p style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic', marginTop: 4 }}>"{dev.observaciones}"</p>
                  )}
                </div>

                {/* Venta original */}
                <div style={{ background: '#F9FAFB', borderRadius: '0.375rem', padding: '0.75rem', border: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Venta #{dev.ventaId}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.375rem' }}>
                    <span style={{ fontSize: '0.7rem', background: '#EFF6FF', color: '#1D4ED8', padding: '0.15rem 0.4rem', borderRadius: '0.2rem', fontWeight: 500 }}>
                      📅 {dev.venta?.fechaVenta ? formatFecha(dev.venta.fechaVenta) : '—'}
                    </span>
                    <span style={{ fontSize: '0.7rem', background: dev.venta?.incluyeFlete ? '#EFF6FF' : '#F3F4F6', color: dev.venta?.incluyeFlete ? '#1D4ED8' : '#9CA3AF', padding: '0.15rem 0.4rem', borderRadius: '0.2rem', fontWeight: 500 }}>
                      🚛 {dev.venta?.incluyeFlete ? `Flete: ${formatPesos(Number(dev.venta.costoFlete ?? 0))}` : 'Sin flete'}
                    </span>
                    <span style={{ fontSize: '0.7rem', background: dev.venta?.requiereSenasa ? '#F0FDF4' : '#F3F4F6', color: dev.venta?.requiereSenasa ? '#15803D' : '#9CA3AF', padding: '0.15rem 0.4rem', borderRadius: '0.2rem', fontWeight: 500 }}>
                      🌿 SENASA: {dev.venta?.requiereSenasa ? 'Sí' : 'No'}
                    </span>
                  </div>
                  {dev.venta?.detalles?.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.77rem', color: '#6B7280' }}>
                      <span>{d.producto?.nombre}</span>
                      <span>{d.cantidadEntregada || d.cantidadPedida} u. × {formatPesos(Number(d.precioUnitario))}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #E5E7EB', marginTop: '0.375rem', paddingTop: '0.375rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#6B7280' }}>Total venta:</span>
                    <strong>{formatPesos(Number(dev.venta?.totalConIva ?? 0))}</strong>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
export default function DevolucionesPage() {
  const { data: devoluciones, isLoading, isError } = useDevoluciones();
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const COLORS = ['#6B3A2A', '#7c4b2c', '#C4895A', '#9B5535', '#E8C9A0'];

  // ── Chart data ────────────────────────────────────────────────────────
  const { dataProductos, dataCasos, dataVentasVsDevol } = useMemo(() => {
    const todas = devoluciones ?? [];
    const activas = todas.filter(d => d.estado !== 'cancelada');

    // Gráfico 1: Pallets más devueltos (top productos por cantidad)
    const prodMap: Record<string, number> = {};
    activas.forEach(d => {
      d.detalles.forEach(det => {
        const key = det.producto.nombre;
        prodMap[key] = (prodMap[key] ?? 0) + det.cantidadDevuelta;
      });
    });
    const dataProductos = Object.entries(prodMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    // Gráfico 2: Distribución por tipo de caso (donut)
    const casoMap: Record<string, number> = {};
    activas.forEach(d => {
      const label = CASO_CONFIG[d.tipoCaso]?.label ?? d.tipoCaso;
      casoMap[label] = (casoMap[label] ?? 0) + 1;
    });
    const dataCasos = Object.entries(casoMap).map(([name, value]) => ({ name, value }));

    // Gráfico 3: Monto ventas vs monto devoluciones por mes (últimos 6 meses)
    const mesMap: Record<string, { ventas: number; devol: number }> = {};
    activas.forEach(d => {
      const dt = new Date(d.fechaSolicitud);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!mesMap[key]) mesMap[key] = { ventas: 0, devol: 0 };
      mesMap[key].devol += Number(d.montoTotal);
      mesMap[key].ventas += Number(d.venta?.totalConIva ?? 0);
    });
    const dataVentasVsDevol = Object.entries(mesMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => {
        const [yr, mo] = key.split('-');
        const label = new Date(parseInt(yr), parseInt(mo) - 1)
          .toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        return { name: label, Ventas: Math.round(v.ventas), Reintegros: Math.round(v.devol) };
      });

    return { dataProductos, dataCasos, dataVentasVsDevol };
  }, [devoluciones]);

  if (isLoading) return <LoadingSpinner text="Cargando devoluciones..." />;
  if (isError) return <ErrorMessage message="No se pudieron cargar las devoluciones." />;

  const todas = devoluciones ?? [];

  const filtradas = todas.filter(d => {
    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado;
    const matchBusqueda =
      !busqueda ||
      d.cliente.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(d.ventaId).includes(busqueda) ||
      String(d.id).includes(busqueda);
    return matchEstado && matchBusqueda;
  });

  const pendientesDeposito = todas.filter(d => d.estado === 'esperando_confirmacion_deposito').length;
  const procesadas = todas.filter(d => d.estado === 'procesada').length;
  const totalReintegrado = todas.filter(d => d.estado === 'procesada').reduce((a, d) => a + Number(d.montoTotal), 0);
  const totalDevoluciones = todas.filter(d => d.estado !== 'cancelada').length;

  // ── 4 filter cards config ─────────────────────────────────────────────
  const FILTER_CARDS = [
    { key: 'todos',                           label: 'Total',         count: totalDevoluciones,  icon: RotateCcw,    iconBg: '#F3EDE8', iconColor: '#7c4b2c' },
    { key: 'esperando_confirmacion_deposito', label: 'Esp. depósito', count: pendientesDeposito, icon: Clock,        iconBg: '#FFFBEB', iconColor: '#D97706' },
    { key: 'procesada',                       label: 'Procesadas',    count: procesadas,          icon: CheckCircle,  iconBg: '#F0FDF4', iconColor: '#15803D' },
    { key: 'cancelada',                       label: 'Canceladas',    count: todas.filter(d => d.estado === 'cancelada').length, icon: Ban, iconBg: '#F3F4F6', iconColor: '#9CA3AF' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Devoluciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {todas.length} devolución{todas.length !== 1 ? 'es' : ''} registrada{todas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-brand">
          <Plus size={16} /> Nueva devolución
        </button>
      </div>

      {/* ── Filter KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {FILTER_CARDS.map(fc => {
          const Icon = fc.icon;
          const active = filtroEstado === fc.key;
          return (
            <div
              key={fc.key}
              className="card-kpi"
              style={{ cursor: 'pointer', outline: active ? '2px solid #C4895A' : undefined, outlineOffset: active ? '-2px' : undefined }}
              onClick={() => setFiltroEstado(fc.key)}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                  style={{ background: fc.iconBg }}>
                  <Icon size={15} style={{ color: fc.iconColor }} />
                </div>
                <p className="titulo-card flex-1">{fc.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{fc.count}</p>
              {fc.key === 'todos' && (
                <p className="text-xs mt-1" style={{ color: '#7c4b2c', fontWeight: 600 }}>
                  {formatPesos(totalReintegrado)} reintegrado
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Alerta depósito ── */}
      {pendientesDeposito > 0 && (
        <div className="card-base" style={{ borderLeft: '4px solid #F59E0B', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              {pendientesDeposito} devolución{pendientesDeposito > 1 ? 'es' : ''} esperando confirmación del depósito
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
              Confirmá la recepción de la mercadería en depósito para procesar el reintegro.
            </p>
          </div>
        </div>
      )}

      {/* ── Gráficos ── */}
      {todas.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfico 1: Productos más devueltos */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-3">Pallets más devueltos</p>
            {dataProductos.length > 0 ? (
              <ResponsiveContainer width="100%" height={dataProductos.length * 28 + 20}>
                <BarChart data={dataProductos} layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90}
                    tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    formatter={(v: number) => [v + ' u.', 'Devueltos']} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={14}>
                    {dataProductos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 m-auto text-center">Sin datos</p>
            )}
          </div>

          {/* Gráfico 2: Tipo de caso (donut) */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-3">Por tipo de devolución</p>
            {dataCasos.length > 0 ? (
              <div className="flex-1 flex items-center gap-4">
                <div style={{ width: 120, height: 120, flexShrink: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataCasos} dataKey="value" cx="50%" cy="50%"
                        innerRadius={34} outerRadius={52} paddingAngle={3} strokeWidth={0}>
                        {dataCasos.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                        formatter={(v: number) => [v + ' devolución' + (v !== 1 ? 'es' : ''), '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <p style={{ fontSize: '0.65rem', color: '#9CA3AF', lineHeight: 1.2 }}>Total</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>
                      {dataCasos.reduce((a, d) => a + d.value, 0)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  {dataCasos.map((d, i) => {
                    const total = dataCasos.reduce((a, x) => a + x.value, 0);
                    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: '#6B7280' }}>{d.value}</p>
                        </div>
                        <div style={{ height: 5, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 m-auto text-center">Sin datos</p>
            )}
          </div>

          {/* Gráfico 3: Monto ventas vs reintegros por mes */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-2">Ventas vs reintegros por mes</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#7c4b2c', display: 'inline-block' }} />Ventas
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#C4895A', display: 'inline-block' }} />Reintegros
              </span>
            </div>
            {dataVentasVsDevol.length > 0 ? (
              <ResponsiveContainer width="100%" height={172}>
                <AreaChart data={dataVentasVsDevol} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c4b2c" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#7c4b2c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDevol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4895A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#C4895A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => '$' + (v >= 1000 ? Math.round(v / 1000) + 'k' : v)} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    formatter={(v: number) => [formatPesos(v), '']} />
                  <Area type="monotone" dataKey="Ventas"     stroke="#7c4b2c" strokeWidth={2} fill="url(#gVentas)" dot={{ r: 3, fill: '#7c4b2c' }} />
                  <Area type="monotone" dataKey="Reintegros" stroke="#C4895A" strokeWidth={2} fill="url(#gDevol)"  dot={{ r: 3, fill: '#C4895A' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 m-auto text-center">Sin datos</p>
            )}
          </div>

        </div>
      )}

      {/* ── Buscador standalone ── */}
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          className="input"
          style={{ paddingLeft: '2.25rem', width: '100%', background: '#fff' }}
          placeholder="Buscar por cliente, N° venta o N° devolución..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* ── Tabla ── */}
      {filtradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><RotateCcw size={24} /></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {busqueda || filtroEstado !== 'todos' ? 'Sin resultados' : 'Sin devoluciones registradas'}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
            Las devoluciones son situaciones excepcionales en WoodPallet
          </p>
          {!busqueda && filtroEstado === 'todos' && (
            <button onClick={() => setShowModal(true)} className="btn-brand" style={{ marginTop: '1rem' }}>
              <Plus size={15} /> Registrar primera devolución
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Productos</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtradas.map(dev => <DevolucionRow key={dev.id} dev={dev} />)}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <NuevaDevolucionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}

