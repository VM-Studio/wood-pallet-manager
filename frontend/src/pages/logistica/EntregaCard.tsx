import { Phone, MapPin, Package, Clock, CheckCircle, AlertCircle, Truck } from 'lucide-react';
import { useActualizarEstadoEntrega, useConfirmarEntregaCliente } from '../../hooks/useLogistica';
import { useAuthStore } from '../../store/auth.store';
import EstadoBadge from '../../components/ui/EstadoBadge';
import { clsx } from 'clsx';

interface DetalleVentaItem {
  id: number;
  cantidadPedida: number;
  producto?: { nombre: string };
}

interface LogisticaConVenta {
  id: number;
  ventaId: number;
  estadoEntrega: 'pendiente' | 'en_camino' | 'entregado' | 'con_problema';
  confTransportista: boolean;
  confCliente: boolean;
  costoFlete?: number;
  nombreTransportista?: string;
  telefonoTransp?: string;
  fechaRetiroGalpon?: string;
  horaRetiro?: string;
  horaEstimadaEntrega?: string;
  observaciones?: string;
  venta?: {
    cliente?: { razonSocial: string; direccionEntrega?: string; localidad?: string };
    detalles?: DetalleVentaItem[];
    usuario?: { nombre: string; apellido: string; rol: string };
  };
}

interface EntregaCardProps {
  logistica: LogisticaConVenta;
  compact?: boolean;
}

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const formatHora = (f: string) =>
  new Date(f).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const estadosOrden = ['pendiente', 'en_camino', 'entregado'] as const;

const estadoLabel: Record<string, string> = {
  en_camino: 'Marcar en camino',
  entregado: 'Confirmar entrega',
};

export default function EntregaCard({ logistica, compact = false }: EntregaCardProps) {
  const { usuario } = useAuthStore();
  const esCarlos = usuario?.rol === 'propietario_carlos';
  const actualizarEstado = useActualizarEstadoEntrega();
  const confirmarCliente = useConfirmarEntregaCliente();

  const siguienteEstado = (actual: string): string | null => {
    const idx = estadosOrden.indexOf(actual as typeof estadosOrden[number]);
    return idx >= 0 && idx < estadosOrden.length - 1 ? estadosOrden[idx + 1] : null;
  };

  const cliente = logistica.venta?.cliente;
  const detalles = logistica.venta?.detalles ?? [];
  const propietarioVenta = logistica.venta?.usuario;
  const next = siguienteEstado(logistica.estadoEntrega);

  return (
    <div className={clsx(
      'card-p',
      logistica.estadoEntrega === 'entregado'
        ? 'opacity-75'
        : logistica.estadoEntrega === 'con_problema'
        ? 'border-l-4 border-l-red-400'
        : logistica.estadoEntrega === 'en_camino'
        ? 'border-l-4 border-l-blue-400'
        : 'border-l-4 border-l-amber-400'
    )}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-bold text-gray-900">#{logistica.ventaId}</p>
            <EstadoBadge estado={logistica.estadoEntrega} />
            {propietarioVenta && (
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-lg font-medium',
                propietarioVenta.rol === 'propietario_carlos'
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-green-50 text-green-700'
              )}>
                {propietarioVenta.nombre}
              </span>
            )}
          </div>
          {cliente && (
            <p className="text-sm font-semibold text-gray-700">{cliente.razonSocial}</p>
          )}
        </div>
        {logistica.costoFlete != null && (
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{formatPesos(logistica.costoFlete)}</p>
            <p className="text-xs text-gray-400">flete</p>
          </div>
        )}
      </div>

      {/* Info de entrega */}
      {!compact && (
        <div className="space-y-1.5 mb-3">
          {cliente?.direccionEntrega && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin size={12} className="shrink-0" />
              <span>{cliente.direccionEntrega}{cliente.localidad && `, ${cliente.localidad}`}</span>
            </div>
          )}
          {logistica.nombreTransportista && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Truck size={12} className="shrink-0" />
              <span>{logistica.nombreTransportista}</span>
              {logistica.telefonoTransp && (
                <a href={`tel:${logistica.telefonoTransp}`}
                  className="text-[#16A34A] hover:underline flex items-center gap-1">
                  <Phone size={10} />
                  {logistica.telefonoTransp}
                </a>
              )}
            </div>
          )}
          {logistica.fechaRetiroGalpon && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock size={12} className="shrink-0" />
              <span>Retiro: {formatFecha(logistica.fechaRetiroGalpon)}</span>
              {logistica.horaRetiro && <span>{formatHora(logistica.horaRetiro)}</span>}
              {logistica.horaEstimadaEntrega && (
                <span>· Entrega est.: {formatHora(logistica.horaEstimadaEntrega)}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Productos */}
      {!compact && detalles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {detalles.map(d => (
            <span key={d.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100">
              <Package size={10} />
              {d.producto?.nombre} ({d.cantidadPedida}u)
            </span>
          ))}
        </div>
      )}

      {/* Confirmaciones */}
      <div className="flex gap-2 mb-3">
        <div className={clsx(
          'flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
          logistica.confTransportista ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
        )}>
          {logistica.confTransportista ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          Transportista
        </div>
        <div className={clsx(
          'flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium',
          logistica.confCliente ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-400'
        )}>
          {logistica.confCliente ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          Cliente
        </div>
      </div>

      {/* Acciones — solo Carlos */}
      {esCarlos && (
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          {next && (
            <button
              onClick={() => actualizarEstado.mutate({ ventaId: logistica.ventaId, estado: next })}
              disabled={actualizarEstado.isPending}
              className={clsx(
                'flex-1 justify-center text-sm',
                logistica.estadoEntrega === 'en_camino' ? 'btn-primary' : 'btn-secondary'
              )}
            >
              {estadoLabel[next]}
            </button>
          )}
          {logistica.estadoEntrega === 'entregado' && !logistica.confCliente && (
            <button
              onClick={() => confirmarCliente.mutate(logistica.ventaId)}
              disabled={confirmarCliente.isPending}
              className="flex-1 btn-secondary justify-center text-sm flex items-center gap-1.5"
            >
              <CheckCircle size={14} /> Confirmar recepción del cliente
            </button>
          )}
        </div>
      )}

      {/* Si no es Carlos: mensaje informativo */}
      {!esCarlos && logistica.estadoEntrega !== 'entregado' && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">Carlos gestiona el estado de esta entrega</p>
        </div>
      )}
    </div>
  );
}
