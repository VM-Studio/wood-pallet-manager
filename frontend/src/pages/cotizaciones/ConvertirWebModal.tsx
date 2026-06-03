import { useState } from 'react';
import { X, Globe, User, Building2, Phone, Mail, Package, Truck, Calendar, Leaf, CheckCircle, AlertTriangle, Search, UserPlus } from 'lucide-react';
import type { CotizacionWeb } from '../../types';
import { useConvertirCotizacionWeb } from '../../hooks/useCotizacionesWeb';
import { useClientes } from '../../hooks/useClientes';

const formatFecha = (s?: string) =>
  s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

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
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
      });
      setDone(true);
      setTimeout(onSuccess, 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e?.response?.data?.error || 'Error al convertir');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-xl animate-slide-up" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-blue-500" />
            <h2 className="modal-title">Convertir a cotización</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {done ? (
          <div className="modal-body text-center py-10">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-base font-semibold text-gray-800">¡Cotización creada!</p>
            <p className="text-sm text-gray-500 mt-1">Podés verla en el módulo de Cotizaciones.</p>
          </div>
        ) : (
          <div className="modal-body space-y-5">

            {/* Resumen del formulario web */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
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
              {cw.observaciones && <p className="text-xs text-gray-500 mt-1 pt-2 border-t border-blue-100">{cw.observaciones}</p>}
            </div>

            {/* Cliente */}
            <div>
              <label className="label mb-2">Cliente</label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setModoCliente('existente')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border font-medium transition-all ${modoCliente === 'existente' ? 'bg-brand-brown text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  style={modoCliente === 'existente' ? { background: 'linear-gradient(135deg,#6B3A2A,#C4895A)', border: 'none' } : {}}
                >
                  <User size={13} className="inline mr-1" /> Cliente existente
                </button>
                <button
                  type="button"
                  onClick={() => setModoCliente('nuevo')}
                  className={`flex-1 py-2 px-3 text-sm rounded-lg border font-medium transition-all ${modoCliente === 'nuevo' ? 'bg-brand-brown text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  style={modoCliente === 'nuevo' ? { background: 'linear-gradient(135deg,#6B3A2A,#C4895A)', border: 'none' } : {}}
                >
                  <UserPlus size={13} className="inline mr-1" /> Crear cliente nuevo
                </button>
              </div>

              {modoCliente === 'existente' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      className="input pl-9"
                      placeholder="Buscar cliente por nombre..."
                      value={busquedaCliente}
                      onChange={e => { setBusquedaCliente(e.target.value); setClienteIdSeleccionado(null); }}
                    />
                  </div>
                  {busquedaCliente.length >= 1 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
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
                  <input className="input" placeholder="Razón social / empresa *" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} />
                  <input className="input" placeholder="Nombre de contacto *" value={nuevoContacto} onChange={e => setNuevoContacto(e.target.value)} />
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input" placeholder="Email *" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} />
                    <input className="input" placeholder="Teléfono *" value={nuevoTelefono} onChange={e => setNuevoTelefono(e.target.value)} />
                  </div>
                  <input className="input" placeholder="Localidad (opcional)" value={nuevaLocalidad} onChange={e => setNuevaLocalidad(e.target.value)} />
                </div>
              )}
            </div>

            {/* Precio */}
            <div>
              <label className="label">Precio unitario *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  className="input pl-7"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={precioUnitario}
                  onChange={e => setPrecioUnitario(e.target.value)}
                />
              </div>
              {precioUnitario && !isNaN(Number(precioUnitario)) && (
                <p className="text-xs text-gray-400 mt-1">
                  Subtotal: $ {(Number(precioUnitario) * cw.cantidad).toLocaleString('es-AR')} · Con IVA: $ {(Number(precioUnitario) * cw.cantidad * 1.21).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                </p>
              )}
            </div>

            {/* Flete */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="incluyeFlete"
                checked={incluyeFlete}
                onChange={e => setIncluyeFlete(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <label htmlFor="incluyeFlete" className="text-sm text-gray-700 cursor-pointer">Incluye flete</label>
            </div>
            {incluyeFlete && (
              <div>
                <label className="label">Costo de flete</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    className="input pl-7"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={costoFlete}
                    onChange={e => setCostoFlete(e.target.value)}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <AlertTriangle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button onClick={onClose} className="btn-secondary">Cancelar</button>
              <button
                onClick={handleConvertir}
                disabled={convertir.isPending}
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg,#6B3A2A,#C4895A)' }}
              >
                {convertir.isPending ? 'Convirtiendo...' : 'Crear cotización'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
