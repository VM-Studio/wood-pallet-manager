import { useState } from 'react';
import {
  RotateCcw, Plus, Search, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle,
  Truck, Leaf, Package, DollarSign, X
} from 'lucide-react';
import {
  useDevoluciones,
  useCrearDevolucion,
  useConfirmarDeposito,
  useCancelarDevolucion,
  type Devolucion,
  type CrearDevolucionPayload,
} from '../../hooks/useDevoluciones';
import { useVentas } from '../../hooks/useVentas';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

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
      <div className="modal" style={{ maxWidth: '600px' }}>
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

            <div>
              <label className="label">Venta asociada *</label>
              <select className="select" value={ventaId} onChange={e => handleSelectVenta(Number(e.target.value))} required>
                <option value="">— Seleccioná una venta —</option>
                {ventas.filter(v => v.estadoPedido !== 'cancelado').map(v => (
                  <option key={v.id} value={v.id}>
                    #{v.id} — {v.cliente?.razonSocial} — {formatPesos(Number(v.totalConIva ?? 0))}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Tipo de devolución *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {Object.entries(CASO_CONFIG).map(([key, val]) => {
                  const s = CASO_STYLE[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTipoCaso(key as CrearDevolucionPayload['tipoCaso'])}
                      style={{
                        padding: '0.625rem 0.75rem', borderRadius: '0.25rem', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                        border: tipoCaso === key ? '2px solid #6B3A2A' : '2px solid #E5E7EB',
                        background: tipoCaso === key ? '#FDF5F0' : '#fff',
                      }}
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
                <strong>Requiere confirmación del depósito:</strong> El reintegro se procesa recién cuando Brian / Todo Pallets confirma la recepción.
              </div>
            )}
            {tipoCaso === 'cancelacion_anticipada' && (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#1E40AF' }}>
                <strong>Cancelación anticipada:</strong> Si el flete aún no fue ejecutado marcá "Devolver flete". Si ya fue, solo se devuelven pallets.
              </div>
            )}
            {tipoCaso === 'pallet_danado' && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#9A3412' }}>
                <strong>Pallets dañados:</strong> WoodPallet asume responsabilidad. Si el cliente seguirá comprando, podés compensar en el siguiente pedido.
              </div>
            )}

            {detalles.length > 0 && (
              <div>
                <label className="label">Cantidad a devolver por producto *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {detalles.map((d, i) => (
                    <div key={d.productoId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F9FAFB', borderRadius: '0.25rem', padding: '0.625rem 0.75rem' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', margin: 0 }}>{d.nombre}</p>
                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>{formatPesos(d.precioUnitario)} / u · máx {d.cantidadDisponible} u.</p>
                      </div>
                      <input
                        type="number" min={0} max={d.cantidadDisponible}
                        className="input" style={{ width: '5rem', textAlign: 'center' }}
                        value={d.cantidadDevuelta || ''}
                        placeholder="0"
                        onChange={e => setDetalles(prev => prev.map((x, j) =>
                          j === i ? { ...x, cantidadDevuelta: Math.max(0, Math.min(d.cantidadDisponible, parseInt(e.target.value) || 0)) } : x
                        ))}
                      />
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

  const estado = ESTADO_CONFIG[dev.estado] ?? { label: dev.estado, badgeClass: 'badge-gray' };
  const caso = CASO_CONFIG[dev.tipoCaso] ?? { label: dev.tipoCaso, desc: '' };
  const casoStyle = CASO_STYLE[dev.tipoCaso] ?? { bg: '#F3F4F6', color: '#4B5563' };

  return (
    <div className="card-base">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }} onClick={() => setExpanded(p => !p)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#9CA3AF' }}>#{dev.id}</span>
            <span className={estado.badgeClass} style={{ borderRadius: '0.25rem' }}>{estado.label}</span>
            <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem', fontWeight: 600, background: casoStyle.bg, color: casoStyle.color }}>{caso.label}</span>
            {dev.compensaEnSiguientePedido && (
              <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem', fontWeight: 600, background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>Compensa próx. pedido</span>
            )}
            {dev.stockRestaurado && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 500, color: '#15803D' }}>
                <CheckCircle size={12} /> Stock restaurado
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>{dev.cliente.razonSocial}</p>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>
            Venta #{dev.ventaId} · {formatFecha(dev.fechaSolicitud)}
            {dev.metodoPago && ` · ${dev.metodoPago}`}
          </p>
          {dev.observaciones && (
            <p style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic', marginTop: 2 }}>"{dev.observaciones}"</p>
          )}
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{formatPesos(Number(dev.montoTotal))}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', marginTop: 4 }}>
            {dev.devuelveFlete && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: '#1D4ED8' }}><Truck size={11} />Flete</span>}
            {dev.devuelveSenasa && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: '#15803D' }}><Leaf size={11} />SENASA</span>}
            {expanded ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
        {dev.estado === 'esperando_confirmacion_deposito' && (
          <button className="btn-brand-sm" disabled={confirmar.isPending} onClick={e => { e.stopPropagation(); confirmar.mutate(dev.id); }}>
            <CheckCircle size={13} />
            {confirmar.isPending ? 'Confirmando...' : 'Confirmar recepción en depósito'}
          </button>
        )}
        {(dev.estado === 'pendiente' || dev.estado === 'esperando_confirmacion_deposito') && (
          <button
            className="btn-secondary"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', color: '#DC2626', borderColor: '#FECACA' }}
            disabled={cancelar.isPending}
            onClick={e => { e.stopPropagation(); if (confirm('¿Cancelar esta devolución?')) cancelar.mutate(dev.id); }}
          >
            Cancelar
          </button>
        )}
      </div>

      {expanded && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Productos devueltos</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {dev.detalles.map(d => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#374151' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Package size={13} color="#9CA3AF" /> {d.producto.nombre}
                </span>
                <span style={{ color: '#6B7280' }}>
                  {d.cantidadDevuelta} u. × {formatPesos(Number(d.precioUnitario))} = <strong>{formatPesos(Number(d.subtotal))}</strong>
                </span>
              </div>
            ))}
            {dev.devuelveFlete && dev.montoFlete && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#1D4ED8' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Truck size={13} /> Flete</span>
                <strong>{formatPesos(Number(dev.montoFlete))}</strong>
              </div>
            )}
          </div>
          {dev.cuentaDestino && (
            <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>
              <DollarSign size={12} /> Cuenta destino: <strong>{dev.cuentaDestino}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DevolucionesPage() {
  const { data: devoluciones, isLoading, isError } = useDevoluciones();
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

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

  const FILTROS = [
    { key: 'todos',                           label: 'Todos' },
    { key: 'esperando_confirmacion_deposito', label: 'Esp. depósito' },
    { key: 'confirmada',                      label: 'Confirmadas' },
    { key: 'procesada',                       label: 'Procesadas' },
    { key: 'cancelada',                       label: 'Canceladas' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
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

      <div className="grid grid-cols-3 gap-4">
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#FEF3E2', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{pendientesDeposito}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Esperando depósito</p>
          </div>
        </div>
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{procesadas}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Procesadas</p>
          </div>
        </div>
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{formatPesos(totalReintegrado)}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Total reintegrado</p>
          </div>
        </div>
      </div>

      {pendientesDeposito > 0 && (
        <div className="card-base" style={{ borderLeft: '4px solid #F59E0B', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              {pendientesDeposito} devolución{pendientesDeposito > 1 ? 'es' : ''} esperando confirmación del depósito
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
              Confirmá la recepción de la mercadería en depósito (Brian / Todo Pallets) para procesar el reintegro.
            </p>
          </div>
        </div>
      )}

      <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar por cliente, N° venta o N° devolución..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              style={{
                padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
                borderRadius: '0.25rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: filtroEstado === f.key ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#F3F4F6',
                color: filtroEstado === f.key ? '#fff' : '#4B5563',
              }}
            >
              {f.label}
              {f.key !== 'todos' && (
                <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>({todas.filter(d => d.estado === f.key).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {filtradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><RotateCcw size={24} /></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {busqueda || filtroEstado !== 'todos' ? 'Sin resultados con los filtros aplicados' : 'Sin devoluciones registradas'}
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
        <div className="space-y-3">
          {filtradas.map(dev => <DevolucionRow key={dev.id} dev={dev} />)}
        </div>
      )}

      {showModal && <NuevaDevolucionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
