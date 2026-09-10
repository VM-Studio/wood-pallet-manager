import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, AlertTriangle, Info, Bell, BellOff,
  Receipt, FileText, Truck, Warehouse, ShoppingCart, RefreshCw,
  ArrowRight, CheckCircle2, History, Undo2
} from 'lucide-react';
import { useAlertas, useAlertasResueltas, useMarcarAlertaResuelta, useReabrirAlerta } from '../../hooks/useDashboard';
import type { Alerta } from '../../types';
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
  pago_modalidad_pendiente: {
    label: 'Pago pendiente',
    icono: <Receipt size={14} />,
    ruta: '/facturacion'
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
  },
  logistica_hoy: {
    label: 'Entrega hoy',
    icono: <Truck size={14} />,
    ruta: '/logistica'
  },
  retiro_hoy: {
    label: 'Retiro hoy',
    icono: <Warehouse size={14} />,
    ruta: '/retiros'
  },
  compra_directa_sin_registrar: {
    label: 'Compra sin registrar',
    icono: <ShoppingCart size={14} />,
    ruta: '/compras'
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
type Seccion = 'activas' | 'resueltas';

const fmtFechaHora = (f: string) =>
  new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AlertasPage() {
  const navigate = useNavigate();
  const { data: alertas, isLoading, refetch } = useAlertas();
  const { data: resueltas, isLoading: isLoadingResueltas } = useAlertasResueltas();
  const marcarResuelta = useMarcarAlertaResuelta();
  const reabrir = useReabrirAlerta();
  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('todas');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [seccion, setSeccion] = useState<Seccion>('activas');

  const alertasFiltradas = alertas?.alertas?.filter((a: { urgencia: string; tipo: string }) => {
    const matchUrgencia = filtroUrgencia === 'todas' || a.urgencia === filtroUrgencia;
    const matchTipo = filtroTipo === 'todos' || a.tipo === filtroTipo;
    return matchUrgencia && matchTipo;
  });

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
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
            background: '#7c4b2c',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = '#7c4b2c';
          }}
        >
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* Tabs de sección: activas / resueltas */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid #E5E7EB', borderRadius: '0.375rem', overflow: 'hidden', width: 'fit-content' }}>
        <button
          onClick={() => setSeccion('activas')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: seccion === 'activas' ? '#7c4b2c' : '#fff',
            color: seccion === 'activas' ? '#fff' : '#6B7280',
            borderRight: '1px solid #E5E7EB',
          }}
        >
          <Bell size={13} /> Activas
          {!!alertas?.total && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '0.875rem',
              background: seccion === 'activas' ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
              color: seccion === 'activas' ? '#fff' : '#6B7280',
            }}>{alertas.total}</span>
          )}
        </button>
        <button
          onClick={() => setSeccion('resueltas')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 700,
            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            background: seccion === 'resueltas' ? '#7c4b2c' : '#fff',
            color: seccion === 'resueltas' ? '#fff' : '#6B7280',
          }}
        >
          <History size={13} /> Resueltas
          {!!resueltas?.length && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '1px 6px', borderRadius: '0.875rem',
              background: seccion === 'resueltas' ? 'rgba(255,255,255,0.25)' : '#F3F4F6',
              color: seccion === 'resueltas' ? '#fff' : '#6B7280',
            }}>{resueltas.length}</span>
          )}
        </button>
      </div>

      {seccion === 'activas' ? (
      <>
      {/* Resumen por urgencia */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              ? '#7c4b2c'
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
                ? '#7c4b2c'
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
          {alertasFiltradas.map((alerta: Alerta, i: number) => {
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
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          marcarResuelta.mutate(alerta);
                        }}
                        disabled={marcarResuelta.isPending}
                        title="Marcar como resuelta"
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem',
                          borderRadius: '0.25rem', border: '1px solid #A7F3D0',
                          background: '#ECFDF5', color: '#059669', cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Resuelto
                      </button>
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
              <p><strong className="text-gray-700">Cotizaciones</strong> — Si pasan 2 días o más sin respuesta desde el envío (o el último contacto registrado), se genera una alerta.</p>
              <p><strong className="text-gray-700">Facturación</strong> — Si llega la fecha de entrega/retiro y, según la modalidad de pago pactada (adelantado, contra entrega o por partes), el pago no fue registrado por completo, se genera una alerta.</p>
              <p><strong className="text-gray-700">Logística y retiros</strong> — Alertas informativas para las entregas y retiros programados para el día de hoy.</p>
              <p><strong className="text-gray-700">Compras</strong> — Alerta informativa cuando se realizó una venta directa (sin usar stock propio) y todavía no se registró la compra correspondiente al proveedor.</p>
              <p><strong className="text-gray-700">Por propietario</strong> — Cada propietario ve solo las alertas de sus propias operaciones.</p>
              <p><strong className="text-gray-700">Resuelto</strong> — Al marcar una alerta como resuelta, se guarda en la pestaña "Resueltas" junto con la fecha, hora y el usuario que la resolvió.</p>
            </div>
          </div>
        </div>
      </div>
      </>
      ) : (
        /* Sección: Alertas resueltas */
        isLoadingResueltas ? (
          <div className="card-base"><LoadingSpinner text="Cargando alertas resueltas..." /></div>
        ) : !resueltas?.length ? (
          <div className="card-base flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mx-auto mb-3">
              <History size={22} className="text-gray-400" />
            </div>
            <p className="titulo-card">Sin alertas resueltas</p>
            <p className="text-xs text-gray-400 mt-1">Las alertas que marques como "Resuelto" van a aparecer acá</p>
          </div>
        ) : (
          <div className="space-y-2">
            {resueltas.map(r => {
              const uc = urgenciaConfig[r.urgencia];
              const tc = tipoConfig[r.tipo];
              return (
                <div key={r.id} className="card-base flex items-start gap-3 opacity-80">
                  <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', uc.dot)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-gray-700 line-through decoration-gray-300">
                          {r.titulo}
                        </p>
                        <p className="text-xs mt-0.5 truncate text-gray-400">{r.detalle}</p>
                        <p className="text-xs mt-1 text-gray-400">
                          Resuelta el {fmtFechaHora(r.resueltaEn)} por {r.resueltaPor.nombre} {r.resueltaPor.apellido}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {tc && (
                          <span className={clsx('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded', uc.badge)}>
                            {tc.icono}
                            {tc.label}
                          </span>
                        )}
                        <button
                          onClick={() => reabrir.mutate(r.id)}
                          disabled={reabrir.isPending}
                          title="Reabrir alerta"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem',
                            borderRadius: '0.25rem', border: '1px solid #E5E7EB',
                            background: '#F9FAFB', color: '#6B7280', cursor: 'pointer',
                          }}
                        >
                          <Undo2 size={13} />
                          Reabrir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

    </div>
  );
}
