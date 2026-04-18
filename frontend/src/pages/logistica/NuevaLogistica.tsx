import { useState, useEffect } from 'react';
import { X, Truck, AlertCircle } from 'lucide-react';
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
}

export default function NuevaLogistica({ onClose, onSuccess }: NuevaLogisticaProps) {
  const crearLogistica = useCrearLogistica();
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const [ventas, setVentas] = useState<VentaActiva[]>([]);
  const [error, setError] = useState('');

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

  if (!esCarlos) {
    return (
      <div className="modal-overlay">
        <div className="modal max-w-md animate-slide-up">
          <div className="modal-header">
            <h2 className="modal-title">Coordinar entrega</h2>
            <button onClick={onClose} className="btn-icon"><X size={18} /></button>
          </div>
          <div className="modal-body">
            <div className="flex flex-col items-center text-center py-6 gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
                <AlertCircle size={24} className="text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-2">Solo Carlos puede coordinar entregas</p>
                <p className="text-sm text-gray-500">
                  Según la operatoria de Wood Pallet, toda la logística y coordinación
                  con el transportista está centralizada en Carlos.
                  Consultale a Carlos para coordinar esta entrega.
                </p>
              </div>
              <button onClick={onClose} className="btn-primary">Entendido</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Truck size={18} className="text-[#16A34A]" />
            Coordinar entrega
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Venta */}
            <div>
              <label className="label">
                Venta a entregar <span className="text-red-500">*</span>
              </label>
              {!ventas.length ? (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
                  <p className="text-sm text-gray-500">No hay ventas pendientes de entrega</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Las ventas aparecen cuando tienen tipo de entrega "Envío" y no tienen logística coordinada aún
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {ventas.map(v => (
                    <button key={v.id} type="button"
                      onClick={() => setForm({ ...form, ventaId: v.id })}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        form.ventaId === v.id
                          ? 'border-[#16A34A] bg-green-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            #{v.id} — {v.cliente?.razonSocial}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {v.detalles?.map(d => `${d.producto?.nombre} (${d.cantidadPedida}u)`).join(' · ')}
                          </p>
                        </div>
                        {v.fechaEstimEntrega && (
                          <span className="text-xs text-gray-400 shrink-0 ml-2">
                            {new Date(v.fechaEstimEntrega).toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Transportista */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Transportista</label>
                <input type="text" value={form.nombreTransportista}
                  onChange={e => setForm({ ...form, nombreTransportista: e.target.value })}
                  className="input" placeholder="Nombre del transportista" />
              </div>
              <div>
                <label className="label">Teléfono transportista</label>
                <input type="text" value={form.telefonoTransp}
                  onChange={e => setForm({ ...form, telefonoTransp: e.target.value })}
                  className="input" placeholder="11 1234 5678" />
              </div>
            </div>

            {/* Fecha y horas */}
            <div>
              <label className="label">Fecha de retiro del galpón</label>
              <input type="date" value={form.fechaRetiroGalpon}
                onChange={e => setForm({ ...form, fechaRetiroGalpon: e.target.value })}
                className="input" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Hora de retiro</label>
                <input type="time" value={form.horaRetiro}
                  onChange={e => setForm({ ...form, horaRetiro: e.target.value })}
                  className="input" />
              </div>
              <div>
                <label className="label">Hora estimada de entrega</label>
                <input type="time" value={form.horaEstimadaEntrega}
                  onChange={e => setForm({ ...form, horaEstimadaEntrega: e.target.value })}
                  className="input" />
              </div>
            </div>

            {/* Costo flete */}
            <div>
              <label className="label">Costo del flete ($)</label>
              <input type="number" min={0} value={form.costoFlete}
                onChange={e => setForm({ ...form, costoFlete: e.target.value })}
                className="input" placeholder="Ej: 165000" />
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none" rows={2}
                placeholder="Instrucciones especiales para la entrega..." />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearLogistica.isPending || !form.ventaId}
              className="btn-primary"
            >
              {crearLogistica.isPending ? 'Coordinando...' : 'Coordinar entrega'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
