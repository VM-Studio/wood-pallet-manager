import { useState } from 'react';
import {
  Package, AlertTriangle, BarChart2, RefreshCw,
  TrendingDown, Search, Filter
} from 'lucide-react';
import { useStockConsolidado, useAlertasStock } from '../../hooks/useInventario';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import AjusteStockModal from './AjusteStockModal';
import MovimientosModal from './MovimientosModal';
import { clsx } from 'clsx';

interface StockConsolidado {
  productoId: number;
  proveedorId: number;
  productoNombre: string;
  proveedorNombre: string;
  cantidadDisponible: number;
  cantidadMinima?: number;
  bajoMinimo?: boolean;
  stockId: number;
}

interface AlertaStock {
  stockId: number;
  productoId: number;
  productoNombre: string;
  proveedorNombre: string;
  cantidadDisponible: number;
  cantidadMinima: number;
}

interface AjusteData {
  stockId: number;
  productoNombre: string;
  proveedorNombre: string;
  cantidadActual: number;
}

interface MovimientosData {
  productoId: number;
  productoNombre: string;
}

export default function InventarioPage() {
  const { data: stocks, isLoading, isError } = useStockConsolidado() as {
    data: StockConsolidado[] | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  const { data: alertas } = useAlertasStock() as {
    data: AlertaStock[] | undefined;
  };

  const [search, setSearch] = useState('');
  const [filterAlerta, setFilterAlerta] = useState(false);
  const [ajuste, setAjuste] = useState<AjusteData | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientosData | null>(null);

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Cargando inventario..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorMessage message="No se pudo cargar el inventario." />
      </div>
    );
  }

  const totalUnidades = stocks?.reduce((s, i) => s + i.cantidadDisponible, 0) ?? 0;
  const totalAlertas = alertas?.length ?? 0;
  const totalProductos = new Set(stocks?.map(s => s.productoId)).size;
  const bajosMinimo = stocks?.filter(s => s.bajoMinimo).length ?? 0;

  const filtered = stocks?.filter(s => {
    const matchSearch =
      s.productoNombre.toLowerCase().includes(search.toLowerCase()) ||
      s.proveedorNombre.toLowerCase().includes(search.toLowerCase());
    const matchAlerta = filterAlerta ? s.bajoMinimo : true;
    return matchSearch && matchAlerta;
  }) ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="page-subtitle">Stock disponible por producto y proveedor</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kpi-card kpi-blue">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Productos distintos</p>
              <p className="text-2xl font-bold text-gray-900">{totalProductos}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-teal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
              <BarChart2 size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Unidades totales</p>
              <p className="text-2xl font-bold text-gray-900">{totalUnidades.toLocaleString('es-AR')}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-amber">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <TrendingDown size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bajo mínimo</p>
              <p className="text-2xl font-bold text-gray-900">{bajosMinimo}</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-red">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Alertas activas</p>
              <p className="text-2xl font-bold text-gray-900">{totalAlertas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas banner */}
      {totalAlertas > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-slide-in">
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {totalAlertas} {totalAlertas === 1 ? 'producto bajo' : 'productos bajo'} stock mínimo
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {alertas?.slice(0, 5).map(a => (
                <span key={a.stockId} className="badge-red text-xs">
                  {a.productoNombre} — {a.cantidadDisponible}/{a.cantidadMinima}
                </span>
              ))}
              {(alertas?.length ?? 0) > 5 && (
                <span className="text-xs text-red-500">
                  +{(alertas?.length ?? 0) - 5} más
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card card-p mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por producto o proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFilterAlerta(v => !v)}
            className={clsx('btn-secondary flex items-center gap-2', filterAlerta && 'border-red-300 text-red-600')}
          >
            <Filter size={15} />
            {filterAlerta ? 'Solo alertas ✓' : 'Bajo mínimo'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Package size={24} /></div>
          <p className="text-sm text-gray-500">No se encontraron resultados</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Proveedor</th>
                <th className="text-right">Disponible</th>
                <th className="text-right">Mínimo</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={`${s.productoId}-${s.proveedorId}`}>
                  <td className="font-medium text-gray-900">{s.productoNombre}</td>
                  <td className="text-gray-600">{s.proveedorNombre}</td>
                  <td className="text-right font-semibold">
                    {s.cantidadDisponible.toLocaleString('es-AR')}
                  </td>
                  <td className="text-right text-gray-500">
                    {s.cantidadMinima?.toLocaleString('es-AR') ?? '—'}
                  </td>
                  <td>
                    {s.bajoMinimo ? (
                      <span className="badge-red">Bajo mínimo</span>
                    ) : (
                      <span className="badge-green">OK</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setMovimientos({ productoId: s.productoId, productoNombre: s.productoNombre })}
                        className="btn-ghost text-xs flex items-center gap-1"
                      >
                        <RefreshCw size={13} /> Movimientos
                      </button>
                      <button
                        onClick={() => setAjuste({
                          stockId: s.stockId,
                          productoNombre: s.productoNombre,
                          proveedorNombre: s.proveedorNombre,
                          cantidadActual: s.cantidadDisponible
                        })}
                        className={clsx('text-xs flex items-center gap-1', s.bajoMinimo ? 'btn-danger' : 'btn-secondary')}
                      >
                        Ajustar stock
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {ajuste && (
        <AjusteStockModal
          stockId={ajuste.stockId}
          productoNombre={ajuste.productoNombre}
          proveedorNombre={ajuste.proveedorNombre}
          cantidadActual={ajuste.cantidadActual}
          onClose={() => setAjuste(null)}
        />
      )}
      {movimientos && (
        <MovimientosModal
          productoId={movimientos.productoId}
          productoNombre={movimientos.productoNombre}
          onClose={() => setMovimientos(null)}
        />
      )}
    </div>
  );
}
