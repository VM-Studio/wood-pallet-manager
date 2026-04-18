import { useState } from 'react';
import { X, ShoppingCart, ArrowRight } from 'lucide-react';
import { useConvertirAVenta } from '../../hooks/useCotizaciones';

interface ConvertirVentaModalProps {
  cotizacionId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertirVentaModal({ cotizacionId, onClose, onSuccess }: ConvertirVentaModalProps) {
  const convertir = useConvertirAVenta();
  const [form, setForm] = useState({
    tipoEntrega: 'envio_woodpallet' as 'retira_cliente' | 'envio_woodpallet',
    fechaEstimEntrega: '',
    observaciones: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await convertir.mutateAsync({ id: cotizacionId, datos: form });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al convertir la cotización');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#16A34A]" />
            Convertir a venta
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm text-green-700 font-medium">
                La cotización fue aceptada. Completá los datos para crear la venta.
              </p>
            </div>

            <div>
              <label className="label">Tipo de entrega</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'envio_woodpallet', label: '🚛 Envío', sub: 'Wood Pallet coordina' },
                  { value: 'retira_cliente', label: '🏭 Retiro', sub: 'Cliente retira en galpón' },
                ].map(op => (
                  <button
                    key={op.value}
                    type="button"
                    onClick={() => setForm({ ...form, tipoEntrega: op.value as 'retira_cliente' | 'envio_woodpallet' })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.tipoEntrega === op.value
                        ? 'border-[#16A34A] bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-semibold text-gray-900">{op.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{op.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Fecha estimada de entrega</label>
              <input
                type="date"
                value={form.fechaEstimEntrega}
                onChange={e => setForm({ ...form, fechaEstimEntrega: e.target.value })}
                className="input"
              />
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

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={convertir.isPending} className="btn-primary">
              {convertir.isPending
                ? 'Convirtiendo...'
                : <><span>Crear venta</span><ArrowRight size={16} /></>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
