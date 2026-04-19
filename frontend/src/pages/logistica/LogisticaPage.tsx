import { useState } from 'react';
import { Plus, Search, Truck, Calendar, Clock, CheckCircle, Check, X } from 'lucide-react';
import { useLogisticas, useEntregasHoy } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import { useSolicitudesLogistica, useResponderSolicitudLogistica } from '../../hooks/useSolicitudesLogistica';
import NuevaLogistica from './NuevaLogistica';
import EntregaCard from './EntregaCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import type { SolicitudLogistica } from '../../types';

interface LogisticaConVenta {
  id: number;
  ventaId: number;
  estadoEntrega: 'pendiente' | 'en_camino' | 'entregado' | 'con_problema';
  confTransportista: boolean;
  confCliente: boolean;
  costoFlete?: number;
  nombreTransportista?: string;
  telefonoTransp?: string;
  fechaRetiroGalpon?: string;
  horaRetiro?: string;
  horaEstimadaEntrega?: string;
  observaciones?: string;
  venta?: {
    cliente?: { razonSocial: string; direccionEntrega?: string; localidad?: string };
    detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
    usuario?: { nombre: string; apellido: string; rol: string };
  };
}

export default function LogisticaPage() {
  const { data: logisticas, isLoading, isError } = useLogisticas() as {
    data: LogisticaConVenta[] | undefined;
    isLoading: boolean;
    isError: boolean;
  };
  const { data: entregasHoy } = useEntregasHoy() as {
    data: LogisticaConVenta[] | undefined;
  };
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState<'mi' | 'juan'>('mi');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showNueva, setShowNueva] = useState(false);
  const [respuestaSolicitudId, setRespuestaSolicitudId] = useState<number | null>(null);
  const [notasRespuesta, setNotasRespuesta] = useState('');

  const { data: solicitudes } = useSolicitudesLogistica();
  const responder = useResponderSolicitudLogistica();

  const estadoFiltros = [
    { key: 'todos',        label: 'Todas' },
    { key: 'pendiente',    label: 'Pendientes' },
    { key: 'en_camino',    label: 'En camino' },
    { key: 'entregado',    label: 'Entregadas' },
    { key: 'con_problema', label: 'Con problema' },
  ];

  const filtradas = logisticas?.filter(l => {
    const matchBusqueda =
      l.venta?.cliente?.razonSocial?.toLowerCase().includes(busqueda.toLowerCase()) ||
      `#${l.ventaId}`.includes(busqueda);
    const matchEstado = filtroEstado === 'todos' || l.estadoEntrega === filtroEstado;
    // Vista: 'mi' => solo las logisticas del usuario; 'juan' => las de Juan Cruz; 'todas' => todas (solo Carlos)
    let matchVista = true;
    if (vista === 'mi') {
      matchVista = (l.venta?.usuario?.nombre === usuario?.nombre) && (l.venta?.usuario?.apellido === usuario?.apellido);
    } else if (vista === 'juan') {
      matchVista = l.venta?.usuario?.rol === 'propietario_juancruz';
    }
    return matchBusqueda && matchEstado && matchVista;
  });

  const pendientes  = logisticas?.filter(l => l.estadoEntrega === 'pendiente').length ?? 0;
  const enCamino    = logisticas?.filter(l => l.estadoEntrega === 'en_camino').length ?? 0;
  const entregadas  = logisticas?.filter(l => l.estadoEntrega === 'entregado').length ?? 0;

  if (isLoading) {
    return (
      <div className="p-8">
        <LoadingSpinner text="Cargando logística..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8">
        <ErrorMessage message="No se pudo cargar la logística." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Logística</h1>
          <p className="text-sm text-gray-500 mt-1">
            {esCarlos
              ? 'Coordinación centralizada de todas las entregas'
              : 'Estado de las entregas de tus ventas'
            }
          </p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white"
        >
          <Plus size={16} />
          {esCarlos ? 'Registrar logística' : 'Pedir entrega'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-kpi">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
              <Clock size={18} style={{ color: '#C4895A' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>{pendientes}</p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="card-kpi">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
              <Truck size={18} style={{ color: '#6B3A2A' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>{enCamino}</p>
              <p className="text-xs text-gray-500">En camino</p>
            </div>
          </div>
        </div>

        <div className="card-kpi">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
              <CheckCircle size={18} style={{ color: '#C4895A' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>{entregadas}</p>
              <p className="text-xs text-gray-500">Entregadas</p>
            </div>
          </div>
        </div>

        <div className="card-kpi">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
              <Calendar size={18} style={{ color: '#6B3A2A' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>{entregasHoy?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Hoy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entregas del día */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} style={{ color: '#6B3A2A' }} />
          <h2 className="text-sm font-semibold" style={{ color: '#6B3A2A' }}>
            Entregas programadas para hoy {entregasHoy && entregasHoy.length > 0 ? `(${entregasHoy.length})` : ''}
          </h2>
        </div>
        {entregasHoy && entregasHoy.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entregasHoy.map(l => (
              <EntregaCard key={l.id} logistica={l} compact />
            ))}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center justify-center text-center" style={{ background: '#F9FAFB', borderRadius: '0.25rem', border: '1px solid #E5E7EB' }}>
            <Calendar size={20} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Sin entregas registradas para hoy</p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        {/* Fila 1: buscador + vista */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente o número de venta..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-1 p-1" style={{ background: '#fff', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}>
            <button
              onClick={() => { setVista('mi'); setFiltroEstado('todos'); }}
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all"
              style={vista === 'mi'
                ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                : { borderRadius: '0.25rem', color: '#4B5563' }
              }
            >
              Mi logística
            </button>
            {esCarlos && (
              <button
                onClick={() => { setVista('juan'); setFiltroEstado('todos'); }}
                className="px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all"
                style={vista === 'juan'
                  ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                  : { borderRadius: '0.25rem', color: '#4B5563' }
                }
              >
                Juan
              </button>
            )}
          </div>
        </div>

        {/* Fila 2: filtro de estado (aplica sobre la vista activa) */}
        <div className="flex gap-1 p-1 overflow-x-auto" style={{ background: '#fff', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}>
          {estadoFiltros.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all"
              style={filtroEstado === f.key
                ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                : { borderRadius: '0.25rem', color: '#6B7280' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de entregas */}
      {((vista === 'juan' && esCarlos) || (!esCarlos)) && solicitudes && solicitudes.length > 0 && (
        <div className="bg-white border border-gray-200 overflow-hidden" style={{ borderRadius: '0.25rem' }}>
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' }}>
            <h2 className="text-sm font-semibold text-white">
              {esCarlos ? 'Solicitudes de Juan Cruz' : 'Mis solicitudes a Carlos'}
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(solicitudes as SolicitudLogistica[]).map((s) => (
              <div key={s.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.ventaId && (
                        <span className="text-xs font-medium px-2 py-0.5 text-white" style={{ background: '#6B3A2A', borderRadius: '0.25rem' }}>
                          Venta #{s.ventaId}
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2 py-0.5"
                        style={{
                          borderRadius: '0.25rem',
                          background: s.estado === 'pendiente' ? '#FEF3E2' : s.estado === 'aceptada' ? '#DCFCE7' : '#FEE2E2',
                          color: s.estado === 'pendiente' ? '#C4895A' : s.estado === 'aceptada' ? '#15803D' : '#DC2626',
                        }}
                      >
                        {s.estado === 'pendiente' ? 'Pendiente' : s.estado === 'aceptada' ? 'Aceptada' : 'Rechazada'}
                      </span>
                    </div>
                    <div className="mt-2 space-y-0.5 text-sm text-gray-600">
                      {s.ubicacionEntrega && <p><span className="font-medium">Ubicación:</span> {s.ubicacionEntrega}</p>}
                      {s.fechaEntrega && <p><span className="font-medium">Fecha entrega:</span> {new Date(s.fechaEntrega).toLocaleDateString('es-AR')}</p>}
                      {s.cantidadUnidades && <p><span className="font-medium">Unidades:</span> {s.cantidadUnidades}</p>}
                      {s.notas && <p className="text-gray-500 text-xs mt-1">{s.notas}</p>}
                    </div>
                    {s.notasRespuesta && (
                      <p className="mt-1 text-xs text-gray-500"><span className="font-medium">Resp:</span> {s.notasRespuesta}</p>
                    )}
                  </div>
                  {esCarlos && s.estado === 'pendiente' && (
                    <div className="flex gap-2 shrink-0">
                      {respuestaSolicitudId === s.id ? (
                        <div className="flex flex-col gap-2 w-52">
                          <textarea
                            value={notasRespuesta}
                            onChange={(e) => setNotasRespuesta(e.target.value)}
                            placeholder="Notas opcionales..."
                            rows={2}
                            className="text-xs border border-gray-200 px-2 py-1 resize-none focus:outline-none"
                            style={{ borderRadius: '0.25rem' }}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                responder.mutate({ id: s.id, estado: 'aceptada', notasRespuesta });
                                setRespuestaSolicitudId(null);
                                setNotasRespuesta('');
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium text-white"
                              style={{ background: '#15803D', borderRadius: '0.25rem' }}
                            >
                              <Check size={12} /> Aceptar
                            </button>
                            <button
                              onClick={() => {
                                responder.mutate({ id: s.id, estado: 'rechazada', notasRespuesta });
                                setRespuestaSolicitudId(null);
                                setNotasRespuesta('');
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1 text-xs font-medium text-white"
                              style={{ background: '#DC2626', borderRadius: '0.25rem' }}
                            >
                              <X size={12} /> Rechazar
                            </button>
                          </div>
                          <button
                            onClick={() => { setRespuestaSolicitudId(null); setNotasRespuesta(''); }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRespuestaSolicitudId(s.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white"
                          style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
                        >
                          Responder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!filtradas?.length && !(((vista === 'juan' && esCarlos) || (!esCarlos)) && solicitudes && solicitudes.length > 0) ? (
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Truck size={24} style={{ color: '#6B3A2A' }} />
          </div>
          <p className="titulo-card" style={{ color: '#6B3A2A' }}>Sin entregas registradas</p>
          <p className="text-xs text-gray-400 mt-1">
            {esCarlos
              ? 'Coordiná la primera entrega con el botón de arriba'
              : 'Las entregas aparecen cuando Carlos las coordina'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtradas.map(l => (
            <EntregaCard key={l.id} logistica={l} />
          ))}
        </div>
      )}

      {showNueva && (
        <NuevaLogistica
          onClose={() => setShowNueva(false)}
          onSuccess={() => setShowNueva(false)}
        />
      )}
    </div>
  );
}
