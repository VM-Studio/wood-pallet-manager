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
  const c = config[estado] ?? { label: estado, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
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
  modalidadPago?: string; observaciones?: string;
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <ShoppingCart size={15} className="text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Venta #{venta.id}
                <span className="ml-2 text-xs font-normal text-gray-400">{formatFecha(venta.fechaVenta)}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {venta.tipoEntrega === 'retira_cliente' ? '🏭 Retira en galpón' : '🚛 Envío a domicilio'}
                {venta.requiereSenasa && ' · 🌿 SENASA'}
                {' · '}{venta.usuario.nombre} {venta.usuario.apellido}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge estado={venta.estadoPedido} config={estadoPedidoConfig} />
            <p className="text-sm font-bold text-gray-900">{formatPesos(Number(venta.totalConIva || 0))}</p>
            {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Productos */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos</p>
            <div className="space-y-1.5">
              {venta.detalles.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <div>
                    <span className="text-sm text-gray-800">{d.producto.nombre}</span>
                    <span className="ml-2 text-xs text-gray-400 capitalize">{d.producto.condicion.replace('_', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{d.cantidadPedida} u · {formatPesos(Number(d.subtotal))}</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Logística</p>
              <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    <Truck size={13} className="inline mr-1 text-gray-400" />
                    {venta.logistica.nombreTransportista}
                    {venta.logistica.telefonoTransp && ` · ${venta.logistica.telefonoTransp}`}
                  </span>
                  <Badge estado={venta.logistica.estadoEntrega} config={estadoEntregaConfig} />
                </div>
                {venta.logistica.lugarEntrega && (
                  <p className="text-xs text-gray-500"><MapPin size={11} className="inline mr-1" />{venta.logistica.lugarEntrega}</p>
                )}
                {venta.logistica.horaEntregaReal && (
                  <p className="text-xs text-green-600">
                    <CheckCircle size={11} className="inline mr-1" />
                    Entregado: {formatFechaHora(venta.logistica.horaEntregaReal)}
                  </p>
                )}
                {venta.logistica.costoFlete && (
                  <p className="text-xs text-gray-500">Flete: {formatPesos(Number(venta.logistica.costoFlete))}</p>
                )}
              </div>
            </div>
          )}

          {/* Retiro en galpón */}
          {venta.retiroGalpon && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Retiro en galpón</p>
              <div className="bg-white rounded-lg border border-gray-100 px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold text-amber-700">{venta.retiroGalpon.codigoRetiro}</span>
                  <Badge estado={venta.retiroGalpon.estadoRetiro} config={estadoRetiroConfig} />
                </div>
                {venta.retiroGalpon.galpon && (
                  <p className="text-xs text-gray-500">Galpón: {venta.retiroGalpon.galpon}</p>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Facturación</p>
              <div className="space-y-2">
                {venta.facturas.map((f) => (
                  <div key={f.id} className="bg-white rounded-lg border border-gray-100 px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-800">
                        Factura {f.nroFactura ? `#${f.nroFactura}` : '(sin nro)'}
                        <span className="ml-1 text-xs text-gray-400">{formatFecha(f.fechaEmision)}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge estado={f.estadoCobro} config={estadoCobroConfig} />
                        <span className="text-sm font-bold">{formatPesos(Number(f.totalConIva))}</span>
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
            <div className="bg-white rounded-lg border border-gray-100 px-2 py-1.5 text-center">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-bold">{formatPesos(Number(venta.totalConIva || 0))}</p>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-100 px-2 py-1.5 text-center">
              <p className="text-xs text-green-600">Cobrado</p>
              <p className="text-sm font-bold text-green-700">{formatPesos(cobradoVenta)}</p>
            </div>
            <div className={`rounded-lg border px-2 py-1.5 text-center ${pendienteVenta > 0 ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
              <p className={`text-xs ${pendienteVenta > 0 ? 'text-orange-600' : 'text-gray-400'}`}>Pendiente</p>
              <p className={`text-sm font-bold ${pendienteVenta > 0 ? 'text-orange-700' : 'text-gray-500'}`}>{formatPesos(pendienteVenta)}</p>
            </div>
          </div>

          {venta.observaciones && (
            <p className="text-xs text-gray-400 italic">{venta.observaciones}</p>
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText size={15} className="text-blue-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Cotización #{cotizacion.id}
                <span className="ml-2 text-xs font-normal text-gray-400">{formatFecha(cotizacion.fechaCotizacion)}</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {cotizacion.detalles.length} producto(s) · {cotizacion.usuario.nombre} {cotizacion.usuario.apellido}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge estado={cotizacion.estado} config={estadoCotizConfig} />
            {cotizacion.totalConIva && (
              <p className="text-sm font-bold text-gray-900">{formatPesos(Number(cotizacion.totalConIva))}</p>
            )}
            {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos cotizados</p>
            <div className="space-y-1.5">
              {cotizacion.detalles.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                  <div>
                    <span className="text-sm text-gray-800">{d.producto.nombre}</span>
                    <span className="ml-2 text-xs text-gray-400 capitalize">{d.producto.condicion.replace('_', ' ')}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{d.cantidad} u</p>
                    {d.precioUnitario && (
                      <p className="text-xs text-gray-400">{formatPesos(Number(d.precioUnitario))} c/u</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {cotizacion.seguimientos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seguimientos</p>
              <div className="space-y-1">
                {cotizacion.seguimientos.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                    <Clock size={11} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium capitalize">{s.tipoContacto.replace('_', ' ')}</span>
                      <span className="text-gray-400 ml-2">{formatFecha(s.fechaContacto)}</span>
                      {s.observaciones && <p className="text-gray-500 mt-0.5">{s.observaciones}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cotizacion.observaciones && (
            <p className="text-xs text-gray-400 italic">{cotizacion.observaciones}</p>
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
      <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-1`}>{icon}</div>
      <p className={`font-bold text-gray-900 leading-tight ${small ? 'text-xs' : 'text-lg'}`}>{valor}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
      <span className="text-gray-400">{icon}</span>
      <span className="text-xs text-gray-500">{label}:</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-12 text-gray-400">
      <div className="mx-auto mb-2 opacity-40 w-fit">{icon}</div>
      <p className="text-sm">{text}</p>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Historial de cliente</h2>
            {!isLoading && data?.cliente && (
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <p className="text-base font-semibold text-amber-700">{data.cliente.razonSocial}</p>
                {data.cliente.cuit && <span className="text-xs text-gray-400">CUIT: {data.cliente.cuit}</span>}
                {data.cliente.emailContacto && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Mail size={11} /> {data.cliente.emailContacto}
                  </span>
                )}
                {data.cliente.telefonoContacto && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Phone size={11} /> {data.cliente.telefonoContacto}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4 mt-1">
            <X size={20} />
          </button>
        </div>

        {/* Stats */}
        {data?.estadisticas && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50">
            <StatCard icon={<ShoppingCart size={15} className="text-amber-600" />} bg="bg-amber-100"
              valor={data.estadisticas.totalVentas} label="Ventas" />
            <StatCard icon={<FileText size={15} className="text-blue-600" />} bg="bg-blue-100"
              valor={data.estadisticas.totalCotizaciones} label="Cotizaciones" />
            <StatCard icon={<Package size={15} className="text-teal-600" />} bg="bg-teal-100"
              valor={new Intl.NumberFormat('es-AR').format(data.estadisticas.totalPallets)} label="Pallets" />
            <StatCard icon={<DollarSign size={15} className="text-gray-600" />} bg="bg-gray-200"
              valor={formatPesos(data.estadisticas.totalFacturado)} label="Facturado" small />
            <StatCard icon={<CheckCircle size={15} className="text-green-600" />} bg="bg-green-100"
              valor={formatPesos(data.estadisticas.totalCobrado)} label="Cobrado" small />
            <StatCard icon={<AlertCircle size={15} className="text-orange-600" />} bg="bg-orange-100"
              valor={formatPesos(data.estadisticas.totalPendiente)} label="Pendiente" small />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-2 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-amber-600 text-amber-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
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
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actividad reciente</p>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                      <div className="space-y-3">
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
                              <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white ${
                                item.tipo === 'venta' ? 'bg-amber-500' : 'bg-blue-400'
                              }`} />
                              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-800">{item.titulo}</p>
                                  <p className="text-xs text-gray-400">{formatFecha(item.fecha)}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-500">{item.sub}</span>
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
                        <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
                          <p className="text-xs text-gray-500">Total facturado</p>
                          <p className="text-sm font-bold text-gray-900 mt-0.5">{formatPesos(data?.estadisticas?.totalFacturado ?? 0)}</p>
                        </div>
                        <div className="bg-green-50 rounded-xl border border-green-100 p-3 text-center">
                          <p className="text-xs text-green-600">Cobrado</p>
                          <p className="text-sm font-bold text-green-700 mt-0.5">{formatPesos(data?.estadisticas?.totalCobrado ?? 0)}</p>
                        </div>
                        <div className="bg-orange-50 rounded-xl border border-orange-100 p-3 text-center">
                          <p className="text-xs text-orange-600">Pendiente</p>
                          <p className="text-sm font-bold text-orange-700 mt-0.5">{formatPesos(data?.estadisticas?.totalPendiente ?? 0)}</p>
                        </div>
                      </div>

                      {todasLasFacturas.map((f) => {
                        const cobrado = f.pagos.reduce((a, p) => a + Number(p.monto), 0);
                        const pendiente = Number(f.totalConIva) - cobrado;
                        return (
                          <div key={f.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  Factura {f.nroFactura ? `#${f.nroFactura}` : '(sin número)'}
                                  <span className="ml-2 text-xs font-normal text-gray-400">
                                    Venta #{f.ventaId} · {formatFecha(f.fechaEmision)}
                                  </span>
                                </p>
                                {f.modalidadPago && (
                                  <p className="text-xs text-gray-400 mt-0.5">Modalidad: {f.modalidadPago.replace('_', ' ')}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge estado={f.estadoCobro} config={estadoCobroConfig} />
                                <span className="text-sm font-bold">{formatPesos(Number(f.totalConIva))}</span>
                              </div>
                            </div>
                            {f.pagos.length > 0 && (
                              <div className="space-y-1">
                                {f.pagos.map((p) => (
                                  <div key={p.id} className="flex items-center justify-between text-xs bg-green-50 rounded-lg px-3 py-1.5">
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
                                  <div key={nc.id} className="flex items-center justify-between text-xs bg-red-50 rounded-lg px-3 py-1.5">
                                    <span className="text-red-600 flex items-center gap-1">
                                      <RotateCcw size={11} />
                                      NC {formatFecha(nc.fechaEmision)} · {nc.motivo}
                                    </span>
                                    <span className="font-semibold text-red-600">-{formatPesos(Number(nc.monto))}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-xs text-gray-400">Cobrado: {formatPesos(cobrado)}</span>
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
                      <div key={v.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            Venta #{v.id}
                            <span className="ml-2 text-xs font-normal text-gray-400">{formatFecha(v.fechaVenta)}</span>
                          </p>
                          <Badge estado={v.estadoPedido} config={estadoPedidoConfig} />
                        </div>

                        {v.logistica && (
                          <div className="bg-blue-50 rounded-lg border border-blue-100 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Envío a domicilio</p>
                              <Badge estado={v.logistica.estadoEntrega} config={estadoEntregaConfig} />
                            </div>
                            <p className="text-sm text-gray-700">
                              <Truck size={13} className="inline mr-1 text-gray-400" />
                              {v.logistica.nombreTransportista}
                              {v.logistica.telefonoTransp && ` · ${v.logistica.telefonoTransp}`}
                            </p>
                            {v.logistica.lugarEntrega && (
                              <p className="text-xs text-gray-500">
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
                              <p className="text-xs text-gray-500">Flete: {formatPesos(Number(v.logistica.costoFlete))}</p>
                            )}
                          </div>
                        )}

                        {v.retiroGalpon && (
                          <div className="bg-amber-50 rounded-lg border border-amber-100 p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Retiro en galpón</p>
                              <Badge estado={v.retiroGalpon.estadoRetiro} config={estadoRetiroConfig} />
                            </div>
                            <p className="text-sm font-mono font-bold text-amber-700">
                              Código: {v.retiroGalpon.codigoRetiro}
                            </p>
                            {v.retiroGalpon.galpon && (
                              <p className="text-xs text-gray-600"><MapPin size={11} className="inline mr-1" />{v.retiroGalpon.galpon}</p>
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
