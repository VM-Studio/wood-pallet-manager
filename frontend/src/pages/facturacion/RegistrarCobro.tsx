import { useState } from 'react';
import { X, DollarSign, CheckCircle } from 'lucide-react';
import { useRegistrarCobro } from '../../hooks/useFacturacion';

interface RegistrarCobroProps {
  facturaId: number;
  clienteNombre: string;
  totalFactura: number;
  totalCobrado: number;
  onClose: () => void;
  onSuccess: () => void;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const mediosPago = [
  { value: 'transferencia', label: '🏦 Transferencia' },
  { value: 'e_check',       label: '📄 E-check' },
  { value: 'efectivo',      label: '💵 Efectivo' },
] as const;

export default function RegistrarCobro({
  facturaId, clienteNombre, totalFactura, totalCobrado, onClose, onSuccess
}: RegistrarCobroProps) {
  const registrarCobro = useRegistrarCobro();
  const saldoPendiente = totalFactura - totalCobrado;
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    monto: String(saldoPendiente),
    medioPago: 'transferencia',
    nroComprobante: '',
    esAdelanto: false,
    observaciones: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const monto = parseFloat(form.monto);
    if (!monto || monto <= 0) { setError('El monto debe ser mayor a 0'); return; }
    try {
      await registrarCobro.mutateAsync({
        id: facturaId,
        datos: { ...form, monto }
      });
      onSuccess();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Error al registrar el cobro');
    }
  };

  const monto = parseFloat(form.monto) || 0;
  const esCobroTotal = monto >= saldoPendiente - 0.01;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <DollarSign size={18} className="text-[#16A34A]" />
            Registrar cobro
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Info factura */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-2">{clienteNombre}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Total factura</p>
                  <p className="text-sm font-bold text-gray-900">{formatPesos(totalFactura)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ya cobrado</p>
                  <p className="text-sm font-bold text-green-600">{formatPesos(totalCobrado)}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-1">
                  <p className="text-xs text-gray-500">Pendiente</p>
                  <p className="text-sm font-bold text-amber-600">{formatPesos(saldoPendiente)}</p>
                </div>
              </div>
            </div>

            {/* Monto */}
            <div>
              <label className="label">Monto a cobrar <span className="text-red-500">*</span></label>
              <input
                type="number" min={0.01} max={saldoPendiente} step={0.01}
                value={form.monto}
                onChange={e => setForm({ ...form, monto: e.target.value })}
                className="input text-lg font-bold"
                required
              />
              <div className="flex gap-2 mt-2">
                <button type="button"
                  onClick={() => setForm({ ...form, monto: String(Math.round(saldoPendiente * 0.5)) })}
                  className="btn-ghost text-xs py-1.5 flex-1 justify-center">
                  50% ({formatPesos(saldoPendiente * 0.5)})
                </button>
                <button type="button"
                  onClick={() => setForm({ ...form, monto: String(saldoPendiente) })}
                  className="btn-ghost text-xs py-1.5 flex-1 justify-center">
                  Total ({formatPesos(saldoPendiente)})
                </button>
              </div>
            </div>

            {/* Medio de pago */}
            <div>
              <label className="label">Medio de pago</label>
              <div className="grid grid-cols-3 gap-2">
                {mediosPago.map(m => (
                  <button key={m.value} type="button"
                    onClick={() => setForm({ ...form, medioPago: m.value })}
                    className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      form.medioPago === m.value
                        ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Comprobante */}
            <div>
              <label className="label">N° de comprobante</label>
              <input type="text" value={form.nroComprobante}
                onChange={e => setForm({ ...form, nroComprobante: e.target.value })}
                className="input" placeholder="Número de transferencia, cheque, etc." />
            </div>

            {/* Adelanto */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.esAdelanto}
                onChange={e => setForm({ ...form, esAdelanto: e.target.checked })}
                className="w-4 h-4 text-[#16A34A] rounded" />
              <span className="text-sm text-gray-700">Es un adelanto del 50%</span>
            </label>

            {/* Preview */}
            {monto > 0 && (
              <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                esCobroTotal ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
              }`}>
                <CheckCircle size={16} className={esCobroTotal ? 'text-green-600' : 'text-blue-600'} />
                <p className={`text-sm font-semibold ${esCobroTotal ? 'text-green-700' : 'text-blue-700'}`}>
                  {esCobroTotal
                    ? 'La factura quedará completamente cobrada'
                    : `Quedará un saldo de ${formatPesos(saldoPendiente - monto)}`
                  }
                </p>
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
            <button type="submit" disabled={registrarCobro.isPending} className="btn-primary">
              {registrarCobro.isPending ? 'Registrando...' : 'Registrar cobro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
