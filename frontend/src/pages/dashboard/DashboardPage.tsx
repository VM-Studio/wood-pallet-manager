import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Package, DollarSign, Clock, FileText, ShoppingCart,
  Truck, AlertTriangle, Plus, Users, ClipboardList
} from 'lucide-react';
import { useDashboard, useAlertas } from '../../hooks/useDashboard';
import { useAuthStore } from '../../store/auth.store';
import KpiCard from '../../components/ui/KpiCard';
import AlertaBadge from '../../components/ui/AlertaBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

const formatPesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);

const formatNumero = (valor: number) =>
  new Intl.NumberFormat('es-AR').format(valor);

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
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Buenos días, {usuario?.nombre} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {alertas && alertas.alta > 0 && (
          <div
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => navigate('/alertas')}
          >
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">{alertas.alta} alerta{alertas.alta > 1 ? 's' : ''} urgente{alertas.alta > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          titulo="Pallets vendidos este mes"
          valor={formatNumero(kpis?.palletsMesActual || 0)}
          variacion={kpis?.variacionPallets}
          subtitulo={`${formatNumero(kpis?.palletsMesAnterior || 0)} el mes pasado`}
          icono={<Package size={22} />}
          colorIcono="bg-primary-100 text-primary-600"
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          titulo="Facturación del mes"
          valor={formatPesos(kpis?.facturacionMesActual || 0)}
          variacion={kpis?.variacionFacturacion}
          subtitulo={formatPesos(kpis?.facturacionMesAnterior || 0) + ' el mes pasado'}
          icono={<DollarSign size={22} />}
          colorIcono="bg-teal-100 text-teal-600"
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          titulo="Cobros pendientes"
          valor={formatPesos(kpis?.totalCobrosPendientes || 0)}
          subtitulo={kpis?.facturasVencidas ? `${kpis.facturasVencidas} factura${kpis.facturasVencidas > 1 ? 's' : ''} vencida${kpis.facturasVencidas > 1 ? 's' : ''}` : 'Sin facturas vencidas'}
          icono={<Clock size={22} />}
          colorIcono={kpis?.facturasVencidas ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}
          onClick={() => navigate('/facturacion')}
        />
        <KpiCard
          titulo="Cotizaciones activas"
          valor={kpis?.cotizacionesPendientes || 0}
          subtitulo={`${kpis?.pedidosActivos || 0} pedido${(kpis?.pedidosActivos || 0) !== 1 ? 's' : ''} en curso`}
          icono={<FileText size={22} />}
          colorIcono="bg-blue-100 text-blue-600"
          onClick={() => navigate('/cotizaciones')}
        />
      </div>

      {/* Segunda fila de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          titulo="Pedidos activos"
          valor={kpis?.pedidosActivos || 0}
          subtitulo="Confirmados, en preparación o en tránsito"
          icono={<ShoppingCart size={22} />}
          colorIcono="bg-purple-100 text-purple-600"
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          titulo="Entregas programadas hoy"
          valor={kpis?.entregasHoy || 0}
          subtitulo={esCarlos ? 'Coordinadas por vos' : 'Coordinadas por Carlos'}
          icono={<Truck size={22} />}
          colorIcono="bg-indigo-100 text-indigo-600"
          onClick={() => navigate('/logistica')}
        />
        <KpiCard
          titulo="Alertas activas"
          valor={alertas?.total || 0}
          subtitulo={alertas?.alta ? `${alertas.alta} urgente${alertas.alta > 1 ? 's' : ''}` : 'Sin alertas urgentes'}
          icono={<AlertTriangle size={22} />}
          colorIcono={alertas?.alta ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}
          onClick={() => navigate('/alertas')}
        />
      </div>

      {/* Gráfico + Panel por propietario */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Gráfico de barras */}
        <div className="xl:col-span-2 card">
          <h2 className="text-base font-semibold text-gray-900 mb-6">
            Ventas — Últimos 12 meses
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={grafico} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === 'pallets' ? formatNumero(value) + ' u' : formatPesos(value),
                  name === 'pallets' ? 'Pallets' : 'Facturación'
                ]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
              />
              <Legend
                formatter={(value) => value === 'pallets' ? 'Pallets vendidos' : 'Facturación'}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="pallets" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Panel por propietario */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Este mes por propietario
          </h2>
          <div className="space-y-4">
            {/* Carlos */}
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-xs">
                  CH
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Carlos</p>
                  <p className="text-xs text-gray-500">Propietario</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-teal-700">{porPropietario?.carlos.ventas || 0}</p>
                  <p className="text-xs text-gray-500">Ventas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-teal-700">{formatNumero(porPropietario?.carlos.pallets || 0)}</p>
                  <p className="text-xs text-gray-500">Pallets</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-teal-700">{formatPesos(porPropietario?.carlos.facturacion || 0)}</p>
                  <p className="text-xs text-gray-500">Facturado</p>
                </div>
              </div>
            </div>
            {/* Juan Cruz */}
            <div className="p-4 bg-primary-50 rounded-xl border border-primary-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-xs">
                  JC
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Juan Cruz</p>
                  <p className="text-xs text-gray-500">Propietario Digital</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-primary-700">{porPropietario?.juanCruz.ventas || 0}</p>
                  <p className="text-xs text-gray-500">Ventas</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary-700">{formatNumero(porPropietario?.juanCruz.pallets || 0)}</p>
                  <p className="text-xs text-gray-500">Pallets</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary-700">{formatPesos(porPropietario?.juanCruz.facturacion || 0)}</p>
                  <p className="text-xs text-gray-500">Facturado</p>
                </div>
              </div>
            </div>
            {/* Total consolidado */}
            <div className="p-3 bg-navy-900 rounded-xl text-center">
              <p className="text-xs text-navy-300 mb-1">Total consolidado</p>
              <p className="text-xl font-bold text-white">
                {formatPesos((porPropietario?.carlos.facturacion || 0) + (porPropietario?.juanCruz.facturacion || 0))}
              </p>
              <p className="text-xs text-navy-400 mt-1">
                {formatNumero((porPropietario?.carlos.pallets || 0) + (porPropietario?.juanCruz.pallets || 0))} pallets vendidos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alertas + Accesos rápidos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Panel de alertas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Alertas activas</h2>
            <button
              onClick={() => navigate('/alertas')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Ver todas →
            </button>
          </div>
          {loadingAlertas ? (
            <LoadingSpinner text="Cargando alertas..." />
          ) : alertasData.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package size={20} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-500">Sin alertas activas 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertasData.map((alerta, i) => (
                <AlertaBadge
                  key={i}
                  urgencia={alerta.urgencia}
                  titulo={alerta.titulo}
                  detalle={alerta.detalle}
                  onClick={() => navigate(
                    alerta.referencia.tipo === 'factura' ? '/facturacion'
                    : alerta.referencia.tipo === 'cotizacion' ? '/cotizaciones'
                    : alerta.referencia.tipo === 'venta' ? '/ventas'
                    : '/inventario'
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/cotizaciones')}
              className="flex flex-col items-center gap-2 p-4 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-700 transition-colors">
                <Plus size={20} className="text-white" />
              </div>
              <span className="text-sm font-medium text-primary-700">Nueva cotización</span>
            </button>
            <button
              onClick={() => navigate('/clientes')}
              className="flex flex-col items-center gap-2 p-4 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center group-hover:bg-teal-700 transition-colors">
                <Users size={20} className="text-white" />
              </div>
              <span className="text-sm font-medium text-teal-700">Nuevo cliente</span>
            </button>
            <button
              onClick={() => navigate('/facturacion')}
              className="flex flex-col items-center gap-2 p-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center group-hover:bg-amber-700 transition-colors">
                <DollarSign size={20} className="text-white" />
              </div>
              <span className="text-sm font-medium text-amber-700">Registrar cobro</span>
            </button>
            <button
              onClick={() => navigate('/compras')}
              className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors group"
            >
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-700 transition-colors">
                <ClipboardList size={20} className="text-white" />
              </div>
              <span className="text-sm font-medium text-purple-700">Nueva compra</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
