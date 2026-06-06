import { useState } from 'react';
import {
  FileText, Plus, Search, ChevronDown, ChevronUp,
  Send, CheckCircle, AlertCircle, Clock, X,
  Hash, Package, Mail, Ban, PenLine, Pen
} from 'lucide-react';
import {
  useRemitos,
  useEnviarRemito,
  useActualizarNumeroRemito,
  useCancelarRemito,
  useFirmarPropietario,
  type Remito,
} from '../../hooks/useRemitos';
import { useVentas } from '../../hooks/useVentas';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Pagination from '../../components/ui/Pagination';
import SignaturePad from '../../components/ui/SignaturePad';
import { useAuthStore } from '../../store/auth.store';

// ─── Helpers ──────────────────────────────────────────────

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ─── Config estados ───────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  pendiente_firma_propietario: { label: 'Pendiente firma',  badgeClass: 'badge-yellow', icon: <Clock size={11} /> },
  enviado_a_cliente:           { label: 'Enviado al cliente', badgeClass: 'badge-blue', icon: <Send size={11} /> },
  firmado_por_cliente:         { label: 'Firmado',          badgeClass: 'badge-green',  icon: <CheckCircle size={11} /> },
  completado:                  { label: 'Completado',       badgeClass: 'badge-green',  icon: <CheckCircle size={11} /> },
  cancelado:                   { label: 'Cancelado',        badgeClass: 'badge-gray',   icon: <Ban size={11} /> },
};

// ─── Modal: Nueva Devolución desde una venta ──────────────

function NuevoRemitoModal({ onClose }: { onClose: () => void }) {
  const { data: ventas = [] } = useVentas();
  const { data: remitos = [] } = useRemitos();
  const enviar = useEnviarRemito();
  const { usuario } = useAuthStore();
  const firmaGuardada = usuario?.firma ?? null;

  const [ventaId, setVentaId] = useState<number | ''>('');
  const [firma, setFirma] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'firma'>('form');
  const [usarGuardada, setUsarGuardada] = useState(!!firmaGuardada);

  // Ventas que NO tienen remito aún
  const remitosVentaIds = new Set(remitos.map(r => r.ventaId));
  const ventasSinRemito = ventas.filter(
    v => v.estadoPedido !== 'cancelado' && !remitosVentaIds.has(v.id)
  );

  const handleContinuar = () => {
    if (!ventaId) { setError('Seleccioná una venta'); return; }
    setError('');
    // Si hay firma guardada y se optó por usarla, pre-cargarla
    if (usarGuardada && firmaGuardada) setFirma(firmaGuardada);
    else setFirma(null);
    setStep('firma');
  };

  const handleCrear = async () => {
    if (!firma) { setError('La firma del propietario es obligatoria'); return; }
    setError('');
    try {
      // 1. Crear remito via API directamente con firma
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/remitos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('wp_token')}` },
        body: JSON.stringify({ ventaId, firmaPropietario: firma, fechaEntrega: fechaEntrega || undefined, observaciones: observaciones || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      const remito = await res.json();
      // 2. Si tiene email el cliente, enviar
      if (remito.cliente?.emailContacto) {
        await enviar.mutateAsync(remito.id);
      }
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error al crear el remito');
    }
  };

  const ventaSeleccionada = ventas.find(v => v.id === ventaId);

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 36, height: 36, background: '#F3EDE8', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} style={{ color: '#6B3A2A' }} />
            </div>
            <div>
              <h2 className="modal-title">Nuevo remito</h2>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
                {step === 'form' ? 'Seleccioná la venta' : 'Firmá el remito para enviarlo'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {step === 'form' ? (
            <>
              <div>
                <label className="label">Venta asociada *</label>
                <select className="select" value={ventaId} onChange={e => setVentaId(Number(e.target.value))} required>
                  <option value="">— Seleccioná una venta —</option>
                  {ventasSinRemito.map(v => (
                    <option key={v.id} value={v.id}>
                      #{v.id} — {v.cliente?.razonSocial} — {formatPesos(Number(v.totalConIva ?? 0))}
                    </option>
                  ))}
                </select>
                {ventasSinRemito.length === 0 && (
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>
                    Todas las ventas ya tienen remito o pueden generarse al convertir una cotización.
                  </p>
                )}
              </div>
              {ventaSeleccionada && (
                <div style={{ background: '#F9FAFB', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#374151' }}>
                  <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{ventaSeleccionada.cliente?.razonSocial}</p>
                  <p style={{ color: '#6B7280', margin: 0 }}>
                    {ventaSeleccionada.detalles?.length ?? 0} producto(s) · {formatPesos(Number(ventaSeleccionada.totalConIva ?? 0))}
                  </p>
                </div>
              )}
              <div>
                <label className="label">Fecha de entrega estimada</label>
                <input type="date" className="input" value={fechaEntrega} onChange={e => setFechaEntrega(e.target.value)} />
              </div>
              <div>
                <label className="label">Observaciones</label>
                <textarea className="input" rows={2} style={{ resize: 'none' }} value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas adicionales..." />
              </div>
            </>
          ) : (
            <>
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
                <strong>Firma obligatoria:</strong> El remito será enviado al cliente con tu firma. Él lo recibirá por email para firmarlo digitalmente.
              </div>

              {/* Toggle firma guardada / firma manual */}
              {firmaGuardada && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => { setUsarGuardada(true); setFirma(firmaGuardada); }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.55rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600,
                      border: `2px solid ${usarGuardada ? '#7c4b2c' : '#E5E7EB'}`,
                      background: usarGuardada ? '#FDF6EE' : 'white',
                      color: usarGuardada ? '#7c4b2c' : '#6B7280',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <CheckCircle size={14} />
                    Usar firma guardada
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsarGuardada(false); setFirma(null); }}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      padding: '0.55rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600,
                      border: `2px solid ${!usarGuardada ? '#7c4b2c' : '#E5E7EB'}`,
                      background: !usarGuardada ? '#FDF6EE' : 'white',
                      color: !usarGuardada ? '#7c4b2c' : '#6B7280',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Pen size={14} />
                    Firmar ahora
                  </button>
                </div>
              )}

              {usarGuardada && firmaGuardada ? (
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.5rem' }}>Vista previa de tu firma guardada:</p>
                  <div style={{ border: '2px dashed #E8E2DA', borderRadius: '0.375rem', padding: '1rem', background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90 }}>
                    <img src={firmaGuardada} alt="Firma guardada" style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 6 }}>
                    Podés cambiar tu firma guardada en <strong>Mi cuenta → Firma digital</strong>.
                  </p>
                </div>
              ) : (
                <SignaturePad
                  label="Tu firma (propietario)"
                  required
                  onSignature={setFirma}
                  height={140}
                />
              )}
            </>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.625rem 0.875rem', borderRadius: '0.25rem' }}>
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'form' ? (
            <>
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="button" onClick={handleContinuar} className="btn-brand" disabled={!ventaId}>
                Continuar → Firmar
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setStep('form')} className="btn-secondary">← Atrás</button>
              <button type="button" onClick={handleCrear} className="btn-brand" disabled={!firma || enviar.isPending}>
                {enviar.isPending ? 'Enviando...' : 'Crear y enviar remito'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Asignar número de remito ─────────────────────

function AsignarNumeroModal({ remito, onClose }: { remito: Remito; onClose: () => void }) {
  const actualizar = useActualizarNumeroRemito();
  const [numero, setNumero] = useState(remito.numeroRemito ?? '');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) { setError('Ingresá un número de remito'); return; }
    try {
      await actualizar.mutateAsync({ id: remito.id, numeroRemito: numero.trim() });
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Asignar número de remito</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.75rem' }}>
              Este número se usará como referencia en la factura y en los documentos enviados al cliente.
            </p>
            <div>
              <label className="label">Número de remito *</label>
              <input
                className="input"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Ej: R-0001 / 00045"
                autoFocus
              />
            </div>
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.5rem 0.75rem', borderRadius: '0.25rem', marginTop: '0.75rem' }}>{error}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-brand" disabled={actualizar.isPending}>
              {actualizar.isPending ? 'Guardando...' : 'Guardar número'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Firmar propietario (si olvidó firmar al crear) ─

function FirmarPropietarioModal({ remito, onClose }: { remito: Remito; onClose: () => void }) {
  const firmar = useFirmarPropietario();
  const enviar = useEnviarRemito();
  const { usuario } = useAuthStore();
  const firmaGuardada = usuario?.firma ?? null;

  const [firma, setFirma] = useState<string | null>(firmaGuardada ?? null);
  const [usarGuardada, setUsarGuardada] = useState(!!firmaGuardada);
  const [error, setError] = useState('');

  const handleFirmarYEnviar = async () => {
    if (!firma) { setError('La firma es obligatoria'); return; }
    try {
      await firmar.mutateAsync({ id: remito.id, firma });
      await enviar.mutateAsync(remito.id);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Firmar y enviar remito</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.8rem', color: '#1E40AF' }}>
            Cliente: <strong>{remito.cliente.razonSocial}</strong> · {remito.cliente.emailContacto ?? 'Sin email'}
          </div>

          {/* Toggle firma guardada / firma manual */}
          {firmaGuardada && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => { setUsarGuardada(true); setFirma(firmaGuardada); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.55rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600,
                  border: `2px solid ${usarGuardada ? '#7c4b2c' : '#E5E7EB'}`,
                  background: usarGuardada ? '#FDF6EE' : 'white',
                  color: usarGuardada ? '#7c4b2c' : '#6B7280',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <CheckCircle size={14} />
                Usar firma guardada
              </button>
              <button
                type="button"
                onClick={() => { setUsarGuardada(false); setFirma(null); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.55rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 600,
                  border: `2px solid ${!usarGuardada ? '#7c4b2c' : '#E5E7EB'}`,
                  background: !usarGuardada ? '#FDF6EE' : 'white',
                  color: !usarGuardada ? '#7c4b2c' : '#6B7280',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <Pen size={14} />
                Firmar ahora
              </button>
            </div>
          )}

          {usarGuardada && firmaGuardada ? (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.5rem' }}>Vista previa de tu firma guardada:</p>
              <div style={{ border: '2px dashed #E8E2DA', borderRadius: '0.375rem', padding: '1rem', background: '#FAFAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 90 }}>
                <img src={firmaGuardada} alt="Firma guardada" style={{ maxHeight: 72, maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 6 }}>
                Podés cambiar tu firma guardada en <strong>Mi cuenta → Firma digital</strong>.
              </p>
            </div>
          ) : (
            <SignaturePad label="Tu firma (propietario)" required onSignature={setFirma} height={140} />
          )}

          {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.5rem 0.75rem', borderRadius: '0.25rem' }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleFirmarYEnviar} className="btn-brand" disabled={!firma || firmar.isPending || enviar.isPending}>
            {(firmar.isPending || enviar.isPending) ? 'Procesando...' : 'Firmar y enviar al cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fila de remito ───────────────────────────────────────

// ─── Helper: estilo botón acción ──────────────────────────
const btnAccion = (bg: string, border: string, color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: '1.875rem', height: '1.875rem', borderRadius: '0.25rem',
  background: bg, border: `1.5px solid ${border}`,
  color, cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
});

function RemitoRow({ remito }: { remito: Remito }) {
  const [expanded, setExpanded] = useState(false);
  const [showNumero, setShowNumero] = useState(false);
  const [showFirmar, setShowFirmar] = useState(false);
  const cancelar = useCancelarRemito();
  const enviar = useEnviarRemito();

  const estado = ESTADO_CONFIG[remito.estado] ?? { label: remito.estado, badgeClass: 'badge-gray', icon: null };
  const nro = remito.numeroRemito ?? `#${String(remito.id).padStart(4, '0')}`;

  return (
    <>
      <tr>
        {/* # */}
        <td className="font-semibold text-xs" style={{ color: '#6B3A2A', fontFamily: 'monospace' }}>{nro}</td>

        {/* Cliente */}
        <td>
          <p className="font-semibold text-gray-900 text-sm">{remito.cliente.razonSocial}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400">Venta #{remito.ventaId}</span>
            {remito.fechaEntrega && (
              <span className="text-xs font-medium" style={{ color: '#C4895A' }}>
                Entrega: {formatFecha(remito.fechaEntrega)}
              </span>
            )}
          </div>
        </td>

        {/* Productos */}
        <td>
          <div className="space-y-0.5">
            {remito.venta.detalles.map(d => (
              <p key={d.id} className="text-xs text-gray-600">
                {d.producto.nombre} — {d.cantidadPedida} u
              </p>
            ))}
          </div>
        </td>

        {/* Total */}
        <td>
          <p className="font-semibold text-gray-900 text-sm">{formatPesos(Number(remito.venta.totalConIva ?? 0))}</p>
          <p className="text-xs text-gray-400">con IVA</p>
        </td>

        {/* Estado */}
        <td>
          <div className="flex flex-col gap-1 items-start">
            {remito.estado !== 'enviado_a_cliente' && (
              <span className={estado.badgeClass} style={{ borderRadius: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {estado.icon} {estado.label}
              </span>
            )}
            {remito.emailEnviado && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#1D4ED8' }}>
                <Mail size={11} /> Email enviado
              </span>
            )}
            {(remito.estado === 'firmado_por_cliente' || remito.estado === 'completado') && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#15803D' }}>
                <CheckCircle size={11} /> Firmado
              </span>
            )}
          </div>
        </td>

        {/* Fecha */}
        <td className="text-xs text-gray-400">{formatFecha(remito.fechaEmision)}</td>

        {/* Acciones */}
        <td>
          <div className="flex items-center gap-1.5">
            {/* Firmar remito */}
            {remito.estado === 'pendiente_firma_propietario' && !remito.firmaPropietario && (
              <button
                onClick={e => { e.stopPropagation(); setShowFirmar(true); }}
                title="Firmar remito"
                style={btnAccion('#FEF3E2', '#FDE68A', '#C4895A')}
              >
                <PenLine size={14} />
              </button>
            )}
            {/* Enviar email */}
            {(remito.estado === 'enviado_a_cliente' || (remito.estado === 'pendiente_firma_propietario' && remito.firmaPropietario)) && (
              <button
                onClick={e => { e.stopPropagation(); enviar.mutate(remito.id); }}
                disabled={enviar.isPending}
                title="Enviar email con remito"
                style={btnAccion('#EFF6FF', '#93C5FD', '#2563EB')}
              >
                <Send size={14} />
              </button>
            )}
            {/* Asignar número */}
            {!remito.numeroRemito && (
              <button
                onClick={e => { e.stopPropagation(); setShowNumero(true); }}
                title="Asignar número de remito"
                style={btnAccion('#F3F4F6', '#E5E7EB', '#6B7280')}
              >
                <Hash size={14} />
              </button>
            )}
            {/* Cancelar */}
            {(remito.estado === 'pendiente_firma_propietario' || remito.estado === 'enviado_a_cliente') && (
              <button
                onClick={e => { e.stopPropagation(); if (confirm('¿Cancelar este remito?')) cancelar.mutate(remito.id); }}
                title="Cancelar remito"
                style={btnAccion('#FEF2F2', '#FCA5A5', '#DC2626')}
              >
                <X size={14} />
              </button>
            )}
            {/* Expandir detalle */}
            <button
              onClick={() => setExpanded(p => !p)}
              title="Ver detalle"
              style={btnAccion('#F3F4F6', '#E5E7EB', '#6B7280')}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Fila expandida: detalle */}
      {expanded && (
        <tr>
          <td colSpan={7} style={{ background: '#FAFAF8', padding: '0.75rem 1rem', borderTop: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

              {/* Productos */}
              <div>
                <p style={{ fontSize: '0.67rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Productos</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {remito.venta.detalles.map(d => (
                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151', maxWidth: 480 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Package size={12} color="#9CA3AF" /> {d.producto.nombre}
                      </span>
                      <span style={{ color: '#6B7280' }}>
                        {d.cantidadPedida} u. × {formatPesos(Number(d.precioUnitario))} = <strong>{formatPesos(Number(d.subtotal))}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email contacto */}
              {remito.cliente.emailContacto && (
                <p style={{ fontSize: '0.75rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Mail size={12} /> {remito.cliente.emailContacto}
                </p>
              )}

              {/* Firmas */}
              {(remito.firmaPropietario || remito.firmaCliente) && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {remito.firmaPropietario && (
                    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem', padding: '0.5rem' }}>
                      <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 4 }}>Firma propietario</p>
                      <img src={remito.firmaPropietario} alt="Firma propietario" style={{ maxHeight: 50, borderRadius: '0.25rem' }} />
                    </div>
                  )}
                  {remito.firmaCliente && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.25rem', padding: '0.5rem' }}>
                      <p style={{ fontSize: '0.7rem', color: '#15803D', marginBottom: 4 }}>Firma cliente</p>
                      <img src={remito.firmaCliente} alt="Firma cliente" style={{ maxHeight: 50, borderRadius: '0.25rem' }} />
                    </div>
                  )}
                </div>
              )}

              {/* Observaciones */}
              {remito.observaciones && (
                <p style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic' }}>"{remito.observaciones}"</p>
              )}
            </div>
          </td>
        </tr>
      )}

      {showNumero && <AsignarNumeroModal remito={remito} onClose={() => setShowNumero(false)} />}
      {showFirmar && <FirmarPropietarioModal remito={remito} onClose={() => setShowFirmar(false)} />}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────

export default function RemitosPage() {
  const { data: remitos, isLoading, isError } = useRemitos();
  const [showModal, setShowModal] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 10;

  if (isLoading) return <LoadingSpinner text="Cargando remitos..." />;
  if (isError) return <ErrorMessage message="No se pudieron cargar los remitos." />;

  const todos = remitos ?? [];

  const filtrados = todos.filter(r => {
    const matchEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
    const matchBusqueda =
      !busqueda ||
      r.cliente.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(r.ventaId).includes(busqueda) ||
      String(r.id).includes(busqueda) ||
      (r.numeroRemito ?? '').toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const remitosPaginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const pendientes = todos.filter(r => r.estado === 'pendiente_firma_propietario').length;
  const enviados   = todos.filter(r => r.estado === 'enviado_a_cliente').length;
  const firmados   = todos.filter(r => r.estado === 'completado' || r.estado === 'firmado_por_cliente').length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="titulo-modulo">Remitos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {todos.length} remito{todos.length !== 1 ? 's' : ''} registrado{todos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-brand">
          <Plus size={16} /> Nuevo remito
        </button>
      </div>

      {/* KPIs — también funcionan como filtro */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { key: 'todos',                       label: 'Todos',                  val: todos.length,    icono: <FileText size={16} />, sub: 'remitos registrados' },
          { key: 'pendiente_firma_propietario', label: 'Pendientes firma',       val: pendientes,      icono: <Clock size={16} />,    sub: 'esperando firma' },
          { key: 'enviado_a_cliente',           label: 'Enviados al cliente',    val: enviados,        icono: <Send size={16} />,     sub: 'aguardando firma cliente' },
          { key: 'completado',                  label: 'Firmados / Completados', val: firmados,        icono: <CheckCircle size={16} />, sub: 'remitos finalizados' },
        ].map(t => {
          const activa = filtroEstado === t.key;
          return (
            <div
              key={t.key}
              className="card-kpi cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
              onClick={() => { setFiltroEstado(t.key); setPagina(1); }}
              style={activa ? { outline: '2px solid #C4895A', outlineOffset: '-2px' } : {}}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                  {t.icono}
                </div>
                <p className="titulo-card flex-1">{t.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{t.val}</p>
              <p className="text-xs text-gray-400 mt-1">{t.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Alerta pendientes */}
      {pendientes > 0 && (
        <div className="card-base" style={{ borderLeft: '4px solid #F59E0B', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <AlertCircle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              {pendientes} remito{pendientes > 1 ? 's' : ''} esperando tu firma para ser enviado{pendientes > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>
              Firmá y enviá los remitos pendientes para que el cliente pueda confirmar la entrega digitalmente.
            </p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
        <input
          className="input-field"
          style={{ paddingLeft: '2.25rem' }}
          placeholder="Buscar por cliente, N° venta, N° remito..."
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><FileText size={24} /></div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
            {busqueda || filtroEstado !== 'todos' ? 'Sin resultados con los filtros aplicados' : 'Sin remitos registrados'}
          </p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
            Los remitos se generan al convertir una cotización en venta o manualmente desde aquí
          </p>
          {!busqueda && filtroEstado === 'todos' && (
            <button onClick={() => setShowModal(true)} className="btn-brand" style={{ marginTop: '1rem' }}>
              <Plus size={15} /> Crear primer remito
            </button>
          )}
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {remitosPaginados.map(r => <RemitoRow key={r.id} remito={r} />)}
            </tbody>
          </table>
          </div>
          <Pagination
            total={filtrados.length}
            pagina={pagina}
            porPagina={POR_PAGINA}
            onCambiar={setPagina}
            nombreItems="remitos"
          />
        </div>
      )}

      {showModal && <NuevoRemitoModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
