import { useState } from 'react';
import {
  Plus, MessageCircle,
  CheckCircle, XCircle, Search, FileText, Truck, Leaf
} from 'lucide-react';
import { useCotizaciones, useActualizarEstadoCotizacion } from '../../hooks/useCotizaciones';
import NuevaCotizacion from './NuevaCotizacion';
import WhatsAppModal from './WhatsAppModal';
import ConvertirVentaModal from './ConvertirVentaModal';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const estadoFiltros = [
  { key: 'todos',          label: 'Todas' },
  { key: 'en_seguimiento', label: 'Seguimiento' },
  { key: 'aceptada',       label: 'Aceptadas' },
  { key: 'rechazada',      label: 'Rechazadas' },
  { key: 'perdida',        label: 'Perdidas' },
];

export default function CotizacionesPage() {
  const { data: cotizaciones, isLoading, error } = useCotizaciones();
  const actualizarEstado = useActualizarEstadoCotizacion();
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showNueva, setShowNueva] = useState(false);
  const [whatsappId, setWhatsappId] = useState<number | null>(null);
  const [convertirId, setConvertirId] = useState<number | null>(null);

  const filtradas = cotizaciones?.filter(c => {
    const matchBusqueda =
      c.cliente?.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      `#${c.id}`.includes(busqueda);
    const matchEstado =
      filtroEstado === 'todos' ||
      (filtroEstado === 'en_seguimiento'
        ? c.estado === 'enviada' || c.estado === 'en_seguimiento'
        : c.estado === filtroEstado);
    return matchBusqueda && matchEstado;
  });

  if (isLoading) return <LoadingSpinner text="Cargando cotizaciones..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar las cotizaciones." />;

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Cotizaciones</h1>
          <p className="text-sm text-gray-600 mt-1">{cotizaciones?.length || 0} cotizaciones en total</p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <Plus size={16} /> Nueva cotización
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o número..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="flex border border-gray-200 overflow-hidden" style={{ borderRadius: '0.25rem' }}>
          {estadoFiltros.map((f, i) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                background: filtroEstado === f.key
                  ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                  : '#fff',
                color: filtroEstado === f.key ? '#fff' : '#6B7280',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla o empty state */}
      {!filtradas?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mx-auto mb-3"
            style={{ borderRadius: '0.25rem' }}>
            <FileText size={22} className="text-gray-400" />
          </div>
          <p className="titulo-card">Sin cotizaciones</p>
          <p className="text-xs text-gray-400 mt-1">
            {busqueda ? 'Probá con otro término de búsqueda' : 'Creá la primera con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
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
              {filtradas.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold text-gray-400 text-xs">#{c.id}</td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{c.cliente?.razonSocial}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {c.incluyeFlete && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Truck size={11} /> Con flete
                        </span>
                      )}
                      {c.requiereSenasa && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Leaf size={11} /> SENASA
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      {c.detalles?.map(d => (
                        <p key={d.id} className="text-xs text-gray-600">
                          {d.producto?.nombre} — {d.cantidad} u
                        </p>
                      ))}
                    </div>
                  </td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{formatPesos(c.totalConIva || 0)}</p>
                    <p className="text-xs text-gray-400">con IVA</p>
                  </td>
                  <td><EstadoBadge estado={c.estado} /></td>
                  <td className="text-xs text-gray-400">{formatFecha(c.fechaCotizacion)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setWhatsappId(c.id)}
                        className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                        title="Texto WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                      {(c.estado === 'enviada' || c.estado === 'en_seguimiento') && (
                        <>
                          <button
                            onClick={() => setConvertirId(c.id)}
                            title="Aceptar y convertir a venta"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '1.875rem', height: '1.875rem', borderRadius: '0.25rem',
                              background: '#F0FDF4', border: '1.5px solid #86EFAC',
                              color: '#16A34A', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DCFCE7'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F0FDF4'; }}
                          >
                            <CheckCircle size={15} />
                          </button>
                          <button
                            onClick={() => actualizarEstado.mutate({ id: c.id, estado: 'rechazada' })}
                            title="Rechazar cotización"
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '1.875rem', height: '1.875rem', borderRadius: '0.25rem',
                              background: '#FEF2F2', border: '1.5px solid #FCA5A5',
                              color: '#DC2626', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modales */}
      {showNueva && (
        <NuevaCotizacion
          onClose={() => setShowNueva(false)}
          onSuccess={(id) => { setWhatsappId(id); }}
        />
      )}
      {whatsappId !== null && (
        <WhatsAppModal
          cotizacionId={whatsappId}
          onClose={() => setWhatsappId(null)}
        />
      )}
      {convertirId !== null && (
        <ConvertirVentaModal
          cotizacionId={convertirId}
          onClose={() => setConvertirId(null)}
          onSuccess={() => setConvertirId(null)}
        />
      )}
    </div>
  );
}
