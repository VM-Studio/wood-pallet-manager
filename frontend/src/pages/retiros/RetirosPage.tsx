import { useState, useMemo } from 'react';
import {
  Warehouse, Calendar, Clock, CheckCircle2, XCircle, ChevronRight,
  X, MailIcon, Phone, Copy, Send, User, Package, CreditCard,
  History, FileText, RefreshCw, AlertTriangle, CheckCircle,
  ShieldCheck, QrCode,
} from 'lucide-react';
import {
  useRetiros, useStatsRetiros, useCambiarEstadoRetiro, useReenviarCodigoRetiro,
  type RetiroRow, type EstadoRetiro,
} from '../../hooks/useRetiros';
import { useAuthStore } from '../../store/auth.store';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtFecha = (s?: string) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const fmtHora = (s?: string) =>
  s ? new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';

const fmtMonto = (v?: number | null) =>
  v != null
    ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v)
    : '—';

const ESTADO_STYLE: Record<EstadoRetiro, { bg: string; color: string; label: string }> = {
  pendiente:  { bg: '#FEF3E2', color: '#C4895A', label: 'Pendiente'  },
  confirmado: { bg: '#EFF6FF', color: '#2563EB', label: 'Confirmado' },
  completado: { bg: '#DCFCE7', color: '#15803D', label: 'Completado' },
  cancelado:  { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelado'  },
};

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

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: EstadoRetiro }) {
  const s = ESTADO_STYLE[estado];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color }}>
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
function CancelarRetiroModal({ retiro, onClose }: { retiro: RetiroRow; onClose: () => void }) {
  const cambiar = useCambiarEstadoRetiro();
  const [motivo, setMotivo] = useState('');

  const handleCancelar = async () => {
    if (!motivo.trim()) return;
    await cambiar.mutateAsync({ id: retiro.id, estado: 'cancelado', motivoCancelacion: motivo });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Cancelar retiro</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div>
            <label className="label">Motivo de cancelación <span className="text-red-500">*</span></label>
            <textarea className="input" rows={3} value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Explicá por qué se cancela este retiro..." />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onClose} className="btn-secondary">Volver</button>
            <button onClick={handleCancelar} disabled={!motivo.trim() || cambiar.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700">
              {cambiar.isPending ? 'Cancelando...' : 'Cancelar retiro'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reenviar código modal ────────────────────────────────────────────────────
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

// ─── Detalle modal ────────────────────────────────────────────────────────────
function DetalleRetiroModal({ retiro, onClose }: { retiro: RetiroRow; onClose: () => void }) {
  const cambiar = useCambiarEstadoRetiro();
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [showCancelar, setShowCancelar]   = useState(false);
  const [showReenviar, setShowReenviar]   = useState(false);
  const [copied, setCopied]               = useState(false);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(retiro.codigoRetiro);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarcarConfirmado = async () => {
    await cambiar.mutateAsync({ id: retiro.id, estado: 'confirmado' });
  };

  const isPendienteOConfirmado = retiro.estadoRetiro === 'pendiente' || retiro.estadoRetiro === 'confirmado';

  return (
    <>
      {showConfirmar && <ConfirmarRetiroModal retiro={retiro} onClose={() => setShowConfirmar(false)} />}
      {showCancelar  && <CancelarRetiroModal  retiro={retiro} onClose={() => { setShowCancelar(false); onClose(); }} />}
      {showReenviar  && <ReenviarCodigoModal  retiro={retiro} onClose={() => setShowReenviar(false)} />}

      <div className="modal-overlay">
        <div className="modal max-w-2xl animate-slide-up" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <h2 className="modal-title">Retiro #{retiro.venta.id}</h2>
              <EstadoBadge estado={retiro.estadoRetiro} />
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
                  <p className="text-xs text-stone-400 mt-2">Comunicale este código al encargado del galpón para validar la entrega.</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={copiarCodigo}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? '¡Copiado!' : 'Copiar'}
                  </button>
                  <button onClick={() => setShowReenviar(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reenviar
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
                <button onClick={() => setShowConfirmar(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                  style={{ background: '#16A34A' }}>
                  <ShieldCheck className="w-4 h-4" />
                  Confirmar retiro completado
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
                  <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Historial de reenvíos del código</span>
                </div>
                <div className="space-y-2">
                  {retiro.historialReenvios.map(h => (
                    <div key={h.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-2.5 text-xs">
                      <div>
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

  return (
    <tr className="hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-0" onClick={onVerDetalle}>
      <td className="px-4 py-3 text-sm font-semibold text-stone-700">#{r.venta.id}</td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-stone-800">{r.venta.cliente.razonSocial}</p>
        {r.venta.cliente.nombreContacto && (
          <p className="text-xs text-stone-400">{r.venta.cliente.nombreContacto}</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-stone-600 max-w-50">
        <span className="truncate block">{productos}{masProductos}</span>
      </td>
      <td className="px-4 py-3 text-xs text-stone-600">{r.galpon ?? '—'}</td>
      <td className="px-4 py-3 text-xs text-stone-600">{fmtFecha(r.venta.fechaRetiro)}</td>
      <td className="px-4 py-3 text-xs text-stone-600">{fmtHora(r.horaEstimadaRetiro)}</td>
      <td className="px-4 py-3 text-xs text-stone-600">
        {r.venta.usuario.nombre} {r.venta.usuario.apellido.charAt(0)}.
      </td>
      <td className="px-4 py-3">
        <EstadoBadge estado={r.estadoRetiro} />
      </td>
      <td className="px-4 py-3">
        <button className="flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors">
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
  const { usuario } = useAuthStore();

  const [busqueda, setBusqueda]         = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoRetiro | 'todos'>('todos');
  const [filtroVendedor, setFiltroVendedor] = useState<'todos' | 'carlos' | 'juancruz'>('todos');
  const [filtroFecha, setFiltroFecha]   = useState('');
  const [detalleId, setDetalleId]       = useState<number | null>(null);

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

  if (isLoading) return <LoadingSpinner text="Cargando retiros..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar los retiros." />;

  return (
    <>
      {retiroDetalle && (
        <DetalleRetiroModal retiro={retiroDetalle} onClose={() => setDetalleId(null)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            <Warehouse className="w-6 h-6 text-stone-600" />
            Retiros en galpón
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Ventas con retiro en galpón · gestión operativa del día a día
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Pendientes hoy"      value={stats?.pendientesHoy    ?? 0} icon={Clock}         color="#C4895A" />
          <KpiCard label="Pendientes esta semana" value={stats?.pendientesSemana ?? 0} icon={Calendar}   color="#2563EB" />
          <KpiCard label="Completados este mes" value={stats?.completadosMes  ?? 0} icon={CheckCircle2}  color="#15803D" />
        </div>

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
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
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
                  <tr className="border-b border-stone-100 bg-stone-50">
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
            <div className="px-4 py-3 border-t border-stone-100 bg-stone-50">
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
