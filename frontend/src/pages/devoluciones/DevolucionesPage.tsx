import { useState } from 'react';import { useState } from 'react'

import {import { RotateCcw, Plus, CheckCircle, Clock, XCircle, AlertCircle, ChevronDown, ChevronUp, Package, Truck, Leaf, DollarSign } from 'lucide-react'

  RotateCcw, Plus, Search, ChevronDown, ChevronUp,import { useDevoluciones, useCrearDevolucion, useConfirmarDeposito, useCancelarDevolucion, type Devolucion, type CrearDevolucionPayload } from '../../hooks/useDevoluciones'

  CheckCircle, AlertCircle,import { useVentas } from '../../hooks/useVentas'

  Truck, Leaf, Package, DollarSign, X

} from 'lucide-react';// ── Helpers ──────────────────────────────────────────────────────────────────

import {const CASO_LABELS: Record<string, { label: string; color: string; desc: string }> = {

  useDevoluciones,  pallet_danado: { label: 'Pallets dañados', color: 'bg-orange-100 text-orange-700', desc: 'Mercadería llegó dañada al cliente' },

  useCrearDevolucion,  cliente_no_quiere: { label: 'Cliente no quiere', color: 'bg-red-100 text-red-700', desc: 'El cliente recibió y decide devolver' },

  useConfirmarDeposito,  devolucion_parcial: { label: 'Devolución parcial', color: 'bg-yellow-100 text-yellow-700', desc: 'El cliente devuelve solo parte' },

  useCancelarDevolucion,  cancelacion_anticipada: { label: 'Cancelación anticipada', color: 'bg-blue-100 text-blue-700', desc: 'Canceló antes de la entrega' },

  type Devolucion,}

  type CrearDevolucionPayload,

} from '../../hooks/useDevoluciones';const ESTADO_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {

import { useVentas } from '../../hooks/useVentas';  pendiente: { label: 'Pendiente', icon: <Clock className="w-4 h-4" />, color: 'text-yellow-600 bg-yellow-50' },

import LoadingSpinner from '../../components/ui/LoadingSpinner';  esperando_confirmacion_deposito: { label: 'Esperando confirmación', icon: <AlertCircle className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50' },

import ErrorMessage from '../../components/ui/ErrorMessage';  confirmada: { label: 'Confirmada', icon: <CheckCircle className="w-4 h-4" />, color: 'text-blue-600 bg-blue-50' },

  procesada: { label: 'Procesada', icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600 bg-green-50' },

// ─── Helpers ──────────────────────────────────────────────────────────────────  cancelada: { label: 'Cancelada', icon: <XCircle className="w-4 h-4" />, color: 'text-gray-500 bg-gray-100' },

}

const formatPesos = (v: number) =>

  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);const fmt = (n?: number | null) =>

  n != null ? `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 0 })}` : '$0'

const formatFecha = (f: string) =>

  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });// ── Modal nueva devolución ────────────────────────────────────────────────────

interface NuevaDevolucionModalProps {

// ─── Config de casos y estados ────────────────────────────────────────────────  onClose: () => void

}

const CASO_CONFIG: Record<string, { label: string; desc: string; color: string }> = {

  pallet_danado: {function NuevaDevolucionModal({ onClose }: NuevaDevolucionModalProps) {

    label: 'Pallets dañados',  const { data: ventas = [] } = useVentas()

    desc: 'Mercadería llegó dañada. WoodPallet asume responsabilidad.',  const crear = useCrearDevolucion()

    color: 'bg-orange-100 text-orange-700',

  },  const [ventaId, setVentaId] = useState<number | ''>('')

  cliente_no_quiere: {  const [tipoCaso, setTipoCaso] = useState<CrearDevolucionPayload['tipoCaso'] | ''>('')

    label: 'Cliente no quiere',  const [devuelveFlete, setDevuelveFlete] = useState(false)

    desc: 'El cliente recibió y decide devolver.',  const [devuelveSenasa, setDevuelveSenasa] = useState(false)

    color: 'bg-red-100 text-red-700',  const [compensaSiguiente, setCompensaSiguiente] = useState(false)

  },  const [metodoPago, setMetodoPago] = useState('')

  devolucion_parcial: {  const [cuentaDestino, setCuentaDestino] = useState('')

    label: 'Devolución parcial',  const [observaciones, setObservaciones] = useState('')

    desc: 'El cliente devuelve solo una parte.',  const [detalles, setDetalles] = useState<{ detalleVentaId?: number; productoId: number; productoNombre: string; cantidadDevuelta: number; precioUnitario: number }[]>([])

    color: 'bg-yellow-100 text-yellow-700',  const [error, setError] = useState('')

  },

  cancelacion_anticipada: {  const ventaSeleccionada = ventas.find(v => v.id === ventaId)

    label: 'Cancelación anticipada',

    desc: 'Canceló antes de la entrega.',  const handleSelectVenta = (id: number) => {

    color: 'bg-blue-100 text-blue-700',    setVentaId(id)

  },    setDetalles([])

};    const v = ventas.find(v => v.id === id)

    if (v?.detalles) {

const ESTADO_CONFIG: Record<string, { label: string; badgeClass: string }> = {      setDetalles(v.detalles.map(d => ({

  pendiente:                           { label: 'Pendiente',          badgeClass: 'badge-yellow' },        detalleVentaId: d.id,

  esperando_confirmacion_deposito:     { label: 'Esp. depósito',      badgeClass: 'badge-yellow' },        productoId: d.productoId,

  confirmada:                          { label: 'Confirmada',         badgeClass: 'badge-blue'   },        productoNombre: d.producto?.nombre ?? `Producto #${d.productoId}`,

  procesada:                           { label: 'Procesada',          badgeClass: 'badge-green'  },        cantidadDevuelta: 0,

  cancelada:                           { label: 'Cancelada',          badgeClass: 'badge-gray'   },        precioUnitario: Number(d.precioUnitario),

};      })))

    }

// ─── Modal Nueva Devolución ───────────────────────────────────────────────────  }



function NuevaDevolucionModal({ onClose }: { onClose: () => void }) {  const montoTotal = detalles.reduce((acc, d) => acc + d.cantidadDevuelta * d.precioUnitario, 0)

  const { data: ventas = [] } = useVentas();    + (devuelveFlete && ventaSeleccionada ? Number(ventaSeleccionada.costoFlete ?? 0) : 0)

  const crear = useCrearDevolucion();

  const handleSubmit = async (e: React.FormEvent) => {

  const [ventaId, setVentaId] = useState<number | ''>('');    e.preventDefault()

  const [tipoCaso, setTipoCaso] = useState<CrearDevolucionPayload['tipoCaso'] | ''>('');    setError('')

  const [devuelveFlete, setDevuelveFlete] = useState(false);    if (!ventaId || !tipoCaso) { setError('Completá todos los campos requeridos'); return }

  const [devuelveSenasa, setDevuelveSenasa] = useState(false);    const detallesValidos = detalles.filter(d => d.cantidadDevuelta > 0)

  const [compensaSiguiente, setCompensaSiguiente] = useState(false);    if (detallesValidos.length === 0) { setError('Indicá al menos una unidad a devolver'); return }

  const [metodoPago, setMetodoPago] = useState('');

  const [cuentaDestino, setCuentaDestino] = useState('');    try {

  const [observaciones, setObservaciones] = useState('');      await crear.mutateAsync({

  const [detalles, setDetalles] = useState<{        ventaId: ventaId as number,

    detalleVentaId?: number;        tipoCaso: tipoCaso as CrearDevolucionPayload['tipoCaso'],

    productoId: number;        devuelveFlete,

    nombre: string;        devuelveSenasa,

    cantidadDisponible: number;        compensaEnSiguientePedido: compensaSiguiente,

    cantidadDevuelta: number;        metodoPago: metodoPago || undefined,

    precioUnitario: number;        cuentaDestino: cuentaDestino || undefined,

  }[]>([]);        observaciones: observaciones || undefined,

  const [error, setError] = useState('');        detalles: detallesValidos.map(d => ({

          detalleVentaId: d.detalleVentaId,

  const ventaSeleccionada = ventas.find(v => v.id === ventaId);          productoId: d.productoId,

          cantidadDevuelta: d.cantidadDevuelta,

  const handleSelectVenta = (id: number) => {          precioUnitario: d.precioUnitario,

    setVentaId(id);        })),

    const v = ventas.find(v => v.id === id);      })

    if (v?.detalles) {      onClose()

      setDetalles(v.detalles.map(d => ({    } catch {

        detalleVentaId: d.id,      setError('Error al registrar la devolución. Verificá los datos.')

        productoId: d.productoId,    }

        nombre: d.producto?.nombre ?? `Producto #${d.productoId}`,  }

        cantidadDisponible: d.cantidadEntregada || d.cantidadPedida,

        cantidadDevuelta: 0,  return (

        precioUnitario: Number(d.precioUnitario),    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">

      })));      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">

    } else {        {/* Header */}

      setDetalles([]);        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">

    }          <div className="flex items-center gap-3">

  };            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">

              <RotateCcw className="w-5 h-5 text-red-600" />

  const montoPallets = detalles.reduce((acc, d) => acc + d.cantidadDevuelta * d.precioUnitario, 0);            </div>

  const montoFlete = devuelveFlete ? Number(ventaSeleccionada?.costoFlete ?? 0) : 0;            <div>

  const montoTotal = montoPallets + montoFlete;              <h2 className="text-lg font-semibold text-gray-900">Nueva Devolución</h2>

              <p className="text-xs text-gray-500">Registrá una devolución de mercadería</p>

  const handleSubmit = async (e: React.FormEvent) => {            </div>

    e.preventDefault();          </div>

    setError('');          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>

    if (!ventaId || !tipoCaso) { setError('Completá todos los campos obligatorios.'); return; }        </div>

    const detallesValidos = detalles.filter(d => d.cantidadDevuelta > 0);

    if (detallesValidos.length === 0) { setError('Indicá al menos un producto con cantidad a devolver.'); return; }        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Venta */}

    try {          <div>

      await crear.mutateAsync({            <label className="label">Venta asociada *</label>

        ventaId: ventaId as number,            <select className="input" value={ventaId} onChange={e => handleSelectVenta(Number(e.target.value))} required>

        tipoCaso: tipoCaso as CrearDevolucionPayload['tipoCaso'],              <option value="">— Seleccioná una venta —</option>

        devuelveFlete,              {ventas

        devuelveSenasa,                .filter(v => v.estadoPedido !== 'cancelado')

        compensaEnSiguientePedido: compensaSiguiente,                .map(v => (

        metodoPago: metodoPago || undefined,                  <option key={v.id} value={v.id}>

        cuentaDestino: cuentaDestino || undefined,                    Venta #{v.id} — {v.cliente?.razonSocial} — {fmt(Number(v.totalConIva))}

        observaciones: observaciones || undefined,                  </option>

        detalles: detallesValidos.map(d => ({                ))}

          detalleVentaId: d.detalleVentaId,            </select>

          productoId: d.productoId,          </div>

          cantidadDevuelta: d.cantidadDevuelta,

          precioUnitario: d.precioUnitario,          {/* Caso */}

        })),          <div>

      });            <label className="label">Tipo de devolución *</label>

      onClose();            <div className="grid grid-cols-2 gap-2">

    } catch (err: unknown) {              {Object.entries(CASO_LABELS).map(([key, val]) => (

      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;                <button

      setError(msg ?? 'Error al registrar la devolución.');                  key={key}

    }                  type="button"

  };                  onClick={() => setTipoCaso(key as CrearDevolucionPayload['tipoCaso'])}

                  className={`p-3 rounded-xl border-2 text-left transition-all ${tipoCaso === key ? 'border-navy-900 bg-navy-900/5' : 'border-gray-200 hover:border-gray-300'}`}

  return (                >

    <div className="modal-overlay">                  <div className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium mb-1 ${val.color}`}>{val.label}</div>

      <div className="modal" style={{ maxWidth: '600px' }}>                  <p className="text-xs text-gray-500">{val.desc}</p>

                </button>

        <div className="modal-header">              ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>            </div>

            <div style={{ width: 36, height: 36, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>          </div>

              <RotateCcw size={18} style={{ color: '#6B3A2A' }} />

            </div>          {/* Info contextual según caso */}

            <div>          {tipoCaso === 'pallet_danado' && (

              <h2 className="modal-title">Nueva devolución</h2>            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">

              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>Registrá una devolución de mercadería</p>              <strong>Pallets dañados:</strong> Wood Pallet asume la responsabilidad. Si el cliente seguirá comprando, podés marcar "Compensar en siguiente pedido" en lugar de devolver dinero.

            </div>            </div>

          </div>          )}

          <button onClick={onClose} className="btn-icon"><X size={18} /></button>          {(tipoCaso === 'cliente_no_quiere' || tipoCaso === 'devolucion_parcial') && (

        </div>            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">

              <strong>Requiere confirmación del depósito:</strong> Se procesará el reintegro recién cuando el depósito (Brian/Todo Pallets) confirme que recibió la mercadería en buen estado.

        <form onSubmit={handleSubmit}>            </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>          )}

          {tipoCaso === 'cancelacion_anticipada' && (

            {/* Venta */}            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">

            <div>              <strong>Cancelación anticipada:</strong> Si el flete aún no fue ejecutado, marcá "Devolver flete" para incluirlo. Si ya fue ejecutado, solo se devuelven los pallets.

              <label className="label">Venta asociada *</label>            </div>

              <select className="select" value={ventaId} onChange={e => handleSelectVenta(Number(e.target.value))} required>          )}

                <option value="">— Seleccioná una venta —</option>

                {ventas.filter(v => v.estadoPedido !== 'cancelado').map(v => (          {/* Productos a devolver */}

                  <option key={v.id} value={v.id}>          {detalles.length > 0 && (

                    #{v.id} — {v.cliente?.razonSocial} — {formatPesos(Number(v.totalConIva ?? 0))}            <div>

                  </option>              <label className="label">Cantidad a devolver por producto *</label>

                ))}              <div className="space-y-2">

              </select>                {detalles.map((d, i) => (

            </div>                  <div key={d.productoId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">

                    <div className="flex-1">

            {/* Tipo de caso */}                      <p className="text-sm font-medium text-gray-800">{d.productoNombre}</p>

            <div>                      <p className="text-xs text-gray-500">{fmt(d.precioUnitario)} por unidad</p>

              <label className="label">Tipo de devolución *</label>                    </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>                    <input

                {Object.entries(CASO_CONFIG).map(([key, val]) => (                      type="number"

                  <button                      min={0}

                    key={key}                      className="input w-24 text-center"

                    type="button"                      value={d.cantidadDevuelta || ''}

                    onClick={() => setTipoCaso(key as CrearDevolucionPayload['tipoCaso'])}                      placeholder="0"

                    style={{                      onChange={e => setDetalles(prev => prev.map((x, j) => j === i ? { ...x, cantidadDevuelta: Math.max(0, parseInt(e.target.value) || 0) } : x))}

                      padding: '0.625rem 0.75rem',                    />

                      borderRadius: '0.25rem',                    <span className="text-sm font-semibold text-gray-700 w-20 text-right">

                      border: tipoCaso === key ? '2px solid #6B3A2A' : '2px solid #E5E7EB',                      {fmt(d.cantidadDevuelta * d.precioUnitario)}

                      background: tipoCaso === key ? '#FDF5F0' : '#fff',                    </span>

                      textAlign: 'left',                  </div>

                      cursor: 'pointer',                ))}

                      transition: 'all 0.15s',              </div>

                    }}            </div>

                  >          )}

                    <span style={{

                      display: 'inline-block', marginBottom: 4,          {/* Flete / Senasa */}

                      padding: '0.2rem 0.5rem', borderRadius: '0.25rem',          {ventaSeleccionada && (

                      fontSize: '0.72rem', fontWeight: 600,            <div className="grid grid-cols-2 gap-3">

                      background: key === 'pallet_danado' ? '#FFF7ED' : key === 'cliente_no_quiere' ? '#FEF2F2' : key === 'devolucion_parcial' ? '#FFFBEB' : '#EFF6FF',              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${devuelveFlete ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>

                      color: key === 'pallet_danado' ? '#C2410C' : key === 'cliente_no_quiere' ? '#B91C1C' : key === 'devolucion_parcial' ? '#92400E' : '#1D4ED8',                <input type="checkbox" checked={devuelveFlete} onChange={e => setDevuelveFlete(e.target.checked)} className="rounded" />

                    }}>{val.label}</span>                <div>

                    <p style={{ fontSize: '0.71rem', color: '#6B7280', margin: 0 }}>{val.desc}</p>                  <div className="flex items-center gap-1.5">

                  </button>                    <Truck className="w-4 h-4 text-blue-600" />

                ))}                    <span className="text-sm font-medium text-gray-800">Devolver flete</span>

              </div>                  </div>

            </div>                  <p className="text-xs text-gray-500">{fmt(Number(ventaSeleccionada.costoFlete ?? 0))}</p>

                </div>

            {/* Info contextual */}              </label>

            {(tipoCaso === 'cliente_no_quiere' || tipoCaso === 'devolucion_parcial') && (              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${devuelveSenasa ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>                <input type="checkbox" checked={devuelveSenasa} onChange={e => setDevuelveSenasa(e.target.checked)} className="rounded" />

                <strong>Requiere confirmación del depósito:</strong> El reintegro se procesa recién cuando Brian / Todo Pallets confirma la recepción.                <div>

              </div>                  <div className="flex items-center gap-1.5">

            )}                    <Leaf className="w-4 h-4 text-green-600" />

            {tipoCaso === 'cancelacion_anticipada' && (                    <span className="text-sm font-medium text-gray-800">Devolver SENASA</span>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#1E40AF' }}>                  </div>

                <strong>Cancelación anticipada:</strong> Si el flete aún no fue ejecutado marcá "Devolver flete". Si ya fue, solo se devuelven pallets.                  <p className="text-xs text-gray-500">Solo si no se realizó</p>

              </div>                </div>

            )}              </label>

            {tipoCaso === 'pallet_danado' && (            </div>

              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#9A3412' }}>          )}

                <strong>Pallets dañados:</strong> WoodPallet asume responsabilidad. Si el cliente seguirá comprando, podés compensar en el siguiente pedido.

              </div>          {/* Compensar en siguiente pedido */}

            )}          {tipoCaso === 'pallet_danado' && (

            <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${compensaSiguiente ? 'border-purple-400 bg-purple-50' : 'border-gray-200'}`}>

            {/* Cantidades a devolver */}              <input type="checkbox" checked={compensaSiguiente} onChange={e => setCompensaSiguiente(e.target.checked)} className="rounded" />

            {detalles.length > 0 && (              <div>

              <div>                <p className="text-sm font-medium text-gray-800">Compensar en siguiente pedido</p>

                <label className="label">Cantidad a devolver por producto *</label>                <p className="text-xs text-gray-500">Se sumarán los pallets sin costo en la próxima compra del cliente</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>              </div>

                  {detalles.map((d, i) => (            </label>

                    <div key={d.productoId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F9FAFB', borderRadius: '0.25rem', padding: '0.625rem 0.75rem' }}>          )}

                      <div style={{ flex: 1, minWidth: 0 }}>

                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', margin: 0 }}>{d.nombre}</p>          {/* Método de pago */}

                        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>          {!compensaSiguiente && (

                          {formatPesos(d.precioUnitario)} / u · máx {d.cantidadDisponible} u.            <div className="grid grid-cols-2 gap-3">

                        </p>              <div>

                      </div>                <label className="label">Método de reintegro</label>

                      <input                <select className="input" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>

                        type="number" min={0} max={d.cantidadDisponible}                  <option value="">— Seleccionar —</option>

                        className="input" style={{ width: '5rem', textAlign: 'center' }}                  <option value="transferencia">Transferencia</option>

                        value={d.cantidadDevuelta || ''}                  <option value="e_check">E-Check</option>

                        placeholder="0"                  <option value="efectivo">Efectivo</option>

                        onChange={e => setDetalles(prev => prev.map((x, j) =>                </select>

                          j === i ? { ...x, cantidadDevuelta: Math.max(0, Math.min(d.cantidadDisponible, parseInt(e.target.value) || 0)) } : x              </div>

                        ))}              <div>

                      />                <label className="label">Cuenta destino</label>

                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', width: '5.5rem', textAlign: 'right', margin: 0 }}>                <input type="text" className="input" placeholder="CBU / alias" value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)} />

                        {formatPesos(d.cantidadDevuelta * d.precioUnitario)}              </div>

                      </p>            </div>

                    </div>          )}

                  ))}

                </div>          {/* Observaciones */}

              </div>          <div>

            )}            <label className="label">Observaciones</label>

            <textarea className="input resize-none" rows={2} placeholder="Detalle adicional..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />

            {/* Flete / SENASA */}          </div>

            {ventaSeleccionada && (

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>          {/* Resumen */}

                <label style={{          {montoTotal > 0 && (

                  display: 'flex', alignItems: 'center', gap: '0.625rem',            <div className="bg-gray-50 rounded-xl p-4 space-y-1">

                  background: devuelveFlete ? '#EFF6FF' : '#F9FAFB',              <div className="flex justify-between text-sm text-gray-600">

                  border: devuelveFlete ? '2px solid #3B82F6' : '2px solid #E5E7EB',                <span>Pallets</span>

                  borderRadius: '0.25rem', padding: '0.625rem 0.75rem', cursor: 'pointer',                <span>{fmt(detalles.reduce((a, d) => a + d.cantidadDevuelta * d.precioUnitario, 0))}</span>

                }}>              </div>

                  <input type="checkbox" checked={devuelveFlete} onChange={e => setDevuelveFlete(e.target.checked)} />              {devuelveFlete && <div className="flex justify-between text-sm text-gray-600"><span>Flete</span><span>{fmt(Number(ventaSeleccionada?.costoFlete ?? 0))}</span></div>}

                  <div>              <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">

                    <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, color: '#1D4ED8', margin: 0 }}><Truck size={13} /> Devolver flete</p>                <span>Total a reintegrar</span>

                    <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>{formatPesos(Number(ventaSeleccionada.costoFlete ?? 0))}</p>                <span className="text-green-700">{fmt(montoTotal)}</span>

                  </div>              </div>

                </label>            </div>

                <label style={{          )}

                  display: 'flex', alignItems: 'center', gap: '0.625rem',

                  background: devuelveSenasa ? '#F0FDF4' : '#F9FAFB',          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

                  border: devuelveSenasa ? '2px solid #16A34A' : '2px solid #E5E7EB',

                  borderRadius: '0.25rem', padding: '0.625rem 0.75rem', cursor: 'pointer',          <div className="flex gap-3 pt-2">

                }}>            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>

                  <input type="checkbox" checked={devuelveSenasa} onChange={e => setDevuelveSenasa(e.target.checked)} />            <button type="submit" className="btn-primary flex-1" disabled={crear.isPending}>

                  <div>              {crear.isPending ? 'Registrando...' : 'Registrar devolución'}

                    <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 500, color: '#15803D', margin: 0 }}><Leaf size={13} /> Devolver SENASA</p>            </button>

                    <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>Solo si no se tramitó</p>          </div>

                  </div>        </form>

                </label>      </div>

              </div>    </div>

            )}  )

}

            {/* Compensar siguiente pedido */}

            {tipoCaso === 'pallet_danado' && (// ── Tarjeta de devolución ─────────────────────────────────────────────────────

              <label style={{function DevolucionCard({ dev }: { dev: Devolucion }) {

                display: 'flex', alignItems: 'center', gap: '0.625rem',  const [expanded, setExpanded] = useState(false)

                background: compensaSiguiente ? '#FAF5FF' : '#F9FAFB',  const confirmar = useConfirmarDeposito()

                border: compensaSiguiente ? '2px solid #9333EA' : '2px solid #E5E7EB',  const cancelar = useCancelarDevolucion()

                borderRadius: '0.25rem', padding: '0.625rem 0.75rem', cursor: 'pointer',  const estado = ESTADO_CONFIG[dev.estado]

              }}>  const caso = CASO_LABELS[dev.tipoCaso]

                <input type="checkbox" checked={compensaSiguiente} onChange={e => setCompensaSiguiente(e.target.checked)} />

                <div>  return (

                  <p style={{ fontSize: '0.8rem', fontWeight: 500, color: '#7E22CE', margin: 0 }}>Compensar en siguiente pedido</p>    <div className="card p-0 overflow-hidden">

                  <p style={{ fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>Los pallets se agregarán sin costo en la próxima compra</p>      <div className="p-5">

                </div>        <div className="flex items-start justify-between gap-4">

              </label>          <div className="flex-1 min-w-0">

            )}            <div className="flex items-center gap-2 flex-wrap mb-1">

              <span className="text-sm font-bold text-gray-900">Devolución #{dev.id}</span>

            {/* Método de pago */}              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estado.color}`}>

            {!compensaSiguiente && (                {estado.icon} {estado.label}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>              </span>

                <div>              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${caso.color}`}>{caso.label}</span>

                  <label className="label">Método de reintegro</label>              {dev.compensaEnSiguientePedido && (

                  <select className="select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Compensa en próx. pedido</span>

                    <option value="">— Sin definir —</option>              )}

                    <option value="transferencia">Transferencia</option>            </div>

                    <option value="e_check">E-Check</option>            <p className="text-sm text-gray-700 font-medium">{dev.cliente.razonSocial}</p>

                    <option value="efectivo">Efectivo</option>            <p className="text-xs text-gray-500">Venta #{dev.ventaId} · {new Date(dev.fechaSolicitud).toLocaleDateString('es-AR')}</p>

                  </select>          </div>

                </div>          <div className="text-right shrink-0">

                <div>            <p className="text-lg font-bold text-gray-900">{fmt(Number(dev.montoTotal))}</p>

                  <label className="label">Cuenta / CBU destino</label>            <p className="text-xs text-gray-500">a reintegrar</p>

                  <input type="text" className="input" placeholder="CBU o alias" value={cuentaDestino} onChange={e => setCuentaDestino(e.target.value)} />          </div>

                </div>        </div>

              </div>

            )}        {/* Desglose de montos */}

        <div className="mt-3 flex gap-3 flex-wrap">

            {/* Observaciones */}          <div className="flex items-center gap-1.5 text-xs text-gray-600">

            <div>            <Package className="w-3.5 h-3.5 text-gray-400" />

              <label className="label">Observaciones</label>            <span>Pallets: <strong>{fmt(Number(dev.montoPallets))}</strong></span>

              <textarea className="input" style={{ resize: 'none' }} rows={2} placeholder="Detalle adicional..." value={observaciones} onChange={e => setObservaciones(e.target.value)} />          </div>

            </div>          {dev.montoFlete && dev.devuelveFlete && (

            <div className="flex items-center gap-1.5 text-xs text-gray-600">

            {/* Resumen */}              <Truck className="w-3.5 h-3.5 text-blue-400" />

            {montoTotal > 0 && (              <span>Flete: <strong>{fmt(Number(dev.montoFlete))}</strong></span>

              <div style={{ background: '#F9FAFB', borderRadius: '0.25rem', border: '1px solid #E5E7EB', padding: '0.875rem' }}>            </div>

                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Resumen del reintegro</p>          )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>          {dev.montoSenasa && dev.devuelveSenasa && (

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280' }}>            <div className="flex items-center gap-1.5 text-xs text-gray-600">

                    <span>Pallets</span><span>{formatPesos(montoPallets)}</span>              <Leaf className="w-3.5 h-3.5 text-green-400" />

                  </div>              <span>SENASA: <strong>{fmt(Number(dev.montoSenasa))}</strong></span>

                  {devuelveFlete && montoFlete > 0 && (            </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6B7280' }}>          )}

                      <span>Flete</span><span>{formatPesos(montoFlete)}</span>          {dev.stockRestaurado && (

                    </div>            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">

                  )}              <CheckCircle className="w-3.5 h-3.5" /> Stock restaurado

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700, color: '#111827', paddingTop: '0.375rem', borderTop: '1px solid #E5E7EB', marginTop: '0.25rem' }}>            </span>

                    <span>Total a reintegrar</span>          )}

                    <span style={{ color: '#15803D' }}>{formatPesos(montoTotal)}</span>        </div>

                  </div>

                </div>        {dev.observaciones && (

              </div>          <p className="mt-2 text-xs text-gray-500 italic">"{dev.observaciones}"</p>

            )}        )}

      </div>

            {error && (

              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.625rem 0.875rem', borderRadius: '0.25rem' }}>      {/* Acciones */}

                {error}      <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">

              </div>        {dev.estado === 'esperando_confirmacion_deposito' && (

            )}          <button

          </div>            className="btn-primary text-sm py-2 px-4"

            disabled={confirmar.isPending}

          <div className="modal-footer">            onClick={() => confirmar.mutate(dev.id)}

            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>          >

            <button type="submit" className="btn-brand" disabled={crear.isPending}>            <CheckCircle className="w-4 h-4 mr-1.5" />

              {crear.isPending ? 'Registrando...' : 'Registrar devolución'}            {confirmar.isPending ? 'Confirmando...' : 'Confirmar recepción en depósito'}

            </button>          </button>

          </div>        )}

        </form>        {(dev.estado === 'pendiente' || dev.estado === 'esperando_confirmacion_deposito') && (

      </div>          <button

    </div>            className="btn-secondary text-sm py-2 px-4 text-red-600 hover:bg-red-50"

  );            disabled={cancelar.isPending}

}            onClick={() => { if (confirm('¿Cancelar esta devolución?')) cancelar.mutate(dev.id) }}

          >

// ─── Fila de devolución ───────────────────────────────────────────────────────            Cancelar devolución

          </button>

function DevolucionRow({ dev }: { dev: Devolucion }) {        )}

  const [expanded, setExpanded] = useState(false);        <button

  const confirmar = useConfirmarDeposito();          className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"

  const cancelar = useCancelarDevolucion();          onClick={() => setExpanded(p => !p)}

        >

  const estado = ESTADO_CONFIG[dev.estado] ?? { label: dev.estado, badgeClass: 'badge-gray' };          Ver detalles {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}

  const caso = CASO_CONFIG[dev.tipoCaso] ?? { label: dev.tipoCaso, color: 'bg-gray-100 text-gray-700' };        </button>

      </div>

  return (

    <div className="card-base">      {/* Detalles expandidos */}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }} onClick={() => setExpanded(p => !p)}>      {expanded && (

        <div style={{ flex: 1, minWidth: 0 }}>        <div className="px-5 pb-5 border-t border-gray-100 pt-4">

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Productos devueltos</p>

            <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#9CA3AF' }}>#{dev.id}</span>          <div className="space-y-2">

            <span className={estado.badgeClass} style={{ borderRadius: '0.25rem' }}>{estado.label}</span>            {dev.detalles.map(d => (

            <span style={{              <div key={d.id} className="flex justify-between items-center text-sm">

              display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '0.25rem',                <span className="text-gray-700">{d.producto.nombre}</span>

              fontSize: '0.72rem', fontWeight: 600,                <span className="text-gray-500">{d.cantidadDevuelta} u. × {fmt(Number(d.precioUnitario))} = <strong>{fmt(Number(d.subtotal))}</strong></span>

              background: dev.tipoCaso === 'pallet_danado' ? '#FFF7ED' : dev.tipoCaso === 'cliente_no_quiere' ? '#FEF2F2' : dev.tipoCaso === 'devolucion_parcial' ? '#FFFBEB' : '#EFF6FF',              </div>

              color: dev.tipoCaso === 'pallet_danado' ? '#C2410C' : dev.tipoCaso === 'cliente_no_quiere' ? '#B91C1C' : dev.tipoCaso === 'devolucion_parcial' ? '#92400E' : '#1D4ED8',            ))}

            }}>{caso.label}</span>          </div>

            {dev.compensaEnSiguientePedido && (          {dev.metodoPago && (

              <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.72rem', fontWeight: 600, background: '#FAF5FF', color: '#7E22CE', border: '1px solid #E9D5FF' }}>            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">

                Compensa próx. pedido              <DollarSign className="w-4 h-4" />

              </span>              <span>Reintegro vía <strong>{dev.metodoPago}</strong>{dev.cuentaDestino ? ` → ${dev.cuentaDestino}` : ''}</span>

            )}            </div>

            {dev.stockRestaurado && (          )}

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', fontWeight: 500, color: '#15803D' }}>        </div>

                <CheckCircle size={12} /> Stock restaurado      )}

              </span>    </div>

            )}  )

          </div>}

          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>{dev.cliente.razonSocial}</p>

          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>// ── Página principal ──────────────────────────────────────────────────────────

            Venta #{dev.ventaId} · {formatFecha(dev.fechaSolicitud)}export default function DevolucionesPage() {

            {dev.metodoPago && ` · ${dev.metodoPago}`}  const { data: devoluciones = [], isLoading } = useDevoluciones()

          </p>  const [showModal, setShowModal] = useState(false)

          {dev.observaciones && (  const [filtroEstado, setFiltroEstado] = useState<string>('todos')

            <p style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic', marginTop: 2 }}>"{dev.observaciones}"</p>

          )}  const filtradas = filtroEstado === 'todos'

        </div>    ? devoluciones

        <div style={{ textAlign: 'right', flexShrink: 0 }}>    : devoluciones.filter(d => d.estado === filtroEstado)

          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>{formatPesos(Number(dev.montoTotal))}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.375rem', marginTop: 4 }}>  const pendientes = devoluciones.filter(d => d.estado === 'esperando_confirmacion_deposito').length

            {dev.devuelveFlete && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: '#1D4ED8' }}><Truck size={11} />Flete</span>}  const procesadas = devoluciones.filter(d => d.estado === 'procesada').length

            {dev.devuelveSenasa && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: '#15803D' }}><Leaf size={11} />SENASA</span>}  const totalDevuelto = devoluciones

            {expanded ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}    .filter(d => d.estado === 'procesada')

          </div>    .reduce((a, d) => a + Number(d.montoTotal), 0)

        </div>

      </div>  return (

    <div className="space-y-6">

      {/* Acciones */}      {/* Header */}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>      <div className="flex items-center justify-between">

        {dev.estado === 'esperando_confirmacion_deposito' && (        <div>

          <button className="btn-brand-sm" disabled={confirmar.isPending} onClick={e => { e.stopPropagation(); confirmar.mutate(dev.id); }}>          <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>

            <CheckCircle size={13} />          <p className="text-gray-500 text-sm mt-0.5">Gestión de devoluciones y reintegros de mercadería</p>

            {confirmar.isPending ? 'Confirmando...' : 'Confirmar recepción en depósito'}        </div>

          </button>        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">

        )}          <Plus className="w-4 h-4" />

        {(dev.estado === 'pendiente' || dev.estado === 'esperando_confirmacion_deposito') && (          Nueva devolución

          <button        </button>

            className="btn-secondary"      </div>

            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', color: '#DC2626', borderColor: '#FECACA' }}

            disabled={cancelar.isPending}      {/* Stats */}

            onClick={e => { e.stopPropagation(); if (confirm('¿Cancelar esta devolución?')) cancelar.mutate(dev.id); }}      <div className="grid grid-cols-3 gap-4">

          >        <div className="card p-5 flex items-center gap-4">

            Cancelar          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">

          </button>            <AlertCircle className="w-6 h-6 text-orange-500" />

        )}          </div>

      </div>          <div>

            <p className="text-2xl font-bold text-gray-900">{pendientes}</p>

      {/* Detalle expandido */}            <p className="text-sm text-gray-500">Esperando depósito</p>

      {expanded && (          </div>

        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>        </div>

          <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>        <div className="card p-5 flex items-center gap-4">

            Productos devueltos          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">

          </p>            <CheckCircle className="w-6 h-6 text-green-500" />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>          </div>

            {dev.detalles.map(d => (          <div>

              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#374151' }}>            <p className="text-2xl font-bold text-gray-900">{procesadas}</p>

                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>            <p className="text-sm text-gray-500">Procesadas</p>

                  <Package size={13} color="#9CA3AF" /> {d.producto.nombre}          </div>

                </span>        </div>

                <span style={{ color: '#6B7280' }}>        <div className="card p-5 flex items-center gap-4">

                  {d.cantidadDevuelta} u. × {formatPesos(Number(d.precioUnitario))} = <strong>{formatPesos(Number(d.subtotal))}</strong>          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">

                </span>            <DollarSign className="w-6 h-6 text-red-500" />

              </div>          </div>

            ))}          <div>

            {dev.devuelveFlete && dev.montoFlete && (            <p className="text-2xl font-bold text-gray-900">{fmt(totalDevuelto)}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#1D4ED8' }}>            <p className="text-sm text-gray-500">Total reintegrado</p>

                <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><Truck size={13} /> Flete</span>          </div>

                <strong>{formatPesos(Number(dev.montoFlete))}</strong>        </div>

              </div>      </div>

            )}

          </div>      {/* Alerta de pendientes */}

          {dev.cuentaDestino && (      {pendientes > 0 && (

            <p style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">

              <DollarSign size={12} /> Cuenta destino: <strong>{dev.cuentaDestino}</strong>          <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />

            </p>          <div>

          )}            <p className="text-sm font-semibold text-orange-800">

        </div>              {pendientes} devolución{pendientes > 1 ? 'es' : ''} esperando confirmación del depósito

      )}            </p>

    </div>            <p className="text-xs text-orange-600 mt-0.5">

  );              Confirmá la recepción de mercadería en el depósito (Brian / Todo Pallets) para procesar el reintegro.

}            </p>

          </div>

// ─── Página principal ─────────────────────────────────────────────────────────        </div>

      )}

export default function DevolucionesPage() {

  const { data: devoluciones, isLoading, isError } = useDevoluciones();      {/* Filtros */}

  const [showModal, setShowModal] = useState(false);      <div className="flex gap-2 flex-wrap">

  const [busqueda, setBusqueda] = useState('');        {[

  const [filtroEstado, setFiltroEstado] = useState('todos');          { key: 'todos', label: 'Todos' },

          { key: 'esperando_confirmacion_deposito', label: 'Esperando depósito' },

  if (isLoading) return <LoadingSpinner text="Cargando devoluciones..." />;          { key: 'confirmada', label: 'Confirmadas' },

  if (isError) return <ErrorMessage message="No se pudieron cargar las devoluciones." />;          { key: 'procesada', label: 'Procesadas' },

          { key: 'cancelada', label: 'Canceladas' },

  const todas = devoluciones ?? [];        ].map(f => (

          <button

  const filtradas = todas.filter(d => {            key={f.key}

    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado;            onClick={() => setFiltroEstado(f.key)}

    const matchBusqueda =            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filtroEstado === f.key ? 'bg-navy-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}

      !busqueda ||          >

      d.cliente.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||            {f.label}

      String(d.ventaId).includes(busqueda) ||            {f.key !== 'todos' && (

      String(d.id).includes(busqueda);              <span className="ml-1.5 text-xs opacity-70">

    return matchEstado && matchBusqueda;                ({devoluciones.filter(d => d.estado === f.key).length})

  });              </span>

            )}

  const pendientesDeposito = todas.filter(d => d.estado === 'esperando_confirmacion_deposito').length;          </button>

  const procesadas = todas.filter(d => d.estado === 'procesada').length;        ))}

  const totalReintegrado = todas.filter(d => d.estado === 'procesada').reduce((a, d) => a + Number(d.montoTotal), 0);      </div>



  const FILTROS = [      {/* Lista */}

    { key: 'todos',                           label: 'Todos' },      {isLoading ? (

    { key: 'esperando_confirmacion_deposito', label: 'Esp. depósito' },        <div className="flex justify-center py-12">

    { key: 'confirmada',                      label: 'Confirmadas' },          <div className="w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full animate-spin" />

    { key: 'procesada',                       label: 'Procesadas' },        </div>

    { key: 'cancelada',                       label: 'Canceladas' },      ) : filtradas.length === 0 ? (

  ];        <div className="card p-12 text-center">

          <RotateCcw className="w-12 h-12 text-gray-300 mx-auto mb-4" />

  return (          <p className="text-gray-500 font-medium">No hay devoluciones registradas</p>

    <div className="space-y-6 animate-fade-in">          <p className="text-gray-400 text-sm mt-1">Las devoluciones son situaciones excepcionales en Wood Pallet</p>

          <button onClick={() => setShowModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">

      {/* Header */}            <Plus className="w-4 h-4" /> Registrar primera devolución

      <div className="page-header">          </button>

        <div>        </div>

          <h1 className="titulo-modulo">Devoluciones</h1>      ) : (

          <p className="text-sm text-gray-500 mt-1">{todas.length} devolución{todas.length !== 1 ? 'es' : ''} registrada{todas.length !== 1 ? 's' : ''}</p>        <div className="space-y-3">

        </div>          {filtradas.map(dev => <DevolucionCard key={dev.id} dev={dev} />)}

        <button onClick={() => setShowModal(true)} className="btn-brand">        </div>

          <Plus size={16} /> Nueva devolución      )}

        </button>

      </div>      {showModal && <NuevaDevolucionModal onClose={() => setShowModal(false)} />}

    </div>

      {/* KPIs */}  )

      <div className="grid grid-cols-3 gap-4">}

        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#FEF3E2', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{pendientesDeposito}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Esperando depósito</p>
          </div>
        </div>
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{procesadas}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Procesadas</p>
          </div>
        </div>
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <DollarSign size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{formatPesos(totalReintegrado)}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Total reintegrado</p>
          </div>
        </div>
      </div>

      {/* Alerta pendientes */}
      {pendientesDeposito > 0 && (
        <div className="card-base" style={{ borderLeft: '4px solid #F59E0B', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              {pendientesDeposito} devolución{pendientesDeposito > 1 ? 'es' : ''} esperando confirmación del depósito
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
              Confirmá la recepción de la mercadería en depósito (Brian / Todo Pallets) para procesar el reintegro.
            </p>
          </div>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar por cliente, N° venta o N° devolución..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              style={{
                padding: '0.25rem 0.75rem', fontSize: '0.75rem', fontWeight: 500,
                borderRadius: '0.25rem', border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: filtroEstado === f.key ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#F3F4F6',
                color: filtroEstado === f.key ? '#fff' : '#4B5563',
              }}
            >
              {f.label}
              {f.key !== 'todos' && (
                <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>({todas.filter(d => d.estado === f.key).length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><RotateCcw size={24} /></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {busqueda || filtroEstado !== 'todos' ? 'Sin resultados con los filtros aplicados' : 'Sin devoluciones registradas'}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
            Las devoluciones son situaciones excepcionales en WoodPallet
          </p>
          {!busqueda && filtroEstado === 'todos' && (
            <button onClick={() => setShowModal(true)} className="btn-brand" style={{ marginTop: '1rem' }}>
              <Plus size={15} /> Registrar primera devolución
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(dev => <DevolucionRow key={dev.id} dev={dev} />)}
        </div>
      )}

      {showModal && <NuevaDevolucionModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
