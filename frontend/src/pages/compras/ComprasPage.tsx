import { useState } from 'react';
import { Plus, Search, Eye, AlertTriangle, TrendingDown } from 'lucide-react';
import { useCompras, useDeudaProveedores } from '../../hooks/useCompras';
import { useAuthStore } from '../../store/auth.store';
import NuevaCompra from './NuevaCompra';
import CompraDetalle from './CompraDetalle';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

interface DeudaItem {
  proveedor: { id: number; nombreEmpresa: string };
  deudaTotal: number;
  comprasPendientes: number;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const estadoFiltros = [
  { key: 'todos',      label: 'Todas' },
  { key: 'solicitada', label: 'Solicitadas' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'recibida',   label: 'Recibidas' },
  { key: 'pagada',     label: 'Pagadas' },
];

export default function ComprasPage() {
  const { data: compras, isLoading, isError } = useCompras();
  const { data: deuda } = useDeudaProveedores() as { data: DeudaItem[] | undefined };
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [showNueva, setShowNueva] = useState(false);
  const [compraDetalle, setCompraDetalle] = useState<number | null>(null);

  const filtradas = compras?.filter(c => {
    const matchBusqueda =
      c.proveedor?.nombreEmpresa.toLowerCase().includes(busqueda.toLowerCase()) ||
      `#${c.id}`.includes(busqueda);
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const deudaTotal = deuda?.reduce((acc, d) => acc + d.deudaTotal, 0) ?? 0;

  if (isLoading) return <div className="p-8"><LoadingSpinner text="Cargando compras..." /></div>;
  if (isError)  return <div className="p-8"><ErrorMessage message="No se pudieron cargar las compras." /></div>;

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Compras</h1>
          <p className="page-subtitle">{compras?.length ?? 0} compras registradas</p>
        </div>
        <button onClick={() => setShowNueva(true)} className="btn-primary">
          <Plus size={18} /> Nueva compra
        </button>
      </div>

      {/* Deuda con proveedores */}
      {deuda && deuda.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deuda.map(d => (
            <div
              key={d.proveedor.id}
              className={clsx(
                'card-p flex items-center gap-4',
                d.deudaTotal > 0 && 'border-l-4 border-l-amber-400'
              )}
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <TrendingDown size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 text-sm">{d.proveedor.nombreEmpresa}</p>
                <p className="text-xs text-gray-400">
                  {d.comprasPendientes} compra{d.comprasPendientes > 1 ? 's' : ''} pendiente{d.comprasPendientes > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-600">{formatPesos(d.deudaTotal)}</p>
                <p className="text-xs text-gray-400">deuda actual</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total deuda */}
      {deudaTotal > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">Deuda total con proveedores</p>
          </div>
          <p className="text-lg font-bold text-amber-700">{formatPesos(deudaTotal)}</p>
        </div>
      )}

      {/* Nota de rol */}
      {!esCarlos && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
          <AlertTriangle size={15} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Las compras a Todo Pallets solo las puede crear Carlos. Podés registrar compras al Galpón Familiar.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por proveedor o número..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
          {estadoFiltros.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                filtroEstado === f.key
                  ? 'bg-[#16A34A] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {!filtradas?.length ? (
        <div className="empty-state">
          <div className="empty-icon"><TrendingDown size={24} /></div>
          <p className="text-sm font-semibold text-gray-700">Sin compras registradas</p>
          <p className="text-sm text-gray-400 mt-1">Registrá la primera con el botón de arriba</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Proveedor</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Tipo</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold text-gray-400 text-xs">#{c.id}</td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{c.proveedor?.nombreEmpresa}</p>
                    <p className="text-xs text-gray-400">{c.proveedor?.nombreContacto}</p>
                  </td>
                  <td>
                    <div className="space-y-0.5">
                      {c.detalles?.slice(0, 2).map(d => (
                        <p key={d.id} className="text-xs text-gray-600">
                          {d.producto?.nombre} — {d.cantidad} u
                        </p>
                      ))}
                      {(c.detalles?.length ?? 0) > 2 && (
                        <p className="text-xs text-gray-400">+{(c.detalles?.length ?? 0) - 2} más</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <p className="font-semibold text-gray-900 text-sm">{formatPesos(c.total ?? 0)}</p>
                  </td>
                  <td><EstadoBadge estado={c.estado} /></td>
                  <td>
                    <span className="text-xs text-gray-600">
                      {c.esAnticipado ? '📦 Anticipada' : '🔄 A pedido'}
                    </span>
                  </td>
                  <td className="text-xs text-gray-400">{formatFecha(c.fechaCompra)}</td>
                  <td>
                    <button
                      onClick={() => setCompraDetalle(c.id)}
                      className="btn-icon w-8 h-8 text-gray-400 hover:text-[#16A34A] hover:bg-green-50"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNueva && (
        <NuevaCompra
          onClose={() => setShowNueva(false)}
          onSuccess={() => setShowNueva(false)}
        />
      )}

      {compraDetalle && (
        <CompraDetalle
          compraId={compraDetalle}
          onClose={() => setCompraDetalle(null)}
        />
      )}
    </div>
  );
}
