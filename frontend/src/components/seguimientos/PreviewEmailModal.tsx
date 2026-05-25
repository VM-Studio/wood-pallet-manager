import { X } from 'lucide-react';
import type { BloqueEmail } from '../../hooks/useSeguimientos';

interface Props {
  bloques: BloqueEmail[];
  onClose: () => void;
}

export default function PreviewEmailModal({ bloques, onClose }: Props) {
  const renderBloque = (b: BloqueEmail, i: number) => {
    switch (b.tipo) {
      case 'header':
        return (
          <div key={i} style={{ background: b.colorFondo ?? '#92400e', padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
              {b.contenido?.replace('{{nombre_cliente}}', 'Juan García') ?? ''}
            </p>
          </div>
        );
      case 'texto':
        return (
          <div key={i} style={{ padding: '16px 24px', fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
              {b.contenido?.replace('{{nombre_cliente}}', 'Juan García').replace('{{vendedor}}', 'Carlos') ?? ''}
            </p>
          </div>
        );
      case 'imagen':
        return (
          <div key={i} style={{ padding: '8px 24px' }}>
            <img src={b.url} alt="imagen" style={{ width: '100%', display: 'block' }} />
          </div>
        );
      case 'boton':
        return (
          <div key={i} style={{ padding: '16px 24px', textAlign: 'center' }}>
            <a
              href={b.url ?? '#'}
              style={{
                background: '#92400e', color: '#fff', padding: '10px 28px',
                textDecoration: 'none', fontWeight: 600, fontSize: '14px', display: 'inline-block'
              }}
            >
              {b.textoBoton ?? 'Ver más'}
            </a>
          </div>
        );
      case 'footer':
        return (
          <div key={i} style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 24px', textAlign: 'center' }}>
            <p style={{ color: '#9CA3AF', fontSize: '12px', margin: 0 }}>{b.contenido}</p>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Barra */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <p className="font-semibold text-sm text-gray-700">Vista previa del email</p>
          <button onClick={onClose}><X size={18} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Email simulado */}
        <div style={{ fontFamily: 'Inter, Arial, sans-serif', background: '#f3f4f6', padding: '20px' }}>
          <div style={{ maxWidth: '560px', margin: '0 auto', background: '#fff', border: '1px solid #e5e7eb' }}>
            {bloques.map((b, i) => renderBloque(b, i))}
          </div>
        </div>
      </div>
    </div>
  );
}
