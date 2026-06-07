import { useState } from 'react';
import {
  X, Package, FileText, DollarSign, Truck, RotateCcw,
  Calendar, CheckCircle, Clock, AlertCircle, TrendingUp,
  ShoppingCart, MapPin, Phone, Mail, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useHistorialCliente } from '../../hooks/useClientes';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ClienteHistorialProps {
  clienteId: number;
  onClose: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatPesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);

const formatFecha = (fecha: string | Date) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatFechaHora = (fecha: string | Date) =>
  new Date(fecha).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── Badge configs ───────────────────────────────────────────────────────────

const estadoPedidoConfig: Record<string, { label: string; color: string }> = {
  confirmado:        { label: 'Confirmado',       color: 'bg-blue-100 text-blue-700' },
  en_preparacion:    { label: 'En preparación',   color: 'bg-yellow-100 text-yellow-700' },
  listo_para_envio:  { label: 'Listo para envío', color: 'bg-purple-100 text-purple-700' },
  en_transito:       { label: 'En tránsito',      color: 'bg-indigo-100 text-indigo-700' },
  entregado:         { label: 'Entregado',        color: 'bg-green-100 text-green-700' },
  entregado_parcial: { label: 'Parcial',          color: 'bg-orange-100 text-orange-700' },
  cancelado:         { label: 'Cancelado',        color: 'bg-red-100 text-red-700' },
};

const estadoCotizConfig: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-700' },
  enviada:    { label: 'Enviada',     color: 'bg-blue-100 text-blue-700' },
  aceptada:   { label: 'Aceptada',   color: 'bg-green-100 text-green-700' },
  rechazada:  { label: 'Rechazada',  color: 'bg-red-100 text-red-700' },
  vencida:    { label: 'Vencida',    color: 'bg-gray-100 text-gray-500' },
  convertida: { label: 'Convertida', color: 'bg-teal-100 text-teal-700' },
};

const estadoCobroConfig: Record<string, { label: string; color: string }> = {
  pendiente:       { label: 'Pendiente',       color: 'bg-yellow-100 text-yellow-700' },
  cobrada_parcial: { label: 'Cobro parcial',   color: 'bg-orange-100 text-orange-700' },
  cobrada_total:   { label: 'Cobrado total',   color: 'bg-green-100 text-green-700' },
  vencida:         { label: 'Vencida',         color: 'bg-red-100 text-red-700' },
  incobrable:      { label: 'Incobrable',      color: 'bg-gray-100 text-gray-500' },
};

const estadoEntregaConfig: Record<string, { label: string; color: string }> = {
  pendiente:    { label: 'Pendiente',    color: 'bg-yellow-100 text-yellow-700' },
  en_camino:    { label: 'En camino',   color: 'bg-blue-100 text-blue-700' },
  entregado:    { label: 'Entregado',   color: 'bg-green-100 text-green-700' },
  con_problema: { label: 'Con problema', color: 'bg-red-100 text-red-700' },
};

const estadoRetiroConfig: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700' },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  completado: { label: 'Completado', color: 'bg-green-100 text-green-700' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-700' },
};

function Badge({ estado, config }: { estado: string; config: Record<string, { label: string; color: string }> }) {
  const c = config[estado] ?? { label: estado, color: 'bg-stone-100 text-stone-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold tracking-wide rounded-sm ${c.color}`}>
      {c.label}
    </span>
  );
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PagoCobro {
  id: number; fechaPago: string; monto: number; medioPago: string;
  nroComprobante?: string; esAdelanto: boolean; observaciones?: string;
}
interface NotaCredito {
  id: number; fechaEmision: string; nroNota?: string; monto: number; motivo: string;
}
interface Factura {
  id: number; nroFactura?: string; tipoFactura: string; fechaEmision: string;
  fechaVencimiento?: string; totalConIva: number; estadoCobro: string;
  modalidadPago?: string; medioPago?: string;
  pagos: PagoCobro[]; notasCredito: NotaCredito[];
}
interface Logistica {
  id: number; nombreTransportista: string; telefonoTransp?: string;
  fechaRetiroGalpon?: string; horaEstimadaEntrega?: string; horaEntregaReal?: string;
  estadoEntrega: string; costoFlete?: number; lugarEntrega?: string; observaciones?: string;
}
interface RetiroGalpon {
  id: number; codigoRetiro: string; estadoRetiro: string; galpon?: string;
  horaEstimadaRetiro?: string; fechaConfirmacion?: string;
}
interface DetalleVenta {
  id: number; cantidadPedida: number; cantidadEntregada: number;
  precioUnitario: number; subtotal: number;
  producto: { nombre: string; tipo: string; condicion: string };
}
interface Venta {
  id: number; fechaVenta: string; estadoPedido: string; tipoEntrega: string;
  requiereSenasa: boolean; fechaEstimEntrega?: string; fechaEntregaReal?: string;
  lugarEntrega?: string; totalConIva?: number; metodoPago?: string;
  modalidadPago?: string; observaciones?: string; esHistorica?: boolean;
  usuario: { nombre: string; apellido: string; rol: string };
  detalles: DetalleVenta[]; facturas: Factura[];
  logistica?: Logistica; retiroGalpon?: RetiroGalpon;
}
interface DetalleCotizacion {
  id: number; cantidad: number; precioUnitario?: number; subtotal?: number;
  producto: { nombre: string; tipo: string; condicion: string };
}
interface SeguimientoCot {
  id: number; fechaContacto: string; tipoContacto: string; observaciones?: string;
}
interface Cotizacion {
  id: number; fechaCotizacion: string; estado: string; totalConIva?: number;
  validezDias?: number; observaciones?: string;
  usuario: { nombre: string; apellido: string; rol: string };
  detalles: DetalleCotizacion[]; seguimientos: SeguimientoCot[];
}

// ─── VentaCard ───────────────────────────────────────────────────────────────

function VentaCard({ venta }: { venta: Venta }) {
  const [open, setOpen] = useState(false);
  const cobradoVenta = venta.facturas.reduce(
    (acc, f) => acc + f.pagos.reduce((pa, p) => pa + Number(p.monto), 0), 0
  );
  const pendienteVenta = Number(venta.totalConIva || 0) - cobradoVenta;

  return (
    <div className="overflow-hidden border" style={{ borderColor: '#E8D5C4' }}>
      <button type="button" className="w-full text-left px-4 py-3 transition-colors"
        style={{ background: 'white' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
        onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8  flex items-center justify-center shrink-0" style={{ background: '#F5EDE5' }}>
              <ShoppingCart size={15} style={{ color: '#7c4b2c' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#3c250f' }}>
                Venta #{venta.id}
                <span className="ml-2 text-xs font-normal" style={{ color: '#9B7E6A' }}>{formatFecha(venta.fechaVenta)}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9B7E6A' }}>
                {venta.tipoEntrega === 'retira_cliente' ? '🏭 Retira en galpón' : '🚛 Envío a domicilio'}
                {venta.requiereSenasa && ' · 🌿 SENASA'}
                {' · '}{venta.usuario.nombre} {venta.usuario.apellido}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {venta.esHistorica && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-semibold bg-purple-100 text-purple-700">
                Histórico
              </span>
            )}
            <Badge estado={venta.estadoPedido} config={estadoPedidoConfig} />
            <p className="text-sm font-bold" style={{ color: '#3c250f' }}>{formatPesos(Number(venta.totalConIva || 0))}</p>
            {open ? <ChevronUp size={14} style={{ color: '#C4895A' }} /> : <ChevronDown size={14} style={{ color: '#C4895A' }} />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t p-4 space-y-4" style={{ background: '#FAF5F0', borderColor: '#E8D5C4' }}>
          {/* Productos */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Productos</p>
            <div className="space-y-1.5">
              {venta.detalles.map((d) => (
                <div key={d.id} className="flex items-center justify-between  px-3 py-2 border" style={{ background: 'white', borderColor: '#E8D5C4' }}>
                  <div>
                    <span className="text-sm" style={{ color: '#3c250f' }}>{d.producto.nombre}</span>
                    <span className="ml-2 text-xs capitalize" style={{ color: '#9B7E6A' }}>{d.producto.condicion.replace('_', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: '#3c250f' }}>{d.cantidadPedida} u · {formatPesos(Number(d.subtotal))}</p>
                    {d.cantidadEntregada > 0 && d.cantidadEntregada < d.cantidadPedida && (
                      <p className="text-xs text-orange-500">Entregadas: {d.cantidadEntregada}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logística */}
          {venta.logistica && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Logística</p>
              <div className="border px-3 py-2 space-y-1" style={{ background: 'white', borderColor: '#E8D5C4' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#3c250f' }}>
                    <Truck size={13} className="inline mr-1" style={{ color: '#9B7E6A' }} />
                    {venta.logistica.nombreTransportista}
                    {venta.logistica.telefonoTransp && ` · ${venta.logistica.telefonoTransp}`}
                  </span>
                  <Badge estado={venta.logistica.estadoEntrega} config={estadoEntregaConfig} />
                </div>
                {venta.logistica.lugarEntrega && (
                  <p className="text-xs" style={{ color: '#9B7E6A' }}><MapPin size={11} className="inline mr-1" />{venta.logistica.lugarEntrega}</p>
                )}
                {venta.logistica.horaEntregaReal && (
                  <p className="text-xs text-green-600">
                    <CheckCircle size={11} className="inline mr-1" />
                    Entregado: {formatFechaHora(venta.logistica.horaEntregaReal)}
                  </p>
                )}
                {venta.logistica.costoFlete && (
                  <p className="text-xs" style={{ color: '#9B7E6A' }}>Flete: {formatPesos(Number(venta.logistica.costoFlete))}</p>
                )}
              </div>
            </div>
          )}

          {/* Retiro en galpón */}
          {venta.retiroGalpon && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Retiro en galpón</p>
              <div className="border px-3 py-2 space-y-1" style={{ background: 'white', borderColor: '#E8D5C4' }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold" style={{ color: '#6B3A2A' }}>{venta.retiroGalpon.codigoRetiro}</span>
                  <Badge estado={venta.retiroGalpon.estadoRetiro} config={estadoRetiroConfig} />
                </div>
                {venta.retiroGalpon.galpon && (
                  <p className="text-xs" style={{ color: '#9B7E6A' }}>Galpón: {venta.retiroGalpon.galpon}</p>
                )}
                {venta.retiroGalpon.fechaConfirmacion && (
                  <p className="text-xs text-green-600">
                    <CheckCircle size={11} className="inline mr-1" />
                    Confirmado: {formatFecha(venta.retiroGalpon.fechaConfirmacion)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Facturas */}
          {venta.facturas.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Facturación</p>
              <div className="space-y-2">
                {venta.facturas.map((f) => (
                  <div key={f.id} className="border px-3 py-2" style={{ background: 'white', borderColor: '#E8D5C4' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: '#3c250f' }}>
                        Factura {f.nroFactura ? `#${f.nroFactura}` : '(sin nro)'}
                        <span className="ml-1 text-xs font-normal" style={{ color: '#9B7E6A' }}>{formatFecha(f.fechaEmision)}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge estado={f.estadoCobro} config={estadoCobroConfig} />
                        <span className="text-sm font-bold" style={{ color: '#3c250f' }}>{formatPesos(Number(f.totalConIva))}</span>
                      </div>
                    </div>
                    {f.pagos.map((p) => (
                      <p key={p.id} className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={10} />
                        Cobro {formatFecha(p.fechaPago)} · {formatPesos(Number(p.monto))} · {p.medioPago.replace('_', ' ')}
                        {p.esAdelanto && ' (adelanto)'}
                      </p>
                    ))}
                    {f.notasCredito.map((nc) => (
                      <p key={nc.id} className="text-xs text-red-500 flex items-center gap-1">
                        <RotateCcw size={10} />
                        NC {formatFecha(nc.fechaEmision)} · -{formatPesos(Number(nc.monto))} · {nc.motivo}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen financiero */}
          <div className="grid grid-cols-3 gap-2">
            <div className="border px-2 py-1.5 text-center" style={{ background: 'white', borderColor: '#E8D5C4' }}>
              <p className="text-xs" style={{ color: '#9B7E6A' }}>Total</p>
              <p className="text-sm font-bold" style={{ color: '#3c250f' }}>{formatPesos(Number(venta.totalConIva || 0))}</p>
            </div>
            <div className="bg-green-50  border border-green-100 px-2 py-1.5 text-center">
              <p className="text-xs text-green-600">Cobrado</p>
              <p className="text-sm font-bold text-green-700">{formatPesos(cobradoVenta)}</p>
            </div>
            <div className={`border px-2 py-1.5 text-center ${pendienteVenta > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-xs ${pendienteVenta > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Pendiente</p>
              <p className={`text-sm font-bold ${pendienteVenta > 0 ? 'text-orange-700' : 'text-gray-500'}`}>{formatPesos(pendienteVenta)}</p>
            </div>
          </div>

          {venta.observaciones && (
            <p className="text-xs italic" style={{ color: '#9B7E6A' }}>{venta.observaciones}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CotizacionCard ──────────────────────────────────────────────────────────

function CotizacionCard({ cotizacion }: { cotizacion: Cotizacion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden border" style={{ borderColor: '#E8D5C4' }}>
      <button type="button" className="w-full text-left px-4 py-3 transition-colors"
        style={{ background: 'white' }}
        onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
        onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8  flex items-center justify-center shrink-0" style={{ background: '#EEF2FF' }}>
              <FileText size={15} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#3c250f' }}>
                Cotización #{cotizacion.id}
                <span className="ml-2 text-xs font-normal" style={{ color: '#9B7E6A' }}>{formatFecha(cotizacion.fechaCotizacion)}</span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#9B7E6A' }}>
                {cotizacion.detalles.length} producto(s) · {cotizacion.usuario.nombre} {cotizacion.usuario.apellido}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge estado={cotizacion.estado} config={estadoCotizConfig} />
            {cotizacion.totalConIva && (
              <p className="text-sm font-bold" style={{ color: '#3c250f' }}>{formatPesos(Number(cotizacion.totalConIva))}</p>
            )}
            {open ? <ChevronUp size={14} style={{ color: '#C4895A' }} /> : <ChevronDown size={14} style={{ color: '#C4895A' }} />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t p-4 space-y-4" style={{ background: '#FAF5F0', borderColor: '#E8D5C4' }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Productos cotizados</p>
            <div className="space-y-1.5">
              {cotizacion.detalles.map((d) => (
                <div key={d.id} className="flex items-center justify-between  px-3 py-2 border" style={{ background: 'white', borderColor: '#E8D5C4' }}>
                  <div>
                    <span className="text-sm" style={{ color: '#3c250f' }}>{d.producto.nombre}</span>
                    <span className="ml-2 text-xs capitalize" style={{ color: '#9B7E6A' }}>{d.producto.condicion.replace('_', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: '#3c250f' }}>{d.cantidad} u</p>
                    {d.precioUnitario && (
                      <p className="text-xs" style={{ color: '#9B7E6A' }}>{formatPesos(Number(d.precioUnitario))} c/u</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cotizacion.seguimientos.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Seguimientos</p>
              <div className="space-y-1">
                {cotizacion.seguimientos.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-xs  px-3 py-2 border" style={{ background: 'white', borderColor: '#E8D5C4', color: '#3c250f' }}>
                    <Clock size={11} className="mt-0.5 shrink-0" style={{ color: '#C4895A' }} />
                    <div>
                      <span className="font-semibold capitalize">{s.tipoContacto.replace('_', ' ')}</span>
                      <span className="ml-2" style={{ color: '#9B7E6A' }}>{formatFecha(s.fechaContacto)}</span>
                      {s.observaciones && <p className="mt-0.5" style={{ color: '#7c4b2c' }}>{s.observaciones}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cotizacion.observaciones && (
            <p className="text-xs italic" style={{ color: '#9B7E6A' }}>{cotizacion.observaciones}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function StatCard({
  icon, bg, valor, label, small = false,
}: { icon: React.ReactNode; bg: string; valor: string | number; label: string; small?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-9 h-9 ${bg}  flex items-center justify-center mb-1.5`}>{icon}</div>
      <p className={`font-bold leading-tight ${small ? 'text-xs' : 'text-base'}`} style={{ color: '#3c250f' }}>{valor}</p>
      <p className="text-xs mt-0.5" style={{ color: '#9B7E6A' }}>{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2  px-3 py-2 border" style={{ background: '#FDF6EE', borderColor: '#E8D5C4' }}>
      <span style={{ color: '#C4895A' }}>{icon}</span>
      <span className="text-xs" style={{ color: '#9B7E6A' }}>{label}:</span>
      <span className="text-sm font-semibold" style={{ color: '#3c250f' }}>{value}</span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-14" style={{ color: '#C4895A' }}>
      <div className="mx-auto mb-3 opacity-30 w-fit">{icon}</div>
      <p className="text-sm" style={{ color: '#9B7E6A' }}>{text}</p>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

type Tab = 'resumen' | 'ventas' | 'cotizaciones' | 'facturacion' | 'logistica';

export default function ClienteHistorial({ clienteId, onClose }: ClienteHistorialProps) {
  const { data, isLoading } = useHistorialCliente(clienteId);
  const [tab, setTab] = useState<Tab>('resumen');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'resumen',      label: 'Resumen',                                          icon: <TrendingUp size={14} /> },
    { id: 'ventas',       label: `Ventas (${data?.ventas?.length ?? 0})`,            icon: <ShoppingCart size={14} /> },
    { id: 'cotizaciones', label: `Cotizaciones (${data?.cotizaciones?.length ?? 0})`,icon: <FileText size={14} /> },
    { id: 'facturacion',  label: 'Facturación',                                      icon: <DollarSign size={14} /> },
    { id: 'logistica',    label: 'Logística & Retiros',                              icon: <Truck size={14} /> },
  ];

  const todasLasFacturas: (Factura & { ventaId: number })[] = (data?.ventas ?? []).flatMap(
    (v: Venta) => v.facturas.map((f: Factura) => ({ ...f, ventaId: v.id }))
  );

  const logisticaItems = (data?.ventas ?? []).filter(
    (v: Venta) => v.logistica || v.retiroGalpon
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(30,10,5,0.55)' }}>
      <div className="bg-white shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" style={{ border: '1px solid #E8D5C4' }}>

        {/* Header con acento de color */}
        <div className="shrink-0" style={{ borderBottom: '1px solid #E8D5C4' }}>
          <div style={{ background: '#7c4b2c', padding: '1rem 1.5rem 0.875rem' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>Historial de cliente</p>
                {!isLoading && data?.cliente && (
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: '#fff', fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic' }}>
                      {data.cliente.razonSocial}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {data.cliente.cuit && <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>CUIT: {data.cliente.cuit}</span>}
                      {data.cliente.emailContacto && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <Mail size={11} /> {data.cliente.emailContacto}
                        </span>
                      )}
                      {data.cliente.telefonoContacto && (
                        <span className="text-xs flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          <Phone size={11} /> {data.cliente.telefonoContacto}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="ml-4 mt-0.5 transition-colors" style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {data?.estadisticas && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 px-6 py-4 shrink-0 border-b" style={{ background: '#FDF6EE', borderColor: '#E8D5C4' }}>
            <StatCard icon={<ShoppingCart size={15} style={{ color: '#7c4b2c' }} />} bg="bg-[#F5EDE5]"
              valor={data.estadisticas.totalVentas} label="Ventas" />
            <StatCard icon={<FileText size={15} className="text-indigo-600" />} bg="bg-indigo-50"
              valor={data.estadisticas.totalCotizaciones} label="Cotizaciones" />
            <StatCard icon={<Package size={15} style={{ color: '#7c4b2c' }} />} bg="bg-[#F5EDE5]"
              valor={new Intl.NumberFormat('es-AR').format(data.estadisticas.totalPallets)} label="Pallets" />
            <StatCard icon={<DollarSign size={15} style={{ color: '#6B3A2A' }} />} bg="bg-[#F5EDE5]"
              valor={formatPesos(data.estadisticas.totalFacturado)} label="Facturado" small />
            <StatCard icon={<CheckCircle size={15} className="text-green-600" />} bg="bg-green-50"
              valor={formatPesos(data.estadisticas.totalCobrado)} label="Cobrado" small />
            <StatCard icon={<AlertCircle size={15} className="text-orange-500" />} bg="bg-orange-50"
              valor={formatPesos(data.estadisticas.totalPendiente)} label="Pendiente" small />
          </div>
        )}

        {/* Tabs */}
        <div className="flex shrink-0 px-2 overflow-x-auto border-b" style={{ borderColor: '#E8D5C4', background: 'white' }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderBottomColor: tab === t.id ? '#6B3A2A' : 'transparent',
                color: tab === t.id ? '#3c250f' : '#9B7E6A',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: '#FDFAF7' }}>
          {isLoading ? (
            <LoadingSpinner text="Cargando historial..." />
          ) : (
            <>
              {/* RESUMEN */}
              {tab === 'resumen' && (
                <div className="space-y-4">
                  {(data?.estadisticas?.primerVenta || data?.estadisticas?.ultimaVenta) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {data.estadisticas.primerVenta && (
                        <InfoRow icon={<Calendar size={14} />} label="Primera compra" value={formatFecha(data.estadisticas.primerVenta)} />
                      )}
                      {data.estadisticas.ultimaVenta && (
                        <InfoRow icon={<Calendar size={14} />} label="Última compra" value={formatFecha(data.estadisticas.ultimaVenta)} />
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#7c4b2c' }}>Actividad reciente</p>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5" style={{ background: '#E8D5C4' }} />
                      <div className="space-y-2.5">
                        {[
                          ...(data?.ventas ?? []).map((v: Venta) => ({
                            fecha: v.fechaVenta, tipo: 'venta' as const,
                            titulo: `Venta #${v.id}`,
                            sub: formatPesos(Number(v.totalConIva || 0)),
                            estado: v.estadoPedido,
                          })),
                          ...(data?.cotizaciones ?? []).map((c: Cotizacion) => ({
                            fecha: c.fechaCotizacion, tipo: 'cotizacion' as const,
                            titulo: `Cotización #${c.id}`,
                            sub: c.totalConIva ? formatPesos(Number(c.totalConIva)) : `${c.detalles.length} producto(s)`,
                            estado: c.estado,
                          })),
                        ]
                          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                          .slice(0, 15)
                          .map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4 pl-10 relative">
                              <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full border-2"
                                style={{
                                  background: item.tipo === 'venta' ? '#C4895A' : '#9B7E6A',
                                  borderColor: '#FDF6EE',
                                }} />
                              <div className="flex-1  px-3 py-2 border" style={{ background: '#FDF6EE', borderColor: '#E8D5C4' }}>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium" style={{ color: '#3c250f' }}>{item.titulo}</p>
                                  <p className="text-xs" style={{ color: '#9B7E6A' }}>{formatFecha(item.fecha)}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs" style={{ color: '#9B7E6A' }}>{item.sub}</span>
                                  <Badge estado={item.estado}
                                    config={item.tipo === 'venta' ? estadoPedidoConfig : estadoCotizConfig} />
                                </div>
                              </div>
                            </div>
                          ))}
                        {!data?.ventas?.length && !data?.cotizaciones?.length && (
                          <EmptyState icon={<TrendingUp size={28} />} text="Sin actividad registrada" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VENTAS */}
              {tab === 'ventas' && (
                <div className="space-y-3">
                  {!data?.ventas?.length
                    ? <EmptyState icon={<ShoppingCart size={28} />} text="Sin ventas registradas" />
                    : data.ventas.map((v: Venta) => <VentaCard key={v.id} venta={v} />)
                  }
                </div>
              )}

              {/* COTIZACIONES */}
              {tab === 'cotizaciones' && (
                <div className="space-y-3">
                  {!data?.cotizaciones?.length
                    ? <EmptyState icon={<FileText size={28} />} text="Sin cotizaciones registradas" />
                    : data.cotizaciones.map((c: Cotizacion) => <CotizacionCard key={c.id} cotizacion={c} />)
                  }
                </div>
              )}

              {/* FACTURACIÓN */}
              {tab === 'facturacion' && (
                <div className="space-y-3">
                  {!todasLasFacturas.length ? (
                    <EmptyState icon={<DollarSign size={28} />} text="Sin facturas registradas" />
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        <div className="border p-3 text-center" style={{ background: '#FDF6EE', borderColor: '#E8D5C4' }}>
                          <p className="text-xs" style={{ color: '#9B7E6A' }}>Total facturado</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: '#3c250f' }}>{formatPesos(data?.estadisticas?.totalFacturado ?? 0)}</p>
                        </div>
                        <div className="border p-3 text-center bg-green-50 border-green-100">
                          <p className="text-xs text-green-600">Cobrado</p>
                          <p className="text-sm font-bold text-green-700 mt-0.5">{formatPesos(data?.estadisticas?.totalCobrado ?? 0)}</p>
                        </div>
                        <div className="border p-3 text-center bg-orange-50 border-orange-100">
                          <p className="text-xs text-orange-600">Pendiente</p>
                          <p className="text-sm font-bold text-orange-700 mt-0.5">{formatPesos(data?.estadisticas?.totalPendiente ?? 0)}</p>
                        </div>
                      </div>

                      {todasLasFacturas.map((f) => {
                        const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
                        const pendiente = Number(f.totalConIva) - cobrado;
                        return (
                          <div key={f.id} className="border  p-4 space-y-3" style={{ borderColor: '#E8D5C4', background: 'white' }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold" style={{ color: '#3c250f' }}>
                                  Factura {f.nroFactura ? `#${f.nroFactura}` : '(sin número)'}
                                  <span className="ml-2 text-xs font-normal" style={{ color: '#9B7E6A' }}>
                                    Venta #{f.ventaId} · {formatFecha(f.fechaEmision)}
                                  </span>
                                </p>
                                {f.modalidadPago && (
                                  <p className="text-xs mt-0.5" style={{ color: '#9B7E6A' }}>Modalidad: {f.modalidadPago.replace('_', ' ')}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge estado={f.estadoCobro} config={estadoCobroConfig} />
                                <span className="text-sm font-bold" style={{ color: '#3c250f' }}>{formatPesos(Number(f.totalConIva))}</span>
                              </div>
                            </div>
                            {f.pagos.length > 0 && (
                              <div className="space-y-1">
                                {f.pagos.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between text-xs bg-green-50  px-3 py-1.5">
                                    <span className="text-green-700 flex items-center gap-1">
                                      <CheckCircle size={11} />
                                      {formatFecha(p.fechaPago)} · {p.medioPago.replace('_', ' ')}
                                      {p.esAdelanto && ' (adelanto)'}
                                      {p.nroComprobante && ` · ${p.nroComprobante}`}
                                    </span>
                                    <span className="font-semibold text-green-700">{formatPesos(Number(p.monto))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {f.notasCredito.length > 0 && (
                              <div className="space-y-1">
                                {f.notasCredito.map((nc) => (
                                  <div key={nc.id} className="flex items-center justify-between text-xs bg-red-50  px-3 py-1.5">
                                    <span className="text-red-600 flex items-center gap-1">
                                      <RotateCcw size={11} />
                                      NC {formatFecha(nc.fechaEmision)} · {nc.motivo}
                                    </span>
                                    <span className="font-semibold text-red-600">-{formatPesos(Number(nc.monto))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#E8D5C4' }}>
                              <span className="text-xs" style={{ color: '#9B7E6A' }}>Cobrado: {formatPesos(cobrado)}</span>
                              {pendiente > 0 && (
                                <span className="text-xs font-semibold text-orange-600">Pendiente: {formatPesos(pendiente)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* LOGÍSTICA */}
              {tab === 'logistica' && (
                <div className="space-y-3">
                  {!logisticaItems.length ? (
                    <EmptyState icon={<Truck size={28} />} text="Sin logística registrada" />
                  ) : (
                    logisticaItems.map((v: Venta) => (
                      <div key={v.id} className="border  p-4 space-y-3" style={{ borderColor: '#E8D5C4', background: 'white' }}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold" style={{ color: '#3c250f' }}>
                            Venta #{v.id}
                            <span className="ml-2 text-xs font-normal" style={{ color: '#9B7E6A' }}>{formatFecha(v.fechaVenta)}</span>
                          </p>
                          <Badge estado={v.estadoPedido} config={estadoPedidoConfig} />
                        </div>

                        {v.logistica && (
                          <div className="border p-3 space-y-1.5" style={{ background: '#F0F5FF', borderColor: '#C7D8F5' }}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#3B5EA6' }}>Envío a domicilio</p>
                              <Badge estado={v.logistica.estadoEntrega} config={estadoEntregaConfig} />
                            </div>
                            <p className="text-sm" style={{ color: '#3c250f' }}>
                              <Truck size={13} className="inline mr-1" style={{ color: '#9B7E6A' }} />
                              {v.logistica.nombreTransportista}
                              {v.logistica.telefonoTransp && ` · ${v.logistica.telefonoTransp}`}
                            </p>
                            {v.logistica.lugarEntrega && (
                              <p className="text-xs" style={{ color: '#9B7E6A' }}>
                                <MapPin size={11} className="inline mr-1" />{v.logistica.lugarEntrega}
                              </p>
                            )}
                            {v.logistica.horaEntregaReal && (
                              <p className="text-xs text-green-600">
                                <CheckCircle size={11} className="inline mr-1" />
                                Entregado: {formatFechaHora(v.logistica.horaEntregaReal)}
                              </p>
                            )}
                            {v.logistica.costoFlete && (
                              <p className="text-xs" style={{ color: '#9B7E6A' }}>Flete: {formatPesos(Number(v.logistica.costoFlete))}</p>
                            )}
                          </div>
                        )}

                        {v.retiroGalpon && (
                          <div className="border p-3 space-y-1.5" style={{ background: '#FDF6EE', borderColor: '#E8D5C4' }}>
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#7c4b2c' }}>Retiro en galpón</p>
                              <Badge estado={v.retiroGalpon.estadoRetiro} config={estadoRetiroConfig} />
                            </div>
                            <p className="text-sm font-mono font-bold" style={{ color: '#6B3A2A' }}>
                              Código: {v.retiroGalpon.codigoRetiro}
                            </p>
                            {v.retiroGalpon.galpon && (
                              <p className="text-xs" style={{ color: '#9B7E6A' }}><MapPin size={11} className="inline mr-1" />{v.retiroGalpon.galpon}</p>
                            )}
                            {v.retiroGalpon.fechaConfirmacion && (
                              <p className="text-xs text-green-600">
                                <CheckCircle size={11} className="inline mr-1" />
                                Confirmado: {formatFecha(v.retiroGalpon.fechaConfirmacion)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
