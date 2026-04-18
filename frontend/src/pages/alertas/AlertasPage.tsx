import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Info, Bell, BellOff,
  Receipt, FileText, Package, ShoppingCart, RefreshCw
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
    icono: <Receipt size={16} />,
    ruta: '/facturacion'
  },
  stock_bajo: {
    label: 'Stock bajo mínimo',
    icono: <Package size={16} />,
    ruta: '/inventario'
  },
  cotizacion_sin_seguimiento: {
    label: 'Cotización sin seguimiento',
    icono: <FileText size={16} />,
    ruta: '/cotizaciones'
  },
  pedido_atrasado: {
    label: 'Pedido atrasado',
    icono: <ShoppingCart size={16} />,
    ruta: '/ventas'
  }
};

const urgenciaConfig = {
  alta: {
    container: 'bg-red-50 border-red-200',
    badge:     'bg-red-100 text-red-700 border-red-200',
    icono:     <AlertCircle size={18} className="text-red-500 shrink-0" />,
    titulo:    'text-red-800',
    detalle:   'text-red-600'
  },
  media: {
    container: 'bg-amber-50 border-amber-200',
    badge:     'bg-amber-100 text-amber-700 border-amber-200',
    icono:     <AlertTriangle size={18} className="text-amber-500 shrink-0" />,
    titulo:    'text-amber-800',
    detalle:   'text-amber-600'
  },
  baja: {
    container: 'bg-blue-50 border-blue-200',
    badge:     'bg-blue-100 text-blue-700 border-blue-200',
    icono:     <Info size={18} className="text-blue-500 shrink-0" />,
    titulo:    'text-blue-800',
    detalle:   'text-blue-600'
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
    <div className="space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Alertas</h1>
          <p className="page-subtitle">
            {alertas?.total
              ? `${alertas.total} alerta${alertas.total > 1 ? 's' : ''} activa${alertas.total > 1 ? 's' : ''}`
              : 'Sin alertas activas'
            }
          </p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Resumen por urgencia */}
      <div className="grid grid-cols-3 gap-4">
        {([
          {
            key: 'alta' as FiltroUrgencia,
            label: 'Urgentes',
            count: alertas?.alta || 0,
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: <AlertCircle size={20} className="text-red-500" />
          },
          {
            key: 'media' as FiltroUrgencia,
            label: 'Moderadas',
            count: alertas?.media || 0,
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            icon: <AlertTriangle size={20} className="text-amber-500" />
          },
          {
            key: 'baja' as FiltroUrgencia,
            label: 'Informativas',
            count: alertas?.baja || 0,
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            text: 'text-blue-700',
            icon: <Info size={20} className="text-blue-500" />
          }
        ]).map(item => (
          <button
            key={item.key}
            onClick={() => setFiltroUrgencia(
              filtroUrgencia === item.key ? 'todas' : item.key
            )}
            className={clsx(
              'card-p flex items-center gap-4 text-left transition-all',
              filtroUrgencia === item.key
                ? `${item.bg} border-2 ${item.border}`
                : 'hover:shadow-card-hover'
            )}
          >
            <div className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              item.bg
            )}>
              {item.icon}
            </div>
            <div>
              <p className={clsx('text-2xl font-bold', item.text)}>{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Filtro por tipo */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroTipo('todos')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
            filtroTipo === 'todos'
              ? 'bg-[#16A34A] text-white border-[#16A34A]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          )}
        >
          Todos los tipos
        </button>
        {Object.entries(tipoConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setFiltroTipo(filtroTipo === key ? 'todos' : key)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5',
              filtroTipo === key
                ? 'bg-[#16A34A] text-white border-[#16A34A]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            {config.icono}
            {config.label}
          </button>
        ))}
      </div>

      {/* Lista de alertas */}
      {isLoading ? (
        <div className="p-8"><LoadingSpinner text="Cargando alertas..." /></div>
      ) : !alertasFiltradas?.length ? (
        <div className="empty-state">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BellOff size={24} className="text-green-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700">
            {alertas?.total === 0
              ? '¡Todo en orden! Sin alertas activas 🎉'
              : 'Sin alertas en esta categoría'
            }
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {alertas?.total === 0
              ? 'El sistema revisará automáticamente todos los días a las 8:00 AM'
              : 'Probá seleccionando otra categoría o urgencia'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertasFiltradas.map((alerta: { tipo: string; urgencia: keyof typeof urgenciaConfig; titulo: string; detalle: string }, i: number) => {
            const uc = urgenciaConfig[alerta.urgencia];
            const tc = tipoConfig[alerta.tipo];

            return (
              <div
                key={i}
                className={clsx(
                  'flex items-start gap-4 p-4 rounded-2xl border transition-all',
                  uc.container,
                  tc && 'cursor-pointer hover:shadow-sm'
                )}
                onClick={() => tc && navigate(tc.ruta)}
              >
                {/* Icono urgencia */}
                <div className="mt-0.5">{uc.icono}</div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className={clsx('text-sm font-semibold', uc.titulo)}>
                        {alerta.titulo}
                      </p>
                      <p className={clsx('text-xs mt-0.5', uc.detalle)}>
                        {alerta.detalle}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tc && (
                        <span className={clsx(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border',
                          uc.badge
                        )}>
                          {tc.icono}
                          {tc.label}
                        </span>
                      )}
                      <span className={clsx(
                        'text-xs font-bold px-2 py-1 rounded-lg border uppercase',
                        uc.badge
                      )}>
                        {alerta.urgencia}
                      </span>
                    </div>
                  </div>

                  {tc && (
                    <p className={clsx('text-xs mt-2 font-medium', uc.detalle)}>
                      → Ir a {tc.label.toLowerCase()} para resolver
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info sobre el sistema de alertas */}
      <div className="card-p border border-dashed border-gray-200">
        <div className="flex items-start gap-3">
          <Bell size={18} className="text-gray-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              ¿Cómo funciona el sistema de alertas?
            </p>
            <div className="space-y-1.5 text-xs text-gray-500">
              <p>
                🕗 <strong>8:00 AM todos los días</strong> — El sistema revisa automáticamente
                facturas vencidas hace más de 3 días y las marca como vencidas.
              </p>
              <p>
                🕗 <strong>8:05 AM todos los días</strong> — Se verifican las cotizaciones
                cuya fecha de validez ya expiró y se las marca como vencidas.
              </p>
              <p>
                ⚡ <strong>En tiempo real</strong> — Las alertas de stock bajo mínimo,
                cotizaciones sin seguimiento y pedidos atrasados se calculan al instante
                cada vez que abrís esta pantalla.
              </p>
              <p>
                👤 <strong>Por propietario</strong> — Cada propietario ve solo las alertas
                de sus propias operaciones. Las alertas de stock las ven los dos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
