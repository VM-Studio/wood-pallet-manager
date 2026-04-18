import { useState } from 'react';
import { X, Copy, Check, MessageCircle } from 'lucide-react';
import { useTextoWhatsApp } from '../../hooks/useCotizaciones';

interface WhatsAppModalProps {
  cotizacionId: number;
  onClose: () => void;
}

export default function WhatsAppModal({ cotizacionId, onClose }: WhatsAppModalProps) {
  const { data, isLoading } = useTextoWhatsApp(cotizacionId, true);
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    if (!data?.texto) return;
    await navigator.clipboard.writeText(data.texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <MessageCircle size={20} className="text-green-500" />
            Texto para WhatsApp
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="bg-[#ECF8EC] border border-green-200 rounded-xl p-4 mb-4">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {data?.texto}
                </pre>
              </div>
              <button
                onClick={copiar}
                className={`btn-primary w-full justify-center ${copiado ? 'bg-green-700' : ''}`}
              >
                {copiado
                  ? <><Check size={16} /> ¡Copiado!</>
                  : <><Copy size={16} /> Copiar texto</>
                }
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">
                Pegá este texto directamente en el chat de WhatsApp
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
