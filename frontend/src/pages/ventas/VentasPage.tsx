import { useState } from 'react';
import { Eye, Search } from 'lucide-react';
import { useVentas, useVentasActivas } from '../../hooks/useVentas';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import KpiCard from '../../components/ui/KpiCard';
import VentaDetalle from './VentaDetalle';
import { ShoppingCart, CheckCircle, Package } from 'lucide-react';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const ESTADOS = [
  'todos', 'confirmado', 'en_preparacion', 'listo_para_envio',
  'en_transito', 'entregado', 'entregado_parcial', 'cancelado'
];

const estadoLabel: Record<string, string> = {
  todos:             'Todos',
  confirmado:        'Confirmado',
  en_preparacion:    'En preparación',
  listo_para_envio:  'Listo para envío',
  en_transito:       'En tránsito',
  entregado:         'Entregado',
  entregado_parcial: 'Parcial',
  cancelado:         'Cancelado'
};

export default function VentasPage() {
  const { data: ventas, isLoading, isError } = useVentas();
  const { data: activas } = useVentasActivas();
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<number | null>(null);

  const filtradas = (ventas || []).filter(v => {
    const matchEstado = estadoFiltro === 'todos' || v.estadoPedido === estadoFiltro;
    const matchBusqueda = !busqueda ||
      v.cliente?.razonSocial?.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.cliente?.cuit?.includes(busqueda) ||
      String(v.id).includes(busqueda);
    return matchEstado && matchBusqueda;
  });

  const totalPallets = (ventas || []).reduce((acc, v) => {
    return acc + (v.detalles?.reduce((a, d) => a + d.cantidadPedida, 0) || 0);
  }, 0);
  const entregadas = (ventas || []).filter(v => v.estadoPedido === 'entregado').length;

  if (isLoading) return <div className="p-8"><LoadingSpinner text="Cargando ventas..." /></div>;
  if (isError) return <div className="p-8"><ErrorMessage message="No se pudieron cargar las ventas." /></div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Ventas</h1>
          <p className="page-subtitle">Seguimiento de pedidos, entregas y retiros parciales</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiCard
          titulo="Pedidos activos"
          valor={activas?.length || 0}
          icon={<ShoppingCart size={20} />}
          color="teal"
        />
        <KpiCard
          titulo="Entregados"
          valor={entregadas}
          icon={<CheckCircle size={20} />}
          color="green"
        />
        <KpiCard
          titulo="Pallets totales"
          valor={totalPallets}
          icon={<Package size={20} />}
          color="blue"
        />
      </div>

      {/* Filtros */}
      <div className="card-p mb-4 flex flex-wrap gap-3 items-center">
        <div className="input flex items-center gap-2 flex-1 min-w-50">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            className="bg-transparent outline-none text-sm w-full"
            placeholder="Buscar cliente, CUIT o N° venta..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map(e => (
            <button
              key={e}
              onClick={() => setEstadoFiltro(e)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                estadoFiltro === e
                  ? 'bg-[#16A34A] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {estadoLabel[e]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Fecha</th>
              <th>Entrega</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400">
                  No hay ventas con los filtros seleccionados
                </td>
              </tr>
            ) : filtradas.map(v => (
              <tr key={v.id} className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setVentaSeleccionada(v.id)}>
                <td className="font-mono text-xs text-gray-500">#{v.id}</td>
                <td>
                  <p className="font-semibold text-gray-900">{v.cliente?.razonSocial}</p>
                  <p className="text-xs text-gray-400">{v.cliente?.cuit}</p>
                </td>
                <td className="text-sm text-gray-600">{formatFecha(v.fechaVenta)}</td>
                <td>
                  <span className="text-xs text-gray-500">
                    {v.tipoEntrega === 'retira_cliente' ? '🏭 Retira' : '🚛 Envío'}
                  </span>
                  {v.fechaEstimEntrega && (
                    <p className="text-xs text-gray-400">{formatFecha(v.fechaEstimEntrega)}</p>
                  )}
                </td>
                <td><EstadoBadge estado={v.estadoPedido} /></td>
                <td className="text-right font-bold text-gray-900">
                  {formatPesos(v.totalConIva || 0)}
                </td>
                <td>
                  <button
                    onClick={e => { e.stopPropagation(); setVentaSeleccionada(v.id); }}
                    className="btn-icon"
                    title="Ver detalle"
                  >
                    <Eye size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ventaSeleccionada && (
        <VentaDetalle
          ventaId={ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
        />
      )}
    </div>
  );
}
