import { useState, useMemo } from 'react';
import {
  Warehouse, Calendar, Clock, CheckCircle2, XCircle, ChevronRight,
  X, MailIcon, Phone, Copy, Send, User, Package, CreditCard,
  History, FileText, RefreshCw, AlertTriangle, CheckCircle,
  ShieldCheck, QrCode, MessageCircle, Search,
} from 'lucide-react';
import {
  useRetiros, useStatsRetiros, useCambiarEstadoRetiro, useReenviarCodigoRetiro,
  useRegistrarRetiroParcial, useGalpones, useEnviarAGalpon,
  type RetiroRow, type EstadoRetiro,
} from '../../hooks/useRetiros';
import { useVentas } from '../../hooks/useVentas';
import { useAuthStore } from '../../store/auth.store';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { getEstadoVentaStyle } from '../../utils/estadoVenta';
import CancelarVentaModal from '../../components/ventas/CancelarVentaModal';
import { linkWhatsApp, telefonoWhatsApp } from '../../utils/whatsapp';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtFecha = (s?: string) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtHora = (s?: string) =>
  s ? new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

const fmtMonto = (v?: number | null) =>
  v != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v)
    : '—';

const ESTADO_REMITO: Record<string, { label: string; color: string }> = {
  pendiente_firma_propietario: { label: 'Pendiente de firma', color: '#C4895A' },
  enviado_a_cliente:           { label: 'Enviado al cliente', color: '#2563EB' },
  firmado_por_cliente:         { label: 'Firmado',            color: '#15803D' },
  completado:                  { label: 'Completado',         color: '#15803D' },
  cancelado:                   { label: 'Cancelado',          color: '#DC2626' },
};

const metodoPagoLabel: Record<string, string> = {
  transferencia: 'Transferencia', e_check: 'E-check', efectivo: 'Efectivo',
};
const modalidadLabel: Record<string, string> = {
  adelantado: 'Adelantado', contra_entrega: 'Contra entrega', por_partes: 'Por partes',
};
const origenLabel: Record<string, string> = {
  stock_propio: 'Stock propio', compra_directa: 'Compra directa',
};

// ─── Badge ────────────────────────────────────────────────────────────────────
// Muestra el estado de la VENTA (venta.estadoPedido) — la misma fuente que la
// columna "Estado" de Ventas y las tarjetas de Logística — para que los tres
// módulos siempre coincidan en la etiqueta de una misma venta con retiro.
function EstadoBadge({ estadoPedido }: { estadoPedido?: string }) {
  const s = getEstadoVentaStyle(estadoPedido);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.color, borderRadius: 0 }}>
      {s.label}
    </span>
  );
}

// ─── Confirmar retiro modal ───────────────────────────────────────────────────
function ConfirmarRetiroModal({
  retiro, onClose,
}: { retiro: RetiroRow; onClose: () => void }) {
  const cambiar = useCambiarEstadoRetiro();
  const [obs, setObs] = useState('');
  const [done, setDone] = useState(false);

  const handleConfirmar = async () => {
    await cambiar.mutateAsync({ id: retiro.id, estado: 'completado', observaciones: obs || undefined });
    setDone(true);
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Confirmar retiro</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body space-y-4">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-stone-800">Retiro confirmado</p>
              <p className="text-sm text-stone-500 mt-1">La venta fue marcada como entregada automáticamente.</p>
              <button onClick={onClose} className="btn-primary mt-5">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">¿Confirmás que el cliente retiró la mercadería?</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Esta acción marcará el retiro como <strong>Completado</strong> y la venta como <strong>Entregada</strong>.
                  </p>
                </div>
              </div>
              <div>
                <label className="label">Observaciones <span className="text-stone-400 font-normal">(opcional)</span></label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Ej: retiró parcialmente, quién vino a buscar, alguna novedad..."
                  value={obs}
                  onChange={e => setObs(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleConfirmar}
                  disabled={cambiar.isPending}
                  className="btn-primary"
                  style={{ background: '#16A34A' }}
                >
                  {cambiar.isPending ? 'Confirmando...' : 'Sí, confirmar retiro'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Cancelar retiro modal ────────────────────────────────────────────────────
// ─── Retiro parcial modal ─────────────────────────────────────────────────────
// Registra lo retirado por producto sobre el detalle de la venta: el mismo
// registro que ve el detalle de la venta en Ventas, y el estado resultante
// ("Retiro parcial" / "Entregado") se refleja en Ventas, Logística y Retiros.
const retiradoDe = (d: RetiroRow['venta']['detalles'][number]) =>
  (d.retiros ?? []).reduce((acc, r) => acc + r.cantidadRetirada, 0);

const admiteRetiroParcial = (r: RetiroRow) =>
  (r.estadoRetiro === 'pendiente' || r.estadoRetiro === 'confirmado' || r.estadoRetiro === 'parcial') &&
  r.venta.estadoPedido !== 'cancelado';

// Buscador de retiros (por cliente, N° de venta o código) para elegir sobre cuál operar
function BuscadorRetiros({ retiros, onSeleccionar }: { retiros: RetiroRow[]; onSeleccionar: (id: number) => void }) {
  const [busqueda, setBusqueda] = useState('');
  const q = busqueda.trim().toLowerCase();
  const encontrados = q
    ? retiros.filter(r =>
        r.venta.cliente.razonSocial.toLowerCase().includes(q) ||
        (r.venta.cliente.nombreContacto ?? '').toLowerCase().includes(q) ||
        `#${r.venta.id}`.includes(q) || String(r.venta.id) === q ||
        r.codigoRetiro.toLowerCase().includes(q))
    : retiros;

  return (
    <>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          autoFocus
          className="input pl-9"
          placeholder="Buscar por cliente, N° de venta o código de retiro..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>
      <div className="border rounded-xl overflow-hidden max-h-80 overflow-y-auto" style={{ borderColor: 'var(--color-border)' }}>
        {encontrados.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">
            {retiros.length ? 'No hay ventas que coincidan con la búsqueda.' : 'No hay retiros pendientes.'}
          </p>
        ) : encontrados.map((r, i) => {
          const pedido   = r.venta.detalles.reduce((acc, d) => acc + d.cantidadPedida, 0);
          const retirado = r.venta.detalles.reduce((acc, d) => acc + retiradoDe(d), 0);
          return (
            <button
              key={r.id}
              onClick={() => onSeleccionar(r.id)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 transition-colors"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}
            >
              <span className="text-sm font-semibold text-stone-500 shrink-0">#{r.venta.id}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{r.venta.cliente.razonSocial}</p>
                <p className="text-xs text-stone-400">
                  {r.codigoRetiro} · {fmtFecha(r.venta.fechaRetiro)} · Retirado {retirado} de {pedido}
                </p>
              </div>
              <EstadoBadge estadoPedido={r.venta.estadoPedido} />
              <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Cancelar retiro (botón del módulo): elegir el retiro y confirmar ─────────
// Cancelar un retiro cancela la venta en todo el sistema (misma confirmación
// y misma cascada que "Cancelar venta" en Ventas).
function CancelarRetiroSelectorModal({ retiros, onClose }: { retiros: RetiroRow[]; onClose: () => void }) {
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const retiro = retiros.find(r => r.id === seleccionId) ?? null;

  if (retiro) {
    return <CancelarVentaModal ventaId={retiro.venta.id} titulo={`Cancelar retiro ${retiro.codigoRetiro}`} onClose={onClose} />;
  }
  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Cancelar retiro</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body space-y-4">
          <p className="text-sm text-stone-500">Elegí el retiro que querés cancelar (completo o parcial).</p>
          <BuscadorRetiros retiros={retiros.filter(admiteRetiroParcial)} onSeleccionar={setSeleccionId} />
          <div className="flex justify-end">
            <button onClick={onClose} className="btn-secondary">Volver</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetiroParcialModal({ retiros, onClose }: { retiros: RetiroRow[]; onClose: () => void }) {
  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  // Se busca en la lista viva para que, al registrar, se vean las cantidades actualizadas
  const retiro = retiros.find(r => r.id === seleccionId) ?? null;

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Registrar retiro parcial</h2>
            {retiro && (
              <p className="text-xs text-stone-400 mt-0.5">Venta #{retiro.venta.id} · {retiro.venta.cliente.razonSocial}</p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body space-y-4">
          {retiro ? (
            <RetiroParcialForm
              key={retiro.id}
              retiro={retiro}
              onCambiarVenta={() => setSeleccionId(null)}
              onClose={onClose}
            />
          ) : (
            <>
              <BuscadorRetiros retiros={retiros.filter(admiteRetiroParcial)} onSeleccionar={setSeleccionId} />
              <div className="flex justify-end">
                <button onClick={onClose} className="btn-secondary">Volver</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RetiroParcialForm({ retiro, onCambiarVenta, onClose }: { retiro: RetiroRow; onCambiarVenta: () => void; onClose: () => void }) {
  const registrar = useRegistrarRetiroParcial();
  const [cantidades, setCantidades] = useState<Record<number, string>>({});
  const [error, setError]           = useState('');
  const [resultado, setResultado]   = useState<{ completo: boolean; pendiente: number } | null>(null);
  const [avisarGalpon, setAvisarGalpon]   = useState(false);

  const detalles = retiro.venta.detalles.map(d => {
    const retirado = retiradoDe(d);
    return { ...d, retirado, pendiente: Math.max(0, d.cantidadPedida - retirado) };
  });
  const totalPedido    = detalles.reduce((acc, d) => acc + d.cantidadPedida, 0);
  const totalRetirado  = detalles.reduce((acc, d) => acc + d.retirado, 0);
  const totalPendiente = totalPedido - totalRetirado;
  const totalAhora     = detalles.reduce((acc, d) => acc + (Number(cantidades[d.id]) || 0), 0);

  const handleRegistrar = async () => {
    setError('');
    const items = detalles
      .map(d => ({ detalleVentaId: d.id, cantidad: Number(cantidades[d.id]) || 0, d }))
      .filter(i => i.cantidad !== 0);
    if (!items.length) {
      setError('Ingresá la cantidad retirada de al menos un producto.');
      return;
    }
    const invalido = items.find(i => !Number.isInteger(i.cantidad) || i.cantidad < 0 || i.cantidad > i.d.pendiente);
    if (invalido) {
      setError(`Cantidad inválida para ${invalido.d.producto.nombre}: quedan ${invalido.d.pendiente} unidades pendientes.`);
      return;
    }
    try {
      const payload = items.map(({ detalleVentaId, cantidad }) => ({ detalleVentaId, cantidad }));
      const res = await registrar.mutateAsync({ id: retiro.id, items: payload });
      setResultado({ completo: res.data.completo, pendiente: res.data.pendiente });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string | { message?: string } } } };
      const errData = err?.response?.data?.error;
      const msg = typeof errData === 'string' ? errData : errData?.message;
      setError(msg ?? 'No se pudo registrar el retiro parcial.');
    }
  };

  return (
        <>
          {resultado ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-stone-800">Retiro registrado</p>
              <p className="text-sm text-stone-500 mt-1">
                {resultado.completo
                  ? 'Se retiró la totalidad del pedido: la venta quedó como Entregado.'
                  : `Quedan ${resultado.pendiente} unidades pendientes. La venta quedó como Retiro parcial en Ventas, Logística y Retiros.`}
              </p>
              <div className="flex gap-3 justify-center mt-5">
                <button onClick={onClose} className="btn-secondary">Cerrar</button>
                <button
                  onClick={() => setAvisarGalpon(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white"
                  style={{ background: '#25D366', borderRadius: '0.375rem' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  Avisar al galpón
                </button>
              </div>
              {avisarGalpon && (
                <EnviarGalponModal
                  retiro={retiro}
                  tipoInicial="retiro_parcial"
                  onClose={() => setAvisarGalpon(false)}
                />
              )}
            </div>
          ) : (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800">
                  Pallets pedidos: <strong>{totalPedido}</strong> · Ya retirado: <strong>{totalRetirado}</strong> · Pendiente: <strong>{totalPendiente}</strong>
                </p>
              </div>

              <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                {detalles.map((d, i) => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2.5"
                    style={{ borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{d.producto.nombre}</p>
                      <p className="text-xs text-stone-400">
                        Pedido {d.cantidadPedida} · Retirado {d.retirado} · <span className={d.pendiente ? 'text-amber-700' : 'text-green-700'}>Pendiente {d.pendiente}</span>
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={d.pendiente}
                      disabled={d.pendiente === 0}
                      className="input"
                      style={{ width: 90 }}
                      placeholder="0"
                      value={cantidades[d.id] ?? ''}
                      onChange={e => setCantidades(c => ({ ...c, [d.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>

              {totalAhora > 0 && totalAhora <= totalPendiente && (
                <p className="text-xs text-stone-400">
                  Se registran <strong>{totalAhora}</strong> unidades; quedarían <strong>{totalPendiente - totalAhora}</strong> pendientes por retirar.
                </p>
              )}
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={onCambiarVenta} className="btn-secondary mr-auto">Cambiar venta</button>
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button
                  onClick={handleRegistrar}
                  disabled={registrar.isPending}
                  className="btn-primary"
                  style={{ background: '#CA8A04' }}
                >
                  {registrar.isPending ? 'Registrando...' : 'Registrar retiro parcial'}
                </button>
              </div>
            </>
          )}
        </>
  );
}

function ReenviarCodigoModal({ retiro, onClose }: { retiro: RetiroRow; onClose: () => void }) {
  const reenviar = useReenviarCodigoRetiro();
  const [email, setEmail]   = useState(retiro.venta.cliente.emailContacto ?? '');
  const [tel, setTel]       = useState(retiro.venta.cliente.telefonoContacto ?? '');
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState('');

  const handleEnviar = async () => {
    setError('');
    if (!email.trim() && !tel.trim()) {
      setError('Ingresá al menos un email o teléfono.');
      return;
    }
    await reenviar.mutateAsync({
      id: retiro.id,
      email: email.trim() || undefined,
      telefono: tel.trim() || undefined,
    });
    setDone(true);
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Reenviar código de retiro</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body space-y-4">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-stone-800">Código reenviado correctamente</p>
              <p className="text-sm text-stone-500 mt-1">El reenvío quedó registrado en el historial del retiro.</p>
              <button onClick={onClose} className="btn-primary mt-5">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="bg-stone-50 rounded-xl p-4 text-center">
                <p className="text-xs text-stone-500 mb-1">Código a reenviar</p>
                <p className="text-2xl font-black tracking-[0.2em] text-stone-800 font-mono">{retiro.codigoRetiro}</p>
              </div>
              <p className="text-sm text-stone-500">
                Podés modificar el email o teléfono si quien viene a retirar no es el cliente directo.
              </p>
              <div>
                <label className="label">
                  <MailIcon className="w-3.5 h-3.5 inline mr-1" />Email
                </label>
                <input type="email" className="input" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="label">
                  <Phone className="w-3.5 h-3.5 inline mr-1" />Teléfono
                  <span className="text-stone-400 font-normal ml-1">(solo registrado, no se envía SMS)</span>
                </label>
                <input type="tel" className="input" value={tel}
                  onChange={e => setTel(e.target.value)}
                  placeholder="+54 11 0000-0000" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button onClick={handleEnviar} disabled={reenviar.isPending}
                  className="btn-primary flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  {reenviar.isPending ? 'Enviando...' : 'Reenviar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp Galpón modal ────────────────────────────────────────────────────
// ─── Mensajes predeterminados para el galpón (SIN precios ni emojis) ─────────
// En WhatsApp *texto* va en negrita: solo el código y lo que falta retirar.
type TipoMensajeGalpon = 'codigo' | 'retiro_parcial' | 'cancelacion';

const pallets = (n: number) => `${n} pallet${n === 1 ? '' : 's'}`;

// Una sola línea si hay un tipo de pallet; si hay varios, un renglón por tipo
const lineasPorTipo = (titulo: string, items: { nombre: string; cantidad: number }[], negrita = false) => {
  const total = items.reduce((acc, i) => acc + i.cantidad, 0);
  const b = (t: string) => (negrita ? `*${t}*` : t);
  if (items.length === 1) return [`${titulo}: ${b(pallets(total))} (${items[0].nombre})`];
  return [`${titulo}: ${b(pallets(total))}`, ...items.map(i => `- ${i.cantidad} ${i.nombre}`)];
};

const mensajeCodigoGalpon = (r: RetiroRow) =>
  [
    `Código de retiro: *${r.codigoRetiro}*`,
    `Cliente: ${r.venta.cliente.razonSocial}`,
    ...lineasPorTipo('Pallets a retirar', r.venta.detalles.map(d => ({ nombre: d.producto.nombre, cantidad: d.cantidadPedida }))),
  ].join('\n');

const mensajeRetiroParcialGalpon = (r: RetiroRow) => {
  const filas = r.venta.detalles.map(d => {
    const retirado = retiradoDe(d);
    return { nombre: d.producto.nombre, retirado, pendiente: Math.max(0, d.cantidadPedida - retirado) };
  });
  const pendiente = filas.reduce((acc, f) => acc + f.pendiente, 0);

  return [
    pendiente > 0 ? 'Retiro parcial' : 'Retiro completo',
    `Código de retiro: *${r.codigoRetiro}*`,
    `Cliente: ${r.venta.cliente.razonSocial}`,
    ...lineasPorTipo('Ya retirados', filas.filter(f => f.retirado > 0).map(f => ({ nombre: f.nombre, cantidad: f.retirado }))),
    ...(pendiente > 0
      ? lineasPorTipo('Faltan retirar', filas.filter(f => f.pendiente > 0).map(f => ({ nombre: f.nombre, cantidad: f.pendiente })), true)
      : ['Faltan retirar: *0 pallets*']),
  ].join('\n');
};

const mensajeCancelacionGalpon = (r: RetiroRow) =>
  [
    'Retiro cancelado',
    `Código de retiro: *${r.codigoRetiro}*`,
    `Cliente: ${r.venta.cliente.razonSocial}`,
    '*Este código ya no es válido: no entregar pallets.*',
  ].join('\n');

// ─── Enviar código al galpón por WhatsApp ─────────────────────────────────────
function EnviarGalponModal({ retiro, tipoInicial = 'codigo', onClose }: {
  retiro: RetiroRow;
  tipoInicial?: TipoMensajeGalpon;
  onClose: () => void;
}) {
  const { data: galpones, isLoading } = useGalpones();
  const enviar = useEnviarAGalpon();
  const tieneRetiros = retiro.venta.detalles.some(d => retiradoDe(d) > 0);
  const cancelado = retiro.estadoRetiro === 'cancelado' || retiro.venta.estadoPedido === 'cancelado';

  const [tipo, setTipo]           = useState<TipoMensajeGalpon>(
    cancelado ? 'cancelacion' : tipoInicial === 'retiro_parcial' && tieneRetiros ? 'retiro_parcial' : 'codigo'
  );
  const [galponId, setGalponId]   = useState<number | null>(retiro.proveedorId ?? null);
  const [editado, setEditado]     = useState<string | null>(null);
  const [error, setError]         = useState('');
  const [enviado, setEnviado]     = useState(false);

  const galpon = galpones?.find(g => g.id === galponId) ?? null;
  const mensajeBase =
    tipo === 'cancelacion' ? mensajeCancelacionGalpon(retiro)
    : tipo === 'codigo' ? mensajeCodigoGalpon(retiro)
    : mensajeRetiroParcialGalpon(retiro);
  const mensaje = editado ?? mensajeBase;
  const numero  = telefonoWhatsApp(galpon?.telefono);

  const cambiarTipo = (t: TipoMensajeGalpon) => { setTipo(t); setEditado(null); };

  const handleEnviar = () => {
    setError('');
    if (!galpon) { setError('Seleccioná a qué galpón le enviás el código.'); return; }
    if (!numero) { setError(`${galpon.nombreEmpresa} no tiene teléfono cargado. Agregalo en Proveedores.`); return; }
    // Se abre WhatsApp en el mismo click (si se espera al servidor, el navegador bloquea la ventana)
    window.open(linkWhatsApp(galpon.telefono, mensaje), '_blank');
    enviar.mutate(
      { id: retiro.id, proveedorId: galpon.id, tipoMensaje: tipo },
      {
        onSuccess: () => setEnviado(true),
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { error?: string } } };
          setError(err.response?.data?.error ?? 'Se abrió WhatsApp, pero no se pudo registrar el envío.');
        },
      },
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div style={{ width: 30, height: 30, background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="modal-title">Enviar código al galpón</h2>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: 0 }}>Retiro #{retiro.venta.id} · código {retiro.codigoRetiro}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="modal-body space-y-4">
          {enviado ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-base font-semibold text-stone-800">Mensaje listo en WhatsApp</p>
              <p className="text-sm text-stone-500 mt-1">
                Se abrió el chat con <strong>{galpon?.nombreEmpresa}</strong>. Presioná enviar en WhatsApp.
                Quedó registrado en el historial del retiro.
              </p>
              <button onClick={onClose} className="btn-primary mt-5">Cerrar</button>
            </div>
          ) : (
            <>
              {/* Galpón */}
              <div>
                <label className="label"><Warehouse className="w-3.5 h-3.5 inline mr-1" />Galpón donde retira el cliente</label>
                {isLoading ? (
                  <p className="text-sm text-stone-400">Cargando galpones...</p>
                ) : (
                  <div className="space-y-2">
                    {(galpones ?? []).map(g => {
                      const activo = g.id === galponId;
                      return (
                        <button key={g.id} type="button" onClick={() => setGalponId(g.id)}
                          className="w-full text-left flex items-center gap-3 px-3 py-2.5 border rounded-xl transition-colors"
                          style={{ borderColor: activo ? '#25D366' : 'var(--color-border)', background: activo ? '#F0FDF4' : 'transparent' }}>
                          <span className="w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center"
                            style={{ borderColor: activo ? '#16A34A' : '#D6D3D1' }}>
                            {activo && <span className="w-2 h-2 rounded-full" style={{ background: '#16A34A' }} />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-stone-800 truncate">{g.nombreEmpresa}</p>
                            <p className="text-xs text-stone-400 truncate">{g.ubicacion || 'Sin ubicación'}</p>
                          </div>
                          {g.telefono?.trim()
                            ? <span className="text-xs text-stone-500 shrink-0"><Phone className="w-3 h-3 inline mr-1" />{g.telefono}</span>
                            : <span className="text-xs font-medium text-red-500 shrink-0">Sin teléfono</span>}
                        </button>
                      );
                    })}
                    {!galpones?.length && <p className="text-sm text-stone-400">No hay proveedores cargados.</p>}
                  </div>
                )}
                {galpon && !numero && (
                  <p className="text-xs text-red-600 mt-2">
                    Este galpón no tiene teléfono. Cargalo en <strong>Proveedores → editar</strong> para poder enviarle el código.
                  </p>
                )}
              </div>

              {/* Tipo de mensaje (con el retiro cancelado solo se avisa la cancelación) */}
              {cancelado ? (
                <p className="text-sm text-red-600">El retiro está cancelado: se le avisa al galpón que el código ya no es válido.</p>
              ) : (
              <div>
                <label className="label">Mensaje</label>
                <div className="flex border rounded-xl overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                  {([['codigo', 'Código de retiro'], ['retiro_parcial', 'Aviso de retiro parcial']] as const).map(([t, label]) => {
                    const deshabilitado = t === 'retiro_parcial' && !tieneRetiros;
                    return (
                      <button key={t} type="button" disabled={deshabilitado} onClick={() => cambiarTipo(t)}
                        title={deshabilitado ? 'Todavía no hay retiros parciales registrados' : undefined}
                        className="flex-1 px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: tipo === t ? '#7c4b2c' : 'transparent', color: tipo === t ? '#fff' : 'var(--color-text-muted)' }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              )}

              <div>
                <label className="label">
                  Vista previa <span className="text-stone-400 font-normal">(podés editarlo antes de enviar)</span>
                </label>
                <textarea
                  className="input resize-none font-mono text-xs leading-relaxed"
                  rows={8}
                  value={mensaje}
                  onChange={e => setEditado(e.target.value)}
                />
                {editado !== null && (
                  <button type="button" onClick={() => setEditado(null)} className="text-xs text-stone-500 underline mt-1">
                    Restaurar mensaje predeterminado
                  </button>
                )}
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>

        {!enviado && (
          <div className="modal-footer">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleEnviar}
              disabled={!galpon || !numero || enviar.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50"
              style={{ background: '#25D366', borderRadius: '0.375rem' }}
            >
              <Send className="w-4 h-4" />
              Enviar por WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detalle modal ────────────────────────────────────────────────────────────
function DetalleRetiroModal({ retiro, onClose }: { retiro: RetiroRow; onClose: () => void }) {
  const cambiar = useCambiarEstadoRetiro();
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [showCancelar, setShowCancelar]   = useState(false);
  const [showReenviar, setShowReenviar]   = useState(false);
  const [showWhatsApp, setShowWhatsApp]   = useState(false);
  const [copied, setCopied]               = useState(false);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(retiro.codigoRetiro);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarcarConfirmado = async () => {
    await cambiar.mutateAsync({ id: retiro.id, estado: 'confirmado' });
  };

  const handleCompletarRetiro = async () => {
    await cambiar.mutateAsync({ id: retiro.id, estado: 'completado' });
    onClose();
  };

  const isPendienteOConfirmado = retiro.estadoRetiro === 'pendiente' || retiro.estadoRetiro === 'confirmado' || retiro.estadoRetiro === 'parcial';

  return (
    <>
      <div className="modal-overlay">
        <div className="modal max-w-2xl animate-slide-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <h2 className="modal-title">Retiro #{retiro.venta.id}</h2>
              <EstadoBadge estadoPedido={retiro.venta.estadoPedido} />
            </div>
            <button onClick={onClose} className="btn-icon"><X size={18} /></button>
          </div>

          <div className="modal-body space-y-6">

            {/* ── Código de retiro (prominente) ── */}
            <div className="rounded-2xl p-5 border-2 border-amber-200" style={{ background: '#FFFBF0' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <QrCode className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Código único de retiro</span>
                  </div>
                  <p className="text-4xl font-black tracking-[0.15em] text-stone-900 font-mono">{retiro.codigoRetiro}</p>
                  <p className="text-xs text-stone-400 mt-2">
                    {retiro.proveedor
                      ? <>Galpón: <strong className="text-stone-600">{retiro.proveedor.nombreEmpresa}</strong>{retiro.proveedor.telefono ? ` · ${retiro.proveedor.telefono}` : ' · sin teléfono'}</>
                      : 'Comunicale este código al encargado del galpón para validar la entrega.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={copiarCodigo}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                  {retiro.estadoRetiro !== 'cancelado' && (
                    <button onClick={() => setShowReenviar(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reenviar
                    </button>
                  )}
                  <button
                    onClick={() => setShowWhatsApp(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
                    style={{ background: '#25D366' }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {retiro.estadoRetiro === 'cancelado' ? 'Avisar cancelación' : 'Enviar al galpón'}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Acciones de estado ── */}
            {isPendienteOConfirmado && (
              <div className="flex flex-wrap gap-2">
                {retiro.estadoRetiro === 'pendiente' && (
                  <button onClick={handleMarcarConfirmado} disabled={cambiar.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors">
                    <CheckCircle2 className="w-4 h-4" />
                    Marcar como Confirmado
                  </button>
                )}
                <button onClick={handleCompletarRetiro} disabled={cambiar.isPending}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: '#16A34A' }}>
                  <ShieldCheck className="w-4 h-4" />
                  {cambiar.isPending ? 'Confirmando...' : 'Confirmar retiro completado'}
                </button>
                <button onClick={() => setShowCancelar(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  <XCircle className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}

            {/* ── Confirmación info ── */}
            {retiro.estadoRetiro === 'completado' && retiro.confirmadoPor && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Retiro completado</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Confirmado por <strong>{retiro.confirmadoPor.nombre} {retiro.confirmadoPor.apellido}</strong> el {fmtFecha(retiro.fechaConfirmacion)} a las {fmtHora(retiro.fechaConfirmacion)}
                    {retiro.observacionesConf && ` · ${retiro.observacionesConf}`}
                  </p>
                </div>
              </div>
            )}

            {retiro.estadoRetiro === 'parcial' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <Package className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Retiro parcial</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Se retiraron <strong>{retiro.venta.detalles.reduce((acc, d) => acc + retiradoDe(d), 0)}</strong> de{' '}
                    <strong>{retiro.venta.detalles.reduce((acc, d) => acc + d.cantidadPedida, 0)}</strong> unidades
                    {retiro.fechaUltimoRetiroParcial && ` · último retiro el ${fmtFecha(retiro.fechaUltimoRetiroParcial)} a las ${fmtHora(retiro.fechaUltimoRetiroParcial)}`}
                  </p>
                </div>
              </div>
            )}

            {retiro.estadoRetiro === 'cancelado' && retiro.motivoCancelacion && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Retiro cancelado</p>
                  <p className="text-xs text-red-600 mt-0.5">{retiro.motivoCancelacion}</p>
                </div>
              </div>
            )}

            {/* ── Dos columnas: cliente + logística ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div className="bg-stone-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Datos del cliente</span>
                </div>
                <p className="text-sm font-semibold text-stone-800">{retiro.venta.cliente.razonSocial}</p>
                {retiro.venta.cliente.nombreContacto && (
                  <p className="text-xs text-stone-500 mt-0.5">{retiro.venta.cliente.nombreContacto}</p>
                )}
                {retiro.venta.cliente.telefonoContacto && (
                  <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />{retiro.venta.cliente.telefonoContacto}
                  </p>
                )}
                {retiro.venta.cliente.emailContacto && (
                  <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                    <MailIcon className="w-3 h-3" />{retiro.venta.cliente.emailContacto}
                  </p>
                )}
              </div>

              {/* Logística de retiro */}
              <div className="bg-stone-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Warehouse className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Galpón y horario</span>
                </div>
                <div className="space-y-2">
                  <Row label="Galpón"         value={retiro.galpon ?? '—'} />
                  <Row label="Fecha retiro"   value={fmtFecha(retiro.venta.fechaRetiro)} />
                  <Row label="Hora estimada"  value={fmtHora(retiro.horaEstimadaRetiro)} />
                  <Row label="Vendedor"       value={`${retiro.venta.usuario.nombre} ${retiro.venta.usuario.apellido}`} />
                </div>
              </div>
            </div>

            {/* ── Productos ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Productos</span>
              </div>
              <div className="space-y-2">
                {retiro.venta.detalles.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-stone-800">{d.producto.nombre}</p>
                      <p className="text-xs text-stone-400 capitalize">{d.producto.tipo} · {d.producto.condicion}</p>
                    </div>
                    <span className="text-sm font-bold text-stone-700">{d.cantidadPedida} u.</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Pago y origen ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Pago y origen</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoBox label="Método de pago" value={metodoPagoLabel[retiro.venta.metodoPago ?? ''] ?? '—'} />
                <InfoBox label="Modalidad"      value={modalidadLabel[retiro.venta.modalidadPago ?? ''] ?? '—'} />
                <InfoBox label="Origen stock"   value={origenLabel[retiro.venta.origenStock ?? ''] ?? '—'} />
                <InfoBox label="Total + IVA"    value={fmtMonto(retiro.venta.totalConIva)} />
              </div>
              {retiro.venta.observaciones && (
                <p className="text-xs text-stone-500 mt-3 bg-stone-50 rounded-lg px-3 py-2">
                  <span className="font-semibold text-stone-600">Obs:</span> {retiro.venta.observaciones}
                </p>
              )}
            </div>

            {/* ── Remitos asociados ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-stone-400" />
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Remito asociado</span>
              </div>
              {retiro.venta.remito ? (
                <div className="bg-stone-50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">
                      Remito {retiro.venta.remito.numeroRemito ? `#${retiro.venta.remito.numeroRemito}` : `#${retiro.venta.remito.id}`}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">Emitido el {fmtFecha(retiro.venta.remito.fechaEmision)}</p>
                    {retiro.venta.remito.fechaFirmaCliente && (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">
                        ✓ Firmado el {fmtFecha(retiro.venta.remito.fechaFirmaCliente)} a las {fmtHora(retiro.venta.remito.fechaFirmaCliente)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{
                      background: `${ESTADO_REMITO[retiro.venta.remito.estado]?.color ?? '#6B7280'}20`,
                      color: ESTADO_REMITO[retiro.venta.remito.estado]?.color ?? '#6B7280',
                    }}>
                    {ESTADO_REMITO[retiro.venta.remito.estado]?.label ?? retiro.venta.remito.estado}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-stone-400 italic">No hay remito asociado a esta venta.</p>
              )}
            </div>

            {/* ── Historial de reenvíos ── */}
            {retiro.historialReenvios.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-stone-400" />
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Historial de envíos del código</span>
                </div>
                <div className="space-y-2">
                  {retiro.historialReenvios.map(h => (
                    <div key={h.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-2.5 text-xs">
                      <div>
                        {h.proveedor && (
                          <p className="text-stone-700 font-medium">
                            <MessageCircle className="w-3 h-3 inline mr-1 text-green-600" />
                            WhatsApp a {h.proveedor.nombreEmpresa} · {h.tipoMensaje === 'retiro_parcial' ? 'aviso de retiro parcial' : h.tipoMensaje === 'cancelacion' ? 'aviso de cancelación' : 'código de retiro'}
                          </p>
                        )}
                        {h.emailEnviado    && <p className="text-stone-600"><MailIcon className="w-3 h-3 inline mr-1" />{h.emailEnviado}</p>}
                        {h.telefonoEnviado && <p className="text-stone-600"><Phone   className="w-3 h-3 inline mr-1" />{h.telefonoEnviado}</p>}
                      </div>
                      <div className="text-right text-stone-400">
                        <p>{fmtFecha(h.creadoEn)} {fmtHora(h.creadoEn)}</p>
                        <p>{h.enviadoPor.nombre} {h.enviadoPor.apellido}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showConfirmar && <ConfirmarRetiroModal retiro={retiro} onClose={() => setShowConfirmar(false)} />}
      {showCancelar  && (
        <CancelarVentaModal
          ventaId={retiro.venta.id}
          titulo={`Cancelar retiro ${retiro.codigoRetiro}`}
          onClose={() => setShowCancelar(false)}
          onCancelada={onClose}
        />
      )}
      {showReenviar  && <ReenviarCodigoModal  retiro={retiro} onClose={() => setShowReenviar(false)} />}
      {showWhatsApp  && <EnviarGalponModal    retiro={retiro} onClose={() => setShowWhatsApp(false)} />}
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-stone-400 shrink-0">{label}</span>
      <span className="text-xs font-medium text-stone-700 text-right">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 rounded-xl p-3">
      <p className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm font-semibold text-stone-800">{value}</p>
    </div>
  );
}

// ─── Row de lista ─────────────────────────────────────────────────────────────
function RetiroListRow({ r, onVerDetalle }: { r: RetiroRow; onVerDetalle: () => void }) {

  const productos = r.venta.detalles.slice(0, 2).map(d => `${d.producto.nombre} ×${d.cantidadPedida}`).join(', ');
  const masProductos = r.venta.detalles.length > 2 ? ` +${r.venta.detalles.length - 2}` : '';
  const cancelado = r.estadoRetiro === 'cancelado' || r.venta.estadoPedido === 'cancelado';
  const fondo = cancelado ? '#FEF2F2' : 'var(--color-surface)';
  // Las filas canceladas quedan visibles pero tachadas
  const tachado = cancelado ? { textDecoration: 'line-through', opacity: 0.55 } : undefined;

  return (
    <tr
      className="cursor-pointer border-b last:border-0"
      style={{ background: fondo, borderColor: 'var(--color-border)', transition: 'background 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.background = fondo)}
      onClick={onVerDetalle}
    >
      <td className="px-4 py-3 text-sm font-semibold text-stone-700" style={tachado}>#{r.venta.id}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-stone-800" style={tachado}>{r.venta.cliente.razonSocial}</p>
        {r.venta.cliente.nombreContacto && (
          <p className="text-xs text-stone-400">{r.venta.cliente.nombreContacto}</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-stone-600 max-w-50" style={tachado}>
        <span className="truncate block">{productos}{masProductos}</span>
      </td>
      <td className="px-4 py-3 text-xs text-stone-600">{r.galpon ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-stone-600">{fmtFecha(r.venta.fechaRetiro)}</td>
      <td className="px-4 py-3 text-xs text-stone-600">{fmtHora(r.horaEstimadaRetiro)}</td>
      <td className="px-4 py-3 text-xs text-stone-600">
        {r.venta.usuario.nombre} {r.venta.usuario.apellido.charAt(0)}.
      </td>
      <td className="px-4 py-3">
        <EstadoBadge estadoPedido={r.venta.estadoPedido} />
      </td>
      <td className="px-4 py-3">
        <button className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors whitespace-nowrap">
          Ver detalle <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RetirosPage() {
  const { data: retiros, isLoading, error } = useRetiros();
  const { data: stats } = useStatsRetiros();
  const { data: ventas } = useVentas();
  const { usuario } = useAuthStore();

  const [busqueda, setBusqueda]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoRetiro | 'todos'>('todos');
  const [filtroVendedor, setFiltroVendedor] = useState<'todos' | 'carlos' | 'juancruz'>('todos');
  const [filtroFecha, setFiltroFecha]   = useState('');
  const [detalleId, setDetalleId]       = useState<number | null>(null);
  const [showParcial, setShowParcial]   = useState(false);
  const [showCancelarRetiro, setShowCancelarRetiro] = useState(false);

  const retiroDetalle = useMemo(() => retiros?.find(r => r.id === detalleId) ?? null, [retiros, detalleId]);

  const filtrados = useMemo(() => {
    if (!retiros) return [];
    return retiros.filter(r => {
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const match =
          r.venta.cliente.razonSocial.toLowerCase().includes(q) ||
          `#${r.venta.id}`.includes(q) ||
          r.codigoRetiro.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filtroEstado !== 'todos' && r.estadoRetiro !== filtroEstado) return false;
      if (filtroVendedor !== 'todos') {
        const rol = r.venta.usuario.rol;
        if (filtroVendedor === 'carlos'   && rol !== 'propietario_carlos')   return false;
        if (filtroVendedor === 'juancruz' && rol !== 'propietario_juancruz') return false;
      }
      if (filtroFecha && r.venta.fechaRetiro) {
        const fecha = r.venta.fechaRetiro.slice(0, 10);
        if (fecha !== filtroFecha) return false;
      }
      return true;
    });
  }, [retiros, busqueda, filtroEstado, filtroVendedor, filtroFecha]);

  // ── Gráfico 1: Logística vs Retiro (todas las ventas activas) ────────────
  const dataLogisticaVsRetiro = useMemo(() => {
    if (!ventas?.length) return [];
    const conLogistica = ventas.filter(v => v.tipoEntrega === 'envio_woodpallet').length;
    const conRetiro    = ventas.filter(v => v.tipoEntrega === 'retira_cliente').length;
    return [
      { name: 'Con logística', value: conLogistica },
      { name: 'Con retiro',    value: conRetiro    },
    ];
  }, [ventas]);

  // ── Gráfico 2: Retiros por galpón ──────────────────────────────────────
  const dataGalpon = useMemo(() => {
    if (!retiros?.length) return [];
    const mapa: Record<string, number> = {};
    retiros.filter(r => r.estadoRetiro !== 'cancelado').forEach(r => {
      const key = r.galpon?.trim() || 'Sin especificar';
      mapa[key] = (mapa[key] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [retiros]);

  const totalVentas  = dataLogisticaVsRetiro.reduce((acc, d) => acc + d.value, 0);
  const totalGalpon  = dataGalpon.reduce((acc, d) => acc + d.value, 0);

  if (isLoading) return <LoadingSpinner text="Cargando retiros..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar los retiros." />;

  return (
    <>
      {retiroDetalle && (
        <DetalleRetiroModal retiro={retiroDetalle} onClose={() => setDetalleId(null)} />
      )}
      {showParcial && (
        <RetiroParcialModal retiros={retiros ?? []} onClose={() => setShowParcial(false)} />
      )}
      {showCancelarRetiro && (
        <CancelarRetiroSelectorModal retiros={retiros ?? []} onClose={() => setShowCancelarRetiro(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="titulo-modulo">Retiros en galpón</h1>
            <p className="text-sm text-gray-500 mt-1">
              Ventas con retiro en galpón · gestión operativa del día a día
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowCancelarRetiro(true)} className="btn-secondary" style={{ color: '#DC2626' }}>
            <XCircle size={16} />
            Cancelar retiro
          </button>
          <button onClick={() => setShowParcial(true)} className="btn-secondary">
            <Package size={16} />
            Retiro parcial
          </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-kpi">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <Clock size={16} />
              </div>
              <p className="titulo-card flex-1">Pendientes hoy</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{stats?.pendientesHoy ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">retiros programados para hoy</p>
          </div>
          <div className="card-kpi">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <Calendar size={16} />
              </div>
              <p className="titulo-card flex-1">Pendientes esta semana</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{stats?.pendientesSemana ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">en los próximos 7 días</p>
          </div>
          <div className="card-kpi">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <CheckCircle2 size={16} />
              </div>
              <p className="titulo-card flex-1">Completados este mes</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{stats?.completadosMes ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">retiros finalizados</p>
          </div>
        </div>

        {/* Gráficos */}
        {((ventas?.length ?? 0) > 0 || (retiros?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Gráfico 1 — Donut: Con logística vs Con retiro */}
            <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
              <p className="titulo-card mb-3">Pedidos con logística vs retiro</p>
              <div className="flex-1 flex items-center gap-4">
                <div style={{ width: 120, height: 120, flexShrink: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataLogisticaVsRetiro} dataKey="value"
                        cx="50%" cy="50%" innerRadius={34} outerRadius={52}
                        paddingAngle={3} strokeWidth={0}>
                        <Cell fill="#6B3A2A" />
                        <Cell fill="#C4895A" />
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v} pedido${v !== 1 ? 's' : ''}`, '']}
                        contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <p style={{ fontSize: '0.65rem', color: '#9CA3AF', lineHeight: 1.2 }}>Total</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>{totalVentas}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  {dataLogisticaVsRetiro.map((d, i) => {
                    const pct = totalVentas > 0 ? Math.round((d.value / totalVentas) * 100) : 0;
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: ['#6B3A2A', '#C4895A'][i], flexShrink: 0 }} />
                            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#6B7280' }}>{d.value}</p>
                        </div>
                        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: ['#6B3A2A', '#C4895A'][i], borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gráfico 2 — Donut: Retiros por galpón */}
            <div className="card-kpi flex flex-col" style={{ minHeight: 200 }}>
              <p className="titulo-card mb-3">Retiros por galpón</p>
              <div className="flex-1 flex items-center gap-4">
                <div style={{ width: 120, height: 120, flexShrink: 0, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataGalpon} dataKey="value"
                        cx="50%" cy="50%" innerRadius={34} outerRadius={52}
                        paddingAngle={3} strokeWidth={0}>
                        {dataGalpon.map((_, i) => (
                          <Cell key={i} fill={['#6B3A2A', '#C4895A', '#9B5535'][i % 3]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [`${v} retiro${v !== 1 ? 's' : ''}`, '']}
                        contentStyle={{ fontSize: 11, borderRadius: 4, border: '1px solid #E8E2DA' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <p style={{ fontSize: '0.65rem', color: '#9CA3AF', lineHeight: 1.2 }}>Total</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', lineHeight: 1.2 }}>{totalGalpon}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  {dataGalpon.map((d, i) => {
                    const pct = totalGalpon > 0 ? Math.round((d.value / totalGalpon) * 100) : 0;
                    return (
                      <div key={d.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: ['#6B3A2A', '#C4895A', '#9B5535'][i % 3], flexShrink: 0 }} />
                            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151' }}>{d.name}</p>
                          </div>
                          <p style={{ fontSize: '0.72rem', color: '#6B7280' }}>{d.value}</p>
                        </div>
                        <div style={{ height: 6, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: ['#6B3A2A', '#C4895A', '#9B5535'][i % 3], borderRadius: 4, transition: 'width 0.6s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.65rem', color: '#9CA3AF', marginTop: 2 }}>{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
          <div className="flex flex-wrap gap-3">
            {/* Búsqueda */}
            <input
              type="text"
              placeholder="Buscar por cliente, venta o código..."
              className="input flex-1 min-w-50"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />

            {/* Estado */}
            <select className="input w-auto" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value as EstadoRetiro | 'todos')}>
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="parcial">Retiro parcial</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            {/* Vendedor */}
            <select className="input w-auto" value={filtroVendedor}
              onChange={e => setFiltroVendedor(e.target.value as typeof filtroVendedor)}>
              <option value="todos">Todos los vendedores</option>
              <option value="carlos">Carlos</option>
              <option value="juancruz">Juan Cruz</option>
            </select>

            {/* Fecha */}
            <input type="date" className="input w-auto" value={filtroFecha}
              onChange={e => setFiltroFecha(e.target.value)}
              title="Filtrar por fecha de retiro" />
          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-2xl shadow-sm border overflow-hidden" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          {filtrados.length === 0 ? (
            <div className="py-16 text-center">
              <Warehouse className="w-10 h-10 text-stone-200 mx-auto mb-3" />
              <p className="text-stone-400 text-sm">
                {retiros?.length === 0
                  ? 'Todavía no hay retiros registrados. Se crean automáticamente al convertir una cotización con tipo "Retiro en galpón".'
                  : 'No hay retiros que coincidan con los filtros aplicados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
                    {['Venta', 'Cliente', 'Productos', 'Galpón', 'Fecha', 'Hora', 'Vendedor', 'Estado', ''].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(r => (
                    <RetiroListRow key={r.id} r={r} onVerDetalle={() => setDetalleId(r.id)} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {filtrados.length > 0 && (
            <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-muted)' }}>
              <p className="text-xs text-stone-400">
                {filtrados.length} retiro{filtrados.length !== 1 ? 's' : ''} mostrado{filtrados.length !== 1 ? 's' : ''}
                {usuario && ` · conectado como ${usuario.nombre}`}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
