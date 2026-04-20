import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import { useCrearCotizacion } from '../../hooks/useCotizaciones';
import { useClientes } from '../../hooks/useClientes';
import { useAuthStore } from '../../store/auth.store';
import api from '../../services/api';
import { generarPresupuestoPDF } from '../../utils/generarPresupuestoPDF';

interface NuevaCotizacionProps {
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
  transversales: ComponenteMedida;
  tirantes: ComponenteMedida;
  tacos: ComponenteMedida;
  baseInferior: ComponenteMedida;
  costoPorPie: number | '';
  gananciaPorPalet: number | '';
  cantidadUnidades: number | '';
}

interface DetalleForm {
  productoId: number; // -1 = pallet a medida
  cantidad: number;
  precioCalculado?: {
    precioUnitario: number;
    subtotal: number;
    bonificaFlete: boolean;
    escalon: string;
  };
  usarPrecioEspecial?: boolean;
  precioEspecial?: number;
  medida?: PalletMedida;
}

const COMPONENTES_MADERA = [
  { key: 'baseSuperior' as const,  label: 'Base superior'  },
  { key: 'transversales' as const, label: 'Transversales'  },
  { key: 'tirantes' as const,      label: 'Tirantes'       },
  { key: 'tacos' as const,         label: 'Tacos'          },
  { key: 'baseInferior' as const,  label: 'Base inferior'  },
];
type ComponenteKey = typeof COMPONENTES_MADERA[number]['key'];

const emptyComponente = (): ComponenteMedida => ({ tablas: '', largo: '', ancho: '', espesor: '' });
const defaultMedida = (): PalletMedida => ({
  baseSuperior: emptyComponente(),
  transversales: emptyComponente(),
  tirantes: emptyComponente(),
  tacos: emptyComponente(),
  baseInferior: emptyComponente(),
  costoPorPie: '',
  gananciaPorPalet: '',
  cantidadUnidades: '',
});

const calcularPiesComponente = (c: ComponenteMedida): number => {
  const t = typeof c.tablas  === 'number' ? c.tablas  : 0;
  const l = typeof c.largo   === 'number' ? c.largo   : 0; // mm → m (÷1000)
  const a = typeof c.ancho   === 'number' ? c.ancho   : 0; // mm → m (÷1000)
  const e = typeof c.espesor === 'number' ? c.espesor : 0; // mm → cm (÷10)
  if (!t || !l || !a || !e) return 0;
  return t * (l / 1000) * (a / 1000) * (e / 10) * 4.24;
};

export default function NuevaCotizacion({ onClose, onSuccess }: NuevaCotizacionProps) {
  const crearCotizacion = useCrearCotizacion();
  const { data: clientes } = useClientes();
  const { usuario } = useAuthStore();
  const [productos, setProductos] = useState<{ id: number; nombre: string; condicion: string; tipo: string }[]>([]);
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
      const nuevo = prev.map((d, i) => {
        if (i !== idx) return d;
        const updated = { ...d, [key]: value };
        if (key === 'productoId' && value === -1 && !updated.medida) {
          updated.medida = defaultMedida();
        }
        return updated;
      });
      const d = nuevo[idx];
      if (d.productoId > 0 && d.cantidad) {
        calcularPrecio(idx, d.productoId, d.cantidad);
      }
      return nuevo;
    });
  };

  const updateMedidaComponente = (idx: number, compKey: ComponenteKey, field: keyof ComponenteMedida, value: number | '') => {
    setDetalles(prev => prev.map((d, i) => {
      if (i !== idx || !d.medida) return d;
      return {
        ...d,
        medida: {
          ...d.medida,
          [compKey]: { ...d.medida[compKey], [field]: value },
        },
      };
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

  const totalSinIva = detalles.reduce((acc, d) => {
    if (d.productoId === -1 && d.medida) {
      // costoUnitario + ganancia = precio por unidad × cantidad
      // (se calcula en el render pero necesitamos el mismo valor aquí)
      // No podemos usar totalPies aquí directamente, lo recalculamos inline
      const piesTotal = COMPONENTES_MADERA.reduce(
        (s, comp) => s + calcularPiesComponente(d.medida![comp.key]), 0
      );
      const costoUnit = typeof d.medida.costoPorPie === 'number' ? piesTotal * d.medida.costoPorPie : 0;
      const ganancia  = typeof d.medida.gananciaPorPalet === 'number' ? d.medida.gananciaPorPalet : 0;
      const precioUnit = costoUnit + ganancia;
      const cantidad   = typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 1;
      return acc + precioUnit * cantidad;
    }
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
    const detalleInvalido = detalles.some(d => {
      if (d.productoId === -1) {
        return !d.medida || typeof d.medida.cantidadUnidades !== 'number' || d.medida.cantidadUnidades <= 0;
      }
      return !d.productoId || !d.cantidad;
    });
    if (detalleInvalido) {
      setError('Completá todos los productos'); return;
    }
    try {
      const resultado = await crearCotizacion.mutateAsync({
        ...form,
        detalles: detalles
          .map(d => {
            if (d.productoId === -1) {
              const piesTotal = COMPONENTES_MADERA.reduce(
                (s, comp) => s + calcularPiesComponente(d.medida![comp.key]), 0
              );
              const costoUnit  = typeof d.medida!.costoPorPie === 'number' ? piesTotal * d.medida!.costoPorPie : 0;
              const ganancia   = typeof d.medida!.gananciaPorPalet === 'number' ? d.medida!.gananciaPorPalet : 0;
              const precioUnit = costoUnit + ganancia;
              const cantidad   = typeof d.medida!.cantidadUnidades === 'number' && d.medida!.cantidadUnidades > 0 ? d.medida!.cantidadUnidades : 1;
              return {
                productoId: 0,       // el backend lo resuelve al ver esAMedida: true
                cantidad,
                precioUnitario: precioUnit,
                esAMedida: true,
                especificacion: {
                  medidas: COMPONENTES_MADERA.map(comp => {
                    const c = d.medida![comp.key];
                    return {
                      label:   comp.label,
                      tablas:  typeof c.tablas  === 'number' ? c.tablas  : undefined,
                      largo:   typeof c.largo   === 'number' ? c.largo   : undefined,
                      ancho:   typeof c.ancho   === 'number' ? c.ancho   : undefined,
                      espesor: typeof c.espesor === 'number' ? c.espesor : undefined,
                      pies:    calcularPiesComponente(c),
                    };
                  }).filter(m => m.pies > 0),
                },
              };
            }
            return {
              productoId: d.productoId,
              cantidad: d.cantidad,
              ...(d.usarPrecioEspecial && d.precioEspecial ? { precioUnitario: d.precioEspecial } : {})
            };
          })
          .filter(Boolean) as object[]
      });

      // ── Generar PDF ──────────────────────────────────────────────────────
      const cliente = clientes?.find(c => c.id === form.clienteId);
      const fechaStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const detallesPDF = detalles
        .filter(d => d.productoId > 0 || (d.productoId === -1 && d.medida))
        .map(d => {
          if (d.productoId === -1 && d.medida) {
            const piesTotal = COMPONENTES_MADERA.reduce(
              (s, comp) => s + calcularPiesComponente(d.medida![comp.key]), 0
            );
            const costoUnit  = typeof d.medida.costoPorPie === 'number' ? piesTotal * d.medida.costoPorPie : 0;
            const ganancia   = typeof d.medida.gananciaPorPalet === 'number' ? d.medida.gananciaPorPalet : 0;
            const precioUnit = costoUnit + ganancia;
            const cantidad   = typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 1;
            // Armar medidas para el PDF
            const medidasPallet = COMPONENTES_MADERA
              .map(comp => {
                const cData = d.medida![comp.key];
                const pies = calcularPiesComponente(cData);
                if (pies <= 0) return null;
                return {
                  label: comp.label,
                  tablas:  typeof cData.tablas  === 'number' ? cData.tablas  : undefined,
                  largo:   typeof cData.largo   === 'number' ? cData.largo   : undefined,
                  ancho:   typeof cData.ancho   === 'number' ? cData.ancho   : undefined,
                  espesor: typeof cData.espesor === 'number' ? cData.espesor : undefined,
                  pies,
                };
              })
              .filter(Boolean) as { label: string; tablas?: number; largo?: number; ancho?: number; espesor?: number; pies: number }[];
            return { nombreProducto: 'Pallet a medida', condicion: 'A medida', cantidad, precioUnitario: precioUnit, subtotal: precioUnit * cantidad, medidasPallet };
          }
          const prod = productos.find((p: { id: number }) => p.id === d.productoId);
          const precioUnit = getPrecioEfectivo(d);
          return {
            nombreProducto: (prod as { nombre: string } | undefined)?.nombre ?? `Producto #${d.productoId}`,
            condicion: (prod as { condicion: string } | undefined)?.condicion ?? '',
            cantidad: d.cantidad,
            precioUnitario: precioUnit,
            subtotal: precioUnit * d.cantidad,
          };
        });

      const pdfBlob = await generarPresupuestoPDF({
        numeroCotizacion: resultado.id,
        fechaCotizacion: fechaStr,
        razonSocialCliente: cliente?.razonSocial ?? '',
        cuitEmpresa: usuario?.cuit,
        detalles: detallesPDF,
        costoFlete: form.incluyeFlete ? form.costoFlete : undefined,
        costoSenasa: form.requiereSenasa ? form.costoSenasa : undefined,
        observaciones: form.observaciones || undefined,
        incluyeIva: form.incluyeIva,
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
    } catch (err: unknown) {
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al crear la cotización');
    }
  };

  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-5xl animate-slide-up">
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
                {clientes?.filter(c => c.usuarioAsignadoId === usuario?.id).map(c => (
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
                    {/* Selector de producto — siempre visible */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1">
                        <select
                          value={d.productoId}
                          onChange={e => updateDetalle(idx, 'productoId', parseInt(e.target.value))}
                          className="select text-xs py-2"
                          style={{ borderRadius: '0.25rem' }}
                        >
                          <option value={0}>Seleccioná un producto...</option>
                          <option value={-1}>📐 Pallet a medida (calculadora)</option>
                          {productos.map((p: { id: number; nombre: string; condicion: string }) => (
                            <option key={p.id} value={p.id}>{p.nombre} — {p.condicion}</option>
                          ))}
                        </select>
                      </div>
                      {detalles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDetalle(idx)}
                          className="btn-icon w-7 h-7 text-red-400 hover:bg-red-50 shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* ── Modo A MEDIDA ── */}
                    {d.productoId === -1 && d.medida && (() => {
                      const totalPies = COMPONENTES_MADERA.reduce(
                        (acc, comp) => acc + calcularPiesComponente(d.medida![comp.key]), 0
                      );
                      const costoTotal = typeof d.medida.costoPorPie === 'number' ? totalPies * d.medida.costoPorPie : 0;
                      return (
                        <div>
                          <p className="text-sm font-semibold text-[#6B3A2A] mb-2 flex items-center gap-1">
                            📐 Calculadora de pies de madera
                            <span className="text-xs font-normal text-gray-400 ml-1">tablas × (largo mm→m) × (ancho mm→m) × (espesor mm→m) × 4,24</span>
                          </p>
                          {/* Tabla de componentes */}
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
                                        <td key={field} style={{ padding: '0.3rem 0.3rem' }}>
                                          <input
                                            type="number"
                                            min={0}
                                            step="0.01"
                                            placeholder="—"
                                            value={cData[field] === '' ? '' : cData[field]}
                                            onChange={e => updateMedidaComponente(idx, comp.key, field, e.target.value === '' ? '' : parseFloat(e.target.value))}
                                            style={{
                                              width: '100%', textAlign: 'center', fontSize: '0.82rem',
                                              padding: '0.35rem 0.4rem', border: '1px solid #E5E7EB',
                                              borderRadius: '0.25rem', background: '#fff', outline: 'none',
                                              minWidth: '64px',
                                            }}
                                          />
                                        </td>
                                      ))}
                                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 700, color: pies > 0 ? '#6B3A2A' : '#D1D5DB', whiteSpace: 'nowrap' }}>
                                        {pies > 0 ? pies.toFixed(4) : '—'}
                                      </td>
                                      <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>
                                        {pies > 0 && typeof d.medida!.costoPorPie === 'number' && d.medida!.costoPorPie > 0
                                          ? formatPesos(pies * d.medida!.costoPorPie)
                                          : '—'}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr style={{ background: '#FDF6EE', borderTop: '2px solid #C4895A' }}>
                                  <td colSpan={5} style={{ padding: '0.45rem 0.6rem', fontWeight: 700, fontSize: '0.85rem', color: '#6B3A2A' }}>
                                    Total pies
                                  </td>
                                  <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#6B3A2A' }}>
                                    {totalPies > 0 ? totalPies.toFixed(4) : '—'}
                                  </td>
                                  <td style={{ padding: '0.45rem 0.6rem', textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', color: '#374151' }}>
                                    {totalPies > 0 && typeof d.medida.costoPorPie === 'number' && d.medida.costoPorPie > 0
                                      ? formatPesos(totalPies * d.medida.costoPorPie)
                                      : '—'}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Campos de precio y cantidad */}
                          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                            {/* Costo por pie */}
                            <div>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '0.25rem' }}>
                                Costo por pie ($ que comprás)
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="$ por pie"
                                value={d.medida.costoPorPie === '' ? '' : d.medida.costoPorPie}
                                onChange={e => updateMedidaGlobal(idx, 'costoPorPie', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input py-2"
                                style={{ borderRadius: '0.25rem' }}
                              />
                              {costoTotal > 0 && (
                                <p style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                  Costo unitario madera: <strong>{formatPesos(costoTotal)}</strong>
                                </p>
                              )}
                            </div>

                            {/* Cantidad de unidades */}
                            <div>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '0.25rem' }}>
                                Cantidad de unidades
                              </label>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="Cantidad"
                                value={d.medida.cantidadUnidades === '' ? '' : d.medida.cantidadUnidades}
                                onChange={e => updateMedidaGlobal(idx, 'cantidadUnidades', e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="input py-2"
                                style={{ borderRadius: '0.25rem' }}
                              />
                            </div>

                            {/* Ganancia por palet */}
                            <div>
                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4B5563', display: 'block', marginBottom: '0.25rem' }}>
                                Ganancia por palet
                              </label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="$ ganancia"
                                value={d.medida.gananciaPorPalet === '' ? '' : d.medida.gananciaPorPalet}
                                onChange={e => updateMedidaGlobal(idx, 'gananciaPorPalet', e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="input py-2"
                                style={{ borderRadius: '0.25rem' }}
                              />
                            </div>

                            {/* Resumen de precio */}
                            {(() => {
                              const ganancia = typeof d.medida.gananciaPorPalet === 'number' ? d.medida.gananciaPorPalet : 0;
                              const precioUnit = costoTotal + ganancia;
                              const cantidad = typeof d.medida.cantidadUnidades === 'number' && d.medida.cantidadUnidades > 0 ? d.medida.cantidadUnidades : 0;
                              const totalMedida = precioUnit * cantidad;
                              if (precioUnit <= 0 || cantidad <= 0) return null;
                              return (
                                <div style={{ background: '#FDF6EE', border: '1px solid #C4895A', borderRadius: '0.25rem', padding: '0.625rem 0.875rem' }}>
                                  <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.3rem' }}>
                                    Precio por unidad: <strong style={{ color: '#6B3A2A' }}>{formatPesos(precioUnit)}</strong>
                                    <span style={{ color: '#9CA3AF', marginLeft: '0.4rem' }}>
                                      ({formatPesos(costoTotal)} costo + {formatPesos(ganancia)} ganancia)
                                    </span>
                                  </p>
                                  <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#6B3A2A' }}>
                                    Total ({cantidad} u.): {formatPesos(totalMedida)}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── Modo PRODUCTO NORMAL ── */}
                    {d.productoId > 0 && (() => (
                      <>
                        <div className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-5">
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
                          <div className="col-span-7 text-right">
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
                        </div>
                        {/* Selector de precio por unidad */}
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-1.5">Precio por unidad</p>
                          <div className="flex items-center gap-2">
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
                              >Guardado</button>
                              <button
                                type="button"
                                onClick={() => setDetalles(prev => prev.map((x, i) => i === idx ? { ...x, usarPrecioEspecial: true } : x))}
                                style={{
                                  fontSize: '0.7rem', fontWeight: 600, padding: '0.25rem 0.625rem',
                                  cursor: 'pointer', transition: 'all 0.15s', border: 'none', borderLeft: '1px solid #E5E7EB',
                                  background: d.usarPrecioEspecial ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#fff',
                                  color: d.usarPrecioEspecial ? '#fff' : '#6B7280',
                                }}
                              >Precio especial</button>
                            </div>
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
                      </>
                    ))()}
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
