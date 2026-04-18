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

  if (isLoading) return <LoadingSpinner text="Cargando inventario..." />;
  if (isError)   return <ErrorMessage message="No se pudo cargar el inventario." />;

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
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Inventario</h1>
          <p className="text-sm text-gray-600 mt-1">Stock disponible por producto y proveedor</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Package size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Productos distintos</p>
            <p className="text-2xl font-bold text-gray-900">{totalProductos}</p>
          </div>
        </div>

        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
            <BarChart2 size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Unidades totales</p>
            <p className="text-2xl font-bold text-gray-900">{totalUnidades.toLocaleString('es-AR')}</p>
          </div>
        </div>

        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#FFFBEB', borderRadius: '0.25rem' }}>
            <TrendingDown size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Bajo mínimo</p>
            <p className="text-2xl font-bold text-gray-900">{bajosMinimo}</p>
          </div>
        </div>

        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#FEF2F2', borderRadius: '0.25rem' }}>
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Alertas activas</p>
            <p className="text-2xl font-bold text-gray-900">{totalAlertas}</p>
          </div>
        </div>
      </div>

      {/* Alertas banner */}
      {totalAlertas > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 animate-slide-in"
          style={{ borderRadius: '0.25rem' }}>
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              {totalAlertas} {totalAlertas === 1 ? 'producto bajo' : 'productos bajo'} stock mínimo
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {alertas?.slice(0, 5).map(a => (
                <span key={a.stockId} className="badge-red">
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
      <div className="card-base">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9"
              placeholder="Buscar por producto o proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setFilterAlerta(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500,
              borderRadius: '0.25rem', cursor: 'pointer', transition: 'all 0.15s',
              background: filterAlerta
                ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                : '#fff',
              color: filterAlerta ? '#fff' : '#4B5563',
              border: filterAlerta ? 'none' : '1px solid #E5E7EB',
            }}
          >
            <Filter size={14} />
            {filterAlerta ? 'Solo alertas' : 'Bajo mínimo'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="card-base flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mx-auto mb-3"
            style={{ borderRadius: '0.25rem' }}>
            <Package size={22} className="text-gray-400" />
          </div>
          <p className="titulo-card">Sin resultados</p>
          <p className="text-xs text-gray-400 mt-1">Probá con otro término de búsqueda</p>
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <td className="text-gray-600 text-sm">{s.proveedorNombre}</td>
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
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors text-xs flex items-center gap-1"
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
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 500,
                          borderRadius: '0.25rem', cursor: 'pointer', transition: 'all 0.15s',
                          border: 'none',
                          background: s.bajoMinimo
                            ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)'
                            : 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                          color: '#fff',
                        }}
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
