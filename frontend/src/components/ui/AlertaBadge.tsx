import { AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react'

interface AlertaBadgeProps {
  /** nuevo: tipo/urgencia de la alerta */
  tipo?: 'critica' | 'alta' | 'media' | 'baja' | string
  /** alias legacy del Dashboard */
  urgencia?: 'critica' | 'alta' | 'media' | 'baja' | string
  /** nuevo: texto del mensaje */
  mensaje?: string
  /** legacy: título corto */
  titulo?: string
  /** legacy: detalle largo */
  detalle?: string
  fecha?: string
  onClick?: () => void
}

const cfgMap: Record<string, { icon: typeof XCircle; cls: string; label: string }> = {
  critica: { icon: XCircle,        cls: 'badge-red',    label: 'Crítica' },
  alta:    { icon: AlertTriangle,  cls: 'badge-yellow', label: 'Alta' },
  media:   { icon: Info,           cls: 'badge-blue',   label: 'Media' },
  baja:    { icon: CheckCircle,    cls: 'badge-gray',   label: 'Baja' },
}

export default function AlertaBadge({ tipo, urgencia, mensaje, titulo, detalle, fecha, onClick }: AlertaBadgeProps) {
  const nivel = tipo ?? urgencia ?? 'media'
  const c = cfgMap[nivel] ?? cfgMap.media
  const Icon = c.icon
  const texto = mensaje ?? (titulo ? `${titulo}${detalle ? ` — ${detalle}` : ''}` : '')

  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-gray-50 last:border-b-0 ${onClick ? 'cursor-pointer hover:bg-gray-50 rounded-xl px-2 -mx-2 transition-colors' : ''}`}
      onClick={onClick}
    >
      <span className={c.cls}>
        <Icon className="w-3 h-3" />
        {c.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-700 leading-snug">{texto}</p>
        {fecha && <p className="text-xs text-gray-400 mt-0.5">{fecha}</p>}
      </div>
    </div>
  )
}
