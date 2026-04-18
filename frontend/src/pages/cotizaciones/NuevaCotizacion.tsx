import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import { useCrearCotizacion } from '../../hooks/useCotizaciones';
import { useClientes } from '../../hooks/useClientes';
import api from '../../services/api';
import { generarPresupuestoPDF } from '../../utils/generarPresupuestoPDF';

interface NuevaCotizacionProps {
  onClose: () => void;
  onSuccess: (cotizacionId: number) => void;
}

interface DetalleForm {
  productoId: number;
  cantidad: number;
  precioCalculado?: {
    precioUnitario: number;
    subtotal: number;
    bonificaFlete: boolean;
    escalon: string;
  };
  usarPrecioEspecial?: boolean;
  precioEspecial?: number;
}

export default function NuevaCotizacion({ onClose, onSuccess }: NuevaCotizacionProps) {
  const crearCotizacion = useCrearCotizacion();
  const { data: clientes } = useClientes();
  const [productos, setProductos] = useState<any[]>([]);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    clienteId: 0,
    incluyeFlete: false,
    costoFlete: 0,
    fleteIncluido: true,
    requiereSenasa: false,
    costoSenasa: 0,
    incluyeIva: true,
    canalEnvio: 'whatsapp' as 'whatsapp' | 'email',
    observaciones: ''
  });

  const [detalles, setDetalles] = useState<DetalleForm[]>([
    { productoId: 0, cantidad: 1 }
  ]);

  useEffect(() => {
    api.get('/productos').then(({ data }) => setProductos(data));
  }, []);

  const calcularPrecio = async (idx: number, productoId: number, cantidad: number) => {
    if (!productoId || !cantidad) return;
    try {
      const { data } = await api.get(`/productos/${productoId}/precio?cantidad=${cantidad}`);
      setDetalles(prev => prev.map((d, i) => i === idx ? { ...d, precioCalculado: data } : d));
    } catch { /* precio no disponible */ }
  };

  const addDetalle = () => setDetalles(prev => [...prev, { productoId: 0, cantidad: 1 }]);
  const removeDetalle = (idx: number) => setDetalles(prev => prev.filter((_, i) => i !== idx));

  const updateDetalle = (idx: number, key: keyof DetalleForm, value: number) => {
    setDetalles(prev => {
      const nuevo = prev.map((d, i) => i === idx ? { ...d, [key]: value } : d);
      const d = nuevo[idx];
      if (d.productoId && d.cantidad) {
        calcularPrecio(idx, d.productoId, d.cantidad);
      }
      return nuevo;
    });
  };

  const getPrecioEfectivo = (d: DetalleForm): number => {
    if (d.usarPrecioEspecial && d.precioEspecial) return d.precioEspecial;
    return d.precioCalculado ? d.precioCalculado.precioUnitario : 0;
  };

  const totalSinIva = detalles.reduce((acc, d) => {
    return acc + getPrecioEfectivo(d) * d.cantidad;
  }, 0)
    + (form.incluyeFlete && form.fleteIncluido ? form.costoFlete : 0)
    + (form.requiereSenasa ? form.costoSenasa : 0);

  const totalConIva = totalSinIva * 1.21;
  const totalFinal = form.incluyeIva ? totalConIva : totalSinIva;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.clienteId) { setError('Seleccioná un cliente'); return; }
    if (detalles.some(d => !d.productoId || !d.cantidad)) {
      setError('Completá todos los productos'); return;
    }
    try {
      const resultado = await crearCotizacion.mutateAsync({
        ...form,
        detalles: detalles.map(d => ({
          productoId: d.productoId,
          cantidad: d.cantidad,
          ...(d.usarPrecioEspecial && d.precioEspecial ? { precioUnitario: d.precioEspecial } : {})
        }))
      });

      // ── Generar PDF ──────────────────────────────────────────────────────
      const cliente = clientes?.find(c => c.id === form.clienteId);
      const fechaStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const detallesPDF = detalles
        .filter(d => d.productoId > 0)
        .map(d => {
          const prod = productos.find(p => p.id === d.productoId);
          const precioUnit = getPrecioEfectivo(d);
          return {
            nombreProducto: prod?.nombre ?? `Producto #${d.productoId}`,
            condicion: prod?.condicion ?? '',
            cantidad: d.cantidad,
            precioUnitario: precioUnit,
            subtotal: precioUnit * d.cantidad,
          };
        });

      const pdfBlob = await generarPresupuestoPDF({
        numeroCotizacion: resultado.id,
        fechaCotizacion: fechaStr,
        razonSocialCliente: cliente?.razonSocial ?? '',
        detalles: detallesPDF,
        costoFlete: form.incluyeFlete ? form.costoFlete : undefined,
        costoSenasa: form.requiereSenasa ? form.costoSenasa : undefined,
        observaciones: form.observaciones || undefined,
      });

      // ── Descargar PDF ────────────────────────────────────────────────────
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const filename = `presupuesto-${String(resultado.id).padStart(4, '0')}-${cliente?.razonSocial?.replace(/\s+/g, '-') ?? 'cliente'}.pdf`;
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);

      // ── Abrir canal de envío ─────────────────────────────────────────────
      if (form.canalEnvio === 'whatsapp' && cliente?.telefonoContacto) {
        const tel = cliente.telefonoContacto.replace(/\D/g, '');
        const telConCodigo = tel.startsWith('54') ? tel : `54${tel}`;
        const mensaje = encodeURIComponent(
          `Hola! Te envío el presupuesto que consultaste 📋\n\nNúmero: #${String(resultado.id).padStart(4, '0')}\n\nPor favor revisá el PDF adjunto. Ante cualquier consulta, estamos a disposición. ¡Saludos!`
        );
        setTimeout(() => window.open(`https://wa.me/${telConCodigo}?text=${mensaje}`, '_blank'), 500);
      } else if (form.canalEnvio === 'email' && cliente?.emailContacto) {
        // Convertir el PDF blob a base64 y enviarlo via el backend
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const pdfUint8 = new Uint8Array(pdfArrayBuffer);
        let binary = '';
        pdfUint8.forEach(b => { binary += String.fromCharCode(b); });
        const pdfBase64 = btoa(binary);

        try {
          await api.post(`/cotizaciones/${resultado.id}/enviar-email`, {
            pdfBase64,
            filename,
            razonSocial: cliente.razonSocial,
            emailDestino: cliente.emailContacto,
            fecha: fechaStr,
          });
        } catch {
          // Si falla el envío, no bloquea el cierre — el PDF ya se descargó
        }
      }

      onSuccess(resultado.id);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear la cotización');
    }
  };

  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Calculator size={20} className="text-[#16A34A]" />
            Nueva cotización
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            {/* Cliente */}
            <div>
              <label className="label">Cliente <span className="text-red-500">*</span></label>
              <select
                value={form.clienteId}
                onChange={e => setForm({ ...form, clienteId: parseInt(e.target.value) })}
                className="select"
                style={{ borderRadius: '0.25rem' }}
                required
              >
                <option value={0}>Seleccioná un cliente...</option>
                {clientes?.map(c => (
                  <option key={c.id} value={c.id}>{c.razonSocial}</option>
                ))}
              </select>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Productos <span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={addDetalle}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    fontSize: '0.75rem', fontWeight: 500, padding: '0.375rem 0.75rem',
                    borderRadius: '0.25rem', border: '1px solid #E5E7EB',
                    background: '#fff', color: '#4B5563', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <Plus size={14} /> Agregar producto
                </button>
              </div>
              <div className="space-y-2">
                {detalles.map((d, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-100" style={{ borderRadius: '0.25rem' }}>
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={d.productoId}
                          onChange={e => updateDetalle(idx, 'productoId', parseInt(e.target.value))}
                          className="select text-xs py-2"
                          style={{ borderRadius: '0.25rem' }}
                        >
                          <option value={0}>Seleccioná un producto...</option>
                          {productos.map((p: any) => (
                            <option key={p.id} value={p.id}>{p.nombre} — {p.condicion}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          min={1}
                          value={d.cantidad}
                          onChange={e => updateDetalle(idx, 'cantidad', parseInt(e.target.value))}
                          className="input text-xs py-2"
                          style={{ borderRadius: '0.25rem' }}
                          placeholder="Cantidad"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        {d.precioCalculado && !d.usarPrecioEspecial && (
                          <div>
                            <p className="text-xs font-semibold text-gray-900">
                              {formatPesos(d.precioCalculado.precioUnitario)}
                            </p>
                            {d.precioCalculado.bonificaFlete && (
                              <p className="text-[10px] text-green-600 font-medium">Flete bonificado</p>
                            )}
                          </div>
                        )}
                        {d.usarPrecioEspecial && d.precioEspecial ? (
                          <p className="text-xs font-semibold text-[#6B3A2A]">
                            {formatPesos(d.precioEspecial)}
                          </p>
                        ) : null}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {detalles.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDetalle(idx)}
                            className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Selector de precio por unidad */}
                    {d.productoId > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Precio por unidad</p>
                        <div className="flex items-center gap-2">
                          {/* Toggle Guardado / Precio especial */}
                          <div className="flex" style={{ borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                            <button
                              type="button"
                              onClick={() => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, usarPrecioEspecial: false } : x))}
                              style={{
                                fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.625rem',
                                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                                background: !d.usarPrecioEspecial ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff',
                                color: !d.usarPrecioEspecial ? '#fff' : '#6B7280',
                              }}
                            >
                              Guardado
                            </button>
                            <button
                              type="button"
                              onClick={() => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, usarPrecioEspecial: true } : x))}
                              style={{
                                fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.625rem',
                                cursor: 'pointer', transition: 'all 0.15s', border: 'none', borderLeft: '1px solid #E5E7EB',
                                background: d.usarPrecioEspecial ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff',
                                color: d.usarPrecioEspecial ? '#fff' : '#6B7280',
                              }}
                            >
                              Precio especial
                            </button>
                          </div>
                          {/* Input precio especial */}
                          {d.usarPrecioEspecial && (
                            <input
                              type="number"
                              min={0}
                              placeholder="$ por unidad"
                              value={d.precioEspecial || ''}
                              onChange={e => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, precioEspecial: parseFloat(e.target.value) || 0 } : x))}
                              className="input text-xs py-1"
                              style={{ borderRadius: '0.25rem', maxWidth: '140px' }}
                            />
                          )}
                          {/* Precio guardado info */}
                          {!d.usarPrecioEspecial && d.precioCalculado && (
                            <span className="text-xs text-gray-500">
                              {formatPesos(d.precioCalculado.precioUnitario)} · Escalón: {d.precioCalculado.escalon}
                            </span>
                          )}
                          {!d.usarPrecioEspecial && !d.precioCalculado && (
                            <span className="text-xs text-gray-400 italic">Sin precio configurado</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Opciones flete / SENASA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-100" style={{ borderRadius: '0.25rem' }}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.incluyeFlete}
                    onChange={e => setForm({ ...form, incluyeFlete: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Incluye flete</span>
                </label>
                {form.incluyeFlete && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Costo del flete ($)"
                      value={form.costoFlete || ''}
                      onChange={e => setForm({ ...form, costoFlete: parseInt(e.target.value) || 0 })}
                      className="input text-sm"
                      style={{ borderRadius: '0.25rem' }}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.fleteIncluido}
                        onChange={e => setForm({ ...form, fleteIncluido: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-xs text-gray-600">Incluido en el precio</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100" style={{ borderRadius: '0.25rem' }}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={form.requiereSenasa}
                    onChange={e => setForm({ ...form, requiereSenasa: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Requiere SENASA</span>
                </label>
                {form.requiereSenasa && (
                  <input
                    type="number"
                    placeholder="Costo SENASA ($)"
                    value={form.costoSenasa || ''}
                    onChange={e => setForm({ ...form, costoSenasa: parseInt(e.target.value) || 0 })}
                    className="input text-sm"
                    style={{ borderRadius: '0.25rem' }}
                  />
                )}
              </div>
            </div>

            {/* Canal de envío */}
            <div>
              <label className="label">Canal de envío</label>
              <div className="flex gap-2">
                {(['whatsapp', 'email'] as const).map(canal => (
                  <button
                    key={canal}
                    type="button"
                    onClick={() => setForm({ ...form, canalEnvio: canal })}
                    style={{
                      flex: 1, padding: '0.625rem', fontSize: '0.875rem', fontWeight: 500,
                      borderRadius: '0.25rem', border: '1px solid',
                      cursor: 'pointer', transition: 'all 0.15s',
                      background: form.canalEnvio === canal
                        ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                        : '#fff',
                      color: form.canalEnvio === canal ? '#fff' : '#4B5563',
                      borderColor: form.canalEnvio === canal ? '#6B3A2A' : '#E5E7EB'
                    }}
                  >
                    {canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  </button>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="input resize-none"
                style={{ borderRadius: '0.25rem' }}
                rows={2}
                placeholder="Notas internas..."
              />
            </div>

            {/* Total estimado */}
            {totalSinIva > 0 && (
              <div className="p-4 border border-[#C4895A]/30 bg-[#6B3A2A]/5" style={{ borderRadius: '0.25rem' }}>
                {/* Toggle IVA */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#C4895A]/20">
                  <span className="text-sm font-medium text-gray-700">¿Incluir IVA? (21%)</span>
                  <div className="flex" style={{ borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, incluyeIva: true }))}
                      style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.875rem',
                        cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        background: form.incluyeIva ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff',
                        color: form.incluyeIva ? '#fff' : '#6B7280',
                      }}
                    >Sí</button>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, incluyeIva: false }))}
                      style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.875rem',
                        cursor: 'pointer', border: 'none', borderLeft: '1px solid #E5E7EB', transition: 'all 0.15s',
                        background: !form.incluyeIva ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff',
                        color: !form.incluyeIva ? '#fff' : '#6B7280',
                      }}
                    >No</button>
                  </div>
                </div>
                {/* Líneas de totales */}
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Subtotal neto</span>
                  <span>{formatPesos(totalSinIva)}</span>
                </div>
                {form.incluyeIva && (
                  <div className="flex justify-between text-sm text-gray-500 mb-1">
                    <span>IVA (21%)</span>
                    <span>{formatPesos(totalConIva - totalSinIva)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-[#C4895A]/20 mt-1">
                  <span>Total {form.incluyeIva ? 'con IVA' : 'sin IVA'}</span>
                  <span className="text-[#6B3A2A] text-lg">{formatPesos(totalFinal)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">
                {error}
              </p>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
                fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem',
                borderRadius: '0.25rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >Cancelar</button>
            <button type="submit" disabled={crearCotizacion.isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                color: 'white', fontWeight: 500, fontSize: '0.875rem',
                padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none',
                cursor: crearCotizacion.isPending ? 'not-allowed' : 'pointer',
                opacity: crearCotizacion.isPending ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              {crearCotizacion.isPending ? 'Creando...' : 'Crear cotización'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
