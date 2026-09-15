import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useCotizacion, useEditarCotizacion } from '../../hooks/useCotizaciones';
import api from '../../services/api';

interface EditarCotizacionProps {
  cotizacionId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

interface DetalleEditForm {
  key: string;           // key estable para el render (no se reordena)
  productoId: number;
  cantidad: number;
  precioUnitario: number; // solo se usa/muestra para referencia; se recalcula en backend si no es a medida
  esAMedida: boolean;
  nombre?: string;
  condicion?: string;
  esNuevo: boolean;       // true = fue agregado en esta edición
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

export default function EditarCotizacion({ cotizacionId, onClose, onSuccess }: EditarCotizacionProps) {
  const { data: cotizacion, isLoading } = useCotizacion(cotizacionId);
  const editarCotizacion = useEditarCotizacion();
  const [productos, setProductos] = useState<{ id: number; nombre: string; condicion: string; tipo: string }[]>([]);
  const [detalles, setDetalles] = useState<DetalleEditForm[]>([]);
  const [incluyeIva, setIncluyeIva] = useState(true);
  const [error, setError] = useState('');
  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    api.get('/productos').then(({ data }) => setProductos(data));
  }, []);

  // Inicializar el formulario con los detalles actuales de la cotización
  useEffect(() => {
    if (!cotizacion || inicializado) return;
    const iva = cotizacion.totalConIva != null && cotizacion.totalSinIva != null
      ? Math.abs(cotizacion.totalConIva - cotizacion.totalSinIva) > 0.5
      : true;
    setIncluyeIva(iva);
    setDetalles(
      (cotizacion.detalles ?? []).map((d: any, i: number) => ({
        key: `existente-${d.id ?? i}`,
        productoId: d.productoId,
        cantidad: d.cantidad,
        precioUnitario: Number(d.precioUnitario),
        esAMedida: !!d.esAMedida,
        nombre: d.producto?.nombre,
        condicion: d.producto?.condicion,
        esNuevo: false,
      }))
    );
    setInicializado(true);
  }, [cotizacion, inicializado]);

  const productosNoAMedida = useMemo(
    () => productos.filter(p => p.tipo !== 'a_medida' && p.tipo !== 'personalizado'),
    [productos]
  );

  const bloqueada = cotizacion?.estado === 'aceptada' || !!cotizacion?.venta;

  const addProducto = () => {
    setDetalles(prev => [
      ...prev,
      { key: `nuevo-${Date.now()}-${prev.length}`, productoId: 0, cantidad: 1, precioUnitario: 0, esAMedida: false, esNuevo: true },
    ]);
  };

  const removeProducto = (key: string) => {
    setDetalles(prev => prev.filter(d => d.key !== key));
  };

  const updateCantidad = (key: string, cantidad: number) => {
    setDetalles(prev => prev.map(d => (d.key === key ? { ...d, cantidad } : d)));
  };

  const updateProductoNuevo = (key: string, productoId: number) => {
    setDetalles(prev => prev.map(d => (d.key === key ? { ...d, productoId } : d)));
  };

  // Total estimado en el front (referencial; el backend recalcula precios de productos estándar
  // según la nueva cantidad, así que este total puede variar levemente respecto al definitivo)
  const totalSinIvaEstimado = detalles.reduce((acc, d) => acc + d.precioUnitario * d.cantidad, 0);
  const extras = (cotizacion?.totalSinIva ?? 0) - (cotizacion?.detalles ?? []).reduce(
    (acc: number, d: any) => acc + Number(d.precioUnitario) * d.cantidad, 0
  );
  const totalSinIvaConExtras = totalSinIvaEstimado + (isFinite(extras) ? extras : 0);
  const totalConIvaEstimado = incluyeIva ? totalSinIvaConExtras * 1.21 : totalSinIvaConExtras;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!detalles.length) { setError('Debe haber al menos un producto'); return; }
    const invalido = detalles.some(d => !d.productoId || !d.cantidad || d.cantidad < 1);
    if (invalido) { setError('Completá todos los productos con una cantidad válida'); return; }

    try {
      await editarCotizacion.mutateAsync({
        id: cotizacionId,
        datos: {
          incluyeIva,
          detalles: detalles.map(d => ({
            productoId: d.productoId,
            cantidad: d.cantidad,
            esAMedida: d.esAMedida,
            // Los productos "a medida" mantienen su precio unitario fijo (costo + ganancia).
            // Los productos de catálogo estándar se recalculan en el backend según la nueva cantidad.
            ...(d.esAMedida ? { precioUnitario: d.precioUnitario } : {}),
          })),
        },
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al editar la cotización');
    }
  };

  if (isLoading || !cotizacion) {
    return (
      <div className="modal-overlay">
        <div className="modal max-w-3xl animate-slide-up flex items-center justify-center" style={{ borderRadius: 0, border: '1px solid #E5E7EB', minHeight: '12rem' }}>
          <Loader2 size={24} className="animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-3xl animate-slide-up" style={{ borderRadius: 0, border: '1px solid #E5E7EB' }}>
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
          <h2 className="titulo-modulo" style={{ fontSize: '1.5rem' }}>
            Editar cotización #{cotizacionId}
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-6" style={{ padding: '1.5rem' }}>

            {bloqueada && (
              <p className="text-sm px-3.5 py-2.5" style={{ color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 0 }}>
                Esta cotización ya fue aceptada o convertida en venta, por lo que no puede editarse.
              </p>
            )}

            {/* Cliente (solo lectura) */}
            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>
                Cliente
              </label>
              <div className="input" style={{ borderRadius: 0, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', cursor: 'not-allowed' }}>
                {cotizacion.esRapida && !cotizacion.clienteId
                  ? `⚡ ${cotizacion.nombreProspecto ?? 'Prospecto'}`
                  : cotizacion.cliente?.razonSocial ?? '—'}
              </div>
              <p className="text-xs text-gray-400 mt-1">El cliente no se puede modificar una vez creada la cotización.</p>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="label mb-0" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>
                  Productos <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <button
                  type="button"
                  disabled={bloqueada}
                  onClick={addProducto}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.75rem', fontWeight: 500, padding: '0.375rem 0.75rem',
                    borderRadius: 0, border: '1px solid #E5E7EB',
                    background: '#fff', color: '#374151', cursor: bloqueada ? 'not-allowed' : 'pointer',
                    opacity: bloqueada ? 0.5 : 1, transition: 'all 0.15s'
                  }}
                >
                  <Plus size={14} /> Agregar producto
                </button>
              </div>

              <div className="space-y-2.5">
                {detalles.map(d => (
                  <div key={d.key} className="p-3 flex items-center gap-2" style={{ borderRadius: 0, border: '1px solid #ECECEC', background: '#fff' }}>
                    <div className="flex-1 min-w-0">
                      {d.esNuevo ? (
                        <select
                          value={d.productoId}
                          onChange={e => updateProductoNuevo(d.key, parseInt(e.target.value))}
                          disabled={bloqueada}
                          className="select text-xs py-2"
                          style={{ borderRadius: 0, width: '100%' }}
                        >
                          <option value={0}>Seleccioná un producto...</option>
                          {productosNoAMedida.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} — {p.condicion}</option>
                          ))}
                        </select>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {d.nombre ?? `Producto #${d.productoId}`}
                            {d.esAMedida && <span className="text-xs text-amber-600 ml-1.5">a medida</span>}
                          </p>
                          {d.condicion && <p className="text-xs text-gray-400">{d.condicion}</p>}
                        </div>
                      )}
                    </div>
                    <div style={{ width: '90px' }}>
                      <input
                        type="number"
                        min={1}
                        value={d.cantidad}
                        disabled={bloqueada}
                        onChange={e => updateCantidad(d.key, parseInt(e.target.value) || 1)}
                        className="input text-sm text-center"
                        style={{ borderRadius: 0, border: '1px solid #E5E7EB', padding: '0.4rem' }}
                      />
                    </div>
                    <div style={{ width: '110px' }} className="text-right text-sm text-gray-500 shrink-0">
                      {d.esAMedida
                        ? formatPesos(d.precioUnitario * d.cantidad)
                        : <span className="text-gray-400">se recalcula</span>}
                    </div>
                    <button
                      type="button"
                      disabled={bloqueada}
                      onClick={() => removeProducto(d.key)}
                      className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {!detalles.length && (
                  <p className="text-sm text-gray-400 text-center py-4">Sin productos. Agregá al menos uno.</p>
                )}
              </div>
            </div>

            {/* Facturación (IVA) */}
            <div className="p-3.5" style={{ borderRadius: 0, border: '1px solid #ECECEC', background: '#fff' }}>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incluyeIva}
                  disabled={bloqueada}
                  onChange={e => setIncluyeIva(e.target.checked)}
                  className="checkbox"
                />
                <span className="text-sm font-medium text-gray-700">Incluir factura (IVA 21%)</span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-6">
                {incluyeIva
                  ? 'La cotización se emitirá con factura, sumando el 21% de IVA al total.'
                  : 'La cotización se emitirá sin factura, sin sumar IVA.'}
              </p>
            </div>

            {/* Totales estimados */}
            <div className="p-3.5" style={{ borderRadius: 0, border: '1px solid #ECECEC', background: '#FAFAFA' }}>
              <div className="flex justify-between text-sm mb-1" style={{ color: '#6B7280' }}>
                <span>Subtotal</span>
                <span>{formatPesos(totalSinIvaConExtras)}</span>
              </div>
              {incluyeIva && (
                <div className="flex justify-between text-sm mb-1" style={{ color: '#9CA3AF' }}>
                  <span>IVA (21%)</span>
                  <span>{formatPesos(totalConIvaEstimado - totalSinIvaConExtras)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-2 mt-1" style={{ color: '#111827', borderTop: '1px solid #E5E7EB' }}>
                <span>Total estimado {incluyeIva ? 'con IVA' : 'sin IVA'}</span>
                <span style={{ color: '#7c4b2c', fontSize: '1.15rem' }}>{formatPesos(totalConIvaEstimado)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Los precios de productos de catálogo estándar pueden recalcularse según la nueva cantidad (escalones de precio).
              </p>
            </div>

            {error && (
              <p className="text-sm px-3.5 py-2.5" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 0 }}>
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
            <button type="button" onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
                fontWeight: 500, fontSize: '0.875rem', padding: '0.55rem 1.1rem',
                borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >Cancelar</button>
            <button type="submit" disabled={bloqueada || editarCotizacion.isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#7c4b2c',
                color: 'white', fontWeight: 500, fontSize: '0.875rem',
                padding: '0.55rem 1.1rem', borderRadius: 0, border: '1px solid #7c4b2c',
                cursor: (bloqueada || editarCotizacion.isPending) ? 'not-allowed' : 'pointer',
                opacity: (bloqueada || editarCotizacion.isPending) ? 0.6 : 1, transition: 'all 0.15s'
              }}
            >
              {editarCotizacion.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
