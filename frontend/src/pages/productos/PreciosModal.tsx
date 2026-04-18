import { useState } from 'react';
import { X, Plus, TrendingUp, History, DollarSign } from 'lucide-react';
import { useEscalonesProducto, useHistorialPrecios, useCrearPrecio } from '../../hooks/useProductos';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { clsx } from 'clsx';

interface PreciosModalProps {
  productoId: number;
  productoNombre: string;
  onClose: () => void;
}

interface Escalon {
  id: number;
  cantMinima: number;
  cantMaxima?: number;
  precioUnitario: number;
  bonificaFlete: boolean;
}

interface EscalonesData {
  escalones?: Escalon[];
  precioCostoActual?: number;
}

interface HistorialEntry {
  id: number;
  precioAnterior: number;
  precioNuevo: number;
  motivo?: string;
  fechaCambio: string;
  registradoPor?: { nombre: string };
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

type Tab = 'escalones' | 'nuevo' | 'historial';

export default function PreciosModal({ productoId, productoNombre, onClose }: PreciosModalProps) {
  const { data: escalonesData, isLoading } = useEscalonesProducto(productoId) as { data: EscalonesData | undefined; isLoading: boolean };
  const { data: historial } = useHistorialPrecios(productoId) as { data: HistorialEntry[] | undefined };
  const crearPrecio = useCrearPrecio();
  const [tab, setTab] = useState<Tab>('escalones');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    cantMinima:     '',
    cantMaxima:     '',
    precioUnitario: '',
    bonificaFlete:  false,
    observaciones:  ''
  });

  const handleCrearEscalon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await crearPrecio.mutateAsync({
        productoId,
        cantMinima:     parseInt(form.cantMinima),
        cantMaxima:     form.cantMaxima ? parseInt(form.cantMaxima) : undefined,
        precioUnitario: parseFloat(form.precioUnitario),
        bonificaFlete:  form.bonificaFlete,
        observaciones:  form.observaciones || undefined
      });
      setSuccess('Escalón de precio creado correctamente');
      setForm({ cantMinima: '', cantMaxima: '', precioUnitario: '', bonificaFlete: false, observaciones: '' });
      setTab('escalones');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al crear el precio');
    }
  };

  const tabs = [
    { key: 'escalones' as Tab, label: '📊 Escalones actuales' },
    { key: 'nuevo'     as Tab, label: '➕ Nuevo escalón' },
    { key: 'historial' as Tab, label: '📋 Historial' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <div>
            <h2 className="modal-title flex items-center gap-2">
              <DollarSign size={18} className="text-[#16A34A]" />
              Precios — {productoNombre}
            </h2>
            {escalonesData?.precioCostoActual != null && (
              <p className="text-xs text-gray-400 mt-1">
                Costo del proveedor: {formatPesos(escalonesData.precioCostoActual)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === t.key
                  ? 'border-[#16A34A] text-[#16A34A]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">

          {/* Escalones actuales */}
          {tab === 'escalones' && (
            isLoading ? <LoadingSpinner /> : (
              <div className="space-y-3">
                {!escalonesData?.escalones?.length ? (
                  <div className="empty-state">
                    <div className="empty-icon"><DollarSign size={20} /></div>
                    <p className="text-sm font-semibold text-gray-700">Sin precios configurados</p>
                    <p className="text-sm text-gray-400 mt-1">Creá el primer escalón de precio</p>
                    <button onClick={() => setTab('nuevo')} className="btn-primary mt-4">
                      <Plus size={15} /> Agregar precio
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-2 px-1 mb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase">Desde</p>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Hasta</p>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Precio / u</p>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Flete</p>
                    </div>
                    {escalonesData.escalones.map((esc, i) => (
                      <div
                        key={esc.id}
                        className={clsx(
                          'grid grid-cols-4 gap-2 p-3 rounded-xl border items-center',
                          i === 0 ? 'border-[#16A34A]/30 bg-green-50' : 'border-gray-100 bg-gray-50'
                        )}
                      >
                        <p className="text-sm font-semibold text-gray-900">{esc.cantMinima} u</p>
                        <p className="text-sm text-gray-600">{esc.cantMaxima ? `${esc.cantMaxima} u` : '∞'}</p>
                        <div>
                          <p className="text-sm font-bold text-[#16A34A]">{formatPesos(esc.precioUnitario)}</p>
                          {escalonesData.precioCostoActual != null && (
                            <p className="text-xs text-gray-400">
                              Margen: {Math.round(((esc.precioUnitario - escalonesData.precioCostoActual) / escalonesData.precioCostoActual) * 100)}%
                            </p>
                          )}
                        </div>
                        <div>
                          {esc.bonificaFlete
                            ? <span className="badge-green text-xs">Bonificado</span>
                            : <span className="badge-gray text-xs">No incluye</span>
                          }
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setTab('nuevo')} className="btn-secondary w-full justify-center mt-2">
                      <Plus size={15} /> Agregar escalón
                    </button>
                  </>
                )}
              </div>
            )
          )}

          {/* Nuevo escalón */}
          {tab === 'nuevo' && (
            <form onSubmit={handleCrearEscalon} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs text-blue-700">
                  Los escalones definen el precio según la cantidad pedida. Ej: de 1 a 249 u → $5.500, de 250 a 399 u → $5.200 con flete bonificado.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cantidad mínima <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={form.cantMinima}
                    onChange={e => setForm({ ...form, cantMinima: e.target.value })}
                    className="input"
                    placeholder="Ej: 1"
                    required
                  />
                </div>
                <div>
                  <label className="label">Cantidad máxima</label>
                  <input
                    type="number"
                    min={1}
                    value={form.cantMaxima}
                    onChange={e => setForm({ ...form, cantMaxima: e.target.value })}
                    className="input"
                    placeholder="Vacío = sin límite"
                  />
                </div>
              </div>
              <div>
                <label className="label">Precio por unidad ($) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  value={form.precioUnitario}
                  onChange={e => setForm({ ...form, precioUnitario: e.target.value })}
                  className="input"
                  placeholder="Ej: 5500"
                  required
                />
                {form.precioUnitario && escalonesData?.precioCostoActual != null && (
                  <p className="text-xs text-gray-500 mt-1">
                    Margen estimado: {Math.round(((parseFloat(form.precioUnitario) - escalonesData.precioCostoActual) / escalonesData.precioCostoActual) * 100)}%
                  </p>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.bonificaFlete}
                  onChange={e => setForm({ ...form, bonificaFlete: e.target.checked })}
                  className="w-4 h-4 text-[#16A34A] rounded"
                />
                <span className="text-sm text-gray-700">🚛 Este escalón bonifica el flete</span>
              </label>
              <div>
                <label className="label">Observaciones</label>
                <input
                  type="text"
                  value={form.observaciones}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  className="input"
                  placeholder="Motivo del cambio..."
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">{error}</p>
              )}
              {success && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2.5 rounded-xl">{success}</p>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setTab('escalones')} className="btn-secondary flex-1 justify-center">
                  Cancelar
                </button>
                <button type="submit" disabled={crearPrecio.isPending} className="btn-primary flex-1 justify-center">
                  {crearPrecio.isPending ? 'Guardando...' : 'Crear escalón'}
                </button>
              </div>
            </form>
          )}

          {/* Historial */}
          {tab === 'historial' && (
            <div>
              {!historial?.length ? (
                <div className="empty-state">
                  <div className="empty-icon"><History size={20} /></div>
                  <p className="text-sm text-gray-500">Sin cambios de precio registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historial.map(h => (
                    <div key={h.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 line-through">{formatPesos(h.precioAnterior)}</span>
                          <TrendingUp size={14} className="text-gray-300" />
                          <span className="text-sm font-semibold text-gray-900">{formatPesos(h.precioNuevo)}</span>
                          <span className={clsx(
                            'text-xs font-medium',
                            h.precioNuevo > h.precioAnterior ? 'text-red-500' : 'text-green-600'
                          )}>
                            {h.precioNuevo > h.precioAnterior ? '↑' : '↓'}
                            {Math.abs(Math.round(((h.precioNuevo - h.precioAnterior) / h.precioAnterior) * 100))}%
                          </span>
                        </div>
                        {h.motivo && <p className="text-xs text-gray-400 mt-0.5">{h.motivo}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{formatFecha(h.fechaCambio)}</p>
                        {h.registradoPor && (
                          <p className="text-xs text-gray-300">{h.registradoPor.nombre}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
