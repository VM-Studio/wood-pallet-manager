import { useState } from 'react';
import { Plus, Search, Truck, Calendar, Clock, CheckCircle, Check, X, AlertCircle } from 'lucide-react';
import { useLogisticasPorRol, useEntregasHoy, useConsultarLogistica, useResponderConsultaLogistica, useConfirmarLogisticaCarlos } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import NuevaLogistica from './NuevaLogistica';
import EntregaCard from './EntregaCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import DropdownVista from '../../components/ui/DropdownVista';

type EstadoConsulta = 'no_aplica' | 'pendiente_consulta' | 'consultada' | 'aceptada' | 'rechazada';
type EstadoEntrega = 'pendiente' | 'en_camino' | 'entregado' | 'con_problema';

interface LogisticaRow {
  id: number;
  ventaId: number;
  estadoEntrega: EstadoEntrega;
  estadoConsulta: EstadoConsulta;
  lugarEntrega?: string;
  confTransportista: boolean;
  confCliente: boolean;
  costoFlete?: number;
  nombreTransportista?: string;
  telefonoTransp?: string;
  fechaRetiroGalpon?: string;
  horaRetiro?: string;
  horaEstimadaEntrega?: string;
  observaciones?: string;
  consultadaPor?: { nombre: string; apellido: string };
  venta?: {
    cliente?: { razonSocial: string; direccionEntrega?: string; localidad?: string };
    detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
    usuario?: { nombre: string; apellido: string; rol: string };
    tipoEntrega?: string;
  };
  registradoPor?: { nombre: string; apellido: string };
}

const estadoConsultaBadge: Record<EstadoConsulta, { label: string; bg: string; color: string }> = {
  no_aplica:          { label: 'Sin consulta',       bg: '#F3F4F6', color: '#6B7280' },
  pendiente_consulta: { label: 'Esperando a Carlos', bg: '#FEF3E2', color: '#C4895A' },
  consultada:         { label: 'Consultado',         bg: '#EFF6FF', color: '#2563EB' },
  aceptada:           { label: 'Aceptado',           bg: '#DCFCE7', color: '#15803D' },
  rechazada:          { label: 'Rechazado',          bg: '#FEE2E2', color: '#DC2626' },
};

export default function LogisticaPage() {
  const { data: logisticas, isLoading, isError } = useLogisticasPorRol() as { data: LogisticaRow[] | undefined; isLoading: boolean; isError: boolean };
  const { data: entregasHoy } = useEntregasHoy() as { data: LogisticaRow[] | undefined };
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showNueva, setShowNueva] = useState(false);

  // Confirmación logística (Carlos)
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [confirmForm, setConfirmForm] = useState({ nombreTransportista: '', telefonoTransp: '', fechaRetiroGalpon: '', costoFlete: '' });

  // Responder consulta (Carlos)
  const [respondiendoId, setRespondiendoId] = useState<number | null>(null);
  const [notasRespuesta, setNotasRespuesta] = useState('');

  const consultarMutation = useConsultarLogistica();
  const responderMutation = useResponderConsultaLogistica();
  const confirmarMutation = useConfirmarLogisticaCarlos();

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
    return matchBusqueda && matchEstado;
  });

  const pendientes = logisticas?.filter(l => l.estadoEntrega === 'pendiente').length ?? 0;
  const enCamino   = logisticas?.filter(l => l.estadoEntrega === 'en_camino').length ?? 0;
  const entregadas = logisticas?.filter(l => l.estadoEntrega === 'entregado').length ?? 0;
  const consultas  = logisticas?.filter(l => l.estadoConsulta === 'pendiente_consulta').length ?? 0;

  if (isLoading) return <div className="p-8"><LoadingSpinner text="Cargando logística..." /></div>;
  if (isError)   return <div className="p-8"><ErrorMessage message="No se pudo cargar la logística." /></div>;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Logística</h1>
          <p className="text-sm text-gray-500 mt-1">
            {esCarlos ? 'Coordinación centralizada de todas las entregas' : 'Estado de las entregas de tus ventas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownVista />
          <button onClick={() => setShowNueva(true)}
            style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white">
            <Plus size={16} />
            {esCarlos ? 'Registrar logística' : 'Pedir entrega'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className={`grid ${esCarlos ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'} gap-4`}>
        {[
          { icon: Clock, color: '#C4895A', bg: '#FEF3E2', val: pendientes, label: 'Pendientes' },
          { icon: Truck, color: '#6B3A2A', bg: '#F3EDE8', val: enCamino,   label: 'En camino' },
          { icon: CheckCircle, color: '#C4895A', bg: '#FEF3E2', val: entregadas, label: 'Entregadas' },
          ...(esCarlos ? [{ icon: Calendar, color: '#6B3A2A', bg: '#F3EDE8', val: entregasHoy?.length ?? 0, label: 'Hoy' }] : []),
        ].map(({ icon: Icon, color, bg, val, label }) => (
          <div key={label} className="card-kpi">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: bg, borderRadius: '0.25rem' }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: '#6B3A2A' }}>{val}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Banner consultas pendientes para Carlos */}
      {esCarlos && consultas > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-2">
          <AlertCircle size={16} className="text-orange-600 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">
            Tenés {consultas} consulta{consultas > 1 ? 's' : ''} de logística pendiente{consultas > 1 ? 's' : ''} de Juan Cruz.
          </p>
        </div>
      )}

      {/* Entregas de hoy — solo Carlos */}
      {esCarlos && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} style={{ color: '#6B3A2A' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#6B3A2A' }}>
              Entregas programadas para hoy {entregasHoy && entregasHoy.length > 0 ? `(${entregasHoy.length})` : ''}
            </h2>
          </div>
          {entregasHoy && entregasHoy.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entregasHoy.map(l => <EntregaCard key={l.id} logistica={l} compact />)}
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center justify-center text-center" style={{ background: '#F9FAFB', borderRadius: '0.25rem', border: '1px solid #E5E7EB' }}>
              <Calendar size={20} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Sin entregas registradas para hoy</p>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar por cliente o número de venta..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="input-field pl-10 w-full" />
        </div>
        <div className="flex gap-1 p-1 overflow-x-auto" style={{ background: '#fff', borderRadius: '0.25rem', border: '1px solid #e5e7eb' }}>
          {estadoFiltros.map(f => (
            <button key={f.key} onClick={() => setFiltroEstado(f.key)}
              className="px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all"
              style={filtroEstado === f.key
                ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                : { borderRadius: '0.25rem', color: '#6B7280' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {!filtradas?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 flex items-center justify-center mb-4" style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Truck size={24} style={{ color: '#6B3A2A' }} />
          </div>
          <p className="titulo-card" style={{ color: '#6B3A2A' }}>Sin entregas registradas</p>
          <p className="text-xs text-gray-400 mt-1">
            {esCarlos ? 'Coordiná la primera entrega con el botón de arriba' : 'Las entregas aparecen aquí cuando Carlos las coordine'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(l => {
            const badge = estadoConsultaBadge[l.estadoConsulta ?? 'no_aplica'];
            return (
              <div key={l.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4">
                  {/* Cabecera de la card */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 text-white" style={{ background: '#6B3A2A', borderRadius: '0.25rem' }}>
                          Venta #{l.ventaId}
                        </span>
                        {l.estadoConsulta && l.estadoConsulta !== 'no_aplica' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        )}
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: l.estadoEntrega === 'pendiente' ? '#FEF3E2' : l.estadoEntrega === 'en_camino' ? '#EFF6FF' : l.estadoEntrega === 'entregado' ? '#DCFCE7' : '#FEE2E2',
                            color: l.estadoEntrega === 'pendiente' ? '#C4895A' : l.estadoEntrega === 'en_camino' ? '#2563EB' : l.estadoEntrega === 'entregado' ? '#15803D' : '#DC2626',
                          }}>
                          {l.estadoEntrega === 'pendiente' ? 'Pendiente' : l.estadoEntrega === 'en_camino' ? 'En camino' : l.estadoEntrega === 'entregado' ? 'Entregado' : 'Con problema'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-1">{l.venta?.cliente?.razonSocial ?? '—'}</p>
                      {l.lugarEntrega && <p className="text-xs text-gray-500 mt-0.5">📍 {l.lugarEntrega}</p>}
                      {l.nombreTransportista && <p className="text-xs text-gray-500">🚚 {l.nombreTransportista} {l.telefonoTransp ? `· ${l.telefonoTransp}` : ''}</p>}
                      {esCarlos && l.venta?.usuario && (
                        <p className="text-xs text-gray-400 mt-0.5">Vendedor: {l.venta.usuario.nombre} {l.venta.usuario.apellido}</p>
                      )}
                    </div>
                  </div>

                  {/* Acciones por rol y estadoConsulta */}
                  <div className="flex gap-2 flex-wrap mt-2">
                    {/* JuanCruz: puede consultar a Carlos si no consultó aún */}
                    {!esCarlos && l.venta?.tipoEntrega === 'envio_woodpallet' && l.estadoConsulta === 'no_aplica' && (
                      <button
                        onClick={() => consultarMutation.mutate(l.ventaId)}
                        disabled={consultarMutation.isPending}
                        className="px-3 py-1.5 text-xs font-medium text-white flex items-center gap-1"
                        style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}>
                        Consultar a Carlos
                      </button>
                    )}

                    {/* Carlos: responder consulta pendiente */}
                    {esCarlos && l.estadoConsulta === 'pendiente_consulta' && (
                      respondiendoId === l.id ? (
                        <div className="flex flex-col gap-2 w-full">
                          <textarea value={notasRespuesta} onChange={e => setNotasRespuesta(e.target.value)}
                            placeholder="Notas opcionales..." rows={2}
                            className="text-xs border border-gray-200 px-2 py-1 resize-none focus:outline-none rounded w-full" />
                          <div className="flex gap-2">
                            <button onClick={() => { responderMutation.mutate({ ventaId: l.ventaId, respuesta: 'aceptada', datos: { notasRespuesta } }); setRespondiendoId(null); setNotasRespuesta(''); }}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white"
                              style={{ background: '#15803D', borderRadius: '0.25rem' }}>
                              <Check size={12} /> Aceptar
                            </button>
                            <button onClick={() => { responderMutation.mutate({ ventaId: l.ventaId, respuesta: 'rechazada', datos: { notasRespuesta } }); setRespondiendoId(null); setNotasRespuesta(''); }}
                              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white"
                              style={{ background: '#DC2626', borderRadius: '0.25rem' }}>
                              <X size={12} /> Rechazar
                            </button>
                            <button onClick={() => { setRespondiendoId(null); setNotasRespuesta(''); }} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setRespondiendoId(l.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white flex items-center gap-1"
                          style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}>
                          Responder consulta
                        </button>
                      )
                    )}

                    {/* Carlos: confirmar logística si fue aceptada o no aplica */}
                    {esCarlos && (l.estadoConsulta === 'aceptada' || l.estadoConsulta === 'no_aplica') && l.estadoEntrega === 'pendiente' && !l.confTransportista && (
                      confirmandoId === l.id ? (
                        <div className="flex flex-col gap-2 w-full mt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <input placeholder="Transportista" value={confirmForm.nombreTransportista}
                              onChange={e => setConfirmForm(f => ({ ...f, nombreTransportista: e.target.value }))}
                              className="text-xs border border-gray-200 px-2 py-1.5 rounded focus:outline-none" />
                            <input placeholder="Teléfono" value={confirmForm.telefonoTransp}
                              onChange={e => setConfirmForm(f => ({ ...f, telefonoTransp: e.target.value }))}
                              className="text-xs border border-gray-200 px-2 py-1.5 rounded focus:outline-none" />
                            <input type="date" placeholder="Fecha retiro galpón" value={confirmForm.fechaRetiroGalpon}
                              onChange={e => setConfirmForm(f => ({ ...f, fechaRetiroGalpon: e.target.value }))}
                              className="text-xs border border-gray-200 px-2 py-1.5 rounded focus:outline-none" />
                            <input type="number" placeholder="Costo flete" value={confirmForm.costoFlete}
                              onChange={e => setConfirmForm(f => ({ ...f, costoFlete: e.target.value }))}
                              className="text-xs border border-gray-200 px-2 py-1.5 rounded focus:outline-none" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => {
                              confirmarMutation.mutate({ ventaId: l.ventaId, datos: { nombreTransportista: confirmForm.nombreTransportista || undefined, telefonoTransp: confirmForm.telefonoTransp || undefined, fechaRetiroGalpon: confirmForm.fechaRetiroGalpon || undefined, costoFlete: confirmForm.costoFlete ? Number(confirmForm.costoFlete) : undefined } });
                              setConfirmandoId(null);
                              setConfirmForm({ nombreTransportista: '', telefonoTransp: '', fechaRetiroGalpon: '', costoFlete: '' });
                            }}
                              className="px-3 py-1 text-xs font-medium text-white flex items-center gap-1"
                              style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}>
                              <Check size={12} /> Confirmar
                            </button>
                            <button onClick={() => setConfirmandoId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmandoId(l.id)}
                          className="px-3 py-1.5 text-xs font-medium text-white flex items-center gap-1"
                          style={{ background: '#15803D', borderRadius: '0.25rem' }}>
                          Confirmar logística
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNueva && (
        <NuevaLogistica onClose={() => setShowNueva(false)} onSuccess={() => setShowNueva(false)} />
      )}
    </div>
  );
}
