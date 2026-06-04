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
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => setExpandida(e => !e)}
      >
        <td className="text-xs text-gray-400 font-medium">#{cw.id}</td>
        <td>
          <p className="font-medium text-gray-900 text-sm">{cw.nombre}</p>
          {cw.empresa && <p className="text-xs text-gray-400">{cw.empresa}</p>}
        </td>
        <td className="text-sm text-gray-700">{cw.tipoPallet}</td>
        <td className="text-sm font-semibold text-gray-800">{cw.cantidad} u</td>
        <td className="text-sm text-gray-600">{formatFecha(cw.creadoEn)}</td>
        <td><EstadoBadge estado={cw.estado} /></td>
        <td>
          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            {(cw.estado === 'pendiente' || cw.estado === 'vista') && (
              <>
                <button
                  onClick={() => onConvertir(cw)}
                  title="Convertir a cotización"
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                >
                  <CheckCircle2 size={15} />
                </button>
                <button
                  onClick={() => onDescartar(cw)}
                  title="Descartar"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {cw.estado === 'convertida' && cw.cotizacion && (
              <a
                href={`/cotizaciones`}
                title="Ver cotización generada"
                className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button className="p-1 text-gray-300">
              {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </td>
      </tr>

      {/* Detalle expandido */}
      {expandida && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-4 py-4 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">

              {/* Columna izquierda: datos de contacto */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Datos de contacto</p>
                <div className="flex items-center gap-2 text-gray-700">
                  <User size={13} className="text-gray-400 shrink-0" />
                  {cw.nombre}{cw.empresa ? ` · ${cw.empresa}` : ''}
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-gray-400 shrink-0" />
                  <a
                    href={`https://wa.me/549${cw.telefono.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    {cw.telefono} 💬 WhatsApp
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-gray-400 shrink-0" />
                  <a href={`mailto:${cw.email}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                    {cw.email}
                  </a>
                </div>
              </div>

              {/* Columna derecha: datos del pedido */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Datos del pedido</p>
                <div className="flex items-center gap-2 text-gray-700">
                  <Package size={13} className="text-gray-400 shrink-0" />
                  {cw.tipoPallet} · <span className="font-semibold">{cw.cantidad} unidades</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  Lo necesita para: <span className="font-medium">{formatFecha(cw.fechaNecesidad || cw.creadoEn)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Truck size={13} className="text-gray-400 shrink-0" />
                  {cw.tipoEntrega === 'envio' ? 'Envío a domicilio' : 'Retira en galpón'}
                  {cw.localidadEntrega && ` · ${cw.localidadEntrega}`}
                </div>
                {cw.requiereSenasa && (
                  <div className="flex items-center gap-2 text-amber-600 font-medium">
                    <Leaf size={13} className="shrink-0" /> Requiere certificación SENASA
                  </div>
                )}
              </div>

              {/* Observaciones */}
              {cw.observaciones && (
                <div className="md:col-span-2 bg-white rounded-lg px-3 py-2 border border-gray-100 text-gray-600 text-xs">
                  <span className="font-semibold text-gray-500">Observaciones: </span>{cw.observaciones}
                </div>
              )}

              {/* Meta */}
              <div className="md:col-span-2 text-xs text-gray-400 flex items-center gap-4">
                <span>Recibida el {formatFecha(cw.creadoEn)} a las {formatHora(cw.creadoEn)}</span>
                {cw.propietarioAsignado && (
                  <span>Asignada a <strong>{cw.propietarioAsignado.nombre}</strong></span>
                )}
                {cw.motivoDescarte && (
                  <span className="text-red-400">Descartada: {cw.motivoDescarte}</span>
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
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal max-w-sm animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Descartar cotización web</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body space-y-4">
          <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3 border border-red-100">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Esta solicitud de <strong>{cw.nombre}</strong> se marcará como descartada y dejará de contar en el badge.
            </p>
          </div>
          <div>
            <label className="label">Motivo (opcional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Spam, datos inválidos, ya fue atendido por otro canal..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleDescartar}
              disabled={cambiar.isPending}
              className="btn-primary bg-red-600 hover:bg-red-700"
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

      <div className="modal-overlay" style={{ zIndex: 50 }}>
        <div className="modal max-w-5xl animate-slide-up" style={{ maxHeight: '92vh', overflowY: 'auto' }}>

          {/* Header */}
          <div className="modal-header">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Globe size={18} className="text-blue-500" />
              </div>
              <div>
                <h2 className="modal-title">Cotizaciones desde woodpallets.com.ar</h2>
                {pendientes > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-0.5">
                    {pendientes} sin procesar
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="btn-icon"><X size={18} /></button>
          </div>

          <div className="modal-body space-y-4">

            {/* Filtros */}
            <div className="flex border border-gray-200 overflow-hidden rounded">
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
                    color: filtroEstado === f.key ? '#fff' : '#6B7280',
                    border: 'none',
                    borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
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
              <div className="text-center py-12">
                <Globe size={36} className="text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No hay solicitudes web{filtroEstado !== 'todas' ? ` con estado "${filtroEstado}"` : ''}</p>
              </div>
            ) : (
              <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre / Empresa</th>
                      <th>Tipo pallet</th>
                      <th>Cantidad</th>
                      <th>Fecha</th>
                      <th>Estado</th>
                      <th>Acciones</th>
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

            {/* Info instrucciones para la web */}

          </div>
        </div>
      </div>
    </>
  );
}
