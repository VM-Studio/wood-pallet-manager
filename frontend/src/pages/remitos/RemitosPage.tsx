import { useState } from 'react';
import {
  FileText, Plus, Search, ChevronDown, ChevronUp,
  Send, CheckCircle, AlertCircle, Clock, X,
  Hash, Package, Mail, Eye, Ban
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
import SignaturePad from '../../components/ui/SignaturePad';

// ─── Helpers ──────────────────────────────────────────────

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

// ─── Config estados ───────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; badgeClass: string; icon: React.ReactNode }> = {
  pendiente_firma_propietario: { label: 'Pendiente firma', badgeClass: 'badge-yellow', icon: <Clock size={11} /> },
  enviado_a_cliente:           { label: 'Enviado',         badgeClass: 'badge-blue',   icon: <Send size={11} /> },
  firmado_por_cliente:         { label: 'Firmado',         badgeClass: 'badge-green',  icon: <CheckCircle size={11} /> },
  completado:                  { label: 'Completado',      badgeClass: 'badge-green',  icon: <CheckCircle size={11} /> },
  cancelado:                   { label: 'Cancelado',       badgeClass: 'badge-gray',   icon: <Ban size={11} /> },
};

// ─── Modal: Nueva Devolución desde una venta ──────────────

function NuevoRemitoModal({ onClose }: { onClose: () => void }) {
  const { data: ventas = [] } = useVentas();
  const { data: remitos = [] } = useRemitos();
  const enviar = useEnviarRemito();

  const [ventaId, setVentaId] = useState<number | ''>('');
  const [firma, setFirma] = useState<string | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'firma'>('form');

  // Ventas que NO tienen remito aún
  const remitosVentaIds = new Set(remitos.map(r => r.ventaId));
  const ventasSinRemito = ventas.filter(
    v => v.estadoPedido !== 'cancelado' && !remitosVentaIds.has(v.id)
  );

  const handleContinuar = () => {
    if (!ventaId) { setError('Seleccioná una venta'); return; }
    setError('');
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
              <SignaturePad
                label="Tu firma (propietario)"
                required
                onSignature={setFirma}
                height={140}
              />
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
  const [firma, setFirma] = useState<string | null>(null);
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
          <SignaturePad label="Tu firma (propietario)" required onSignature={setFirma} height={140} />
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
      <div className="card-base">
        <div
          style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', cursor: 'pointer' }}
          onClick={() => setExpanded(p => !p)}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#6B3A2A', fontWeight: 700 }}>{nro}</span>
              <span className={estado.badgeClass} style={{ borderRadius: '0.25rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {estado.icon} {estado.label}
              </span>
              {remito.emailEnviado && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#1D4ED8' }}>
                  <Mail size={11} /> Enviado
                </span>
              )}
              {(remito.estado === 'firmado_por_cliente' || remito.estado === 'completado') && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: '#15803D' }}>
                  <CheckCircle size={11} /> Firmado por cliente
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>{remito.cliente.razonSocial}</p>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>
              Venta #{remito.ventaId} · {formatFecha(remito.fechaEmision)}
              {remito.fechaEntrega && ` · Entrega: ${formatFecha(remito.fechaEntrega)}`}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              {formatPesos(Number(remito.venta.totalConIva ?? 0))}
            </p>
            {expanded ? <ChevronUp size={15} color="#9CA3AF" /> : <ChevronDown size={15} color="#9CA3AF" />}
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
          {!remito.numeroRemito && (
            <button className="btn-brand-sm" onClick={e => { e.stopPropagation(); setShowNumero(true); }}>
              <Hash size={13} /> Asignar número
            </button>
          )}
          {remito.estado === 'pendiente_firma_propietario' && (
            <button className="btn-brand-sm" onClick={e => { e.stopPropagation(); setShowFirmar(true); }}>
              ✍️ Firmar y enviar
            </button>
          )}
          {remito.estado === 'enviado_a_cliente' && (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
              disabled={enviar.isPending}
              onClick={e => { e.stopPropagation(); enviar.mutate(remito.id); }}
            >
              <Send size={13} /> Reenviar email
            </button>
          )}
          {remito.cliente.emailContacto && remito.estado !== 'cancelado' && (
            <a
              href={`${window.location.origin}/remito/${remito.tokenFirma}/firmar`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.75rem', color: '#6B7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              onClick={e => e.stopPropagation()}
            >
              <Eye size={13} /> Ver link de firma
            </a>
          )}
          {(remito.estado === 'pendiente_firma_propietario' || remito.estado === 'enviado_a_cliente') && (
            <button
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', color: '#DC2626', borderColor: '#FECACA', marginLeft: 'auto' }}
              onClick={e => { e.stopPropagation(); if (confirm('¿Cancelar este remito?')) cancelar.mutate(remito.id); }}
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Detalle expandido */}
        {expanded && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F3F4F6' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Productos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {remito.venta.detalles.map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#374151' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <Package size={13} color="#9CA3AF" /> {d.producto.nombre}
                  </span>
                  <span style={{ color: '#6B7280' }}>
                    {d.cantidadPedida} u. × {formatPesos(Number(d.precioUnitario))} = <strong>{formatPesos(Number(d.subtotal))}</strong>
                  </span>
                </div>
              ))}
            </div>

            {remito.cliente.emailContacto && (
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mail size={12} /> {remito.cliente.emailContacto}
              </p>
            )}

            {/* Firmas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              {remito.firmaPropietario && (
                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem', padding: '0.625rem' }}>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 6 }}>Firma propietario</p>
                  <img src={remito.firmaPropietario} alt="Firma propietario" style={{ maxHeight: 60, borderRadius: '0.25rem' }} />
                </div>
              )}
              {remito.firmaCliente && (
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.25rem', padding: '0.625rem' }}>
                  <p style={{ fontSize: '0.7rem', color: '#15803D', marginBottom: 6 }}>Firma cliente</p>
                  <img src={remito.firmaCliente} alt="Firma cliente" style={{ maxHeight: 60, borderRadius: '0.25rem' }} />
                </div>
              )}
            </div>

            {remito.observaciones && (
              <p style={{ fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic', marginTop: '0.5rem' }}>"{remito.observaciones}"</p>
            )}
          </div>
        )}
      </div>

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

  const pendientes = todos.filter(r => r.estado === 'pendiente_firma_propietario').length;
  const enviados   = todos.filter(r => r.estado === 'enviado_a_cliente').length;
  const firmados   = todos.filter(r => r.estado === 'completado' || r.estado === 'firmado_por_cliente').length;

  const FILTROS = [
    { key: 'todos',                       label: 'Todos' },
    { key: 'pendiente_firma_propietario', label: 'Pendientes firma' },
    { key: 'enviado_a_cliente',           label: 'Enviados' },
    { key: 'firmado_por_cliente',         label: 'Firmados' },
    { key: 'completado',                  label: 'Completados' },
    { key: 'cancelado',                   label: 'Cancelados' },
  ];

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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#FEF3E2', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{pendientes}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Pendientes firma</p>
          </div>
        </div>
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#EFF6FF', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Send size={18} style={{ color: '#1D4ED8' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{enviados}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Enviados al cliente</p>
          </div>
        </div>
        <div className="card-kpi" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, background: '#F0FDF4', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={18} style={{ color: '#15803D' }} />
          </div>
          <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 }}>{firmados}</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', margin: 0 }}>Firmados / Completados</p>
          </div>
        </div>
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

      {/* Filtros y búsqueda */}
      <div className="card-base" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            className="input-field"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Buscar por cliente, N° venta, N° remito..."
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
                <span style={{ marginLeft: '0.25rem', opacity: 0.7 }}>({todos.filter(r => r.estado === f.key).length})</span>
              )}
            </button>
          ))}
        </div>
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
        <div className="space-y-3">
          {filtrados.map(r => <RemitoRow key={r.id} remito={r} />)}
        </div>
      )}

      {showModal && <NuevoRemitoModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
