import { useState, useMemo } from 'react';
import { Plus, Search, Check, X, AlertTriangle, ChevronDown, ChevronUp, FileText, PackageSearch, User, Boxes } from 'lucide-react';
import { useCompras, useDeudaProveedores, useRegistrarPagoCompra, useCancelarCompra, useVentasParaCompraDirecta } from '../../hooks/useCompras';
import NuevaCompra from './NuevaCompra';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Pagination from '../../components/ui/Pagination';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis,
  Area, AreaChart,
} from 'recharts';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const tipoCompraLabel: Record<string, string> = {
  reventa_inmediata: 'Compra directa',
  stock_propio:      'Stock propio',
};

export default function ComprasPage() {
  const { data: compras, isLoading, error } = useCompras();
  const { data: deuda } = useDeudaProveedores();
  const { data: ventasPendientesCD } = useVentasParaCompraDirecta();
  const registrarPago = useRegistrarPagoCompra();
  const cancelarCompra = useCancelarCompra();
  const [busqueda, setBusqueda] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [notifExpandida, setNotifExpandida] = useState(true);
  const [pagoModal, setPagoModal] = useState<number | null>(null);
  const [detalleVentaModal, setDetalleVentaModal] = useState<import('../../types').CompraVentaResumen | null>(null);
  const [pagoForm, setPagoForm] = useState({
    metodoPago: '' as 'transferencia' | 'e_check' | 'efectivo' | '',
    cuentaDestino: '',
    nroComprobante: '',
  });
  const [errorPago, setErrorPago] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  const filtradas = compras?.filter(c =>
    c.proveedor?.nombreEmpresa.toLowerCase().includes(busqueda.toLowerCase()) ||
    `#${c.id}`.includes(busqueda)
  ) ?? [];

  const comprasPaginadas = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const deudaTotal = deuda?.reduce((acc: number, d: any) => acc + d.deudaTotal, 0) || 0;

  // ── Datos gráfico 1: Proveedor (monto total) ──────────────────────────────
  const dataPorProveedor = useMemo(() => {
    if (!compras?.length) return [];
    const mapa: Record<string, number> = {};
    compras.filter(c => c.estado !== 'cancelada').forEach(c => {
      const nombre = c.proveedor?.nombreEmpresa ?? 'Sin proveedor';
      mapa[nombre] = (mapa[nombre] || 0) + Number(c.total || 0);
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [compras]);

  // ── Datos gráfico 2: Tipo de compra (monto total) ─────────────────────────
  const dataPorTipo = useMemo(() => {
    if (!compras?.length) return [];
    let stockPropio = 0;
    let compraDirect = 0;
    compras.filter(c => c.estado !== 'cancelada').forEach(c => {
      const monto = Number(c.total || 0);
      if (c.tipoCompra === 'stock_propio') stockPropio += monto;
      else compraDirect += monto;
    });
    return [
      { name: 'Stock propio', value: stockPropio },
      { name: 'Compra directa', value: compraDirect },
    ];
  }, [compras]);

  // ── Datos gráfico 3: Evolución mensual (últimos 6 meses) ──────────────────
  const dataEvolucion = useMemo(() => {
    const meses: { key: string; label: string }[] = [];
    const hoy = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
      meses.push({ key, label });
    }
    const totales: Record<string, number> = {};
    meses.forEach(m => { totales[m.key] = 0; });
    compras?.filter(c => c.estado !== 'cancelada').forEach(c => {
      const key = c.fechaCompra.slice(0, 7);
      if (key in totales) totales[key] += Number(c.total || 0);
    });
    return meses.map(m => ({ mes: m.label, total: totales[m.key] }));
  }, [compras]);

  const totalGeneral = useMemo(
    () => dataPorProveedor.reduce((acc, d) => acc + d.value, 0),
    [dataPorProveedor]
  );

  const handlePago = async (compraId: number) => {
    setErrorPago('');
    if (!pagoForm.metodoPago) { setErrorPago('Seleccioná el método de pago'); return; }
    if (pagoForm.metodoPago === 'transferencia' && !pagoForm.cuentaDestino) {
      setErrorPago('Seleccioná la cuenta destino'); return;
    }
    try {
      await registrarPago.mutateAsync({ id: compraId, datos: pagoForm });
      setPagoModal(null);
      setPagoForm({ metodoPago: '', cuentaDestino: '', nroComprobante: '' });
    } catch (err: any) {
      setErrorPago(err.response?.data?.error || 'Error al registrar el pago');
    }
  };

  if (isLoading) return <LoadingSpinner text="Cargando compras..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar las compras." />;

  return (
    <div className="space-y-6">

      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Compras</h1>
          <p className="text-sm text-gray-500 mt-1">{compras?.length || 0} compras registradas</p>
        </div>
        <button onClick={() => setShowNueva(true)} className="btn-brand">
          <Plus size={16} /> Nueva compra
        </button>
      </div>

      {/* Deuda total */}
      {deudaTotal > 0 && (
        <div className="card-base border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Saldo deudor total con proveedores</p>
                <p className="text-xs text-gray-400">Compras registradas pendientes de pago</p>
              </div>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatPesos(deudaTotal)}</p>
          </div>
        </div>
      )}

      {/* Notificación: compras directas pendientes de hacer al galpón */}
      {ventasPendientesCD && ventasPendientesCD.length > 0 && (
        <div className="card-base border-l-4" style={{ padding: 0, overflow: 'hidden', borderLeftColor: '#7c4b2c' }}>
          <button
            onClick={() => setNotifExpandida(v => !v)}
            className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
            style={{ background: '#F3EDE8' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#7c4b2c' }}>
                <PackageSearch size={18} className="text-white" />
              </div>
              <div className="text-left min-w-0">
                <p className="text-sm font-bold" style={{ color: '#4A2E1C' }}>
                  {ventasPendientesCD.length} compra{ventasPendientesCD.length > 1 ? 's' : ''} directa{ventasPendientesCD.length > 1 ? 's' : ''} pendiente{ventasPendientesCD.length > 1 ? 's' : ''} de hacerle al galpón
                </p>
                <p className="text-xs" style={{ color: '#8A6D57' }}>Ventas confirmadas con origen "compra directa" que todavía no tienen compra asociada</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: '#7c4b2c' }}>
                {ventasPendientesCD.length}
              </span>
              {notifExpandida ? <ChevronUp size={16} style={{ color: '#7c4b2c' }} /> : <ChevronDown size={16} style={{ color: '#7c4b2c' }} />}
            </div>
          </button>

          {notifExpandida && (
            <div className="divide-y" style={{ background: '#fff', borderColor: '#EDE4DB' }}>
              {ventasPendientesCD.map(v => {
                const totalUnidades = v.detalles.reduce((acc, d) => acc + d.cantidadPedida, 0);
                return (
                  <div key={v.id} className="px-4 py-3 flex items-start justify-between gap-3 transition-colors" style={{ borderColor: '#EDE4DB' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FBF7F3')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">#{v.id}</span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-gray-900">
                          <User size={12} className="text-gray-400" />
                          {v.cliente?.razonSocial ?? '—'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {v.detalles.map(d => (
                          <span key={d.id} className="inline-flex items-center gap-1 text-xs text-gray-600">
                            <Boxes size={11} className="text-gray-400" />
                            {d.cantidadPedida} u. · {d.producto.nombre} ({d.producto.condicion})
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 mb-0.5">{formatFecha(v.fechaVenta)}</p>
                      <p className="text-sm font-bold" style={{ color: '#7c4b2c' }}>{totalUnidades} u. total</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Gráficos ─────────────────────────────────────────────────────── */}
      {compras && compras.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Gráfico 1 — Donut: distribución por proveedor */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-3">Compras por proveedor</p>
            <div className="flex-1 flex items-center gap-4">
              <div style={{ width: 130, height: 130, flexShrink: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dataPorProveedor}
                      dataKey="value"
                      cx="50%" cy="50%"
                      innerRadius={38} outerRadius={58}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {dataPorProveedor.map((_, i) => (
                        <Cell key={i} fill={['#6B3A2A', '#C4895A', '#E8D5C4', '#A0522D'][i % 4]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) =>
                        [`$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v)}`, 'Monto']}
                      contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Centro del donut */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <p style={{ fontSize: '0.6rem', color: '#9CA3AF', lineHeight: 1.2 }}>Total</p>
                  <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>
                    ${new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalGeneral)}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                {dataPorProveedor.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 min-w-0">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: ['#6B3A2A', '#C4895A', '#E8D5C4', '#A0522D'][i % 4], flexShrink: 0 }} />
                    <div className="min-w-0 flex-1">
                      <p style={{ fontSize: '0.7rem', color: '#374151', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                      <p style={{ fontSize: '0.65rem', color: '#9CA3AF' }}>
                        {totalGeneral > 0 ? Math.round((d.value / totalGeneral) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Gráfico 2 — Barras horizontales: tipo de compra */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-3">Stock propio vs Compra directa</p>
            <div className="flex-1 flex flex-col justify-center gap-4">
              {dataPorTipo.map((d, i) => {
                const total = dataPorTipo.reduce((acc, x) => acc + x.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                const colors = ['#6B3A2A', '#C4895A'];
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i], flexShrink: 0 }} />
                        <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#6B7280' }}>
                        ${new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(d.value)}
                      </p>
                    </div>
                    <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${colors[i]}CC, ${colors[i]})`,
                          borderRadius: 4,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 3 }}>{pct}% del total</p>
                  </div>
                );
              })}
              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'center' }}>
                  {compras?.filter(c => c.estado !== 'cancelada').length ?? 0} operaciones activas
                </p>
              </div>
            </div>
          </div>

          {/* Gráfico 3 — Line chart: evolución mensual */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-3">Gasto mensual — últimos 6 meses</p>
            <div className="flex-1" style={{ minHeight: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataEvolucion} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradCompras" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C4895A" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#C4895A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    tickFormatter={(v: number) =>
                      v >= 1_000_000
                        ? `$${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1000
                        ? `$${(v / 1000).toFixed(0)}k`
                        : `$${v}`
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      `$${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(v)}`,
                      'Gasto'
                    ]}
                    contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA', background: '#fff' }}
                    cursor={{ stroke: '#C4895A', strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6B3A2A"
                    strokeWidth={2}
                    fill="url(#gradCompras)"
                    dot={{ r: 3, fill: '#6B3A2A', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#C4895A', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por proveedor o número..."
          value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          className="input pl-10" />
      </div>

      {/* Lista de compras */}
      {!filtradas.length ? (
        <div className="empty-state">
          <p className="text-sm font-semibold text-gray-700">Sin compras registradas</p>
          <p className="text-sm text-gray-400 mt-1">Registrá la primera con el botón de arriba</p>
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="divide-y divide-gray-100">
            {comprasPaginadas.map(c => (
              <div key={c.id} className="px-4 py-3">
              {/* Header de la compra */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">
                        #{c.id} — {c.proveedor?.nombreEmpresa}
                      </p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
                        {tipoCompraLabel[c.tipoCompra] || c.tipoCompra}
                      </span>
                      {c.saldoDeudor && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700">
                          Saldo deudor
                        </span>
                      )}
                      {c.estado === 'pagada' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-100 text-green-700">
                          Pagada
                        </span>
                      )}
                      {c.estado === 'cancelada' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-700">
                          Cancelada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatFecha(c.fechaCompra)} · {formatPesos(Number(c.total || 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {/* Botón Detalle — solo para compras directas con venta asociada */}
                  {c.tipoCompra === 'reventa_inmediata' && c.venta && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDetalleVentaModal(c.venta);
                      }}
                      className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition-colors"
                      title="Ver venta asociada"
                    >
                      <FileText size={15} />
                    </button>
                  )}
                  {c.estado === 'pendiente_pago' && (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setPagoModal(c.id);
                          setPagoForm({ metodoPago: '', cuentaDestino: '', nroComprobante: '' });
                          setErrorPago('');
                        }}
                        className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                        title="Registrar pago"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('¿Cancelar esta compra? El galpón no tiene stock disponible.')) {
                            cancelarCompra.mutate(c.id);
                          }
                        }}
                        className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                        title="Cancelar compra — sin stock"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {expandido === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {expandido === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="space-y-1.5">
                    {c.detalles?.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">{d.producto?.nombre}</span>
                        <span className="text-gray-500 text-xs">{d.cantidad} u × {formatPesos(d.precioCostoUnit)}</span>
                        <span className="font-semibold text-gray-900">{formatPesos(d.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  {c.estado === 'pagada' && c.metodoPago && (
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-xs text-green-700 font-medium">
                        Pagado con {c.metodoPago}
                        {c.cuentaDestino && ` — ${c.cuentaDestino.replace(/_/g, ' ')}`}
                        {c.nroComprobante && ` — Comp: ${c.nroComprobante}`}
                        {c.fechaPago && ` — ${formatFecha(c.fechaPago)}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          </div>
          <Pagination
            total={filtradas.length}
            pagina={pagina}
            porPagina={POR_PAGINA}
            onCambiar={p => { setPagina(p); setExpandido(null); }}
            nombreItems="compras"
          />
        </div>
      )}

      {showNueva && (
        <NuevaCompra
          onClose={() => setShowNueva(false)}
          onSuccess={() => setShowNueva(false)}
        />
      )}

      {/* Modal de pago */}
      {pagoModal !== null && (
        <div className="modal-overlay">
          <div className="modal max-w-md animate-slide-up">
            <div className="modal-header">
              <h2 className="modal-title">Registrar pago al proveedor</h2>
              <button onClick={() => setPagoModal(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm text-gray-500">
                Seleccioná cómo pagaste esta compra al proveedor.
              </p>

              <div>
                <label className="label">Método de pago</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'e_check',       label: 'E-check' },
                    { value: 'efectivo',      label: 'Efectivo' },
                  ].map(op => (
                    <button key={op.value} type="button"
                      onClick={() => setPagoForm(prev => ({
                        ...prev,
                        metodoPago: op.value as any,
                        cuentaDestino: op.value === 'e_check' ? 'banco_provincia' : ''
                      }))}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                        pagoForm.metodoPago === op.value
                          ? 'border-[#6B3A2A] bg-orange-50 text-[#6B3A2A]'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}>
                      {op.label}
                    </button>
                  ))}
                </div>

                {pagoForm.metodoPago === 'transferencia' && (
                  <div className="mt-3 space-y-2">
                    <label className="label">Cuenta desde la que transferiste</label>
                    {[
                      { value: 'cuenta_personal',     label: 'Mi cuenta personal' },
                      { value: 'mercado_pago_empresa', label: 'Mercado Pago cuenta empresa' },
                      { value: 'banco_provincia',      label: 'Banco Provincia' },
                    ].map(op => (
                      <label key={op.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100">
                        <input type="radio" name="cuentaDestinoPago" value={op.value}
                          checked={pagoForm.cuentaDestino === op.value}
                          onChange={() => setPagoForm(prev => ({ ...prev, cuentaDestino: op.value }))}
                          className="w-4 h-4" />
                        <span className="text-sm text-gray-700">{op.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {pagoForm.metodoPago === 'e_check' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="w-4 h-4" />
                    <span className="text-sm text-gray-700 font-medium">Banco Provincia</span>
                    <span className="text-xs text-gray-400">(seleccionado automáticamente)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">N° de comprobante (opcional)</label>
                <input type="text"
                  value={pagoForm.nroComprobante}
                  onChange={e => setPagoForm(prev => ({ ...prev, nroComprobante: e.target.value }))}
                  className="input" placeholder="Número de transferencia o cheque" />
              </div>

              {errorPago && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                  {errorPago}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setPagoModal(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => handlePago(pagoModal)}
                disabled={registrarPago.isPending}
                className="btn-primary"
              >
                {registrarPago.isPending ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de venta asociada */}
      {detalleVentaModal && (
        <div className="modal-overlay" onClick={() => setDetalleVentaModal(null)}>
          <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Venta asociada #{detalleVentaModal.id}</h2>
            </div>
            <div className="modal-body space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="text-sm font-medium">{detalleVentaModal.cliente.razonSocial}</p>
                  {detalleVentaModal.cliente.nombreContacto && (
                    <p className="text-xs text-gray-400">{detalleVentaModal.cliente.nombreContacto}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Estado pedido</p>
                  <p className="text-sm font-medium capitalize">{detalleVentaModal.estadoPedido.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total c/ IVA</p>
                  <p className="text-sm font-medium">
                    {detalleVentaModal.totalConIva != null
                      ? `$${Number(detalleVentaModal.totalConIva).toLocaleString('es-AR')}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Entrega estimada</p>
                  <p className="text-sm font-medium">
                    {detalleVentaModal.fechaEstimEntrega
                      ? new Date(detalleVentaModal.fechaEstimEntrega).toLocaleDateString('es-AR')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Lugar de entrega</p>
                  <p className="text-sm font-medium">{detalleVentaModal.lugarEntrega || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Método de pago</p>
                  <p className="text-sm font-medium">{detalleVentaModal.metodoPago || '—'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2">Productos</p>
                <div className="space-y-1">
                  {detalleVentaModal.detalles.map((d: { id: number; cantidadPedida: number; producto: { nombre: string; condicion: string } }) => (
                    <div key={d.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-sm">{d.producto.nombre}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 capitalize">{d.producto.condicion.replace('_', ' ')}</span>
                        <span className="text-sm font-medium">× {d.cantidadPedida}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDetalleVentaModal(null)} className="btn-primary">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
