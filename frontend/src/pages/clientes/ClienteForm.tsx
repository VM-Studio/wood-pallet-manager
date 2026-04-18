import { useState } from 'react';
import { X } from 'lucide-react';
import { useCrearCliente, useActualizarCliente } from '../../hooks/useClientes';
import type { Cliente } from '../../types';

interface ClienteFormProps {
  cliente?: Cliente;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClienteForm({ cliente, onClose, onSuccess }: ClienteFormProps) {
  const esEdicion = !!cliente;
  const crearCliente = useCrearCliente();
  const actualizarCliente = useActualizarCliente();

  const [form, setForm] = useState({
    razonSocial: cliente?.razonSocial || '',
    cuit: cliente?.cuit || '',
    nombreContacto: cliente?.nombreContacto || '',
    telefonoContacto: cliente?.telefonoContacto || '',
    emailContacto: cliente?.emailContacto || '',
    canalEntrada: cliente?.canalEntrada || 'whatsapp',
    direccionEntrega: cliente?.direccionEntrega || '',
    localidad: cliente?.localidad || '',
    esExportador: cliente?.esExportador || false,
    observaciones: cliente?.observaciones || ''
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (esEdicion) {
        await actualizarCliente.mutateAsync({ id: cliente.id, datos: form });
      } else {
        await crearCliente.mutateAsync(form);
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || 'Error al guardar el cliente');
    }
  };

  const loading = crearCliente.isPending || actualizarCliente.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: '0.25rem' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Razón social <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="Nombre de la empresa"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
              <input
                type="text"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="30-12345678-9"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canal de entrada</label>
              <select
                value={form.canalEntrada}
                onChange={(e) => setForm({ ...form, canalEntrada: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="formulario_web">Formulario web</option>
                <option value="llamada">Llamada</option>
                <option value="recomendacion">Recomendación</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de contacto</label>
              <input
                type="text"
                value={form.nombreContacto}
                onChange={(e) => setForm({ ...form, nombreContacto: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="Nombre del responsable de compras"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.telefonoContacto}
                onChange={(e) => setForm({ ...form, telefonoContacto: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="11 1234 5678"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.emailContacto}
                onChange={(e) => setForm({ ...form, emailContacto: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="contacto@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega</label>
              <input
                type="text"
                value={form.direccionEntrega}
                onChange={(e) => setForm({ ...form, direccionEntrega: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="Calle y número"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Localidad</label>
              <input
                type="text"
                value={form.localidad}
                onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                className="input-field"
                style={{ borderRadius: '0.25rem' }}
                placeholder="Ciudad / partido"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                className="input-field resize-none"
                style={{ borderRadius: '0.25rem' }}
                rows={3}
                placeholder="Notas internas sobre el cliente..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.esExportador}
                  onChange={(e) => setForm({ ...form, esExportador: e.target.checked })}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">
                  Cliente exportador (requiere tratamiento SENASA)
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151',
                border: '1px solid #E5E7EB', fontWeight: 500,
                fontSize: '0.875rem', padding: '0.5rem 1rem',
                borderRadius: '0.25rem', cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
                color: 'white', fontWeight: 500,
                fontSize: '0.875rem', padding: '0.5rem 1rem',
                borderRadius: '0.25rem', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.2s'
              }}
            >
              {loading ? 'Guardando...' : esEdicion ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
