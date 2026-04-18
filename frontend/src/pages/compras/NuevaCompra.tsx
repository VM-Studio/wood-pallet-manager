import { useState, useEffect } from 'react';
import { X, Plus, Trash2, ShoppingBag, AlertCircle } from 'lucide-react';
import { useCrearCompra } from '../../hooks/useCompras';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

interface NuevaCompraProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Proveedor {
  id: number;
  nombreEmpresa: string;
  tipoProducto: string;
  acceso: 'ambos' | 'solo_carlos';
}

interface ProductoItem {
  id: number;
  nombre: string;
}

interface DetalleForm {
  productoId: number;
  cantidad: number;
  precioCostoUnit: number;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

export default function NuevaCompra({ onClose, onSuccess }: NuevaCompraProps) {
  const crearCompra = useCrearCompra();
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const [proveedores] = useState<Proveedor[]>([
    { id: 1, nombreEmpresa: 'Galpón Familiar — Brian Hernández', tipoProducto: 'seminuevo', acceso: 'ambos' },
    { id: 2, nombreEmpresa: 'Todo Pallets — Guillermo', tipoProducto: 'nuevo_medida', acceso: 'solo_carlos' },
  ]);
  const [productos, setProductos] = useState<ProductoItem[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    proveedorId:   0,
    esAnticipado:  false,
    nroRemito:     '',
    observaciones: ''
  });

  const [detalles, setDetalles] = useState<DetalleForm[]>([
    { productoId: 0, cantidad: 1, precioCostoUnit: 0 }
  ]);

  useEffect(() => {
    api.get<ProductoItem[]>('/productos').then(res => setProductos(res.data));
  }, []);

  const proveedoresFiltrados = proveedores.filter(p =>
    p.acceso === 'ambos' || (p.acceso === 'solo_carlos' && esCarlos)
  );

  const addDetalle = () =>
    setDetalles(prev => [...prev, { productoId: 0, cantidad: 1, precioCostoUnit: 0 }]);

  const removeDetalle = (idx: number) =>
    setDetalles(prev => prev.filter((_, i) => i !== idx));

  const updateDetalle = (idx: number, key: keyof DetalleForm, value: number) =>
    setDetalles(prev => prev.map((d, i) => i === idx ? { ...d, [key]: value } : d));

  const total = detalles.reduce((acc, d) => acc + d.precioCostoUnit * d.cantidad, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.proveedorId) { setError('Seleccioná un proveedor'); return; }
    if (detalles.some(d => !d.productoId || !d.cantidad || !d.precioCostoUnit)) {
      setError('Completá todos los productos con precio de costo'); return;
    }
    try {
      await crearCompra.mutateAsync({
        proveedorId:   form.proveedorId,
        esAnticipado:  form.esAnticipado,
        nroRemito:     form.nroRemito || undefined,
        observaciones: form.observaciones || undefined,
        detalles
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al registrar la compra');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#16A34A]" />
            Nueva compra a proveedor
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            {!esCarlos && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <strong>Nota:</strong> Solo Carlos puede realizar compras a Todo Pallets (pallets nuevos).
                  Solo ves los proveedores a los que podés comprar.
                </p>
              </div>
            )}

            {/* Proveedor */}
            <div>
              <label className="label">Proveedor <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-1 gap-2">
                {proveedoresFiltrados.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm({ ...form, proveedorId: p.id })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.proveedorId === p.id
                        ? 'border-[#16A34A] bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{p.nombreEmpresa}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.tipoProducto === 'seminuevo' ? '📦 Pallets semi-nuevos y usados' : '✨ Pallets nuevos y a medida'}
                      {p.acceso === 'solo_carlos' && ' · Solo Carlos'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Productos <span className="text-red-500">*</span></label>
                <button type="button" onClick={addDetalle} className="btn-ghost text-xs gap-1 py-1.5">
                  <Plus size={13} /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {detalles.map((d, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select
                          value={d.productoId}
                          onChange={e => updateDetalle(idx, 'productoId', parseInt(e.target.value))}
                          className="select text-xs py-2"
                        >
                          <option value={0}>Producto...</option>
                          {productos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={d.cantidad}
                          onChange={e => updateDetalle(idx, 'cantidad', parseInt(e.target.value) || 1)}
                          className="input text-xs py-2"
                          placeholder="Cant."
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={d.precioCostoUnit || ''}
                          onChange={e => updateDetalle(idx, 'precioCostoUnit', parseFloat(e.target.value) || 0)}
                          className="input text-xs py-2"
                          placeholder="$ costo"
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {detalles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDetalle(idx)}
                            className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    {d.cantidad > 0 && d.precioCostoUnit > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 pl-1">
                        Subtotal: {formatPesos(d.cantidad * d.precioCostoUnit)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">N° de remito</label>
                <input
                  type="text"
                  value={form.nroRemito}
                  onChange={e => setForm({ ...form, nroRemito: e.target.value })}
                  className="input"
                  placeholder="Opcional"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.esAnticipado}
                    onChange={e => setForm({ ...form, esAnticipado: e.target.checked })}
                    className="w-4 h-4 text-[#16A34A] rounded"
                  />
                  <span className="text-sm text-gray-700">📦 Compra anticipada de stock</span>
                </label>
              </div>
            </div>

            <div>
              <label className="label">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none"
                rows={2}
              />
            </div>

            {total > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Total de la compra</span>
                  <span className="text-xl font-bold text-gray-900">{formatPesos(total)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={crearCompra.isPending} className="btn-primary">
              {crearCompra.isPending ? 'Registrando...' : 'Registrar compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
