import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useConvertirAVenta } from '../../hooks/useCotizaciones';
import { useQueryClient } from '@tanstack/react-query';

interface ConvertirVentaModalProps {
  cotizacionId: number;
  incluyeFlete: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertirVentaModal({
  cotizacionId,
  incluyeFlete,
  onClose,
  onSuccess,
}: ConvertirVentaModalProps) {
  const convertir = useConvertirAVenta();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    tipoEntrega: '' as 'retira_cliente' | 'envio_woodpallet' | '',
    metodoPago: '' as 'transferencia' | 'e_check' | 'efectivo' | '',
    cuentaDestino: '',
    modalidadPago: '' as 'adelantado' | 'contra_entrega' | 'por_partes' | '',
    lugarEntrega: '',
    fechaEntrega: '',
    fechaRetiro: '',
    observaciones: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.tipoEntrega) { setError('Seleccioná el tipo de entrega'); return; }
    if (!form.metodoPago)  { setError('Seleccioná el método de pago'); return; }
    if (!form.modalidadPago) { setError('Seleccioná la modalidad de pago'); return; }
    if (form.tipoEntrega === 'envio_woodpallet' && !form.lugarEntrega) {
      setError('Ingresá el lugar de entrega'); return;
    }

    try {
      await convertir.mutateAsync({
        id: cotizacionId,
        datos: {
          tipoEntrega: form.tipoEntrega as 'retira_cliente' | 'envio_woodpallet',
          metodoPago: form.metodoPago as 'transferencia' | 'e_check' | 'efectivo',
          cuentaDestino: form.cuentaDestino || undefined,
          modalidadPago: form.modalidadPago as 'adelantado' | 'contra_entrega' | 'por_partes',
          lugarEntrega: form.lugarEntrega || undefined,
          fechaEntrega: form.fechaEntrega || undefined,
          fechaRetiro: form.fechaRetiro || undefined,
          observaciones: form.observaciones || undefined,
        },
      });

      await queryClient.invalidateQueries({ queryKey: ['cotizaciones'] });
      await queryClient.invalidateQueries({ queryKey: ['ventas'] });
      await queryClient.invalidateQueries({ queryKey: ['logisticas'] });
      await queryClient.invalidateQueries({ queryKey: ['logistica-por-rol'] });
      await queryClient.invalidateQueries({ queryKey: ['facturas'] });
      await queryClient.invalidateQueries({ queryKey: ['cobros-pendientes'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al convertir la cotización');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Convertir a venta</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            <div>
              <label className="label">Tipo de entrega</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'envio_woodpallet', label: 'Envío' },
                  { value: 'retira_cliente',   label: 'Retiro en galpón' },
                ].map(op => (
                  <button key={op.value} type="button"
                    onClick={() => setForm({ ...form, tipoEntrega: op.value as 'retira_cliente' | 'envio_woodpallet', lugarEntrega: '', fechaEntrega: '', fechaRetiro: '' })}
                    className={`p-3 rounded-xl border text-left transition-all text-sm font-medium ${
                      form.tipoEntrega === op.value
                        ? 'border-[#6B3A2A] bg-orange-50 text-[#6B3A2A]'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>

              {form.tipoEntrega === 'envio_woodpallet' && (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="label">Lugar de entrega</label>
                    <input type="text" value={form.lugarEntrega}
                      onChange={e => setForm({ ...form, lugarEntrega: e.target.value })}
                      className="input" placeholder="Dirección completa de entrega" />
                  </div>
                  <div>
                    <label className="label">Fecha estimada de entrega</label>
                    <input type="date" value={form.fechaEntrega}
                      onChange={e => setForm({ ...form, fechaEntrega: e.target.value })}
                      className="input" />
                  </div>
                </div>
              )}

              {form.tipoEntrega === 'retira_cliente' && (
                <div className="mt-3">
                  <label className="label">Fecha de retiro</label>
                  <input type="date" value={form.fechaRetiro}
                    onChange={e => setForm({ ...form, fechaRetiro: e.target.value })}
                    className="input" />
                </div>
              )}
            </div>

            <div>
              <label className="label">Método de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'transferencia', label: 'Transferencia' },
                  { value: 'e_check',       label: 'E-check' },
                  { value: 'efectivo',      label: 'Efectivo' },
                ].map(op => (
                  <button key={op.value} type="button"
                    onClick={() => setForm({
                      ...form,
                      metodoPago: op.value as 'transferencia' | 'e_check' | 'efectivo',
                      cuentaDestino: op.value === 'e_check' ? 'banco_provincia' : '',
                    })}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.metodoPago === op.value
                        ? 'border-[#6B3A2A] bg-orange-50 text-[#6B3A2A]'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>

              {form.metodoPago === 'transferencia' && (
                <div className="mt-3 space-y-1">
                  <label className="label">Cuenta destino</label>
                  {[
                    { value: 'cuenta_personal',     label: 'Mi cuenta personal' },
                    { value: 'mercado_pago_empresa', label: 'Mercado Pago empresa' },
                    { value: 'banco_provincia',     label: 'Banco Provincia' },
                  ].map(op => (
                    <label key={op.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100">
                      <input type="radio" name="cuentaDestino" value={op.value}
                        checked={form.cuentaDestino === op.value}
                        onChange={() => setForm({ ...form, cuentaDestino: op.value })}
                        className="w-4 h-4" />
                      <span className="text-sm text-gray-700">{op.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {form.metodoPago === 'e_check' && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                  <input type="checkbox" checked readOnly className="w-4 h-4" />
                  <span className="text-sm text-gray-700 font-medium">Banco Provincia</span>
                  <span className="text-xs text-gray-400 ml-1">(automático para e-check)</span>
                </div>
              )}
            </div>

            <div>
              <label className="label">Modalidad de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'adelantado',     label: 'Adelantado' },
                  { value: 'contra_entrega', label: 'Contra entrega' },
                  { value: 'por_partes',     label: 'Por partes' },
                ].map(op => (
                  <button key={op.value} type="button"
                    onClick={() => setForm({ ...form, modalidadPago: op.value as 'adelantado' | 'contra_entrega' | 'por_partes' })}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.modalidadPago === op.value
                        ? 'border-[#6B3A2A] bg-orange-50 text-[#6B3A2A]'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Observaciones</label>
              <textarea value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none" rows={2}
                placeholder="Notas adicionales sobre la venta..." />
            </div>

            {incluyeFlete && form.tipoEntrega === 'envio_woodpallet' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700 font-medium">
                  Esta venta se agregará automáticamente al módulo de Logística porque incluye flete.
                </p>
              </div>
            )}

            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-xs text-green-700 font-medium">
                Se creará automáticamente una factura en estado pendiente en el módulo de Facturación.
              </p>
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
                : <><span>Convertir a venta</span><ArrowRight size={16} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
