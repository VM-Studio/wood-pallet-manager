import { useState, useEffect } from 'react';
import { Plus, Trash2, Link2, Package, Phone, Mail, Pencil, MapPin, Building2 } from 'lucide-react';
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
  ubicacion?: string;
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
    tipoProducto: proveedor?.tipoProducto ?? 'seminuevo' as 'seminuevo' | 'nuevo_medida' | 'ambos',
    ubicacion: proveedor?.ubicacion ?? '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.nombreEmpresa.trim()) { setError('El nombre es obligatorio'); return; }
    setLoading(true);
    try {
      if (esEdicion) {
        await api.put(`/proveedores/${proveedor!.id}`, form);
      } else {
        await api.post('/proveedores', form);
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
      <div className="modal max-w-sm animate-slide-up">
        <div className="modal-header">
          <h2 className="modal-title">{esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onClose} className="btn-icon">✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div>
              <label className="label">Nombre del proveedor *</label>
              <input className="input" value={form.nombreEmpresa} autoFocus
                onChange={e => setForm({ ...form, nombreEmpresa: e.target.value })}
                placeholder="Ej: Galpón Familiar, Todo Pallets..." />
            </div>

            <div>
              <label className="label">Tipo de producto que provee *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
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

            <div>
              <label className="label">Ubicación del galpón</label>
              <input className="input" value={form.ubicacion}
                onChange={e => setForm({ ...form, ubicacion: e.target.value })}
                placeholder="Ej: Av. Roca 1234, Quilmes" />
              <p className="text-xs text-gray-400 mt-1">Se mostrará automáticamente al cliente al coordinar un retiro.</p>
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

  // Iniciales del proveedor para el avatar

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="titulo-modulo">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-1">
            {proveedores.length} proveedor{proveedores.length !== 1 ? 'es' : ''} activo{proveedores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditando(null); setShowModal(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#7c4b2c',
            color: '#fff', border: 'none', borderRadius: '0.25rem',
            padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Nuevo proveedor
        </button>
      </div>

      {/* Lista vacía */}
      {proveedores.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: '#fff', border: '1.5px solid #E8E2DA' }}>
          <Building2 size={28} style={{ color: '#D1D5DB', marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Sin proveedores</p>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '0 0 1.25rem' }}>Agregá tu primer proveedor para poder registrar compras.</p>
          <button onClick={() => { setEditando(null); setShowModal(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#7c4b2c', color: '#fff', border: 'none', borderRadius: '0.25rem', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={13} /> Agregar proveedor
          </button>
        </div>
      )}

      {/* Cards — 2 columnas en desktop, 1 en mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {proveedores.map(p => {
          const prods = p.prodProveedores ?? [];
          return (
            <div
              key={p.id}
              style={{
                background: '#fff',
                border: '1.5px solid #E8E2DA',
                borderLeft: '3px solid #6B3A2A',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {/* ── Encabezado ── */}
              <div style={{ padding: '1.25rem 1.25rem 1rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Tipo badge — minimalista */}
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#C4895A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {tipoLabel[p.tipoProducto]}
                  </span>
                  <p style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1F2937', margin: '2px 0 0', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.nombreEmpresa}
                  </p>
                </div>
                {/* Acciones */}
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => { setEditando(p); setShowModal(true); }}
                    title="Editar"
                    style={{ width: 30, height: 30, border: '1.5px solid #E8E2DA', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleEliminar(p.id, p.nombreEmpresa)}
                    title="Desactivar"
                    style={{ width: 30, height: 30, border: '1.5px solid #FEE2E2', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FCA5A5' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* ── Contacto ── */}
              <div style={{ padding: '0 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.telefono && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Phone size={12} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{p.telefono}</span>
                  </div>
                )}
                {p.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Mail size={12} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</span>
                  </div>
                )}
                {p.ubicacion && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={12} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>{p.ubicacion}</span>
                  </div>
                )}
                {!p.telefono && !p.email && !p.ubicacion && (
                  <span style={{ fontSize: '0.78rem', color: '#D1D5DB', fontStyle: 'italic' }}>Sin datos de contacto</span>
                )}
              </div>

              {/* ── Separador ── */}
              <div style={{ height: 1, background: '#F3F4F6', margin: '0 1.25rem' }} />

              {/* ── Productos ── */}
              <div style={{ padding: '0.875rem 1.25rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Productos · {prods.length}
                  </span>
                  <button
                    onClick={() => setVinculando(p)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, color: '#6B3A2A', padding: 0 }}
                  >
                    <Link2 size={11} /> Gestionar
                  </button>
                </div>

                {prods.length === 0 ? (
                  <button
                    onClick={() => setVinculando(p)}
                    style={{ width: '100%', padding: '0.65rem', border: '1.5px dashed #E8E2DA', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#C4B4AA', fontSize: '0.78rem', fontWeight: 500 }}
                  >
                    <Plus size={12} /> Asignar productos
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {prods.map(v => (
                      <div
                        key={v.id}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 4, height: 4, background: '#D1D5DB', flexShrink: 0 }} />
                          <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500 }}>{v.producto.nombre}</span>
                          <span style={{ fontSize: '0.7rem', color: '#D1D5DB' }}>{v.producto.tipo}</span>
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1F2937' }}>{formatPesos(v.precioCosto)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Observaciones ── */}
              {p.observaciones && (
                <>
                  <div style={{ height: 1, background: '#F3F4F6', margin: '0 1.25rem' }} />
                  <div style={{ padding: '0.625rem 1.25rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
                      {p.observaciones}
                    </p>
                  </div>
                </>
              )}
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
          }}
        />
      )}
    </div>
  );
}
