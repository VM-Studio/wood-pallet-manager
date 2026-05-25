import { useState } from 'react';
import {
  Mail, Plus, History, FileText, Zap, Send, Eye, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Users, CheckCircle, XCircle, Clock
} from 'lucide-react';
import {
  usePlantillas, useHistorialCampanas, useReglas,
  usePreviewSegmento, useEnviarCampana,
  useCrearPlantilla, useActualizarPlantilla, useEliminarPlantilla,
  useCrearRegla, useToggleRegla, useEliminarRegla,
  useDetalleCampana,
} from '../../hooks/useSeguimientos';
import type { BloqueEmail, PlantillaEmail, SegmentoTipo } from '../../hooks/useSeguimientos';
import EmailEditor from '../../components/seguimientos/EmailEditor';
import PreviewEmailModal from '../../components/seguimientos/PreviewEmailModal';

type Tab = 'campana' | 'historial' | 'plantillas' | 'automatizaciones';

const SEGMENTOS: { value: SegmentoTipo; label: string; desc: string }[] = [
  { value: 'todos', label: 'Todos los clientes', desc: 'Envía a todos los clientes activos' },
  { value: 'con_cotizacion_pendiente', label: 'Cotizaciones pendientes', desc: 'Clientes con cotizaciones sin convertir' },
  { value: 'sin_compras_recientes', label: 'Sin compras recientes', desc: 'Clientes inactivos en los últimos N días' },
  { value: 'clientes_frecuentes', label: 'Clientes frecuentes', desc: 'Compraron más de una vez' },
  { value: 'deudores', label: 'Deudores', desc: 'Clientes con saldo deudor pendiente' },
  { value: 'manual', label: 'Selección manual', desc: 'Elegís los clientes desde una lista' },
];

const EVENTOS_REGLA = [
  { value: 'cotizacion_pendiente', label: 'Cotización pendiente' },
  { value: 'sin_compras', label: 'Sin compras en N días' },
  { value: 'post_venta', label: 'Post-venta (N días después)' },
];

// ─── Componente principal ────────────────────────────────────────────────────

export default function SeguimientosPage() {
  const [tab, setTab] = useState<Tab>('campana');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Mail className="text-amber-700" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Seguimientos</h1>
          <p className="text-sm text-gray-500">Email marketing y automatizaciones CRM</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: 'campana',        label: 'Nueva campaña',     icon: Send },
          { key: 'historial',      label: 'Historial',         icon: History },
          { key: 'plantillas',     label: 'Plantillas',        icon: FileText },
          { key: 'automatizaciones', label: 'Automatizaciones', icon: Zap },
        ] as { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-amber-700 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'campana'          && <TabNuevaCampana />}
      {tab === 'historial'        && <TabHistorial />}
      {tab === 'plantillas'       && <TabPlantillas />}
      {tab === 'automatizaciones' && <TabAutomatizaciones />}
    </div>
  );
}

// ─── Tab: Nueva campaña ──────────────────────────────────────────────────────

function TabNuevaCampana() {
  const [step, setStep] = useState(1);
  const [segmento, setSegmento] = useState<SegmentoTipo>('todos');
  const [diasCondicion, setDiasCondicion] = useState(30);
  const [nombre, setNombre] = useState('');
  const [asunto, setAsunto] = useState('');
  const [bloques, setBloques] = useState<BloqueEmail[]>([
    { tipo: 'header', contenido: 'Hola {{nombre_cliente}}' },
    { tipo: 'texto',  contenido: 'Te escribimos desde WoodPallet...' },
    { tipo: 'footer', contenido: 'WoodPallet Manager · contacto@woodpallet.com.ar' },
  ]);
  const [usarPlantilla, setUsarPlantilla] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewMut = usePreviewSegmento();
  const enviarMut  = useEnviarCampana();
  const { data: plantillas } = usePlantillas();

  const needsDias = segmento === 'sin_compras_recientes' || segmento === 'con_cotizacion_pendiente';

  const handlePreview = () => {
    previewMut.mutate({ segmento, diasCondicion: needsDias ? diasCondicion : undefined });
  };

  const handleEnviar = async () => {
    if (!nombre || !asunto) return;
    await enviarMut.mutateAsync({
      nombre, asunto, segmento,
      diasCondicion: needsDias ? diasCondicion : undefined,
      bloques,
    });
    // reset
    setStep(1);
    setNombre('');
    setAsunto('');
    setBloques([
      { tipo: 'header', contenido: 'Hola {{nombre_cliente}}' },
      { tipo: 'texto',  contenido: 'Te escribimos desde WoodPallet...' },
      { tipo: 'footer', contenido: 'WoodPallet Manager · contacto@woodpallet.com.ar' },
    ]);
  };

  const cargarPlantilla = (p: PlantillaEmail) => {
    setAsunto(p.asunto);
    setBloques(p.bloques);
    setUsarPlantilla(false);
  };

  return (
    <div className="space-y-6">
      {/* Steps */}
      <div className="flex items-center gap-2 text-sm">
        {[1,2,3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`w-7 h-7 flex items-center justify-center font-bold text-xs ${
                step === s ? 'bg-amber-700 text-white' : step > s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > s ? '✓' : s}
            </button>
            <span className={step === s ? 'font-semibold text-gray-800' : 'text-gray-400'}>
              {s === 1 ? 'Segmento' : s === 2 ? 'Contenido' : 'Confirmar'}
            </span>
            {s < 3 && <span className="text-gray-300 mx-1">→</span>}
          </div>
        ))}
      </div>

      {/* Paso 1: Segmento */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-700 mb-4">¿A quién enviás la campaña?</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {SEGMENTOS.map(s => (
              <button
                key={s.value}
                onClick={() => setSegmento(s.value)}
                className={`text-left p-3 border-2 transition-colors ${
                  segmento === s.value ? 'border-amber-700 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-sm text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>

          {needsDias && (
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm text-gray-600 w-48">Días de condición:</label>
              <input
                type="number"
                value={diasCondicion}
                onChange={e => setDiasCondicion(Number(e.target.value))}
                className="border border-gray-300 px-2 py-1 w-24 text-sm"
                min={1}
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={previewMut.isPending}
              className="bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
            >
              {previewMut.isPending ? 'Consultando...' : 'Ver destinatarios'}
            </button>
            {previewMut.data && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Users size={14} className="text-amber-700" />
                <span><strong>{previewMut.data.total}</strong> destinatarios</span>
                <span className="text-gray-400">
                  ({previewMut.data.preview.slice(0, 3).map(c => c.razonSocial).join(', ')}{previewMut.data.total > 3 ? '...' : ''})
                </span>
              </div>
            )}
          </div>

          {previewMut.data && previewMut.data.total > 0 && (
            <button
              onClick={() => setStep(2)}
              className="mt-4 bg-gray-800 text-white px-5 py-2 text-sm font-medium hover:bg-gray-900"
            >
              Continuar →
            </button>
          )}
        </div>
      )}

      {/* Paso 2: Contenido */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 mb-2">Diseñá el email</h2>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm text-gray-600 block mb-1">Nombre de campaña</label>
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: Promo Mayo 2026"
                className="w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-600 block mb-1">Asunto del email</label>
              <input
                value={asunto}
                onChange={e => setAsunto(e.target.value)}
                placeholder="Ej: ¡Tenemos pallets para vos!"
                className="w-full border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Cargar plantilla */}
          <div>
            <button
              onClick={() => setUsarPlantilla(v => !v)}
              className="text-sm text-amber-700 underline flex items-center gap-1"
            >
              {usarPlantilla ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Cargar desde plantilla guardada
            </button>
            {usarPlantilla && plantillas && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {plantillas.map(p => (
                  <button
                    key={p.id}
                    onClick={() => cargarPlantilla(p)}
                    className="text-left border border-gray-200 p-2 hover:border-amber-700 text-sm"
                  >
                    <p className="font-medium">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.asunto}</p>
                  </button>
                ))}
                {plantillas.length === 0 && <p className="text-sm text-gray-400 col-span-3">No hay plantillas guardadas</p>}
              </div>
            )}
          </div>

          <EmailEditor bloques={bloques} onChange={setBloques} />

          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              <Eye size={14} /> Vista previa
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!nombre || !asunto}
              className="bg-gray-800 text-white px-5 py-2 text-sm font-medium hover:bg-gray-900 disabled:opacity-40"
            >
              Continuar →
            </button>
            <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">← Volver</button>
          </div>
        </div>
      )}

      {/* Paso 3: Confirmar */}
      {step === 3 && (
        <div className="bg-white border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Confirmar envío</h2>
          <div className="bg-gray-50 border border-gray-200 p-4 space-y-2 text-sm">
            <p><span className="text-gray-500">Campaña:</span> <strong>{nombre}</strong></p>
            <p><span className="text-gray-500">Asunto:</span> {asunto}</p>
            <p><span className="text-gray-500">Segmento:</span> {SEGMENTOS.find(s => s.value === segmento)?.label}</p>
            <p><span className="text-gray-500">Destinatarios:</span> <strong>{previewMut.data?.total ?? '—'}</strong></p>
            <p><span className="text-gray-500">Bloques:</span> {bloques.length} bloques de contenido</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleEnviar}
              disabled={enviarMut.isPending}
              className="flex items-center gap-2 bg-amber-700 text-white px-5 py-2 text-sm font-semibold hover:bg-amber-800 disabled:opacity-50"
            >
              <Send size={14} />
              {enviarMut.isPending ? 'Enviando...' : 'Enviar campaña'}
            </button>
            <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-gray-700">← Volver</button>
          </div>
          {enviarMut.isSuccess && (
            <p className="text-green-600 text-sm flex items-center gap-2"><CheckCircle size={14} /> Campaña enviada correctamente</p>
          )}
          {enviarMut.isError && (
            <p className="text-red-600 text-sm flex items-center gap-2"><XCircle size={14} /> Error al enviar. Revisá la consola.</p>
          )}
        </div>
      )}

      {showPreview && (
        <PreviewEmailModal bloques={bloques} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

// ─── Tab: Historial ──────────────────────────────────────────────────────────

function TabHistorial() {
  const { data, isLoading } = useHistorialCampanas();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detalle } = useDetalleCampana(selectedId);

  if (isLoading) return <p className="text-sm text-gray-400">Cargando...</p>;
  if (!data?.length) return <p className="text-sm text-gray-400">No hay campañas enviadas aún.</p>;

  return (
    <div className="flex gap-5">
      <div className="w-80 space-y-2">
        {data.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={`w-full text-left border p-3 transition-colors ${
              selectedId === c.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="font-medium text-sm text-gray-800 truncate">{c.nombre}</p>
            <p className="text-xs text-gray-500 truncate">{c.asunto}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{new Date(c.enviadaEn).toLocaleDateString('es-AR')}</span>
              <span className="text-xs bg-gray-100 px-2 py-0.5">{c.totalDestinatarios} dest.</span>
            </div>
          </button>
        ))}
      </div>

      {detalle && (
        <div className="flex-1 bg-white border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-1">{detalle.nombre}</h2>
          <p className="text-sm text-gray-500 mb-4">{detalle.asunto}</p>
          <div className="flex gap-6 text-sm mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-800">{detalle.totalDestinatarios}</p>
              <p className="text-xs text-gray-500">Enviados</p>
            </div>
            {detalle.destinatarios && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{detalle.destinatarios.filter(d => d.enviado).length}</p>
                  <p className="text-xs text-gray-500">Exitosos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{detalle.destinatarios.filter(d => !d.enviado && d.error).length}</p>
                  <p className="text-xs text-gray-500">Con error</p>
                </div>
              </>
            )}
          </div>
          {detalle.destinatarios && (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left py-1.5">Cliente</th>
                    <th className="text-left py-1.5">Email</th>
                    <th className="text-left py-1.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.destinatarios.map(d => (
                    <tr key={d.id} className="border-b border-gray-50">
                      <td className="py-1.5">{d.cliente.razonSocial}</td>
                      <td className="py-1.5 text-gray-500">{d.email}</td>
                      <td className="py-1.5">
                        {d.enviado
                          ? <span className="flex items-center gap-1 text-green-600"><CheckCircle size={11} /> OK</span>
                          : d.error
                            ? <span className="flex items-center gap-1 text-red-500"><XCircle size={11} /> Error</span>
                            : <span className="flex items-center gap-1 text-yellow-500"><Clock size={11} /> Pendiente</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Plantillas ─────────────────────────────────────────────────────────

function TabPlantillas() {
  const { data, isLoading } = usePlantillas();
  const crearMut    = useCrearPlantilla();
  const actualizarMut = useActualizarPlantilla();
  const eliminarMut   = useEliminarPlantilla();

  const [editando, setEditando] = useState<PlantillaEmail | null>(null);
  const [nueva, setNueva] = useState(false);
  const [nombre, setNombre] = useState('');
  const [asunto, setAsunto] = useState('');
  const [bloques, setBloques] = useState<BloqueEmail[]>([
    { tipo: 'header', contenido: 'Hola {{nombre_cliente}}' },
    { tipo: 'texto',  contenido: '' },
    { tipo: 'footer', contenido: 'WoodPallet Manager' },
  ]);
  const [showPreview, setShowPreview] = useState(false);

  const abrirEditar = (p: PlantillaEmail) => {
    setEditando(p);
    setNueva(false);
    setNombre(p.nombre);
    setAsunto(p.asunto);
    setBloques(p.bloques);
  };

  const abrirNueva = () => {
    setEditando(null);
    setNueva(true);
    setNombre('');
    setAsunto('');
    setBloques([
      { tipo: 'header', contenido: 'Hola {{nombre_cliente}}' },
      { tipo: 'texto',  contenido: '' },
      { tipo: 'footer', contenido: 'WoodPallet Manager' },
    ]);
  };

  const guardar = async () => {
    if (editando) {
      await actualizarMut.mutateAsync({ id: editando.id, nombre, asunto, bloques });
    } else {
      await crearMut.mutateAsync({ nombre, asunto, bloques });
    }
    setEditando(null);
    setNueva(false);
  };

  if (isLoading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="flex gap-5">
      {/* Lista */}
      <div className="w-72">
        <button
          onClick={abrirNueva}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 text-amber-700 py-2.5 text-sm font-medium hover:bg-amber-50 mb-3"
        >
          <Plus size={14} /> Nueva plantilla
        </button>
        {data?.map(p => (
          <div
            key={p.id}
            className={`border p-3 mb-2 cursor-pointer transition-colors ${
              editando?.id === p.id ? 'border-amber-700 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => abrirEditar(p)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{p.nombre}</p>
                <p className="text-xs text-gray-400 truncate">{p.asunto}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); eliminarMut.mutate(p.id); }}
                className="text-gray-400 hover:text-red-500 ml-2 shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        {!data?.length && !nueva && (
          <p className="text-sm text-gray-400 text-center py-4">No hay plantillas</p>
        )}
      </div>

      {/* Editor */}
      {(editando || nueva) && (
        <div className="flex-1 bg-white border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">{editando ? 'Editar plantilla' : 'Nueva plantilla'}</h2>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Nombre de plantilla</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 block mb-1">Asunto</label>
              <input value={asunto} onChange={e => setAsunto(e.target.value)} className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
          </div>
          <EmailEditor bloques={bloques} onChange={setBloques} />
          <div className="flex gap-3">
            <button
              onClick={guardar}
              disabled={!nombre || !asunto || crearMut.isPending || actualizarMut.isPending}
              className="bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
            >
              {crearMut.isPending || actualizarMut.isPending ? 'Guardando...' : 'Guardar plantilla'}
            </button>
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-2 border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              <Eye size={13} /> Vista previa
            </button>
          </div>
          {showPreview && <PreviewEmailModal bloques={bloques} onClose={() => setShowPreview(false)} />}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Automatizaciones ───────────────────────────────────────────────────

function TabAutomatizaciones() {
  const { data, isLoading } = useReglas();
  const { data: plantillas } = usePlantillas();
  const crearMut    = useCrearRegla();
  const toggleMut   = useToggleRegla();
  const eliminarMut = useEliminarRegla();

  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [evento, setEvento] = useState('cotizacion_pendiente');
  const [dias, setDias] = useState(7);
  const [asunto, setAsunto] = useState('');
  const [plantillaId, setPlantillaId] = useState<number | ''>('');

  const guardar = async () => {
    await crearMut.mutateAsync({
      nombre, evento, asunto,
      diasCondicion: dias,
      plantillaId: plantillaId ? Number(plantillaId) : undefined,
    });
    setShowForm(false);
    setNombre(''); setAsunto(''); setPlantillaId('');
  };

  if (isLoading) return <p className="text-sm text-gray-400">Cargando...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Las automatizaciones se ejecutan diariamente a las 8:10 AM</p>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800"
        >
          <Plus size={14} /> Nueva regla
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-amber-200 p-5 space-y-3">
          <h3 className="font-semibold text-gray-700">Nueva regla de automatización</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Nombre de la regla</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)} className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Evento disparador</label>
              <select value={evento} onChange={e => setEvento(e.target.value)} className="w-full border border-gray-300 px-3 py-1.5 text-sm">
                {EVENTOS_REGLA.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Días de condición</label>
              <input type="number" value={dias} onChange={e => setDias(Number(e.target.value))} className="w-full border border-gray-300 px-3 py-1.5 text-sm" min={1} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Asunto del email</label>
              <input value={asunto} onChange={e => setAsunto(e.target.value)} className="w-full border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Plantilla de email (opcional)</label>
              <select value={plantillaId} onChange={e => setPlantillaId(e.target.value ? Number(e.target.value) : '')} className="w-full border border-gray-300 px-3 py-1.5 text-sm">
                <option value="">— Sin plantilla (email vacío) —</option>
                {plantillas?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={guardar}
              disabled={!nombre || !asunto || crearMut.isPending}
              className="bg-amber-700 text-white px-4 py-2 text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
            >
              {crearMut.isPending ? 'Guardando...' : 'Guardar regla'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de reglas */}
      {!data?.length ? (
        <div className="text-center py-12 text-gray-400">
          <Zap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay reglas de automatización</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map(r => (
            <div key={r.id} className={`flex items-center justify-between border p-4 ${r.activa ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <p className="font-medium text-sm text-gray-800">{r.nombre}</p>
                  <span className={`text-xs px-2 py-0.5 ${r.activa ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {r.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {EVENTOS_REGLA.find(e => e.value === r.evento)?.label}
                  {r.diasCondicion ? ` · ${r.diasCondicion} días` : ''}
                  {r.plantilla ? ` · Plantilla: ${r.plantilla.nombre}` : ''}
                </p>
                <p className="text-xs text-gray-400">Asunto: {r.asunto}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button
                  onClick={() => toggleMut.mutate(r.id)}
                  className="text-gray-400 hover:text-amber-700 transition-colors"
                  title={r.activa ? 'Desactivar' : 'Activar'}
                >
                  {r.activa ? <ToggleRight size={22} className="text-amber-700" /> : <ToggleLeft size={22} />}
                </button>
                <button
                  onClick={() => eliminarMut.mutate(r.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
