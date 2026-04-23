import { useState } from 'react'
import { RotateCcw, Plus, CheckCircle, Clock, XCircle, AlertCircle, ChevronDown, ChevronUp, Package, Truck, Leaf, DollarSign } from 'lucide-react'
import { useDevoluciones, useCrearDevolucion, useConfirmarDeposito, useCancelarDevolucion, type Devolucion, type CrearDevolucionPayload } from '../../hooks/useDevoluciones'
import { useVentas } from '../../hooks/useVentas'

// ── Helpers ──────────────────────────────────────────────────────────────────
const CASO_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  pallet_danado: { label: 'Pallets dañados', color: 'bg-orange-100 text-orange-700', desc: 'Mercadería llegó dañada al cliente' },
  cliente_no_quiere: { label: 'Cliente no quiere', color: 'bg-red-100 text-red-700', desc: 'El cliente recibió y decide devolver' },
  devolucion_parcial: { label: 'Devolución parcial', color: 'bg-yellow-100 text-yellow-700', desc: 'El cliente devuelve solo parte' },
  cancelacion_anticipada: { label: 'Cancelación anticipada', color: 'bg-blue-100 text-blue-700', desc: 'Canceló antes de la entrega' },
}

const ESTADO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pendiente: { label: 'Pendiente', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-50' },
  esperando_confirmacion_deposito: { label: 'Esperando confirmación', icon: <AlertCircle className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50' },
  confirmada: { label: 'Confirmada', icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },
  procesada: { label: 'Procesada', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },
  cancelada: { label: 'Cancelada', icon: <XCircle className="w-4 h-4" />, color: 'text-gray-500 bg-gray-100' },
}

const fmt = (n?: number | null) =>
  n != null ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '$0'

// ── Modal nueva devolución ────────────────────────────────────────────────────
interface NuevaDevolucionModalProps {
  onClose: () => void
}

function NuevaDevolucionModal({ onClose }: NuevaDevolucionModalProps) {
  const { data: ventas = [] } = useVentas()
  const crear = useCrearDevolucion()

  const [ventaId, setVentaId] = useState<number | ''>('')
  const [tipoCaso, setTipoCaso] = useState<CrearDevolucionPayload['tipoCaso'] | ''>('')
  const [devuelveFlete, setDevuelveFlete] = useState(false)
  const [devuelveSenasa, setDevuelveSenasa] = useState(false)
  const [compensaSiguiente, setCompensaSiguiente] = useState(false)
  const [metodoPago, setMetodoPago] = useState('')
  const [cuentaDestino, setCuentaDestino] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [detalles, setDetalles] = useState<{ detalleVentaId?: number; productoId: number; productoNombre: string; cantidadDevuelta: number; precioUnitario: number }[]>([])
  const [error, setError] = useState('')

  const ventaSeleccionada = ventas.find(v => v.id === ventaId)

  const handleSelectVenta = (id: number) => {
    setVentaId(id)
    setDetalles([])
    const v = ventas.find(v => v.id === id)
    if (v?.detalles) {
      setDetalles(v.detalles.map(d => ({
        detalleVentaId: d.id,
        productoId: d.productoId,
        productoNombre: d.producto?.nombre ?? `Producto #${d.productoId}`,
        cantidadDevuelta: 0,
        precioUnitario: Number(d.precioUnitario),
      })))
    }
  }

  const montoTotal = detalles.reduce((acc, d) => acc + d.cantidadDevuelta * d.precioUnitario, 0)
    + (devuelveFlete && ventaSeleccionada ? Number(ventaSeleccionada.costoFlete ?? 0) : 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!ventaId || !tipoCaso) { setError('Completá todos los campos requeridos'); return }
    const detallesValidos = detalles.filter(d => d.cantidadDevuelta > 0)
    if (detallesValidos.length === 0) { setError('Indicá al menos una unidad a devolver'); return }

    try {
      await crear.mutateAsync({
        ventaId: ventaId as number,
        tipoCaso: tipoCaso as CrearDevolucionPayload['tipoCaso'],
        devuelveFlete,
        devuelveSenasa,
        compensaEnSiguientePedido: compensaSiguiente,
        metodoPago: metodoPago || undefined,
        cuentaDestino: cuentaDestino || undefined,
        observaciones: observaciones || undefined,
        detalles: detallesValidos.map(d => ({
          detalleVentaId: d.detalleVentaId,
          productoId: d.productoId,
          cantidadDevuelta: d.cantidadDevuelta,
          precioUnitario: d.precioUnitario,
        })),
      })
      onClose()
    } catch {
      setError('Error al registrar la devolución. Verificá los datos.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nueva Devolución</h2>
              <p className="text-xs text-gray-500">Registrá una devolución de mercadería</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Venta */}
          <div>
            <label className="label">Venta asociada *</label>
            <select className="input" value={ventaId} onChange={e => handleSelectVenta(Number(e.target.value))} required>
              <option value="">— Seleccioná una venta —</option>
              {ventas
                .filter(v => v.estadoPedido !== 'cancelado')
                .map(v => (
                  <option key={v.id} value={v.id}>
                    Venta #{v.id} — {v.cliente?.razonSocial} — {fmt(Number(v.totalConIva))}
                  </option>
                ))}
            </select>
          </div>

          {/* Caso */}
          <div>
            <label className="label">Tipo de devolución *</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(CASO_LABELS).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTipoCaso(key as CrearDevolucionPayload['tipoCaso'])}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${tipoCaso === key ? 'border-navy-900 bg-navy-900/5' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${val.color}`}>{val.label}</div>
                  <p className="text-xs text-gray-500">{val.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Info contextual según caso */}
          {tipoCaso === 'pallet_danado' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
              <strong>Pallets dañados:</strong> Wood Pallet asume la responsabilidad. Si el cliente seguirá comprando, podés marcar "Compensar en siguiente pedido" en lugar de devolver dinero.
            </div>
          )}
          {(tipoCaso === 'cliente_no_quiere' || tipoCaso === 'devolucion_parcial') && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
              <strong>Requiere confirmación del depósito:</strong> Se procesará el reintegro recién cuando el depósito (Brian/Todo Pallets) confirme que recibió la mercadería en buen estado.
            </div>
          )}
          {tipoCaso === 'cancelacion_anticipada' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
              <strong>Cancelación anticipada:</strong> Si el flete aún no fue ejecutado, marcá "Devolver flete" para incluirlo. Si ya fue ejecutado, solo se devuelven los pallets.
            </div>
          )}

          {/* Productos a devolver */}
          {detalles.length > 0 && (
            <div>
              <label className="label">Cantidad a devolver por producto *</label>
              <div className="space-y-2">
                {detalles.map((d, i) => (
                  <div key={d.productoId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{d.productoNombre}</p>
                      <p className="text-xs text-gray-500">{fmt(d.precioUnitario)} por unidad</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      className="input w-24 text-center"
                      value={d.cantidadDevuelta || ''}
                      placeholder="0"
                      onChange={e => setDetalles(prev => prev.map((x, j) => j === i ? { ...x, cantidadDevuelta: Math.max(0, parseInt(e.target.value) || 0) } : x))}
                    />
                    <span className="text-sm font-semibold text-gray-700 w-20 text-right">
                      {fmt(d.cantidadDevuelta * d.precioUnitario)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flete / Senasa */}
          {ventaSeleccionada && (
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${devuelveFlete ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                <input type="checkbox" checked={devuelveFlete} onChange={e => setDevuelveFlete(e.target.checked)} className="rounded" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-800">Devolver flete</span>
                  </div>
                  <p className="text-xs text-gray-500">{fmt(Number(ventaSeleccionada.costoFlete ?? 0))}</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${devuelveSenasa ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                <input type="checkbox" checked={devuelveSenasa} onChange={e => setDevuelveSenasa(e.target.checked)} className="rounded" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Leaf className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-800">Devolver SENASA</span>
                  </div>
                  <p className="text-xs text-gray-500">Solo si no se realizó</p>
                </div>
              </label>
            </div>
          )}

          {/* Compensar en siguiente pedido */}
          {tipoCaso === 'pallet_danado' && (
            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${compensaSiguiente ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>
              <input type="checkbox" checked={compensaSiguiente} onChange={e => setCompensaSiguiente(e.target.checked)} className="rounded" />
              <div>
                <p className="text-sm font-medium text-gray-800">Compensar en siguiente pedido</p>
                <p className="text-xs text-gray-500">Se sumarán los pallets sin costo en la próxima compra del cliente</p>
              </div>
            </label>
          )}

          {/* Método de pago */}
          {!compensaSiguiente && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Método de reintegro</label>
                <select className="input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="e_check">E-Check</option>
                  <option value="efectivo">Efectivo</option>
                </select>
              </div>
              <div>
                <label className="label">Cuenta destino</label>
                <input type="text" className="input" placeholder="CBU / alias" value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)} />
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="label">Observaciones</label>
            <textarea className="input resize-none" rows={2} placeholder="Detalle adicional..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />
          </div>

          {/* Resumen */}
          {montoTotal > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Pallets</span>
                <span>{fmt(detalles.reduce((a, d) => a + d.cantidadDevuelta * d.precioUnitario, 0))}</span>
              </div>
              {devuelveFlete && <div className="flex justify-between text-sm text-gray-600"><span>Flete</span><span>{fmt(Number(ventaSeleccionada?.costoFlete ?? 0))}</span></div>}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                <span>Total a reintegrar</span>
                <span className="text-green-700">{fmt(montoTotal)}</span>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1" disabled={crear.isPending}>
              {crear.isPending ? 'Registrando...' : 'Registrar devolución'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tarjeta de devolución ─────────────────────────────────────────────────────
function DevolucionCard({ dev }: { dev: Devolucion }) {
  const [expanded, setExpanded] = useState(false)
  const confirmar = useConfirmarDeposito()
  const cancelar = useCancelarDevolucion()
  const estado = ESTADO_CONFIG[dev.estado]
  const caso = CASO_LABELS[dev.tipoCaso]

  return (
    <div className="card p-0 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-gray-900">Devolución #{dev.id}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>
                {estado.icon} {estado.label}
              </span>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${caso.color}`}>{caso.label}</span>
              {dev.compensaEnSiguientePedido && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Compensa en próx. pedido</span>
              )}
            </div>
            <p className="text-sm text-gray-700 font-medium">{dev.cliente.razonSocial}</p>
            <p className="text-xs text-gray-500">Venta #{dev.ventaId} · {new Date(dev.fechaSolicitud).toLocaleDateString('es-AR')}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-gray-900">{fmt(Number(dev.montoTotal))}</p>
            <p className="text-xs text-gray-500">a reintegrar</p>
          </div>
        </div>

        {/* Desglose de montos */}
        <div className="mt-3 flex gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <Package className="w-3.5 h-3.5 text-gray-400" />
            <span>Pallets: <strong>{fmt(Number(dev.montoPallets))}</strong></span>
          </div>
          {dev.montoFlete && dev.devuelveFlete && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Truck className="w-3.5 h-3.5 text-blue-400" />
              <span>Flete: <strong>{fmt(Number(dev.montoFlete))}</strong></span>
            </div>
          )}
          {dev.montoSenasa && dev.devuelveSenasa && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <Leaf className="w-3.5 h-3.5 text-green-400" />
              <span>SENASA: <strong>{fmt(Number(dev.montoSenasa))}</strong></span>
            </div>
          )}
          {dev.stockRestaurado && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle className="w-3.5 h-3.5" /> Stock restaurado
            </span>
          )}
        </div>

        {dev.observaciones && (
          <p className="mt-2 text-xs text-gray-500 italic">"{dev.observaciones}"</p>
        )}
      </div>

      {/* Acciones */}
      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
        {dev.estado === 'esperando_confirmacion_deposito' && (
          <button
            className="btn-primary text-sm py-2 px-4"
            disabled={confirmar.isPending}
            onClick={() => confirmar.mutate(dev.id)}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            {confirmar.isPending ? 'Confirmando...' : 'Confirmar recepción en depósito'}
          </button>
        )}
        {(dev.estado === 'pendiente' || dev.estado === 'esperando_confirmacion_deposito') && (
          <button
            className="btn-secondary text-sm py-2 px-4 text-red-600 hover:bg-red-50"
            disabled={cancelar.isPending}
            onClick={() => { if (confirm('¿Cancelar esta devolución?')) cancelar.mutate(dev.id) }}
          >
            Cancelar devolución
          </button>
        )}
        <button
          className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          onClick={() => setExpanded(p => !p)}
        >
          Ver detalles {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Detalles expandidos */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Productos devueltos</p>
          <div className="space-y-2">
            {dev.detalles.map(d => (
              <div key={d.id} className="flex justify-between items-center text-sm">
                <span className="text-gray-700">{d.producto.nombre}</span>
                <span className="text-gray-500">{d.cantidadDevuelta} u. × {fmt(Number(d.precioUnitario))} = <strong>{fmt(Number(d.subtotal))}</strong></span>
              </div>
            ))}
          </div>
          {dev.metodoPago && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>Reintegro vía <strong>{dev.metodoPago}</strong>{dev.cuentaDestino ? ` → ${dev.cuentaDestino}` : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DevolucionesPage() {
  const { data: devoluciones = [], isLoading } = useDevoluciones()
  const [showModal, setShowModal] = useState(false)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

  const filtradas = filtroEstado === 'todos'
    ? devoluciones
    : devoluciones.filter(d => d.estado === filtroEstado)

  const pendientes = devoluciones.filter(d => d.estado === 'esperando_confirmacion_deposito').length
  const procesadas = devoluciones.filter(d => d.estado === 'procesada').length
  const totalDevuelto = devoluciones
    .filter(d => d.estado === 'procesada')
    .reduce((a, d) => a + Number(d.montoTotal), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestión de devoluciones y reintegros de mercadería</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva devolución
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{pendientes}</p>
            <p className="text-sm text-gray-500">Esperando depósito</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{procesadas}</p>
            <p className="text-sm text-gray-500">Procesadas</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{fmt(totalDevuelto)}</p>
            <p className="text-sm text-gray-500">Total reintegrado</p>
          </div>
        </div>
      </div>

      {/* Alerta de pendientes */}
      {pendientes > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">
              {pendientes} devolución{pendientes > 1 ? 'es' : ''} esperando confirmación del depósito
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Confirmá la recepción de mercadería en el depósito (Brian / Todo Pallets) para procesar el reintegro.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: 'Todos' },
          { key: 'esperando_confirmacion_deposito', label: 'Esperando depósito' },
          { key: 'confirmada', label: 'Confirmadas' },
          { key: 'procesada', label: 'Procesadas' },
          { key: 'cancelada', label: 'Canceladas' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFiltroEstado(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtroEstado === f.key ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}
          >
            {f.label}
            {f.key !== 'todos' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({devoluciones.filter(d => d.estado === f.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="card p-12 text-center">
          <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No hay devoluciones registradas</p>
          <p className="text-gray-400 text-sm mt-1">Las devoluciones son situaciones excepcionales en Wood Pallet</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Registrar primera devolución
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(dev => <DevolucionCard key={dev.id} dev={dev} />)}
        </div>
      )}

      {showModal && <NuevaDevolucionModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
