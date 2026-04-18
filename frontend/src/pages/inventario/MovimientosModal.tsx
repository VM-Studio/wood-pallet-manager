import { X, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import { useMovimientosStock } from '../../hooks/useInventario';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { clsx } from 'clsx';

interface MovimientosModalProps {
  productoId?: number;
  productoNombre?: string;
  onClose: () => void;
}

interface Movimiento {
  id: number;
  tipoMovimiento: 'entrada' | 'salida' | 'ajuste';
  cantidad: number;
  motivo: string;
  fecha: string;
  stock?: {
    producto?: { nombre: string };
    proveedor?: { nombreEmpresa: string };
  };
  registradoPor?: { nombre: string };
}

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });

const motivoLabel: Record<string, string> = {
  venta:         '🛒 Venta',
  compra:        '📦 Compra',
  devolucion:    '↩️ Devolución',
  ajuste_manual: '🔧 Ajuste manual'
};

export default function MovimientosModal({ productoId, productoNombre, onClose }: MovimientosModalProps) {
  const { data: movimientos, isLoading } = useMovimientosStock(productoId) as {
    data: Movimiento[] | undefined;
    isLoading: boolean;
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Historial de movimientos</h2>
            {productoNombre && (
              <p className="text-sm text-gray-500 mt-1">{productoNombre}</p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <LoadingSpinner text="Cargando movimientos..." />
          ) : !movimientos?.length ? (
            <div className="empty-state">
              <div className="empty-icon"><RefreshCw size={20} /></div>
              <p className="text-sm text-gray-500">Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {movimientos.map(m => (
                <div
                  key={m.id}
                  className={clsx(
                    'flex items-center gap-4 p-3 rounded-xl border',
                    m.tipoMovimiento === 'entrada'
                      ? 'bg-green-50 border-green-100'
                      : m.tipoMovimiento === 'salida'
                      ? 'bg-red-50 border-red-100'
                      : 'bg-blue-50 border-blue-100'
                  )}
                >
                  <div className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    m.tipoMovimiento === 'entrada'
                      ? 'bg-green-100'
                      : m.tipoMovimiento === 'salida'
                      ? 'bg-red-100'
                      : 'bg-blue-100'
                  )}>
                    {m.tipoMovimiento === 'entrada'
                      ? <ArrowUp size={16} className="text-green-600" />
                      : m.tipoMovimiento === 'salida'
                      ? <ArrowDown size={16} className="text-red-600" />
                      : <RefreshCw size={16} className="text-blue-600" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {m.tipoMovimiento === 'entrada' ? '+' : m.tipoMovimiento === 'salida' ? '-' : '~'}
                        {m.cantidad} unidades
                      </p>
                      <span className="text-xs text-gray-500">
                        {motivoLabel[m.motivo] ?? m.motivo}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {m.stock?.producto?.nombre} · {m.stock?.proveedor?.nombreEmpresa}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">{formatFecha(m.fecha)}</p>
                    {m.registradoPor && (
                      <p className="text-xs text-gray-400">{m.registradoPor.nombre}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
