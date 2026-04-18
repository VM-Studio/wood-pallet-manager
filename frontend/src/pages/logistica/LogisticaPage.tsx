import { useState } from 'react';
import { Plus, Search, Truck, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useLogisticas, useEntregasHoy } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import NuevaLogistica from './NuevaLogistica';
import EntregaCard from './EntregaCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

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
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showNueva, setShowNueva] = useState(false);

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
      <div className="page-header">
        <div>
          <h1 className="page-title">Logística</h1>
          <p className="page-subtitle">
            {esCarlos
              ? 'Coordinación centralizada de todas las entregas'
              : 'Estado de las entregas de tus ventas'
            }
          </p>
        </div>
        <button onClick={() => setShowNueva(true)} className="btn-primary">
          <Plus size={18} />
          {esCarlos ? 'Coordinar entrega' : 'Consultar entrega'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi-card kpi-amber">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <Clock size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendientes}</p>
              <p className="text-xs text-gray-500">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-blue">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Truck size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{enCamino}</p>
              <p className="text-xs text-gray-500">En camino</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-green">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{entregadas}</p>
              <p className="text-xs text-gray-500">Entregadas</p>
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-purple">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Calendar size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{entregasHoy?.length ?? 0}</p>
              <p className="text-xs text-gray-500">Hoy</p>
            </div>
          </div>
        </div>
      </div>

      {/* Entregas del día */}
      {entregasHoy && entregasHoy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-purple-600" />
            <h2 className="text-sm font-semibold text-gray-700">
              Entregas programadas para hoy ({entregasHoy.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entregasHoy.map(l => (
              <EntregaCard key={l.id} logistica={l} compact />
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o número de venta..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
          {estadoFiltros.map(f => (
            <button key={f.key} onClick={() => setFiltroEstado(f.key)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                filtroEstado === f.key
                  ? 'bg-[#16A34A] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de entregas */}
      {!filtradas?.length ? (
        <div className="empty-state">
          <div className="empty-icon"><Truck size={24} /></div>
          <p className="text-sm font-semibold text-gray-700">Sin entregas registradas</p>
          <p className="text-sm text-gray-400 mt-1">
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
