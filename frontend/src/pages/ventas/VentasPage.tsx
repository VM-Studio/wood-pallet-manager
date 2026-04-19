import { useState } from 'react';
import { Eye, Search, ShoppingCart, CheckCircle, Package, Truck, Building2, Trash2 } from 'lucide-react';
import { useVentas, useVentasActivas, useEliminarVenta } from '../../hooks/useVentas';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import VentaDetalle from './VentaDetalle';

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const ESTADOS = [
  'todos', 'entregado', 'cancelado'
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
  const eliminarVenta = useEliminarVenta();
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [ventaSeleccionada, setVentaSeleccionada] = useState<number | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null);

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

  if (isLoading) return <LoadingSpinner text="Cargando ventas..." />;
  if (isError) return <ErrorMessage message="No se pudieron cargar las ventas." />;

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Ventas</h1>
          <p className="text-sm text-gray-600 mt-1">Seguimiento de pedidos, entregas y retiros parciales</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <ShoppingCart size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{activas?.length || 0}</p>
            <p className="text-xs text-gray-500">Pedidos activos</p>
          </div>
        </div>
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#FEF3E2', borderRadius: '0.25rem' }}>
            <CheckCircle size={18} style={{ color: '#C4895A' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{entregadas}</p>
            <p className="text-xs text-gray-500">Entregados</p>
          </div>
        </div>
        <div className="card-kpi flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{ background: '#F3EDE8', borderRadius: '0.25rem' }}>
            <Package size={18} style={{ color: '#6B3A2A' }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalPallets}</p>
            <p className="text-xs text-gray-500">Pallets totales</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card-base space-y-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Buscar cliente, CUIT o N° venta..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setEstadoFiltro(e)}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: '0.25rem',
                transition: 'all 0.15s',
                border: 'none',
                cursor: 'pointer',
                background: estadoFiltro === e
                  ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                  : '#F3F4F6',
                color: estadoFiltro === e ? '#fff' : '#4B5563',
              }}
            >
              {estadoLabel[e]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
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
            ) : filtradas.map(v => (
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
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Ver detalle"
                    >
                      <Eye size={15} />
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
