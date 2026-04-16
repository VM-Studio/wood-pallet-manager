import { clsx } from 'clsx';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AlertaBadgeProps {
  urgencia: 'alta' | 'media' | 'baja';
  titulo: string;
  detalle: string;
  onClick?: () => void;
}

export default function AlertaBadge({ urgencia, titulo, detalle, onClick }: AlertaBadgeProps) {
  const config = {
    alta:  { bg: 'bg-red-50 border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    icono: <AlertCircle size={16} /> },
    media: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700',  badge: 'bg-amber-100 text-amber-700', icono: <AlertTriangle size={16} /> },
    baja:  { bg: 'bg-blue-50 border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',   icono: <Info size={16} /> },
  }[urgencia];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-3 rounded-lg border',
        config.bg,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity'
      )}
      onClick={onClick}
    >
      <div className={clsx('mt-0.5 shrink-0', config.text)}>
        {config.icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx('text-sm font-medium', config.text)}>{titulo}</p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{detalle}</p>
      </div>
      <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full shrink-0', config.badge)}>
        {urgencia}
      </span>
    </div>
  );
}
