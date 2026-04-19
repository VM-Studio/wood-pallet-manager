import { useState, useEffect } from 'react';
import { X, Truck, AlertCircle, User } from 'lucide-react';
import { useCrearLogistica } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';

interface NuevaLogisticaProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface VentaActiva {
  id: number;
  tipoEntrega: string;
  logistica?: unknown;
  fechaEstimEntrega?: string;
  cliente?: { razonSocial: string };
  detalles?: { id: number; cantidadPedida: number; producto?: { nombre: string } }[];
  usuario?: { nombre: string; apellido: string; rol: string };
}

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });

export default function NuevaLogistica({ onClose, onSuccess }: NuevaLogisticaProps) {
  const crearLogistica = useCrearLogistica();
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';

  const [ventas, setVentas] = useState<VentaActiva[]>([]);
  const [error, setError] = useState('');
  const [origenFiltro, setOrigenFiltro] = useState<'carlos' | 'juan'>('carlos');

  const [form, setForm] = useState({
    ventaId: 0,
    nombreTransportista: 'Transportes Rápido',
    telefonoTransp: '',
    fechaRetiroGalpon: '',
    horaRetiro: '',
    horaEstimadaEntrega: '',
    costoFlete: '',
    observaciones: ''
  });

  useEffect(() => {
    api.get('/ventas/activas').then(({ data }: { data: VentaActiva[] }) => {
      const ventasConEnvio = data.filter(v =>
        v.tipoEntrega === 'envio_woodpallet' && !v.logistica
      );
      setVentas(ventasConEnvio);
    });
  }, []);

  const ventasFiltradas = ventas.filter(v =>
    origenFiltro === 'carlos'
      ? v.usuario?.rol === 'propietario_carlos'
      : v.usuario?.rol === 'propietario_juancruz'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.ventaId) { setError('Seleccioná una venta'); return; }
    try {
      await crearLogistica.mutateAsync({
        ventaId: form.ventaId,
        nombreTransportista: form.nombreTransportista,
        telefonoTransp: form.telefonoTransp || undefined,
        fechaRetiroGalpon: form.fechaRetiroGalpon || undefined,
        costoFlete: form.costoFlete ? parseFloat(form.costoFlete) : undefined,
        observaciones: form.observaciones || undefined,
        horaRetiro: form.horaRetiro && form.fechaRetiroGalpon
          ? `${form.fechaRetiroGalpon}T${form.horaRetiro}:00`
          : undefined,
        horaEstimadaEntrega: form.horaEstimadaEntrega && form.fechaRetiroGalpon
          ? `${form.fechaRetiroGalpon}T${form.horaEstimadaEntrega}:00`
          : undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Error al crear la logística');
    }
  };

  // Juan Cruz no puede coordinar, solo enviar solicitudes
  if (!esCarlos) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white w-full max-w-md mx-4" style={{ borderRadius: '0.375rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Truck size={18} style={{ color: '#6B3A2A' }} />
              <h2 className="font-semibold text-gray-900">Coordinar entrega</h2>
            </div>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 flex items-center justify-center" style={{ background: '#FEF3E2', borderRadius: '0.375rem' }}>
              <AlertCircle size={24} style={{ color: '#C4895A' }} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-1">Solo Carlos coordina entregas</p>
              <p className="text-sm text-gray-500">
                Toda la logística está centralizada en Carlos. Enviále una solicitud y él la coordinará con el transportista.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-white"
              style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-xl mx-4" style={{ borderRadius: '0.375rem', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <Truck size={18} style={{ color: '#6B3A2A' }} />
            <h2 className="font-semibold text-gray-900">Coordinar entrega</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div className="px-5 py-4 space-y-4 flex-1">

            {/* Filtro de propietario */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Ventas de
              </label>
              <div className="flex gap-1 p-1" style={{ background: '#F3F4F6', borderRadius: '0.375rem' }}>
                <button
                  type="button"
                  onClick={() => { setOrigenFiltro('carlos'); setForm(f => ({ ...f, ventaId: 0 })); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-all"
                  style={origenFiltro === 'carlos'
                    ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                    : { color: '#6B7280' }
                  }
                >
                  <User size={13} /> Carlos
                </button>
                <button
                  type="button"
                  onClick={() => { setOrigenFiltro('juan'); setForm(f => ({ ...f, ventaId: 0 })); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-all"
                  style={origenFiltro === 'juan'
                    ? { background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: '#fff', borderRadius: '0.25rem' }
                    : { color: '#6B7280' }
                  }
                >
                  <User size={13} /> Juan Cruz
                </button>
              </div>
            </div>

            {/* Lista de ventas filtradas */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Venta a coordinar <span className="text-red-400">*</span>
              </label>
              {!ventasFiltradas.length ? (
                <div className="py-6 flex flex-col items-center justify-center text-center" style={{ background: '#F9FAFB', borderRadius: '0.25rem', border: '1px solid #E5E7EB' }}>
                  <Truck size={20} className="text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    No hay ventas pendientes de {origenFiltro === 'carlos' ? 'Carlos' : 'Juan Cruz'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Solo aparecen ventas con envío sin logística coordinada</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {ventasFiltradas.map(v => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, ventaId: v.id }))}
                      className="w-full text-left px-3 py-2.5 transition-all"
                      style={{
                        borderRadius: '0.25rem',
                        border: form.ventaId === v.id ? '1.5px solid #C4895A' : '1.5px solid #E5E7EB',
                        background: form.ventaId === v.id ? '#FEF3E2' : '#fff',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            #{v.id} — {v.cliente?.razonSocial}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {v.detalles?.map(d => `${d.producto?.nombre} (${d.cantidadPedida}u)`).join(' · ')}
                          </p>
                        </div>
                        {v.fechaEstimEntrega && (
                          <span className="text-xs text-gray-400 shrink-0">
                            {formatFecha(v.fechaEstimEntrega)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ height: '1px', background: '#F3F4F6' }} />

            {/* Transportista */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Transportista</label>
                <input
                  type="text"
                  value={form.nombreTransportista}
                  onChange={e => setForm({ ...form, nombreTransportista: e.target.value })}
                  className="input-field"
                  placeholder="Nombre del transportista"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Teléfono</label>
                <input
                  type="text"
                  value={form.telefonoTransp}
                  onChange={e => setForm({ ...form, telefonoTransp: e.target.value })}
                  className="input-field"
                  placeholder="11 1234 5678"
                />
              </div>
            </div>

            {/* Fecha y horas */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha de retiro del galpón</label>
              <input
                type="date"
                value={form.fechaRetiroGalpon}
                onChange={e => setForm({ ...form, fechaRetiroGalpon: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hora de retiro</label>
                <input
                  type="time"
                  value={form.horaRetiro}
                  onChange={e => setForm({ ...form, horaRetiro: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Hora est. de entrega</label>
                <input
                  type="time"
                  value={form.horaEstimadaEntrega}
                  onChange={e => setForm({ ...form, horaEstimadaEntrega: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {/* Costo flete */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Costo del flete ($)</label>
              <input
                type="number"
                min={0}
                value={form.costoFlete}
                onChange={e => setForm({ ...form, costoFlete: e.target.value })}
                className="input-field"
                placeholder="Ej: 165000"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input-field resize-none"
                rows={2}
                placeholder="Instrucciones especiales para la entrega..."
              />
            </div>

            {error && (
              <div className="px-3 py-2.5 text-sm text-red-600" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '0.25rem' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              style={{ borderRadius: '0.25rem' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearLogistica.isPending || !form.ventaId}
              className="px-4 py-2 text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.25rem' }}
            >
              {crearLogistica.isPending ? 'Coordinando...' : 'Coordinar entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
