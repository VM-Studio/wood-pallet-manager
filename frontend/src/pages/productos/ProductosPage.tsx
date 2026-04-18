import { useState } from 'react';
import { Plus, Search, DollarSign, Pencil, Package, Layers } from 'lucide-react';
import { useProductos } from '../../hooks/useProductos';
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

  if (isLoading) return <div className="p-8"><LoadingSpinner text="Cargando productos..." /></div>;
  if (isError)  return <div className="p-8"><ErrorMessage message="No se pudieron cargar los productos." /></div>;

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Productos y Precios</h1>
          <p className="page-subtitle">{productos?.length ?? 0} productos en el catálogo</p>
        </div>
        <button
          onClick={() => { setProductoEditar(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-p flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <Package size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{productos?.length ?? 0}</p>
            <p className="text-xs text-gray-500">Productos activos</p>
          </div>
        </div>
        <div className="card-p flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <Layers size={20} className="text-teal-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {productos?.reduce((acc, p) => acc + stockTotal(p), 0) ?? 0}
            </p>
            <p className="text-xs text-gray-500">Unidades en stock</p>
          </div>
        </div>
        <div className="card-p flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <DollarSign size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {productos?.filter(p => p.listaPrecios?.length).length ?? 0}
            </p>
            <p className="text-xs text-gray-500">Con precios configurados</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Grid */}
      {!filtrados?.length ? (
        <div className="empty-state">
          <div className="empty-icon"><Package size={24} /></div>
          <p className="text-sm font-semibold text-gray-700">Sin productos</p>
          <p className="text-sm text-gray-400 mt-1">Creá el primero con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(p => {
            const stock = stockTotal(p);
            const precio = precioBase(p);
            const tieneEscalones = (p.listaPrecios?.length ?? 0) > 1;
            const bajoMinimo = p.stocks?.some(s => s.cantidadDisponible <= (s.cantidadMinima ?? 0));

            return (
              <div key={p.id} className="card-p hover:shadow-card-hover transition-all duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={condicionBadge[p.condicion] ?? 'badge-gray'}>
                        {condicionLabel[p.condicion] ?? p.condicion}
                      </span>
                      {p.requiereSenasa && (
                        <span className="badge-teal">🌿 SENASA</span>
                      )}
                    </div>
                    <h3 className="font-bold text-gray-900 text-base">{p.nombre}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{tipoLabel[p.tipo] ?? p.tipo}</p>
                  </div>
                </div>

                {/* Dimensiones */}
                {(p.dimensionLargo || p.dimensionAncho) && (
                  <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                    {p.dimensionLargo && p.dimensionAncho && (
                      <span>📐 {p.dimensionLargo} × {p.dimensionAncho} mm</span>
                    )}
                    {p.cargaMaximaKg && (
                      <span>⚖️ {p.cargaMaximaKg} kg máx.</span>
                    )}
                  </div>
                )}

                {/* Stock */}
                <div className={clsx(
                  'flex items-center justify-between p-2.5 rounded-xl mb-3 text-sm',
                  bajoMinimo ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                )}>
                  <span className="text-gray-500 text-xs">Stock disponible</span>
                  <span className={clsx('font-bold', bajoMinimo ? 'text-red-600' : 'text-gray-900')}>
                    {bajoMinimo && '⚠️ '}{stock} unidades
                  </span>
                </div>

                {/* Precio base */}
                {precio != null ? (
                  <div className="mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Precio base</span>
                      {tieneEscalones && (
                        <span className="text-xs text-[#16A34A] font-medium">
                          {p.listaPrecios?.length} escalones
                        </span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-[#16A34A]">
                      ${new Intl.NumberFormat('es-AR').format(precio)}
                      <span className="text-xs font-normal text-gray-400 ml-1">+ IVA / u</span>
                    </p>
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg">
                      ⚠️ Sin precio configurado
                    </p>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setPreciosProducto(p)}
                    className="btn-secondary flex-1 justify-center text-xs py-2"
                  >
                    <DollarSign size={14} /> Precios
                  </button>
                  <button
                    onClick={() => { setProductoEditar(p); setShowForm(true); }}
                    className="btn-ghost flex-1 justify-center text-xs py-2"
                  >
                    <Pencil size={14} /> Editar
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
