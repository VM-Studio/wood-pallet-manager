import { useState } from 'react';
import { X, ShoppingCart, Check, Truck, Warehouse } from 'lucide-react';
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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al convertir la cotización');
    }
  };

  const opciones = [
    {
      value: 'envio_woodpallet',
      label: 'Envío',
      sub: 'Wood Pallet coordina la entrega',
      icon: <Truck size={18} />,
    },
    {
      value: 'retira_cliente',
      label: 'Retiro en galpón',
      sub: 'El cliente retira personalmente',
      icon: <Warehouse size={18} />,
    },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <ShoppingCart size={18} style={{ color: '#6B3A2A' }} />
            Convertir a venta
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            {/* Aviso */}
            <div
              className="flex items-start gap-2.5 p-3.5"
              style={{ background: '#FDF6EE', border: '1px solid #C4895A', borderRadius: '0.25rem' }}
            >
              <Check size={16} style={{ color: '#6B3A2A', marginTop: 1, flexShrink: 0 }} />
              <p className="text-sm font-medium" style={{ color: '#6B3A2A' }}>
                Cotización aceptada. Completá los datos para generar la venta.
              </p>
            </div>

            {/* Tipo de entrega */}
            <div>
              <label className="label">Tipo de entrega</label>
              <div className="grid grid-cols-2 gap-2">
                {opciones.map(op => {
                  const activo = form.tipoEntrega === op.value;
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setForm({ ...form, tipoEntrega: op.value as 'retira_cliente' | 'envio_woodpallet' })}
                      style={{
                        padding: '0.875rem',
                        textAlign: 'left',
                        border: `1.5px solid ${activo ? '#6B3A2A' : '#E5E7EB'}`,
                        borderRadius: '0.25rem',
                        background: activo ? '#FDF6EE' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1" style={{ color: activo ? '#6B3A2A' : '#9CA3AF' }}>
                        {op.icon}
                        <p className="text-sm font-semibold" style={{ color: activo ? '#6B3A2A' : '#111827' }}>
                          {op.label}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400">{op.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fecha estimada */}
            <div>
              <label className="label">Fecha estimada de entrega</label>
              <input
                type="date"
                value={form.fechaEstimEntrega}
                onChange={e => setForm({ ...form, fechaEstimEntrega: e.target.value })}
                className="input"
                style={{ borderRadius: '0.25rem' }}
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none"
                style={{ borderRadius: '0.25rem' }}
                rows={2}
                placeholder="Aclaraciones sobre la entrega..."
              />
            </div>

            {error && (
              <p
                className="text-sm px-3 py-2.5"
                style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.25rem' }}
              >
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
                fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem',
                borderRadius: '0.25rem', cursor: 'pointer'
              }}
            >Cancelar</button>
            <button
              type="submit"
              disabled={convertir.isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: convertir.isPending ? '#9CA3AF' : 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                color: 'white', fontWeight: 500, fontSize: '0.875rem',
                padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
                cursor: convertir.isPending ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
              }}
            >
              <ShoppingCart size={15} />
              {convertir.isPending ? 'Creando venta...' : 'Crear venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}