import { useState, type ReactElement } from 'react';
import { CheckCircle2, XCircle, ShieldCheck, Clock, Ban, UserCog, Mail, Phone } from 'lucide-react';
import {
  useUsuarios, useAprobarUsuario, useRechazarUsuario,
  useActualizarAccesoUsuario, useCambiarEstadoActivoUsuario,
} from '../../hooks/useUsuarios';
import { MODULOS_SISTEMA } from '../../utils/modulos';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import type { Usuario } from '../../types';

const C = {
  accent: '#7c4b2c',
  accentSoft: '#F3EDE8',
  accentMid: '#C4895A',
  border: '#E5E7EB',
  text: '#111111',
  textMuted: '#6B7280',
};

const rolLabel: Record<string, string> = {
  propietario_carlos: 'Propietario (Carlos)',
  propietario_juancruz: 'Propietario (Juan Cruz)',
  admin: 'Administrador',
};

function formatUltimaConexion(fecha?: string) {
  if (!fecha) return 'Nunca se conectó';
  const d = new Date(fecha);
  const hoy = new Date();
  const esHoy = d.toDateString() === hoy.toDateString();
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  const esAyer = d.toDateString() === ayer.toDateString();
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  if (esHoy) return `Hoy a las ${hora}`;
  if (esAyer) return `Ayer a las ${hora}`;
  return `${d.toLocaleDateString('es-AR')} a las ${hora}`;
}

function ConexionBadge({ usuario }: { usuario: Usuario }) {
  if (usuario.enLinea) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: '#DCFCE7', color: '#166534', fontSize: '0.72rem', fontWeight: 600,
        padding: '0.2rem 0.55rem', borderRadius: 99,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
        En línea
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      color: C.textMuted, fontSize: '0.72rem',
    }}>
      <Clock size={11} /> {formatUltimaConexion(usuario.ultimaConexion)}
    </span>
  );
}

function EstadoBadge({ estado }: { estado?: string }) {
  const map: Record<string, { bg: string; color: string; label: string; icon: ReactElement }> = {
    pendiente: { bg: '#FEF3C7', color: '#92400E', label: 'Pendiente', icon: <Clock size={12} /> },
    aprobado:  { bg: '#DCFCE7', color: '#166534', label: 'Aprobado', icon: <CheckCircle2 size={12} /> },
    rechazado: { bg: '#FEE2E2', color: '#991B1B', label: 'Rechazado', icon: <XCircle size={12} /> },
  };
  const cfg = map[estado ?? 'aprobado'] ?? map.aprobado;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: cfg.bg, color: cfg.color, fontSize: '0.72rem', fontWeight: 600,
      padding: '0.2rem 0.55rem', borderRadius: 99,
    }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function PanelAcceso({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const esPendiente = usuario.estadoCuenta === 'pendiente';
  const [rol, setRol] = useState<'propietario_carlos' | 'propietario_juancruz' | 'admin'>(
    usuario.rol ?? 'admin'
  );
  const [seleccion, setSeleccion] = useState<string[]>(usuario.modulosPermitidos ?? []);
  const aprobar = useAprobarUsuario();
  const rechazar = useRechazarUsuario();
  const actualizarAcceso = useActualizarAccesoUsuario();
  const [error, setError] = useState('');

  const toggleModulo = (key: string) => {
    setSeleccion(prev => prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]);
  };

  const handleGuardar = async () => {
    setError('');
    try {
      if (esPendiente) {
        await aprobar.mutateAsync({ id: usuario.id, rol, modulosPermitidos: seleccion });
      } else {
        await actualizarAcceso.mutateAsync({ id: usuario.id, modulosPermitidos: seleccion });
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'No se pudo guardar');
    }
  };

  const handleRechazar = async () => {
    setError('');
    try {
      await rechazar.mutateAsync({ id: usuario.id });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'No se pudo rechazar');
    }
  };

  return (
    <div style={{ padding: '1.25rem 1.5rem', borderTop: `1px solid ${C.border}`, background: '#FAF9F7' }}>
      {esPendiente && (
        <div style={{ marginBottom: '0.875rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF', display: 'block', marginBottom: 4 }}>
            Rol a asignar
          </label>
          <select
            value={rol}
            onChange={e => setRol(e.target.value as 'propietario_carlos' | 'propietario_juancruz' | 'admin')}
            style={{ padding: '0.4rem 0.6rem', borderRadius: 0, border: `1px solid ${C.border}`, fontSize: '0.82rem' }}
          >
            <option value="admin">Administrador</option>
            <option value="propietario_carlos">Propietario (Carlos)</option>
            <option value="propietario_juancruz">Propietario (Juan Cruz)</option>
          </select>
        </div>
      )}

      <label style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9CA3AF', display: 'block', marginBottom: 6 }}>
        Módulos habilitados
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '1rem' }}>
        {MODULOS_SISTEMA.map(m => {
          const activo = seleccion.includes(m.key);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => toggleModulo(m.key)}
              style={{
                padding: '0.3rem 0.65rem', borderRadius: 0, fontSize: '0.75rem', fontWeight: 600,
                border: `1px solid ${activo ? C.accentMid : C.border}`,
                background: activo ? C.accentSoft : '#fff',
                color: activo ? C.accent : C.textMuted,
                cursor: 'pointer',
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', color: '#B91C1C', fontSize: '0.8rem', padding: '0.5rem 0.75rem', borderRadius: 0, marginBottom: '0.75rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={handleGuardar}
          disabled={aprobar.isPending || actualizarAcceso.isPending}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: C.accent, color: '#fff', border: 'none', borderRadius: 0,
            padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <ShieldCheck size={15} /> {esPendiente ? 'Aprobar y guardar accesos' : 'Guardar accesos'}
        </button>
        <button
          type="button"
          onClick={() => setSeleccion(
            seleccion.length === MODULOS_SISTEMA.length ? [] : MODULOS_SISTEMA.map(m => m.key)
          )}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#fff', color: C.accent, border: `1px solid ${C.accentMid}`, borderRadius: 0,
            padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
          }}
        >
          <CheckCircle2 size={15} />
          {seleccion.length === MODULOS_SISTEMA.length ? 'Desmarcar todos' : 'Marcar todos los módulos habilitados'}
        </button>
        {esPendiente && (
          <button
            onClick={handleRechazar}
            disabled={rechazar.isPending}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5', borderRadius: 0,
              padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Ban size={15} /> Rechazar
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            background: 'transparent', color: C.textMuted, border: 'none',
            padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { data: usuarios, isLoading, error } = useUsuarios();
  const cambiarEstado = useCambiarEstadoActivoUsuario();
  const [abierto, setAbierto] = useState<number | null>(null);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="No se pudieron cargar los usuarios" />;

  const pendientes = usuarios?.filter(u => u.estadoCuenta === 'pendiente') ?? [];
  const resto = usuarios?.filter(u => u.estadoCuenta !== 'pendiente') ?? [];

  const renderUsuario = (u: Usuario) => (
    <div key={u.id} style={{ border: `1px solid ${C.border}`, borderRadius: 0, marginBottom: 10, background: '#fff', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: C.accentSoft,
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
          }}>
            {u.fotoPerfil
              ? <img src={u.fotoPerfil} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <UserCog size={18} style={{ color: C.accentMid }} />}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text, margin: 0 }}>
              {u.nombre} {u.apellido}
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: C.textMuted, fontSize: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} /> {u.email}</span>
              {u.telefono && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} /> {u.telefono}</span>}
            </div>
            <div style={{ marginTop: 4 }}>
              <ConexionBadge usuario={u} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <EstadoBadge estado={u.estadoCuenta} />
          <span style={{ fontSize: '0.75rem', color: C.textMuted, background: '#F5F1EB', padding: '0.2rem 0.55rem', borderRadius: 99 }}>
            {rolLabel[u.rol] ?? u.rol}
          </span>
          {u.tieneModulosLimitados && u.estadoCuenta === 'aprobado' && (
            <span style={{ fontSize: '0.72rem', color: C.textMuted }}>
              {u.modulosPermitidos?.length ?? 0} módulo(s)
            </span>
          )}
          {u.estadoCuenta !== 'rechazado' && u.rol !== 'propietario_carlos' && u.rol !== 'propietario_juancruz' && (
            <button
              onClick={() => cambiarEstado.mutate({ id: u.id, activo: !u.activo })}
              style={{
                fontSize: '0.72rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                background: u.activo ? '#FEE2E2' : '#DCFCE7',
                color: u.activo ? '#991B1B' : '#166534',
                padding: '0.25rem 0.6rem', borderRadius: 99,
              }}
            >
              {u.activo ? 'Desactivar' : 'Activar'}
            </button>
          )}
          <button
            onClick={() => setAbierto(abierto === u.id ? null : u.id)}
            style={{
              fontSize: '0.78rem', fontWeight: 600, border: `1px solid ${C.border}`,
              background: '#fff', color: C.accent, padding: '0.3rem 0.75rem', borderRadius: 0, cursor: 'pointer',
            }}
          >
            {abierto === u.id ? 'Cerrar' : (u.estadoCuenta === 'pendiente' ? 'Revisar solicitud' : 'Editar accesos')}
          </button>
        </div>
      </div>
      {abierto === u.id && <PanelAcceso usuario={u} onClose={() => setAbierto(null)} />}
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="titulo-modulo">Usuarios</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aprobá o rechazá solicitudes de acceso y definí qué módulos puede usar cada usuario.
        </p>
      </div>

      {pendientes.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: '#92400E', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Solicitudes pendientes ({pendientes.length})
          </h2>
          {pendientes.map(renderUsuario)}
        </div>
      )}

      <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Todos los usuarios
      </h2>
      {resto.map(renderUsuario)}
    </div>
  );
}
