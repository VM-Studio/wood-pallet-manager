import { useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { tieneAccesoAModulo } from '../../utils/modulos';

// Bloquea el acceso a una página cuando el usuario logueado no tiene
// el módulo habilitado por Carlos. Carlos y Juan Cruz nunca son bloqueados.
export default function ModuleGuard({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuthStore();
  const location = useLocation();
  const moduloKey = location.pathname.split('/').filter(Boolean)[0] ?? '';

  if (tieneAccesoAModulo(usuario, moduloKey)) {
    return <>{children}</>;
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: '2rem',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '1.25rem',
      }}>
        <ShieldAlert size={30} style={{ color: '#B91C1C' }} />
      </div>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#111111', margin: '0 0 0.5rem' }}>
        No estás habilitado para ingresar a este módulo
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#6B7280', maxWidth: 420 }}>
        Pedile al administrador que te dé acceso a esta sección desde el módulo de Usuarios.
      </p>
    </div>
  );
}
