import { useState } from 'react';
import { X, ArrowRight, FileText, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useConvertirAVenta } from '../../hooks/useCotizaciones';
import { useCotizacion } from '../../hooks/useCotizaciones';
import { useStock } from '../../hooks/useInventario';
import { useQueryClient } from '@tanstack/react-query';
import SignaturePad from '../../components/ui/SignaturePad';

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
  const { data: cotizacion } = useCotizacion(cotizacionId);
  const { data: stockItems } = useStock();
  const [error, setError] = useState('');
  const [usaStockPropio, setUsaStockPropio] = useState(false);
  const [emitirRemito, setEmitirRemito] = useState(false);
  const [firmaPropietario, setFirmaPropietario] = useState<string | null>(null);

  const [form, setForm] = useState({
    tipoEntrega: (incluyeFlete ? 'envio_woodpallet' : 'retira_cliente') as 'retira_cliente' | 'envio_woodpallet' | '',
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
    if (emitirRemito && !firmaPropietario) {
      setError('Debés firmar el remito antes de continuar'); return;
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
          usaStockPropio,
          emitirRemito,
          firmaPropietario: firmaPropietario ?? undefined,
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
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 mb-2">
                {incluyeFlete
                  ? <>La cotización <strong>incluye flete</strong> — tipo de entrega fijado en <strong>Envío</strong>.</>
                  : <>La cotización <strong>no incluye flete</strong> — tipo de entrega fijado en <strong>Retiro en galpón</strong>.</>
                }
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'envio_woodpallet', label: 'Envío' },
                  { value: 'retira_cliente',   label: 'Retiro en galpón' },
                ].map(op => {
                  const esSeleccionado = form.tipoEntrega === op.value;
                  return (
                    <div key={op.value}
                      className={`p-3 rounded-xl border text-left text-sm font-medium cursor-default select-none ${
                        esSeleccionado
                          ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                          : 'border-gray-200 bg-gray-50 text-gray-300'
                      }`}>
                      {op.label}
                    </div>
                  );
                })}
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
              <label className="label">Origen del stock</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true,  label: 'Stock propio' },
                  { value: false, label: 'Compra directa' },
                ].map(op => (
                  <button key={String(op.value)} type="button"
                    onClick={() => setUsaStockPropio(op.value)}
                    className={`p-3 rounded-xl border text-left transition-all text-sm font-medium ${
                      usaStockPropio === op.value
                        ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>

              {/* Stock disponible por producto */}
              {usaStockPropio && cotizacion?.detalles && (
                <div className="mt-3 flex flex-col gap-2">
                  {(cotizacion.detalles as { productoId: number | null; producto?: { nombre: string } | null; cantidadPedida?: number; cantidad?: number }[])
                    .filter(d => d.productoId != null)
                    .map(d => {
                      const stockItem = (stockItems as { producto: { id: number; nombre: string }; cantidadDisponible: number }[] | undefined)
                        ?.find(s => s.producto.id === d.productoId);
                      const disponible = stockItem?.cantidadDisponible ?? null;
                      const pedido = d.cantidadPedida ?? d.cantidad ?? 0;
                      const suficiente = disponible !== null && disponible >= pedido;
                      return (
                        <div
                          key={d.productoId}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0.6rem 0.875rem',
                            background: disponible === null ? '#F9FAFB' : suficiente ? '#F0FDF4' : '#FFF7ED',
                            border: `1px solid ${disponible === null ? '#E5E7EB' : suficiente ? '#86EFAC' : '#FED7AA'}`,
                            borderRadius: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={14} style={{ color: disponible === null ? '#9CA3AF' : suficiente ? '#16A34A' : '#D97706', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>
                              {d.producto?.nombre ?? `Producto #${d.productoId}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                            {disponible === null ? (
                              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Sin datos de stock</span>
                            ) : (
                              <>
                                <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                  Pedido: <strong>{pedido} u</strong>
                                </span>
                                <span style={{
                                  fontSize: '0.75rem', fontWeight: 700,
                                  color: suficiente ? '#16A34A' : '#D97706',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}>
                                  {suficiente
                                    ? <CheckCircle size={12} />
                                    : <AlertTriangle size={12} />}
                                  Stock: {disponible} u
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
                        ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
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
                        ? 'border-[#16A34A] bg-green-50 text-[#16A34A]'
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

            {/* Emitir remito */}
            <div>
              <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={14} /> ¿Emitir remito de entrega?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: false, label: 'No' }, { value: true, label: 'Sí, emitir remito' }].map(op => (
                  <button key={String(op.value)} type="button"
                    onClick={() => { setEmitirRemito(op.value); if (!op.value) setFirmaPropietario(null); }}
                    className={`p-3 rounded-xl border text-left transition-all text-sm font-medium ${
                      emitirRemito === op.value
                        ? 'border-[#6B3A2A] bg-[#FEF3E2] text-[#6B3A2A]'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }`}>
                    {op.label}
                  </button>
                ))}
              </div>
              {emitirRemito && (
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-gray-500">
                    Se enviará un email al cliente con el remito. Él recibirá un enlace para firmarlo digitalmente. Ambos recibirán copia firmada.
                  </p>
                  <SignaturePad
                    label="Tu firma (propietario) *"
                    required
                    onSignature={setFirmaPropietario}
                    height={130}
                  />
                </div>
              )}
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
