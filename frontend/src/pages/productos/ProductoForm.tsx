import { useState } from 'react';
import { X, Package } from 'lucide-react';
import { useCrearProducto, useActualizarProducto } from '../../hooks/useProductos';
import type { Producto } from '../../types';

interface ProductoFormProps {
  producto?: Producto;
  onClose: () => void;
}

export default function ProductoForm({ producto, onClose }: ProductoFormProps) {
  const esEdicion = !!producto;
  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre:           producto?.nombre         ?? '',
    tipo:             producto?.tipo           ?? 'estandar',
    condicion:        producto?.condicion      ?? 'seminuevo',
    dimensionLargo:   producto?.dimensionLargo != null ? String(producto.dimensionLargo) : '',
    dimensionAncho:   producto?.dimensionAncho != null ? String(producto.dimensionAncho) : '',
    cargaMaximaKg:    producto?.cargaMaximaKg  != null ? String(producto.cargaMaximaKg)  : '',
    stockDisponible:  producto?.stockDisponible != null ? String(producto.stockDisponible) : '',
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
      stockDisponible:  form.stockDisponible !== '' ? parseInt(form.stockDisponible) : 0,
    };
    try {
      if (esEdicion) {
        await actualizar.mutateAsync({ id: producto.id, datos });
      } else {
        await crear.mutateAsync(datos);
      }
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al guardar el producto');
    }
  };

  const loading = crear.isPending || actualizar.isPending;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Package size={18} className="text-[#16A34A]" />
            {esEdicion ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Nombre <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                className="input"
                placeholder="Ej: Pallet Reforzado"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="select"
                >
                  <option value="estandar">Estándar</option>
                  <option value="reforzado">Reforzado</option>
                  <option value="liviano">Liviano</option>
                  <option value="exportacion">Exportación</option>
                  <option value="carton">Cartón</option>
                  <option value="a_medida">A medida</option>
                </select>
              </div>
              <div>
                <label className="label">Condición</label>
                <select
                  value={form.condicion}
                  onChange={e => setForm({ ...form, condicion: e.target.value })}
                  className="select"
                >
                  <option value="nuevo">Nuevo</option>
                  <option value="seminuevo">Semi-nuevo</option>
                  <option value="usado">Usado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Largo (mm)</label>
                <input
                  type="number"
                  value={form.dimensionLargo}
                  onChange={e => setForm({ ...form, dimensionLargo: e.target.value })}
                  className="input"
                  placeholder="1200"
                />
              </div>
              <div>
                <label className="label">Ancho (mm)</label>
                <input
                  type="number"
                  value={form.dimensionAncho}
                  onChange={e => setForm({ ...form, dimensionAncho: e.target.value })}
                  className="input"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="label">Carga máx. (kg)</label>
                <input
                  type="number"
                  value={form.cargaMaximaKg}
                  onChange={e => setForm({ ...form, cargaMaximaKg: e.target.value })}
                  className="input"
                  placeholder="1500"
                />
              </div>
            </div>
            <div>
              <label className="label">Stock disponible</label>
              <input
                type="number"
                min="0"
                value={form.stockDisponible}
                onChange={e => setForm({ ...form, stockDisponible: e.target.value })}
                className="input"
                style={{ borderRadius: '0.25rem' }}
                placeholder="Consultar con depósito"
              />
              <p className="text-xs text-gray-400 mt-1">
                Dejá vacío si el stock se consulta con depósito
              </p>
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                className="input resize-none"
                rows={2}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
                fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem',
                borderRadius: '0.25rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >Cancelar</button>
            <button type="submit" disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                color: 'white', fontWeight: 500, fontSize: '0.875rem',
                padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
