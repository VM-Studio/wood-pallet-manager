import { useState, useEffect } from 'react';
import { Plus, Trash2, Link2, Package, Phone, Mail, Pencil } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';

interface Producto {
  id: number;
  nombre: string;
  tipo: string;
  condicion: string;
}

interface ProdProveedor {
  id: number;
  productoId: number;
  precioCosto: number;
  producto: { id: number; nombre: string; tipo: string };
}

interface Proveedor {
  id: number;
  nombreEmpresa: string;
  nombreContacto: string;
  telefono?: string;
  email?: string;
  tipoProducto: 'seminuevo' | 'nuevo_medida' | 'ambos';
  distanciaKm?: number;
  observaciones?: string;
  activo: boolean;
  prodProveedores?: ProdProveedor[];
}

const tipoLabel: Record<string, string> = {
  seminuevo: 'Seminuevo',
  nuevo_medida: 'Nuevo / A medida',
  ambos: 'Ambos',
};

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

// ─── Modal Nuevo/Editar Proveedor ────────────────────────
function ProveedorModal({
  proveedor,
  onClose,
  onSaved,
}: {
  proveedor: Proveedor | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!proveedor;
  const [form, setForm] = useState({
    nombreEmpresa: proveedor?.nombreEmpresa ?? '',
    nombreContacto: proveedor?.nombreContacto ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    tipoProducto: proveedor?.tipoProducto ?? 'seminuevo' as 'seminuevo' | 'nuevo_medida' | 'ambos',
    distanciaKm: proveedor?.distanciaKm ? String(proveedor.distanciaKm) : '',
    observaciones: proveedor?.observaciones ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nombreEmpresa.trim()) { setError('El nombre de la empresa es obligatorio'); return; }
    if (!form.nombreContacto.trim()) { setError('El nombre de contacto es obligatorio'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        distanciaKm: form.distanciaKm ? parseInt(form.distanciaKm) : undefined,
      };
      if (esEdicion) {
        await api.put(`/proveedores/${proveedor!.id}`, payload);
      } else {
        await api.post('/proveedores', payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Error al guardar el proveedor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">{esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Nombre de la empresa *</label>
                <input className="input" value={form.nombreEmpresa}
                  onChange={e => setForm({ ...form, nombreEmpresa: e.target.value })}
                  placeholder="Ej: Galpón Familiar" />
              </div>
              <div className="col-span-2">
                <label className="label">Nombre del contacto *</label>
                <input className="input" value={form.nombreContacto}
                  onChange={e => setForm({ ...form, nombreContacto: e.target.value })}
                  placeholder="Ej: Brian Hernández" />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: e.target.value })}
                  placeholder="11 2345-6789" />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="proveedor@email.com" />
              </div>
            </div>

            <div>
              <label className="label">Tipo de producto que provee *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['seminuevo', 'nuevo_medida', 'ambos'] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm({ ...form, tipoProducto: t })}
                    className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.tipoProducto === t
                        ? 'border-[#6B3A2A] bg-amber-50 text-[#6B3A2A]'
                        : 'border-gray-200 bg-white hover:border-gray-300 text-gray-600'
                    }`}>
                    {tipoLabel[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Distancia (km)</label>
                <input className="input" type="number" min="0" value={form.distanciaKm}
                  onChange={e => setForm({ ...form, distanciaKm: e.target.value })}
                  placeholder="0" />
              </div>
            </div>

            <div>
              <label className="label">Observaciones</label>
              <textarea className="input resize-none" rows={2} value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                placeholder="Notas sobre el proveedor..." />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Vincular Productos ────────────────────────────
function VincularProductosModal({
  proveedor,
  onClose,
  onSaved,
}: {
  proveedor: Proveedor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [vinculados, setVinculados] = useState<ProdProveedor[]>(proveedor.prodProveedores ?? []);
  const [seleccionado, setSeleccionado] = useState<number>(0);
  const [precioCosto, setPrecioCosto] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/productos').then(r => setProductos(r.data)).catch(() => {});
  }, []);

  const productosDisponibles = productos.filter(
    p => !vinculados.some(v => v.productoId === p.id)
  );

  const handleVincular = async () => {
    if (!seleccionado) { setError('Seleccioná un producto'); return; }
    if (!precioCosto || parseFloat(precioCosto) <= 0) { setError('Ingresá el precio de costo'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post(`/proveedores/${proveedor.id}/productos`, {
        productoId: seleccionado,
        precioCosto: parseFloat(precioCosto),
      });
      // Recargar proveedor para obtener lista actualizada
      const res = await api.get(`/proveedores/${proveedor.id}`);
      setVinculados(res.data.prodProveedores ?? []);
      setSeleccionado(0);
      setPrecioCosto('');
      onSaved();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error ?? 'Error al vincular producto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal max-w-lg animate-slide-up">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Productos de {proveedor.nombreEmpresa}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Asigná los productos que provee este proveedor</p>
          </div>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>

        <div className="modal-body space-y-5">
          {/* Lista de vinculados */}
          {vinculados.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Productos asignados</p>
              {vinculados.map(v => (
                <div key={v.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Package size={15} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-800">{v.producto.nombre}</span>
                    <span className="text-xs text-gray-400">({v.producto.tipo})</span>
                  </div>
                  <span className="text-sm font-semibold text-green-700">{formatPesos(v.precioCosto)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-3">Sin productos asignados aún</p>
          )}

          {/* Agregar nuevo */}
          {productosDisponibles.length > 0 && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agregar producto</p>
              <div>
                <label className="label">Producto</label>
                <select className="input" value={seleccionado}
                  onChange={e => setSeleccionado(parseInt(e.target.value))}>
                  <option value={0}>Seleccioná un producto...</option>
                  {productosDisponibles.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} ({p.condicion})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Precio de costo ($ por unidad)</label>
                <input className="input" type="number" min="0" step="0.01"
                  value={precioCosto}
                  onChange={e => setPrecioCosto(e.target.value)}
                  placeholder="Ej: 2500" />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">{error}</p>
              )}
              <button onClick={handleVincular} disabled={loading} className="btn-primary w-full">
                {loading ? 'Vinculando...' : <><Link2 size={15} /> Vincular producto</>}
              </button>
            </div>
          )}

          {productosDisponibles.length === 0 && vinculados.length > 0 && (
            <p className="text-sm text-gray-400 text-center pb-2">Todos los productos ya están asignados a este proveedor</p>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">Listo</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────
export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Proveedor | null>(null);
  const [vinculando, setVinculando] = useState<Proveedor | null>(null);

  const cargarConDetalle = async () => {
    try {
      const res = await api.get('/proveedores');
      // Cargar detalle de cada proveedor para ver productos vinculados
      const detallados = await Promise.all(
        res.data.map((p: Proveedor) => api.get(`/proveedores/${p.id}`).then(r => r.data))
      );
      setProveedores(detallados);
    } catch {
      setErrorMsg('No se pudieron cargar los proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { cargarConDetalle(); }, []);

  const handleEliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar a "${nombre}"?`)) return;
    try {
      await api.delete(`/proveedores/${id}`);
      setProveedores(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Error al desactivar el proveedor');
    }
  };

  if (isLoading) return <LoadingSpinner text="Cargando proveedores..." />;
  if (errorMsg) return <ErrorMessage message={errorMsg} onRetry={cargarConDetalle} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Proveedores</h1>
          <p className="text-sm text-gray-600 mt-1">{proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} registrado{proveedores.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setEditando(null); setShowModal(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer',
          }}>
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </div>

      {/* Lista vacía */}
      {proveedores.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin proveedores</h3>
          <p className="text-gray-500 text-sm mb-6">Agregá tu primer proveedor para poder registrar compras.</p>
          <button onClick={() => { setEditando(null); setShowModal(true); }} className="btn-primary">
            <Plus size={15} /> Agregar proveedor
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {proveedores.map(p => {
          const cantProductos = p.prodProveedores?.length ?? 0;
          return (
            <div key={p.id} className="card p-5 space-y-4">
              {/* Header card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base truncate">{p.nombreEmpresa}</h3>
                  <p className="text-sm text-gray-500 truncate">{p.nombreContacto}</p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                  p.tipoProducto === 'seminuevo'
                    ? 'bg-amber-100 text-amber-700'
                    : p.tipoProducto === 'nuevo_medida'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {tipoLabel[p.tipoProducto]}
                </span>
              </div>

              {/* Info */}
              <div className="space-y-1.5">
                {p.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone size={13} className="text-gray-400 shrink-0" />
                    <span>{p.telefono}</span>
                  </div>
                )}
                {p.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{p.email}</span>
                  </div>
                )}
              </div>

              {/* Productos vinculados */}
              <div
                onClick={() => setVinculando(p)}
                className="cursor-pointer flex items-center justify-between p-3 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-300 rounded-xl transition-all">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-700">
                    {cantProductos === 0
                      ? 'Sin productos asignados'
                      : `${cantProductos} producto${cantProductos !== 1 ? 's' : ''} asignado${cantProductos !== 1 ? 's' : ''}`}
                  </span>
                </div>
                <Link2 size={13} className="text-amber-600" />
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => { setEditando(p); setShowModal(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all">
                  <Pencil size={13} />
                  Editar
                </button>
                <button
                  onClick={() => handleEliminar(p.id, p.nombreEmpresa)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={13} />
                  Desactivar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modales */}
      {showModal && (
        <ProveedorModal
          proveedor={editando}
          onClose={() => setShowModal(false)}
          onSaved={cargarConDetalle}
        />
      )}
      {vinculando && (
        <VincularProductosModal
          proveedor={vinculando}
          onClose={() => setVinculando(null)}
          onSaved={() => {
            cargarConDetalle();
            // Actualizar el proveedor en el estado local para reflejar cambios
          }}
        />
      )}
    </div>
  );
}
