import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { Calendar, TrendingUp, Users, DollarSign, Package } from 'lucide-react';
import {
  useReporteVentas,
  useReporteCobranzas,
  useTopClientes,
  useEstacionalidad
} from '../../hooks/useReportes';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { clsx } from 'clsx';

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

const COLORS = ['#16A34A', '#0D9488', '#2563EB', '#7C3AED', '#D97706', '#DC2626'];

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

  const dataPropietario = reporteVentas?.porPropietario
    ? Object.entries(reporteVentas.porPropietario).map(([rol, d]) => ({
        name: rol === 'propietario_carlos' ? 'Carlos' : 'Juan Cruz',
        value: d.pallets,
        facturacion: d.facturacion
      }))
    : [];

  const dataTipo = reporteVentas?.porTipoPallet
    ? Object.entries(reporteVentas.porTipoPallet)
        .map(([tipo, cantidad]) => ({
          tipo: tipo.charAt(0).toUpperCase() + tipo.slice(1),
          cantidad: cantidad as number
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
    : [];

  const totalPropietario = dataPropietario.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Análisis consolidado del negocio</p>
        </div>
      </div>

      {/* Selector de período */}
      <div className="card-p">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {([
              { key: 'mes',    label: 'Este mes' },
              { key: 'anio',   label: 'Este año' },
              { key: 'custom', label: 'Personalizado' },
            ] as { key: Periodo; label: string }[]).map(p => (
              <button key={p.key} onClick={() => cambiarPeriodo(p.key)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  periodo === p.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}>
                {p.label}
              </button>
            ))}
          </div>

          {periodo === 'custom' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-gray-400" />
                <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="input w-40 py-2" />
              </div>
              <span className="text-gray-400">→</span>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="input w-40 py-2" />
            </div>
          )}

          <div className="ml-auto text-sm text-gray-400">
            {new Date(desde).toLocaleDateString('es-AR')} al {new Date(hasta).toLocaleDateString('es-AR')}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {([
          { key: 'ventas',         label: '📦 Ventas' },
          { key: 'cobranzas',      label: '💰 Cobranzas' },
          { key: 'clientes',       label: '👥 Top Clientes' },
          { key: 'estacionalidad', label: '📊 Estacionalidad' },
        ] as { key: TabActivo; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTabActivo(t.key)}
            className={clsx(
              'flex-1 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              tabActivo === t.key
                ? 'bg-[#16A34A] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: VENTAS ── */}
      {tabActivo === 'ventas' && (
        loadingVentas
          ? <div className="p-8"><LoadingSpinner text="Cargando reporte de ventas..." /></div>
          : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Ventas totales',   valor: reporteVentas?.resumen?.totalVentas ?? 0,                           sub: 'operaciones' },
                { label: 'Pallets vendidos', valor: formatNumero(reporteVentas?.resumen?.totalPallets ?? 0),             sub: 'unidades' },
                { label: 'Facturación',      valor: formatPesos(reporteVentas?.resumen?.totalFacturado ?? 0),            sub: 'con IVA' },
                { label: 'Pendiente cobro',  valor: formatPesos(reporteVentas?.resumen?.pendienteCobro ?? 0),            sub: 'por cobrar' },
              ].map((k, i) => (
                <div key={i} className="card-p">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{k.valor}</p>
                  <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Torta por propietario */}
              <div className="card-p">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Pallets vendidos por propietario</h3>
                {dataPropietario.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={dataPropietario} dataKey="value" cx="50%" cy="50%"
                          outerRadius={80} innerRadius={40} paddingAngle={3}>
                          {dataPropietario.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [`${formatNumero(v)} u`, 'Pallets']}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {dataPropietario.map((d, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                              <span className="text-sm font-medium text-gray-900">{d.name}</span>
                            </div>
                            <span className="text-sm font-bold text-gray-900">{formatNumero(d.value)} u</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${Math.round((d.value / totalPropietario) * 100)}%`, background: COLORS[i] }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{formatPesosCompleto(d.facturacion)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state py-8">
                    <p className="text-sm text-gray-400">Sin datos en el período seleccionado</p>
                  </div>
                )}
              </div>

              {/* Barras por tipo */}
              <div className="card-p">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Ventas por tipo de pallet</h3>
                {dataTipo.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dataTipo} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                      <Tooltip
                        formatter={(v: number) => [`${formatNumero(v)} u`, 'Unidades']}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="cantidad" fill="#16A34A" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state py-8">
                    <p className="text-sm text-gray-400">Sin datos en el período seleccionado</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla ventas */}
            {(reporteVentas?.ventas?.length ?? 0) > 0 && (
              <div className="table-container">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Ventas del período ({reporteVentas!.ventas.length})
                  </h3>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th><th>Cliente</th><th>Productos</th><th>Propietario</th><th>Total</th><th>Cobro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reporteVentas!.ventas as VentaReporte[]).slice(0, 20).map(v => (
                      <tr key={v.id}>
                        <td className="text-xs text-gray-400 font-semibold">#{v.id}</td>
                        <td className="font-medium text-gray-900 text-sm">{v.cliente?.razonSocial}</td>
                        <td>
                          <div className="space-y-0.5">
                            {v.detalles?.slice(0, 2).map(d => (
                              <p key={d.id} className="text-xs text-gray-500">
                                {d.producto?.nombre} — {d.cantidadPedida}u
                              </p>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={clsx(
                            'text-xs font-medium px-2 py-0.5 rounded-lg',
                            v.usuario?.rol === 'propietario_carlos' ? 'bg-teal-50 text-teal-700' : 'bg-green-50 text-green-700'
                          )}>
                            {v.usuario?.nombre}
                          </span>
                        </td>
                        <td className="font-semibold text-sm text-gray-900">
                          {formatPesosCompleto(v.totalConIva ?? 0)}
                        </td>
                        <td>
                          {v.facturas?.map(f => (
                            <span key={f.id} className={clsx(
                              'text-xs font-medium px-2 py-0.5 rounded-lg',
                              f.estadoCobro === 'cobrada_total' ? 'bg-green-50 text-green-700'
                                : f.estadoCobro === 'vencida' ? 'bg-red-50 text-red-700'
                                : 'bg-amber-50 text-amber-700'
                            )}>
                              {f.estadoCobro === 'cobrada_total' ? '✓ Cobrada' : f.estadoCobro === 'vencida' ? '⚠ Vencida' : 'Pendiente'}
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total emitido',    valor: formatPesos(reporteCobranzas?.resumen?.totalEmitido ?? 0),    color: 'text-gray-900' },
                { label: 'Total cobrado',    valor: formatPesos(reporteCobranzas?.resumen?.totalCobrado ?? 0),    color: 'text-green-600' },
                { label: 'Pendiente cobrar', valor: formatPesos(reporteCobranzas?.resumen?.pendienteCobro ?? 0),  color: 'text-amber-600' },
                {
                  label: 'Tasa de cobranza',
                  valor: `${reporteCobranzas?.resumen?.tasaCobranza ?? 0}%`,
                  color: (reporteCobranzas?.resumen?.tasaCobranza ?? 0) >= 80 ? 'text-green-600' : 'text-amber-600'
                },
              ].map((k, i) => (
                <div key={i} className="card-p text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{k.label}</p>
                  <p className={clsx('text-2xl font-bold', k.color)}>{k.valor}</p>
                </div>
              ))}
            </div>

            {reporteCobranzas?.resumen && (
              <div className="card-p">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Progreso de cobranza del período</h3>
                  <span className={clsx('text-sm font-bold',
                    (reporteCobranzas.resumen.tasaCobranza ?? 0) >= 80 ? 'text-green-600' : 'text-amber-600')}>
                    {reporteCobranzas.resumen.tasaCobranza}%
                  </span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full transition-all duration-500',
                      (reporteCobranzas.resumen.tasaCobranza ?? 0) >= 80 ? 'bg-[#16A34A]' : 'bg-amber-500')}
                    style={{ width: `${reporteCobranzas.resumen.tasaCobranza ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Cobrado: {formatPesosCompleto(reporteCobranzas.resumen.totalCobrado)}</span>
                  <span>Pendiente: {formatPesosCompleto(reporteCobranzas.resumen.pendienteCobro)}</span>
                </div>
              </div>
            )}

            {reporteCobranzas?.porEstado && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'cobrada_total',   label: 'Cobradas',      color: 'bg-green-50 border-green-200 text-green-700' },
                  { key: 'cobrada_parcial', label: 'Cobro parcial', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { key: 'pendiente',       label: 'Pendientes',    color: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { key: 'vencida',         label: 'Vencidas',      color: 'bg-red-50 border-red-200 text-red-700' },
                ].map(s => (
                  <div key={s.key} className={clsx('p-4 rounded-xl border text-center', s.color)}>
                    <p className="text-2xl font-bold">{reporteCobranzas.porEstado[s.key] ?? 0}</p>
                    <p className="text-xs font-medium mt-1">{s.label}</p>
                  </div>
                ))}
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
            <p className="text-sm text-gray-500">
              Clientes con mayor volumen de compra histórico (todos los períodos)
            </p>
            {!topClientes?.length ? (
              <div className="empty-state">
                <div className="empty-icon"><Users size={24} /></div>
                <p className="text-sm text-gray-500">Sin datos de clientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topClientes.map((c, i) => {
                  const maxPallets = topClientes[0]?.totalPallets || 1;
                  const pct = Math.round((c.totalPallets / maxPallets) * 100);
                  return (
                    <div key={c.id} className="card-p">
                      <div className="flex items-center gap-4">
                        <div className={clsx(
                          'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0',
                          i === 0 ? 'bg-amber-100 text-amber-700' :
                          i === 1 ? 'bg-gray-100 text-gray-600' :
                          i === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-400'
                        )}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm truncate">{c.razonSocial}</p>
                              {c.localidad && <p className="text-xs text-gray-400">{c.localidad}</p>}
                            </div>
                            <div className="text-right ml-4 shrink-0">
                              <p className="text-sm font-bold text-gray-900">{formatNumero(c.totalPallets)} u</p>
                              <p className="text-xs text-gray-400">{formatPesos(c.totalFacturado)}</p>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#16A34A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex justify-between mt-1.5 text-xs text-gray-400">
                            <span>{c.totalVentas} compra{c.totalVentas !== 1 ? 's' : ''}</span>
                            <span>{pct}% del máximo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Ventas de los últimos 12 meses. Refleja el patrón estacional del negocio:
              pico en Nov-Dic, secundario en Agosto, mínimo en Ene-Feb.
            </p>

            <div className="card-p">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Pallets vendidos — últimos 12 meses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={estacionalidad ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPallets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16A34A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <Tooltip
                    formatter={(v: number) => [`${formatNumero(v)} u`, 'Pallets']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="pallets" stroke="#16A34A" strokeWidth={2.5}
                    fill="url(#colorPallets)" dot={{ fill: '#16A34A', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card-p">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Facturación mensual — últimos 12 meses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={estacionalidad ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={v => formatPesos(v as number)} />
                  <Tooltip
                    formatter={(v: number) => [formatPesosCompleto(v), 'Facturación']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="facturacion" fill="#0D9488" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {estacionalidad && (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mes</th><th>Ventas</th><th>Pallets</th><th>Facturación</th><th>Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estacionalidad.map((m: EstacionalidadMes, i: number) => {
                      const anterior = i > 0 ? estacionalidad[i - 1] : null;
                      const tendencia = anterior
                        ? m.pallets > anterior.pallets ? 'up' : m.pallets < anterior.pallets ? 'down' : 'equal'
                        : 'equal';
                      return (
                        <tr key={i}>
                          <td className="font-semibold text-gray-900">{m.mes}</td>
                          <td className="text-gray-700">{m.ventas}</td>
                          <td className="font-semibold text-gray-900">{formatNumero(m.pallets)} u</td>
                          <td className="font-semibold text-gray-900">{formatPesosCompleto(m.facturacion)}</td>
                          <td>
                            <span className={clsx('text-sm',
                              tendencia === 'up' ? 'text-green-600' : tendencia === 'down' ? 'text-red-500' : 'text-gray-400')}>
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

// Silence unused icon imports linter warnings
void Calendar; void TrendingUp; void Users; void DollarSign; void Package;
