import { AlertCircle } from 'lucide-react'

interface Props { message?: string; onRetry?: () => void }

export default function ErrorMessage({ message = 'Ocurrió un error al cargar los datos', onRetry }: Props) {
  return (
    <div className="empty-state">
      <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <p className="text-gray-900 font-semibold mb-1">Error al cargar</p>
      <p className="text-gray-500 text-sm mb-5 max-w-xs">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary">
          Reintentar
        </button>
      )}
    </div>
  )
}
