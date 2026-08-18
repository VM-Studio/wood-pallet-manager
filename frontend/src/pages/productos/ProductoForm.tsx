import { useState } from 'react';
import { X } from 'lucide-react';
import { useCrearProducto, useActualizarProducto } from '../../hooks/useProductos';
import { useSetStockProducto } from '../../hooks/useInventario';
import type { Producto } from '../../types';

interface ProductoFormProps {
  producto?: Producto;
  onClose: () => void;
}

export default function ProductoForm({ producto, onClose }: ProductoFormProps) {
  const esEdicion = !!producto;
  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const setStockProducto = useSetStockProducto();
  const [error, setError] = useState('');

  // Stock actual sumando todos los registros
  const stockActual = producto?.stocks?.reduce((acc, s) => acc + s.cantidadDisponible, 0) ?? 0;

  const [form, setForm] = useState({
    nombre:           producto?.nombre         ?? '',
    tipo:             producto?.tipo           ?? 'estandar',
    condicion:        producto?.condicion      ?? 'seminuevo',
    dimensionLargo:   producto?.dimensionLargo != null ? String(producto.dimensionLargo) : '',
    dimensionAncho:   producto?.dimensionAncho != null ? String(producto.dimensionAncho) : '',
    cargaMaximaKg:    producto?.cargaMaximaKg  != null ? String(producto.cargaMaximaKg)  : '',
    stockDisponible:  esEdicion ? String(stockActual) : '',
    descripcion:      producto?.descripcion    ?? ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const datos: Partial<Producto> = {
      nombre:           form.nombre,
      tipo:             form.tipo,
      condicion:        form.condicion,
      descripcion:      form.descripcion || undefined,
      dimensionLargo:   form.dimensionLargo ? parseInt(form.dimensionLargo) : undefined,
      dimensionAncho:   form.dimensionAncho ? parseInt(form.dimensionAncho) : undefined,
      cargaMaximaKg:    form.cargaMaximaKg  ? parseInt(form.cargaMaximaKg)  : undefined,
    };
    try {
      if (esEdicion) {
        await actualizar.mutateAsync({ id: producto.id, datos });
        // Si el stock cambió, actualizar vía endpoint dedicado
        const nuevoStock = form.stockDisponible !== '' ? parseInt(form.stockDisponible) : stockActual;
        if (nuevoStock !== stockActual) {
          await setStockProducto.mutateAsync({ productoId: producto.id, cantidad: nuevoStock });
        }
      } else {
        await crear.mutateAsync(datos);
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al guardar el producto');
    }
  };

  const loading = crear.isPending || actualizar.isPending || setStockProducto.isPending;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up" style={{ borderRadius: 0, border: '1px solid #E5E7EB' }}>
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
          <h2 className="titulo-modulo" style={{ fontSize: '1.5rem' }}>
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4" style={{ padding: '1.5rem' }}>
            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="input"
                style={{ borderRadius: 0 }}
                placeholder="Ej: Pallet Reforzado"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => {
                    const tipo = e.target.value;
                    setForm({
                      ...form,
                      tipo,
                      // Si cambia a personalizado, limpiar medidas
                      ...(tipo === 'personalizado' && {
                        dimensionLargo: '',
                        dimensionAncho: '',
                        cargaMaximaKg: '',
                      }),
                    });
                  }}
                  className="select"
                  style={{ borderRadius: 0 }}
                >
                  <option value="estandar">Estándar</option>
                  <option value="reforzado">Reforzado</option>
                  <option value="liviano">Liviano</option>
                  <option value="exportacion">Exportación</option>
                  <option value="carton">Cartón</option>
                  <option value="a_medida">A medida</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Condición</label>
                <select
                  value={form.condicion}
                  onChange={e => setForm({ ...form, condicion: e.target.value })}
                  className="select"
                  style={{ borderRadius: 0 }}
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="seminuevo">Semi-nuevo</option>
                </select>
              </div>
            </div>
            {form.tipo === 'personalizado' ? (
              <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-none text-sm text-amber-700">
                <span className="text-base">📐</span>
                <span>Las medidas son personalizadas — se definen en cada cotización.</span>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Largo (mm)</label>
                <input
                  type="number"
                  value={form.dimensionLargo}
                  onChange={e => setForm({ ...form, dimensionLargo: e.target.value })}
                  className="input"
                  style={{ borderRadius: 0 }}
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Ancho (mm)</label>
                <input
                  type="number"
                  value={form.dimensionAncho}
                  onChange={e => setForm({ ...form, dimensionAncho: e.target.value })}
                  className="input"
                  style={{ borderRadius: 0 }}
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Carga máx. (kg)</label>
                <input
                  type="number"
                  value={form.cargaMaximaKg}
                  onChange={e => setForm({ ...form, cargaMaximaKg: e.target.value })}
                  className="input"
                  style={{ borderRadius: 0 }}
                  placeholder="1500"
                />
              </div>
            </div>
            )}
            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Stock disponible</label>
              <input
                type="number"
                min="0"
                value={form.stockDisponible}
                onChange={e => setForm({ ...form, stockDisponible: e.target.value })}
                className="input"
                style={{ borderRadius: 0 }}
                placeholder="0"
              />
            </div>
            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className="input resize-none"
                style={{ borderRadius: 0 }}
                rows={2}
              />
            </div>
            {error && (
              <p className="text-sm" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 0, padding: '0.625rem 0.875rem' }}>
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
