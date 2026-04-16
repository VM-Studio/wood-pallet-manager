import { clsx } from 'clsx';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  titulo: string;
  valor: string | number;
  variacion?: number;
  subtitulo?: string;
  icono: React.ReactNode;
  colorIcono?: string;
  onClick?: () => void;
}

export default function KpiCard({
  titulo,
  valor,
  variacion,
  subtitulo,
  icono,
  colorIcono = 'bg-primary-100 text-primary-600',
  onClick
}: KpiCardProps) {
  const tieneVariacion = variacion !== undefined;
  const esPositivo = variacion && variacion > 0;
  const esNegativo = variacion && variacion < 0;

  return (
    <div
      className={clsx('card', onClick && 'cursor-pointer hover:shadow-md transition-shadow')}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{titulo}</p>
          <p className="text-3xl font-bold text-gray-900">{valor}</p>
          {subtitulo && (
            <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>
          )}
          {tieneVariacion && (
            <div className={clsx(
              'flex items-center gap-1 mt-2 text-sm font-medium',
              esPositivo ? 'text-green-600' : esNegativo ? 'text-red-500' : 'text-gray-400'
            )}>
              {esPositivo ? <TrendingUp size={14} /> : esNegativo ? <TrendingDown size={14} /> : <Minus size={14} />}
              <span>{esPositivo ? '+' : ''}{variacion}% vs mes anterior</span>
            </div>
          )}
        </div>
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', colorIcono)}>
          {icono}
        </div>
      </div>
    </div>
  );
}
