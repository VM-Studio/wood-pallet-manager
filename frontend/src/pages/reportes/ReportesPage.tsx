import { useState, useMemo } from 'react';
import type React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line,
} from 'recharts';
import { Calendar, TrendingUp, Users, DollarSign, Package, Clock, CheckCircle, Receipt } from 'lucide-react';
import {
  useReporteVentas,
  useReporteCobranzas,
  useTopClientes,
  useEstacionalidad
} from '../../hooks/useReportes';
import LoadingSpinner from '../../components/ui/LoadingSpinner';


const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    notation: 'compact', maximumFractionDigits: 1
  }).format(v);

const formatPesosCompleto = (v: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0
  }).format(v);

const formatNumero = (v: number) => new Intl.NumberFormat('es-AR').format(v);

const tooltipStyle = { fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' };

// ── Paleta del sistema ────────────────────────────────────────────────────────
const BRAND = ['#6B3A2A', '#7c4b2c', '#9B5535', '#C4895A', '#E8C9A0'];

// ── 12 colores únicos para meses (Ene → Dic) ─────────────────────────────────
const MONTH_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
  '#6366F1', '#84CC16', '#7c4b2c', '#C4895A',
];

const hoy = new Date();
const primerDiaMes  = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
const ultimoDiaMes  = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
const primerDiaAnio = `${hoy.getFullYear()}-01-01`;
const ultimoDiaAnio = `${hoy.getFullYear()}-12-31`;

type Periodo  = 'mes' | 'anio' | 'custom';
type TabActivo = 'ventas' | 'cobranzas' | 'clientes' | 'estacionalidad';

interface VentaReporte {
  id: number;
  totalConIva?: number;
  cliente?: { razonSocial: string };
  usuario?: { nombre: string; rol: string };
  detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
  facturas?: { id: number; estadoCobro: string }[];
}

interface EstacionalidadMes {
  mes: string;
  ventas: number;
  pallets: number;
  facturacion: number;
}

export default function ReportesPage() {
  const [periodo, setPeriodo]     = useState<Periodo>('mes');
  const [desde, setDesde]         = useState(primerDiaMes);
  const [hasta, setHasta]         = useState(ultimoDiaMes);
  const [tabActivo, setTabActivo] = useState<TabActivo>('ventas');

  const { data: reporteVentas,    isLoading: loadingVentas }   = useReporteVentas(desde, hasta);
  const { data: reporteCobranzas, isLoading: loadingCobr }     = useReporteCobranzas(desde, hasta);
  const { data: topClientes,      isLoading: loadingClientes } = useTopClientes(10);
  const { data: estacionalidad,   isLoading: loadingEst }      = useEstacionalidad();

  const cambiarPeriodo = (p: Periodo) => {
    setPeriodo(p);
    if (p === 'mes')  { setDesde(primerDiaMes);  setHasta(ultimoDiaMes); }
    if (p === 'anio') { setDesde(primerDiaAnio); setHasta(ultimoDiaAnio); }
  };

  const dataPropietario = useMemo(() =>
    reporteVentas?.porPropietario
      ? Object.entries(reporteVentas.porPropietario).map(([rol, d]) => ({
          name: rol === 'propietario_carlos' ? 'Carlos' : 'Juan Cruz',
          value: (d as { pallets: number; facturacion: number }).pallets,
          facturacion: (d as { pallets: number; facturacion: number }).facturacion,
        }))
      : []
  , [reporteVentas]);

  const dataTipo = useMemo(() =>
    reporteVentas?.porTipoPallet
      ? Object.entries(reporteVentas.porTipoPallet)
          .map(([tipo, cantidad]) => ({
            tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
            cantidad: cantidad as number,
          }))
          .sort((a, b) => b.cantidad - a.cantidad)
      : []
  , [reporteVentas]);

  const totalPropietario = dataPropietario.reduce((a, b) => a + b.value, 0) || 1;

  const dataCobranzasDonut = useMemo(() => {
    if (!reporteCobranzas?.resumen) return [];
    const cobrado   = reporteCobranzas.resumen.totalCobrado   ?? 0;
    const pendiente = reporteCobranzas.resumen.pendienteCobro ?? 0;
    return [
      { name: 'Cobrado',   value: cobrado   },
      { name: 'Pendiente', value: pendiente },
    ].filter(d => d.value > 0);
  }, [reporteCobranzas]);

  const dataCobranzasEstado = useMemo(() => {
    if (!reporteCobranzas?.porEstado) return [];
    const labels: Record<string, string> = {
      cobrada_total:   'Cobrada total',
      cobrada_parcial: 'Cobro parcial',
      pendiente:       'Pendiente',
      vencida:         'Vencida',
    };
    return Object.entries(reporteCobranzas.porEstado)
      .map(([k, v]) => ({ name: labels[k] ?? k, value: v as number }))
      .filter(d => d.value > 0);
  }, [reporteCobranzas]);

  const dataTopClientesChart = useMemo(() =>
    (topClientes ?? [])
      .slice(0, 8)
      .map((c: { razonSocial: string; totalPallets: number; totalFacturado: number }) => ({
        name: c.razonSocial.length > 14 ? c.razonSocial.slice(0, 14) + '…' : c.razonSocial,
        pallets:     c.totalPallets,
        facturacion: c.totalFacturado,
      }))
  , [topClientes]);

  const dataEst = useMemo(() =>
    (estacionalidad ?? []).map((m: EstacionalidadMes, i: number) => ({ ...m, idx: i }))
  , [estacionalidad]);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Reportes</h1>
          <p className="text-sm text-gray-500 mt-1">Análisis consolidado del negocio</p>
        </div>
      </div>

      {/* Selector de período */}
      <div className="card-kpi">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 p-1" style={{ background: '#F3EDE8', borderRadius: '0.375rem' }}>
            {([
              { key: 'mes',    label: 'Este mes' },
              { key: 'anio',   label: 'Este año' },
              { key: 'custom', label: 'Personalizado' },
            ] as { key: Periodo; label: string }[]).map(p => (
              <button key={p.key} onClick={() => cambiarPeriodo(p.key)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  background: periodo === p.key ? '#7c4b2c' : 'transparent',
                  color: periodo === p.key ? '#fff' : '#6B7280',
                  borderRadius: '0.25rem', border: 'none', cursor: 'pointer',
                }}>
                {p.label}
              </button>
            ))}
          </div>

          {periodo === 'custom' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-gray-400" />
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input w-40" />
              </div>
              <span className="text-gray-400">→</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input w-40" />
            </div>
          )}

          <div className="ml-auto text-xs text-gray-400">
            {new Date(desde).toLocaleDateString('es-AR')} → {new Date(hasta).toLocaleDateString('es-AR')}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1" style={{ background: '#F3EDE8', borderRadius: '0.375rem' }}>
        {([
          { key: 'ventas',         label: 'Ventas',         icon: <Package size={14} /> },
          { key: 'cobranzas',      label: 'Cobranzas',      icon: <DollarSign size={14} /> },
          { key: 'clientes',       label: 'Top Clientes',   icon: <Users size={14} /> },
          { key: 'estacionalidad', label: 'Estacionalidad', icon: <TrendingUp size={14} /> },
        ] as { key: TabActivo; label: string; icon: React.ReactNode }[]).map(t => (
          <button key={t.key} onClick={() => setTabActivo(t.key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all"
            style={{
              background: tabActivo === t.key ? '#7c4b2c' : 'transparent',
              color: tabActivo === t.key ? '#fff' : '#9E8878',
              borderRadius: '0.25rem', border: 'none', cursor: 'pointer',
            }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: VENTAS ── */}
      {tabActivo === 'ventas' && (
        loadingVentas
          ? <div className="p-8"><LoadingSpinner text="Cargando reporte de ventas..." /></div>
          : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ventas totales',   valor: reporteVentas?.resumen?.totalVentas ?? 0,                 sub: 'operaciones',  icono: <TrendingUp size={15} /> },
                { label: 'Pallets vendidos', valor: formatNumero(reporteVentas?.resumen?.totalPallets ?? 0),  sub: 'unidades',     icono: <Package size={15} /> },
                { label: 'Facturación',      valor: formatPesos(reporteVentas?.resumen?.totalFacturado ?? 0), sub: 'con IVA',      icono: <DollarSign size={15} /> },
                { label: 'Pendiente cobro',  valor: formatPesos(reporteVentas?.resumen?.pendienteCobro ?? 0), sub: 'por cobrar',   icono: <Clock size={15} /> },
              ].map((k, i) => (
                <div key={i} className="card-kpi">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
                      style={{ background: '#F3EDE8', color: '#7c4b2c' }}>{k.icono}</div>
                    <p className="titulo-card flex-1">{k.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{k.valor}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Donut por propietario */}
              <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
                <p className="titulo-card mb-3">Pallets vendidos por propietario</p>
                {dataPropietario.length > 0 ? (
                  <div className="flex-1 flex items-center gap-5">
                    <div style={{ width: 130, height: 130, flexShrink: 0, position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dataPropietario} dataKey="value"
                            cx="50%" cy="50%" innerRadius={38} outerRadius={56}
                            paddingAngle={3} strokeWidth={0}>
                            {dataPropietario.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle}
                            formatter={(v: number) => [`${formatNumero(v)} u`, 'Pallets']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <p style={{ fontSize: '0.65rem', color: '#9CA3AF', lineHeight: 1.2 }}>Total</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>{formatNumero(totalPropietario)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                      {dataPropietario.map((d, i) => {
                        const pct = Math.round((d.value / totalPropietario) * 100);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: BRAND[i % BRAND.length], flexShrink: 0 }} />
                                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>{formatNumero(d.value)} u</p>
                            </div>
                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: BRAND[i % BRAND.length], borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{formatPesosCompleto(d.facturacion)} · {pct}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 m-auto text-center">Sin datos en el período seleccionado</p>
                )}
              </div>

              {/* Barras por tipo de pallet */}
              <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
                <p className="titulo-card mb-3">Ventas por tipo de pallet</p>
                {dataTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dataTipo} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${formatNumero(v)} u`, 'Unidades']} />
                      <Bar dataKey="cantidad" radius={[3, 3, 0, 0]} maxBarSize={40}>
                        {dataTipo.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-gray-400 m-auto text-center">Sin datos en el período seleccionado</p>
                )}
              </div>
            </div>

            {/* Tabla ventas */}
            {(reporteVentas?.ventas?.length ?? 0) > 0 && (
              <div className="table-container">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="titulo-card">Ventas del período ({reporteVentas!.ventas.length})</p>
                </div>
                <table className="table">
                  <thead>
                    <tr><th>#</th><th>Cliente</th><th>Productos</th><th>Propietario</th><th>Total</th><th>Cobro</th></tr>
                  </thead>
                  <tbody>
                    {(reporteVentas!.ventas as VentaReporte[]).slice(0, 20).map(v => (
                      <tr key={v.id}>
                        <td className="text-xs text-gray-400 font-mono">#{v.id}</td>
                        <td className="font-semibold text-gray-900 text-sm">{v.cliente?.razonSocial}</td>
                        <td>
                          {v.detalles?.slice(0, 2).map(d => (
                            <p key={d.id} className="text-xs text-gray-500">{d.producto?.nombre} — {d.cantidadPedida}u</p>
                          ))}
                        </td>
                        <td>
                          <span className="text-xs font-medium px-2 py-0.5" style={{ background: '#F3EDE8', color: '#7c4b2c', borderRadius: '0.25rem' }}>
                            {v.usuario?.nombre}
                          </span>
                        </td>
                        <td className="font-semibold text-sm text-gray-900">{formatPesosCompleto(v.totalConIva ?? 0)}</td>
                        <td>
                          {v.facturas?.map(f => (
                            <span key={f.id} className="text-xs font-medium px-2 py-0.5" style={{
                              background: f.estadoCobro === 'cobrada_total' ? '#F0FDF4' : f.estadoCobro === 'vencida' ? '#FEF2F2' : '#FFFBEB',
                              color: f.estadoCobro === 'cobrada_total' ? '#15803D' : f.estadoCobro === 'vencida' ? '#B91C1C' : '#B45309',
                              borderRadius: '0.25rem',
                            }}>
                              {f.estadoCobro === 'cobrada_total' ? 'Cobrada' : f.estadoCobro === 'vencida' ? 'Vencida' : 'Pendiente'}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reporteVentas!.ventas.length > 20 && (
                  <div className="p-3 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-400">Mostrando 20 de {reporteVentas!.ventas.length} ventas</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* ── TAB: COBRANZAS ── */}
      {tabActivo === 'cobranzas' && (
        loadingCobr
          ? <div className="p-8"><LoadingSpinner text="Cargando reporte de cobranzas..." /></div>
          : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total emitido',    valor: formatPesos(reporteCobranzas?.resumen?.totalEmitido ?? 0),   sub: 'facturado',          icono: <Receipt size={15} /> },
                { label: 'Total cobrado',    valor: formatPesos(reporteCobranzas?.resumen?.totalCobrado ?? 0),   sub: 'cobros confirmados', icono: <CheckCircle size={15} /> },
                { label: 'Pendiente cobrar', valor: formatPesos(reporteCobranzas?.resumen?.pendienteCobro ?? 0), sub: 'por cobrar',         icono: <Clock size={15} /> },
                { label: 'Tasa de cobranza', valor: `${reporteCobranzas?.resumen?.tasaCobranza ?? 0}%`,          sub: 'del período',        icono: <TrendingUp size={15} /> },
              ].map((k, i) => (
                <div key={i} className="card-kpi">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded flex items-center justify-center shrink-0" style={{ background: '#F3EDE8', color: '#7c4b2c' }}>{k.icono}</div>
                    <p className="titulo-card flex-1">{k.label}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{k.valor}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Donut: Cobrado vs Pendiente */}
              <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
                <p className="titulo-card mb-3">Cobrado vs pendiente</p>
                {dataCobranzasDonut.length > 0 ? (
                  <div className="flex-1 flex items-center gap-5">
                    <div style={{ width: 130, height: 130, flexShrink: 0, position: 'relative' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dataCobranzasDonut} dataKey="value"
                            cx="50%" cy="50%" innerRadius={38} outerRadius={56}
                            paddingAngle={3} strokeWidth={0}>
                            <Cell fill="#7c4b2c" />
                            <Cell fill="#C4895A" />
                          </Pie>
                          <Tooltip contentStyle={tooltipStyle}
                            formatter={(v: number) => [formatPesosCompleto(v), '']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                        <p style={{ fontSize: '0.65rem', color: '#9CA3AF', lineHeight: 1.2 }}>Tasa</p>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>
                          {reporteCobranzas?.resumen?.tasaCobranza ?? 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                      {dataCobranzasDonut.map((d, i) => {
                        const total = dataCobranzasDonut.reduce((a, x) => a + x.value, 0);
                        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                        const clr = i === 0 ? '#7c4b2c' : '#C4895A';
                        return (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: clr, flexShrink: 0 }} />
                                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>{formatPesos(d.value)}</p>
                            </div>
                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: clr, borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                            <p style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 2 }}>{pct}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 m-auto text-center">Sin datos en el período</p>
                )}
              </div>

              {/* Barras por estado */}
              <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
                <p className="titulo-card mb-3">Facturas por estado de cobro</p>
                {dataCobranzasEstado.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={dataCobranzasEstado} layout="vertical"
                      margin={{ top: 0, right: 20, bottom: 0, left: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={90}
                        tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v + ' facturas', '']} />
                      <Bar dataKey="value" radius={[0, 3, 3, 0]} maxBarSize={16}>
                        {dataCobranzasEstado.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-gray-400 m-auto text-center">Sin datos en el período</p>
                )}
              </div>
            </div>

            {/* Barra de progreso general */}
            {reporteCobranzas?.resumen && (
              <div className="card-kpi">
                <div className="flex items-center justify-between mb-2">
                  <p className="titulo-card">Progreso de cobranza del período</p>
                  <span className="text-sm font-bold"
                    style={{ color: (reporteCobranzas.resumen.tasaCobranza ?? 0) >= 80 ? '#15803D' : '#B45309' }}>
                    {reporteCobranzas.resumen.tasaCobranza}%
                  </span>
                </div>
                <div className="h-3 bg-gray-100 overflow-hidden" style={{ borderRadius: '0.25rem' }}>
                  <div className="h-full transition-all duration-500"
                    style={{
                      width: `${reporteCobranzas.resumen.tasaCobranza ?? 0}%`,
                      background: (reporteCobranzas.resumen.tasaCobranza ?? 0) >= 80 ? '#7c4b2c' : '#F59E0B',
                      borderRadius: '0.25rem',
                    }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Cobrado: {formatPesosCompleto(reporteCobranzas.resumen.totalCobrado)}</span>
                  <span>Pendiente: {formatPesosCompleto(reporteCobranzas.resumen.pendienteCobro)}</span>
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── TAB: TOP CLIENTES ── */}
      {tabActivo === 'clientes' && (
        loadingClientes
          ? <div className="p-8"><LoadingSpinner text="Cargando top clientes..." /></div>
          : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Clientes con mayor volumen de compra histórico (todos los períodos)</p>

            {/* Gráficos barras horizontales */}
            {dataTopClientesChart.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
                  <p className="titulo-card mb-3">Top clientes — pallets comprados</p>
                  <ResponsiveContainer width="100%" height={dataTopClientesChart.length * 30 + 16}>
                    <BarChart data={dataTopClientesChart} layout="vertical"
                      margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                        tickFormatter={v => formatNumero(v)} />
                      <YAxis type="category" dataKey="name" width={100}
                        tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatNumero(v) + ' u', 'Pallets']} />
                      <Bar dataKey="pallets" radius={[0, 3, 3, 0]} maxBarSize={14}>
                        {dataTopClientesChart.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
                  <p className="titulo-card mb-3">Top clientes — facturación total</p>
                  <ResponsiveContainer width="100%" height={dataTopClientesChart.length * 30 + 16}>
                    <BarChart data={dataTopClientesChart} layout="vertical"
                      margin={{ top: 0, right: 24, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                        tickFormatter={v => formatPesos(v)} />
                      <YAxis type="category" dataKey="name" width={100}
                        tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle}
                        formatter={(v: number) => [formatPesosCompleto(v), 'Facturación']} />
                      <Bar dataKey="facturacion" radius={[0, 3, 3, 0]} maxBarSize={14}>
                        {dataTopClientesChart.map((_, i) => <Cell key={i} fill={BRAND[i % BRAND.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tabla detallada */}
            {!topClientes?.length ? (
              <div className="card-kpi flex flex-col items-center justify-center py-16 text-center">
                <Users size={24} style={{ color: '#7c4b2c', marginBottom: 12 }} />
                <p className="titulo-card">Sin datos de clientes</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th><th>Cliente</th><th>Compras</th>
                      <th style={{ textAlign: 'right' }}>Pallets</th>
                      <th style={{ textAlign: 'right' }}>Facturación</th>
                      <th>Participación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClientes.map((c: { id: number; razonSocial: string; localidad?: string; totalVentas: number; totalPallets: number; totalFacturado: number }, i: number) => {
                      const maxPallets = (topClientes[0] as typeof c)?.totalPallets || 1;
                      const pct = Math.round((c.totalPallets / maxPallets) * 100);
                      return (
                        <tr key={c.id}>
                          <td>
                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: i < 3 ? '#7c4b2c' : '#9CA3AF' }}>#{i + 1}</span>
                          </td>
                          <td>
                            <p className="font-semibold text-gray-900 text-sm">{c.razonSocial}</p>
                            {c.localidad && <p className="text-xs text-gray-400">{c.localidad}</p>}
                          </td>
                          <td className="text-sm text-gray-600">{c.totalVentas} compra{c.totalVentas !== 1 ? 's' : ''}</td>
                          <td className="text-sm font-bold text-right" style={{ color: '#7c4b2c' }}>{formatNumero(c.totalPallets)} u</td>
                          <td className="text-sm font-semibold text-right text-gray-900">{formatPesos(c.totalFacturado)}</td>
                          <td style={{ minWidth: 100 }}>
                            <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: BRAND[i % BRAND.length], borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                            <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{pct}%</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}

      {/* ── TAB: ESTACIONALIDAD ── */}
      {tabActivo === 'estacionalidad' && (
        loadingEst
          ? <div className="p-8"><LoadingSpinner text="Cargando estacionalidad..." /></div>
          : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Ventas de los últimos 12 meses. Refleja el patrón estacional del negocio.
            </p>

            {/* Gráfico 1: Pallets — línea base + dots coloreados por mes */}
            <div className="card-kpi">
              <p className="titulo-card mb-3">Pallets vendidos — cada mes en su color</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {dataEst.map((m, i) => (
                  <span key={i} className="flex items-center gap-1" style={{ fontSize: '0.68rem', color: '#374151' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: MONTH_COLORS[i % 12], display: 'inline-block', flexShrink: 0 }} />
                    {m.mes}
                  </span>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dataEst} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v: number) => [`${formatNumero(v)} u`, 'Pallets']} />
                  <Line type="monotone" dataKey="pallets" stroke="#E8E2DA" strokeWidth={2} dot={false} />
                  {dataEst.map((entry, i) => (
                    <Line key={i} data={[entry]} dataKey="pallets"
                      stroke={MONTH_COLORS[i % 12]} strokeWidth={0}
                      dot={{ r: 7, fill: MONTH_COLORS[i % 12], stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 9, fill: MONTH_COLORS[i % 12] }}
                      isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico 2: Facturación — barras con color por mes */}
            <div className="card-kpi">
              <p className="titulo-card mb-3">Facturación mensual — cada mes en su color</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dataEst} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatPesos(v as number)} />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(v: number) => [formatPesosCompleto(v), 'Facturación']} />
                  <Bar dataKey="facturacion" radius={[3, 3, 0, 0]} maxBarSize={36}>
                    {dataEst.map((_, i) => <Cell key={i} fill={MONTH_COLORS[i % 12]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla detalle */}
            {dataEst.length > 0 && (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr><th>Mes</th><th>Ventas</th><th>Pallets</th><th>Facturación</th><th>Tendencia</th></tr>
                  </thead>
                  <tbody>
                    {dataEst.map((m, i) => {
                      const anterior = i > 0 ? dataEst[i - 1] : null;
                      const tendencia = anterior
                        ? m.pallets > anterior.pallets ? 'up' : m.pallets < anterior.pallets ? 'down' : 'equal'
                        : 'equal';
                      return (
                        <tr key={i}>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: MONTH_COLORS[i % 12], display: 'inline-block', flexShrink: 0 }} />
                              <span className="font-semibold text-gray-900">{m.mes}</span>
                            </span>
                          </td>
                          <td className="text-gray-700">{m.ventas}</td>
                          <td className="font-semibold text-gray-900">{formatNumero(m.pallets)} u</td>
                          <td className="font-semibold text-gray-900">{formatPesosCompleto(m.facturacion)}</td>
                          <td>
                            <span style={{ fontSize: '1rem', color: tendencia === 'up' ? '#15803D' : tendencia === 'down' ? '#B91C1C' : '#9CA3AF' }}>
                              {tendencia === 'up' ? '↑' : tendencia === 'down' ? '↓' : '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
