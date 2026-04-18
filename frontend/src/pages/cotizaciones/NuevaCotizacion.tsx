import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import { useCrearCotizacion } from '../../hooks/useCotizaciones';
import { useClientes } from '../../hooks/useClientes';
import api from '../../services/api';

interface NuevaCotizacionProps {
  onClose: () => void;
  onSuccess: (cotizacionId: number) => void;
}

interface DetalleForm {
  productoId: number;
  cantidad: number;
  precioCalculado?: {
    precioUnitario: number;
    subtotal: number;
    bonificaFlete: boolean;
    escalon: string;
  };
}

export default function NuevaCotizacion({ onClose, onSuccess }: NuevaCotizacionProps) {
  const crearCotizacion = useCrearCotizacion();
  const { data: clientes } = useClientes();
  const [productos, setProductos] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clienteId: 0,
    incluyeFlete: false,
    costoFlete: 0,
    fleteIncluido: true,
    requiereSenasa: false,
    costoSenasa: 0,
    canalEnvio: 'whatsapp' as 'whatsapp' | 'email',
    observaciones: ''
  });

  const [detalles, setDetalles] = useState<DetalleForm[]>([
    { productoId: 0, cantidad: 1 }
  ]);

  useEffect(() => {
    api.get('/productos').then(({ data }) => setProductos(data));
  }, []);

  const calcularPrecio = async (idx: number, productoId: number, cantidad: number) => {
    if (!productoId || !cantidad) return;
    try {
      const { data } = await api.get(`/productos/${productoId}/precio?cantidad=${cantidad}`);
      setDetalles(prev => prev.map((d, i) => i === idx ? { ...d, precioCalculado: data } : d));
    } catch { /* precio no disponible */ }
  };

  const addDetalle = () => setDetalles(prev => [...prev, { productoId: 0, cantidad: 1 }]);
  const removeDetalle = (idx: number) => setDetalles(prev => prev.filter((_, i) => i !== idx));

  const updateDetalle = (idx: number, key: keyof DetalleForm, value: number) => {
    setDetalles(prev => {
      const nuevo = prev.map((d, i) => i === idx ? { ...d, [key]: value } : d);
      const d = nuevo[idx];
      if (d.productoId && d.cantidad) {
        calcularPrecio(idx, d.productoId, d.cantidad);
      }
      return nuevo;
    });
  };

  const totalSinIva = detalles.reduce((acc, d) => {
    const sub = d.precioCalculado ? d.precioCalculado.precioUnitario * d.cantidad : 0;
    return acc + sub;
  }, 0)
    + (form.incluyeFlete && form.fleteIncluido ? form.costoFlete : 0)
    + (form.requiereSenasa ? form.costoSenasa : 0);

  const totalConIva = totalSinIva * 1.21;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.clienteId) { setError('Seleccioná un cliente'); return; }
    if (detalles.some(d => !d.productoId || !d.cantidad)) {
      setError('Completá todos los productos'); return;
    }
    try {
      const resultado = await crearCotizacion.mutateAsync({
        ...form,
        detalles: detalles.map(d => ({ productoId: d.productoId, cantidad: d.cantidad }))
      });
      onSuccess(resultado.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear la cotización');
    }
  };

  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Calculator size={20} className="text-[#16A34A]" />
            Nueva cotización
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            {/* Cliente */}
            <div>
              <label className="label">Cliente <span className="text-red-500">*</span></label>
              <select
                value={form.clienteId}
                onChange={e => setForm({ ...form, clienteId: parseInt(e.target.value) })}
                className="select"
                required
              >
                <option value={0}>Seleccioná un cliente...</option>
                {clientes?.map(c => (
                  <option key={c.id} value={c.id}>{c.razonSocial}</option>
                ))}
              </select>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Productos <span className="text-red-500">*</span></label>
                <button type="button" onClick={addDetalle} className="btn-ghost text-xs gap-1 py-1.5">
                  <Plus size={14} /> Agregar producto
                </button>
              </div>
              <div className="space-y-2">
                {detalles.map((d, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={d.productoId}
                          onChange={e => updateDetalle(idx, 'productoId', parseInt(e.target.value))}
                          className="select text-xs py-2"
                        >
                          <option value={0}>Seleccioná un producto...</option>
                          {productos.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.nombre} — {p.condicion}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={d.cantidad}
                          onChange={e => updateDetalle(idx, 'cantidad', parseInt(e.target.value))}
                          className="input text-xs py-2"
                          placeholder="Cantidad"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        {d.precioCalculado && (
                          <div>
                            <p className="text-xs font-semibold text-gray-900">
                              {formatPesos(d.precioCalculado.precioUnitario)}
                            </p>
                            {d.precioCalculado.bonificaFlete && (
                              <p className="text-[10px] text-green-600 font-medium">Flete bonificado</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {detalles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDetalle(idx)}
                            className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {d.precioCalculado && (
                      <p className="text-xs text-gray-400 mt-1.5 pl-1">
                        Escalón: {d.precioCalculado.escalon} · Subtotal: {formatPesos(d.precioCalculado.subtotal)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones flete / SENASA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.incluyeFlete}
                    onChange={e => setForm({ ...form, incluyeFlete: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">🚛 Incluye flete</span>
                </label>
                {form.incluyeFlete && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Costo del flete ($)"
                      value={form.costoFlete || ''}
                      onChange={e => setForm({ ...form, costoFlete: parseInt(e.target.value) || 0 })}
                      className="input text-sm"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.fleteIncluido}
                        onChange={e => setForm({ ...form, fleteIncluido: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs text-gray-600">Incluido en el precio</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.requiereSenasa}
                    onChange={e => setForm({ ...form, requiereSenasa: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">🌿 Requiere SENASA</span>
                </label>
                {form.requiereSenasa && (
                  <input
                    type="number"
                    placeholder="Costo SENASA ($)"
                    value={form.costoSenasa || ''}
                    onChange={e => setForm({ ...form, costoSenasa: parseInt(e.target.value) || 0 })}
                    className="input text-sm"
                  />
                )}
              </div>
            </div>

            {/* Canal de envío */}
            <div>
              <label className="label">Canal de envío</label>
              <div className="flex gap-2">
                {(['whatsapp', 'email'] as const).map(canal => (
                  <button
                    key={canal}
                    type="button"
                    onClick={() => setForm({ ...form, canalEnvio: canal })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.canalEnvio === canal
                        ? 'bg-[#16A34A] text-white border-[#16A34A]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {canal === 'whatsapp' ? '💬 WhatsApp' : '📧 Email'}
                  </button>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none"
                rows={2}
                placeholder="Notas internas..."
              />
            </div>

            {/* Total estimado */}
            {totalSinIva > 0 && (
              <div className="p-4 bg-[#16A34A]/5 rounded-xl border border-[#16A34A]/20">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Subtotal sin IVA</span>
                  <span>{formatPesos(totalSinIva)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900">
                  <span>Total con IVA (21%)</span>
                  <span className="text-[#16A34A] text-lg">{formatPesos(totalConIva)}</span>
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
            <button type="submit" disabled={crearCotizacion.isPending} className="btn-primary">
              {crearCotizacion.isPending ? 'Creando...' : 'Crear cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
