import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Info, Bell, BellOff,
  Receipt, FileText, Package, ShoppingCart, RefreshCw,
  ArrowRight
} from 'lucide-react';
import { useAlertas } from '../../hooks/useDashboard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { clsx } from 'clsx';

const tipoConfig: Record<string, {
  label: string;
  icono: React.ReactNode;
  ruta: string;
}> = {
  factura_vencida: {
    label: 'Factura vencida',
    icono: <Receipt size={14} />,
    ruta: '/facturacion'
  },
  stock_bajo: {
    label: 'Stock bajo mínimo',
    icono: <Package size={14} />,
    ruta: '/inventario'
  },
  cotizacion_sin_seguimiento: {
    label: 'Cotización sin seguimiento',
    icono: <FileText size={14} />,
    ruta: '/cotizaciones'
  },
  pedido_atrasado: {
    label: 'Pedido atrasado',
    icono: <ShoppingCart size={14} />,
    ruta: '/ventas'
  }
};

const urgenciaConfig = {
  alta: {
    dot:    'bg-red-500',
    badge:  'bg-red-50 text-red-700 border border-red-200',
    icono:  <AlertCircle size={16} className="text-red-500 shrink-0" />,
    titulo: 'text-gray-900',
    detalle:'text-gray-500'
  },
  media: {
    dot:    'bg-amber-400',
    badge:  'bg-amber-50 text-amber-700 border border-amber-200',
    icono:  <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
    titulo: 'text-gray-900',
    detalle:'text-gray-500'
  },
  baja: {
    dot:    'bg-blue-400',
    badge:  'bg-blue-50 text-blue-700 border border-blue-200',
    icono:  <Info size={16} className="text-blue-500 shrink-0" />,
    titulo: 'text-gray-900',
    detalle:'text-gray-500'
  }
};

type FiltroUrgencia = 'todas' | 'alta' | 'media' | 'baja';

export default function AlertasPage() {
  const navigate = useNavigate();
  const { data: alertas, isLoading, refetch } = useAlertas();
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  const alertasFiltradas = alertas?.alertas?.filter((a: { urgencia: string; tipo: string }) => {
    const matchUrgencia = filtroUrgencia === 'todas' || a.urgencia === filtroUrgencia;
    const matchTipo = filtroTipo === 'todos' || a.tipo === filtroTipo;
    return matchUrgencia && matchTipo;
  });

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Alertas</h1>
          <p className="text-sm text-gray-600 mt-1">
            {alertas?.total
              ? `${alertas.total} alerta${alertas.total > 1 ? 's' : ''} activa${alertas.total > 1 ? 's' : ''}`
              : 'Sin alertas activas'
            }
          </p>
        </div>
        <button
          onClick={() => refetch()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)';
          }}
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* Resumen por urgencia */}
      <div className="grid grid-cols-3 gap-4">
        {([
          {
            key: 'alta' as FiltroUrgencia,
            label: 'Urgentes',
            count: alertas?.alta || 0,
            dot: 'bg-red-500',
            icon: <AlertCircle size={18} className="text-red-500" />
          },
          {
            key: 'media' as FiltroUrgencia,
            label: 'Moderadas',
            count: alertas?.media || 0,
            dot: 'bg-amber-400',
            icon: <AlertTriangle size={18} className="text-amber-500" />
          },
          {
            key: 'baja' as FiltroUrgencia,
            label: 'Informativas',
            count: alertas?.baja || 0,
            dot: 'bg-blue-400',
            icon: <Info size={18} className="text-blue-500" />
          }
        ]).map(item => (
          <button
            key={item.key}
            onClick={() => setFiltroUrgencia(filtroUrgencia === item.key ? 'todas' : item.key)}
            className={clsx(
              'card-kpi flex items-center gap-3 text-left transition-all w-full',
              filtroUrgencia === item.key
                ? 'ring-2 ring-[#C4895A]'
                : 'hover:shadow-md'
            )}
          >
            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
              {item.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{item.count}</p>
              <p className="titulo-card mt-0.5">{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroTipo('todos')}
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: filtroTipo === 'todos' ? 'none' : '1px solid #E5E7EB',
            background: filtroTipo === 'todos'
              ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
              : '#fff',
            color: filtroTipo === 'todos' ? '#fff' : '#4B5563',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Todos los tipos
        </button>
        {Object.entries(tipoConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFiltroTipo(filtroTipo === key ? 'todos' : key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '0.25rem 0.75rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              border: filtroTipo === key ? 'none' : '1px solid #E5E7EB',
              background: filtroTipo === key
                ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                : '#fff',
              color: filtroTipo === key ? '#fff' : '#4B5563',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {config.icono}
            {config.label}
          </button>
        ))}
      </div>

      {/* Lista de alertas */}
      {isLoading ? (
        <div className="card-base"><LoadingSpinner text="Cargando alertas..." /></div>
      ) : !alertasFiltradas?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mx-auto mb-3">
            <BellOff size={22} className="text-gray-400" />
          </div>
          <p className="titulo-card">
            {alertas?.total === 0 ? 'Sin alertas activas' : 'Sin alertas en esta categoría'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {alertas?.total === 0
              ? 'El sistema revisará automáticamente todos los días a las 8:00 AM'
              : 'Probá seleccionando otra categoría o urgencia'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {alertasFiltradas.map((alerta: { tipo: string; urgencia: keyof typeof urgenciaConfig; titulo: string; detalle: string }, i: number) => {
            const uc = urgenciaConfig[alerta.urgencia];
            const tc = tipoConfig[alerta.tipo];

            return (
              <div
                key={i}
                className={clsx(
                  'card-base flex items-start gap-3 transition-all',
                  tc && 'cursor-pointer hover:shadow-md'
                )}
                onClick={() => tc && navigate(tc.ruta)}
              >
                <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', uc.dot)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={clsx('text-sm font-semibold truncate', uc.titulo)}>
                        {alerta.titulo}
                      </p>
                      <p className={clsx('text-xs mt-0.5 truncate', uc.detalle)}>
                        {alerta.detalle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tc && (
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded',
                          uc.badge
                        )}>
                          {tc.icono}
                          {tc.label}
                        </span>
                      )}
                      <span className={clsx(
                        'text-xs font-bold px-2 py-0.5 rounded uppercase',
                        uc.badge
                      )}>
                        {alerta.urgencia}
                      </span>
                      {tc && <ArrowRight size={14} className="text-gray-300" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info sobre el sistema de alertas */}
      <div className="card-base border border-gray-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
            <Bell size={16} className="text-gray-400" />
          </div>
          <div>
            <p className="titulo-card mb-2">¿Cómo funciona el sistema de alertas?</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <p><strong className="text-gray-700">8:00 AM todos los días</strong> — El sistema revisa automáticamente facturas vencidas hace más de 3 días y las marca como vencidas.</p>
              <p><strong className="text-gray-700">8:05 AM todos los días</strong> — Se verifican las cotizaciones cuya fecha de validez ya expiró y se las marca como vencidas.</p>
              <p><strong className="text-gray-700">En tiempo real</strong> — Las alertas de stock bajo mínimo, cotizaciones sin seguimiento y pedidos atrasados se calculan al instante cada vez que abrís esta pantalla.</p>
              <p><strong className="text-gray-700">Por propietario</strong> — Cada propietario ve solo las alertas de sus propias operaciones. Las alertas de stock las ven los dos.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
