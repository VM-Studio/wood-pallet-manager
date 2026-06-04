import { useState } from 'react';
import {
  Plus, History, FileText, Zap, Send, Eye, Trash2,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Users,
  CheckCircle, XCircle, Clock, X,
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
  { value: 'todos',                    label: 'Todos los clientes',       desc: 'Envía a todos los clientes activos' },
  { value: 'con_cotizacion_pendiente', label: 'Cotizaciones pendientes',  desc: 'Clientes con cotizaciones sin convertir' },
  { value: 'sin_compras_recientes',    label: 'Sin compras recientes',    desc: 'Clientes inactivos en los últimos N días' },
  { value: 'clientes_frecuentes',      label: 'Clientes frecuentes',      desc: 'Compraron más de una vez' },
  { value: 'deudores',                 label: 'Deudores',                 desc: 'Clientes con saldo deudor pendiente' },
  { value: 'manual',                   label: 'Selección manual',         desc: 'Elegís los clientes desde una lista' },
];

const EVENTOS_REGLA = [
  { value: 'cotizacion_pendiente', label: 'Cotización pendiente' },
  { value: 'sin_compras',          label: 'Sin compras en N días' },
  { value: 'post_venta',           label: 'Post-venta (N días después)' },
];

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'campana',          label: 'Nueva campaña',    icon: Send },
  { key: 'historial',        label: 'Historial',        icon: History },
  { key: 'plantillas',       label: 'Plantillas',       icon: FileText },
  { key: 'automatizaciones', label: 'Automatizaciones', icon: Zap },
];

// ─── Helpers de UI ───────────────────────────────────────────────────────────
function BtnPrimario({ children, onClick, disabled, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      background: '#7c4b2c',
      color: '#fff', border: 'none', borderRadius: '0.25rem',
      padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 600,
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>{children}</button>
  );
}
function BtnSecundario({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      background: '#fff', color: '#374151', border: '1.5px solid #E8E2DA',
      borderRadius: '0.25rem', padding: '0.45rem 1rem', fontSize: '0.8rem', fontWeight: 600,
      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    }}>{children}</button>
  );
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: '100%', border: '1.5px solid #E8E2DA', borderRadius: '0.25rem',
  padding: '0.4rem 0.625rem', fontSize: '0.82rem', background: '#fff',
  color: '#1F2937', outline: 'none', boxSizing: 'border-box',
};

// ─── Componente principal ────────────────────────────────────────────────────
export default function SeguimientosPage() {
  const [tab, setTab] = useState<Tab>('campana');
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="titulo-modulo">Seguimientos</h1>
        <p className="text-sm text-gray-500 mt-1">Email marketing y automatizaciones CRM</p>
      </div>
      <div style={{ display: 'flex', gap: 2, background: '#F3EDE8', borderRadius: '0.375rem', padding: 3 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '0.45rem 0.5rem', fontSize: '0.78rem', fontWeight: 600,
            border: 'none', borderRadius: '0.25rem', cursor: 'pointer', transition: 'all 0.15s',
            background: tab === key ? '#6B3A2A' : 'transparent',
            color: tab === key ? '#fff' : '#9E8878',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>
      {tab === 'campana'          && <TabNuevaCampana />}
      {tab === 'historial'        && <TabHistorial />}
      {tab === 'plantillas'       && <TabPlantillas />}
      {tab === 'automatizaciones' && <TabAutomatizaciones />}
    </div>
  );
}

// ─── Tab: Nueva campaña ──────────────────────────────────────────────────────
const BLOQUES_DEFAULT: BloqueEmail[] = [
  { tipo: 'header', contenido: 'Hola {{nombre_cliente}}', colorFondo: '#6B3A2A' },
  { tipo: 'texto',  contenido: 'Te escribimos desde WoodPallet...' },
  { tipo: 'footer', contenido: 'WoodPallet Manager · contacto@woodpallet.com.ar' },
];
const STEP_LABELS = ['Segmento', 'Contenido', 'Confirmar'];

function TabNuevaCampana() {
  const [step, setStep]             = useState(1);
  const [segmento, setSegmento]     = useState<SegmentoTipo>('todos');
  const [diasCondicion, setDias]    = useState(30);
  const [nombre, setNombre]         = useState('');
  const [asunto, setAsunto]         = useState('');
  const [bloques, setBloques]       = useState<BloqueEmail[]>(BLOQUES_DEFAULT);
  const [usarPlantilla, setUsarP]   = useState(false);
  const [showPreview, setShowPrev]  = useState(false);

  const previewMut = usePreviewSegmento();
  const enviarMut  = useEnviarCampana();
  const { data: plantillas } = usePlantillas();
  const needsDias = segmento === 'sin_compras_recientes' || segmento === 'con_cotizacion_pendiente';

  const handleEnviar = async () => {
    if (!nombre || !asunto) return;
    await enviarMut.mutateAsync({ nombre, asunto, segmento, diasCondicion: needsDias ? diasCondicion : undefined, bloques });
    setStep(1); setNombre(''); setAsunto(''); setBloques(BLOQUES_DEFAULT);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Steps */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={() => setStep(s)} style={{
              width: 26, height: 26, borderRadius: '50%', border: 'none',
              fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
              background: step === s ? '#6B3A2A' : step > s ? '#C4895A' : '#E8E2DA',
              color: step >= s ? '#fff' : '#9CA3AF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{step > s ? '✓' : s}</button>
            <span style={{ fontSize: '0.78rem', fontWeight: step === s ? 700 : 400, color: step === s ? '#1F2937' : '#9CA3AF' }}>{STEP_LABELS[s - 1]}</span>
            {s < 3 && <span style={{ color: '#D1D5DB' }}>→</span>}
          </div>
        ))}
      </div>

      {/* Paso 1 */}
      {step === 1 && (
        <div style={{ background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', padding: '1.25rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', marginBottom: '0.875rem' }}>¿A quién enviás la campaña?</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.875rem' }}>
            {SEGMENTOS.map(s => (
              <button key={s.value} onClick={() => setSegmento(s.value)} style={{
                textAlign: 'left', padding: '0.75rem',
                border: `1.5px solid ${segmento === s.value ? '#6B3A2A' : '#E8E2DA'}`,
                borderRadius: '0.25rem', background: segmento === s.value ? '#F3EDE8' : '#fff', cursor: 'pointer',
              }}>
                <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1F2937', margin: '0 0 2px' }}>{s.label}</p>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>{s.desc}</p>
              </button>
            ))}
          </div>
          {needsDias && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.875rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#6B7280' }}>Días de condición:</label>
              <input type="number" value={diasCondicion} onChange={e => setDias(Number(e.target.value))} min={1} style={{ ...inputStyle, width: 80 }} />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <BtnPrimario onClick={() => previewMut.mutate({ segmento, diasCondicion: needsDias ? diasCondicion : undefined })} disabled={previewMut.isPending}>
              <Users size={13} />{previewMut.isPending ? 'Consultando...' : 'Ver destinatarios'}
            </BtnPrimario>
            {previewMut.data && (
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: previewMut.data.total > 0 ? '#6B3A2A' : '#9CA3AF' }}>
                {previewMut.data.total} {previewMut.data.total === 1 ? 'destinatario' : 'destinatarios'}
              </span>
            )}
          </div>

          {/* Lista desplegable de destinatarios */}
          {previewMut.data && previewMut.data.total > 0 && (
            <div style={{ marginTop: 4, border: '1.5px solid #E8E2DA', borderRadius: '0.25rem', overflow: 'hidden' }}>
              <div style={{ background: '#FAFAF8', padding: '0.45rem 0.75rem', borderBottom: '1px solid #E8E2DA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Destinatarios filtrados ({previewMut.data.total})
                </span>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {previewMut.data.preview.map((c: { id: number; razonSocial: string; email?: string }) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1F2937' }}>{c.razonSocial}</span>
                    {c.email && <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{c.email}</span>}
                  </div>
                ))}
                {previewMut.data.total > previewMut.data.preview.length && (
                  <div style={{ padding: '0.4rem 0.75rem', background: '#F3EDE8' }}>
                    <span style={{ fontSize: '0.72rem', color: '#6B3A2A', fontWeight: 600 }}>
                      + {previewMut.data.total - previewMut.data.preview.length} clientes más en esta segmentación
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {previewMut.data && previewMut.data.total === 0 && (
            <p style={{ fontSize: '0.78rem', color: '#DC2626', margin: 0 }}>No hay clientes en este segmento con los filtros actuales.</p>
          )}
          {previewMut.data && previewMut.data.total > 0 && (
            <div style={{ marginTop: 4 }}><BtnSecundario onClick={() => setStep(2)}>Continuar →</BtnSecundario></div>
          )}
        </div>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <div style={{ background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>Diseñá el email</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Campo label="Nombre de campaña"><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Promo Junio 2026" style={inputStyle} /></Campo>
            <Campo label="Asunto del email"><input value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Ej: ¡Tenemos pallets para vos!" style={inputStyle} /></Campo>
          </div>
          <div>
            <button onClick={() => setUsarP(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#6B3A2A', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, padding: 0 }}>
              {usarPlantilla ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Cargar desde plantilla guardada
            </button>
            {usarPlantilla && plantillas && (
              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {plantillas.length === 0 && <p style={{ fontSize: '0.78rem', color: '#9CA3AF', gridColumn: '1/-1' }}>No hay plantillas guardadas</p>}
                {plantillas.map(p => (
                  <button key={p.id} onClick={() => { setAsunto(p.asunto); setBloques(p.bloques); setUsarP(false); }} style={{ textAlign: 'left', border: '1.5px solid #E8E2DA', borderRadius: '0.25rem', padding: '0.5rem 0.625rem', cursor: 'pointer', background: '#FAFAF8' }}>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1F2937', margin: '0 0 2px' }}>{p.nombre}</p>
                    <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>{p.asunto}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <EmailEditor bloques={bloques} onChange={setBloques} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <BtnPrimario onClick={() => setStep(3)} disabled={!nombre || !asunto}>Continuar →</BtnPrimario>
            <BtnSecundario onClick={() => setShowPrev(true)}><Eye size={13} />Vista previa</BtnSecundario>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#9CA3AF' }}>← Volver</button>
          </div>
        </div>
      )}

      {/* Paso 3 */}
      {step === 3 && (
        <div style={{ background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>Confirmar envío</p>
          <div style={{ background: '#FAFAF8', border: '1.5px solid #E8E2DA', borderRadius: '0.25rem', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([['Campaña', nombre], ['Asunto', asunto], ['Segmento', SEGMENTOS.find(s => s.value === segmento)?.label ?? '—'], ['Destinatarios', String(previewMut.data?.total ?? '—')], ['Bloques', `${bloques.length} bloques`]] as [string,string][]).map(([k, v]) => (
              <p key={k} style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}><span style={{ color: '#9CA3AF', marginRight: 6 }}>{k}:</span><strong>{v}</strong></p>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <BtnPrimario onClick={handleEnviar} disabled={enviarMut.isPending}>
              <Send size={13} />{enviarMut.isPending ? 'Enviando...' : 'Enviar campaña'}
            </BtnPrimario>
            <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: '#9CA3AF' }}>← Volver</button>
          </div>
          {enviarMut.isSuccess && <p style={{ fontSize: '0.8rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: 6 }}><CheckCircle size={14} />Campaña enviada correctamente</p>}
          {enviarMut.isError   && <p style={{ fontSize: '0.8rem', color: '#DC2626', display: 'flex', alignItems: 'center', gap: 6 }}><XCircle size={14} />Error al enviar. Revisá la consola.</p>}
        </div>
      )}

      {showPreview && <PreviewEmailModal bloques={bloques} onClose={() => setShowPrev(false)} />}
    </div>
  );
}

// ─── Tab: Historial ──────────────────────────────────────────────────────────
function TabHistorial() {
  const { data, isLoading } = useHistorialCampanas();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: detalle } = useDetalleCampana(selectedId);

  if (isLoading) return <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Cargando...</p>;
  if (!data?.length) return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
      <History size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
      <p style={{ fontSize: '0.85rem' }}>No hay campañas enviadas aún</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map(c => (
          <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
            textAlign: 'left', padding: '0.625rem 0.75rem',
            border: `1.5px solid ${selectedId === c.id ? '#6B3A2A' : '#E8E2DA'}`,
            borderRadius: '0.25rem', background: selectedId === c.id ? '#F3EDE8' : '#fff', cursor: 'pointer',
          }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1F2937', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nombre}</p>
            <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.asunto}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{new Date(c.enviadaEn).toLocaleDateString('es-AR')}</span>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '1px 6px', background: '#F3EDE8', color: '#6B3A2A', borderRadius: '0.25rem' }}>{c.totalDestinatarios} dest.</span>
            </div>
          </button>
        ))}
      </div>
      {detalle ? (
        <div style={{ flex: 1, background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', padding: '1.25rem' }}>
          <p style={{ fontSize: '0.92rem', fontWeight: 700, color: '#1F2937', margin: '0 0 2px' }}>{detalle.nombre}</p>
          <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: '0 0 1rem' }}>{detalle.asunto}</p>
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
            {[
              { val: detalle.totalDestinatarios, label: 'Enviados', color: '#6B3A2A' },
              { val: detalle.destinatarios?.filter((d: { enviado: boolean }) => d.enviado).length ?? 0, label: 'Exitosos', color: '#15803D' },
              { val: detalle.destinatarios?.filter((d: { enviado: boolean; error?: string }) => !d.enviado && d.error).length ?? 0, label: 'Con error', color: '#DC2626' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, margin: 0 }}>{s.val}</p>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>
          {detalle.destinatarios && (
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #E8E2DA', borderRadius: '0.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr style={{ background: '#FAFAF8', borderBottom: '1px solid #E8E2DA' }}>
                    {['Cliente', 'Email', 'Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600, color: '#9CA3AF', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {detalle.destinatarios.map((d: { id: number; cliente: { razonSocial: string }; email: string; enviado: boolean; error?: string }) => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#374151', fontWeight: 500 }}>{d.cliente.razonSocial}</td>
                      <td style={{ padding: '0.45rem 0.75rem', color: '#9CA3AF' }}>{d.email}</td>
                      <td style={{ padding: '0.45rem 0.75rem' }}>
                        {d.enviado
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#15803D', fontWeight: 600 }}><CheckCircle size={11} />OK</span>
                          : d.error
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#DC2626', fontWeight: 600 }}><XCircle size={11} />Error</span>
                            : <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#C4895A', fontWeight: 600 }}><Clock size={11} />Pendiente</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, background: '#FAFAF8', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Seleccioná una campaña para ver el detalle</p>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Plantillas ─────────────────────────────────────────────────────────
function TabPlantillas() {
  const { data, isLoading }   = usePlantillas();
  const crearMut              = useCrearPlantilla();
  const actualizarMut         = useActualizarPlantilla();
  const eliminarMut           = useEliminarPlantilla();
  const [editando, setEdit]   = useState<PlantillaEmail | null>(null);
  const [nueva, setNueva]     = useState(false);
  const [nombre, setNombre]   = useState('');
  const [asunto, setAsunto]   = useState('');
  const [bloques, setBloques] = useState<BloqueEmail[]>([
    { tipo: 'header', contenido: 'Hola {{nombre_cliente}}', colorFondo: '#6B3A2A' },
    { tipo: 'texto',  contenido: '' },
    { tipo: 'footer', contenido: 'WoodPallet Manager' },
  ]);
  const [showPreview, setShowPrev] = useState(false);

  const abrirEditar = (p: PlantillaEmail) => { setEdit(p); setNueva(false); setNombre(p.nombre); setAsunto(p.asunto); setBloques(p.bloques); };
  const abrirNueva  = () => { setEdit(null); setNueva(true); setNombre(''); setAsunto(''); setBloques([{ tipo: 'header', contenido: 'Hola {{nombre_cliente}}', colorFondo: '#6B3A2A' }, { tipo: 'texto', contenido: '' }, { tipo: 'footer', contenido: 'WoodPallet Manager' }]); };
  const guardar = async () => {
    if (editando) await actualizarMut.mutateAsync({ id: editando.id, nombre, asunto, bloques });
    else          await crearMut.mutateAsync({ nombre, asunto, bloques });
    setEdit(null); setNueva(false);
  };

  if (isLoading) return <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Cargando...</p>;
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
      <div style={{ width: 240, flexShrink: 0 }}>
        <button onClick={abrirNueva} style={{ width: '100%', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, border: '1.5px dashed #C4895A', borderRadius: '0.25rem', background: '#FEFAF7', color: '#6B3A2A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          <Plus size={13} />Nueva plantilla
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {data?.map(p => (
            <div key={p.id} onClick={() => abrirEditar(p)} style={{ border: `1.5px solid ${editando?.id === p.id ? '#6B3A2A' : '#E8E2DA'}`, borderRadius: '0.25rem', padding: '0.5rem 0.625rem', background: editando?.id === p.id ? '#F3EDE8' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1F2937', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                <p style={{ fontSize: '0.7rem', color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.asunto}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); eliminarMut.mutate(p.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#D1D5DB', flexShrink: 0 }}><Trash2 size={12} /></button>
            </div>
          ))}
          {!data?.length && !nueva && <p style={{ fontSize: '0.78rem', color: '#9CA3AF', textAlign: 'center', padding: '1rem 0' }}>No hay plantillas</p>}
        </div>
      </div>
      {(editando || nueva) && (
        <div style={{ flex: 1, background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>{editando ? 'Editar plantilla' : 'Nueva plantilla'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Campo label="Nombre de plantilla"><input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} /></Campo>
            <Campo label="Asunto"><input value={asunto} onChange={e => setAsunto(e.target.value)} style={inputStyle} /></Campo>
          </div>
          <EmailEditor bloques={bloques} onChange={setBloques} />
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar} disabled={!nombre || !asunto || crearMut.isPending || actualizarMut.isPending}>
              {crearMut.isPending || actualizarMut.isPending ? 'Guardando...' : 'Guardar plantilla'}
            </BtnPrimario>
            <BtnSecundario onClick={() => setShowPrev(true)}><Eye size={13} />Vista previa</BtnSecundario>
          </div>
          {showPreview && <PreviewEmailModal bloques={bloques} onClose={() => setShowPrev(false)} />}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Automatizaciones ───────────────────────────────────────────────────
function TabAutomatizaciones() {
  const { data, isLoading }       = useReglas();
  const { data: plantillas }      = usePlantillas();
  const crearMut                  = useCrearRegla();
  const toggleMut                 = useToggleRegla();
  const eliminarMut               = useEliminarRegla();
  const [showForm, setShowForm]   = useState(false);
  const [nombre, setNombre]       = useState('');
  const [evento, setEvento]       = useState('cotizacion_pendiente');
  const [dias, setDias]           = useState(7);
  const [asunto, setAsunto]       = useState('');
  const [plantillaId, setPlantId] = useState<number | ''>('');

  const guardar = async () => {
    await crearMut.mutateAsync({ nombre, evento, asunto, diasCondicion: dias, plantillaId: plantillaId ? Number(plantillaId) : undefined });
    setShowForm(false); setNombre(''); setAsunto(''); setPlantId('');
  };

  if (isLoading) return <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Cargando...</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '0.78rem', color: '#9CA3AF', margin: 0 }}>Las automatizaciones se ejecutan diariamente a las 8:10 AM</p>
        <BtnPrimario onClick={() => setShowForm(v => !v)}>{showForm ? <X size={13} /> : <Plus size={13} />}{showForm ? 'Cancelar' : 'Nueva regla'}</BtnPrimario>
      </div>
      {showForm && (
        <div style={{ background: '#fff', border: '1.5px solid #E8E2DA', borderRadius: '0.375rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>Nueva regla de automatización</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <Campo label="Nombre de la regla"><input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} /></Campo>
            <Campo label="Evento disparador">
              <select value={evento} onChange={e => setEvento(e.target.value)} style={inputStyle}>
                {EVENTOS_REGLA.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
              </select>
            </Campo>
            <Campo label="Días de condición"><input type="number" value={dias} onChange={e => setDias(Number(e.target.value))} min={1} style={inputStyle} /></Campo>
            <Campo label="Asunto del email"><input value={asunto} onChange={e => setAsunto(e.target.value)} style={inputStyle} /></Campo>
            <div style={{ gridColumn: '1 / -1' }}>
              <Campo label="Plantilla de email (opcional)">
                <select value={plantillaId} onChange={e => setPlantId(e.target.value ? Number(e.target.value) : '')} style={inputStyle}>
                  <option value="">— Sin plantilla —</option>
                  {plantillas?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Campo>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <BtnPrimario onClick={guardar} disabled={!nombre || !asunto || crearMut.isPending}>{crearMut.isPending ? 'Guardando...' : 'Guardar regla'}</BtnPrimario>
            <BtnSecundario onClick={() => setShowForm(false)}>Cancelar</BtnSecundario>
          </div>
        </div>
      )}
      {!data?.length ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#9CA3AF' }}>
          <Zap size={36} style={{ opacity: 0.25, display: 'block', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '0.85rem' }}>No hay reglas de automatización configuradas</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1.5px solid ${r.activa ? '#E8E2DA' : '#F3F4F6'}`, borderRadius: '0.375rem', padding: '0.75rem 0.875rem', background: r.activa ? '#fff' : '#FAFAFA', opacity: r.activa ? 1 : 0.65 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1F2937', margin: 0 }}>{r.nombre}</p>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '0.25rem', background: r.activa ? '#DCFCE7' : '#F3F4F6', color: r.activa ? '#15803D' : '#9CA3AF' }}>{r.activa ? 'Activa' : 'Inactiva'}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>
                  {EVENTOS_REGLA.find(e => e.value === r.evento)?.label}
                  {r.diasCondicion ? ` · ${r.diasCondicion} días` : ''}
                  {r.plantilla ? ` · ${r.plantilla.nombre}` : ''}
                  {' · '}<span style={{ fontStyle: 'italic' }}>{r.asunto}</span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 12 }}>
                <button onClick={() => toggleMut.mutate(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title={r.activa ? 'Desactivar' : 'Activar'}>
                  {r.activa ? <ToggleRight size={22} style={{ color: '#6B3A2A' }} /> : <ToggleLeft size={22} style={{ color: '#D1D5DB' }} />}
                </button>
                <button onClick={() => eliminarMut.mutate(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', display: 'flex', alignItems: 'center' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
