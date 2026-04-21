import { useState } from 'react';
import { Search, AlertTriangle, History, Settings, Warehouse } from 'lucide-react';
import { useStockConsolidado, useAlertasStock } from '../../hooks/useInventario';
import AjusteStockModal from './AjusteStockModal';
import MovimientosModal from './MovimientosModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

const formatNumero = (v: number) => new Intl.NumberFormat('es-AR').format(v);

export default function InventarioPage() {
  const { data: consolidado, isLoading, error } = useStockConsolidado();
  const { data: alertas } = useAlertasStock();
  const [busqueda, setBusqueda] = useState('');
  const [ajusteData, setAjusteData] = useState<any>(null);
  const [movimientosData, setMovimientosData] = useState<any>(null);
  const [vistaAlertasOnly, setVistaAlertasOnly] = useState(false);

  const filtrado = consolidado?.filter((item: any) =>
    item.producto.nombre.toLowerCase().includes(busqueda.toLowerCase())
  ).filter((item: any) =>
    !vistaAlertasOnly || item.porGalpon.some((g: any) => g.bajoMinimo)
  );

  const totalUnidades = consolidado?.reduce((acc: number, item: any) => acc + item.stockTotalPropio, 0) || 0;
  const totalDeudor = consolidado?.reduce((acc: number, item: any) => acc + (item.stockTotalDeudor || 0), 0) || 0;
  const productosConAlerta = alertas?.length || 0;

  if (isLoading) return <LoadingSpinner texto="Cargando inventario..." />;
  if (error) return <ErrorMessage mensaje="No se pudo cargar el inventario." />;

  return (
    <div className="space-y-6">

      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Inventario</h1>
          <p className="text-sm text-gray-500 mt-1">Stock en tiempo real por galpón</p>
        </div>
        <button
          onClick={() => setMovimientosData({ id: 0, nombre: 'Todos los productos' })}
          className="btn-brand-outline"
        >
          <History size={16} /> Ver movimientos
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
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
    </div>
  );
}
