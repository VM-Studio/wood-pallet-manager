import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Users } from 'lucide-react';
import { useVistaStore } from '../../store/vista.store';
import type { TipoVista } from '../../store/vista.store';
import { useUsuariosParaVista } from '../../hooks/useUsuarios';
import { clsx } from 'clsx';

export default function DropdownVista() {
  const { vista, setVista, otroUsuarioId, setOtroUsuario } = useVistaStore();
  const { data: usuariosDisponibles } = useUsuariosParaVista('dashboard');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Si el usuario que estaba seleccionado deja de estar disponible (se lo
  // desactivó, se le restringió el módulo, etc.) volvemos a "Mis datos" para
  // no quedar mostrando datos de alguien ya no visible.
  useEffect(() => {
    if (vista === 'otro' && otroUsuarioId && usuariosDisponibles) {
      const sigueDisponible = usuariosDisponibles.some(u => u.id === otroUsuarioId);
      if (!sigueDisponible) {
        setVista('mis_datos');
        setOtroUsuario(null, null);
      }
    }
  }, [vista, otroUsuarioId, usuariosDisponibles, setVista, setOtroUsuario]);

  const opcionActualLabel = (): string => {
    if (vista === 'mis_datos') return 'Mis datos';
    if (vista === 'total') return 'Total';
    if (vista === 'otro') {
      const u = usuariosDisponibles?.find(u => u.id === otroUsuarioId);
      return u ? `${u.nombre} ${u.apellido}` : 'Otro usuario';
    }
    return 'Mis datos';
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const seleccionar = (value: TipoVista, usuarioId?: number, usuarioNombre?: string) => {
    setVista(value);
    if (value === 'otro' && usuarioId) {
      setOtroUsuario(usuarioId, usuarioNombre ?? null);
    } else if (value !== 'otro') {
      setOtroUsuario(null, null);
    }
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-all text-sm font-medium text-gray-700 shadow-sm"
        style={{ minWidth: '145px' }}
      >
        {vista === 'total'
          ? <Users size={15} className="text-gray-500 shrink-0" />
          : <User size={15} className="text-gray-500 shrink-0" />
        }
        <span className="flex-1 text-left truncate">{opcionActualLabel()}</span>
        <ChevronDown
          size={14}
          className={clsx(
            'text-gray-400 transition-transform shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in max-h-80 overflow-y-auto">
          <button
            onClick={() => seleccionar('mis_datos')}
            className={clsx(
              'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
              vista === 'mis_datos' ? 'font-semibold text-gray-900 bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <User size={14} className="text-gray-400 shrink-0" />
            <span className="flex-1">Mis datos</span>
            {vista === 'mis_datos' && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#7c4b2c' }} />}
          </button>

          {(usuariosDisponibles?.length ?? 0) > 0 && (
            <div className="border-t border-gray-100">
              {usuariosDisponibles!.map(u => {
                const activo = vista === 'otro' && otroUsuarioId === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => seleccionar('otro', u.id, `${u.nombre} ${u.apellido}`)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
                      activo ? 'font-semibold text-gray-900 bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <User size={14} className="text-gray-400 shrink-0" />
                    <span className="flex-1 truncate">{u.nombre} {u.apellido}</span>
                    {activo && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#7c4b2c' }} />}
                  </button>
                );
              })}
            </div>
          )}

          <div className="border-t border-gray-100">
            <button
              onClick={() => seleccionar('total')}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
                vista === 'total' ? 'font-semibold text-gray-900 bg-gray-50' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Users size={14} className="text-gray-400 shrink-0" />
              <span className="flex-1">Total</span>
              {vista === 'total' && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#7c4b2c' }} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
