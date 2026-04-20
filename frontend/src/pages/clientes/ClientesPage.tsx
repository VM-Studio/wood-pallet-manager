import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, History, Pencil, MapPin, Phone, MessageCircle, Users, Trash2 } from 'lucide-react';
import { useClientes } from '../../hooks/useClientes';
import { useEliminarCliente } from '../../hooks/useClientes';
import { useAuthStore } from '../../store/auth.store';
import type { Cliente } from '../../types';
import ClienteForm from './ClienteForm';
import ClienteHistorial from './ClienteHistorial';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

const canalLabel: Record<string, string> = {
  whatsapp: 'WhatsApp',
  formulario_web: 'Web',
  llamada: 'Llamada',
  recomendacion: 'Recomendación',
  otro: 'Otro'
};

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
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="titulo-modulo">Clientes</h1>
          <p className="text-sm text-gray-600 mt-1">
            {clientes?.length || 0} clientes en total
          </p>
        </div>
        <button
          onClick={() => { setClienteEditar(null); setShowForm(true); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            color: 'white', fontWeight: 500, fontSize: '0.875rem',
            padding: '0.5rem 1rem', borderRadius: '0.25rem',
            border: 'none', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #5A3022 0%, #B07848 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          <Plus size={16} />
          Nuevo cliente
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, CUIT, contacto o localidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex border border-gray-200 overflow-hidden" style={{ borderRadius: '0.25rem' }}>
          <button
            onClick={() => setFiltro('todos')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.15s',
              background: filtro === 'todos'
                ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                : '#fff',
              color: filtro === 'todos' ? '#fff' : '#4B5563',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Todos ({clientes?.length || 0})
          </button>
          <button
            onClick={() => setFiltro('mios')}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'all 0.15s',
              background: filtro === 'mios'
                ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)'
                : '#fff',
              color: filtro === 'mios' ? '#fff' : '#4B5563',
              borderLeft: '1px solid #E5E7EB',
              cursor: 'pointer'
            }}
          >
            Mis clientes ({clientes?.filter(c => c.usuarioAsignadoId === usuario?.id).length || 0})
          </button>
        </div>
      </div>

      {/* Lista de clientes */}
      {!clientesFiltrados?.length ? (
        <div className="card-base flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center mx-auto mb-3">
            <Users size={22} className="text-gray-400" />
          </div>
          <p className="titulo-card">No se encontraron clientes</p>
          <p className="text-xs text-gray-400 mt-1">
            {busqueda ? 'Probá con otro término de búsqueda' : 'Creá el primer cliente con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className={clsx(
                'card-base transition-all hover:shadow-md',
                esAsignado(cliente) && 'border-l-4 border-l-[#C4895A]'
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="titulo-card truncate" style={{ fontSize: '1.15rem', fontWeight: 800 }}>{cliente.razonSocial}</h3>
                  {cliente.cuit && (
                    <p className="text-xs text-gray-400 mt-0.5">CUIT: {cliente.cuit}</p>
                  )}
                </div>
                {cliente.esExportador && (
                  <span className="badge-blue ml-2 shrink-0">Exportador</span>
                )}
              </div>

              {/* Info de contacto */}
              <div className="space-y-1.5 mb-4">
                {cliente.nombreContacto && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Users size={12} className="text-gray-400 shrink-0" />
                    {cliente.nombreContacto}
                  </p>
                )}
                {cliente.telefonoContacto && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400 shrink-0" />
                    {cliente.telefonoContacto}
                  </p>
                )}
                {cliente.localidad && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-400 shrink-0" />
                    {cliente.localidad}
                  </p>
                )}
                {cliente.canalEntrada && (
                  <p className="text-xs text-gray-400">
                    {canalLabel[cliente.canalEntrada] || cliente.canalEntrada}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: esAsignado(cliente) ? '#C4895A' : '#6B3A2A' }}>
                    {cliente.usuarioAsignado?.nombre[0]}
                  </div>
                  <span className="text-xs text-gray-400">
                    {esAsignado(cliente) ? 'Tuyo' : cliente.usuarioAsignado?.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClienteHistorial(cliente.id)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="Ver historial"
                  >
                    <History size={15} />
                  </button>
                  {esAsignado(cliente) && (
                    <button
                      onClick={() => { setClienteEditar(cliente); setShowForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Editar cliente"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar a "${cliente.razonSocial}"? Esta acción no se puede deshacer.`)) {
                        eliminarCliente.mutate(cliente.id);
                      }
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Eliminar cliente"
                  >
                    <Trash2 size={15} />
                  </button>
                  {cliente.telefonoContacto && (
                    <a
                      href={`https://wa.me/${cliente.telefonoContacto.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle size={15} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <ClienteForm
          cliente={clienteEditar || undefined}
          onClose={() => { setShowForm(false); setClienteEditar(null); }}
          onSuccess={() => { setShowForm(false); setClienteEditar(null); }}
        />
      )}

      {/* Modal historial */}
      {clienteHistorial && (
        <ClienteHistorial
          clienteId={clienteHistorial}
          onClose={() => setClienteHistorial(null)}
        />
      )}

    </div>
  );
}
