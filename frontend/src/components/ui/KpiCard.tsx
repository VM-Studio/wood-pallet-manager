import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ReactNode } from 'react'

type Color = 'green' | 'teal' | 'amber' | 'blue' | 'red' | 'purple'

interface KpiCardProps {
  titulo: string
  valor: string | number
  subtitulo?: string
  /** nuevo nombre */
  icon?: ReactNode
  /** alias legacy */
  icono?: ReactNode
  /** nuevo nombre */
  tendencia?: number
  /** alias legacy */
  variacion?: number
  /** legacy – ignorado, el color se deduce de `color` */
  colorIcono?: string
  color?: Color
  onClick?: () => void
}

export default function KpiCard({
  titulo, valor, subtitulo,
  icon, icono,
  tendencia, variacion,
  color = 'green',
  onClick,
}: KpiCardProps) {
  const resolvedIcon = icon ?? icono
  const resolvedTrend = (() => {
    const t = tendencia ?? variacion
    if (t == null) return null
    return t > 0 ? 'up' : t < 0 ? 'down' : 'neutral'
  })()
  const resolvedNum = tendencia ?? variacion

  return (
    <div className={`kpi-card kpi-${color} pt-5 cursor-pointer`} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{titulo}</p>
        {resolvedIcon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            color === 'green'  ? 'bg-green-50  text-green-600' :
            color === 'teal'   ? 'bg-teal-50   text-teal-600' :
            color === 'amber'  ? 'bg-amber-50  text-amber-600' :
            color === 'blue'   ? 'bg-blue-50   text-blue-600' :
            color === 'red'    ? 'bg-red-50    text-red-600' :
                                 'bg-purple-50 text-purple-600'
          }`}>
            {resolvedIcon}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-2">{valor}</p>
      {(subtitulo || resolvedTrend) && (
        <div className="flex items-center gap-2">
          {resolvedTrend && (
            <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              resolvedTrend === 'up'   ? 'bg-green-50 text-green-700' :
              resolvedTrend === 'down' ? 'bg-red-50   text-red-700' :
                                         'bg-gray-100 text-gray-500'
            }`}>
              {resolvedTrend === 'up'   ? <TrendingUp className="w-3 h-3" /> :
               resolvedTrend === 'down' ? <TrendingDown className="w-3 h-3" /> :
                                          <Minus className="w-3 h-3" />}
              {resolvedNum != null && `${resolvedNum > 0 ? '+' : ''}${resolvedNum}%`}
            </span>
          )}
          {subtitulo && <p className="text-xs text-gray-400">{subtitulo}</p>}
        </div>
      )}
    </div>
  )
}
