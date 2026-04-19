import { useState, useEffect } from 'react';
import { X, Receipt } from 'lucide-react';
import { useCrearFactura } from '../../hooks/useFacturacion';
import api from '../../services/api';

interface NuevaFacturaProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface VentaSinFactura {
  id: number;
  totalSinIva?: number;
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

  // Cuando se selecciona una venta, auto-calcula los montos y detecta si tiene IVA
  const handleVentaChange = (ventaId: number) => {
    const v = ventas.find(x => x.id === ventaId);
    if (v && v.totalConIva) {
      const total = Number(v.totalConIva);
      const neto = Number(v.totalSinIva ?? 0);
      // Si totalSinIva === totalConIva → sin IVA; sino → con IVA (Factura A)
      const sinIva = neto > 0 && Math.abs(total - neto) < 1;
      const ivaCalc = sinIva ? 0 : (neto > 0 ? total - neto : Math.round(total - total / 1.21));
      const netoFinal = sinIva ? total : (neto > 0 ? neto : Math.round(total / 1.21));
      setForm(f => ({
        ...f,
        ventaId,
        esSinFactura: sinIva,
        totalConIva: String(total),
        totalNeto: String(netoFinal),
        iva: String(ivaCalc),
      }));
    } else {
      setForm(f => ({ ...f, ventaId, totalConIva: '', totalNeto: '', iva: '' }));
    }
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.375rem' }}
            >
              <Receipt size={15} style={{ color: '#fff' }} />
            </div>
            <h2 className="modal-title">Registrar factura</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Selector de venta */}
            <div>
              <label className="label">Venta asociada <span className="text-red-500">*</span></label>
              {!ventas.length ? (
                <div
                  className="flex items-center gap-2 p-3 text-sm text-gray-500"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
                >
                  No hay ventas sin factura pendiente
                </div>
              ) : (
                <select
                  value={form.ventaId}
                  onChange={e => handleVentaChange(parseInt(e.target.value))}
                  className="input-field"
                  required
                >
                  <option value={0}>Seleccioná una venta...</option>
                  {ventas.map(v => (
                    <option key={v.id} value={v.id}>
                      #{v.id} — {v.cliente?.razonSocial} — {formatPesos(Number(v.totalConIva ?? 0))}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Info venta seleccionada */}
            {ventaSeleccionada && (
              <div
                className="p-3 space-y-0.5"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
              >
                <p className="text-sm font-semibold text-gray-800">{ventaSeleccionada.cliente?.razonSocial}</p>
                <p className="text-xs text-gray-500">
                  {ventaSeleccionada.detalles?.map(d =>
                    `${d.producto?.nombre} (${d.cantidadPedida}u)`
                  ).join(' · ')}
                </p>
              </div>
            )}

            {/* Tipo de comprobante — solo lectura, viene de cotización */}
            {form.ventaId > 0 && (
              <div
                className="flex items-center gap-3 p-3"
                style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
              >
                <span className="text-xl">{form.esSinFactura ? '📋' : '🧾'}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {form.esSinFactura ? 'Sin factura (SN)' : 'Factura A'}
                  </p>
                  <p className="text-xs text-gray-400">Definido en la cotización · no editable</p>
                </div>
              </div>
            )}

            {/* N° ARCA — solo si es Factura A */}
            {form.ventaId > 0 && !form.esSinFactura && (
              <div>
                <label className="label">N° de factura ARCA</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: 00001-00000001"
                  value={form.nroFactura}
                  onChange={e => setForm({ ...form, nroFactura: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Opcional — podés cargarlo después desde la tabla.</p>
              </div>
            )}

            {/* Importes — auto-calculados, solo lectura */}
            {form.ventaId > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="p-3"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Neto (sin IVA)</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPesos(parseFloat(form.totalNeto) || 0)}
                  </p>
                </div>
                <div
                  className="p-3"
                  style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.375rem' }}
                >
                  <p className="text-xs text-gray-500 mb-1">IVA 21%</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPesos(parseFloat(form.iva) || 0)}
                  </p>
                </div>
                <div
                  className="p-3"
                  style={{ background: '#F3EDE8', border: '1px solid #D4B49A', borderRadius: '0.375rem' }}
                >
                  <p className="text-xs text-gray-500 mb-1">Total con IVA</p>
                  <p className="text-sm font-bold" style={{ color: '#6B3A2A' }}>
                    {formatPesos(parseFloat(form.totalConIva) || 0)}
                  </p>
                </div>
              </div>
            )}

            {/* Fecha de vencimiento */}
            <div>
              <label className="label">Fecha de vencimiento</label>
              <input
                type="date"
                className="input-field"
                value={form.fechaVencimiento}
                onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Pallets nuevos: 7 días desde entrega · Semi-nuevos: contra-entrega
              </p>
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Notas internas sobre esta factura..."
                value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="px-3 py-2.5 text-sm text-red-700"
                style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '0.375rem' }}
              >
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearFactura.isPending || !form.ventaId}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: form.ventaId
                  ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                  : '#D1D5DB',
                color: 'white', fontWeight: 500, fontSize: '0.875rem',
                padding: '0.5rem 1.25rem', borderRadius: '0.375rem',
                border: 'none', cursor: form.ventaId ? 'pointer' : 'not-allowed',
                opacity: crearFactura.isPending ? 0.7 : 1,
              }}
            >
              <Receipt size={14} />
              {crearFactura.isPending ? 'Registrando...' : 'Registrar factura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
