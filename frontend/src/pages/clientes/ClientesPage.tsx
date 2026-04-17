import { useState } from 'react';
import { Search, Plus, History, Pencil, MapPin, Phone, MessageCircle } from 'lucide-react';
import { useClientes } from '../../hooks/useClientes';
import { useAuthStore } from '../../store/auth.store';
import type { Cliente } from '../../types';
import ClienteForm from './ClienteForm';
import ClienteHistorial from './ClienteHistorial';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import { clsx } from 'clsx';

const canalLabel: Record<string, string> = {
  whatsapp: '💬 WhatsApp',
  formulario_web: '🌐 Web',
  llamada: '📞 Llamada',
  recomendacion: '🤝 Recomendación',
  otro: 'Otro'
};

export default function ClientesPage() {
  const { usuario } = useAuthStore();
  const { data: clientes, isLoading, error } = useClientes();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'mios'>('todos');
  const [showForm, setShowForm] = useState(false);
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
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {clientes?.length || 0} clientes en total
          </p>
        </div>
        <button
          onClick={() => { setClienteEditar(null); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus size={18} />
          Nuevo cliente
        </button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por razón social, CUIT, contacto o localidad..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="input-field pl-9"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setFiltro('todos')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              filtro === 'todos'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            Todos ({clientes?.length || 0})
          </button>
          <button
            onClick={() => setFiltro('mios')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors border-l border-gray-200',
              filtro === 'mios'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            Mis clientes ({clientes?.filter(c => c.usuarioAsignadoId === usuario?.id).length || 0})
          </button>
        </div>
      </div>

      {/* Lista de clientes */}
      {!clientesFiltrados?.length ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No se encontraron clientes</p>
          <p className="text-gray-400 text-sm mt-1">
            {busqueda ? 'Probá con otro término de búsqueda' : 'Creá el primer cliente con el botón de arriba'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map((cliente) => (
            <div
              key={cliente.id}
              className={clsx(
                'card hover:shadow-md transition-shadow',
                esAsignado(cliente) && 'border-l-4 border-l-primary-500'
              )}
            >
              {/* Header de la card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{cliente.razonSocial}</h3>
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
                    <span className="text-gray-400">👤</span>
                    {cliente.nombreContacto}
                  </p>
                )}
                {cliente.telefonoContacto && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Phone size={12} className="text-gray-400" />
                    {cliente.telefonoContacto}
                  </p>
                )}
                {cliente.localidad && (
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-400" />
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
                  <div className={clsx(
                    'w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold',
                    esAsignado(cliente) ? 'bg-primary-600' : 'bg-teal-600'
                  )}>
                    {cliente.usuarioAsignado?.nombre[0]}
                  </div>
                  <span className="text-xs text-gray-400">
                    {esAsignado(cliente) ? 'Tuyo' : cliente.usuarioAsignado?.nombre}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setClienteHistorial(cliente.id)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Ver historial"
                  >
                    <History size={16} />
                  </button>
                  {esAsignado(cliente) && (
                    <button
                      onClick={() => { setClienteEditar(cliente); setShowForm(true); }}
                      className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Editar cliente"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {cliente.telefonoContacto && (
                    <a
                      href={`https://wa.me/${cliente.telefonoContacto.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle size={16} />
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
