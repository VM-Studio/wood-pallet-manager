import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Zap } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import { generarPresupuestoPDF } from '../../utils/generarPresupuestoPDF';

interface NuevaCotizacionRapidaProps {
  onClose: () => void;
  onSuccess: (cotizacionId: number) => void;
}

interface ComponenteMedida {
  tablas: number | '';
  largo: number | '';
  ancho: number | '';
  espesor: number | '';
}

interface PalletMedida {
  baseSuperior: ComponenteMedida;
  extraSuperior1: ComponenteMedida;
  extraSuperior2: ComponenteMedida;
  transversales: ComponenteMedida;
  tirantes: ComponenteMedida;
  tacos: ComponenteMedida;
  baseInferior: ComponenteMedida;
  extraInferior1: ComponenteMedida;
  extraInferior2: ComponenteMedida;
  costoPorPie: number | '';
  gananciaPorPalet: number | '';
  cantidadUnidades: number | '';
}

interface DetalleForm {
  productoId: number;
  cantidad: number;
  precioCalculado?: { precioUnitario: number; subtotal: number; bonificaFlete: boolean; escalon: string };
  usarPrecioEspecial?: boolean;
  precioEspecial?: number;
  medida?: PalletMedida;
}

const COMPONENTES_MADERA = [
  { key: 'baseSuperior' as const, label: 'Base superior' },
  { key: 'extraSuperior1' as const, label: '' },
  { key: 'extraSuperior2' as const, label: '' },
  { key: 'transversales' as const, label: 'Transversales' },
  { key: 'tirantes' as const, label: 'Tirantes' },
  { key: 'tacos' as const, label: 'Tacos' },
  { key: 'baseInferior' as const, label: 'Base inferior' },
  { key: 'extraInferior1' as const, label: '' },
  { key: 'extraInferior2' as const, label: '' },
];
type ComponenteKey = typeof COMPONENTES_MADERA[number]['key'];

const emptyComponente = (): ComponenteMedida => ({ tablas: '', largo: '', ancho: '', espesor: '' });
const defaultMedida = (): PalletMedida => ({
  baseSuperior: emptyComponente(), extraSuperior1: emptyComponente(), extraSuperior2: emptyComponente(),
  transversales: emptyComponente(), tirantes: emptyComponente(), tacos: emptyComponente(),
  baseInferior: emptyComponente(), extraInferior1: emptyComponente(), extraInferior2: emptyComponente(),
  costoPorPie: '', gananciaPorPalet: '', cantidadUnidades: '',
});

const calcularPiesComponente = (c: ComponenteMedida): number => {
  const t = typeof c.tablas === 'number' ? c.tablas : 0;
  const l = typeof c.largo === 'number' ? c.largo : 0;
  const a = typeof c.ancho === 'number' ? c.ancho : 0;
  const e = typeof c.espesor === 'number' ? c.espesor : 0;
  if (!t || !l || !a || !e) return 0;
  return t * (l / 1000) * (a / 1000) * (e / 10) * 4.24;
};

export default function NuevaCotizacionRapida({ onClose, onSuccess }: NuevaCotizacionRapidaProps) {
  const { usuario } = useAuthStore();
  const [productos, setProductos] = useState<{ id: number; nombre: string; condicion: string; tipo: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [prospecto, setProspecto] = useState({
    nombreProspecto: '',
    telefonoProspecto: '',
    emailProspecto: '',
  });

  const [form, setForm] = useState({
    incluyeFlete: false,
    costoFlete: 0,
    fleteIncluido: true,
    requiereSenasa: false,
    costoSenasa: 0,
    incluyeIva: true,
    canalEnvio: 'whatsapp' as 'whatsapp' | 'email',
    observaciones: '',
  });

  const [detalles, setDetalles] = useState<DetalleForm[]>([{ productoId: 0, cantidad: 1 }]);

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
      const nuevo = prev.map((d, i) => {
        if (i !== idx) return d;
        const updated = { ...d, [key]: value };
        if (key === 'productoId' && value === -1 && !updated.medida) updated.medida = defaultMedida();
        return updated;
      });
      const d = nuevo[idx];
      if (d.productoId > 0 && d.cantidad) calcularPrecio(idx, d.productoId, d.cantidad);
      return nuevo;
    });
  };

  const updateMedidaComponente = (idx: number, compKey: ComponenteKey, field: keyof ComponenteMedida, value: number | '') => {
    setDetalles(prev => prev.map((d, i) => {
      if (i !== idx || !d.medida) return d;
      return { ...d, medida: { ...d.medida, [compKey]: { ...d.medida[compKey], [field]: value } } };
    }));
  };

  const updateMedidaGlobal = (idx: number, field: 'costoPorPie' | 'gananciaPorPalet' | 'cantidadUnidades', value: number | '') => {
    setDetalles(prev => prev.map((d, i) => {
      if (i !== idx || !d.medida) return d;
      return { ...d, medida: { ...d.medida, [field]: value } };
    }));
  };

  const getPrecioEfectivo = (d: DetalleForm): number => {
    if (d.usarPrecioEspecial && d.precioEspecial) return d.precioEspecial;
    return d.precioCalculado ? d.precioCalculado.precioUnitario : 0;
  };

  const totalUnidades = detalles.reduce((acc, d) => {
    if (d.productoId === -1 && d.medida) return acc + (typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 0);
    return acc + (d.cantidad > 0 ? d.cantidad : 0);
  }, 0);

  const costoSenasaTotal = form.requiereSenasa && totalUnidades > 0 ? form.costoSenasa * totalUnidades : form.costoSenasa;

  const totalSinIva = detalles.reduce((acc, d) => {
    if (d.productoId === -1 && d.medida) {
      const piesTotal = COMPONENTES_MADERA.reduce((s, comp) => s + calcularPiesComponente(d.medida![comp.key]), 0);
      const costoUnit = typeof d.medida.costoPorPie === 'number' ? piesTotal * d.medida.costoPorPie : 0;
      const ganancia = typeof d.medida.gananciaPorPalet === 'number' ? d.medida.gananciaPorPalet : 0;
      const precioUnit = costoUnit + ganancia;
      const cantidad = typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 1;
      return acc + precioUnit * cantidad;
    }
    return acc + getPrecioEfectivo(d) * d.cantidad;
  }, 0)
    + (form.incluyeFlete && form.fleteIncluido ? form.costoFlete : 0)
    + (form.requiereSenasa ? form.costoSenasa * totalUnidades : 0);

  const totalConIva = totalSinIva * 1.21;
  const totalFinal = form.incluyeIva ? totalConIva : totalSinIva;

  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!prospecto.nombreProspecto.trim()) { setError('Ingresá el nombre del prospecto'); return; }
    const detalleInvalido = detalles.some(d => {
      if (d.productoId === -1) return !d.medida || typeof d.medida.cantidadUnidades !== 'number' || d.medida.cantidadUnidades <= 0;
      return !d.productoId || !d.cantidad;
    });
    if (detalleInvalido) { setError('Completá todos los productos'); return; }

    setLoading(true);
    try {
      const detallesPayload = detalles.map(d => {
        if (d.productoId === -1) {
          const piesTotal = COMPONENTES_MADERA.reduce((s, comp) => s + calcularPiesComponente(d.medida![comp.key]), 0);
          const costoUnit = typeof d.medida!.costoPorPie === 'number' ? piesTotal * d.medida!.costoPorPie : 0;
          const ganancia = typeof d.medida!.gananciaPorPalet === 'number' ? d.medida!.gananciaPorPalet : 0;
          const precioUnit = costoUnit + ganancia;
          const cantidad = typeof d.medida!.cantidadUnidades === 'number' && d.medida!.cantidadUnidades > 0 ? d.medida!.cantidadUnidades : 1;
          return {
            productoId: 0,
            cantidad,
            precioUnitario: precioUnit,
            esAMedida: true,
            especificacion: {
              medidas: COMPONENTES_MADERA.map(comp => {
                const c = d.medida![comp.key];
                const pies = calcularPiesComponente(c);
                return pies > 0 ? {
                  label: comp.label,
                  tablas: typeof c.tablas === 'number' ? c.tablas : undefined,
                  largo: typeof c.largo === 'number' ? c.largo : undefined,
                  ancho: typeof c.ancho === 'number' ? c.ancho : undefined,
                  espesor: typeof c.espesor === 'number' ? c.espesor : undefined,
                  pies,
                } : null;
              }).filter(Boolean),
            },
          };
        }
        return {
          productoId: d.productoId,
          cantidad: d.cantidad,
          ...(d.usarPrecioEspecial && d.precioEspecial ? { precioUnitario: d.precioEspecial } : {}),
        };
      });

      const { data: resultado } = await api.post('/cotizaciones/rapida', {
        ...prospecto,
        ...form,
        detalles: detallesPayload,
      });

      // Generar PDF
      const fechaStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const detallesPDF = detalles
        .filter(d => d.productoId > 0 || (d.productoId === -1 && d.medida))
        .map(d => {
          if (d.productoId === -1 && d.medida) {
            const piesTotal = COMPONENTES_MADERA.reduce((s, comp) => s + calcularPiesComponente(d.medida![comp.key]), 0);
            const costoUnit = typeof d.medida.costoPorPie === 'number' ? piesTotal * d.medida.costoPorPie : 0;
            const ganancia = typeof d.medida.gananciaPorPalet === 'number' ? d.medida.gananciaPorPalet : 0;
            const precioUnit = costoUnit + ganancia;
            const cantidad = typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 1;
            const medidasPallet = COMPONENTES_MADERA.map(comp => {
              const cData = d.medida![comp.key];
              const pies = calcularPiesComponente(cData);
              return pies > 0 ? { label: comp.label, tablas: typeof cData.tablas === 'number' ? cData.tablas : undefined, largo: typeof cData.largo === 'number' ? cData.largo : undefined, ancho: typeof cData.ancho === 'number' ? cData.ancho : undefined, espesor: typeof cData.espesor === 'number' ? cData.espesor : undefined, pies } : null;
            }).filter(Boolean) as { label: string; tablas?: number; largo?: number; ancho?: number; espesor?: number; pies: number }[];
            return { nombreProducto: 'Pallet a medida', condicion: 'A medida', cantidad, precioUnitario: precioUnit, subtotal: precioUnit * cantidad, medidasPallet };
          }
          const prod = productos.find(p => p.id === d.productoId);
          const precioUnit = getPrecioEfectivo(d);
          return { nombreProducto: prod?.nombre ?? `Producto #${d.productoId}`, condicion: prod?.condicion ?? '', cantidad: d.cantidad, precioUnitario: precioUnit, subtotal: precioUnit * d.cantidad };
        });

      const pdfBlob = await generarPresupuestoPDF({
        numeroCotizacion: resultado.id,
        fechaCotizacion: fechaStr,
        razonSocialCliente: prospecto.nombreProspecto,
        cuitEmpresa: usuario?.cuit,
        detalles: detallesPDF,
        costoFlete: form.incluyeFlete ? form.costoFlete : undefined,
        costoSenasa: form.requiereSenasa ? costoSenasaTotal : undefined,
        observaciones: form.observaciones || undefined,
        incluyeIva: form.incluyeIva,
      });

      // Descargar PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const filename = `presupuesto-rapido-${String(resultado.id).padStart(4, '0')}-${prospecto.nombreProspecto.replace(/\s+/g, '-')}.pdf`;
      const a = document.createElement('a');
      a.href = pdfUrl; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);

      // Canal de envío
      if (form.canalEnvio === 'whatsapp' && prospecto.telefonoProspecto) {
        const tel = prospecto.telefonoProspecto.replace(/\D/g, '');
        const telConCodigo = tel.startsWith('54') ? tel : `54${tel}`;
        const mensaje = encodeURIComponent(`Hola! Te envío el presupuesto que consultaste 📋\n\nNúmero: #${String(resultado.id).padStart(4, '0')}\n\nPor favor revisá el PDF adjunto. Ante cualquier consulta, estamos a disposición. ¡Saludos!`);
        setTimeout(() => window.open(`https://wa.me/${telConCodigo}?text=${mensaje}`, '_blank'), 500);
      } else if (form.canalEnvio === 'email' && prospecto.emailProspecto) {
        const pdfArrayBuffer = await pdfBlob.arrayBuffer();
        const pdfUint8 = new Uint8Array(pdfArrayBuffer);
        let binary = '';
        pdfUint8.forEach(b => { binary += String.fromCharCode(b); });
        const pdfBase64 = btoa(binary);
        try {
          await api.post(`/cotizaciones/${resultado.id}/enviar-email`, {
            pdfBase64, filename,
            razonSocial: prospecto.nombreProspecto,
            emailDestino: prospecto.emailProspecto,
            fecha: fechaStr,
          });
        } catch { /* no bloquea */ }
      }

      onSuccess(resultado.id);
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al crear la cotización');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-5xl animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Cotización rápida
            <span className="text-xs font-normal text-gray-400 ml-1">sin cliente registrado</span>
          </h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">

            {/* Banner informativo */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Zap size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <p>
                Esta cotización <strong>no requiere que el cliente esté registrado</strong> en el sistema.
                Si la acepta y quiere comprar, podrás registrar sus datos y convertirla en venta desde el módulo de cotizaciones.
              </p>
            </div>

            {/* Datos del prospecto */}
            <div>
              <label className="label">Datos del prospecto</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre / Empresa <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={prospecto.nombreProspecto}
                    onChange={e => setProspecto({ ...prospecto, nombreProspecto: e.target.value })}
                    className="input"
                    style={{ borderRadius: '0.25rem' }}
                    placeholder="Nombre o razón social"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                  <input
                    type="text"
                    value={prospecto.telefonoProspecto}
                    onChange={e => setProspecto({ ...prospecto, telefonoProspecto: e.target.value })}
                    className="input"
                    style={{ borderRadius: '0.25rem' }}
                    placeholder="11 xxxx-xxxx"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email</label>
                  <input
                    type="email"
                    value={prospecto.emailProspecto}
                    onChange={e => setProspecto({ ...prospecto, emailProspecto: e.target.value })}
                    className="input"
                    style={{ borderRadius: '0.25rem' }}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            {/* Productos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Productos <span className="text-red-500">*</span></label>
                <button type="button" onClick={addDetalle} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 500, padding: '0.375rem 0.75rem', borderRadius: '0.25rem', border: '1px solid #E5E7EB', background: '#fff', color: '#4B5563', cursor: 'pointer' }}>
                  <Plus size={14} /> Agregar producto
                </button>
              </div>
              <div className="space-y-2">
                {detalles.map((d, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-100" style={{ borderRadius: '0.25rem' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <select value={d.productoId} onChange={e => updateDetalle(idx, 'productoId', parseInt(e.target.value))} className="select text-xs py-2" style={{ borderRadius: '0.25rem' }}>
                          <option value={0}>Seleccioná un producto...</option>
                          <option value={-1}>📐 Pallet a medida (calculadora)</option>
                          {productos.map(p => (<option key={p.id} value={p.id}>{p.nombre} — {p.condicion}</option>))}
                        </select>
                      </div>
                      {detalles.length > 1 && (
                        <button type="button" onClick={() => removeDetalle(idx)} className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50 shrink-0"><Trash2 size={14} /></button>
                      )}
                    </div>

                    {/* Modo A MEDIDA */}
                    {d.productoId === -1 && d.medida && (() => {
                      const totalPies = COMPONENTES_MADERA.reduce((acc, comp) => acc + calcularPiesComponente(d.medida![comp.key]), 0);
                      const costoTotal = typeof d.medida.costoPorPie === 'number' ? totalPies * d.medida.costoPorPie : 0;
                      return (
                        <div>
                          <p className="text-sm font-semibold text-[#6B3A2A] mb-2">📐 Calculadora de pies de madera</p>
                          <div className="overflow-x-auto">
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                              <thead>
                                <tr style={{ background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' }}>
                                  {['Componente', 'Tablas', 'Largo (mm)', 'Ancho (mm)', 'Espesor (mm)', 'Pies', 'Importe'].map(h => (
                                    <th key={h} style={{ padding: '0.5rem 0.6rem', color: '#fff', fontWeight: 600, textAlign: h === 'Componente' ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {COMPONENTES_MADERA.map((comp, ci) => {
                                  const cData = d.medida![comp.key];
                                  const pies = calcularPiesComponente(cData);
                                  return (
                                    <tr key={comp.key} style={{ background: ci % 2 === 0 ? '#FDFAF7' : '#fff', borderBottom: '1px solid #F3F4F6' }}>
                                      <td style={{ padding: '0.45rem 0.6rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{comp.label}</td>
                                      {(['tablas', 'largo', 'ancho', 'espesor'] as const).map(field => (
                                        <td key={field} style={{ padding: '0.3rem' }}>
                                          <input type="number" min={0} step="0.01" placeholder="—" value={cData[field] === '' ? '' : cData[field]}
                                            onChange={e => updateMedidaComponente(idx, comp.key, field, e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            style={{ width: '100%', textAlign: 'center', fontSize: '0.82rem', padding: '0.35rem 0.4rem', border: '1px solid #E5E7EB', borderRadius: '0.25rem', background: '#fff', outline: 'none', minWidth: '64px' }} />
                                        </td>
                                      ))}
                                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700, color: pies > 0 ? '#6B3A2A' : '#D1D5DB' }}>{pies > 0 ? pies.toFixed(4) : '—'}</td>
                                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600, color: '#374151' }}>
                                        {pies > 0 && typeof d.medida!.costoPorPie === 'number' && d.medida!.costoPorPie > 0 ? formatPesos(pies * d.medida!.costoPorPie) : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: '#FDF6EE', borderTop: '2px solid #C4895A' }}>
                                  <td colSpan={5} style={{ padding: '0.45rem 0.6rem', fontWeight: 700, fontSize: '0.85rem', color: '#6B3A2A' }}>Total pies</td>
                                  <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#6B3A2A' }}>{totalPies > 0 ? totalPies.toFixed(4) : '—'}</td>
                                  <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#374151' }}>{totalPies > 0 && typeof d.medida.costoPorPie === 'number' && d.medida.costoPorPie > 0 ? formatPesos(totalPies * d.medida.costoPorPie) : '—'}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                            <div>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '0.25rem' }}>Costo por pie</label>
                              <input type="number" min={0} step="0.01" placeholder="$ por pie" value={d.medida.costoPorPie === '' ? '' : d.medida.costoPorPie}
                                onChange={e => updateMedidaGlobal(idx, 'costoPorPie', e.target.value === '' ? '' : parseFloat(e.target.value))} className="input py-2" style={{ borderRadius: '0.25rem' }} />
                              {costoTotal > 0 && <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>Costo unitario madera: <strong>{formatPesos(costoTotal)}</strong></p>}
                            </div>
                            <div>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '0.25rem' }}>Cantidad de unidades</label>
                              <input type="number" min={1} step={1} placeholder="Cantidad" value={d.medida.cantidadUnidades === '' ? '' : d.medida.cantidadUnidades}
                                onChange={e => updateMedidaGlobal(idx, 'cantidadUnidades', e.target.value === '' ? '' : parseInt(e.target.value))} className="input py-2" style={{ borderRadius: '0.25rem' }} />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '0.25rem' }}>Ganancia por palet</label>
                              <input type="number" min={0} step="0.01" placeholder="$ ganancia" value={d.medida.gananciaPorPalet === '' ? '' : d.medida.gananciaPorPalet}
                                onChange={e => updateMedidaGlobal(idx, 'gananciaPorPalet', e.target.value === '' ? '' : parseFloat(e.target.value))} className="input py-2" style={{ borderRadius: '0.25rem' }} />
                            </div>
                            {(() => {
                              const ganancia = typeof d.medida.gananciaPorPalet === 'number' ? d.medida.gananciaPorPalet : 0;
                              const precioUnit = costoTotal + ganancia;
                              const cantidad = typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 0;
                              if (precioUnit <= 0 || cantidad <= 0) return null;
                              return (
                                <div style={{ background: '#FDF6EE', border: '1px solid #C4895A', borderRadius: '0.25rem', padding: '0.625rem 0.875rem' }}>
                                  <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.3rem' }}>Precio por unidad: <strong style={{ color: '#6B3A2A' }}>{formatPesos(precioUnit)}</strong></p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6B3A2A' }}>Total ({cantidad} u.): {formatPesos(precioUnit * cantidad)}</p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Modo producto normal */}
                    {d.productoId > 0 && (() => (
                      <>
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
                            <input type="number" min={1} value={d.cantidad} onChange={e => updateDetalle(idx, 'cantidad', parseInt(e.target.value))} className="input text-xs py-2" style={{ borderRadius: '0.25rem' }} placeholder="Cantidad" />
                          </div>
                          <div className="col-span-7 text-right">
                            {d.precioCalculado && !d.usarPrecioEspecial && (
                              <p className="text-xs font-semibold text-gray-900">
                                {d.cantidad > 0 ? <>{d.cantidad} × {formatPesos(d.precioCalculado.precioUnitario)} = <span style={{ color: '#6B3A2A' }}>{formatPesos(d.cantidad * d.precioCalculado.precioUnitario)}</span></> : formatPesos(d.precioCalculado.precioUnitario)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">Precio por unidad</p>
                          <div className="flex items-center gap-2">
                            <div className="flex" style={{ borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                              <button type="button" onClick={() => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, usarPrecioEspecial: false } : x))} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.625rem', cursor: 'pointer', border: 'none', background: !d.usarPrecioEspecial ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff', color: !d.usarPrecioEspecial ? '#fff' : '#6B7280' }}>Guardado</button>
                              <button type="button" onClick={() => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, usarPrecioEspecial: true } : x))} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.625rem', cursor: 'pointer', border: 'none', borderLeft: '1px solid #E5E7EB', background: d.usarPrecioEspecial ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff', color: d.usarPrecioEspecial ? '#fff' : '#6B7280' }}>Precio especial</button>
                            </div>
                            {d.usarPrecioEspecial && (
                              <input type="number" min={0} placeholder="$ por unidad" value={d.precioEspecial || ''} onChange={e => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, precioEspecial: parseFloat(e.target.value) || 0 } : x))} className="input text-xs py-1" style={{ borderRadius: '0.25rem', maxWidth: '140px' }} />
                            )}
                            {!d.usarPrecioEspecial && d.precioCalculado && <span className="text-xs text-gray-500">{formatPesos(d.precioCalculado.precioUnitario)} · Escalón: {d.precioCalculado.escalon}</span>}
                            {!d.usarPrecioEspecial && !d.precioCalculado && <span className="text-xs text-gray-400 italic">Sin precio configurado</span>}
                          </div>
                        </div>
                      </>
                    ))()}
                  </div>
                ))}
              </div>
            </div>

            {/* Flete / SENASA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-100" style={{ borderRadius: '0.25rem' }}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.incluyeFlete} onChange={e => setForm({ ...form, incluyeFlete: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium text-gray-700">Incluye flete</span>
                </label>
                {form.incluyeFlete && (
                  <div className="space-y-2">
                    <input type="number" placeholder="Costo del flete ($)" value={form.costoFlete || ''} onChange={e => setForm({ ...form, costoFlete: parseInt(e.target.value) || 0 })} className="input text-sm" style={{ borderRadius: '0.25rem' }} />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.fleteIncluido} onChange={e => setForm({ ...form, fleteIncluido: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-xs text-gray-600">Incluido en el precio</span>
                    </label>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100" style={{ borderRadius: '0.25rem' }}>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.requiereSenasa} onChange={e => setForm({ ...form, requiereSenasa: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium text-gray-700">Requiere SENASA</span>
                </label>
                {form.requiereSenasa && (
                  <div>
                    <input type="number" placeholder="Costo SENASA por unidad ($)" value={form.costoSenasa || ''} onChange={e => setForm({ ...form, costoSenasa: parseInt(e.target.value) || 0 })} className="input text-sm" style={{ borderRadius: '0.25rem' }} />
                    {form.costoSenasa > 0 && totalUnidades > 0 && <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '0.375rem' }}>{formatPesos(form.costoSenasa)} × {totalUnidades} u. = <strong style={{ color: '#6B3A2A' }}>{formatPesos(costoSenasaTotal)}</strong></p>}
                  </div>
                )}
              </div>
            </div>

            {/* Canal de envío */}
            <div>
              <label className="label">Canal de envío</label>
              <div className="flex gap-2">
                {(['whatsapp', 'email'] as const).map(canal => (
                  <button key={canal} type="button" onClick={() => setForm({ ...form, canalEnvio: canal })} style={{ flex: 1, padding: '0.625rem', fontSize: '0.875rem', fontWeight: 500, borderRadius: '0.25rem', border: '1px solid', cursor: 'pointer', background: form.canalEnvio === canal ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff', color: form.canalEnvio === canal ? '#fff' : '#4B5563', borderColor: form.canalEnvio === canal ? '#6B3A2A' : '#E5E7EB' }}>
                    {canal === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  </button>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="label">Observaciones</label>
              <textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} className="input resize-none" style={{ borderRadius: '0.25rem' }} rows={2} placeholder="Notas internas..." />
            </div>

            {/* Total */}
            {totalSinIva > 0 && (
              <div className="p-4 border border-[#C4895A]/30 bg-[#6B3A2A]/5" style={{ borderRadius: '0.25rem' }}>
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-[#C4895A]/20">
                  <span className="text-sm font-medium text-gray-700">¿Incluir IVA? (21%)</span>
                  <div className="flex" style={{ borderRadius: '0.25rem', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <button type="button" onClick={() => setForm(f => ({ ...f, incluyeIva: true }))} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.875rem', cursor: 'pointer', border: 'none', background: form.incluyeIva ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff', color: form.incluyeIva ? '#fff' : '#6B7280' }}>Sí</button>
                    <button type="button" onClick={() => setForm(f => ({ ...f, incluyeIva: false }))} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.875rem', cursor: 'pointer', border: 'none', borderLeft: '1px solid #E5E7EB', background: !form.incluyeIva ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff', color: !form.incluyeIva ? '#fff' : '#6B7280' }}>No</button>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-1"><span>Subtotal neto</span><span>{formatPesos(totalSinIva)}</span></div>
                {form.incluyeIva && <div className="flex justify-between text-sm text-gray-500 mb-1"><span>IVA (21%)</span><span>{formatPesos(totalConIva - totalSinIva)}</span></div>}
                <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-[#C4895A]/20 mt-1">
                  <span>Total {form.incluyeIva ? 'con IVA' : 'sin IVA'}</span>
                  <span className="text-[#6B3A2A] text-lg">{formatPesos(totalFinal)}</span>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2.5 rounded-xl">{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#fff', color: '#374151', border: '1px solid #E5E7EB', fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem', borderRadius: '0.25rem', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', color: 'white', fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 1rem', borderRadius: '0.25rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creando...' : 'Crear cotización rápida'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
