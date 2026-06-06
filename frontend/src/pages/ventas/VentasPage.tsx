import { useState } from 'react';
import { Search, ShoppingCart, CheckCircle, Package, Truck, Building2, Trash2, XCircle } from 'lucide-react';
import { useVentas, useVentasActivas, useEliminarVenta } from '../../hooks/useVentas';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import Pagination from '../../components/ui/Pagination';
import VentaDetalle from './VentaDetalle';

const POR_PAGINA = 10;

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function VentasPage() {
  const { data: ventas, isLoading, isError } = useVentas();
  const { data: activas } = useVentasActivas();
  const eliminarVenta = useEliminarVenta();
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ventaSeleccionada, setVentaSeleccionada] = useState<number | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);

  const ESTADOS_ACTIVOS = ['confirmado', 'en_preparacion', 'listo_para_envio', 'en_transito', 'entregado_parcial'];

  const filtradas = (ventas || []).filter(v => {
    const matchEstado =
      estadoFiltro === 'todos' ||
      (estadoFiltro === 'activos' ? ESTADOS_ACTIVOS.includes(v.estadoPedido) : v.estadoPedido === estadoFiltro);
    const matchBusqueda = !busqueda ||
      v.cliente?.razonSocial?.toLowerCase().includes(busqueda.toLowerCase()) ||
      v.cliente?.cuit?.includes(busqueda) ||
      String(v.id).includes(busqueda);
    return matchEstado && matchBusqueda;
  });

  const ventasPaginadas = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const totalPallets = (ventas || []).reduce((acc, v) => {
    return acc + (v.detalles?.reduce((a, d) => a + d.cantidadPedida, 0) || 0);
  }, 0);
  const entregadas = (ventas || []).filter(v => v.estadoPedido === 'entregado').length;
  const canceladas = (ventas || []).filter(v => v.estadoPedido === 'cancelado').length;

  if (isLoading) return <LoadingSpinner text="Cargando ventas..." />;
  if (isError) return <ErrorMessage message="No se pudieron cargar las ventas." />;

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="titulo-modulo">Ventas</h1>
          <p className="text-sm text-gray-600 mt-1">Seguimiento de pedidos, entregas y retiros parciales</p>
        </div>
      </div>

      {/* KPIs — también funcionan como filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        {/* Pedidos activos */}
        <button
          onClick={() => { setEstadoFiltro(estadoFiltro === 'activos' ? 'todos' : 'activos'); setPagina(1); }}
          className="card-kpi text-left transition-all"
          style={{
            borderBottom: estadoFiltro === 'activos' ? '3px solid #7c4b2c' : '3px solid transparent',
            background: estadoFiltro === 'activos' ? '#FDF5F0' : '',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
              style={{ background: estadoFiltro === 'activos' ? '#7c4b2c' : '#F3F4F6' }}>
              <ShoppingCart size={16} style={{ color: estadoFiltro === 'activos' ? '#fff' : '#6B7280' }} />
            </div>
            <p className="titulo-card flex-1">Pedidos activos</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{activas?.length || 0}</p>
          <p className="text-xs text-gray-400 mt-1">en preparación o tránsito</p>
        </button>

        {/* Entregados */}
        <button
          onClick={() => { setEstadoFiltro(estadoFiltro === 'entregado' ? 'todos' : 'entregado'); setPagina(1); }}
          className="card-kpi text-left transition-all"
          style={{
            borderBottom: estadoFiltro === 'entregado' ? '3px solid #16A34A' : '3px solid transparent',
            background: estadoFiltro === 'entregado' ? '#F0FDF4' : '',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
              style={{ background: estadoFiltro === 'entregado' ? '#16A34A' : '#F3F4F6' }}>
              <CheckCircle size={16} style={{ color: estadoFiltro === 'entregado' ? '#fff' : '#6B7280' }} />
            </div>
            <p className="titulo-card flex-1">Entregados</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{entregadas}</p>
          <p className="text-xs text-gray-400 mt-1">ventas completadas</p>
        </button>

        {/* Pallets totales */}
        <button
          onClick={() => { setEstadoFiltro('todos'); setPagina(1); }}
          className="card-kpi text-left transition-all"
          style={{
            borderBottom: estadoFiltro === 'todos' ? '3px solid #6B7280' : '3px solid transparent',
            background: estadoFiltro === 'todos' ? '#F9FAFB' : '',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
              style={{ background: estadoFiltro === 'todos' ? '#6B7280' : '#F3F4F6' }}>
              <Package size={16} style={{ color: estadoFiltro === 'todos' ? '#fff' : '#6B7280' }} />
            </div>
            <p className="titulo-card flex-1">Pallets totales</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{totalPallets}</p>
          <p className="text-xs text-gray-400 mt-1">ver todos</p>
        </button>

        {/* Cancelados */}
        <button
          onClick={() => { setEstadoFiltro(estadoFiltro === 'cancelado' ? 'todos' : 'cancelado'); setPagina(1); }}
          className="card-kpi text-left transition-all"
          style={{
            borderBottom: estadoFiltro === 'cancelado' ? '3px solid #DC2626' : '3px solid transparent',
            background: estadoFiltro === 'cancelado' ? '#FEF2F2' : '',
            cursor: 'pointer',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0"
              style={{ background: estadoFiltro === 'cancelado' ? '#DC2626' : '#F3F4F6' }}>
              <XCircle size={16} style={{ color: estadoFiltro === 'cancelado' ? '#fff' : '#6B7280' }} />
            </div>
            <p className="titulo-card flex-1">Cancelados</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{canceladas}</p>
          <p className="text-xs text-gray-400 mt-1">ventas canceladas</p>
        </button>
      </div>

      {/* Buscador */}
      <div className="card-base">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Buscar cliente, CUIT o N° venta..."
            value={busqueda}
            onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
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
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  No hay ventas con los filtros seleccionados
                </td>
              </tr>
            ) : ventasPaginadas.map(v => (
              <tr key={v.id} className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setVentaSeleccionada(v.id)}>
                <td className="font-mono text-xs text-gray-400">#{v.id}</td>
                <td>
                  <p className="font-semibold text-gray-900 text-sm">{v.cliente?.razonSocial}</p>
                  <p className="text-xs text-gray-400">{v.cliente?.cuit}</p>
                </td>
                <td className="text-sm text-gray-600">{formatFecha(v.fechaVenta)}</td>
                <td>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    {v.tipoEntrega === 'retira_cliente'
                      ? <><Building2 size={11} /> Retira</>
                      : <><Truck size={11} /> Envío</>
                    }
                  </span>
                  {v.fechaEstimEntrega && (
                    <p className="text-xs text-gray-400 mt-0.5">{formatFecha(v.fechaEstimEntrega)}</p>
                  )}
                </td>
                <td><EstadoBadge estado={v.estadoPedido} /></td>
                <td className="text-right font-bold text-gray-900 text-sm">
                  {formatPesos(v.totalConIva || 0)}
                </td>
                <td>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={e => { e.stopPropagation(); setVentaSeleccionada(v.id); }}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-[#6B3A2A] hover:bg-[#9B5E3A] rounded transition-colors"
                    >
                      Detalle
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmEliminar(v.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Eliminar venta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination
          total={filtradas.length}
          pagina={pagina}
          porPagina={POR_PAGINA}
          onCambiar={setPagina}
          nombreItems="ventas"
        />
      </div>

      {ventaSeleccionada && (
        <VentaDetalle
          ventaId={ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
        />
      )}

      {/* Modal confirmar eliminación */}
      {confirmEliminar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Eliminar venta</p>
                <p className="text-sm text-gray-500">¿Seguro que querés eliminar la venta #{confirmEliminar}? Se borrarán también sus retiros, facturas y pagos asociados.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmEliminar(null)}
                className="px-4 py-2 text-sm rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  eliminarVenta.mutate(confirmEliminar);
                  setConfirmEliminar(null);
                }}
                className="px-4 py-2 text-sm rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
