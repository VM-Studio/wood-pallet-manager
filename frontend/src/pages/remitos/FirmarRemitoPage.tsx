import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle, Package, AlertTriangle, Mail,
  User, Calendar, FileText, DollarSign, Loader
} from 'lucide-react';
import { useRemitoPublico, useFirmarClientePublico } from '../../hooks/useRemitos';
import SignaturePad from '../../components/ui/SignaturePad';

// ─── Helpers ──────────────────────────────────────────────

const formatPesos = (v: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(v);

const formatFecha = (f: string) =>
  new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Estados especiales ───────────────────────────────────

function PantallaEstado({
  tipo,
  titulo,
  mensaje,
}: {
  tipo: 'exito' | 'error' | 'ya-firmado' | 'cancelado';
  titulo: string;
  mensaje: string;
}) {
  const config = {
    exito:     { bg: '#F0FDF4', border: '#BBF7D0', icon: <CheckCircle size={40} color="#15803D" />, titleColor: '#15803D' },
    error:     { bg: '#FEF2F2', border: '#FECACA', icon: <AlertTriangle size={40} color="#B91C1C" />, titleColor: '#B91C1C' },
    'ya-firmado': { bg: '#EFF6FF', border: '#BFDBFE', icon: <CheckCircle size={40} color="#1D4ED8" />, titleColor: '#1D4ED8' },
    cancelado: { bg: '#F9FAFB', border: '#E5E7EB', icon: <FileText size={40} color="#9CA3AF" />, titleColor: '#374151' },
  }[tipo];

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{
        maxWidth: '440px', width: '100%', background: config.bg, border: `1px solid ${config.border}`,
        borderRadius: '0.5rem', padding: '2.5rem', textAlign: 'center',
      }}>
        <div style={{ marginBottom: '1.25rem' }}>{config.icon}</div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: config.titleColor, margin: '0 0 0.75rem' }}>{titulo}</h1>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>{mensaje}</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────

export default function FirmarRemitoPage() {
  const { token } = useParams<{ token: string }>();
  const { data: remito, isLoading, isError } = useRemitoPublico(token ?? '');
  const firmarCliente = useFirmarClientePublico();

  const [firma, setFirma] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');

  // Loading
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          <Loader size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.875rem' }}>Cargando remito...</p>
        </div>
      </div>
    );
  }

  // Error de red
  if (isError || !remito) {
    return (
      <PantallaEstado
        tipo="error"
        titulo="Remito no encontrado"
        mensaje="El enlace de firma no es válido o ha expirado. Si creés que esto es un error, contactá al vendedor."
      />
    );
  }

  // Ya firmado / completado
  if (remito.estado === 'completado' || remito.estado === 'firmado_por_cliente') {
    return (
      <PantallaEstado
        tipo="ya-firmado"
        titulo="¡Remito ya firmado!"
        mensaje={`Este remito ya fue firmado el ${remito.fechaFirmaCliente ? formatFecha(remito.fechaFirmaCliente) : ''}. Ambas partes recibieron una copia por email.`}
      />
    );
  }

  // Cancelado
  if (remito.estado === 'cancelado') {
    return (
      <PantallaEstado
        tipo="cancelado"
        titulo="Remito cancelado"
        mensaje="Este remito fue cancelado por el vendedor. Si tenés preguntas, comunicáte directamente con el proveedor."
      />
    );
  }

  // Éxito (post firma)
  if (exito) {
    return (
      <PantallaEstado
        tipo="exito"
        titulo="¡Remito firmado exitosamente!"
        mensaje={`Gracias, ${nombre || remito.cliente.razonSocial}. Recibís una copia firmada por ambas partes en ${remito.cliente.emailContacto ?? 'tu correo electrónico'} en breve.`}
      />
    );
  }

  const totalVenta = Number(remito.venta?.totalConIva ?? 0);

  const handleFirmar = async () => {
    if (!firma) { setError('Por favor dibujá tu firma antes de confirmar'); return; }
    setError('');
    try {
      await firmarCliente.mutateAsync({ token: token ?? '', firmaCliente: firma });
      setExito(true);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error al procesar la firma. Intentá de nuevo.');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #E5E7EB', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              Remito {remito.numeroRemito ?? `#${String(remito.id).padStart(4, '0')}`}
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: '4px 0 0' }}>
              Wood Pallet — Documento de entrega
            </p>
          </div>
        </div>

        {/* Datos del remito */}
        <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ background: '#F9FAFB', padding: '0.75rem 1.25rem', borderBottom: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Información del remito</p>
          </div>
          <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <User size={16} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cliente</p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>{remito.cliente.razonSocial}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <Calendar size={16} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha emisión</p>
                <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>{formatFecha(remito.fechaEmision)}</p>
              </div>
            </div>
            {remito.fechaEntrega && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
                <Calendar size={16} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha entrega</p>
                  <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>{formatFecha(remito.fechaEntrega)}</p>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem' }}>
              <Mail size={16} color="#9CA3AF" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</p>
                <p style={{ fontSize: '0.875rem', color: '#374151', margin: 0 }}>{remito.cliente.emailContacto ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Productos */}
        <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ background: '#F9FAFB', padding: '0.75rem 1.25rem', borderBottom: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Detalle de productos</p>
          </div>
          <div style={{ padding: '0' }}>
            {remito.venta?.detalles?.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.875rem 1.25rem', gap: '1rem',
                  borderBottom: i < (remito.venta?.detalles?.length ?? 0) - 1 ? '1px solid #F3F4F6' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1 }}>
                  <div style={{ width: 32, height: 32, background: '#FEF3E2', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={15} color="#C4895A" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', margin: 0 }}>{d.producto.nombre}</p>
                    <p style={{ fontSize: '0.75rem', color: '#9CA3AF', margin: '2px 0 0' }}>
                      {d.cantidadPedida} unidades × {formatPesos(Number(d.precioUnitario))}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#374151', margin: 0, flexShrink: 0 }}>
                  {formatPesos(Number(d.subtotal))}
                </p>
              </div>
            ))}

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', background: '#F9FAFB', borderTop: '2px solid #E5E7EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DollarSign size={16} color="#6B3A2A" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Total con IVA</span>
              </div>
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111827' }}>{formatPesos(totalVenta)}</span>
            </div>
          </div>
        </div>

        {/* Firma del propietario */}
        {remito.firmaPropietario && (
          <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #E5E7EB', padding: '1.25rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Firma del proveedor</p>
            <div style={{ background: '#F9FAFB', borderRadius: '0.25rem', padding: '0.75rem', display: 'inline-block' }}>
              <img src={remito.firmaPropietario} alt="Firma propietario" style={{ maxHeight: 80, display: 'block' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.5rem' }}>Wood Pallet — Firma del emisor</p>
          </div>
        )}

        {/* Observaciones */}
        {remito.observaciones && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '0.5rem', padding: '1rem' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Observaciones</p>
            <p style={{ fontSize: '0.875rem', color: '#78350F', margin: 0, fontStyle: 'italic' }}>"{remito.observaciones}"</p>
          </div>
        )}

        {/* Formulario de firma del cliente */}
        <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          <div style={{ background: '#F9FAFB', padding: '0.875rem 1.25rem', borderBottom: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: 0 }}>Tu firma de conformidad</p>
            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 4 }}>
              Al firmar confirmás que recibiste la mercadería detallada arriba en conformidad.
            </p>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}>
                Nombre del firmante <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="text"
                style={{ width: '100%', fontSize: '0.875rem', border: '1px solid #D1D5DB', borderRadius: '0.25rem', padding: '0.5rem 0.75rem', outline: 'none', boxSizing: 'border-box' }}
                placeholder={`Ej: ${remito.cliente.razonSocial}`}
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </div>

            <SignaturePad
              label="Tu firma"
              required
              onSignature={setFirma}
              height={150}
              width={560}
            />

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.625rem 0.875rem', borderRadius: '0.25rem' }}>
                {error}
              </div>
            )}

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.25rem', padding: '0.75rem', fontSize: '0.78rem', color: '#1E40AF', lineHeight: 1.6 }}>
              <strong>Importante:</strong> Al firmar este remito confirmás la recepción de los productos. 
              Recibirás una copia completa por correo electrónico con ambas firmas.
            </div>

            <button
              onClick={handleFirmar}
              disabled={!firma || firmarCliente.isPending}
              style={{
                width: '100%', padding: '0.875rem', border: 'none', cursor: firma ? 'pointer' : 'not-allowed',
                background: firma ? 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)' : '#E5E7EB',
                color: firma ? '#fff' : '#9CA3AF', borderRadius: '0.25rem',
                fontSize: '0.925rem', fontWeight: 600, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {firmarCliente.isPending ? (
                <><Loader size={16} className="animate-spin" /> Procesando firma...</>
              ) : (
                <><CheckCircle size={16} /> Confirmar firma y aceptar remito</>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#D1D5DB' }}>
          Wood Pallet Manager · Documento generado digitalmente
        </p>
      </div>
    </div>
  );
}
