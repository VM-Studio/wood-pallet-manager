import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, DollarSign, AlertTriangle, Clock, CheckCircle, Receipt, X, Plus } from 'lucide-react';
import { useFacturas, useFacturasVencidas, useCobrosPendientes, useActualizarNroFactura, useCargarNroArca } from '../../hooks/useFacturacion';
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
                        {/* Botón pago aprobado / pago manual */}
                        {f.estadoCobro !== 'cobrada_total' && (
                          <>
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
                              {f.estadoCobro === 'cobrada_parcial' ? `Pago restante (${formatPesos(saldo)})` : 'Pago aprobado'}
                            </button>

                            <button
                              onClick={() => setCobroData({
                                facturaId: f.id,
                                clienteNombre: f.cliente?.razonSocial ?? '',
                                totalFactura: Number(f.totalConIva),
                                totalCobrado
                              })}
                              className="px-3 py-1.5 text-xs font-medium border rounded"
                              style={{ borderColor: '#E5E7EB', background: '#fff' }}
                            >
                              Pago
                            </button>
                          </>
                        )}
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
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">N° de Factura ARCA</span>
              <button onClick={() => setArcaModal(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-gray-500">Cliente: <strong>{arcaModal.clienteNombre}</strong></p>
              <div>
                <label className="label">Número oficial ARCA</label>
                <input className="input-field" placeholder="Ej: 00001-00000001"
                  value={arcaInput} onChange={e => setArcaInput(e.target.value)} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
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
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Cargar N° de Factura ARCA</span>
              <button onClick={() => setNroFacturaModal(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-3">
              <p className="text-sm text-gray-500">Cliente: <strong>{nroFacturaModal.clienteNombre}</strong></p>
              <div>
                <label className="label">Número de comprobante ARCA</label>
                <input
                  className="input-field"
                  placeholder="Ej: 00001-00000001"
                  value={nroFacturaInput}
                  onChange={e => setNroFacturaInput(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-footer">
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
