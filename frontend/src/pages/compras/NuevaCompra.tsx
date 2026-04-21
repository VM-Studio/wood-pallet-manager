import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useCrearCompra } from '../../hooks/useCompras';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

interface NuevaCompraProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PROVEEDORES_JUANCRUZ = [
  { id: 1, nombreEmpresa: 'Galpón Familiar — Brian Hernández', tipoProducto: 'seminuevo' }
];
const PROVEEDORES_CARLOS = [
  { id: 1, nombreEmpresa: 'Galpón Familiar — Brian Hernández', tipoProducto: 'seminuevo' },
  { id: 2, nombreEmpresa: 'Todo Pallets — Guillermo', tipoProducto: 'nuevo_medida' },
];

export default function NuevaCompra({ onClose, onSuccess }: NuevaCompraProps) {
  const crearCompra = useCrearCompra();
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const [productos, setProductos] = useState<any[]>([]);
  const [error, setError] = useState('');

  const proveedoresDisponibles = esCarlos ? PROVEEDORES_CARLOS : PROVEEDORES_JUANCRUZ;

  const [form, setForm] = useState({
    proveedorId: proveedoresDisponibles[0].id,
    tipoCompra: 'reventa_inmediata' as 'reventa_inmediata' | 'stock_propio',
    nroRemito: '',
    observaciones: ''
  });

  const [detalles, setDetalles] = useState([
    { productoId: 0, cantidad: 1, precioCostoUnit: 0 }
  ]);

  useEffect(() => {
    api.get('/productos').then(({ data }) => setProductos(data));
  }, []);

  const proveedorSeleccionado = proveedoresDisponibles.find(p => p.id === form.proveedorId);

  const productosFiltrados = productos.filter(p => {
    if (proveedorSeleccionado?.tipoProducto === 'seminuevo') {
      return p.condicion === 'seminuevo' || p.condicion === 'usado';
    }
    return true;
  });

  const addDetalle = () => setDetalles(prev => [...prev, { productoId: 0, cantidad: 1, precioCostoUnit: 0 }]);
  const removeDetalle = (idx: number) => setDetalles(prev => prev.filter((_, i) => i !== idx));
  const updateDetalle = (idx: number, key: string, value: any) =>
    setDetalles(prev => prev.map((d, i) => i === idx ? { ...d, [key]: value } : d));

  const total = detalles.reduce((acc, d) => acc + (d.precioCostoUnit * d.cantidad), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (detalles.some(d => !d.productoId || !d.cantidad || !d.precioCostoUnit)) {
      setError('Completá todos los productos con precio de costo'); return;
    }
    try {
      await crearCompra.mutateAsync({ ...form, detalles });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar la compra');
    }
  };

  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Nueva compra</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            {/* Tipo de compra */}
            <div>
              <label className="label">Tipo de compra</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    value: 'reventa_inmediata',
                    label: 'Compra - Reventa inmediata',
                    desc: 'No modifica el stock propio. Solo registra la operación.'
                  },
                  {
                    value: 'stock_propio',
                    label: 'Para stock propio',
                    desc: 'Agrega las unidades a tu stock disponible.'
                  },
                ].map(op => (
                  <button key={op.value} type="button"
                    onClick={() => setForm({ ...form, tipoCompra: op.value as any })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.tipoCompra === op.value
                        ? 'border-[#6B3A2A] bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <p className={`text-sm font-semibold ${form.tipoCompra === op.value ? 'text-[#6B3A2A]' : 'text-gray-900'}`}>
                      {op.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{op.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Proveedor */}
            <div>
              <label className="label">Proveedor</label>
              {!esCarlos ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">Galpón Familiar — Brian Hernández</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pallets semi-nuevos y usados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {PROVEEDORES_CARLOS.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => setForm({ ...form, proveedorId: p.id })}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        form.proveedorId === p.id
                          ? 'border-[#6B3A2A] bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <p className={`text-sm font-semibold ${form.proveedorId === p.id ? 'text-[#6B3A2A]' : 'text-gray-900'}`}>
                        {p.nombreEmpresa}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.tipoProducto === 'seminuevo' ? 'Pallets semi-nuevos y usados' : 'Pallets nuevos y a medida'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Productos</label>
                <button type="button" onClick={addDetalle} className="btn-ghost text-xs gap-1 py-1.5">
                  <Plus size={13} /> Agregar
                </button>
              </div>
              <div className="space-y-2">
                {detalles.map((d, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-5">
                        <select value={d.productoId}
                          onChange={e => updateDetalle(idx, 'productoId', parseInt(e.target.value))}
                          className="select text-xs py-2">
                          <option value={0}>Seleccionar producto...</option>
                          {productosFiltrados.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input type="number" min={1} value={d.cantidad}
                          onChange={e => updateDetalle(idx, 'cantidad', parseInt(e.target.value) || 1)}
                          className="input text-xs py-2" placeholder="Cant." />
                      </div>
                      <div className="col-span-3">
                        <input type="number" min={1} value={d.precioCostoUnit || ''}
                          onChange={e => updateDetalle(idx, 'precioCostoUnit', parseFloat(e.target.value) || 0)}
                          className="input text-xs py-2" placeholder="$ costo/u" />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {detalles.length > 1 && (
                          <button type="button" onClick={() => removeDetalle(idx)}
                            className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50">
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

            {/* N° de remito */}
            <div>
              <label className="label">N° de remito (opcional)</label>
              <input type="text" value={form.nroRemito}
                onChange={e => setForm({ ...form, nroRemito: e.target.value })}
                className="input" placeholder="Número de remito del galpón" />
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none" rows={2} />
            </div>

            {/* Total */}
            {total > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Total de la compra</p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">Saldo deudor hasta registrar el pago</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatPesos(total)}</p>
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
