import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Shield, PenTool, Camera, Phone, Mail, Lock,
  CheckCircle, AlertCircle, Loader2, Eye, EyeOff,
  Trash2, Upload, RotateCcw, Save,
} from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const masked = local[0] + '***' + (local.length > 1 ? local[local.length - 1] : '');
  return `${masked}@${domain}`;
};

const maskPhone = (phone: string) => {
  if (phone.length <= 4) return '****';
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
};

type Tab = 'info' | 'seguridad' | 'firma';

// ─── Componente badge de rol ───────────────────────────────────────────────────
const RolBadge = ({ rol }: { rol: string }) => {
  const label = rol === 'propietario_carlos' ? 'Carlos' : rol === 'propietario_juancruz' ? 'Juan Cruz' : 'Admin';
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: '#FDF6EE', color: '#92400E', border: '1px solid #FDE68A' }}>
      Propietario · {label}
    </span>
  );
};

// ─── Sección: Información Personal ───────────────────────────────────────────
function InfoPersonalSection() {
  const queryClient = useQueryClient();
  const { setUsuario } = useAuthStore();
  const { data: me, isLoading } = useQuery({
    queryKey: ['me-completo'],
    queryFn: () => api.get('/auth/me/completo').then(r => r.data),
  });

  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Cambio de email — sub-flujo
  const [emailFlow, setEmailFlow] = useState<'idle' | 'input' | 'canal' | 'codigo' | 'ok'>('idle');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [emailCodigo, setEmailCodigo] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Cambio de teléfono — sub-flujo
  const [telFlow, setTelFlow] = useState<'idle' | 'input' | 'codigo' | 'ok'>('idle');
  const [nuevoTel, setNuevoTel] = useState('');
  const [telCodigo, setTelCodigo] = useState('');
  const [telLoading, setTelLoading] = useState(false);
  const [telError, setTelError] = useState('');

  useEffect(() => {
    if (me) { setNombre(me.nombre); setApellido(me.apellido); }
  }, [me]);

  const guardarPerfilMutation = useMutation({
    mutationFn: (d: { nombre: string; apellido: string }) => api.put('/auth/perfil', d).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me-completo'] });
      setUsuario(data);
      setEditando(false);
      setSuccess('Perfil actualizado');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (e: unknown) => setError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Error al guardar'),
  });

  // Foto
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const subirFotoMutation = useMutation({
    mutationFn: (b64: string) => api.put('/auth/foto', { fotoPerfil: b64 }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me-completo'] });
      setUsuario(data);
    },
  });

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => subirFotoMutation.mutate(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Email flow
  const solicitarCodigoEmail = async () => {
    if (!nuevoEmail || !nuevoEmail.includes('@')) { setEmailError('Ingresá un email válido'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      await api.post('/auth/solicitar-codigo', { tipo: 'cambio_email', dato: nuevoEmail, canal: 'email' });
      setEmailFlow('codigo');
    } catch (e: unknown) { setEmailError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Error al enviar código'); }
    finally { setEmailLoading(false); }
  };

  const confirmarCambioEmail = async () => {
    if (emailCodigo.length !== 6) { setEmailError('El código debe tener 6 dígitos'); return; }
    setEmailLoading(true); setEmailError('');
    try {
      await api.put('/auth/email', { codigo: emailCodigo, nuevoEmail });
      queryClient.invalidateQueries({ queryKey: ['me-completo'] });
      setEmailFlow('ok');
    } catch (e: unknown) { setEmailError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Código inválido o expirado'); }
    finally { setEmailLoading(false); }
  };

  // Teléfono flow
  const solicitarCodigoTel = async () => {
    if (!nuevoTel || nuevoTel.length < 6) { setTelError('Ingresá un número de teléfono válido'); return; }
    setTelLoading(true); setTelError('');
    try {
      await api.post('/auth/solicitar-codigo', { tipo: 'cambio_telefono', dato: nuevoTel, canal: 'email' });
      setTelFlow('codigo');
    } catch (e: unknown) { setTelError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Error al enviar código'); }
    finally { setTelLoading(false); }
  };

  const confirmarCambioTel = async () => {
    if (telCodigo.length !== 6) { setTelError('El código debe tener 6 dígitos'); return; }
    setTelLoading(true); setTelError('');
    try {
      await api.put('/auth/telefono', { codigo: telCodigo, nuevoTelefono: nuevoTel });
      queryClient.invalidateQueries({ queryKey: ['me-completo'] });
      setTelFlow('ok');
    } catch (e: unknown) { setTelError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Código inválido o expirado'); }
    finally { setTelLoading(false); }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#6B3A2A' }} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Foto y nombre */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-stone-100 flex items-center justify-center"
              style={{ border: '3px solid #e7ddd5' }}>
              {me?.fotoPerfil
                ? <img src={me.fotoPerfil} alt="foto" className="w-full h-full object-cover" />
                : <User className="w-10 h-10 text-stone-300" />
              }
            </div>
            <button
              onClick={() => fotoInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors"
              style={{ background: '#3c250f', color: 'white' }}
              title="Cambiar foto"
            >
              {subirFotoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </div>

          <div className="flex-1 min-w-0">
            {editando ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Nombre</label>
                    <input value={nombre} onChange={e => setNombre(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400"
                      style={{ background: '#FAFAF9' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Apellido</label>
                    <input value={apellido} onChange={e => setApellido(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400"
                      style={{ background: '#FAFAF9' }}
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => guardarPerfilMutation.mutate({ nombre, apellido })}
                    disabled={guardarPerfilMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                    style={{ background: '#3c250f' }}
                  >
                    {guardarPerfilMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Guardar
                  </button>
                  <button onClick={() => { setEditando(false); setError(''); setNombre(me?.nombre); setApellido(me?.apellido); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-stone-500 hover:bg-stone-50 border border-stone-200 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl font-bold text-stone-800">{me?.nombre} {me?.apellido}</h2>
                </div>
                <RolBadge rol={me?.rol || ''} />
                <p className="text-xs text-stone-400 mt-2">
                  Cuenta creada el {me?.fechaCreacion ? new Date(me.fechaCreacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                </p>
                {success && <p className="text-green-600 text-xs mt-1 font-medium">{success}</p>}
                <button onClick={() => setEditando(true)}
                  className="mt-3 text-xs font-semibold underline-offset-2 hover:underline transition-colors"
                  style={{ color: '#6B3A2A' }}>
                  Editar nombre
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FDF6EE' }}>
              <Mail className="w-4.5 h-4.5" style={{ color: '#92400E' }} />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Email</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{me?.email}</p>
              <p className="text-xs text-stone-400 mt-0.5">Dato de acceso principal a la cuenta</p>
            </div>
          </div>
          {emailFlow === 'idle' && (
            <button onClick={() => setEmailFlow('input')}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: '#e7ddd5', color: '#6B3A2A', background: '#FDF6EE' }}>
              Cambiar
            </button>
          )}
        </div>

        {emailFlow === 'input' && (
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <p className="text-sm text-stone-600">Ingresá el nuevo email que querés registrar:</p>
            <input value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)}
              type="email" placeholder="nuevo@email.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400"
              style={{ background: '#FAFAF9' }}
            />
            {emailError && <p className="text-red-500 text-xs">{emailError}</p>}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium mb-1">¿Cómo querés recibir el código de verificación?</p>
              <div className="space-y-2 mt-2">
                <button
                  onClick={() => { setEmailError(''); solicitarCodigoEmail(); }}
                  disabled={emailLoading}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-amber-200 text-left transition-colors hover:bg-amber-100"
                  style={{ background: 'white' }}
                >
                  <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-stone-700">Email actual</p>
                    <p className="text-xs text-stone-500">{me?.email ? maskEmail(me.email) : '—'}</p>
                  </div>
                  {emailLoading && <Loader2 className="w-4 h-4 animate-spin ml-auto text-amber-600" />}
                </button>
                {me?.telefono ? (
                  <div className="w-full flex items-center gap-3 p-3 rounded-lg border border-stone-200 text-left opacity-50 cursor-not-allowed"
                    style={{ background: '#FAFAF9' }} title="SMS no disponible en esta versión">
                    <Phone className="w-4 h-4 text-stone-400 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-stone-500">Teléfono (próximamente)</p>
                      <p className="text-xs text-stone-400">{maskPhone(me.telefono)}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            <button onClick={() => { setEmailFlow('idle'); setEmailError(''); setNuevoEmail(''); }}
              className="text-xs text-stone-400 hover:text-stone-600">Cancelar</button>
          </div>
        )}

        {emailFlow === 'codigo' && (
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <p className="text-sm text-stone-600">
              Te enviamos un código de 6 dígitos a <strong>{me?.email ? maskEmail(me.email) : '—'}</strong>. Ingresalo para confirmar el cambio a <strong>{nuevoEmail}</strong>.
            </p>
            <CodigoInput value={emailCodigo} onChange={setEmailCodigo} />
            {emailError && <p className="text-red-500 text-xs">{emailError}</p>}
            <div className="flex gap-2">
              <button onClick={confirmarCambioEmail} disabled={emailLoading || emailCodigo.length !== 6}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: '#3c250f' }}>
                {emailLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Confirmar cambio
              </button>
              <button onClick={() => { setEmailFlow('idle'); setEmailCodigo(''); setEmailError(''); setNuevoEmail(''); }}
                className="text-xs text-stone-400 hover:text-stone-600 px-3">Cancelar</button>
            </div>
            <button onClick={solicitarCodigoEmail} className="text-xs underline" style={{ color: '#6B3A2A' }}>
              Reenviar código
            </button>
          </div>
        )}

        {emailFlow === 'ok' && (
          <div className="pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <p className="text-sm font-semibold">Email actualizado correctamente a <strong>{nuevoEmail}</strong></p>
            </div>
            <button onClick={() => setEmailFlow('idle')} className="mt-2 text-xs text-stone-400 hover:text-stone-600">Cerrar</button>
          </div>
        )}
      </div>

      {/* Teléfono */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <Phone className="w-4.5 h-4.5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Teléfono</p>
              <p className="text-sm font-semibold text-stone-800 mt-0.5">{me?.telefono || <span className="text-stone-400 font-normal italic">No registrado</span>}</p>
              <p className="text-xs text-stone-400 mt-0.5">Canal alternativo de verificación</p>
            </div>
          </div>
          {telFlow === 'idle' && (
            <button onClick={() => setTelFlow('input')}
              className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: '#BBF7D0', color: '#15803D', background: '#F0FDF4' }}>
              {me?.telefono ? 'Cambiar' : 'Agregar'}
            </button>
          )}
        </div>

        {telFlow === 'input' && (
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <p className="text-sm text-stone-600">Ingresá el nuevo número de teléfono:</p>
            <input value={nuevoTel} onChange={e => setNuevoTel(e.target.value)}
              type="tel" placeholder="+54 11 12345678"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400"
              style={{ background: '#FAFAF9' }}
            />
            <p className="text-xs text-stone-400">Recibirás un código de verificación en tu email actual para confirmar el cambio.</p>
            {telError && <p className="text-red-500 text-xs">{telError}</p>}
            <div className="flex gap-2">
              <button onClick={solicitarCodigoTel} disabled={telLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
                style={{ background: '#3c250f' }}>
                {telLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                Enviar código
              </button>
              <button onClick={() => { setTelFlow('idle'); setTelError(''); setNuevoTel(''); }}
                className="text-xs text-stone-400 hover:text-stone-600 px-3">Cancelar</button>
            </div>
          </div>
        )}

        {telFlow === 'codigo' && (
          <div className="space-y-3 pt-3 border-t border-stone-100">
            <p className="text-sm text-stone-600">
              Te enviamos un código a <strong>{me?.email ? maskEmail(me.email) : '—'}</strong>. Ingresalo para confirmar el cambio de teléfono a <strong>{nuevoTel}</strong>.
            </p>
            <CodigoInput value={telCodigo} onChange={setTelCodigo} />
            {telError && <p className="text-red-500 text-xs">{telError}</p>}
            <div className="flex gap-2">
              <button onClick={confirmarCambioTel} disabled={telLoading || telCodigo.length !== 6}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ background: '#3c250f' }}>
                {telLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Confirmar cambio
              </button>
              <button onClick={() => { setTelFlow('idle'); setTelCodigo(''); setTelError(''); setNuevoTel(''); }}
                className="text-xs text-stone-400 hover:text-stone-600 px-3">Cancelar</button>
            </div>
          </div>
        )}

        {telFlow === 'ok' && (
          <div className="pt-3 border-t border-stone-100">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <p className="text-sm font-semibold">Teléfono actualizado correctamente</p>
            </div>
            <button onClick={() => setTelFlow('idle')} className="mt-2 text-xs text-stone-400 hover:text-stone-600">Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Input de código (6 dígitos, un box por dígito) ──────────────────────────
function CodigoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const ref4 = useRef<HTMLInputElement>(null);
  const ref5 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5];

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        const arr = value.split('');
        arr[i] = '';
        onChange(arr.join(''));
      } else if (i > 0) {
        refs[i - 1].current?.focus();
        const arr = value.split('');
        arr[i - 1] = '';
        onChange(arr.join(''));
      }
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = val;
    onChange(arr.join('').trimEnd());
    if (val && i < 5) refs[i + 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    e.preventDefault();
    refs[Math.min(pasted.length, 5)].current?.focus();
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={i === 0 ? handlePaste : undefined}
          className="w-11 h-12 text-center text-lg font-bold rounded-xl border-2 focus:outline-none transition-colors"
          style={{
            borderColor: value[i] ? '#3c250f' : '#E5E7EB',
            background: value[i] ? '#FDF6EE' : 'white',
            color: '#3c250f',
          }}
          inputMode="numeric"
        />
      ))}
    </div>
  );
}

// ─── Sección: Seguridad ───────────────────────────────────────────────────────
function SeguridadSection() {
  const { data: me } = useQuery({
    queryKey: ['me-completo'],
    queryFn: () => api.get('/auth/me/completo').then(r => r.data),
  });

  type PwdStep = 'idle' | 'enviando' | 'codigo' | 'nueva' | 'ok';
  const [step, setStep] = useState<PwdStep>('idle');
  const [codigo, setCodigo] = useState('');
  const [nuevaPass, setNuevaPass] = useState('');
  const [confirmarPass, setConfirmarPass] = useState('');
  const [mostrarPass, setMostrarPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const solicitarCodigo = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/auth/solicitar-codigo', { tipo: 'cambio_password', canal: 'email' });
      setStep('codigo');
    } catch (e: unknown) { setError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Error al enviar código'); }
    finally { setLoading(false); }
  };

  const validarCodigo = async () => {
    if (codigo.length !== 6) { setError('Ingresá los 6 dígitos del código'); return; }
    setStep('nueva'); setError('');
  };

  const cambiarPassword = async () => {
    if (nuevaPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    if (nuevaPass !== confirmarPass) { setError('Las contraseñas no coinciden'); return; }
    setLoading(true); setError('');
    try {
      await api.put('/auth/password-con-codigo', { codigo, nuevaPassword: nuevaPass });
      setStep('ok');
    } catch (e: unknown) { setError((e as {response?: {data?: {error?: string}}}).response?.data?.error || 'Código inválido o expirado'); }
    finally { setLoading(false); }
  };

  const reset = () => { setStep('idle'); setCodigo(''); setNuevaPass(''); setConfirmarPass(''); setError(''); };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
          <Lock className="w-4.5 h-4.5 text-red-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-800">Cambio de contraseña</h3>
          <p className="text-xs text-stone-400">Te enviaremos un código a tu email para verificar la operación</p>
        </div>
      </div>

      {step === 'idle' && (
        <div>
          <p className="text-sm text-stone-600 mb-4">
            Para cambiar tu contraseña, el sistema enviará un código de verificación a{' '}
            <strong>{me?.email ? maskEmail(me.email) : '—'}</strong>.
          </p>
          <button onClick={solicitarCodigo} disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ background: '#3c250f' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Enviar código de verificación
          </button>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      )}

      {step === 'codigo' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 font-medium">📧 Código enviado</p>
            <p className="text-xs text-amber-700 mt-1">
              Revisá tu bandeja de entrada en <strong>{me?.email ? maskEmail(me.email) : '—'}</strong>.
              El código expira en 15 minutos.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Código de 6 dígitos</label>
            <CodigoInput value={codigo} onChange={setCodigo} />
          </div>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={validarCodigo} disabled={codigo.length !== 6}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: '#3c250f' }}>
              <CheckCircle className="w-3.5 h-3.5" />
              Continuar
            </button>
            <button onClick={() => setStep('enviando')} className="text-xs text-stone-400 hover:text-stone-600 px-3">Cancelar</button>
          </div>
          <button onClick={solicitarCodigo} className="text-xs underline" style={{ color: '#6B3A2A' }}>
            Reenviar código
          </button>
        </div>
      )}

      {step === 'nueva' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <p className="text-xs text-green-700 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Código verificado correctamente
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Nueva contraseña</label>
            <div className="relative">
              <input
                type={mostrarPass ? 'text' : 'password'}
                value={nuevaPass}
                onChange={e => setNuevaPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400 pr-10"
                style={{ background: '#FAFAF9' }}
              />
              <button type="button" onClick={() => setMostrarPass(!mostrarPass)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                {mostrarPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Confirmar contraseña</label>
            <input
              type={mostrarPass ? 'text' : 'password'}
              value={confirmarPass}
              onChange={e => setConfirmarPass(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:border-amber-400"
              style={{ background: '#FAFAF9' }}
            />
          </div>
          {/* Indicador de coincidencia */}
          {confirmarPass && (
            <p className={`text-xs font-medium flex items-center gap-1 ${nuevaPass === confirmarPass ? 'text-green-600' : 'text-red-500'}`}>
              {nuevaPass === confirmarPass ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {nuevaPass === confirmarPass ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
            </p>
          )}
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <div className="flex gap-2">
            <button onClick={cambiarPassword} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
              style={{ background: '#3c250f' }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Guardar contraseña
            </button>
            <button onClick={reset} className="text-xs text-stone-400 hover:text-stone-600 px-3">Cancelar</button>
          </div>
        </div>
      )}

      {step === 'ok' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <p className="text-sm font-bold">Contraseña actualizada correctamente</p>
            </div>
            <p className="text-xs text-green-600 mt-1">Tu nueva contraseña está activa. El código utilizado ya no es válido.</p>
          </div>
          <button onClick={reset} className="text-xs text-stone-400 hover:text-stone-600">Cerrar</button>
        </div>
      )}
    </div>
  );
}

// ─── Sección: Firma Digital ────────────────────────────────────────────────────
function FirmaSection() {
  const queryClient = useQueryClient();
  const { setUsuario } = useAuthStore();
  const { data: me } = useQuery({
    queryKey: ['me-completo'],
    queryFn: () => api.get('/auth/me/completo').then(r => r.data),
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dibujando, setDibujando] = useState(false);
  const [tieneTrazos, setTieneTrazos] = useState(false);
  const [modo, setModo] = useState<'canvas' | 'upload'>('canvas');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e1206';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => { if (modo === 'canvas') initCanvas(); }, [modo, initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDibujando(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!dibujando) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setTieneTrazos(true);
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setDibujando(false);
  };

  const limpiarCanvas = () => {
    initCanvas();
    setTieneTrazos(false);
  };

  const guardarFirmaMutation = useMutation({
    mutationFn: (firma: string) => api.put('/auth/firma', { firma }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me-completo'] });
      setUsuario(data);
      setSuccess('Firma guardada correctamente');
      setPreviewUrl(null);
      setTimeout(() => setSuccess(''), 4000);
    },
  });

  const handleGuardar = () => {
    if (modo === 'canvas') {
      const canvas = canvasRef.current;
      if (!canvas || !tieneTrazos) return;
      guardarFirmaMutation.mutate(canvas.toDataURL('image/png'));
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => guardarFirmaMutation.mutate(reader.result as string);
    reader.readAsDataURL(file);
  };

  const eliminarFirma = useMutation({
    mutationFn: () => api.put('/auth/firma', { firma: '' }).then(r => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['me-completo'] });
      setUsuario(data);
      setSuccess('Firma eliminada');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Firma actual */}
      {me?.firma && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-stone-800">Firma registrada</h3>
              <p className="text-xs text-stone-400 mt-0.5">Se incluirá automáticamente en los remitos generados</p>
            </div>
            <button onClick={() => eliminarFirma.mutate()}
              disabled={eliminarFirma.isPending}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
          </div>
          <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 bg-stone-50 flex items-center justify-center" style={{ minHeight: 100 }}>
            <img src={me.firma} alt="Firma" className="max-h-24 max-w-full object-contain" />
          </div>
          {success && (
            <div className="mt-3 flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <p className="text-sm font-semibold">{success}</p>
            </div>
          )}
        </div>
      )}

      {/* Nueva firma */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-stone-800">{me?.firma ? 'Reemplazar firma' : 'Registrar firma'}</h3>
            <p className="text-xs text-stone-400 mt-0.5">Dibujá tu firma o subí una imagen escaneada</p>
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: '#F5F0EC' }}>
            <button onClick={() => setModo('canvas')}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={modo === 'canvas' ? { background: '#3c250f', color: 'white' } : { color: '#6B7280' }}>
              <PenTool className="w-3.5 h-3.5 inline mr-1" />
              Dibujar
            </button>
            <button onClick={() => setModo('upload')}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={modo === 'upload' ? { background: '#3c250f', color: 'white' } : { color: '#6B7280' }}>
              <Upload className="w-3.5 h-3.5 inline mr-1" />
              Subir
            </button>
          </div>
        </div>

        {modo === 'canvas' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden border-2 border-stone-200 cursor-crosshair"
              style={{ background: 'white', touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full"
                style={{ display: 'block' }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
              />
              {!tieneTrazos && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-stone-300 text-sm select-none">Dibujá tu firma aquí</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleGuardar}
                disabled={!tieneTrazos || guardarFirmaMutation.isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: '#3c250f' }}>
                {guardarFirmaMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Guardar firma
              </button>
              <button
                onClick={() => {
                  const url = canvasRef.current?.toDataURL('image/png') ?? null;
                  setPreviewUrl(prev => prev ? null : url);
                }}
                disabled={!tieneTrazos}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-stone-600 border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-40">
                <Eye className="w-3.5 h-3.5" />
                Vista previa
              </button>
              <button onClick={limpiarCanvas} disabled={!tieneTrazos}
                className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40 ml-auto">
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </div>
            {!success && guardarFirmaMutation.isSuccess && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm font-semibold">Firma guardada correctamente</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm font-semibold">{success}</p>
              </div>
            )}
          </div>
        )}

        {modo === 'upload' && (
          <div className="space-y-3">
            <div
              onClick={() => uploadRef.current?.click()}
              className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
            >
              <Upload className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-stone-500">Hacé clic para subir tu firma</p>
              <p className="text-xs text-stone-400 mt-1">PNG, JPG — fondo blanco recomendado</p>
            </div>
            <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            {guardarFirmaMutation.isPending && (
              <div className="flex items-center gap-2 text-stone-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <p className="text-sm">Guardando firma...</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <p className="text-sm font-semibold">{success}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vista previa en remito */}
      {previewUrl && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100">
          <h3 className="text-sm font-bold text-stone-800 mb-4">Vista previa — cómo aparece en el remito</h3>
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            {/* Simulación de bloque de remito */}
            <div className="p-4 border-b border-stone-100" style={{ background: '#FAFAF9' }}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Wood Pallet · Remito #0001</p>
            </div>
            <div className="p-4 bg-white">
              <p className="text-xs text-stone-400 uppercase tracking-wider font-semibold mb-3">Firma del propietario</p>
              <div className="flex items-end gap-6">
                <div>
                  <img src={previewUrl} alt="firma preview" className="h-16 max-w-40 object-contain" />
                  <div className="mt-1 border-t border-stone-300 pt-1 w-40">
                    <p className="text-xs text-stone-500">{me?.nombre} {me?.apellido}</p>
                    <p className="text-xs text-stone-400">Propietario</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setPreviewUrl(null)} className="mt-3 text-xs text-stone-400 hover:text-stone-600">Cerrar vista previa</button>
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────────
export default function MiCuentaPage() {
  const [tab, setTab] = useState<Tab>('info');

  const tabs: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'info',      label: 'Información personal', icon: User,    desc: 'Nombre, foto, email y teléfono' },
    { id: 'seguridad', label: 'Seguridad',             icon: Shield,  desc: 'Cambio de contraseña' },
    { id: 'firma',     label: 'Firma digital',         icon: PenTool, desc: 'Registrá tu firma para remitos' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Mi Cuenta</h1>
        <p className="text-stone-500 text-sm mt-1">Gestioná tu perfil, seguridad y firma digital</p>
      </div>

      <div className="flex gap-8 items-start">
        {/* Sidebar de tabs */}
        <aside className="w-56 shrink-0 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                tab === t.id ? 'shadow-sm' : 'hover:bg-stone-50'
              }`}
              style={tab === t.id ? { background: '#3c250f', color: 'white' } : { color: '#6B7280' }}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              <div>
                <p className={`text-sm font-semibold leading-tight ${tab === t.id ? 'text-white' : 'text-stone-700'}`}>{t.label}</p>
                <p className={`text-xs leading-tight mt-0.5 ${tab === t.id ? 'text-white/60' : 'text-stone-400'}`}>{t.desc}</p>
              </div>
            </button>
          ))}
        </aside>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {tab === 'info'      && <InfoPersonalSection />}
          {tab === 'seguridad' && <SeguridadSection />}
          {tab === 'firma'     && <FirmaSection />}
        </div>
      </div>
    </div>
  );
}
