import { useState } from 'react';
import {
  X, Globe, User, Phone, Mail, Package, Truck,
  Calendar, Leaf, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, Clock, Eye, Trash2, ExternalLink, AlertTriangle
} from 'lucide-react';
import type { CotizacionWeb, EstadoCotizacionWeb } from '../../types';
import { useCotizacionesWeb, useCambiarEstadoCotizacionWeb } from '../../hooks/useCotizacionesWeb';
import ConvertirWebModal from './ConvertirWebModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const formatFecha = (s: string) =>
  new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatHora = (s: string) =>
  new Date(s).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

const ESTADO_CONFIG: Record<EstadoCotizacionWeb, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pendiente:  { label: 'Pendiente',   bg: '#FEF3C7', color: '#92400E', icon: <Clock size={11} /> },
  vista:      { label: 'Vista',       bg: '#EFF6FF', color: '#1D4ED8', icon: <Eye size={11} /> },
  convertida: { label: 'Convertida',  bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={11} /> },
  descartada: { label: 'Descartada',  bg: '#F3F4F6', color: '#6B7280', icon: <XCircle size={11} /> },
};

const FILTROS = [
  { key: 'todas',     label: 'Todas' },
  { key: 'pendiente', label: 'Pendientes' },
  { key: 'vista',     label: 'Vistas' },
  { key: 'convertida',label: 'Convertidas' },
  { key: 'descartada',label: 'Descartadas' },
];

function EstadoBadge({ estado }: { estado: EstadoCotizacionWeb }) {
  const cfg = ESTADO_CONFIG[estado];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, borderRadius: 0 }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Fila / Detalle de una cotización web ────────────────────────────────────

function FilaCotizacionWeb({
  cw,
  onConvertir,
  onDescartar,
}: {
  cw: CotizacionWeb;
  onConvertir: (cw: CotizacionWeb) => void;
  onDescartar: (cw: CotizacionWeb) => void;
}) {
  const [expandida, setExpandida] = useState(false);

  return (
    <>
      <tr
        className="cursor-pointer transition-colors"
        style={{ background: expandida ? '#FAF5F0' : 'white' }}
        onMouseEnter={e => { if (!expandida) (e.currentTarget as HTMLElement).style.background = '#FDF6EE'; }}
        onMouseLeave={e => { if (!expandida) (e.currentTarget as HTMLElement).style.background = 'white'; }}
        onClick={() => setExpandida(e => !e)}
      >
        <td className="text-xs font-medium" style={{ color: '#9B7E6A' }}>#{cw.id}</td>
        <td>
          <p className="font-semibold text-sm" style={{ color: '#3c250f' }}>{cw.nombre}</p>
          {cw.empresa && <p className="text-xs" style={{ color: '#9B7E6A' }}>{cw.empresa}</p>}
        </td>
        <td className="text-sm" style={{ color: '#6B3A2A' }}>{cw.tipoPallet}</td>
        <td className="text-sm font-semibold" style={{ color: '#3c250f' }}>{cw.cantidad} u</td>
        <td className="text-sm" style={{ color: '#9B7E6A' }}>{formatFecha(cw.creadoEn)}</td>
        <td><EstadoBadge estado={cw.estado} /></td>
        <td>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {(cw.estado === 'pendiente' || cw.estado === 'vista') && (
              <>
                <button
                  onClick={() => onConvertir(cw)}
                  title="Convertir a cotización"
                  className="p-1.5 transition-colors"
                  style={{ color: '#16A34A' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F0FDF4')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  onClick={() => onDescartar(cw)}
                  title="Descartar"
                  className="p-1.5 transition-colors"
                  style={{ color: '#9B7E6A' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#DC2626'; (e.currentTarget as HTMLElement).style.background = '#FFF1F2'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#9B7E6A'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {cw.estado === 'convertida' && cw.cotizacion && (
              <a
                href={`/cotizaciones`}
                title="Ver cotización generada"
                className="p-1.5 transition-colors"
                style={{ color: '#2563EB' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button className="p-1" style={{ color: '#C4895A' }}>
              {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Detalle expandido */}
      {expandida && (
        <tr>
          <td colSpan={7} style={{ background: '#FAF5F0', borderTop: '1px solid #E8D5C4', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>

              {/* Datos de contacto */}
              <div style={{ border: '1px solid #E8D5C4', background: 'white', padding: '0.875rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c4b2c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
                  Datos de contacto
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={12} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#3c250f', fontWeight: 500 }}>
                      {cw.nombre}{cw.empresa ? ` · ${cw.empresa}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={12} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <a
                      href={`https://wa.me/549${cw.telefono.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '0.82rem', color: '#16A34A', textDecoration: 'none', fontWeight: 500 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {cw.telefono} 💬 WhatsApp
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={12} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <a href={`mailto:${cw.email}`}
                      style={{ fontSize: '0.82rem', color: '#2563EB', textDecoration: 'none' }}
                      onClick={e => e.stopPropagation()}>
                      {cw.email}
                    </a>
                  </div>
                </div>
              </div>

              {/* Datos del pedido */}
              <div style={{ border: '1px solid #E8D5C4', background: 'white', padding: '0.875rem' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c4b2c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
                  Datos del pedido
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={12} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#3c250f' }}>
                      {cw.tipoPallet} · <strong>{cw.cantidad} unidades</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={12} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#3c250f' }}>
                      Lo necesita para: <strong>{formatFecha(cw.fechaNecesidad || cw.creadoEn)}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Truck size={12} style={{ color: '#C4895A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.82rem', color: '#3c250f' }}>
                      {cw.tipoEntrega === 'envio' ? 'Envío a domicilio' : 'Retira en galpón'}
                      {cw.localidadEntrega && <span style={{ color: '#9B7E6A' }}> · {cw.localidadEntrega}</span>}
                    </span>
                  </div>
                  {cw.requiereSenasa && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Leaf size={12} style={{ color: '#16A34A', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: '#15803D', fontWeight: 600 }}>Requiere certificación SENASA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Observaciones — ancho completo */}
              {cw.observaciones && (
                <div style={{ gridColumn: '1 / -1', border: '1px solid #E8D5C4', background: 'white', padding: '0.75rem 0.875rem' }}>
                  <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#7c4b2c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                    Mensaje del cliente
                  </p>
                  <p style={{ fontSize: '0.82rem', color: '#3c250f', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                    {cw.observaciones}
                  </p>
                </div>
              )}

              {/* Meta — ancho completo */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', fontSize: '0.72rem', color: '#9B7E6A', paddingTop: '0.125rem' }}>
                <span>Recibida el {formatFecha(cw.creadoEn)} a las {formatHora(cw.creadoEn)}</span>
                {cw.propietarioAsignado && (
                  <span>Asignada a <strong style={{ color: '#7c4b2c' }}>{cw.propietarioAsignado.nombre}</strong></span>
                )}
                {cw.motivoDescarte && (
                  <span style={{ color: '#DC2626' }}>Descartada: {cw.motivoDescarte}</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Modal de descarte ────────────────────────────────────────────────────────

function DescartarModal({ cw, onClose }: { cw: CotizacionWeb; onClose: () => void }) {
  const cambiar = useCambiarEstadoCotizacionWeb();
  const [motivo, setMotivo] = useState('');

  const handleDescartar = async () => {
    await cambiar.mutateAsync({ id: cw.id, estado: 'descartada', motivoDescarte: motivo || undefined });
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(30,10,5,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: 400, border: '1px solid #E8D5C4', boxShadow: '0 20px 60px rgba(60,37,15,0.2)' }}>
        {/* Header */}
        <div style={{ background: '#7c4b2c', padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>Cotización web</p>
            <h2 style={{ margin: '2px 0 0', fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              Descartar solicitud
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.75rem', background: '#FFF1F2', border: '1px solid #FECDD3' }}>
            <AlertTriangle size={15} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: '0.82rem', color: '#9F1239', margin: 0 }}>
              La solicitud de <strong>{cw.nombre}</strong> se marcará como descartada y dejará de contar en el badge.
            </p>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#7c4b2c', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
              Motivo (opcional)
            </label>
            <textarea
              className="input"
              rows={2}
              placeholder="Spam, datos inválidos, ya fue atendido por otro canal..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              style={{ borderRadius: 0 }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
            <button onClick={onClose}
              style={{ padding: '0.5rem 1rem', border: '1px solid #E8D5C4', background: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, color: '#9B7E6A', borderRadius: 0 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
              Cancelar
            </button>
            <button
              onClick={handleDescartar}
              disabled={cambiar.isPending}
              style={{ padding: '0.5rem 1rem', border: 'none', background: '#DC2626', color: '#fff', cursor: cambiar.isPending ? 'not-allowed' : 'pointer', fontSize: '0.82rem', fontWeight: 600, borderRadius: 0, opacity: cambiar.isPending ? 0.7 : 1 }}
            >
              {cambiar.isPending ? 'Descartando...' : 'Descartar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal principal ──────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function CotizacionesWebModal({ onClose }: Props) {
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const { data: cotizaciones = [], isLoading } = useCotizacionesWeb(filtroEstado !== 'todas' ? filtroEstado : undefined);
  const [cwConvertir, setCwConvertir] = useState<CotizacionWeb | null>(null);
  const [cwDescartar, setCwDescartar] = useState<CotizacionWeb | null>(null);

  const pendientes = cotizaciones.filter(c => c.estado === 'pendiente' || c.estado === 'vista').length;

  return (
    <>
      {cwConvertir && (
        <ConvertirWebModal
          cotizacion={cwConvertir}
          onClose={() => setCwConvertir(null)}
          onSuccess={() => setCwConvertir(null)}
        />
      )}
      {cwDescartar && (
        <DescartarModal
          cw={cwDescartar}
          onClose={() => setCwDescartar(null)}
        />
      )}

      <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(30,10,5,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ background: '#fff', width: '100%', maxWidth: '72rem', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid #E8D5C4', boxShadow: '0 20px 60px rgba(60,37,15,0.25)' }}>

          {/* Header */}
          <div style={{ background: '#7c4b2c', padding: '1rem 1.5rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Globe size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>woodpallets.com.ar</p>
                <h2 style={{ margin: '2px 0 0', fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                  Cotizaciones desde la web
                  {pendientes > 0 && (
                    <span style={{ marginLeft: 8, fontFamily: 'Inter, sans-serif', fontStyle: 'normal', fontSize: '0.7rem', fontWeight: 700, background: '#D97706', color: '#fff', padding: '0.15rem 0.5rem', letterSpacing: '0.04em' }}>
                      {pendientes} sin procesar
                    </span>
                  )}
                </h2>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', padding: 4 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#FDFAF7' }}>

            {/* Filtros */}
            <div style={{ display: 'flex', border: '1px solid #E8D5C4', overflow: 'hidden', alignSelf: 'flex-start' }}>
              {FILTROS.map((f, i) => (
                <button
                  key={f.key}
                  onClick={() => setFiltroEstado(f.key)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    background: filtroEstado === f.key ? '#7c4b2c' : '#fff',
                    color: filtroEstado === f.key ? '#fff' : '#9B7E6A',
                    border: 'none',
                    borderLeft: i > 0 ? '1px solid #E8D5C4' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Tabla */}
            {isLoading ? (
              <LoadingSpinner text="Cargando solicitudes web..." />
            ) : cotizaciones.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', border: '1px solid #E8D5C4' }}>
                <Globe size={36} style={{ color: '#E8D5C4', margin: '0 auto 12px', display: 'block' }} />
                <p style={{ fontSize: '0.875rem', color: '#9B7E6A', margin: 0 }}>
                  No hay solicitudes web{filtroEstado !== 'todas' ? ` con estado "${filtroEstado}"` : ''}
                </p>
              </div>
            ) : (
              <div style={{ border: '1px solid #E8D5C4', overflow: 'hidden', background: 'white' }}>
                <table className="table">
                  <thead>
                    <tr style={{ background: '#FAF5F0', borderBottom: '1.5px solid #E8D5C4' }}>
                      <th style={{ color: '#7c4b2c' }}>#</th>
                      <th style={{ color: '#7c4b2c' }}>Nombre / Empresa</th>
                      <th style={{ color: '#7c4b2c' }}>Tipo pallet</th>
                      <th style={{ color: '#7c4b2c' }}>Cantidad</th>
                      <th style={{ color: '#7c4b2c' }}>Fecha</th>
                      <th style={{ color: '#7c4b2c' }}>Estado</th>
                      <th style={{ color: '#7c4b2c' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizaciones.map(cw => (
                      <FilaCotizacionWeb
                        key={cw.id}
                        cw={cw}
                        onConvertir={setCwConvertir}
                        onDescartar={setCwDescartar}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
