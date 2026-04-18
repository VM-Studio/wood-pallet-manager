import React, { useState } from 'react';
import { X, Truck, Send } from 'lucide-react';
import { useCrearSolicitudLogistica } from '../../hooks/useSolicitudesLogistica';

interface SolicitudLogisticaModalProps {
  ventaId: number;
  clienteNombre?: string;
  onClose: () => void;
}

export default function SolicitudLogisticaModal({
  ventaId,
  clienteNombre,
  onClose,
}: SolicitudLogisticaModalProps) {
  const crear = useCrearSolicitudLogistica();
  const [form, setForm] = useState({
    fechaEntrega: '',
    cantidadUnidades: '',
    ubicacionEntrega: '',
    notas: '',
  });
  const [error, setError] = useState('');

  const btnBrown: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: crear.isPending ? '#9CA3AF' : 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
    color: 'white', fontWeight: 500, fontSize: '0.875rem',
    padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
    cursor: crear.isPending ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
  };

  const btnCancel: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
    fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem',
    borderRadius: '0.25rem', cursor: 'pointer',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.ubicacionEntrega.trim()) {
      setError('La ubicación de entrega es obligatoria');
      return;
    }
    try {
      await crear.mutateAsync({
        ventaId,
        fechaEntrega: form.fechaEntrega || undefined,
        cantidadUnidades: form.cantidadUnidades ? parseInt(form.cantidadUnidades) : undefined,
        ubicacionEntrega: form.ubicacionEntrega,
        notas: form.notas || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al enviar la solicitud');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal max-w-md animate-slide-up" style={{ borderRadius: '0.25rem' }}>

        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Truck size={18} style={{ color: '#6B3A2A' }} />
            Solicitar logística a Carlos
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">

            {/* Info venta */}
            <div className="p-3" style={{ background: '#FDF6EE', border: '1px solid #C4895A', borderRadius: '0.25rem' }}>
              <p className="text-sm font-medium" style={{ color: '#6B3A2A' }}>
                Venta #{ventaId}{clienteNombre ? ` · ${clienteNombre}` : ''}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tu solicitud llegará al panel de Carlos para que la coordine con el transportista.
              </p>
            </div>

            {/* Fecha de entrega */}
            <div>
              <label className="label">Fecha de entrega</label>
              <input
                type="date"
                value={form.fechaEntrega}
                onChange={e => setForm({ ...form, fechaEntrega: e.target.value })}
                className="input"
                style={{ borderRadius: '0.25rem' }}
              />
            </div>

            {/* Cantidad de unidades */}
            <div>
              <label className="label">Cantidad de unidades</label>
              <input
                type="number"
                min={1}
                value={form.cantidadUnidades}
                onChange={e => setForm({ ...form, cantidadUnidades: e.target.value })}
                placeholder="Ej: 200"
                className="input"
                style={{ borderRadius: '0.25rem' }}
              />
            </div>

            {/* Ubicación */}
            <div>
              <label className="label">Ubicación de entrega <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                type="text"
                value={form.ubicacionEntrega}
                onChange={e => setForm({ ...form, ubicacionEntrega: e.target.value })}
                placeholder="Ej: Av. Corrientes 1234, CABA"
                className="input"
                style={{ borderRadius: '0.25rem' }}
                required
              />
            </div>

            {/* Notas */}
            <div>
              <label className="label">Notas adicionales <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea
                value={form.notas}
                onChange={e => setForm({ ...form, notas: e.target.value })}
                className="input resize-none"
                style={{ borderRadius: '0.25rem' }}
                rows={2}
                placeholder="Instrucciones especiales, horario preferido..."
              />
            </div>

            {error && (
              <p className="text-sm px-3 py-2.5" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.25rem' }}>
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
            <button type="submit" disabled={crear.isPending} style={btnBrown}>
              <Send size={15} />
              {crear.isPending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
