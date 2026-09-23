import { useState } from 'react';
import { AlertTriangle, CheckCircle, X, XCircle } from 'lucide-react';
import { useCancelacionPreview, useCancelarVenta } from '../../hooks/useVentas';
import LoadingSpinner from '../ui/LoadingSpinner';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

// Confirmación de seguridad para cancelar una venta (se usa desde Ventas y
// desde Retiros). Muestra qué se va a cancelar en cada módulo, pide el motivo
// y recién ahí cancela todo en cascada.
export default function CancelarVentaModal({
  ventaId,
  titulo = 'Cancelar venta',
  onClose,
  onCancelada,
}: {
  ventaId: number;
  titulo?: string;
  onClose: () => void;
  onCancelada?: () => void;
}) {
  const { data: preview, isLoading, isError } = useCancelacionPreview(ventaId);
  const cancelar = useCancelarVenta();
  const [motivo, setMotivo] = useState('');
  const [cancelarCompras, setCancelarCompras] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<{ stockRestaurado: { producto: string; cantidad: number }[]; comprasCanceladas: number[] } | null>(null);

  const handleConfirmar = async () => {
    setError('');
    if (motivo.trim().length < 3) {
      setError('Escribí el motivo de la cancelación para dejarlo registrado.');
      return;
    }
    try {
      const res = await cancelar.mutateAsync({ ventaId, motivo: motivo.trim(), cancelarCompras });
      setResultado(res);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error ?? 'No se pudo cancelar la venta.');
    }
  };

  const cerrar = () => {
    if (resultado) onCancelada?.();
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }} onClick={e => e.stopPropagation()}>
      <div className="modal max-w-lg animate-slide-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <XCircle size={17} className="text-red-600" />
            </div>
            <h2 className="modal-title">{titulo}</h2>
          </div>
          <button onClick={cerrar} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="modal-body space-y-4">
          {isLoading ? (
            <div className="py-6"><LoadingSpinner text="Revisando la venta..." /></div>
          ) : isError || !preview ? (
            <p className="text-sm text-red-600">No se pudo cargar la información de la venta.</p>
          ) : resultado ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-gray-900">Venta #{ventaId} cancelada</p>
              <p className="text-sm text-gray-500 mt-1">
                Se canceló en todos los módulos y quedó registrada como cancelada con su motivo.
              </p>
              {resultado.stockRestaurado.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Volvieron al stock: {resultado.stockRestaurado.map(s => `${s.cantidad} u. de ${s.producto}`).join(', ')}.
                </p>
              )}
              {resultado.comprasCanceladas.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Compras al proveedor canceladas: {resultado.comprasCanceladas.map(id => `#${id}`).join(', ')}.
                </p>
              )}
            </div>
          ) : !preview.puedeCancelar ? (
            <div className="flex gap-3 p-3 border border-amber-200 bg-amber-50">
              <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{preview.motivoNoCancelable}</p>
            </div>
          ) : (
            <>
              <p className="text-base font-semibold text-gray-900">
                ¿Estás seguro de que querés cancelar la venta #{ventaId} de {preview.cliente}?
              </p>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Se va a cancelar en todo el sistema</p>
                <ul className="border border-gray-200 divide-y divide-gray-100">
                  {preview.impactos.map((i, idx) => (
                    <li key={idx} className="flex gap-3 px-3 py-2 text-sm">
                      <span className="font-semibold text-gray-700 shrink-0" style={{ minWidth: 110 }}>{i.modulo}</span>
                      <span className="text-gray-600">{i.detalle}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {preview.advertencias.length > 0 && (
                <div className="space-y-2">
                  {preview.advertencias.map((a, idx) => (
                    <div key={idx} className="flex gap-2.5 p-3 border border-amber-200 bg-amber-50">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800">{a}</p>
                    </div>
                  ))}
                </div>
              )}

              {preview.comprasPendientes.length > 0 && (
                <label className="flex items-start gap-2.5 p-3 border border-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cancelarCompras}
                    onChange={e => setCancelarCompras(e.target.checked)}
                    style={{ width: 16, height: 16, marginTop: 2, accentColor: '#DC2626' }}
                  />
                  <span className="text-sm text-gray-700">
                    Cancelar también {preview.comprasPendientes.length === 1 ? 'la compra al proveedor pendiente de pago' : 'las compras al proveedor pendientes de pago'}:{' '}
                    {preview.comprasPendientes.map(c => `#${c.id} ${c.proveedor} (${formatPesos(c.total)})`).join(', ')}
                  </span>
                </label>
              )}

              <div>
                <label className="label">Motivo de la cancelación <span className="text-red-500">*</span></label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  autoFocus
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Ej: el cliente desistió de la compra, error en el pedido..."
                />
                <p className="text-xs text-gray-400 mt-1">Queda registrado en la venta y en la factura anulada.</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        <div className="modal-footer">
          {resultado || (preview && !preview.puedeCancelar) || isError ? (
            <button onClick={cerrar} className="btn-secondary">Cerrar</button>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary" disabled={cancelar.isPending}>No, volver</button>
              <button
                onClick={handleConfirmar}
                className="btn-danger"
                disabled={isLoading || cancelar.isPending || motivo.trim().length < 3}
                style={{ opacity: isLoading || cancelar.isPending || motivo.trim().length < 3 ? 0.55 : 1 }}
              >
                <XCircle size={15} />
                {cancelar.isPending ? 'Cancelando...' : 'Sí, cancelar venta'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
