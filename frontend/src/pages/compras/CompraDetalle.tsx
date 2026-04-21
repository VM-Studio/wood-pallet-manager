import { useState } from 'react';
import { X, ChevronRight, DollarSign, CheckCircle } from 'lucide-react';
import { useCompra, useActualizarEstadoCompra, useRegistrarPagoProveedor } from '../../hooks/useCompras';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { clsx } from 'clsx';

interface CompraDetalleProps {
  compraId: number;
  onClose: () => void;
}

interface PagoCompra {
  id: number;
  monto: number;
  fechaPago: string;
  medioPago: string;
  nroComprobante?: string;
}

interface DetalleCompraFull {
  id: number;
  cantidad: number;
  precioCostoUnit: number;
  subtotal: number;
  producto?: { nombre: string };
}

interface CompraFull {
  id: number;
  estado: string;
  fechaCompra: string;
  esAnticipado: boolean;
  total?: number;
  nroRemito?: string;
  proveedor?: { nombreEmpresa: string; nombreContacto?: string };
  detalles?: DetalleCompraFull[];
  pagos?: PagoCompra[];
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const estadosOrden = ['pendiente_pago', 'pagada'];

const estadoLabel: Record<string, string> = {
  pagada: 'Marcar como pagada'
};

export default function CompraDetalle({ compraId, onClose }: CompraDetalleProps) {
  const { data: compra, isLoading } = useCompra(compraId) as { data: CompraFull | undefined; isLoading: boolean };
  const actualizarEstado = useActualizarEstadoCompra();
  const registrarPago = useRegistrarPagoProveedor();
  const [showPago, setShowPago] = useState(false);
  const [pago, setPago] = useState({ monto: '', medioPago: 'transferencia', nroComprobante: '' });
  const [error, setError] = useState('');

  const siguienteEstado = (actual: string): string | null => {
    const idx = estadosOrden.indexOf(actual);
    return idx >= 0 && idx < estadosOrden.length - 1 ? estadosOrden[idx + 1] : null;
  };

  const handlePago = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await registrarPago.mutateAsync({
        id: compraId,
        datos: {
          monto:           parseFloat(pago.monto),
          medioPago:       pago.medioPago,
          nroComprobante:  pago.nroComprobante || undefined
        }
      });
      setShowPago(false);
      setPago({ monto: '', medioPago: 'transferencia', nroComprobante: '' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al registrar el pago');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="modal-title">Compra #{compraId}</h2>
              {compra && <EstadoBadge estado={compra.estado} />}
            </div>
            {compra && (
              <p className="text-sm text-gray-500 mt-1">
                {compra.proveedor?.nombreEmpresa} · {formatFecha(compra.fechaCompra)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : compra && (
          <div className="modal-body space-y-5">

            {/* Info general */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Proveedor</p>
                <p className="text-sm font-semibold text-gray-900">{compra.proveedor?.nombreEmpresa}</p>
                {compra.proveedor?.nombreContacto && (
                  <p className="text-xs text-gray-400">{compra.proveedor.nombreContacto}</p>
                )}
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Tipo de compra</p>
                <p className="text-sm font-semibold text-gray-900">
                  {compra.esAnticipado ? '📦 Stock anticipado' : '🔄 Compra a pedido'}
                </p>
              </div>
              {compra.nroRemito && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">N° de remito</p>
                  <p className="text-sm font-semibold text-gray-900">{compra.nroRemito}</p>
                </div>
              )}
            </div>

            {/* Productos */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Productos comprados</p>
              <div className="space-y-2">
                {compra.detalles?.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{d.producto?.nombre}</p>
                      <p className="text-xs text-gray-400">{d.cantidad} u × {formatPesos(d.precioCostoUnit)}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{formatPesos(d.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-[#1c3557] rounded-xl">
              <div className="flex justify-between items-center text-white">
                <span className="text-sm text-gray-300">Total de la compra</span>
                <span className="text-xl font-bold">{formatPesos(compra.total ?? 0)}</span>
              </div>
            </div>

            {/* Pagos realizados */}
            {(compra.pagos?.length ?? 0) > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Pagos realizados</p>
                <div className="space-y-2">
                  {compra.pagos!.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatPesos(p.monto)}</p>
                        <p className="text-xs text-gray-400">
                          {formatFecha(p.fechaPago)} · {p.medioPago}
                          {p.nroComprobante && ` · ${p.nroComprobante}`}
                        </p>
                      </div>
                      <CheckCircle size={18} className="text-green-600" />
                    </div>
                  ))}
                </div>
                {(() => {
                  const totalPagado = compra.pagos!.reduce((a, p) => a + Number(p.monto), 0);
                  const saldo = Number(compra.total ?? 0) - totalPagado;
                  return saldo > 0 ? (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between">
                      <span className="text-sm text-amber-700 font-medium">Saldo pendiente</span>
                      <span className="text-sm font-bold text-amber-700">{formatPesos(saldo)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Registrar pago */}
            {compra.estado !== 'pagada' && (
              showPago ? (
                <form onSubmit={handlePago} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Registrar pago al proveedor</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Monto ($)</label>
                      <input
                        type="number"
                        min={1}
                        value={pago.monto}
                        onChange={e => setPago({ ...pago, monto: e.target.value })}
                        className="input"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">Medio de pago</label>
                      <select
                        value={pago.medioPago}
                        onChange={e => setPago({ ...pago, medioPago: e.target.value })}
                        className="select"
                      >
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="e_check">E-check</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="label">N° comprobante</label>
                    <input
                      type="text"
                      value={pago.nroComprobante}
                      onChange={e => setPago({ ...pago, nroComprobante: e.target.value })}
                      className="input"
                      placeholder="Opcional"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                      {error}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowPago(false)} className="btn-secondary flex-1 justify-center">
                      Cancelar
                    </button>
                    <button type="submit" disabled={registrarPago.isPending} className="btn-primary flex-1 justify-center">
                      {registrarPago.isPending ? 'Registrando...' : 'Registrar pago'}
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowPago(true)} className="btn-secondary w-full justify-center">
                  <DollarSign size={16} /> Registrar pago al proveedor
                </button>
              )
            )}

            {/* Avanzar estado */}
            {siguienteEstado(compra.estado) && (
              <button
                onClick={() => actualizarEstado.mutate({
                  id: compraId,
                  estado: siguienteEstado(compra.estado)!
                })}
                disabled={actualizarEstado.isPending}
                className={clsx(
                  'w-full justify-center',
                  siguienteEstado(compra.estado) === 'recibida' ? 'btn-primary' : 'btn-secondary'
                )}
              >
                <ChevronRight size={16} />
                {estadoLabel[siguienteEstado(compra.estado)!]}
                {siguienteEstado(compra.estado) === 'recibida' && (
                  <span className="text-xs opacity-80 ml-1">(actualiza stock automáticamente)</span>
                )}
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
