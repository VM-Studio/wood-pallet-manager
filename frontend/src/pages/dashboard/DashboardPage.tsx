import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Package, DollarSign, Clock, FileText,
  ShoppingCart, Truck, AlertTriangle,
  Plus, Users, ClipboardList,
  TrendingUp, TrendingDown, Minus, ArrowRight
} from 'lucide-react';
import { useDashboard, useAlertas } from '../../hooks/useDashboard';
import { useAuthStore } from '../../store/auth.store';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

const formatPesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    notation: 'compact', maximumFractionDigits: 1
  }).format(valor);

const formatPesosCompleto = (valor: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0
  }).format(valor);

const formatNumero = (valor: number) =>
  new Intl.NumberFormat('es-AR').format(valor);

interface KpiProps {
  titulo: string;
  valor: string | number;
  variacion?: number;
  subtitulo?: string;
  icono: React.ReactNode;
  onClick?: () => void;
}

function KpiCard({ titulo, valor, variacion, subtitulo, icono, onClick }: KpiProps) {
  const positivo = variacion !== undefined && variacion > 0;
  const negativo = variacion !== undefined && variacion < 0;

  return (
    <div
      className={clsx('card-kpi', onClick && 'cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500 shrink-0">
          {icono}
        </div>
        {variacion !== undefined && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
            positivo ? 'bg-green-50 text-green-700' :
            negativo ? 'bg-red-50 text-red-600' :
            'bg-gray-50 text-gray-400'
          )}>
            {positivo ? <TrendingUp size={11} /> : negativo ? <TrendingDown size={11} /> : <Minus size={11} />}
            {positivo ? '+' : ''}{variacion}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1 leading-none">{valor}</p>
      <p className="titulo-card">{titulo}</p>
      {subtitulo && (
        <p className="text-xs text-gray-400 mt-1.5">{subtitulo}</p>
      )}
    </div>
  );
}

function AlertaItem({ urgencia, titulo, detalle, onClick }: {
  urgencia: 'alta' | 'media' | 'baja';
  titulo: string;
  detalle: string;
  onClick?: () => void;
}) {
  const dot = {
    alta:  'bg-red-500',
    media: 'bg-amber-400',
    baja:  'bg-blue-400',
  }[urgencia];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 py-3 border-b border-gray-50 last:border-b-0',
        onClick && 'cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors'
      )}
      onClick={onClick}
    >
      <div className={clsx('w-2 h-2 rounded-full mt-1.5 shrink-0', dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{titulo}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{detalle}</p>
      </div>
      <ArrowRight size={14} className="text-gray-300 shrink-0 mt-0.5" />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { data: dashboard, isLoading: loadingDash, error: errorDash } = useDashboard();
  const { data: alertas, isLoading: loadingAlertas } = useAlertas();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  if (loadingDash) return <LoadingSpinner text="Cargando dashboard..." />;
  if (errorDash) return <ErrorMessage message="No se pudo cargar el dashboard. Verificá que el backend esté corriendo." />;

  const kpis = dashboard?.kpis;
  const porPropietario = dashboard?.porPropietario;
  const grafico = dashboard?.graficos.ventasUltimos12Meses || [];
  const alertasData = alertas?.alertas.slice(0, 5) || [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">
            Bienvenido, {usuario?.nombre}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        {alertas && alertas.alta > 0 && (
          <button
            onClick={() => navigate('/alertas')}
            className="btn-brand-sm"
          >
            <AlertTriangle size={13} />
            {alertas.alta} alerta{alertas.alta > 1 ? 's' : ''} urgente{alertas.alta > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* KPIs fila 1 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          titulo="Pallets este mes"
          valor={formatNumero(kpis?.palletsMesActual || 0)}
          variacion={kpis?.variacionPallets}
          subtitulo={`${formatNumero(kpis?.palletsMesAnterior || 0)} el mes pasado`}
          icono={<Package size={18} />}
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          titulo="Facturación del mes"
          valor={formatPesos(kpis?.facturacionMesActual || 0)}
          variacion={kpis?.variacionFacturacion}
          subtitulo={`${formatPesos(kpis?.facturacionMesAnterior || 0)} el mes pasado`}
          icono={<DollarSign size={18} />}
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          titulo="Cobros pendientes"
          valor={formatPesos(kpis?.totalCobrosPendientes || 0)}
          subtitulo={
            kpis?.facturasVencidas
              ? `${kpis.facturasVencidas} factura${kpis.facturasVencidas > 1 ? 's' : ''} vencida${kpis.facturasVencidas > 1 ? 's' : ''}`
              : 'Sin facturas vencidas'
          }
          icono={<Clock size={18} />}
          onClick={() => navigate('/facturacion')}
        />
        <KpiCard
          titulo="Cotizaciones activas"
          valor={kpis?.cotizacionesPendientes || 0}
          subtitulo={`${kpis?.pedidosActivos || 0} pedido${(kpis?.pedidosActivos || 0) !== 1 ? 's' : ''} en curso`}
          icono={<FileText size={18} />}
          onClick={() => navigate('/cotizaciones')}
        />
      </div>

      {/* KPIs fila 2 */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          titulo="Pedidos activos"
          valor={kpis?.pedidosActivos || 0}
          subtitulo="Confirmados o en preparación"
          icono={<ShoppingCart size={18} />}
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          titulo="Entregas hoy"
          valor={kpis?.entregasHoy || 0}
          subtitulo={esCarlos ? 'Coordinadas por vos' : 'Coordinadas por Carlos'}
          icono={<Truck size={18} />}
          onClick={() => navigate('/logistica')}
        />
        <KpiCard
          titulo="Alertas activas"
          valor={alertas?.total || 0}
          subtitulo={alertas?.alta ? `${alertas.alta} urgente${alertas.alta > 1 ? 's' : ''}` : 'Sin alertas urgentes'}
          icono={<AlertTriangle size={18} />}
          onClick={() => navigate('/alertas')}
        />
      </div>

      {/* Gráfico + Panel propietario */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Gráfico */}
        <div className="xl:col-span-2 card-base">
          <h2 className="titulo-seccion mb-5">Ventas — Últimos 12 meses</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={grafico} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBrand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6B3A2A" />
                  <stop offset="100%" stopColor="#C4895A" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${formatNumero(value)} u`, 'Pallets']}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: '1px solid #E5E7EB',
                  fontFamily: 'Inter'
                }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="pallets" radius={[4, 4, 0, 0]} fill="url(#colorBrand)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Panel propietarios */}
        <div className="card-base">
          <h2 className="titulo-seccion mb-4">Este mes</h2>
          <div className="space-y-3">

            {/* Carlos */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs">
                    CH
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Carlos</p>
                </div>
                <p className="text-xs text-gray-400">Propietario</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{porPropietario?.carlos.ventas || 0}</p>
                  <p className="text-xs text-gray-400">Ventas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatNumero(porPropietario?.carlos.pallets || 0)}</p>
                  <p className="text-xs text-gray-400">Pallets</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{formatPesos(porPropietario?.carlos.facturacion || 0)}</p>
                  <p className="text-xs text-gray-400">Facturado</p>
                </div>
              </div>
            </div>

            {/* Juan Cruz */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-xs">
                    JC
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Juan Cruz</p>
                </div>
                <p className="text-xs text-gray-400">Propietario Digital</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-gray-900">{porPropietario?.juanCruz.ventas || 0}</p>
                  <p className="text-xs text-gray-400">Ventas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{formatNumero(porPropietario?.juanCruz.pallets || 0)}</p>
                  <p className="text-xs text-gray-400">Pallets</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{formatPesos(porPropietario?.juanCruz.facturacion || 0)}</p>
                  <p className="text-xs text-gray-400">Facturado</p>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white">
              <p className="titulo-card">Total consolidado</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatPesosCompleto(
                  (porPropietario?.carlos.facturacion || 0) +
                  (porPropietario?.juanCruz.facturacion || 0)
                )}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatNumero(
                  (porPropietario?.carlos.pallets || 0) +
                  (porPropietario?.juanCruz.pallets || 0)
                )} pallets vendidos en total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas + Accesos rápidos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Alertas */}
        <div className="card-base">
          <div className="flex items-center justify-between mb-4">
            <h2 className="titulo-seccion">Alertas activas</h2>
            <button
              onClick={() => navigate('/alertas')}
              className="btn-brand-outline text-xs px-3 py-1.5"
            >
              Ver todas
            </button>
          </div>
          {loadingAlertas ? (
            <LoadingSpinner text="Cargando..." />
          ) : alertasData.length === 0 ? (
            <div className="text-center py-8">
              <p className="titulo-card" style={{ color: '#9CA3AF' }}>Sin alertas activas</p>
              <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>El sistema está funcionando correctamente</p>
            </div>
          ) : (
            <div>
              {alertasData.map((alerta, i) => (
                <AlertaItem
                  key={i}
                  urgencia={alerta.urgencia}
                  titulo={alerta.titulo}
                  detalle={alerta.detalle}
                  onClick={() => navigate(
                    alerta.referencia.tipo === 'factura'    ? '/facturacion' :
                    alerta.referencia.tipo === 'cotizacion' ? '/cotizaciones' :
                    alerta.referencia.tipo === 'venta'      ? '/ventas' :
                    '/inventario'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card-base">
          <h2 className="titulo-seccion mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            {([
              { label: 'Nueva cotización', ruta: '/cotizaciones', icono: <Plus size={16} /> },
              { label: 'Nuevo cliente',    ruta: '/clientes',     icono: <Users size={16} /> },
              { label: 'Registrar cobro',  ruta: '/facturacion',  icono: <DollarSign size={16} /> },
              { label: 'Nueva compra',     ruta: '/compras',      icono: <ClipboardList size={16} /> },
            ] as { label: string; ruta: string; icono: React.ReactNode }[]).map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.ruta)}
                className="btn-brand w-full rounded-xl"
                style={{ flexDirection: 'column', gap: '0.375rem', height: 'auto', padding: '0.875rem 1rem' }}
              >
                {item.icono}
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
