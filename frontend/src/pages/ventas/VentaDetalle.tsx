import { useState } from 'react';
import { X, Truck, Receipt, ChevronRight, Plus, AlertCircle } from 'lucide-react';
import { useVenta, useActualizarEstadoVenta, useRegistrarRetiro } from '../../hooks/useVentas';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { clsx } from 'clsx';

interface VentaDetalleProps {
  ventaId: number;
  onClose: () => void;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const estadosOrden = [
  'confirmado', 'en_preparacion', 'listo_para_envio',
  'en_transito', 'entregado'
];

const estadoLabel: Record<string, string> = {
  confirmado:        'Confirmado',
  en_preparacion:    'En preparación',
  listo_para_envio:  'Listo para envío',
  en_transito:       'En tránsito',
  entregado:         'Entregado',
  entregado_parcial: 'Entregado parcial',
  cancelado:         'Cancelado'
};

type Tab = 'detalle' | 'retiros' | 'logistica' | 'factura';

export default function VentaDetalle({ ventaId, onClose }: VentaDetalleProps) {
  const { data: venta, isLoading } = useVenta(ventaId);
  const actualizarEstado = useActualizarEstadoVenta();
  const registrarRetiro = useRegistrarRetiro();
  const [retiroDetalle, setRetiroDetalle] = useState<number | null>(null);
  const [cantidadRetiro, setCantidadRetiro] = useState(0);
  const [errorRetiro, setErrorRetiro] = useState('');
  const [tab, setTab] = useState<Tab>('detalle');

  const handleRetiro = async (detalleId: number) => {
    setErrorRetiro('');
    if (!cantidadRetiro || cantidadRetiro < 1) {
      setErrorRetiro('Ingresá una cantidad válida');
      return;
    }
    try {
      await registrarRetiro.mutateAsync({
        ventaId,
        detalleVentaId: detalleId,
        cantidadRetirada: cantidadRetiro
      });
      setRetiroDetalle(null);
      setCantidadRetiro(0);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setErrorRetiro(error.response?.data?.error || 'Error al registrar el retiro');
    }
  };

  const siguienteEstado = (actual: string): string | null => {
    const idx = estadosOrden.indexOf(actual);
    return idx >= 0 && idx < estadosOrden.length - 1 ? estadosOrden[idx + 1] : null;
  };

  const tabs = [
    { key: 'detalle',   label: '📦 Detalle' },
    { key: 'retiros',   label: '🔄 Retiros' },
    { key: 'logistica', label: '🚛 Logística' },
    { key: 'factura',   label: '🧾 Factura' },
  ] as const;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-3xl animate-slide-up">

        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="modal-title">Venta #{ventaId}</h2>
              {venta && <EstadoBadge estado={venta.estadoPedido} />}
            </div>
            {venta && (
              <p className="text-sm text-gray-500 mt-1">
                {venta.cliente?.razonSocial} · {formatFecha(venta.fechaVenta)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {isLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : venta && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={clsx(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                    tab === t.key
                      ? 'border-[#16A34A] text-[#16A34A]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="modal-body max-h-[60vh] overflow-y-auto">

              {/* Tab: Detalle */}
              {tab === 'detalle' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Tipo de entrega</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {venta.tipoEntrega === 'retira_cliente' ? '🏭 Retira el cliente' : '🚛 Envío coordinado'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Fecha estimada de entrega</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {venta.fechaEstimEntrega ? formatFecha(venta.fechaEstimEntrega) : 'No definida'}
                      </p>
                    </div>
                    {venta.requiereSenasa && (
                      <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-sm text-green-700 font-medium">🌿 Requiere tratamiento SENASA</p>
                      </div>
                    )}
                  </div>

                  {/* Productos */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Productos del pedido</p>
                    <div className="space-y-2">
                      {venta.detalles?.map(d => {
                        const totalRetirado = (d.retiros as { cantidadRetirada: number }[] | undefined)
                          ?.reduce((a, r) => a + r.cantidadRetirada, 0) || 0;
                        const pendiente = d.cantidadPedida - totalRetirado;
                        const pct = Math.round((totalRetirado / d.cantidadPedida) * 100);
                        return (
                          <div key={d.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-semibold text-gray-900">{d.producto?.nombre}</p>
                              <p className="text-sm font-bold text-gray-900">{formatPesos(d.subtotal)}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                              <span>Pedido: {d.cantidadPedida} u</span>
                              <span className="text-green-600">Entregado: {totalRetirado} u</span>
                              <span className={pendiente > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                                Pendiente: {pendiente} u
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#16A34A] rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-[#1c3557] rounded-xl text-white">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-300">Total con IVA</span>
                      <span className="text-xl font-bold">{formatPesos(venta.totalConIva || 0)}</span>
                    </div>
                    {venta.costoFlete && (
                      <p className="text-xs text-gray-400 mt-1">
                        Flete: {formatPesos(venta.costoFlete)}
                      </p>
                    )}
                  </div>

                  {/* Avanzar estado */}
                  {siguienteEstado(venta.estadoPedido) && (
                    <button
                      onClick={() => actualizarEstado.mutate({
                        id: ventaId,
                        estado: siguienteEstado(venta.estadoPedido)!
                      })}
                      disabled={actualizarEstado.isPending}
                      className="btn-primary w-full justify-center"
                    >
                      <ChevronRight size={16} />
                      Avanzar a: {estadoLabel[siguienteEstado(venta.estadoPedido)!]}
                    </button>
                  )}
                </div>
              )}

              {/* Tab: Retiros */}
              {tab === 'retiros' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Registrá cada vez que el cliente retira una parte del pedido.
                    El stock se descuenta automáticamente.
                  </p>
                  {venta.detalles?.map(d => {
                    const retiros = d.retiros as { fechaRetiro: string; cantidadRetirada: number }[] | undefined;
                    const totalRetirado = retiros?.reduce((a, r) => a + r.cantidadRetirada, 0) || 0;
                    const pendiente = d.cantidadPedida - totalRetirado;

                    return (
                      <div key={d.id} className="card-p">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-semibold text-gray-900">{d.producto?.nombre}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {totalRetirado} / {d.cantidadPedida} unidades entregadas
                            </p>
                          </div>
                          {pendiente > 0
                            ? <span className="badge-yellow">{pendiente} pendientes</span>
                            : <span className="badge-green">✓ Completo</span>
                          }
                        </div>

                        {retiros && retiros.length > 0 && (
                          <div className="space-y-1.5 mb-3">
                            {retiros.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                                <span className="text-gray-500">{formatFecha(r.fechaRetiro)}</span>
                                <span className="font-semibold text-gray-900">{r.cantidadRetirada} unidades</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {pendiente > 0 && (
                          retiroDetalle === d.id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  max={pendiente}
                                  value={cantidadRetiro || ''}
                                  onChange={e => setCantidadRetiro(parseInt(e.target.value) || 0)}
                                  placeholder={`Máx. ${pendiente} u`}
                                  className="input flex-1 text-sm"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleRetiro(d.id)}
                                  disabled={registrarRetiro.isPending}
                                  className="btn-primary"
                                >
                                  {registrarRetiro.isPending ? '...' : 'Registrar'}
                                </button>
                                <button
                                  onClick={() => { setRetiroDetalle(null); setErrorRetiro(''); }}
                                  className="btn-secondary"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              {errorRetiro && (
                                <p className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle size={12} /> {errorRetiro}
                                </p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setRetiroDetalle(d.id); setCantidadRetiro(0); setErrorRetiro(''); }}
                              className="btn-secondary text-sm w-full justify-center"
                            >
                              <Plus size={15} /> Registrar retiro parcial
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: Logística */}
              {tab === 'logistica' && (
                <div>
                  {venta.logistica ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Transportista</p>
                          <p className="text-sm font-semibold text-gray-900">{venta.logistica.nombreTransportista}</p>
                          {venta.logistica.telefonoTransp && (
                            <p className="text-xs text-gray-400">{venta.logistica.telefonoTransp}</p>
                          )}
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Estado de entrega</p>
                          <EstadoBadge estado={venta.logistica.estadoEntrega} />
                        </div>
                        {venta.logistica.fechaRetiroGalpon && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Fecha de retiro del galpón</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatFecha(venta.logistica.fechaRetiroGalpon)}
                            </p>
                          </div>
                        )}
                        {venta.logistica.costoFlete && (
                          <div className="p-3 bg-gray-50 rounded-xl">
                            <p className="text-xs text-gray-500 mb-1">Costo del flete</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatPesos(venta.logistica.costoFlete)}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        {[
                          { ok: venta.logistica.confTransportista, label: 'Confirmación transportista' },
                          { ok: venta.logistica.confCliente, label: 'Confirmación cliente' },
                        ].map(({ ok, label }) => (
                          <div key={label} className={clsx(
                            'flex-1 p-3 rounded-xl border text-center',
                            ok ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                          )}>
                            <p className="text-xs text-gray-500 mb-1">{label}</p>
                            <p className={clsx('text-sm font-semibold', ok ? 'text-green-700' : 'text-gray-400')}>
                              {ok ? '✓ Confirmado' : 'Pendiente'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon"><Truck size={22} /></div>
                      <p className="text-sm font-semibold text-gray-700">Sin logística coordinada</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {venta.tipoEntrega === 'retira_cliente'
                          ? 'El cliente retira directamente del galpón'
                          : 'Coordiná la entrega desde el módulo de Logística'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Factura */}
              {tab === 'factura' && (
                <div>
                  {venta.facturas && venta.facturas.length > 0 ? (
                    <div className="space-y-3">
                      {(venta.facturas as Record<string, unknown>[]).map((f) => (
                        <div key={f.id as number} className="card-p">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-gray-900">
                                {f.esSinFactura ? 'Operación SN (sin factura)' : `Factura A ${(f.nroFactura as string) || ''}`}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Emitida: {formatFecha(f.fechaEmision as string)}
                                {f.fechaVencimiento && ` · Vence: ${formatFecha(f.fechaVencimiento as string)}`}
                              </p>
                            </div>
                            <EstadoBadge estado={f.estadoCobro as string} />
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">Neto</p>
                              <p className="text-sm font-semibold">{formatPesos(f.totalNeto as number)}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">IVA 21%</p>
                              <p className="text-sm font-semibold">{formatPesos(f.iva as number)}</p>
                            </div>
                            <div className="p-2 bg-[#16A34A]/10 rounded-lg">
                              <p className="text-xs text-gray-500">Total</p>
                              <p className="text-sm font-bold text-[#16A34A]">{formatPesos(f.totalConIva as number)}</p>
                            </div>
                          </div>
                          {(f.pagos as Record<string, unknown>[] | undefined)?.length && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs font-semibold text-gray-500 mb-2">Pagos recibidos</p>
                              {(f.pagos as Record<string, unknown>[]).map((p) => (
                                <div key={p.id as number} className="flex justify-between text-xs text-gray-600 py-1">
                                  <span>{formatFecha(p.fechaPago as string)} · {p.medioPago as string}</span>
                                  <span className="font-semibold text-green-700">{formatPesos(p.monto as number)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <div className="empty-icon"><Receipt size={22} /></div>
                      <p className="text-sm font-semibold text-gray-700">Sin factura emitida</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Emitila desde ARCA y registrala en el módulo de Facturación
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
