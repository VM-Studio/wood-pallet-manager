import { useMemo, useState } from 'react';
import { X, Globe, User, Building2, Phone, Mail, Package, Truck, Calendar, Leaf, CheckCircle, AlertTriangle, Search, UserPlus } from 'lucide-react';
import type { CotizacionWeb } from '../../types';
import { useConvertirCotizacionWeb } from '../../hooks/useCotizacionesWeb';
import { useClientes } from '../../hooks/useClientes';

const formatFecha = (s?: string) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const soloDigitos = (s: string) => s.replace(/\D/g, '');

const labelStyle: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' };
const boxStyle: React.CSSProperties = { borderRadius: 0, border: '1px solid #ECECEC', background: '#fff' };

interface Props {
  cotizacion: CotizacionWeb;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ConvertirWebModal({ cotizacion: cw, onClose, onSuccess }: Props) {
  const convertir = useConvertirCotizacionWeb();
  const { data: clientes = [] } = useClientes();

  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('existente');
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<number | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [incluyeFlete, setIncluyeFlete] = useState(cw.tipoEntrega === 'envio');
  const [costoFlete, setCostoFlete] = useState('');
  const [incluyeIva, setIncluyeIva] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [forzarClienteNuevo, setForzarClienteNuevo] = useState(false);

  // Datos nuevo cliente pre-poblados desde el formulario web
  const [nuevoNombre, setNuevoNombre] = useState(cw.empresa || cw.nombre);
  const [nuevoContacto, setNuevoContacto] = useState(cw.nombre);
  const [nuevoEmail, setNuevoEmail] = useState(cw.email);
  const [nuevoTelefono, setNuevoTelefono] = useState(cw.telefono);
  const [nuevaLocalidad, setNuevaLocalidad] = useState(cw.localidadEntrega || '');

  const clientesFiltrados = clientes.filter(c =>
    c.razonSocial.toLowerCase().includes(busquedaCliente.toLowerCase()) ||
    c.nombreContacto?.toLowerCase().includes(busquedaCliente.toLowerCase())
  ).slice(0, 8);

  // ── Detección de cliente duplicado al crear uno nuevo ──────────────────────
  const clienteDuplicado = useMemo(() => {
    if (modoCliente !== 'nuevo') return null;
    const nombre = nuevoNombre.trim().toLowerCase();
    const email = nuevoEmail.trim().toLowerCase();
    const telefono = soloDigitos(nuevoTelefono);
    if (!nombre && !email && !telefono) return null;
    return clientes.find(c => {
      const mismoEmail = !!email && c.emailContacto?.toLowerCase() === email;
      const mismoTelefono = telefono.length >= 6 && soloDigitos(c.telefonoContacto || '') === telefono;
      const mismoNombre = nombre.length >= 3 && c.razonSocial.trim().toLowerCase() === nombre;
      return mismoEmail || mismoTelefono || mismoNombre;
    }) || null;
  }, [modoCliente, nuevoNombre, nuevoEmail, nuevoTelefono, clientes]);

  const usarClienteDuplicado = () => {
    if (!clienteDuplicado) return;
    setModoCliente('existente');
    setClienteIdSeleccionado(clienteDuplicado.id);
    setBusquedaCliente(clienteDuplicado.razonSocial);
    setForzarClienteNuevo(false);
  };

  const cantidad = cw.cantidad ?? 1;
  const totalSinIva = precioUnitario && !isNaN(Number(precioUnitario))
    ? Number(precioUnitario) * cantidad + (incluyeFlete && costoFlete ? Number(costoFlete) : 0)
    : 0;
  const totalConIva = totalSinIva * 1.21;
  const totalFinal = incluyeIva ? totalConIva : totalSinIva;

  const handleConvertir = async () => {
    setError('');
    if (!precioUnitario || isNaN(Number(precioUnitario))) {
      setError('Ingresá el precio unitario');
      return;
    }
    if (modoCliente === 'existente' && !clienteIdSeleccionado) {
      setError('Seleccioná un cliente');
      return;
    }
    if (modoCliente === 'nuevo' && (!nuevoNombre.trim() || !nuevoContacto.trim() || !nuevoEmail.trim() || !nuevoTelefono.trim())) {
      setError('Completá todos los datos del cliente nuevo');
      return;
    }
    if (modoCliente === 'nuevo' && clienteDuplicado && !forzarClienteNuevo) {
      setError('Ya existe un cliente con estos datos. Usalo o confirmá que es un cliente diferente.');
      return;
    }

    try {
      await convertir.mutateAsync({
        id: cw.id,
        clienteId: modoCliente === 'existente' ? clienteIdSeleccionado! : undefined,
        nuevoCliente: modoCliente === 'nuevo' ? {
          razonSocial: nuevoNombre.trim(),
          nombreContacto: nuevoContacto.trim(),
          emailContacto: nuevoEmail.trim(),
          telefonoContacto: nuevoTelefono.trim(),
          localidad: nuevaLocalidad.trim() || undefined,
        } : undefined,
        precioUnitario: Number(precioUnitario),
        costoFlete: incluyeFlete && costoFlete ? Number(costoFlete) : undefined,
        incluyeFlete,
        incluyeIva,
      });
      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e?.response?.data?.error || 'Error al convertir');
    }
  };

  const formatPesos = (v: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up" style={{ maxHeight: '92vh', overflowY: 'auto', borderRadius: 0, border: '1px solid #E5E7EB' }}>
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            <h2 className="titulo-modulo" style={{ fontSize: '1.5rem' }}>Convertir a cotización</h2>
          </div>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
        </div>

        {done ? (
          <div className="modal-body text-center py-10">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-800">¡Cotización creada!</p>
            <p className="text-sm text-gray-500 mt-1">Podés verla en el módulo de Cotizaciones.</p>
          </div>
        ) : (
          <div className="modal-body space-y-5" style={{ padding: '1.5rem' }}>

            {/* Resumen del formulario web */}
            <div className="p-4" style={{ ...boxStyle, borderLeft: '2px solid #3B82F6', background: '#F8FAFF' }}>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Globe size={12} /> Datos del formulario web
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex items-center gap-1.5 text-gray-700"><User size={12} className="text-gray-400 shrink-0" />{cw.nombre}</div>
                {cw.empresa && <div className="flex items-center gap-1.5 text-gray-700"><Building2 size={12} className="text-gray-400 shrink-0" />{cw.empresa}</div>}
                <div className="flex items-center gap-1.5 text-gray-700"><Phone size={12} className="text-gray-400 shrink-0" />{cw.telefono}</div>
                <div className="flex items-center gap-1.5 text-gray-700"><Mail size={12} className="text-gray-400 shrink-0" />{cw.email}</div>
                <div className="flex items-center gap-1.5 text-gray-700"><Package size={12} className="text-gray-400 shrink-0" />{cw.tipoPallet} · {cw.cantidad} u</div>
                <div className="flex items-center gap-1.5 text-gray-700"><Calendar size={12} className="text-gray-400 shrink-0" />{formatFecha(cw.fechaNecesidad)}</div>
                <div className="flex items-center gap-1.5 text-gray-700"><Truck size={12} className="text-gray-400 shrink-0" />{cw.tipoEntrega === 'envio' ? 'Envío' : 'Retira'}{cw.localidadEntrega ? ` · ${cw.localidadEntrega}` : ''}</div>
                {cw.requiereSenasa && <div className="flex items-center gap-1.5 text-amber-600 font-medium"><Leaf size={12} />Requiere SENASA</div>}
              </div>
              {cw.observaciones && <p className="text-xs text-gray-500 mt-1 pt-2" style={{ borderTop: '1px solid #DCE6FA' }}>{cw.observaciones}</p>}
            </div>

            {/* Cliente */}
            <div>
              <label className="label mb-2" style={labelStyle}>Cliente <span style={{ color: '#B91C1C' }}>*</span></label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setModoCliente('existente')}
                  style={{
                    flex: 1, padding: '0.55rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
                    borderRadius: 0, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                    background: modoCliente === 'existente' ? '#7c4b2c' : '#fff',
                    color: modoCliente === 'existente' ? '#fff' : '#4B5563',
                    borderColor: modoCliente === 'existente' ? '#7c4b2c' : '#E5E7EB',
                  }}
                >
                  <User size={13} className="inline mr-1" /> Cliente existente
                </button>
                <button
                  type="button"
                  onClick={() => setModoCliente('nuevo')}
                  style={{
                    flex: 1, padding: '0.55rem 0.75rem', fontSize: '0.8rem', fontWeight: 600,
                    borderRadius: 0, border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                    background: modoCliente === 'nuevo' ? '#7c4b2c' : '#fff',
                    color: modoCliente === 'nuevo' ? '#fff' : '#4B5563',
                    borderColor: modoCliente === 'nuevo' ? '#7c4b2c' : '#E5E7EB',
                  }}
                >
                  <UserPlus size={13} className="inline mr-1" /> Cliente nuevo
                </button>
              </div>

              {modoCliente === 'existente' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input pl-9"
                      style={{ borderRadius: 0 }}
                      placeholder="Buscar cliente por nombre..."
                      value={busquedaCliente}
                      onChange={e => { setBusquedaCliente(e.target.value); setClienteIdSeleccionado(null); }}
                    />
                  </div>
                  {busquedaCliente.length >= 1 && (
                    <div className="overflow-y-auto" style={{ border: '1px solid #E5E7EB', borderRadius: 0, maxHeight: '10rem' }}>
                      {clientesFiltrados.length === 0 ? (
                        <p className="text-sm text-gray-400 p-3 text-center">Sin resultados</p>
                      ) : clientesFiltrados.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setClienteIdSeleccionado(c.id); setBusquedaCliente(c.razonSocial); }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${clienteIdSeleccionado === c.id ? 'bg-amber-50 text-amber-800 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                        >
                          {c.razonSocial}
                          {c.nombreContacto && <span className="text-xs text-gray-400 ml-1">· {c.nombreContacto}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {clienteIdSeleccionado && (
                    <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={11} /> Cliente seleccionado</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <input className="input" style={{ borderRadius: 0 }} placeholder="Razón social / empresa *" value={nuevoNombre} onChange={e => { setNuevoNombre(e.target.value); setForzarClienteNuevo(false); }} />
                  <input className="input" style={{ borderRadius: 0 }} placeholder="Nombre de contacto *" value={nuevoContacto} onChange={e => setNuevoContacto(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" style={{ borderRadius: 0 }} placeholder="Email *" value={nuevoEmail} onChange={e => { setNuevoEmail(e.target.value); setForzarClienteNuevo(false); }} />
                    <input className="input" style={{ borderRadius: 0 }} placeholder="Teléfono *" value={nuevoTelefono} onChange={e => { setNuevoTelefono(e.target.value); setForzarClienteNuevo(false); }} />
                  </div>
                  <input className="input" style={{ borderRadius: 0 }} placeholder="Localidad (opcional)" value={nuevaLocalidad} onChange={e => setNuevaLocalidad(e.target.value)} />

                  {clienteDuplicado && (
                    <div className="p-3" style={{ borderRadius: 0, border: '1px solid #FDE68A', background: '#FFFBEB' }}>
                      <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: '#92400E' }}>
                        <AlertTriangle size={13} className="shrink-0" /> Ya existe un cliente con estos datos
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#92400E' }}>
                        {clienteDuplicado.razonSocial}{clienteDuplicado.nombreContacto ? ` — ${clienteDuplicado.nombreContacto}` : ''}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={usarClienteDuplicado}
                          style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.35rem 0.7rem', borderRadius: 0, border: '1px solid #92400E', background: '#92400E', color: '#fff', cursor: 'pointer' }}
                        >
                          Usar este cliente
                        </button>
                        <label className="flex items-center gap-1.5 text-xs" style={{ color: '#92400E', cursor: 'pointer' }}>
                          <input type="checkbox" checked={forzarClienteNuevo} onChange={e => setForzarClienteNuevo(e.target.checked)} style={{ width: 14, height: 14, accentColor: '#92400E' }} />
                          Es un cliente distinto, crear igual
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Precio */}
            <div>
              <label className="label" style={labelStyle}>Precio unitario <span style={{ color: '#B91C1C' }}>*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  className="input pl-7"
                  style={{ borderRadius: 0 }}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={precioUnitario}
                  onChange={e => setPrecioUnitario(e.target.value)}
                />
              </div>
            </div>

            {/* Flete */}
            <div className="p-4" style={boxStyle}>
              <label className="flex items-center gap-2.5 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={incluyeFlete}
                  onChange={e => setIncluyeFlete(e.target.checked)}
                  style={{ width: 16, height: 16, borderRadius: 0, accentColor: '#7c4b2c' }}
                />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>Incluye flete</span>
              </label>
              {incluyeFlete && (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    className="input pl-7 text-sm"
                    style={{ borderRadius: 0 }}
                    type="number"
                    min="0"
                    placeholder="Costo del flete"
                    value={costoFlete}
                    onChange={e => setCostoFlete(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Total + toggle IVA */}
            {totalSinIva > 0 && (
              <div className="p-4" style={{ borderRadius: 0, border: '1px solid #ECECEC', borderLeft: '2px solid #7c4b2c', background: '#FAFAFA' }}>
                <div className="flex items-center justify-between mb-3 pb-2.5" style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <span className="text-sm font-medium" style={{ color: '#374151' }}>¿Incluir IVA? (21%)</span>
                  <div className="flex" style={{ borderRadius: 0, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                    <button
                      type="button"
                      onClick={() => setIncluyeIva(true)}
                      style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.875rem',
                        cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        background: incluyeIva ? '#7c4b2c' : '#fff',
                        color: incluyeIva ? '#fff' : '#6B7280',
                      }}
                    >Sí</button>
                    <button
                      type="button"
                      onClick={() => setIncluyeIva(false)}
                      style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.875rem',
                        cursor: 'pointer', border: 'none', borderLeft: '1px solid #E5E7EB', transition: 'all 0.15s',
                        background: !incluyeIva ? '#7c4b2c' : '#fff',
                        color: !incluyeIva ? '#fff' : '#6B7280',
                      }}
                    >No</button>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-1" style={{ color: '#6B7280' }}>
                  <span>Subtotal neto</span>
                  <span>{formatPesos(totalSinIva)}</span>
                </div>
                {incluyeIva && (
                  <div className="flex justify-between text-sm mb-1" style={{ color: '#9CA3AF' }}>
                    <span>IVA (21%)</span>
                    <span>{formatPesos(totalConIva - totalSinIva)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 mt-1" style={{ color: '#111827', borderTop: '1px solid #E5E7EB' }}>
                  <span>Total {incluyeIva ? 'con IVA' : 'sin IVA'}</span>
                  <span style={{ color: '#7c4b2c', fontSize: '1.15rem' }}>{formatPesos(totalFinal)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm px-3.5 py-2.5" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 0 }}>
                {error}
              </p>
            )}
          </div>
        )}

        {!done && (
          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151', border: '1px solid #E5E7EB',
                fontWeight: 500, fontSize: '0.875rem', padding: '0.55rem 1.1rem',
                borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >Cancelar</button>
            <button
              type="button"
              onClick={handleConvertir}
              disabled={convertir.isPending}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#7c4b2c', color: 'white', fontWeight: 500, fontSize: '0.875rem',
                padding: '0.55rem 1.1rem', borderRadius: 0, border: '1px solid #7c4b2c',
                cursor: convertir.isPending ? 'not-allowed' : 'pointer',
                opacity: convertir.isPending ? 0.6 : 1, transition: 'all 0.15s'
              }}
            >
              {convertir.isPending ? 'Convirtiendo...' : 'Crear cotización'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

