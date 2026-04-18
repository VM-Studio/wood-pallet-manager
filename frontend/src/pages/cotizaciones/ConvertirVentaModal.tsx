import { useState } from 'react';
import { X, ShoppingCart, Check, Truck, Warehouse, CreditCard } from 'lucide-react';
import { useConvertirAVenta } from '../../hooks/useCotizaciones';
import api from '../../services/api';

interface ConvertirVentaModalProps {
  cotizacionId: number;
  onClose: () => void;
  onSuccess: () => void;
}

type MedioPago = 'transferencia' | 'e_check' | 'efectivo';
type ModalidadPago = 'completo_anticipado' | 'completo_entrega' | 'mitad_adelanto_mitad_entrega';

export default function ConvertirVentaModal({ cotizacionId, onClose, onSuccess }: ConvertirVentaModalProps) {
  const convertir = useConvertirAVenta();
  const [form, setForm] = useState({
    tipoEntrega: 'envio_woodpallet' as 'retira_cliente' | 'envio_woodpallet',
    fechaEstimEntrega: '',
    observaciones: '',
    medioPago: 'transferencia' as MedioPago,
    modalidadPago: 'completo_entrega' as ModalidadPago,
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Primero marcar como aceptada (requerido por el backend)
      await api.put(`/cotizaciones/${cotizacionId}/estado`, { estado: 'aceptada' });
      // Luego convertir a venta
      await convertir.mutateAsync({ id: cotizacionId, datos: form });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al convertir la cotización');
    }
  };

  const opcionesEntrega = [
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

  const accionEntrega = form.tipoEntrega === 'retira_cliente' ? 'retirar' : 'entregar';

  const opcionesModalidad: { value: ModalidadPago; label: string; sub: string }[] = [
    {
      value: 'completo_anticipado',
      label: 'Pago completo anticipado',
      sub: 'El cliente pagó el total antes de la entrega',
    },
    {
      value: 'completo_entrega',
      label: `Pago completo al ${accionEntrega}`,
      sub: `El cliente paga el total cuando ${form.tipoEntrega === 'retira_cliente' ? 'retira' : 'recibe'} la mercadería`,
    },
    {
      value: 'mitad_adelanto_mitad_entrega',
      label: `50% adelantado, 50% al ${accionEntrega}`,
      sub: `Mitad ya abonada, el resto al ${form.tipoEntrega === 'retira_cliente' ? 'retiro' : 'momento de entrega'}`,
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
                {opcionesEntrega.map(op => {
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

            {/* Método de pago */}
            <div>
              <label className="label flex items-center gap-1.5">
                <CreditCard size={14} />
                Método de pago <span className="text-red-500">*</span>
              </label>
              <select
                value={form.medioPago}
                onChange={e => setForm({ ...form, medioPago: e.target.value as MedioPago })}
                className="select"
                style={{ borderRadius: '0.25rem' }}
                required
              >
                <option value="transferencia">Transferencia bancaria</option>
                <option value="e_check">E-check</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>

            {/* Modalidad de pago */}
            <div>
              <label className="label">Modalidad de pago <span className="text-red-500">*</span></label>
              <div className="space-y-2">
                {opcionesModalidad.map(op => {
                  const activo = form.modalidadPago === op.value;
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setForm({ ...form, modalidadPago: op.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        border: `1.5px solid ${activo ? '#16A34A' : '#E5E7EB'}`,
                        borderRadius: '0.25rem',
                        background: activo ? '#F0FDF4' : '#fff',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          width: 16, height: 16, borderRadius: '50%',
                          border: `2px solid ${activo ? '#16A34A' : '#D1D5DB'}`,
                          background: activo ? '#16A34A' : '#fff',
                          flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        {activo && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: activo ? '#15803D' : '#111827' }}>
                          {op.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{op.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
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

