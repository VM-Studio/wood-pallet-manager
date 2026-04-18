import { useState } from 'react';
import {
  Plus, MessageCircle, ArrowRight, CheckCircle,
  XCircle, Search, FileText
} from 'lucide-react';
import { clsx } from 'clsx';
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
  { key: 'enviada',        label: 'Enviadas' },
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
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  if (isLoading) return <LoadingSpinner text="Cargando cotizaciones..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar las cotizaciones." />;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cotizaciones</h1>
          <p className="page-subtitle">{cotizaciones?.length || 0} cotizaciones en total</p>
        </div>
        <button onClick={() => setShowNueva(true)} className="btn-primary">
          <Plus size={18} /> Nueva cotización
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
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
          {estadoFiltros.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                filtroEstado === f.key
                  ? 'bg-[#16A34A] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla o empty state */}
      {!filtradas?.length ? (
        <div className="empty-state">
          <div className="empty-icon"><FileText size={24} /></div>
          <p className="text-sm font-semibold text-gray-700">Sin cotizaciones</p>
          <p className="text-sm text-gray-400 mt-1">Creá la primera con el botón de arriba</p>
        </div>
      ) : (
        <div className="table-container">
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
                  <td className="font-semibold text-gray-500 text-xs">#{c.id}</td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{c.cliente?.razonSocial}</p>
                    {c.incluyeFlete && <p className="text-xs text-gray-400">🚛 Con flete</p>}
                    {c.requiereSenasa && <p className="text-xs text-gray-400">🌿 SENASA</p>}
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setWhatsappId(c.id)}
                        className="btn-icon w-8 h-8 text-green-500 hover:bg-green-50"
                        title="Texto WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                      {(c.estado === 'enviada' || c.estado === 'en_seguimiento') && (
                        <button
                          onClick={() => actualizarEstado.mutate({ id: c.id, estado: 'aceptada' })}
                          className="btn-icon w-8 h-8 text-[#16A34A] hover:bg-green-50"
                          title="Marcar aceptada"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {c.estado === 'aceptada' && (
                        <button
                          onClick={() => setConvertirId(c.id)}
                          className="btn-icon w-8 h-8 text-blue-500 hover:bg-blue-50"
                          title="Convertir a venta"
                        >
                          <ArrowRight size={15} />
                        </button>
                      )}
                      {(c.estado === 'enviada' || c.estado === 'en_seguimiento') && (
                        <button
                          onClick={() => actualizarEstado.mutate({ id: c.id, estado: 'rechazada' })}
                          className="btn-icon w-8 h-8 text-red-400 hover:bg-red-50"
                          title="Marcar rechazada"
                        >
                          <XCircle size={15} />
                        </button>
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
