import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Package, DollarSign, FileText,
  TrendingUp, TrendingDown, Minus, ArrowRight,
  Users, Plus, AlertTriangle
} from 'lucide-react';
import { useDashboard, useAlertas, useEstacionalidad, useGanancias } from '../../hooks/useDashboard';
import { useAuthStore } from '../../store/auth.store';
import { useVistaParams } from '../../hooks/useVista';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';
import DropdownVista from '../../components/ui/DropdownVista';

const formatPesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS',
    notation: 'compact', maximumFractionDigits: 1
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
      className={clsx(
        'card-kpi',
        onClick && 'cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5'
      )}
      onClick={onClick}
    >
      {/* Título + ícono en la misma fila */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
          {icono}
        </div>
        <p className="titulo-card flex-1">{titulo}</p>
      </div>

      {/* Valor */}
      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
        {valor}
      </p>

      {/* Subtítulo + variación */}
      <div className="flex items-center justify-between mt-1">
        {subtitulo && (
          <p className="text-xs text-gray-400">{subtitulo}</p>
        )}
        {variacion !== undefined && (
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ml-auto',
            positivo ? 'bg-green-50 text-green-700' :
            negativo ? 'bg-red-50 text-red-600' :
            'bg-gray-50 text-gray-400'
          )}>
            {positivo ? <TrendingUp size={10} /> : negativo ? <TrendingDown size={10} /> : <Minus size={10} />}
            {positivo ? '+' : ''}{variacion}%
          </div>
        )}
      </div>
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
      <div className={clsx('w-2 h-2 rounded-full mt-2 shrink-0', dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{titulo}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{detalle}</p>
      </div>
      <ArrowRight size={14} className="text-gray-300 shrink-0 mt-1" />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { vista, vistaLabel } = useVistaParams();
  const { data: dashboard, isLoading: loadingDash, error: errorDash } = useDashboard();
  const { data: alertasData, isLoading: loadingAlertas } = useAlertas();
  const { data: graficoData } = useEstacionalidad();
  const { data: gananciasData } = useGanancias();
  if (loadingDash) return <LoadingSpinner text="Cargando dashboard..." />;
  if (errorDash) return <ErrorMessage message="No se pudo cargar el dashboard." />;

  const kpis = dashboard?.kpis;
  const pp = dashboard?.porPropietario;
  const alertasList = alertasData?.alertas?.slice(0, 6) || [];

  // Determinar qué bloque de porPropietario corresponde según la vista y el usuario logueado
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const getPropietarioData = () => {
    if (vista === 'total') return null;
    if (vista === 'mis_datos') return esCarlos ? pp?.carlos : pp?.juanCruz;
    if (vista === 'otro')     return esCarlos ? pp?.juanCruz : pp?.carlos;
    return null;
  };

  const propData = getPropietarioData();

  // KPIs: si hay datos de propietario específico, usar esos; si es "total", usar kpis globales
  const palletsMes        = propData ? (propData.pallets ?? 0)               : (kpis?.palletsMesActual    ?? 0);
  const facturacionMes    = propData ? (propData.facturacion ?? 0)            : (kpis?.facturacionMesActual ?? 0);
  const palletsMesAnt     = propData ? (propData.palletsMesAnterior ?? 0)     : (kpis?.palletsMesAnterior   ?? 0);
  const facturacionMesAnt = propData ? (propData.facturacionMesAnterior ?? 0) : (kpis?.facturacionMesAnterior ?? 0);
  const cotizacionesVal   = propData ? (propData.cotizacionesPendientes ?? 0) : (kpis?.cotizacionesPendientes ?? 0);

  const variacionPallets = palletsMesAnt > 0 ? Math.round(((palletsMes - palletsMesAnt) / palletsMesAnt) * 100) : 0;
  const variacionFact    = facturacionMesAnt > 0 ? Math.round(((facturacionMes - facturacionMesAnt) / facturacionMesAnt) * 100) : 0;

  const ganancias = gananciasData?.ganancias ?? 0;
  const grafico   = graficoData ?? dashboard?.graficos?.ventasUltimos12Meses ?? [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">
            Bienvenido, {usuario?.nombre}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {new Date().toLocaleDateString('es-AR', {
              weekday: 'long', year: 'numeric',
              month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownVista />
          {alertasData && alertasData.alta > 0 && (
            <button onClick={() => navigate('/alertas')} className="btn-brand-sm">
              <AlertTriangle size={13} />
              {alertasData.alta} alerta{alertasData.alta > 1 ? 's' : ''} urgente{alertasData.alta > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* KPIs fila 1 — 4 tarjetas */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          titulo="Pallets este mes"
          valor={formatNumero(palletsMes)}
          variacion={variacionPallets}
          subtitulo={`${formatNumero(palletsMesAnt)} el mes pasado`}
          icono={<Package size={18} />}
          onClick={() => navigate('/ventas')}
        />
        <KpiCard
          titulo="Facturación del mes"
          valor={formatPesos(facturacionMes)}
          variacion={variacionFact}
          subtitulo={`${formatPesos(facturacionMesAnt)} el mes pasado`}
          icono={<DollarSign size={18} />}
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          titulo="Ganancias del mes"
          valor={formatPesos(ganancias)}
          subtitulo={gananciasData ? `Compras: ${formatPesos(gananciasData.costoCompras)}` : 'Calculando...'}
          icono={<TrendingUp size={18} />}
          onClick={() => navigate('/reportes')}
        />
        <KpiCard
          titulo="Cotizaciones activas"
          valor={cotizacionesVal}
          subtitulo="Enviadas o en seguimiento"
          icono={<FileText size={18} />}
          onClick={() => navigate('/cotizaciones')}
        />
      </div>

      {/* Accesos rápidos — 3 tarjetas */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/clientes?nuevo=true')}
          className="text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer p-4"
          style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)', borderRadius: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-white/20 flex items-center justify-center text-white shrink-0">
              <Users size={15} />
            </div>
            <p className="flex-1 text-white font-semibold" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontStyle: 'italic' }}>Nuevo cliente</p>
          </div>
          <p className="text-sm text-white/70">Alta de cliente y asignación de contacto</p>
          <div className="flex items-center gap-1 mt-3 text-xs font-medium text-white/90">
            <Plus size={12} /> Crear ahora
          </div>
        </button>

        <button
          onClick={() => navigate('/cotizaciones?nueva=true')}
          className="text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer p-4"
          style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)', borderRadius: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-white/20 flex items-center justify-center text-white shrink-0">
              <FileText size={15} />
            </div>
            <p className="flex-1 text-white font-semibold" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontStyle: 'italic' }}>Nueva cotización</p>
          </div>
          <p className="text-sm text-white/70">Generá un presupuesto para un cliente</p>
          <div className="flex items-center gap-1 mt-3 text-xs font-medium text-white/90">
            <Plus size={12} /> Crear ahora
          </div>
        </button>

        <button
          onClick={() => navigate('/facturacion?cobro=true')}
          className="text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer p-4"
          style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)', borderRadius: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-white/20 flex items-center justify-center text-white shrink-0">
              <DollarSign size={15} />
            </div>
            <p className="flex-1 text-white font-semibold" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontStyle: 'italic' }}>Registrar cobro</p>
          </div>
          <p className="text-sm text-white/70">Marcá facturas como cobradas o parciales</p>
          <div className="flex items-center gap-1 mt-3 text-xs font-medium text-white/90">
            <ArrowRight size={12} /> Ver pendientes
          </div>
        </button>
      </div>

      {/* Gráfico (70%) + Alertas (30%) */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">

        {/* Gráfico 12 meses */}
        <div className="xl:col-span-7 card-base">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
              <TrendingUp size={18} />
            </div>
            <h2 className="titulo-seccion">
              Ventas — Últimos 12 meses · <span className="font-normal text-gray-400">{vistaLabel}</span>
            </h2>
          </div>
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
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB', fontFamily: 'Inter' }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="pallets" radius={[4, 4, 0, 0]} fill="url(#colorBrand)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alertas activas */}
        <div className="xl:col-span-3 card-base flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                <AlertTriangle size={18} />
              </div>
              <h2 className="titulo-seccion">Alertas activas</h2>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '260px' }}>
            {loadingAlertas ? (
              <LoadingSpinner text="Cargando..." />
            ) : alertasList.length === 0 ? (
              <div className="text-center py-8">
                <p className="titulo-card" style={{ color: '#9CA3AF' }}>Sin alertas activas</p>
                <p className="text-xs mt-1" style={{ color: '#D1D5DB' }}>El sistema está funcionando correctamente</p>
              </div>
            ) : (
              alertasList.map((alerta, i) => (
                <AlertaItem
                  key={i}
                  urgencia={alerta.urgencia}
                  titulo={alerta.titulo}
                  detalle={alerta.detalle}
                  onClick={() => navigate(
                    alerta.referencia?.tipo === 'factura'    ? '/facturacion' :
                    alerta.referencia?.tipo === 'cotizacion' ? '/cotizaciones' :
                    alerta.referencia?.tipo === 'venta'      ? '/ventas' :
                    '/inventario'
                  )}
                />
              ))
            )}
          </div>

          <div className="pt-3 mt-auto border-t border-gray-50">
            <button
              onClick={() => navigate('/alertas')}
              className="w-full text-center text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
              style={{ color: '#6B3A2A' }}
            >
          Ver todas las alertas →
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
