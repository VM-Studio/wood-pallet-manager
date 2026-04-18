import { useState } from 'react';
import { X, DollarSign, Pencil, Check, TrendingUp, TrendingDown, History } from 'lucide-react';
import { useEscalonesProducto, useHistorialPrecios, useCrearPrecio } from '../../hooks/useProductos';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

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
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function PreciosModal({ productoId, productoNombre, onClose }: PreciosModalProps) {
  const { data: escalonesData, isLoading } = useEscalonesProducto(productoId) as { data: EscalonesData | undefined; isLoading: boolean };
  const { data: historial } = useHistorialPrecios(productoId) as { data: HistorialEntry[] | undefined };
  const crearPrecio = useCrearPrecio();

  const [editando, setEditando] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Precio vigente = primer escalón (precio general por unidad)
  const precioVigente = escalonesData?.escalones?.[0]?.precioUnitario ?? null;

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const valor = parseFloat(nuevoPrecio);
    if (!valor || valor <= 0) { setError('Ingresá un precio válido'); return; }
    try {
      await crearPrecio.mutateAsync({
        productoId,
        cantMinima: 1,
        precioUnitario: valor,
        bonificaFlete: false,
        observaciones: motivo || undefined,
      });
      setSuccess('Precio actualizado correctamente');
      setEditando(false);
      setNuevoPrecio('');
      setMotivo('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al guardar el precio');
    }
  };

  const handleCancelar = () => {
    setEditando(false);
    setNuevoPrecio('');
    setMotivo('');
    setError('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up">

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <DollarSign size={18} style={{ color: '#6B3A2A' }} />
            Precio — {productoNombre}
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <div className="modal-body space-y-6">

          {/* ── Precio vigente ── */}
          <div>
            <p className="label">Precio por unidad</p>
            {isLoading ? (
              <LoadingSpinner />
            ) : !editando ? (
              <div
                className="flex items-center justify-between p-4 border"
                style={{ borderRadius: '0.25rem', borderColor: '#C4895A', background: '#FDF6EE' }}
              >
                <div>
                  {precioVigente != null ? (
                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6B3A2A', lineHeight: 1 }}>
                      {formatPesos(precioVigente)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin precio asignado</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Precio general · aplica a todos los clientes</p>
                </div>
                <button
                  onClick={() => {
                    setNuevoPrecio(precioVigente ? String(precioVigente) : '');
                    setEditando(true);
                    setSuccess('');
                  }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                    color: 'white', fontWeight: 500, fontSize: '0.875rem',
                    padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Pencil size={14} />
                  {precioVigente != null ? 'Editar precio' : 'Asignar precio'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleGuardar}>
                <div
                  className="p-4 border space-y-3"
                  style={{ borderRadius: '0.25rem', borderColor: '#C4895A', background: '#FDF6EE' }}
                >
                  <div>
                    <label className="label">Nuevo precio por unidad ($)</label>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      value={nuevoPrecio}
                      onChange={e => setNuevoPrecio(e.target.value)}
                      className="input"
                      style={{ borderRadius: '0.25rem', fontSize: '1.1rem', fontWeight: 600 }}
                      placeholder="Ej: 5500"
                      autoFocus
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Motivo del cambio <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input
                      type="text"
                      value={motivo}
                      onChange={e => setMotivo(e.target.value)}
                      className="input"
                      style={{ borderRadius: '0.25rem' }}
                      placeholder="Ej: Aumento de materiales, descuento especial..."
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2"
                      style={{ borderRadius: '0.25rem' }}>{error}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCancelar}
                      style={{
                        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
                        fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem',
                        borderRadius: '0.25rem', cursor: 'pointer'
                      }}
                    >Cancelar</button>
                    <button
                      type="submit"
                      disabled={crearPrecio.isPending}
                      style={{
                        flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                        color: 'white', fontWeight: 500, fontSize: '0.875rem',
                        padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
                        cursor: crearPrecio.isPending ? 'not-allowed' : 'pointer',
                        opacity: crearPrecio.isPending ? 0.6 : 1
                      }}
                    >
                      <Check size={14} />
                      {crearPrecio.isPending ? 'Guardando...' : 'Guardar precio'}
                    </button>
                  </div>
                </div>
              </form>
            )}
            {success && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 mt-2"
                style={{ borderRadius: '0.25rem' }}>{success}</p>
            )}
          </div>

          {/* ── Historial de precios ── */}
          <div>
            <p className="label flex items-center gap-1.5">
              <History size={14} className="text-gray-400" />
              Historial de precios
            </p>
            {!historial?.length ? (
              <div className="py-6 text-center">
                <p className="text-sm text-gray-400 italic">Todavía no hay cambios de precio registrados</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {historial.map(h => {
                  const subio = h.precioNuevo > h.precioAnterior;
                  const pct = h.precioAnterior > 0
                    ? Math.abs(Math.round(((h.precioNuevo - h.precioAnterior) / h.precioAnterior) * 100))
                    : 0;
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-3 border border-gray-100 bg-gray-50"
                      style={{ borderRadius: '0.25rem' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 28, height: 28, borderRadius: '0.25rem', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            background: subio ? '#FEF2F2' : '#F0FDF4',
                            color: subio ? '#DC2626' : '#16A34A'
                          }}
                        >
                          {subio ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 line-through">{formatPesos(h.precioAnterior)}</span>
                            <span className="text-sm font-semibold text-gray-900">{formatPesos(h.precioNuevo)}</span>
                            <span
                              className="text-xs font-semibold px-1.5 py-0.5"
                              style={{
                                borderRadius: '0.25rem',
                                background: subio ? '#FEF2F2' : '#F0FDF4',
                                color: subio ? '#DC2626' : '#16A34A'
                              }}
                            >
                              {subio ? '+' : '-'}{pct}%
                            </span>
                          </div>
                          {h.motivo && <p className="text-xs text-gray-400 mt-0.5">{h.motivo}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-gray-400">{formatFecha(h.fechaCambio)}</p>
                        {h.registradoPor && (
                          <p className="text-xs text-gray-300">{h.registradoPor.nombre}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

