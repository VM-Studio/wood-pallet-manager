import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, History, Pencil, MapPin, Phone, MessageCircle, Users, Trash2, Building2 } from 'lucide-react';
import { useClientes } from '../../hooks/useClientes';
import { useEliminarCliente } from '../../hooks/useClientes';
import { useAuthStore } from '../../store/auth.store';
import type { Cliente } from '../../types';
import ClienteForm from './ClienteForm';
import ClienteHistorial from './ClienteHistorial';
import CargarHistorialModal from './CargarHistorialModal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';


export default function ClientesPage() {
  const { usuario } = useAuthStore();
  const { data: clientes, isLoading, error } = useClientes();
  const eliminarCliente = useEliminarCliente();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'mios'>('mios');
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(() => searchParams.get('nuevo') === 'true');
  const [clienteEditar, setClienteEditar] = useState<Cliente | null>(null);
  const [clienteHistorial, setClienteHistorial] = useState<number | null>(null);
  const [clienteCargarHistorial, setClienteCargarHistorial] = useState<Cliente | null>(null);

  const clientesFiltrados = clientes?.filter((c) => {
    const matchBusqueda =
      c.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.cuit?.includes(busqueda) ||
      c.nombreContacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.localidad?.toLowerCase().includes(busqueda.toLowerCase());
    const matchFiltro =
      filtro === 'todos' ||
      (filtro === 'mios' && c.usuarioAsignadoId === usuario?.id);
    return matchBusqueda && matchFiltro;
  });

  const esAsignado = (cliente: Cliente) => cliente.usuarioAsignadoId === usuario?.id;

  if (isLoading) return <LoadingSpinner text="Cargando clientes..." />;
  if (error) return <ErrorMessage message="No se pudieron cargar los clientes." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} className="animate-fade-in">

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 className="titulo-modulo">Clientes</h1>
          <p style={{ fontSize: '0.8125rem', color: '#9E8878', marginTop: '0.2rem' }}>
            {clientes?.length || 0} clientes registrados
          </p>
        </div>
        <button
          onClick={() => { setClienteEditar(null); setShowForm(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 600, fontSize: '0.875rem',
            padding: '0.6rem 1.25rem', borderRadius: 0,
            border: 'none', cursor: 'pointer', transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(107,58,42,0.25)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(107,58,42,0.35)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(107,58,42,0.25)';
          }}
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* ── Filtros y búsqueda ── */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Buscador */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#B8A89A', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Buscar por razón social, CUIT, contacto o localidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: '100%', padding: '0.6rem 0.875rem 0.6rem 2.375rem',
              border: '1.5px solid #E8E2DA', borderRadius: 0,
              fontSize: '0.875rem', color: '#1a1a1a', background: '#FAFAF8',
              outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#C4895A')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E8E2DA')}
          />
        </div>
        {/* Toggle tabs */}
        <div style={{ display: 'flex', background: '#FAFAF8', border: '1.5px solid #E8E2DA', borderRadius: 0, overflow: 'hidden' }}>
          {(['todos', 'mios'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                padding: '0.6rem 1.1rem',
                fontSize: '0.8375rem', fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: filtro === f ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : 'transparent',
                color: filtro === f ? '#fff' : '#6B7280',
                borderRight: f === 'todos' ? '1px solid #E8E2DA' : 'none',
              }}
            >
              {f === 'todos'
                ? `Todos (${clientes?.length || 0})`
                : `Mis clientes (${clientes?.filter(c => c.usuarioAsignadoId === usuario?.id).length || 0})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Lista de clientes ── */}
      {!clientesFiltrados?.length ? (
        <div style={{
          background: '#FAFAF8', border: '1.5px solid #E8E2DA', borderRadius: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3rem 1rem', textAlign: 'center',
        }}>
          <div style={{ width: 48, height: 48, background: '#F0E8DF', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem' }}>
            <Users size={22} style={{ color: '#C4895A' }} />
          </div>
          <p style={{ fontWeight: 600, color: '#3D2B1F', fontSize: '0.9375rem' }}>No se encontraron clientes</p>
          <p style={{ fontSize: '0.8125rem', color: '#9E8878', marginTop: '0.25rem' }}>
            {busqueda ? 'Probá con otro término de búsqueda' : 'Creá el primer cliente con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              style={{
                background: '#FAFAF8',
                border: '1.5px solid #E8E2DA',
                borderRadius: 0,
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                transition: 'background 0.15s, box-shadow 0.15s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = '#F5EFE8';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(107,58,42,0.08)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#FAFAF8';
                (e.currentTarget as HTMLElement).style.boxShadow = 'none';
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 0, flexShrink: 0,
                background: esAsignado(cliente)
                  ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                  : 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '1rem',
              }}>
                {cliente.razonSocial[0].toUpperCase()}
              </div>

              {/* Nombre + CUIT */}
              <div style={{ flex: '0 0 220px', minWidth: 0 }}>
                <p style={{
                  fontWeight: 700, fontSize: '0.9rem', color: '#1a1a1a',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {cliente.razonSocial}
                </p>
                <p style={{ fontSize: '0.72rem', color: '#9E8878', marginTop: '0.1rem' }}>
                  {cliente.cuit ? `CUIT ${cliente.cuit}` : <span style={{ fontStyle: 'italic' }}>Sin CUIT</span>}
                </p>
              </div>

              {/* Contacto */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {cliente.nombreContacto && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={11} style={{ color: '#B8A89A', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8rem', color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cliente.nombreContacto}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {cliente.telefonoContacto && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={11} style={{ color: '#B8A89A', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>{cliente.telefonoContacto}</span>
                    </div>
                  )}
                  {cliente.localidad && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={11} style={{ color: '#B8A89A', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>{cliente.localidad}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                {cliente.esExportador && (
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 600, padding: '0.2rem 0.55rem',
                    borderRadius: 0, background: '#DBEAFE', color: '#1D4ED8',
                  }}>Exportador</span>
                )}
              </div>

              {/* Propietario */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, minWidth: 72 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 0,
                  background: esAsignado(cliente)
                    ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                    : '#9CA3AF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.58rem', fontWeight: 700,
                }}>
                  {cliente.usuarioAsignado?.nombre[0]}
                </div>
                <span style={{ fontSize: '0.72rem', color: '#9E8878', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {esAsignado(cliente) ? 'Tuyo' : cliente.usuarioAsignado?.nombre}
                </span>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  onClick={() => setClienteHistorial(cliente.id)}
                  title="Ver historial"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.55rem', borderRadius: 0,
                    border: '1px solid #E8D5C0', background: '#FEF3E8',
                    color: '#92400E', fontSize: '0.68rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FDE8CC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FEF3E8'}
                >
                  <History size={12} /> Historial
                </button>
                <button
                  onClick={() => setClienteCargarHistorial(cliente)}
                  title="Cargar historial"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.55rem', borderRadius: 0,
                    border: '1px solid #A0623A', background: '#7C4A2D',
                    color: '#fff', fontSize: '0.68rem', fontWeight: 600,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#5E3520'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#7C4A2D'}
                >
                  <Building2 size={12} /> Cargar historial
                </button>
                <div style={{ width: 1, height: 18, background: '#E8E2DA', margin: '0 0.1rem' }} />
                {esAsignado(cliente) && (
                  <button
                    onClick={() => { setClienteEditar(cliente); setShowForm(true); }}
                    title="Editar"
                    style={{
                      padding: '0.35rem', borderRadius: 0, border: 'none',
                      background: 'transparent', color: '#B8A89A', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#E8E2DA'; (e.currentTarget as HTMLElement).style.color = '#1a1a1a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B8A89A'; }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (window.confirm(`¿Eliminar a "${cliente.razonSocial}"? Esta acción no se puede deshacer.`)) {
                      eliminarCliente.mutate(cliente.id);
                    }
                  }}
                  title="Eliminar"
                  style={{
                    padding: '0.35rem', borderRadius: 0, border: 'none',
                    background: 'transparent', color: '#B8A89A', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEE2E2'; (e.currentTarget as HTMLElement).style.color = '#DC2626'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B8A89A'; }}
                >
                  <Trash2 size={14} />
                </button>
                {cliente.telefonoContacto && (
                  <a
                    href={`https://wa.me/${cliente.telefonoContacto.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir WhatsApp"
                    style={{
                      padding: '0.35rem', borderRadius: 0,
                      color: '#B8A89A', display: 'flex', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#DCFCE7'; (e.currentTarget as HTMLElement).style.color = '#16A34A'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#B8A89A'; }}
                  >
                    <MessageCircle size={14} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modales — sin cambios */}
      {showForm && (
        <ClienteForm
          cliente={clienteEditar || undefined}
          onClose={() => { setShowForm(false); setClienteEditar(null); }}
          onSuccess={() => { setShowForm(false); setClienteEditar(null); }}
        />
      )}
      {clienteHistorial && (
        <ClienteHistorial
          clienteId={clienteHistorial}
          onClose={() => setClienteHistorial(null)}
        />
      )}
      {clienteCargarHistorial && (
        <CargarHistorialModal
          clienteId={clienteCargarHistorial.id}
          razonSocial={clienteCargarHistorial.razonSocial}
          onClose={() => setClienteCargarHistorial(null)}
        />
      )}
    </div>
  );
}
