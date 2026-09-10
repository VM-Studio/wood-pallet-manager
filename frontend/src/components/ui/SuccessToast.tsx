import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useToastStore } from '../../store/toast.store';

const AUTO_HIDE_MS = 4200;

// Toast de éxito reutilizable, con estilo acorde al resto de la app
// (paleta marrón/beige) y optimizado para mobile: fijo abajo, respeta el
// safe-area del iPhone y con tipografía/espaciado cómodos para tocar.
export default function SuccessToast() {
  const { message, submessage, hide } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, AUTO_HIDE_MS);
    return () => clearTimeout(t);
  }, [message, hide]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 'min(420px, calc(100vw - 2rem))',
        background: '#fff',
        border: '1px solid #BBF7D0',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
        padding: '0.875rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        animation: 'toastSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <style>{`
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>

      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle2 size={19} style={{ color: '#16A34A' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>{message}</p>
        {submessage && (
          <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.4 }}>{submessage}</p>
        )}
      </div>

      <button
        onClick={hide}
        aria-label="Cerrar"
        style={{
          flexShrink: 0, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', borderRadius: '0.375rem', color: '#9CA3AF', cursor: 'pointer',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
