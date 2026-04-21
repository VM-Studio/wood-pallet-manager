import { useState } from 'react';
import { Plus, Search, Check, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCompras, useDeudaProveedores, useRegistrarPagoCompra, useCancelarCompra } from '../../hooks/useCompras';
import NuevaCompra from './NuevaCompra';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const tipoCompraLabel: Record<string, string> = {
  reventa_inmediata: 'Reventa inmediata',
  stock_propio:      'Stock propio',
};

export default function ComprasPage() {
  const { data: compras, isLoading, error } = useCompras();
  const { data: deuda } = useDeudaProveedores();
  const registrarPago = useRegistrarPagoCompra();
  const cancelarCompra = useCancelarCompra();
  const [busqueda, setBusqueda] = useState('');
  const [showNueva, setShowNueva] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [pagoModal, setPagoModal] = useState<number | null>(null);
  const [pagoForm, setPagoForm] = useState({
    metodoPago: '' as 'transferencia' | 'e_check' | 'efectivo' | '',
    cuentaDestino: '',
    nroComprobante: '',
  });
  const [errorPago, setErrorPago] = useState('');

  const filtradas = compras?.filter(c =>
    c.proveedor?.nombreEmpresa.toLowerCase().includes(busqueda.toLowerCase()) ||
    `#${c.id}`.includes(busqueda)
  );

  const deudaTotal = deuda?.reduce((acc: number, d: any) => acc + d.deudaTotal, 0) || 0;

  const handlePago = async (compraId: number) => {
    setErrorPago('');
    if (!pagoForm.metodoPago) { setErrorPago('Seleccioná el método de pago'); return; }
    if (pagoForm.metodoPago === 'transferencia' && !pagoForm.cuentaDestino) {
      setErrorPago('Seleccioná la cuenta destino'); return;
    }
    try {
      await registrarPago.mutateAsync({ id: compraId, datos: pagoForm });
      setPagoModal(null);
      setPagoForm({ metodoPago: '', cuentaDestino: '', nroComprobante: '' });
    } catch (err: any) {
      setErrorPago(err.response?.data?.error || 'Error al registrar el pago');
    }
  };

  if (isLoading) return <LoadingSpinner text="Cargando compras..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar las compras." />;

  return (
    <div className="space-y-6">

      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Compras</h1>
          <p className="text-sm text-gray-500 mt-1">{compras?.length || 0} compras registradas</p>
        </div>
        <button onClick={() => setShowNueva(true)} className="btn-brand">
          <Plus size={16} /> Nueva compra
        </button>
      </div>

      {/* Deuda total */}
      {deudaTotal > 0 && (
        <div className="card-base border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Saldo deudor total con proveedores</p>
                <p className="text-xs text-gray-400">Compras registradas pendientes de pago</p>
              </div>
            </div>
            <p className="text-xl font-bold text-amber-600">{formatPesos(deudaTotal)}</p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por proveedor o número..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="input pl-10" />
      </div>

      {/* Lista de compras */}
      {!filtradas?.length ? (
        <div className="empty-state">
          <p className="text-sm font-semibold text-gray-700">Sin compras registradas</p>
          <p className="text-sm text-gray-400 mt-1">Registrá la primera con el botón de arriba</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(c => (
            <div key={c.id} className="card-base">
              {/* Header de la compra */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandido(expandido === c.id ? null : c.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">
                        #{c.id} — {c.proveedor?.nombreEmpresa}
                      </p>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600">
                        {tipoCompraLabel[c.tipoCompra] || c.tipoCompra}
                      </span>
                      {c.saldoDeudor && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700">
                          Saldo deudor
                        </span>
                      )}
                      {c.estado === 'pagada' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-green-100 text-green-700">
                          Pagada
                        </span>
                      )}
                      {c.estado === 'cancelada' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-red-100 text-red-700">
                          Cancelada
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatFecha(c.fechaCompra)} · {formatPesos(Number(c.total || 0))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {c.estado === 'pendiente_pago' && (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setPagoModal(c.id);
                          setPagoForm({ metodoPago: '', cuentaDestino: '', nroComprobante: '' });
                          setErrorPago('');
                        }}
                        className="w-9 h-9 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center text-green-600 hover:bg-green-100 transition-colors"
                        title="Registrar pago"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('¿Cancelar esta compra? El galpón no tiene stock disponible.')) {
                            cancelarCompra.mutate(c.id);
                          }
                        }}
                        className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                        title="Cancelar compra — sin stock"
                      >
                        <X size={16} />
                      </button>
                    </>
                  )}
                  {expandido === c.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {expandido === c.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="space-y-1.5">
                    {c.detalles?.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-700">{d.producto?.nombre}</span>
                        <span className="text-gray-500 text-xs">{d.cantidad} u × {formatPesos(d.precioCostoUnit)}</span>
                        <span className="font-semibold text-gray-900">{formatPesos(d.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  {c.estado === 'pagada' && c.metodoPago && (
                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                      <p className="text-xs text-green-700 font-medium">
                        Pagado con {c.metodoPago}
                        {c.cuentaDestino && ` — ${c.cuentaDestino.replace(/_/g, ' ')}`}
                        {c.nroComprobante && ` — Comp: ${c.nroComprobante}`}
                        {c.fechaPago && ` — ${formatFecha(c.fechaPago)}`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showNueva && (
        <NuevaCompra
          onClose={() => setShowNueva(false)}
          onSuccess={() => setShowNueva(false)}
        />
      )}

      {/* Modal de pago */}
      {pagoModal !== null && (
        <div className="modal-overlay">
          <div className="modal max-w-md animate-slide-up">
            <div className="modal-header">
              <h2 className="modal-title">Registrar pago al proveedor</h2>
              <button onClick={() => setPagoModal(null)} className="btn-icon"><X size={18} /></button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm text-gray-500">
                Seleccioná cómo pagaste esta compra al proveedor.
              </p>

              <div>
                <label className="label">Método de pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'transferencia', label: 'Transferencia' },
                    { value: 'e_check',       label: 'E-check' },
                    { value: 'efectivo',      label: 'Efectivo' },
                  ].map(op => (
                    <button key={op.value} type="button"
                      onClick={() => setPagoForm(prev => ({
                        ...prev,
                        metodoPago: op.value as any,
                        cuentaDestino: op.value === 'e_check' ? 'banco_provincia' : ''
                      }))}
                      className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                        pagoForm.metodoPago === op.value
                          ? 'border-[#6B3A2A] bg-orange-50 text-[#6B3A2A]'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                      }`}>
                      {op.label}
                    </button>
                  ))}
                </div>

                {pagoForm.metodoPago === 'transferencia' && (
                  <div className="mt-3 space-y-2">
                    <label className="label">Cuenta desde la que transferiste</label>
                    {[
                      { value: 'cuenta_personal',     label: 'Mi cuenta personal' },
                      { value: 'mercado_pago_empresa', label: 'Mercado Pago cuenta empresa' },
                      { value: 'banco_provincia',      label: 'Banco Provincia' },
                    ].map(op => (
                      <label key={op.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100">
                        <input type="radio" name="cuentaDestinoPago" value={op.value}
                          checked={pagoForm.cuentaDestino === op.value}
                          onChange={() => setPagoForm(prev => ({ ...prev, cuentaDestino: op.value }))}
                          className="w-4 h-4" />
                        <span className="text-sm text-gray-700">{op.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {pagoForm.metodoPago === 'e_check' && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-2">
                    <input type="checkbox" checked readOnly className="w-4 h-4" />
                    <span className="text-sm text-gray-700 font-medium">Banco Provincia</span>
                    <span className="text-xs text-gray-400">(seleccionado automáticamente)</span>
                  </div>
                )}
              </div>

              <div>
                <label className="label">N° de comprobante (opcional)</label>
                <input type="text"
                  value={pagoForm.nroComprobante}
                  onChange={e => setPagoForm(prev => ({ ...prev, nroComprobante: e.target.value }))}
                  className="input" placeholder="Número de transferencia o cheque" />
              </div>

              {errorPago && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                  {errorPago}
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setPagoModal(null)} className="btn-secondary">Cancelar</button>
              <button
                onClick={() => handlePago(pagoModal)}
                disabled={registrarPago.isPending}
                className="btn-primary"
              >
                {registrarPago.isPending ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
