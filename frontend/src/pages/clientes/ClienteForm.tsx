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
    <div className="modal-overlay">
      <div className="modal max-w-2xl animate-slide-up" style={{ borderRadius: 0, border: '1px solid #E5E7EB' }}>

        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #EEEEEE' }}>
          <h2 className="titulo-modulo" style={{ fontSize: '1.5rem' }}>
            {esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
          </h2>
          <button onClick={onClose} className="btn-icon" style={{ borderRadius: 0 }}><X size={18} strokeWidth={1.75} /></button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4" style={{ padding: '1.5rem' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>
                Razón social <span style={{ color: '#B91C1C' }}>*</span>
              </label>
              <input
                type="text"
                value={form.razonSocial}
                onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
                className="input-field"
                style={{ borderRadius: 0 }}
                placeholder="Nombre de la empresa"
                required
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>CUIT</label>
              <input
                type="text"
                value={form.cuit}
                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                className="input-field"
                style={{ borderRadius: 0 }}
                placeholder="30-12345678-9"
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Canal de entrada</label>
              <select
                value={form.canalEntrada}
                onChange={(e) => setForm({ ...form, canalEntrada: e.target.value })}
                className="input-field"
                style={{ borderRadius: 0 }}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="email">Email</option>
                <option value="llamada">Llamada</option>
                <option value="formulario_web">Formulario web</option>
                <option value="recomendacion">Recomendación</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Nombre de contacto</label>
              <input
                type="text"
                value={form.nombreContacto}
                onChange={(e) => setForm({ ...form, nombreContacto: e.target.value })}
                className="input-field"
                style={{ borderRadius: 0 }}
                placeholder="Nombre del responsable de compras"
              />
            </div>

            <div>
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Teléfono</label>
              <input
                type="text"
                value={form.telefonoContacto}
                onChange={(e) => setForm({ ...form, telefonoContacto: e.target.value })}
                className="input-field"
                style={{ borderRadius: 0 }}
                placeholder="11 1234 5678"
              />
            </div>

            <div className="md:col-span-2">
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Email</label>
              <input
                type="email"
                value={form.emailContacto}
                onChange={(e) => setForm({ ...form, emailContacto: e.target.value })}
                className="input-field"
                style={{ borderRadius: 0 }}
                placeholder="contacto@empresa.com"
              />
            </div>

            {/* Localidad field removed as requested */}

            <div className="md:col-span-2">
              <label className="label" style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF' }}>Observaciones</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                className="input-field resize-none"
                style={{ borderRadius: 0 }}
                rows={3}
                placeholder="Notas internas sobre el cliente..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.esExportador}
                  onChange={(e) => setForm({ ...form, esExportador: e.target.checked })}
                  style={{ width: 16, height: 16, borderRadius: 0, accentColor: '#7c4b2c' }}
                />
                <span className="text-sm" style={{ color: '#374151' }}>
                  Cliente exportador (requiere tratamiento SENASA)
                </span>
              </label>
            </div>
          </div>

          {error && (
            <p className="text-sm px-3.5 py-2.5" style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 0 }}>
              {error}
            </p>
          )}
          </div>

          <div className="modal-footer" style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #EEEEEE' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#fff', color: '#374151',
                border: '1px solid #E5E7EB', fontWeight: 500,
                fontSize: '0.875rem', padding: '0.55rem 1.1rem',
                borderRadius: 0, cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: '#7c4b2c',
                color: 'white', fontWeight: 500,
                fontSize: '0.875rem', padding: '0.55rem 1.1rem',
                borderRadius: 0, border: '1px solid #7c4b2c',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1, transition: 'all 0.15s'
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
