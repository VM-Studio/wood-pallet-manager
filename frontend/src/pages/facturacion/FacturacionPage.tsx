import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, DollarSign, AlertTriangle, Clock, CheckCircle, Receipt, X, Plus, Eye, MessageSquare } from 'lucide-react';
import { useFacturas, useFacturasVencidas, useCobrosPendientes, useActualizarNroFactura, useCargarNroArca, useFactura, useActualizarObservaciones } from '../../hooks/useFacturacion';
import type { Factura } from '../../types';
import RegistrarCobro from './RegistrarCobro';
import NuevaFactura from './NuevaFactura';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Pagination from '../../components/ui/Pagination';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const POR_PAGINA = 10;

interface FacturaVencida extends Factura {
  saldoPendiente: number;
  diasVencida: number;
  urgencia: 'alta' | 'media' | 'baja';
}

interface CobroData {
  facturaId: number;
  clienteNombre: string;
  totalFactura: number;
  totalCobrado: number;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

// ── Modal: Detalle de facturación ────────────────────────────────────
function DetalleFacturaModal({ facturaId, onClose }: { facturaId: number; onClose: () => void }) {
  const { data: factura, isLoading } = useFactura(facturaId);

  const fmtFecha = (s?: string) => {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const labelMedio = (m: string) =>
    m === 'transferencia' ? 'Transferencia' : m === 'e_check' ? 'E-check' : 'Efectivo';

  const totalCobrado = factura?.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0;
  const saldo = factura ? Number(factura.totalConIva) - totalCobrado : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal animate-slide-up"
        style={{ maxWidth: '580px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: 0, border: '1px solid #E5E7EB' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0, padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
          <div>
            <h2 className="titulo-modulo" style={{ fontSize: '1.4rem' }}>Detalle de facturación</h2>
            {factura && (
              <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '2px 0 0' }}>
                {factura.cliente?.razonSocial}
                {factura.cliente?.cuit ? ` · CUIT ${factura.cliente.cuit}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
        </div>

        {/* Body */}
        <div className="modal-body space-y-5" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
          {isLoading ? (
            <div className="py-8 flex justify-center"><LoadingSpinner /></div>
          ) : factura && (
            <>
              {/* Resumen financiero */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'TOTAL FACTURA', val: Number(factura.totalConIva), bg: '#F9FAFB', border: '#E5E7EB', color: '#111827', sub: '#9CA3AF' },
                  { label: 'COBRADO', val: totalCobrado, bg: '#F0FDF4', border: '#BBF7D0', color: '#15803D', sub: '#15803D' },
                  { label: 'SALDO PENDIENTE', val: saldo, bg: saldo > 0 ? '#FFFBEB' : '#F9FAFB', border: saldo > 0 ? '#FDE68A' : '#E5E7EB', color: saldo > 0 ? '#92400E' : '#6B7280', sub: saldo > 0 ? '#92400E' : '#9CA3AF' },
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 0, padding: '0.75rem' }}>
                    <p style={{ fontSize: '0.62rem', fontWeight: 700, color: c.sub, marginBottom: 4, letterSpacing: '0.04em' }}>{c.label}</p>
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: c.color, margin: 0 }}>{formatPesos(c.val)}</p>
                  </div>
                ))}
              </div>

              {/* N° de Orden del cliente */}
              {factura.venta?.nroOrden && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', background: '#EFF6FF', color: '#1D4ED8', borderRadius: 0, border: '1px solid #BFDBFE', letterSpacing: '0.03em' }}>N° ORDEN</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1D4ED8' }}>{factura.venta.nroOrden}</span>
                </div>
              )}

              {/* Historial de cobros */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Historial de cobros</p>
                {factura.pagos && factura.pagos.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {factura.pagos.map(p => (
                      <div key={p.id} style={{ border: '1px solid #E5E7EB', borderRadius: 0, padding: '0.625rem 0.875rem', background: '#F9FAFB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#15803D', margin: 0 }}>{formatPesos(Number(p.monto))}</p>
                              {p.esAdelanto && (
                                <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', background: '#FEF9C3', color: '#854D0E', borderRadius: 0, border: '1px solid #FDE047' }}>ADELANTO</span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: '3px 0 0' }}>
                              {labelMedio(p.medioPago)} · {fmtFecha(p.fechaPago)}
                              {p.nroComprobante ? ` · Comp. ${p.nroComprobante}` : ''}
                            </p>
                            {p.registradoPor && (
                              <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                                Registrado por {p.registradoPor.nombre} {p.registradoPor.apellido}
                              </p>
                            )}
                            {p.observaciones && (
                              <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: '4px 0 0', fontStyle: 'italic' }}>"{p.observaciones}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '1rem', background: '#F9FAFB', borderRadius: 0, border: '1px solid #E5E7EB', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: 0 }}>Sin cobros registrados aún</p>
                  </div>
                )}
              </div>

              {/* Detalle de la venta */}
              {factura.venta?.detalles && factura.venta.detalles.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Detalle de la venta</p>
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 0, overflow: 'hidden' }}>
                    {factura.venta.detalles.map((d, i) => (
                      <div key={d.id} style={{
                        padding: '0.5rem 0.875rem',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: i % 2 === 0 ? '#fff' : '#F9FAFB',
                      }}>
                        <div>
                          <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827', margin: 0 }}>{d.producto?.nombre ?? '—'}</p>
                          <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '1px 0 0' }}>
                            {d.cantidadPedida} u. × {formatPesos(d.precioUnitario)}
                          </p>
                        </div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: 0 }}>{formatPesos(d.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observaciones de facturación */}
              {factura.observaciones && (
                <div style={{ padding: '0.75rem 0.875rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 0 }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones de facturación</p>
                  <p style={{ fontSize: '0.82rem', color: '#78350F', margin: 0 }}>{factura.observaciones}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ flexShrink: 0 }}>
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

export default function FacturacionPage() {
  const { data: facturas, isLoading, isError } = useFacturas() as {
    data: Factura[] | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  const { data: vencidas } = useFacturasVencidas() as { data: FacturaVencida[] | undefined };
  const { data: pendientes } = useCobrosPendientes() as { data: Factura[] | undefined };

  const [busqueda, setBusqueda] = useState('');
  const [searchParams] = useSearchParams();
  const [filtroEstado, setFiltroEstado] = useState(() =>
    searchParams.get('cobro') === 'true' ? 'pendiente' : 'todos'
  );
  const [pagina, setPagina] = useState(1);
  const [cobroData, setCobroData] = useState<CobroData | null>(null);
  const [nroFacturaModal, setNroFacturaModal] = useState<{ id: number; clienteNombre: string } | null>(null);
  const [nroFacturaInput, setNroFacturaInput] = useState('');
  const [showNuevaFactura, setShowNuevaFactura] = useState(false);
  const actualizarNro = useActualizarNroFactura();
  const cargarArca = useCargarNroArca();
  const [arcaModal, setArcaModal] = useState<{ id: number; clienteNombre: string } | null>(null);
  const [arcaInput, setArcaInput] = useState('');
  const [detalleFacturaId, setDetalleFacturaId] = useState<number | null>(null);
  const [obsModal, setObsModal] = useState<{ id: number; clienteNombre: string } | null>(null);
  const [obsInput, setObsInput] = useState('');
  const actualizarObs = useActualizarObservaciones();

  const filtradas = facturas?.filter(f => {
    const matchBusqueda =
      f.cliente?.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      f.nroFactura?.includes(busqueda) ||
      `#${f.id}`.includes(busqueda);
    const matchEstado = filtroEstado === 'todos' || f.estadoCobro === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const facturasPaginadas = filtradas?.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [busqueda, filtroEstado]);

  const totalPendiente = pendientes?.reduce((acc, f) => {
    const cobrado = f.pagos?.reduce((a, p) => a + Number(p.monto), 0) ?? 0;
    return acc + (Number(f.totalConIva) - cobrado);
  }, 0) ?? 0;

  const totalVencidas = vencidas?.reduce((acc, f) => acc + (f.saldoPendiente ?? 0), 0) ?? 0;

  // ── Gráfico 1: Con factura vs Sin factura ─────────────────────────
  const dataConSinFactura = useMemo(() => {
    if (!facturas?.length) return [];
    const conFactura  = facturas.filter(f => !f.esSinFactura).length;
    const sinFactura  = facturas.filter(f =>  f.esSinFactura).length;
    return [
      { name: 'Con factura',  value: conFactura },
      { name: 'Sin factura',  value: sinFactura },
    ];
  }, [facturas]);

  // ── Gráfico 2: Modalidad de pago ──────────────────────────────────
  const dataModalidad = useMemo(() => {
    if (!facturas?.length) return [];
    const mapa: Record<string, number> = {};
    facturas.forEach(f => {
      const key = f.modalidadPago ?? 'sin_especificar';
      mapa[key] = (mapa[key] || 0) + 1;
    });
    const labels: Record<string, string> = {
      adelantado:      'Adelantado',
      contra_entrega:  'Contra entrega',
      por_partes:      'Por partes',
      sin_especificar: 'Sin especificar',
    };
    return Object.entries(mapa)
      .map(([key, value]) => ({ name: labels[key] ?? key, value }))
      .sort((a, b) => b.value - a.value);
  }, [facturas]);

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Cargando facturas..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorMessage message="No se pudieron cargar las facturas." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="titulo-modulo">Facturación y Cobranzas</h1>
          <p className="text-sm text-gray-500 mt-1">{facturas?.length ?? 0} facturas registradas</p>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => setShowNuevaFactura(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white"
            style={{ background: '#7c4b2c', borderRadius: '0.375rem' }}
          >
            <Plus size={14} /> Agregar facturación
          </button>
        </div>
      </div>

      {/* KPIs — también funcionan como filtro */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className="card-kpi cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => setFiltroEstado(filtroEstado === 'pendiente' ? 'todos' : 'pendiente')}
          style={filtroEstado === 'pendiente' ? { outline: '2px solid #C4895A', outlineOffset: '-2px' } : {}}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <Clock size={16} />
            </div>
            <p className="titulo-card flex-1">Cobros pendientes</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{formatPesos(totalPendiente)}</p>
          <p className="text-xs text-gray-400 mt-1">{pendientes?.length ?? 0} factura{(pendientes?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>

        <div
          className="card-kpi cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => setFiltroEstado(filtroEstado === 'vencida' ? 'todos' : 'vencida')}
          style={filtroEstado === 'vencida' ? { outline: '2px solid #C4895A', outlineOffset: '-2px' } : {}}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <AlertTriangle size={16} />
            </div>
            <p className="titulo-card flex-1">Facturas vencidas</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{vencidas?.length ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">{totalVencidas > 0 ? formatPesos(totalVencidas) : 'sin deuda vencida'}</p>
        </div>

        <div
          className="card-kpi cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => setFiltroEstado(filtroEstado === 'cobrada_total' ? 'todos' : 'cobrada_total')}
          style={filtroEstado === 'cobrada_total' ? { outline: '2px solid #C4895A', outlineOffset: '-2px' } : {}}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <CheckCircle size={16} />
            </div>
            <p className="titulo-card flex-1">Cobradas</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
            {facturas?.filter(f => f.estadoCobro === 'cobrada_total').length ?? 0}
          </p>
          <p className="text-xs text-gray-400 mt-1">cobro total confirmado</p>
        </div>

        <div
          className="card-kpi cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => setFiltroEstado('todos')}
          style={filtroEstado === 'todos' ? { outline: '2px solid #C4895A', outlineOffset: '-2px' } : {}}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <Receipt size={16} />
            </div>
            <p className="titulo-card flex-1">Total emitido</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
            {formatPesos(facturas?.reduce((acc, f) => acc + Number(f.totalConIva), 0) ?? 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">todas las facturas</p>
        </div>
      </div>

      {/* Gráficos */}
      {facturas && facturas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Gráfico 1 — Donut: Con factura vs Sin factura */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
            <p className="titulo-card mb-3">Ventas con factura vs sin factura</p>
            <div className="flex-1 flex items-center gap-4">
              <div style={{ width: 120, height: 120, flexShrink: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataConSinFactura}
                      dataKey="value"
                      cx="50%" cy="50%"
                      innerRadius={34} outerRadius={52}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      <Cell fill="#6B3A2A" />
                      <Cell fill="#E8D5C4" />
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${v} factura${v !== 1 ? 's' : ''}`, '']}
                      contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <p style={{ fontSize: '0.65rem', color: '#9CA3AF', lineHeight: 1.2 }}>Total</p>
                  <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>{facturas.length}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                {dataConSinFactura.map((d, i) => {
                  const pct = facturas.length > 0 ? Math.round((d.value / facturas.length) * 100) : 0;
                  const colors = ['#6B3A2A', '#E8D5C4'];
                  return (
                    <div key={d.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i], flexShrink: 0 }} />
                          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#6B7280' }}>{d.value}</p>
                      </div>
                      <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: colors[i], borderRadius: 4, transition: 'width 0.6s ease' }} />
                      </div>
                      <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfico 2 — Barras: Modalidad de pago */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
            <p className="titulo-card mb-3">Modalidad de pago</p>
            <div className="flex-1" style={{ minHeight: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataModalidad} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#374151' }}
                    axisLine={false}
                    tickLine={false}
                    width={90}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} factura${v !== 1 ? 's' : ''}`, 'Cantidad']}
                    contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA', background: '#fff' }}
                    cursor={{ fill: '#F9FAFB' }}
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {dataModalidad.map((_, i) => (
                      <Cell key={i} fill={['#6B3A2A', '#C4895A', '#E8D5C4', '#D1C4B8'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Panel de alertas vencidas */}
      {vencidas && vencidas.length > 0 && (
        <div className="card-base" style={{ borderLeft: '4px solid #EF4444' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-semibold text-red-700">
              {vencidas.length} factura{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''} — requieren atención urgente
            </p>
          </div>
          <div className="space-y-2">
            {vencidas.slice(0, 3).map(f => (
              <div key={f.id}
                className="flex items-center justify-between p-3 bg-red-50 border border-red-100"
                style={{ borderRadius: '0.25rem' }}>
                <div>
                  <p className="text-sm font-semibold text-red-800">{f.cliente?.razonSocial}</p>
                  <p className="text-xs text-red-500">
                    Vencida hace {f.diasVencida} días
                    {f.nroFactura && ` · ${f.nroFactura}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-700">{formatPesos(f.saldoPendiente)}</p>
                    <span className={`text-xs font-semibold ${f.urgencia === 'alta' ? 'text-red-600' : 'text-amber-600'}`}>
                      {f.urgencia}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const totalCobrado = Number(f.totalConIva) - f.saldoPendiente;
                      setCobroData({
                        facturaId: f.id,
                        clienteNombre: f.cliente?.razonSocial ?? '',
                        totalFactura: Number(f.totalConIva),
                        totalCobrado
                      });
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white"
                    style={{ background: '#B91C1C', borderRadius: '0.25rem' }}
                  >
                    <DollarSign size={13} /> Cobrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por cliente, N° factura..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="input-field pl-10" />
      </div>

      {/* Tabla */}
      {!filtradas?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Receipt size={24} style={{ color: '#6B3A2A' }} />
          </div>
          <p className="titulo-card" style={{ color: '#6B3A2A' }}>Sin facturas</p>
          <p className="text-xs text-gray-400 mt-1">Registrá la primera factura con el botón de arriba</p>
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Comprobante</th>
                <th>Total</th>
                <th>Método de pago</th>
                <th>Modalidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturasPaginadas!.map(f => {
                const totalCobrado = f.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0;
                const saldo = Number(f.totalConIva) - totalCobrado;
                const hoy = new Date();
                const vencida = !!f.fechaVencimiento
                  && new Date(f.fechaVencimiento) < hoy
                  && f.estadoCobro !== 'cobrada_total';

                return (
                  <tr key={f.id} style={vencida ? { background: 'rgba(254,242,242,0.5)' } : {}}>
                    <td className="font-semibold text-gray-400 text-xs">#{f.id}</td>
                    <td>
                      <p className="font-semibold text-gray-900 text-sm">{f.cliente?.razonSocial}</p>
                      {f.cliente?.cuit && (
                        <p className="text-xs text-gray-400">{f.cliente.cuit}</p>
                      )}
                    </td>
                    <td>
                      {f.esSinFactura ? (
                        <span className="badge-yellow">SN</span>
                      ) : (
                        <div>
                          <span className="badge-blue">Factura A</span>
                          {f.nroFactura && (
                            <p className="text-xs text-gray-400 mt-0.5">{f.nroFactura}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <p className="font-semibold text-gray-900 text-sm">
                        {formatPesos(Number(f.totalConIva))}
                      </p>
                      {saldo > 0 && saldo < Number(f.totalConIva) && (
                        <p className="text-xs text-amber-600">Saldo: {formatPesos(saldo)}</p>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const medio = f.medioPago ?? f.pagos?.[0]?.medioPago;
                        const labelMedio = medio === 'transferencia' ? 'Transferencia'
                          : medio === 'e_check' ? 'E-check'
                          : medio === 'efectivo' ? 'Efectivo'
                          : null;
                        if (!labelMedio) return <span className="text-gray-400 text-sm">—</span>;
                        return <p className="text-sm font-medium text-gray-800">{labelMedio}</p>;
                      })()}
                    </td>
                    <td>
                      {(() => {
                        const labelModalidad = f.modalidadPago === 'adelantado' ? 'Adelantado'
                          : f.modalidadPago === 'contra_entrega' ? 'Contra entrega'
                          : f.modalidadPago === 'por_partes' ? 'Por partes'
                          : null;
                        if (!labelModalidad) return <span className="text-gray-400 text-sm">—</span>;
                        const color = f.modalidadPago === 'adelantado'
                          ? { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' }
                          : f.modalidadPago === 'por_partes'
                          ? { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' }
                          : { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
                        return (
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 600,
                            padding: '0.2rem 0.6rem', borderRadius: '999px',
                            background: color.bg, color: color.text,
                            border: `1px solid ${color.border}`,
                          }}>
                            {labelModalidad}
                          </span>
                        );
                      })()}
                    </td>
                    <td><EstadoBadge estado={f.estadoCobro} /></td>
                    <td>
                      <div className="flex flex-col gap-1.5">
                        {/* Registrar cobro */}
                        {f.estadoCobro !== 'cobrada_total' && (
                          <button
                            onClick={() => setCobroData({
                              facturaId: f.id,
                              clienteNombre: f.cliente?.razonSocial ?? '',
                              totalFactura: Number(f.totalConIva),
                              totalCobrado
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white"
                            style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)', borderRadius: '0.25rem' }}
                          >
                            <CheckCircle size={13} />
                            {f.estadoCobro === 'cobrada_parcial' ? `Cobrar saldo (${formatPesos(saldo)})` : 'Registrar cobro'}
                          </button>
                        )}

                        {/* Detalle */}
                        <button
                          onClick={() => setDetalleFacturaId(f.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                          style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: '0.25rem', border: '1px solid #BFDBFE' }}
                        >
                          <Eye size={12} /> Detalle
                        </button>

                        {/* Observaciones */}
                        <button
                          onClick={() => {
                            setObsModal({ id: f.id, clienteNombre: f.cliente?.razonSocial ?? '' });
                            setObsInput(f.observaciones ?? '');
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                          style={{
                            background: f.observaciones ? '#FFFBEB' : '#F9FAFB',
                            color: f.observaciones ? '#92400E' : '#6B7280',
                            borderRadius: '0.25rem',
                            border: `1px solid ${f.observaciones ? '#FDE68A' : '#E5E7EB'}`,
                          }}
                        >
                          <MessageSquare size={12} />
                          {f.observaciones ? 'Ver obs.' : 'Observaciones'}
                        </button>

                        {/* Botón cargar N° ARCA oficial */}
                        {!f.esSinFactura && (
                          <button
                            onClick={() => {
                              setArcaModal({ id: f.id, clienteNombre: f.cliente?.razonSocial ?? '' });
                              setArcaInput('');
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
                            style={{ background: '#F0FDF4', color: '#15803D', borderRadius: '0.25rem', border: '1px solid #BBF7D0' }}
                          >
                            <Receipt size={13} /> N° ARCA
                          </button>
                        )}

                        {/* Badge si ya tiene nro ARCA */}
                        {f.nroFactura && (
                          <span className="text-xs text-gray-500 font-mono">{f.nroFactura}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <Pagination
            total={filtradas?.length ?? 0}
            pagina={pagina}
            porPagina={POR_PAGINA}
            onCambiar={setPagina}
            nombreItems="facturas"
          />
        </div>
      )}

      {/* Modal N° ARCA oficial */}
      {arcaModal && (
        <div className="modal-overlay" onClick={() => setArcaModal(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: '400px', borderRadius: 0, border: '1px solid #E5E7EB' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
              <h2 className="titulo-modulo" style={{ fontSize: '1.3rem' }}>N° de Factura ARCA</h2>
              <button onClick={() => setArcaModal(null)} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
            </div>
            <div className="modal-body space-y-3" style={{ padding: '1.5rem' }}>
              <p className="text-sm" style={{ color: '#6B7280' }}>Cliente: <strong>{arcaModal.clienteNombre}</strong></p>
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Número oficial ARCA</label>
                <input className="input-field" style={{ borderRadius: 0 }} placeholder="Ej: 00001-00000001"
                  value={arcaInput} onChange={e => setArcaInput(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
              <button onClick={() => setArcaModal(null)} className="btn-secondary">Cancelar</button>
              <button
                disabled={!arcaInput.trim() || cargarArca.isPending}
                onClick={async () => {
                  await cargarArca.mutateAsync({ id: arcaModal.id, nroFacturaArca: arcaInput.trim() });
                  setArcaModal(null);
                }}
                className="btn-primary"
              >
                {cargarArca.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal N° ARCA */}
      {nroFacturaModal && (
        <div className="modal-overlay" onClick={() => setNroFacturaModal(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: '400px', borderRadius: 0, border: '1px solid #E5E7EB' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
              <h2 className="titulo-modulo" style={{ fontSize: '1.3rem' }}>Cargar N° de Factura ARCA</h2>
              <button onClick={() => setNroFacturaModal(null)} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
            </div>
            <div className="modal-body space-y-3" style={{ padding: '1.5rem' }}>
              <p className="text-sm" style={{ color: '#6B7280' }}>Cliente: <strong>{nroFacturaModal.clienteNombre}</strong></p>
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Número de comprobante ARCA</label>
                <input
                  className="input-field"
                  style={{ borderRadius: 0 }}
                  placeholder="Ej: 00001-00000001"
                  value={nroFacturaInput}
                  onChange={e => setNroFacturaInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
              <button onClick={() => setNroFacturaModal(null)} className="btn-secondary">Cancelar</button>
              <button
                disabled={!nroFacturaInput.trim() || actualizarNro.isPending}
                onClick={async () => {
                  await actualizarNro.mutateAsync({ id: nroFacturaModal.id, nroFactura: nroFacturaInput.trim() });
                  setNroFacturaModal(null);
                }}
                className="btn-primary"
              >
                {actualizarNro.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showNuevaFactura && (
        <NuevaFactura
          onClose={() => setShowNuevaFactura(false)}
          onSuccess={() => setShowNuevaFactura(false)}
        />
      )}

      {/* Modal Detalle de facturación */}
      {detalleFacturaId && (
        <DetalleFacturaModal
          facturaId={detalleFacturaId}
          onClose={() => setDetalleFacturaId(null)}
        />
      )}

      {/* Modal Observaciones */}
      {obsModal && (
        <div className="modal-overlay" onClick={() => setObsModal(null)}>
          <div className="modal animate-slide-up" style={{ maxWidth: '480px', borderRadius: 0, border: '1px solid #E5E7EB' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
              <div>
                <h2 className="titulo-modulo" style={{ fontSize: '1.3rem' }}>Observaciones de facturación</h2>
                <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '2px 0 0' }}>{obsModal.clienteNombre}</p>
              </div>
              <button onClick={() => setObsModal(null)} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
            </div>
            <div className="modal-body space-y-3" style={{ padding: '1.5rem' }}>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Notas internas sobre este cobro o facturación. Solo visibles para los propietarios.</p>
              <textarea
                className="input resize-none"
                style={{ borderRadius: 0 }}
                rows={4}
                placeholder="Ej: Acordar con el cliente un plan de pago en cuotas..."
                value={obsInput}
                onChange={e => setObsInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
              <button onClick={() => setObsModal(null)} className="btn-secondary">Cancelar</button>
              <button
                disabled={actualizarObs.isPending}
                onClick={async () => {
                  await actualizarObs.mutateAsync({ id: obsModal.id, observaciones: obsInput });
                  setObsModal(null);
                }}
                className="btn-primary"
              >
                {actualizarObs.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cobroData && (
        <RegistrarCobro
          facturaId={cobroData.facturaId}
          clienteNombre={cobroData.clienteNombre}
          totalFactura={cobroData.totalFactura}
          totalCobrado={cobroData.totalCobrado}
          onClose={() => setCobroData(null)}
          onSuccess={() => setCobroData(null)}
        />
      )}
    </div>
  );
}
