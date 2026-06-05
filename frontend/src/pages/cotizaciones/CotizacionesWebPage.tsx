import { useState, useEffect, useCallback } from 'react';
import {
  Globe, Clock, Eye, CheckCircle2, XCircle, RefreshCw,
  Mail, Phone, Package, Truck,
  CalendarDays, MessageSquare, Leaf, ChevronRight, X,
  ArrowRight, AlertTriangle,
} from 'lucide-react';
import {
  getCotizacionesWeb,
  cambiarEstadoCotizacionWeb,
  convertirCotizacionWeb,
  type CotizacionWeb,
} from '../../services/cotizacionesWeb.service';
import api from '../../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const formatFechaHora = (s: string) =>
  new Date(s).toLocaleString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const ESTADO_CONFIG = {
  pendiente:   { label: 'Pendiente',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
  vista:       { label: 'Vista',       color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: Eye },
  convertida:  { label: 'Convertida',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: CheckCircle2 },
  descartada:  { label: 'Descartada',  color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB', icon: XCircle },
};

const TABS = [
  { key: 'todas',      label: 'Todas' },
  { key: 'pendiente',  label: 'Pendientes' },
  { key: 'vista',      label: 'Vistas' },
  { key: 'convertida', label: 'Convertidas' },
  { key: 'descartada', label: 'Descartadas' },
];

// ─── Modal Convertir a Cotización Formal ─────────────────────────────────────

function ModalConvertir({
  cw,
  onClose,
  onConverted,
}: {
  cw: CotizacionWeb;
  onClose: () => void;
  onConverted: () => void;
}) {
  const [modo, setModo] = useState<'existente' | 'nuevo'>('nuevo');
  const [clientes, setClientes] = useState<{ id: number; razonSocial: string }[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({
    razonSocial: cw.empresa || cw.nombre,
    nombreContacto: cw.nombre,
    emailContacto: cw.email,
    telefonoContacto: cw.telefono || '',
    localidad: cw.localidadEntrega || '',
  });
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [incluyeFlete, setIncluyeFlete] = useState(cw.tipoEntrega === 'envio');
  const [costoFlete, setCostoFlete] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/clientes').then(r => setClientes(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!precioUnitario || isNaN(Number(precioUnitario)) || Number(precioUnitario) <= 0) {
      setError('Ingresá el precio unitario del pallet'); return;
    }
    if (modo === 'existente' && !clienteId) {
      setError('Seleccioná un cliente existente'); return;
    }
    if (modo === 'nuevo') {
      if (!nuevoCliente.razonSocial.trim()) { setError('Razón social requerida'); return; }
      if (!nuevoCliente.nombreContacto.trim()) { setError('Nombre de contacto requerido'); return; }
      if (!nuevoCliente.emailContacto.includes('@')) { setError('Email inválido'); return; }
      if (!nuevoCliente.telefonoContacto.trim()) { setError('Teléfono requerido'); return; }
    }

    setLoading(true);
    try {
      await convertirCotizacionWeb(cw.id, {
        ...(modo === 'existente' ? { clienteId: Number(clienteId) } : { nuevoCliente }),
        precioUnitario: Number(precioUnitario),
        incluyeFlete,
        costoFlete: incluyeFlete && costoFlete ? Number(costoFlete) : undefined,
      });
      onConverted();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al convertir');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', borderRadius: '0.5rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="modal-title" style={{ margin: 0 }}>Convertir a cotización</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280' }}>
              Solicitud de <strong>{cw.nombre}</strong>
              {cw.cantidad && ` · ${cw.cantidad} pallets`}
              {cw.tipoPallet && ` · ${cw.tipoPallet}`}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

          {/* Selector cliente nuevo / existente */}
          <div>
            <label className="label">Cliente</label>
            <div className="grid grid-cols-2 gap-2">
              {(['nuevo', 'existente'] as const).map(m => (
                <button key={m} type="button"
                  onClick={() => setModo(m)}
                  style={{
                    padding: '0.6rem', border: modo === m ? '2px solid #7c4b2c' : '2px solid #E5E7EB',
                    background: modo === m ? '#FDF5F0' : '#fff', borderRadius: '0.375rem',
                    cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    color: modo === m ? '#7c4b2c' : '#6B7280',
                  }}>
                  {m === 'nuevo' ? '+ Crear cliente nuevo' : 'Seleccionar existente'}
                </button>
              ))}
            </div>
          </div>

          {modo === 'existente' ? (
            <div>
              <label className="label">Seleccionar cliente</label>
              <select className="select" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">— Elegir cliente —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Razón social / Empresa *</label>
                <input className="input" value={nuevoCliente.razonSocial}
                  onChange={e => setNuevoCliente(p => ({ ...p, razonSocial: e.target.value }))} />
              </div>
              <div>
                <label className="label">Nombre de contacto *</label>
                <input className="input" value={nuevoCliente.nombreContacto}
                  onChange={e => setNuevoCliente(p => ({ ...p, nombreContacto: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input" type="email" value={nuevoCliente.emailContacto}
                  onChange={e => setNuevoCliente(p => ({ ...p, emailContacto: e.target.value }))} />
              </div>
              <div>
                <label className="label">Teléfono *</label>
                <input className="input" value={nuevoCliente.telefonoContacto}
                  onChange={e => setNuevoCliente(p => ({ ...p, telefonoContacto: e.target.value }))} />
              </div>
              <div>
                <label className="label">Localidad</label>
                <input className="input" value={nuevoCliente.localidad}
                  onChange={e => setNuevoCliente(p => ({ ...p, localidad: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Precio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Precio unitario por pallet *</label>
              <input className="input" type="number" min="1" placeholder="$ 0"
                value={precioUnitario} onChange={e => setPrecioUnitario(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', border: incluyeFlete ? '2px solid #7c4b2c' : '2px solid #E5E7EB', borderRadius: '0.375rem', cursor: 'pointer', background: incluyeFlete ? '#FDF5F0' : '#fff' }}>
                <input type="checkbox" checked={incluyeFlete} onChange={e => setIncluyeFlete(e.target.checked)} />
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: incluyeFlete ? '#7c4b2c' : '#6B7280' }}>
                  <Truck size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Incluye flete
                </span>
              </label>
            </div>
          </div>

          {incluyeFlete && (
            <div>
              <label className="label">Costo del flete</label>
              <input className="input" type="number" min="0" placeholder="$ 0"
                value={costoFlete} onChange={e => setCostoFlete(e.target.value)} />
            </div>
          )}

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.625rem 0.875rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.375rem' }}>
              <AlertTriangle size={14} color="#DC2626" />
              <span style={{ fontSize: '0.82rem', color: '#DC2626' }}>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1.5px solid #E5E7EB', background: '#fff', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: '#374151' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', background: loading ? '#9CA3AF' : '#7c4b2c', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              <ArrowRight size={14} />
              {loading ? 'Convirtiendo…' : 'Convertir a cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tarjeta individual ───────────────────────────────────────────────────────

function TarjetaWeb({
  cw,
  onCambiarEstado,
  onConvertir,
}: {
  cw: CotizacionWeb;
  onCambiarEstado: (id: number, estado: CotizacionWeb['estado'], extra?: { motivoDescarte?: string }) => void;
  onConvertir: (cw: CotizacionWeb) => void;
}) {
  const cfg = ESTADO_CONFIG[cw.estado];
  const Icon = cfg.icon;
  const [expandido, setExpandido] = useState(false);
  const [descartando, setDescartando] = useState(false);
  const [motivo, setMotivo] = useState('');

  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${cw.estado === 'pendiente' ? '#FDE68A' : '#E8E2DA'}`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: '0.375rem',
      overflow: 'hidden',
    }}>
      {/* ── Header de la tarjeta ── */}
      <div style={{ padding: '1rem 1.125rem', background: cw.estado === 'pendiente' ? '#FFFDF5' : '#FAFAF8' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge estado */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '0.2rem 0.55rem', borderRadius: 99,
              background: cfg.bg, border: `1px solid ${cfg.border}`,
              fontSize: '0.63rem', fontWeight: 700, color: cfg.color,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              marginBottom: '0.4rem',
            }}>
              <Icon size={10} />
              {cfg.label}
            </span>

            {/* Nombre */}
            <h3 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '1.3rem', fontWeight: 600, fontStyle: 'italic',
              color: '#1F2937', margin: 0, lineHeight: 1.2,
            }}>
              {cw.nombre}
              {cw.empresa && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontStyle: 'normal', fontWeight: 500, color: '#9CA3AF', marginLeft: 8 }}>{cw.empresa}</span>}
            </h3>

            {/* Fecha */}
            <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#9CA3AF' }}>
              {formatFechaHora(cw.creadoEn)}
            </p>
          </div>

          {/* Botón expandir */}
          <button
            onClick={() => setExpandido(v => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4, borderRadius: '0.25rem', flexShrink: 0, marginTop: 2 }}
            title={expandido ? 'Colapsar' : 'Ver detalle'}
          >
            <ChevronRight size={16} style={{ transform: expandido ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* ── Info compacta ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.25rem', marginTop: '0.75rem' }}>
          {cw.email && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#374151' }}>
              <Mail size={12} color="#C4895A" /> {cw.email}
            </span>
          )}
          {cw.telefono && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#374151' }}>
              <Phone size={12} color="#C4895A" /> {cw.telefono}
            </span>
          )}
          {cw.cantidad && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#374151' }}>
              <Package size={12} color="#C4895A" /> {cw.cantidad} pallets
              {cw.tipoPallet && <span style={{ color: '#9CA3AF' }}>· {cw.tipoPallet}</span>}
            </span>
          )}
          {cw.tipoEntrega && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#374151' }}>
              <Truck size={12} color="#C4895A" />
              {cw.tipoEntrega === 'envio' ? 'Envío' : 'Retira en galpón'}
              {cw.localidadEntrega && <span style={{ color: '#9CA3AF' }}>· {cw.localidadEntrega}</span>}
            </span>
          )}
          {cw.requiereSenasa && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: '#16A34A', fontWeight: 600 }}>
              <Leaf size={12} /> SENASA requerido
            </span>
          )}
        </div>
      </div>

      {/* ── Detalle expandido ── */}
      {expandido && (
        <div style={{ padding: '0.875rem 1.125rem', borderTop: '1px solid #F3EDE5', background: '#fff', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* Fechas */}
          {cw.fechaNecesidad && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={13} color="#C4895A" />
              <span style={{ fontSize: '0.8rem', color: '#374151' }}>
                <strong>Fecha de necesidad:</strong> {formatFecha(cw.fechaNecesidad)}
              </span>
            </div>
          )}

          {/* Observaciones */}
          {cw.observaciones && (
            <div style={{ background: '#FAFAF8', border: '1px solid #E8E2DA', borderRadius: '0.25rem', padding: '0.625rem 0.875rem' }}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={10} /> Mensaje del cliente
              </p>
              <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                {cw.observaciones}
              </p>
            </div>
          )}

          {/* Si ya fue convertida, mostrar link a cotización */}
          {cw.estado === 'convertida' && cw.cotizacion && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.75rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '0.25rem' }}>
              <CheckCircle2 size={13} color="#16A34A" />
              <span style={{ fontSize: '0.8rem', color: '#15803D', fontWeight: 500 }}>
                Cotización #{cw.cotizacion.id} generada exitosamente
              </span>
            </div>
          )}

          {/* Motivo descarte */}
          {cw.estado === 'descartada' && cw.motivoDescarte && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '0.5rem 0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.25rem' }}>
              <XCircle size={13} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>
                <strong>Motivo:</strong> {cw.motivoDescarte}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Acciones ── */}
      {cw.estado !== 'convertida' && cw.estado !== 'descartada' && (
        <div style={{ padding: '0.625rem 1.125rem', borderTop: '1px solid #F3EDE5', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', background: '#FAFAF8' }}>
          {cw.estado === 'pendiente' && (
            <button
              onClick={() => onCambiarEstado(cw.id, 'vista')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.75rem', border: '1.5px solid #BFDBFE', background: '#EFF6FF', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#1D4ED8' }}
            >
              <Eye size={12} /> Marcar como vista
            </button>
          )}
          <button
            onClick={() => onConvertir(cw)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.875rem', border: 'none', background: '#7c4b2c', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}
          >
            <ArrowRight size={12} /> Convertir a cotización
          </button>
          {!descartando ? (
            <button
              onClick={() => setDescartando(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.75rem', border: '1.5px solid #FEE2E2', background: '#fff', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, color: '#DC2626' }}
            >
              <XCircle size={12} /> Descartar
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 200 }}>
              <input
                className="input"
                placeholder="Motivo del descarte (opcional)"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                style={{ flex: 1, fontSize: '0.78rem', padding: '0.35rem 0.5rem', height: 'auto' }}
              />
              <button
                onClick={() => { onCambiarEstado(cw.id, 'descartada', { motivoDescarte: motivo || undefined }); setDescartando(false); }}
                style={{ padding: '0.35rem 0.625rem', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
              >
                OK
              </button>
              <button onClick={() => setDescartando(false)} style={{ padding: '0.35rem 0.5rem', background: 'none', border: '1.5px solid #E5E7EB', borderRadius: '0.25rem', cursor: 'pointer', color: '#9CA3AF' }}>
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CotizacionesWebPage() {
  const [tab, setTab] = useState('pendiente');
  const [cotizaciones, setCotizaciones] = useState<CotizacionWeb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [convirtiendo, setConvirtiendo] = useState<CotizacionWeb | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCotizacionesWeb(tab);
      setCotizaciones(data);
    } catch {
      setError('No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCambiarEstado = async (
    id: number,
    estado: CotizacionWeb['estado'],
    extra?: { motivoDescarte?: string }
  ) => {
    try {
      await cambiarEstadoCotizacionWeb(id, estado, extra);
      cargar();
    } catch {
      alert('Error al actualizar el estado');
    }
  };

  // Contadores por estado para los tabs
  const counts = cotizaciones.reduce((acc, c) => {
    acc[c.estado] = (acc[c.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
            <Globe size={18} color="#7c4b2c" />
            <h1 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 'clamp(1.5rem, 3vw, 1.875rem)',
              fontWeight: 600,
              color: '#1F2937',
              margin: 0,
              lineHeight: 1.1,
            }}>
              Solicitudes del cotizador web
            </h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0 }}>
            Pedidos recibidos desde woodpallets.com.ar/cotizador
          </p>
        </div>
        <button
          onClick={cargar}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.875rem', border: '1.5px solid #E8E2DA', background: '#fff', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, color: '#374151' }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* ── Tabs ── */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #E8E2DA', minWidth: 'max-content' }}>
          {TABS.map(t => {
            const count = t.key === 'todas'
              ? cotizaciones.length
              : counts[t.key] || 0;
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#7c4b2c' : '#6B7280',
                  borderBottom: isActive ? '2px solid #7c4b2c' : '2px solid transparent',
                  marginBottom: -2,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  transition: 'color 0.15s',
                }}
              >
                {t.label}
                {(t.key !== 'todas' && count > 0) || (t.key === 'todas' && count > 0) ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 18, height: 18, padding: '0 5px',
                    background: t.key === 'pendiente' ? '#D97706' : isActive ? '#7c4b2c' : '#E5E7EB',
                    color: t.key === 'pendiente' || isActive ? '#fff' : '#6B7280',
                    borderRadius: 99,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}>
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contenido ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', fontSize: '0.9rem' }}>
          Cargando solicitudes…
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#DC2626', fontSize: '0.9rem' }}>
          {error}
        </div>
      ) : cotizaciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.5rem' }}>
          <Globe size={28} style={{ color: '#D1D5DB', display: 'block', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Sin solicitudes</p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: 0 }}>
            {tab === 'pendiente' ? 'No hay solicitudes pendientes.' : `No hay solicitudes con estado "${tab}".`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {cotizaciones.map(cw => (
            <TarjetaWeb
              key={cw.id}
              cw={cw}
              onCambiarEstado={handleCambiarEstado}
              onConvertir={setConvirtiendo}
            />
          ))}
        </div>
      )}

      {/* Modal convertir */}
      {convirtiendo && (
        <ModalConvertir
          cw={convirtiendo}
          onClose={() => setConvirtiendo(null)}
          onConverted={cargar}
        />
      )}
    </div>
  );
}
