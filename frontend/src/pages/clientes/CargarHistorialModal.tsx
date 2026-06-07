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
    <div className="fixed inset-0 flex items-start justify-center z-50 p-4 overflow-y-auto" style={{ background: 'rgba(30,10,5,0.55)' }}>
      <div className="bg-white shadow-2xl w-full max-w-3xl my-8" style={{ border: '1px solid #E8D5C4', borderRadius: 0 }}>

        {/* Header */}
        <div style={{ background: '#7c4b2c', padding: '1rem 1.5rem' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={16} style={{ color: '#fff' }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>Historial de cliente</p>
                <h2 className="font-bold" style={{ color: '#fff', fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontSize: '1.1rem' }}>
                  {razonSocial}
                </h2>
              </div>
            </div>
            <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.5)', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5" style={{ background: '#FDFAF7' }}>
          {exito && (
            <div className="border px-4 py-3 text-sm font-medium" style={{ background: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534', borderRadius: 0 }}>
              ✓ Historial cargado correctamente
            </div>
          )}

          {ventas.map((venta, vi) => (
            <div key={vi} className="border p-4 space-y-4" style={{ borderColor: '#E8D5C4', background: 'white', borderRadius: 0 }}>
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: '#E8D5C4' }}>
                <h3 className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#7c4b2c' }}>Venta {vi + 1}</h3>
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
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Fecha de venta *</label>
                  <input type="date" value={venta.fechaVenta} onChange={e => updateVenta(vi, 'fechaVenta', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: 0 }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Tipo entrega</label>
                  <select value={venta.tipoEntrega} onChange={e => updateVenta(vi, 'tipoEntrega', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: 0 }}>
                    <option value="retira_cliente">Retira cliente</option>
                    <option value="envio_woodpallet">Envío WoodPallet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Estado cobro</label>
                  <select value={venta.estadoCobro} onChange={e => updateVenta(vi, 'estadoCobro', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: 0 }}>
                    <option value="cobrada_total">Cobrada total</option>
                    <option value="cobrada_parcial">Cobrada parcial</option>
                    <option value="pendiente">Pendiente</option>
                  </select>
                </div>
                {(venta.estadoCobro === 'cobrada_total' || venta.estadoCobro === 'cobrada_parcial') && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Monto cobrado</label>
                      <input type="number" value={venta.montoCobrado} onChange={e => updateVenta(vi, 'montoCobrado', e.target.value)}
                        className="input-field text-sm" style={{ borderRadius: 0 }} placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Medio de pago</label>
                      <select value={venta.medioPago} onChange={e => updateVenta(vi, 'medioPago', e.target.value)}
                        className="input-field text-sm" style={{ borderRadius: 0 }}>
                        <option value="transferencia">Transferencia</option>
                        <option value="e_check">E-check</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Fecha de pago</label>
                      <input type="date" value={venta.fechaPago} onChange={e => updateVenta(vi, 'fechaPago', e.target.value)}
                        className="input-field text-sm" style={{ borderRadius: 0 }} />
                    </div>
                  </>
                )}
                <div className="md:col-span-3 flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: '#9B7E6A' }}>
                    <input type="checkbox" checked={venta.incluyeIva} onChange={e => updateVenta(vi, 'incluyeIva', e.target.checked)}
                      className="w-3.5 h-3.5" />
                    Precios con IVA incluido
                  </label>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#7c4b2c' }}>Observaciones</label>
                  <input type="text" value={venta.observaciones} onChange={e => updateVenta(vi, 'observaciones', e.target.value)}
                    className="input-field text-sm" style={{ borderRadius: 0 }} placeholder="Opcional..." />
                </div>
              </div>

              {/* Productos */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#7c4b2c' }}>Productos *</p>
                <div className="space-y-2">
                  {venta.productos.map((prod, pi) => (
                    <div key={pi} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select value={prod.productoId} onChange={e => updateProducto(vi, pi, 'productoId', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: 0 }}>
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
                          className="input-field text-sm w-full" style={{ borderRadius: 0 }} />
                      </div>
                      <div className="col-span-3">
                        <input type="number" placeholder="Precio unit." value={prod.precioUnitario}
                          onChange={e => updateProducto(vi, pi, 'precioUnitario', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: 0 }} />
                      </div>
                      <div className="col-span-2">
                        <input type="number" placeholder="Costo (opt.)" value={prod.costoUnitario}
                          onChange={e => updateProducto(vi, pi, 'costoUnitario', e.target.value)}
                          className="input-field text-sm w-full" style={{ borderRadius: 0 }} />
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
                  className="mt-2 text-xs flex items-center gap-1 transition-colors"
                  style={{ color: '#7c4b2c' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#3c250f')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#7c4b2c')}>
                  <Plus size={12} /> Agregar producto
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setVentas(v => [...v, ventaVacia()])}
            className="w-full text-sm py-2.5 flex items-center justify-center gap-2 transition-colors border border-dashed"
            style={{ borderColor: '#E8D5C4', color: '#9B7E6A', background: 'transparent', borderRadius: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#C4895A'; (e.currentTarget as HTMLButtonElement).style.color = '#7c4b2c'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E8D5C4'; (e.currentTarget as HTMLButtonElement).style.color = '#9B7E6A'; }}
          >
            <Plus size={14} /> Agregar otra venta
          </button>

          {error && (
            <div className="border px-4 py-3 text-sm" style={{ background: '#FFF1F2', borderColor: '#FECDD3', color: '#9F1239', borderRadius: 0 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: '#E8D5C4', background: 'white' }}>
          <button onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'white', color: '#9B7E6A',
              border: '1px solid #E8D5C4', fontWeight: 500,
              fontSize: '0.875rem', padding: '0.5rem 1.25rem',
              borderRadius: 0, cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#FDF6EE')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={cargarHistorial.isPending || exito}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: '#7c4b2c', color: 'white', fontWeight: 500,
              fontSize: '0.875rem', padding: '0.5rem 1.25rem',
              borderRadius: 0, border: 'none',
              cursor: cargarHistorial.isPending ? 'not-allowed' : 'pointer',
              opacity: cargarHistorial.isPending ? 0.6 : 1,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!cargarHistorial.isPending) (e.currentTarget as HTMLButtonElement).style.background = '#5E3520'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#7c4b2c'; }}
          >
            {cargarHistorial.isPending ? 'Cargando...' : `Cargar ${ventas.length} venta${ventas.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
