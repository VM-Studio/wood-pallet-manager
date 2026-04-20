import { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Users } from 'lucide-react';
import { useVistaStore } from '../../store/vista.store';
import type { TipoVista } from '../../store/vista.store';
import { useAuthStore } from '../../store/auth.store';
import { clsx } from 'clsx';

export default function DropdownVista() {
  const { vista, setVista } = useVistaStore();
  const { usuario } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const esCarlos = usuario?.rol === 'propietario_carlos';

  const opciones: { value: TipoVista; label: string }[] = [
    { value: 'mis_datos', label: 'Mis datos' },
    { value: 'otro',      label: esCarlos ? 'Juan Cruz' : 'Carlos' },
    { value: 'total',     label: 'Total' },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const opcionActual = opciones.find(o => o.value === vista);

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
        <span className="flex-1 text-left">{opcionActual?.label}</span>
        <ChevronDown
          size={14}
          className={clsx(
            'text-gray-400 transition-transform shrink-0',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
          {opciones.map((op) => (
            <button
              key={op.value}
              onClick={() => { setVista(op.value); setOpen(false); }}
              className={clsx(
                'w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left',
                vista === op.value
                  ? 'font-semibold text-gray-900 bg-gray-50'
                  : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {op.value === 'total'
                ? <Users size={14} className="text-gray-400 shrink-0" />
                : <User size={14} className="text-gray-400 shrink-0" />
              }
              <span className="flex-1">{op.label}</span>
              {vista === op.value && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'linear-gradient(135deg, #6B3A2A, #C4895A)' }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
