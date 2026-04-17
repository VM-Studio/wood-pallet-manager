import { X, Package, FileText, DollarSign } from 'lucide-react';
import { useHistorialCliente } from '../../hooks/useClientes';
import EstadoBadge from '../../components/ui/EstadoBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface ClienteHistorialProps {
  clienteId: number;
  onClose: () => void;
}

const formatPesos = (valor: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor);

const formatFecha = (fecha: string) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function ClienteHistorial({ clienteId, onClose }: ClienteHistorialProps) {
  const { data, isLoading } = useHistorialCliente(clienteId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Historial — {data?.cliente?.razonSocial}
            </h2>
            {data?.cliente?.cuit && (
              <p className="text-sm text-gray-500">CUIT: {data.cliente.cuit}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Estadísticas */}
        {data?.estadisticas && (
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-xl mx-auto mb-2">
                <FileText size={18} className="text-primary-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.estadisticas.totalVentas}</p>
              <p className="text-xs text-gray-500">Compras realizadas</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-teal-100 rounded-xl mx-auto mb-2">
                <Package size={18} className="text-teal-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat('es-AR').format(data.estadisticas.totalPallets)}
              </p>
              <p className="text-xs text-gray-500">Pallets comprados</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-xl mx-auto mb-2">
                <DollarSign size={18} className="text-amber-600" />
              </div>
              <p className="text-xl font-bold text-gray-900">
                {formatPesos(data.estadisticas.totalFacturado)}
              </p>
              <p className="text-xs text-gray-500">Total facturado</p>
            </div>
          </div>
        )}

        {/* Historial de ventas */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <LoadingSpinner text="Cargando historial..." />
          ) : !data?.ventas?.length ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Sin compras registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.ventas.map((venta: {
                id: number;
                fechaVenta: string;
                tipoEntrega: string;
                requiereSenasa: boolean;
                estadoPedido: string;
                totalConIva?: number;
                detalles?: { id: number; producto?: { nombre: string }; cantidadPedida: number; subtotal: number }[];
                facturas?: { id: number; estadoCobro: string }[];
              }) => (
                <div key={venta.id} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Venta #{venta.id} — {formatFecha(venta.fechaVenta)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {venta.tipoEntrega === 'retira_cliente' ? '🏭 Retira en galpón' : '🚛 Entrega a domicilio'}
                        {venta.requiereSenasa && ' · 🌿 SENASA'}
                      </p>
                    </div>
                    <EstadoBadge estado={venta.estadoPedido} />
                  </div>
                  <div className="space-y-1">
                    {venta.detalles?.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                        <span>{d.producto?.nombre}</span>
                        <span className="font-medium">{d.cantidadPedida} u · {formatPesos(d.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <div className="flex gap-2">
                      {venta.facturas?.map((f) => (
                        <EstadoBadge key={f.id} estado={f.estadoCobro} />
                      ))}
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatPesos(venta.totalConIva || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
