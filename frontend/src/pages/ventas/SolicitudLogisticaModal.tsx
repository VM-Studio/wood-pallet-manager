import React, { useState } from 'react';
import { X, Truck, Send, CheckCircle } from 'lucide-react';
import { useConsultarLogistica } from '../../hooks/useLogistica';

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
  const consultar = useConsultarLogistica();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  const btnBrown: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: consultar.isPending ? '#9CA3AF' : 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
    color: 'white', fontWeight: 500, fontSize: '0.875rem',
    padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
    cursor: consultar.isPending ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
  };

  const btnCancel: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
    fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem',
    borderRadius: '0.25rem', cursor: 'pointer',
  };

  const handleSolicitar = async () => {
    setError('');
    try {
      await consultar.mutateAsync(ventaId);
      setEnviado(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al enviar la solicitud');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 60 }}>
      <div className="modal max-w-md animate-slide-up" style={{ borderRadius: '0.25rem' }}>

        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Truck size={18} style={{ color: '#6B3A2A' }} />
            Solicitar logística a Carlos
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body space-y-4">

          {enviado ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '1.5rem 0', textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle size={24} style={{ color: '#16A34A' }} />
              </div>
              <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', margin: 0 }}>
                Solicitud enviada correctamente
              </p>
              <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: 0 }}>
                Carlos puede ver esta solicitud en su panel de logística como <strong>pendiente</strong>.
                Te va a responder cuando la tenga coordinada.
              </p>
            </div>
          ) : (
            <>
              <div style={{ padding: '0.75rem', background: '#FDF6EE', border: '1px solid #C4895A', borderRadius: '0.25rem' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B3A2A', margin: '0 0 3px' }}>
                  Venta #{ventaId}{clienteNombre ? ` · ${clienteNombre}` : ''}
                </p>
                <p style={{ fontSize: '0.78rem', color: '#92400E', margin: 0 }}>
                  Al confirmar, Carlos recibirá esta consulta en su panel de logística y podrá coordinarte la entrega con el transportista.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  'Carlos verá la consulta como "Pendiente" en su panel',
                  'Podrá aceptarla o rechazarla con una respuesta',
                  'Verás el estado actualizado en tu sección de logística',
                ].map((txt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#6B3A2A', color: '#fff', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#374151', margin: 0 }}>{txt}</p>
                  </div>
                ))}
              </div>

              {error && (
                <p style={{ fontSize: '0.82rem', color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.25rem', padding: '0.5rem 0.75rem', margin: 0 }}>
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {enviado ? (
            <button onClick={onClose} style={btnBrown}>Cerrar</button>
          ) : (
            <>
              <button type="button" onClick={onClose} style={btnCancel}>Cancelar</button>
              <button onClick={handleSolicitar} disabled={consultar.isPending} style={btnBrown}>
                <Send size={15} />
                {consultar.isPending ? 'Enviando...' : 'Solicitar a Carlos'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


interface SolicitudLogisticaModalProps {
  ventaId: number;
  clienteNombre?: string;
  onClose: () => void;
}
