import { useState } from 'react';
import { Plus, Search, Eye, AlertTriangle, TrendingDown } from 'lucide-react';
import { useCompras, useDeudaProveedores } from '../../hooks/useCompras';
import { useAuthStore } from '../../store/auth.store';
import NuevaCompra from './NuevaCompra';
import CompraDetalle from './CompraDetalle';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

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

  if (isLoading) return <LoadingSpinner text="Cargando compras..." />;
  if (isError)  return <ErrorMessage message="No se pudieron cargar las compras." />;

  return (
    <div className="animate-fade-in space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Compras</h1>
          <p className="text-sm text-gray-600 mt-1">{compras?.length ?? 0} compras registradas</p>
        </div>
        <button
          onClick={() => setShowNueva(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <Plus size={16} /> Nueva compra
        </button>
      </div>

      {/* Deuda con proveedores */}
      {deuda && deuda.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deuda.map(d => (
            <div
              key={d.proveedor.id}
              className="card-base flex items-center gap-4"
              style={d.deudaTotal > 0 ? { borderLeft: '4px solid #F59E0B' } : undefined}
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0"
                style={{ background: '#FFFBEB', borderRadius: '0.25rem' }}>
                <TrendingDown size={18} className="text-amber-600" />
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
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200"
          style={{ borderRadius: '0.25rem' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-700">Deuda total con proveedores</p>
          </div>
          <p className="text-lg font-bold text-amber-700">{formatPesos(deudaTotal)}</p>
        </div>
      )}

      {/* Nota de rol */}
      {!esCarlos && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200"
          style={{ borderRadius: '0.25rem' }}>
          <AlertTriangle size={14} className="text-blue-600 shrink-0 mt-0.5" />
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
            className="input-field pl-10"
          />
        </div>
        <div className="flex border border-gray-200 overflow-hidden" style={{ borderRadius: '0.25rem' }}>
          {estadoFiltros.map((f, i) => (
            <button
              key={f.key}
              onClick={() => setFiltroEstado(f.key)}
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
                background: filtroEstado === f.key
                  ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                  : '#fff',
                color: filtroEstado === f.key ? '#fff' : '#6B7280',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
                cursor: 'pointer'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {!filtradas?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center mx-auto mb-3"
            style={{ borderRadius: '0.25rem' }}>
            <TrendingDown size={22} className="text-gray-400" />
          </div>
          <p className="titulo-card">Sin compras registradas</p>
          <p className="text-xs text-gray-400 mt-1">
            {busqueda ? 'Probá con otro término de búsqueda' : 'Registrá la primera con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="card-base" style={{ padding: 0, overflow: 'hidden' }}>
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
                      {c.esAnticipado ? 'Anticipada' : 'A pedido'}
                    </span>
                  </td>
                  <td className="text-xs text-gray-400">{formatFecha(c.fechaCompra)}</td>
                  <td>
                    <button
                      onClick={() => setCompraDetalle(c.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
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
