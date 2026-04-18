import { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle } from 'lucide-react';
import { useCrearFactura } from '../../hooks/useFacturacion';
import api from '../../services/api';

interface NuevaFacturaProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface VentaSinFactura {
  id: number;
  totalConIva?: number;
  cliente?: { razonSocial: string };
  detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
  facturas?: unknown[];
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

export default function NuevaFactura({ onClose, onSuccess }: NuevaFacturaProps) {
  const crearFactura = useCrearFactura();
  const [ventas, setVentas] = useState<VentaSinFactura[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    ventaId: 0,
    nroFactura: '',
    esSinFactura: false,
    fechaVencimiento: '',
    totalNeto: '',
    iva: '',
    totalConIva: '',
    observaciones: ''
  });

  useEffect(() => {
    api.get('/ventas').then(({ data }: { data: VentaSinFactura[] }) => {
      const sinFactura = data.filter(v => !v.facturas || v.facturas.length === 0);
      setVentas(sinFactura);
    });
  }, []);

  const calcularIva = (neto: string) => {
    const n = parseFloat(neto) || 0;
    const iva = Math.round(n * 0.21);
    const total = n + iva;
    setForm(f => ({ ...f, totalNeto: neto, iva: String(iva), totalConIva: String(total) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.ventaId) { setError('Seleccioná una venta'); return; }
    if (!form.totalNeto || !form.totalConIva) { setError('Ingresá los importes de la factura'); return; }
    try {
      await crearFactura.mutateAsync({
        ventaId: form.ventaId,
        nroFactura: form.nroFactura || undefined,
        esSinFactura: form.esSinFactura,
        fechaVencimiento: form.fechaVencimiento || undefined,
        totalNeto: parseFloat(form.totalNeto),
        iva: parseFloat(form.iva),
        totalConIva: parseFloat(form.totalConIva),
        observaciones: form.observaciones || undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Error al crear la factura');
    }
  };

  const ventaSeleccionada = ventas.find(v => v.id === form.ventaId);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Receipt size={18} className="text-[#16A34A]" />
            Registrar factura
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
              <AlertCircle size={15} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                La factura A se emite desde ARCA. Acá registrás los datos
                de la factura ya emitida para el seguimiento del cobro.
              </p>
            </div>

            {/* Venta */}
            <div>
              <label className="label">Venta asociada <span className="text-red-500">*</span></label>
              {!ventas.length ? (
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <p className="text-sm text-gray-500">No hay ventas sin factura</p>
                </div>
              ) : (
                <select
                  value={form.ventaId}
                  onChange={e => setForm({ ...form, ventaId: parseInt(e.target.value) })}
                  className="select"
                  required
                >
                  <option value={0}>Seleccioná una venta...</option>
                  {ventas.map(v => (
                    <option key={v.id} value={v.id}>
                      #{v.id} — {v.cliente?.razonSocial} — {formatPesos(v.totalConIva ?? 0)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Venta seleccionada info */}
            {ventaSeleccionada && (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  {ventaSeleccionada.cliente?.razonSocial}
                </p>
                <p className="text-xs text-gray-500">
                  {ventaSeleccionada.detalles?.map(d =>
                    `${d.producto?.nombre} (${d.cantidadPedida}u)`
                  ).join(' · ')}
                </p>
              </div>
            )}

            {/* Tipo de comprobante */}
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setForm({ ...form, esSinFactura: false })}
                className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                  !form.esSinFactura
                    ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                🧾 Factura A
              </button>
              <button type="button"
                onClick={() => setForm({ ...form, esSinFactura: true, nroFactura: '' })}
                className={`flex-1 p-3 rounded-xl border text-sm font-medium transition-all ${
                  form.esSinFactura
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                📋 Sin factura (SN)
              </button>
            </div>

            {/* Número de factura */}
            {!form.esSinFactura && (
              <div>
                <label className="label">Número de factura (ARCA)</label>
                <input type="text" value={form.nroFactura}
                  onChange={e => setForm({ ...form, nroFactura: e.target.value })}
                  className="input" placeholder="A-0001-00000001" />
              </div>
            )}

            {/* Importe neto */}
            <div>
              <label className="label">
                Total neto (sin IVA) <span className="text-red-500">*</span>
              </label>
              <input
                type="number" min={0} value={form.totalNeto}
                onChange={e => calcularIva(e.target.value)}
                className="input"
                placeholder="Ingresá el importe neto y el IVA se calcula solo"
                required
              />
            </div>

            {form.totalNeto && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">IVA 21%</p>
                  <p className="font-semibold text-gray-900">{formatPesos(parseFloat(form.iva) || 0)}</p>
                </div>
                <div className="p-3 bg-[#16A34A]/10 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Total con IVA</p>
                  <p className="font-bold text-[#16A34A] text-lg">{formatPesos(parseFloat(form.totalConIva) || 0)}</p>
                </div>
              </div>
            )}

            {/* Vencimiento */}
            <div>
              <label className="label">Fecha de vencimiento</label>
              <input type="date" value={form.fechaVencimiento}
                onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })}
                className="input" />
              <p className="text-xs text-gray-400 mt-1">
                Para pallets nuevos: 7 días desde la entrega. Para semi-nuevos: contra-entrega.
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none" rows={2} />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={crearFactura.isPending} className="btn-primary">
              {crearFactura.isPending ? 'Registrando...' : 'Registrar factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
