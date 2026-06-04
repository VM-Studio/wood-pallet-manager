import { useState, useMemo } from 'react';
import { Search, AlertTriangle, History, Settings, Warehouse, Trash2 } from 'lucide-react';
import { useStockConsolidado, useAlertasStock, useMovimientosStock } from '../../hooks/useInventario';
import { useCompras } from '../../hooks/useCompras';
import { useEliminarProducto } from '../../hooks/useProductos';
import AjusteStockModal from './AjusteStockModal';
import MovimientosModal from './MovimientosModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area,
} from 'recharts';

const formatNumero = (v: number) => new Intl.NumberFormat('es-AR').format(v);

export default function InventarioPage() {
  const { data: consolidado, isLoading, error } = useStockConsolidado();
  const { data: alertas } = useAlertasStock();
  const { data: compras } = useCompras();
  const { data: movimientos } = useMovimientosStock();
  const [busqueda, setBusqueda] = useState('');
  const eliminarProducto = useEliminarProducto();
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);
  const [ajusteData, setAjusteData] = useState<any>(null);
  const [movimientosData, setMovimientosData] = useState<any>(null);
  const [vistaAlertasOnly, setVistaAlertasOnly] = useState(false);

  // ── Chart 1: Stock propio actual por producto ──────────────────────────
  const dataStockPropio = useMemo(() => {
    if (!consolidado) return [];
    return [...consolidado]
      .filter((item: any) => item.stockTotalPropio > 0)
      .map((item: any) => ({ name: item.producto.nombre, stock: item.stockTotalPropio }))
      .sort((a: any, b: any) => b.stock - a.stock)
      .slice(0, 10);
  }, [consolidado]);

  // ── Chart 2: Unidades compradas por producto — stock propio vs reventa ─
  const dataComprasPorProducto = useMemo(() => {
    if (!compras) return [];
    const mapa: Record<string, { propio: number; reventa: number }> = {};
    compras
      .filter((c: any) => c.estado !== 'cancelada')
      .forEach((c: any) => {
        c.detalles?.forEach((d: any) => {
          const nombre = d.producto?.nombre ?? 'Sin nombre';
          if (!mapa[nombre]) mapa[nombre] = { propio: 0, reventa: 0 };
          if (c.tipoCompra === 'stock_propio')      mapa[nombre].propio   += d.cantidad;
          if (c.tipoCompra === 'reventa_inmediata') mapa[nombre].reventa  += d.cantidad;
        });
      });
    return Object.entries(mapa)
      .map(([name, v]) => ({ name, 'Stock propio': v.propio, 'Reventa directa': v.reventa }))
      .filter(d => d['Stock propio'] + d['Reventa directa'] > 0)
      .sort((a, b) => (b['Stock propio'] + b['Reventa directa']) - (a['Stock propio'] + a['Reventa directa']))
      .slice(0, 8);
  }, [compras]);

  // ── Chart 3: Entradas vs salidas de stock por mes (últimos 6 meses) ───
  const dataMovimientosMes = useMemo(() => {
    if (!movimientos) return [];
    const mapa: Record<string, { entradas: number; salidas: number }> = {};
    (movimientos as any[]).forEach((m: any) => {
      const d = new Date(m.fecha);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!mapa[key]) mapa[key] = { entradas: 0, salidas: 0 };
      if (m.tipoMovimiento === 'entrada') mapa[key].entradas += m.cantidad;
      if (m.tipoMovimiento === 'salida')  mapa[key].salidas  += m.cantidad;
    });
    return Object.entries(mapa)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, v]) => {
        const [yr, mo] = key.split('-');
        const label = new Date(parseInt(yr), parseInt(mo) - 1)
          .toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
        return { name: label, Entradas: v.entradas, Salidas: v.salidas };
      });
  }, [movimientos]);

  const filtrado = consolidado?.filter((item: any) =>
    item.producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ).filter((item: any) =>
    !vistaAlertasOnly || item.porGalpon.some((g: any) => g.bajoMinimo)
  );

  const totalUnidades = consolidado?.reduce((acc: number, item: any) => acc + item.stockTotalPropio, 0) || 0;
  const totalDeudor = consolidado?.reduce((acc: number, item: any) => acc + (item.stockTotalDeudor || 0), 0) || 0;
  const productosConAlerta = alertas?.length || 0;

  if (isLoading) return <LoadingSpinner text="Cargando inventario..." />;
  if (error) return <ErrorMessage message="No se pudo cargar el inventario." />;

  return (
    <div className="space-y-6">

      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Stock en tiempo real por galpón</p>
        </div>
        <button
          onClick={() => setMovimientosData({ id: 0, nombre: 'Todos los productos' })}
          className="btn-brand"
        >
          <History size={16} /> Ver movimientos
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card-kpi">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
              <Warehouse size={18} />
            </div>
            <p className="titulo-card">Stock propio</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatNumero(totalUnidades)}</p>
          <p className="text-xs text-gray-400 mt-1">unidades disponibles</p>
        </div>
        <div className={clsx('card-kpi', totalDeudor > 0 && 'border-l-4 border-l-amber-400')}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
              <AlertTriangle size={18} />
            </div>
            <p className="titulo-card">Saldo deudor</p>
          </div>
          <p className={clsx('text-3xl font-bold', totalDeudor > 0 ? 'text-amber-600' : 'text-gray-900')}>
            {formatNumero(totalDeudor)}
          </p>
          <p className="text-xs text-gray-400 mt-1">unidades pendientes de pago</p>
        </div>
        <div className={clsx('card-kpi', productosConAlerta > 0 && 'border-l-4 border-l-red-400')}>
          <div className="flex items-center gap-3 mb-3">
            <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', productosConAlerta > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500')}>
              <AlertTriangle size={18} />
            </div>
            <p className="titulo-card">Bajo mínimo</p>
          </div>
          <p className={clsx('text-3xl font-bold', productosConAlerta > 0 ? 'text-red-600' : 'text-gray-900')}>
            {productosConAlerta}
          </p>
          <p className="text-xs text-gray-400 mt-1">productos bajo el mínimo</p>
        </div>
      </div>

      {/* ── Gráficos ──────────────────────────────────────────────────── */}
      {consolidado && consolidado.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Gráfico 1 — Stock actual por producto (horizontal) */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-3">Stock propio por producto</p>
            {dataStockPropio.length > 0 ? (
              <ResponsiveContainer width="100%" height={dataStockPropio.length * 28 + 16}>
                <BarChart data={dataStockPropio} layout="vertical"
                  margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => formatNumero(v)} />
                  <YAxis type="category" dataKey="name" width={96}
                    tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    formatter={(v: number) => [formatNumero(v), 'Unidades']} />
                  <Bar dataKey="stock" fill="#7c4b2c" radius={[0, 3, 3, 0]} maxBarSize={14} isAnimationActive={false}>
                    {dataStockPropio.map((_: any, i: number) => (
                      <Cell key={i} fill={['#6B3A2A', '#7c4b2c', '#9B5535', '#C4895A'][i % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 my-auto text-center">Sin stock propio registrado</p>
            )}
          </div>

          {/* Gráfico 2 — Compras: stock propio vs reventa directa por producto */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-2">Compras: stock propio vs reventa</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#6B3A2A', display: 'inline-block' }} />
                Stock propio
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#C4895A', display: 'inline-block' }} />
                Reventa directa
              </span>
            </div>
            {dataComprasPorProducto.length > 0 ? (
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={dataComprasPorProducto}
                  margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name"
                    tick={{ fontSize: 9, fill: '#9CA3AF' }}
                    axisLine={false} tickLine={false}
                    angle={-30} textAnchor="end" interval={0}
                    tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatNumero(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    formatter={(v: number) => [formatNumero(v), '']} />
                  <Bar dataKey="Stock propio"    fill="#6B3A2A" radius={[2, 2, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="Reventa directa" fill="#C4895A" radius={[2, 2, 0, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 my-auto text-center">Sin compras registradas</p>
            )}
          </div>

          {/* Gráfico 3 — Entradas vs Salidas de stock por mes */}
          <div className="card-kpi flex flex-col" style={{ minHeight: 220 }}>
            <p className="titulo-card mb-2">Movimientos por mes</p>
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#7c4b2c', display: 'inline-block' }} />
                Entradas
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span style={{ width: 8, height: 8, borderRadius: 2, background: '#C4895A', display: 'inline-block' }} />
                Salidas
              </span>
            </div>
            {dataMovimientosMes.length > 0 ? (
              <ResponsiveContainer width="100%" height={176}>
                <AreaChart data={dataMovimientosMes}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradEnt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#7c4b2c" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#7c4b2c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#C4895A" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#C4895A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatNumero(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }}
                    formatter={(v: number) => [formatNumero(v), '']} />
                  <Area type="monotone" dataKey="Entradas"
                    stroke="#7c4b2c" strokeWidth={2} fill="url(#gradEnt)" dot={{ r: 3, fill: '#7c4b2c' }} />
                  <Area type="monotone" dataKey="Salidas"
                    stroke="#C4895A" strokeWidth={2} fill="url(#gradSal)" dot={{ r: 3, fill: '#C4895A' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400 my-auto text-center">Sin movimientos registrados</p>
            )}
          </div>

        </div>
      )}

      {/* Alertas */}
      {alertas && alertas.length > 0 && (
        <div className="card-base border-l-4 border-l-red-400">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="text-sm font-semibold text-red-700">
              {alertas.length} producto{alertas.length > 1 ? 's' : ''} bajo el mínimo configurado
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {alertas.map((a: any) => (
              <div key={a.stockId} className="flex items-center justify-between p-2.5 bg-red-50 rounded-xl border border-red-100">
                <div>
                  <p className="text-sm font-semibold text-red-800">{a.producto.nombre}</p>
                  <p className="text-xs text-red-500">{a.proveedor.nombreEmpresa}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-700">{a.cantidadDisponible} u</p>
                  <p className="text-xs text-red-400">mín. {a.cantidadMinima} u</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar producto..." value={busqueda}
            onChange={e => setBusqueda(e.target.value)} className="input pl-10" />
        </div>
        <button
          onClick={() => setVistaAlertasOnly(!vistaAlertasOnly)}
          className={clsx('btn-md transition-all', vistaAlertasOnly ? 'btn-brand' : 'btn-secondary')}
        >
          <AlertTriangle size={15} />
          {vistaAlertasOnly ? 'Ver todos' : 'Solo alertas'}
        </button>
      </div>

      {/* Grid de productos en inventario */}
      {!filtrado?.length ? (
        <div className="empty-state">
          <div className="empty-icon"><Warehouse size={24} /></div>
          <p className="text-sm font-semibold text-gray-700">Sin stock registrado</p>
          <p className="text-sm text-gray-400 mt-1">El stock se actualiza automáticamente al registrar compras</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrado.map((item: any) => {
            const tieneAlerta = item.porGalpon.some((g: any) => g.bajoMinimo);
            const tieneDeudor = item.stockTotalDeudor > 0;

            return (
              <div key={item.producto.id} className={clsx('card-base', tieneAlerta && 'border-l-4 border-l-red-400')}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{item.producto.nombre}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {item.producto.tipo} · {item.producto.condicion}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {tieneAlerta && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-700">
                        Stock bajo
                      </span>
                    )}
                    <button
                      onClick={() => setConfirmEliminar(item.producto.id)}
                      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar producto"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Stock propio */}
                <div className={clsx(
                  'p-3 rounded-xl mb-3 text-center',
                  tieneAlerta ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                )}>
                  <p className="text-xs text-gray-500 mb-1">Stock propio</p>
                  <p className={clsx('text-3xl font-bold', tieneAlerta ? 'text-red-600' : 'text-gray-900')}>
                    {formatNumero(item.stockTotalPropio)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">unidades disponibles</p>
                </div>

                {/* Saldo deudor si existe */}
                {tieneDeudor && (
                  <div className="p-2.5 rounded-xl mb-3 bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-700">Saldo deudor</p>
                    <p className="text-sm font-bold text-amber-700">{formatNumero(item.stockTotalDeudor)} u pendientes de pago</p>
                  </div>
                )}

                {/* Por galpón */}
                <div className="space-y-2 mb-4">
                  {item.porGalpon.map((g: any, i: number) => (
                    <div key={i} className={clsx(
                      'flex items-center justify-between p-2.5 rounded-xl border',
                      g.bajoMinimo ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
                    )}>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 truncate max-w-[140px]">
                          {g.proveedor.nombreEmpresa}
                        </p>
                        {g.cantidadMinima && (
                          <p className="text-xs text-gray-400">Mín: {g.cantidadMinima} u</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={clsx('text-sm font-bold', g.bajoMinimo ? 'text-red-600' : 'text-gray-900')}>
                          {formatNumero(g.cantidadDisponible)} u
                        </p>
                        {g.cantidadDeudora > 0 && (
                          <p className="text-xs text-amber-600 font-medium">+{formatNumero(g.cantidadDeudora)} deudoras</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setMovimientosData({ id: item.producto.id, nombre: item.producto.nombre })}
                    className="btn-secondary flex-1 justify-center text-xs py-2"
                  >
                    <History size={13} /> Movimientos
                  </button>
                  {item.porGalpon.map((g: any, i: number) => (
                    <button key={i}
                      onClick={() => setAjusteData({
                        stockId: g.stockId,
                        productoNombre: item.producto.nombre,
                        proveedorNombre: g.proveedor.nombreEmpresa,
                        cantidadActual: g.cantidadDisponible
                      })}
                      className="btn-secondary flex-1 justify-center text-xs py-2"
                    >
                      <Settings size={13} /> Ajustar
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {ajusteData && (
        <AjusteStockModal
          stockId={ajusteData.stockId}
          productoNombre={ajusteData.productoNombre}
          proveedorNombre={ajusteData.proveedorNombre}
          cantidadActual={ajusteData.cantidadActual}
          onClose={() => setAjusteData(null)}
        />
      )}
      {movimientosData && (
        <MovimientosModal
          productoId={movimientosData.id || undefined}
          productoNombre={movimientosData.nombre}
          onClose={() => setMovimientosData(null)}
        />
      )}

      {confirmEliminar !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-2">¿Eliminar producto?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Esta acción eliminará el producto y todo su historial de stock del sistema. No se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmEliminar(null)}
                className="btn-secondary flex-1 justify-center"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await eliminarProducto.mutateAsync(confirmEliminar);
                  setConfirmEliminar(null);
                }}
                disabled={eliminarProducto.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 size={14} /> {eliminarProducto.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
