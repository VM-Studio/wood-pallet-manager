import { useState } from 'react';
import { X, AlertCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { useAjustarStock } from '../../hooks/useInventario';

interface AjusteStockModalProps {
  stockId: number;
  productoNombre: string;
  proveedorNombre: string;
  cantidadActual: number;
  onClose: () => void;
}

export default function AjusteStockModal({
  stockId,
  productoNombre,
  proveedorNombre,
  cantidadActual,
  onClose
}: AjusteStockModalProps) {
  const ajustar = useAjustarStock();
  const [nuevaCantidad, setNuevaCantidad] = useState(cantidadActual);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');

  const diferencia = nuevaCantidad - cantidadActual;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!motivo.trim()) { setError('El motivo del ajuste es obligatorio'); return; }
    if (nuevaCantidad < 0) { setError('La cantidad no puede ser negativa'); return; }
    try {
      await ajustar.mutateAsync({ stockId, nuevaCantidad, motivo });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al ajustar el stock');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-md animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">Ajuste manual de stock</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Info del producto */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-semibold text-gray-900 text-sm">{productoNombre}</p>
              <p className="text-xs text-gray-400 mt-0.5">{proveedorNombre}</p>
            </div>

            {/* Cantidad actual vs nueva */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Cantidad actual</p>
                <p className="text-xl font-bold text-gray-900">{cantidadActual}</p>
              </div>
              <div className="flex items-center justify-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  diferencia > 0 ? 'bg-green-100' : diferencia < 0 ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {diferencia > 0
                    ? <ArrowUp size={16} className="text-green-600" />
                    : diferencia < 0
                    ? <ArrowDown size={16} className="text-red-600" />
                    : <Minus size={16} className="text-gray-400" />
                  }
                </div>
              </div>
              <div className={`p-3 rounded-xl ${
                diferencia !== 0 ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}>
                <p className="text-xs text-gray-500 mb-1">Nueva cantidad</p>
                <p className={`text-xl font-bold ${diferencia !== 0 ? 'text-blue-700' : 'text-gray-900'}`}>
                  {nuevaCantidad}
                </p>
              </div>
            </div>

            {/* Diferencia */}
            {diferencia !== 0 && (
              <div className={`p-2.5 rounded-xl flex items-center gap-2 text-sm font-medium ${
                diferencia > 0
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {diferencia > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                {diferencia > 0
                  ? `Se agregarán ${diferencia} unidades`
                  : `Se quitarán ${Math.abs(diferencia)} unidades`}
              </div>
            )}

            {/* Input cantidad */}
            <div>
              <label className="label">Nueva cantidad en stock</label>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setNuevaCantidad(Math.max(0, nuevaCantidad - 1))}
                  className="btn-secondary w-10 h-10 shrink-0 justify-center p-0 text-lg font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={nuevaCantidad}
                  onChange={e => setNuevaCantidad(parseInt(e.target.value) || 0)}
                  className="input text-center text-lg font-bold"
                />
                <button
                  type="button"
                  onClick={() => setNuevaCantidad(nuevaCantidad + 1)}
                  className="btn-secondary w-10 h-10 shrink-0 justify-center p-0 text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Motivo */}
            <div>
              <label className="label">
                Motivo del ajuste <span className="text-red-500">*</span>
              </label>
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Ej: Corrección por conteo físico del galpón. Se encontraron 15 unidades dañadas..."
                required
              />
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                El ajuste queda registrado en el historial de movimientos con fecha, motivo y usuario.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              type="submit"
              disabled={ajustar.isPending || diferencia === 0}
              className="btn-primary"
            >
              {ajustar.isPending ? 'Ajustando...' : 'Confirmar ajuste'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
