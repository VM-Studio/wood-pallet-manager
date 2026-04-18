import { useState } from 'react';
import { Plus, Search, DollarSign, Pencil, Package, Layers, Ruler, Weight, AlertTriangle, Leaf, Trash2 } from 'lucide-react';
import { useProductos, useEliminarProducto } from '../../hooks/useProductos';
import type { Producto } from '../../types';
import ProductoForm from './ProductoForm';
import PreciosModal from './PreciosModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

const tipoLabel: Record<string, string> = {
  estandar:    'Estándar',
  reforzado:   'Reforzado',
  liviano:     'Liviano',
  exportacion: 'Exportación',
  carton:      'Cartón',
  a_medida:    'A medida'
};

const condicionBadge: Record<string, string> = {
  nuevo:     'badge-green',
  seminuevo: 'badge-yellow',
  usado:     'badge-gray'
};

const condicionLabel: Record<string, string> = {
  nuevo:     'Nuevo',
  seminuevo: 'Semi-nuevo',
  usado:     'Usado'
};

export default function ProductosPage() {
  const { data: productos, isLoading, isError } = useProductos();
  const eliminarProducto = useEliminarProducto();
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [productoEditar, setProductoEditar] = useState<Producto | null>(null);
  const [preciosProducto, setPreciosProducto] = useState<Producto | null>(null);

  const filtrados = productos?.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const stockTotal = (p: Producto) =>
    p.stocks?.reduce((acc, s) => acc + s.cantidadDisponible, 0) ?? 0;

  const precioBase = (p: Producto): number | null => {
    if (!p.listaPrecios?.length) return null;
    const sorted = [...p.listaPrecios].sort((a, b) => a.cantMinima - b.cantMinima);
    return sorted[0]?.precioUnitario ?? null;
  };

  if (isLoading) return <LoadingSpinner text="Cargando productos..." />;
  if (isError)   return <ErrorMessage message="No se pudieron cargar los productos." />;

  const stockTotalGlobal = productos?.reduce((acc, p) => acc + stockTotal(p), 0) ?? 0;
  const conPrecios = productos?.filter(p => p.listaPrecios?.length).length ?? 0;

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Productos y Precios</h1>
          <p className="text-sm text-gray-600 mt-1">{productos?.length ?? 0} productos en el catálogo</p>
        </div>
        <button
          onClick={() => { setProductoEditar(null); setShowForm(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <Plus size={16} />
          Nuevo producto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
            <Package size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{productos?.length ?? 0}</p>
            <p className="text-xs text-gray-500">Productos activos</p>
          </div>
        </div>
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Layers size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stockTotalGlobal}</p>
            <p className="text-xs text-gray-500">Unidades en stock</p>
          </div>
        </div>
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
            <DollarSign size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{conPrecios}</p>
            <p className="text-xs text-gray-500">Con precios configurados</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar producto por nombre o tipo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Grid */}
      {!filtrados?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mx-auto mb-3"
            style={{ borderRadius: '0.25rem' }}>
            <Package size={22} className="text-gray-400" />
          </div>
          <p className="titulo-card">Sin productos</p>
          <p className="text-xs text-gray-400 mt-1">
            {busqueda ? 'Probá con otro término de búsqueda' : 'Creá el primero con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(p => {
            const stock = stockTotal(p);
            const precio = precioBase(p);
            const tieneEscalones = (p.listaPrecios?.length ?? 0) > 1;
            const bajoMinimo = p.stocks?.some(s => s.cantidadDisponible <= (s.cantidadMinima ?? 0));

            return (
              <div key={p.id} className="card-base transition-all hover:shadow-md">

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={condicionBadge[p.condicion] ?? 'badge-gray'}>
                        {condicionLabel[p.condicion] ?? p.condicion}
                      </span>
                      {p.requiereSenasa && (
                        <span className="badge-teal flex items-center gap-1">
                          <Leaf size={10} /> SENASA
                        </span>
                      )}
                    </div>
                    <h3 className="titulo-card">{p.nombre}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{tipoLabel[p.tipo] ?? p.tipo}</p>
                  </div>
                </div>

                {/* Dimensiones */}
                {(p.dimensionLargo || p.dimensionAncho || p.cargaMaximaKg) && (
                  <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                    {p.dimensionLargo && p.dimensionAncho && (
                      <span className="flex items-center gap-1">
                        <Ruler size={11} className="text-gray-400" />
                        {p.dimensionLargo} × {p.dimensionAncho} mm
                      </span>
                    )}
                    {p.cargaMaximaKg && (
                      <span className="flex items-center gap-1">
                        <Weight size={11} className="text-gray-400" />
                        {p.cargaMaximaKg} kg máx.
                      </span>
                    )}
                  </div>
                )}

                {/* Stock */}
                <div className={clsx(
                  'flex items-center justify-between px-3 py-2 mb-3 text-sm',
                  bajoMinimo
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-100'
                )} style={{ borderRadius: '0.25rem' }}>
                  <span className="text-gray-500 text-xs">Stock disponible</span>
                  <span className={clsx('font-bold flex items-center gap-1', bajoMinimo ? 'text-red-600' : 'text-gray-900')}>
                    {bajoMinimo && <AlertTriangle size={12} />}
                    {stock} unidades
                  </span>
                </div>

                {/* Precio base */}
                {precio != null ? (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-gray-400">Precio base</span>
                      {tieneEscalones && (
                        <span className="text-xs font-medium" style={{ color: '#C4895A' }}>
                          {p.listaPrecios?.length} escalones
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold" style={{ color: '#6B3A2A' }}>
                      ${new Intl.NumberFormat('es-AR').format(precio)}
                      <span className="text-xs font-normal text-gray-400 ml-1">+ IVA / u</span>
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5"
                      style={{ borderRadius: '0.25rem' }}>
                      <AlertTriangle size={12} />
                      Sin precio configurado
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setPreciosProducto(p)}
                    style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: '5px',
                      background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                      color: 'white', fontWeight: 500, fontSize: '0.75rem',
                      padding: '0.375rem 0.75rem', borderRadius: '0.25rem',
                      border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)';
                    }}
                  >
                    <DollarSign size={13} /> Precios
                  </button>
                  <button
                    onClick={() => { setProductoEditar(p); setShowForm(true); }}
                    style={{
                      flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      gap: '5px', fontSize: '0.75rem', fontWeight: 500,
                      padding: '0.375rem 0.75rem', borderRadius: '0.25rem',
                      border: '1px solid #E5E7EB', background: '#fff',
                      color: '#4B5563', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#F9FAFB';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                    }}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) {
                        eliminarProducto.mutate(p.id);
                      }
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: '2rem', height: '2rem', borderRadius: '0.25rem',
                      border: '1px solid #E5E7EB', background: '#fff',
                      color: '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = '#FEF2F2';
                      (e.currentTarget as HTMLElement).style.color = '#DC2626';
                      (e.currentTarget as HTMLElement).style.borderColor = '#FECACA';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = '#fff';
                      (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
                      (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB';
                    }}
                    title="Eliminar producto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <ProductoForm
          producto={productoEditar ?? undefined}
          onClose={() => { setShowForm(false); setProductoEditar(null); }}
        />
      )}

      {preciosProducto && (
        <PreciosModal
          productoId={preciosProducto.id}
          productoNombre={preciosProducto.nombre}
          onClose={() => setPreciosProducto(null)}
        />
      )}
    </div>
  );
}
