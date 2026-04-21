import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
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
}

interface Producto {
  id: number;
  nombre: string;
  condicion: string;
  tipo: string;
}

interface Detalle {
  productoId: number;
  cantidadStr: string;
  precioCostoUnit: number;
}

export default function NuevaCompra({ onClose, onSuccess }: NuevaCompraProps) {
  const crearCompra = useCrearCompra();
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({
    proveedorId: 0,
    tipoCompra: 'reventa_inmediata' as 'reventa_inmediata' | 'stock_propio',
    nroRemito: '',
    observaciones: ''
  });

  const [detalles, setDetalles] = useState<Detalle[]>([
    { productoId: 0, cantidadStr: '', precioCostoUnit: 0 }
  ]);

  useEffect(() => {
    Promise.all([
      api.get('/proveedores'),
      api.get('/productos')
    ]).then(([provRes, prodRes]) => {
      const todos: Proveedor[] = provRes.data;
      const filtrados = esCarlos ? todos : todos.filter(p => p.tipoProducto === 'seminuevo');
      setProveedores(filtrados);
      if (filtrados.length > 0) setForm(f => ({ ...f, proveedorId: filtrados[0].id }));
      setProductos(prodRes.data);
    }).finally(() => setCargando(false));
  }, [esCarlos]);

  const proveedorSeleccionado = proveedores.find(p => p.id === form.proveedorId);

  const productosFiltrados = productos.filter(p => {
    if (proveedorSeleccionado?.tipoProducto === 'seminuevo') {
      return p.condicion === 'seminuevo' || p.condicion === 'usado';
    }
    return true;
  });

  const addDetalle = () => setDetalles(prev => [
    ...prev, { productoId: 0, cantidadStr: '', precioCostoUnit: 0 }
  ]);
  const removeDetalle = (idx: number) => setDetalles(prev => prev.filter((_, i) => i !== idx));
  const updateDetalle = (idx: number, key: keyof Detalle, value: string | number) =>
    setDetalles(prev => prev.map((d, i) => i === idx ? { ...d, [key]: value } : d));

  const totalCalc = detalles.reduce((acc, d) => acc + (d.precioCostoUnit * (parseInt(d.cantidadStr) || 0)), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.proveedorId) { setError('Seleccioná un proveedor'); return; }
    const detallesFinales = detalles.map(d => ({
      productoId: d.productoId,
      cantidad: parseInt(d.cantidadStr) || 0,
      precioCostoUnit: d.precioCostoUnit
    }));
    if (detallesFinales.some(d => !d.productoId || !d.cantidad || !d.precioCostoUnit)) {
      setError('Completá todos los productos con cantidad y precio de costo'); return;
    }
    try {
      await crearCompra.mutateAsync({ ...form, detalles: detallesFinales });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al registrar la compra');
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
                    onClick={() => setForm({ ...form, tipoCompra: op.value as 'reventa_inmediata' | 'stock_propio' })}
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
              {cargando ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-400">
                  Cargando proveedores...
                </div>
              ) : proveedores.length === 0 ? (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-600">
                  No hay proveedores registrados. Agregá uno desde el módulo de Proveedores.
                </div>
              ) : (
                <div className="space-y-2">
                  {proveedores.map(p => (
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
                        {p.tipoProducto === 'seminuevo' ? 'Pallets semi-nuevos y usados' :
                         p.tipoProducto === 'nuevo_medida' ? 'Pallets nuevos y a medida' : p.tipoProducto}
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
                          {productosFiltrados.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={d.cantidadStr}
                          onChange={e => updateDetalle(idx, 'cantidadStr', e.target.value)}
                          className="input text-xs py-2"
                          placeholder="Cant."
                        />
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
                    {(parseInt(d.cantidadStr) > 0) && d.precioCostoUnit > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5 pl-1">
                        Subtotal: {formatPesos(parseInt(d.cantidadStr) * d.precioCostoUnit)}
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
            {totalCalc > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Total de la compra</p>
                    <p className="text-xs text-amber-600 font-medium mt-0.5">Saldo deudor hasta registrar el pago</p>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{formatPesos(totalCalc)}</p>
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
            <button type="submit" disabled={crearCompra.isPending || proveedores.length === 0} className="btn-primary">
              {crearCompra.isPending ? 'Registrando...' : 'Registrar compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
