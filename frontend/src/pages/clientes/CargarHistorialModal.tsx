import { useState } from 'react';
import { X, Plus, Trash2, History } from 'lucide-react';
import { useCargarHistorial } from '../../hooks/useClientes';
import { useProductos } from '../../hooks/useProductos';
import type { VentaHistoricaPayload } from '../../types';

interface Props {
  clienteId: number;
  razonSocial: string;
  onClose: () => void;
}

interface ProductoFila {
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  costoUnitario: string;
}

interface VentaFila {
  fechaVenta: string;
  tipoEntrega: string;
  incluyeIva: boolean;
  estadoCobro: string;
  montoCobrado: string;
  medioPago: string;
  fechaPago: string;
  observaciones: string;
  productos: ProductoFila[];
}

const ventaVacia = (): VentaFila => ({
  fechaVenta: '',
  tipoEntrega: 'retira_cliente',
  incluyeIva: true,
  estadoCobro: 'cobrada_total',
  montoCobrado: '',
  medioPago: 'transferencia',
  fechaPago: '',
  observaciones: '',
  productos: [{ productoId: '', cantidad: '', precioUnitario: '', costoUnitario: '' }],
});

export default function CargarHistorialModal({ clienteId, razonSocial, onClose }: Props) {
  const [ventas, setVentas] = useState<VentaFila[]>([ventaVacia()]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const cargarHistorial = useCargarHistorial(clienteId);
  const { data: productos = [] } = useProductos();

  const updateVenta = (i: number, campo: keyof VentaFila, valor: string | boolean) => {
    setVentas(prev => prev.map((v, idx) => idx === i ? { ...v, [campo]: valor } : v));
  };

  const addProducto = (i: number) => {
    setVentas(prev => prev.map((v, idx) =>
      idx === i ? { ...v, productos: [...v.productos, { productoId: '', cantidad: '', precioUnitario: '', costoUnitario: '' }] } : v
    ));
  };

  const removeProducto = (vi: number, pi: number) => {
    setVentas(prev => prev.map((v, idx) =>
      idx === vi ? { ...v, productos: v.productos.filter((_, pidx) => pidx !== pi) } : v
    ));
  };

  const updateProducto = (vi: number, pi: number, campo: keyof ProductoFila, valor: string) => {
    setVentas(prev => prev.map((v, idx) =>
      idx === vi ? {
        ...v,
        productos: v.productos.map((p, pidx) => pidx === pi ? { ...p, [campo]: valor } : p)
      } : v
    ));
  };

  const handleSubmit = async () => {
    setError('');
    // Validar
    for (let i = 0; i < ventas.length; i++) {
      const v = ventas[i];
      if (!v.fechaVenta) { setError(`Venta ${i + 1}: falta la fecha`); return; }
      for (let j = 0; j < v.productos.length; j++) {
        const p = v.productos[j];
        if (!p.productoId || !p.cantidad || !p.precioUnitario) {
          setError(`Venta ${i + 1}, producto ${j + 1}: faltan datos obligatorios`);
          return;
        }
      }
    }

    const payload: VentaHistoricaPayload[] = ventas.map(v => ({
      fechaVenta: v.fechaVenta,
      tipoEntrega: v.tipoEntrega,
      incluyeIva: v.incluyeIva,
      estadoCobro: v.estadoCobro as VentaHistoricaPayload['estadoCobro'],
      montoCobrado: v.montoCobrado ? Number(v.montoCobrado) : undefined,
      medioPago: v.medioPago || undefined,
      fechaPago: v.fechaPago || undefined,
      observaciones: v.observaciones || undefined,
      productos: v.productos.map(p => ({
        productoId: Number(p.productoId),
        cantidad: Number(p.cantidad),
        precioUnitario: Number(p.precioUnitario),
        costoUnitario: p.costoUnitario ? Number(p.costoUnitario) : undefined,
      })),
    }));

    try {
      await cargarHistorial.mutateAsync(payload);
      setExito(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al cargar el historial');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white shadow-2xl w-full max-w-3xl my-8" style={{ borderRadius: '0.25rem' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
              <History size={16} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Cargar historial histórico</h2>
              <p className="text-sm text-gray-500">{razonSocial}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {exito && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm font-medium">
              ✓ Historial cargado correctamente
            </div>
          )}

          {ventas.map((venta, vi) => (
            <div key={vi} className="border border-gray-200 rounded p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Venta {vi + 1}</h3>
                {ventas.length > 1 && (
                  <button
                    onClick={() => setVentas(v => v.filter((_, i) => i !== vi))}
                    className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Eliminar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de venta *</label>
                  <input type="date" value={venta.fechaVenta} onChange={e => updateVenta(vi, 'fechaVenta', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: '0.25rem' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo entrega</label>
                  <select value={venta.tipoEntrega} onChange={e => updateVenta(vi, 'tipoEntrega', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: '0.25rem' }}>
                    <option value="retira_cliente">Retira cliente</option>
                    <option value="envio_woodpallet">Envío WoodPallet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Estado cobro</label>
                  <select value={venta.estadoCobro} onChange={e => updateVenta(vi, 'estadoCobro', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: '0.25rem' }}>
                    <option value="cobrada_total">Cobrada total</option>
                    <option value="cobrada_parcial">Cobrada parcial</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
                {(venta.estadoCobro === 'cobrada_total' || venta.estadoCobro === 'cobrada_parcial') && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Monto cobrado</label>
                      <input type="number" value={venta.montoCobrado} onChange={e => updateVenta(vi, 'montoCobrado', e.target.value)}
                        className="input-field text-sm" style={{ borderRadius: '0.25rem' }} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Medio de pago</label>
                      <select value={venta.medioPago} onChange={e => updateVenta(vi, 'medioPago', e.target.value)}
                        className="input-field text-sm" style={{ borderRadius: '0.25rem' }}>
                        <option value="transferencia">Transferencia</option>
                        <option value="e_check">E-check</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de pago</label>
                      <input type="date" value={venta.fechaPago} onChange={e => updateVenta(vi, 'fechaPago', e.target.value)}
                        className="input-field text-sm" style={{ borderRadius: '0.25rem' }} />
                    </div>
                  </>
                )}
                <div className="md:col-span-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={venta.incluyeIva} onChange={e => updateVenta(vi, 'incluyeIva', e.target.checked)}
                      className="w-3.5 h-3.5" />
                    Precios con IVA incluido
                  </label>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                  <input type="text" value={venta.observaciones} onChange={e => updateVenta(vi, 'observaciones', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: '0.25rem' }} placeholder="Opcional..." />
                </div>
              </div>

              {/* Productos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Productos *</p>
                <div className="space-y-2">
                  {venta.productos.map((prod, pi) => (
                    <div key={pi} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select value={prod.productoId} onChange={e => updateProducto(vi, pi, 'productoId', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: '0.25rem' }}>
                          <option value="">Producto...</option>
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {productos.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" placeholder="Cant." value={prod.cantidad}
                          onChange={e => updateProducto(vi, pi, 'cantidad', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: '0.25rem' }} />
                      </div>
                      <div className="col-span-3">
                        <input type="number" placeholder="Precio unit." value={prod.precioUnitario}
                          onChange={e => updateProducto(vi, pi, 'precioUnitario', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: '0.25rem' }} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" placeholder="Costo (opt.)" value={prod.costoUnitario}
                          onChange={e => updateProducto(vi, pi, 'costoUnitario', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: '0.25rem' }} />
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {venta.productos.length > 1 && (
                          <button onClick={() => removeProducto(vi, pi)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => addProducto(vi)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <Plus size={12} /> Agregar producto
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setVentas(v => [...v, ventaVacia()])}
            className="w-full border border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 text-sm py-2 rounded flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={14} /> Agregar otra venta
          </button>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#fff', color: '#374151',
              border: '1px solid #E5E7EB', fontWeight: 500,
              fontSize: '0.875rem', padding: '0.5rem 1rem',
              borderRadius: '0.25rem', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={cargarHistorial.isPending || exito}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)',
              color: 'white', fontWeight: 500,
              fontSize: '0.875rem', padding: '0.5rem 1rem',
              borderRadius: '0.25rem', border: 'none',
              cursor: cargarHistorial.isPending ? 'not-allowed' : 'pointer',
              opacity: cargarHistorial.isPending ? 0.6 : 1,
            }}
          >
            {cargarHistorial.isPending ? 'Cargando...' : `Cargar ${ventas.length} venta${ventas.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
