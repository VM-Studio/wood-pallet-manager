import { useState } from 'react';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';
import type { BloqueEmail } from '../../hooks/useSeguimientos';

interface Props {
  bloques: BloqueEmail[];
  onChange: (b: BloqueEmail[]) => void;
}

const TIPOS_BLOQUE: { value: BloqueEmail['tipo']; label: string }[] = [
  { value: 'header', label: 'Encabezado' },
  { value: 'texto',  label: 'Texto' },
  { value: 'imagen', label: 'Imagen' },
  { value: 'boton',  label: 'Botón' },
  { value: 'footer', label: 'Pie' },
];

export default function EmailEditor({ bloques, onChange }: Props) {
  const [agregando, setAgregando] = useState(false);

  const actualizar = (i: number, partial: Partial<BloqueEmail>) => {
    const copia = [...bloques];
    copia[i] = { ...copia[i], ...partial };
    onChange(copia);
  };

  const eliminar = (i: number) => onChange(bloques.filter((_, idx) => idx !== i));

  const mover = (i: number, dir: -1 | 1) => {
    const copia = [...bloques];
    const dest = i + dir;
    if (dest < 0 || dest >= copia.length) return;
    [copia[i], copia[dest]] = [copia[dest], copia[i]];
    onChange(copia);
  };

  const agregar = (tipo: BloqueEmail['tipo']) => {
    const defaults: Record<BloqueEmail['tipo'], Partial<BloqueEmail>> = {
      header: { contenido: 'Hola {{nombre_cliente}}', colorFondo: '#92400e' },
      texto:  { contenido: 'Escribí tu mensaje aquí...' },
      imagen: { url: 'https://placehold.co/600x200' },
      boton:  { textoBoton: 'Ver más', url: 'https://woodpallet.com.ar' },
      footer: { contenido: 'WoodPallet Manager · contacto@woodpallet.com.ar' },
    };
    onChange([...bloques, { tipo, ...defaults[tipo] }]);
    setAgregando(false);
  };

  return (
    <div className="border border-gray-200">
      <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
        Editor de email
      </div>

      <div className="divide-y divide-gray-100">
        {bloques.map((b, i) => (
          <div key={i} className="p-3 flex gap-3">
            {/* Controles */}
            <div className="flex flex-col gap-1 pt-0.5">
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                <MoveUp size={13} />
              </button>
              <button onClick={() => mover(i, 1)} disabled={i === bloques.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20">
                <MoveDown size={13} />
              </button>
            </div>

            {/* Campos */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-200 px-2 py-0.5 text-gray-600">
                  {TIPOS_BLOQUE.find(t => t.value === b.tipo)?.label}
                </span>
              </div>

              {(b.tipo === 'header' || b.tipo === 'texto' || b.tipo === 'footer') && (
                <textarea
                  value={b.contenido ?? ''}
                  onChange={e => actualizar(i, { contenido: e.target.value })}
                  rows={b.tipo === 'texto' ? 3 : 1}
                  className="w-full border border-gray-200 px-2 py-1.5 text-sm resize-none"
                  placeholder={b.tipo === 'header' ? 'Título del email...' : b.tipo === 'footer' ? 'Texto de pie...' : 'Contenido del bloque...'}
                />
              )}

              {b.tipo === 'imagen' && (
                <input
                  value={b.url ?? ''}
                  onChange={e => actualizar(i, { url: e.target.value })}
                  className="w-full border border-gray-200 px-2 py-1.5 text-sm"
                  placeholder="URL de la imagen"
                />
              )}

              {b.tipo === 'boton' && (
                <div className="flex gap-2">
                  <input
                    value={b.textoBoton ?? ''}
                    onChange={e => actualizar(i, { textoBoton: e.target.value })}
                    className="border border-gray-200 px-2 py-1.5 text-sm w-36"
                    placeholder="Texto del botón"
                  />
                  <input
                    value={b.url ?? ''}
                    onChange={e => actualizar(i, { url: e.target.value })}
                    className="flex-1 border border-gray-200 px-2 py-1.5 text-sm"
                    placeholder="URL de destino"
                  />
                </div>
              )}

              {b.tipo === 'header' && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Color de fondo:</label>
                  <input
                    type="color"
                    value={b.colorFondo ?? '#92400e'}
                    onChange={e => actualizar(i, { colorFondo: e.target.value })}
                    className="w-7 h-7 border border-gray-200 p-0.5"
                  />
                </div>
              )}
            </div>

            {/* Eliminar */}
            <button onClick={() => eliminar(i)} className="text-gray-300 hover:text-red-400 self-start mt-1">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Agregar bloque */}
      <div className="border-t border-gray-100 p-3">
        {!agregando ? (
          <button
            onClick={() => setAgregando(true)}
            className="flex items-center gap-2 text-sm text-amber-700 hover:text-amber-800"
          >
            <Plus size={14} /> Agregar bloque
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {TIPOS_BLOQUE.map(t => (
              <button
                key={t.value}
                onClick={() => agregar(t.value)}
                className="text-xs border border-amber-300 text-amber-700 px-3 py-1.5 hover:bg-amber-50"
              >
                + {t.label}
              </button>
            ))}
            <button onClick={() => setAgregando(false)} className="text-xs text-gray-400 hover:text-gray-600 ml-2">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Variables disponibles */}
      <div className="border-t border-gray-100 px-3 py-2 bg-gray-50">
        <p className="text-xs text-gray-400">
          Variables: <code className="bg-white px-1">{'{{nombre_cliente}}'}</code>{' '}
          <code className="bg-white px-1">{'{{monto_cotizacion}}'}</code>{' '}
          <code className="bg-white px-1">{'{{fecha_cotizacion}}'}</code>{' '}
          <code className="bg-white px-1">{'{{vendedor}}'}</code>
        </p>
      </div>
    </div>
  );
}
