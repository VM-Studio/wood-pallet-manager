import { useState } from 'react';
import { useAuthStore } from '../../store/auth.store';
import {
  User, Shield, Bell, Database, Key,
  Save, Eye, EyeOff, CheckCircle, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { clsx } from 'clsx';

type TabConfig = 'perfil' | 'seguridad' | 'sistema';

export default function ConfiguracionPage() {
  const { usuario } = useAuthStore();
  const [tab, setTab] = useState<TabConfig>('perfil');
  const esCarlos = usuario?.rol === 'propietario_carlos';

  // Estado perfil
  const [perfil, setPerfil] = useState({
    nombre:   usuario?.nombre   || '',
    apellido: usuario?.apellido || '',
    telefono: usuario?.telefono || ''
  });
  const [savingPerfil, setSavingPerfil] = useState(false);
  const [perfilSuccess, setPerfilSuccess] = useState('');
  const [perfilError, setPerfilError]     = useState('');

  // Estado contraseña
  const [pass, setPass] = useState({
    passwordActual: '',
    passwordNuevo:  '',
    confirmar:      ''
  });
  const [showPass, setShowPass] = useState({
    actual: false, nuevo: false, confirmar: false
  });
  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState('');
  const [passError, setPassError]     = useState('');

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPerfil(true);
    setPerfilError('');
    setPerfilSuccess('');
    try {
      await api.put('/auth/perfil', perfil);
      setPerfilSuccess('Perfil actualizado correctamente');
      setTimeout(() => setPerfilSuccess(''), 3000);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setPerfilError(e.response?.data?.error || 'Error al guardar el perfil');
    } finally {
      setSavingPerfil(false);
    }
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (pass.passwordNuevo !== pass.confirmar) {
      setPassError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (pass.passwordNuevo.length < 6) {
      setPassError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSavingPass(true);
    try {
      await api.put('/auth/password', {
        passwordActual: pass.passwordActual,
        passwordNuevo:  pass.passwordNuevo
      });
      setPassSuccess('Contraseña actualizada correctamente');
      setPass({ passwordActual: '', passwordNuevo: '', confirmar: '' });
      setTimeout(() => setPassSuccess(''), 3000);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setPassError(e.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div>
        <h1 className="page-title">Configuración</h1>
        <p className="page-subtitle">Ajustes de tu cuenta y del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
        {([
          { key: 'perfil',    label: 'Mi perfil',  icon: User },
          { key: 'seguridad', label: 'Seguridad',  icon: Shield },
          { key: 'sistema',   label: 'Sistema',    icon: Database },
        ] as { key: TabConfig; label: string; icon: React.ElementType }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all',
              tab === t.key
                ? 'bg-[#16A34A] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PERFIL ── */}
      {tab === 'perfil' && (
        <div className="card-p">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className={clsx(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0',
              esCarlos ? 'bg-teal-600' : 'bg-[#16A34A]'
            )}>
              {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {usuario?.nombre} {usuario?.apellido}
              </p>
              <p className="text-sm text-gray-500">{usuario?.email}</p>
              <span className={clsx(
                'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg mt-1',
                esCarlos
                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                  : 'bg-green-50 text-green-700 border border-green-200'
              )}>
                {esCarlos
                  ? '🏭 Propietario — Logística y Todo Pallets'
                  : '💻 Propietario Digital — Web y WhatsApp'}
              </span>
            </div>
          </div>

          <form onSubmit={handleGuardarPerfil} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre</label>
                <input type="text" value={perfil.nombre}
                  onChange={e => setPerfil({ ...perfil, nombre: e.target.value })}
                  className="input" required />
              </div>
              <div>
                <label className="label">Apellido</label>
                <input type="text" value={perfil.apellido}
                  onChange={e => setPerfil({ ...perfil, apellido: e.target.value })}
                  className="input" required />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={usuario?.email || ''} className="input bg-gray-50" disabled />
              <p className="text-xs text-gray-400 mt-1">El email no se puede modificar</p>
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input type="text" value={perfil.telefono}
                onChange={e => setPerfil({ ...perfil, telefono: e.target.value })}
                className="input" placeholder="11 1234 5678" />
            </div>

            {perfilSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                <CheckCircle size={16} /> {perfilSuccess}
              </div>
            )}
            {perfilError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle size={16} /> {perfilError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={savingPerfil} className="btn-primary">
                <Save size={16} />
                {savingPerfil ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB: SEGURIDAD ── */}
      {tab === 'seguridad' && (
        <div className="space-y-4">
          <div className="card-p">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Key size={16} className="text-[#16A34A]" />
              Cambiar contraseña
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Usá una contraseña de al menos 6 caracteres.
            </p>

            <form onSubmit={handleCambiarPassword} className="space-y-4">
              {([
                { key: 'passwordActual', label: 'Contraseña actual',    visKey: 'actual' },
                { key: 'passwordNuevo',  label: 'Contraseña nueva',     visKey: 'nuevo' },
                { key: 'confirmar',      label: 'Confirmar contraseña', visKey: 'confirmar' },
              ] as { key: keyof typeof pass; label: string; visKey: keyof typeof showPass }[]).map(f => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <div className="relative">
                    <input
                      type={showPass[f.visKey] ? 'text' : 'password'}
                      value={pass[f.key]}
                      onChange={e => setPass({ ...pass, [f.key]: e.target.value })}
                      className="input pr-11"
                      required
                    />
                    <button type="button"
                      onClick={() => setShowPass({ ...showPass, [f.visKey]: !showPass[f.visKey] })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass[f.visKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}

              {passSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <CheckCircle size={16} /> {passSuccess}
                </div>
              )}
              {passError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={16} /> {passError}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" disabled={savingPass} className="btn-primary">
                  <Key size={16} />
                  {savingPass ? 'Actualizando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>

          {/* Info de seguridad */}
          <div className="card-p border border-dashed border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Shield size={15} className="text-gray-400" />
              Información de seguridad
            </h3>
            <div className="space-y-2 text-xs text-gray-500">
              <p>🔐 Las contraseñas se almacenan con hash bcrypt de 10 rondas.</p>
              <p>🎫 Las sesiones usan JWT con expiración de 7 días.</p>
              <p>🚫 Si tu sesión expira se te redirige automáticamente al login.</p>
              <p>👥 Cada propietario tiene acceso exclusivo a sus propias operaciones.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: SISTEMA ── */}
      {tab === 'sistema' && (
        <div className="space-y-4">

          {/* Info del sistema */}
          <div className="card-p">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Database size={15} className="text-[#16A34A]" />
              Información del sistema
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Versión',           valor: 'WoodPallet Manager v1.0' },
                { label: 'Base de datos',     valor: 'PostgreSQL 16 — 21 tablas' },
                { label: 'Backend',           valor: 'Node.js + Express + Prisma' },
                { label: 'Frontend',          valor: 'React 18 + TypeScript + Tailwind CSS' },
                { label: 'Empresa',           valor: 'Wood Pallet SRL — CUIT 30-71886510-3' },
                { label: 'Módulos activos',   valor: '11 módulos + Dashboard' },
              ].map((item, i) => (
                <div key={i}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
                  <span className="text-sm text-gray-500">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.valor}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tareas automáticas */}
          <div className="card-p">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Bell size={15} className="text-[#16A34A]" />
              Tareas automáticas programadas
            </h3>
            <div className="space-y-3">
              {[
                {
                  hora:   '8:00 AM',
                  tarea:  'Marcar facturas vencidas',
                  desc:   'Facturas pendientes con más de 3 días de vencimiento',
                  estado: 'activa'
                },
                {
                  hora:   '8:05 AM',
                  tarea:  'Marcar cotizaciones vencidas',
                  desc:   'Cotizaciones enviadas cuya fecha de validez expiró',
                  estado: 'activa'
                },
              ].map((t, i) => (
                <div key={i}
                  className="flex items-start gap-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-16 text-center shrink-0">
                    <p className="text-xs font-bold text-[#16A34A]">{t.hora}</p>
                    <p className="text-xs text-gray-400">diario</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{t.tarea}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                  <span className="badge-green text-xs shrink-0">
                    ✓ {t.estado}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reglas de negocio */}
          <div className="card-p">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">
              Reglas de negocio configuradas
            </h3>
            <div className="space-y-2">
              {[
                { regla: 'Solo Carlos puede comprar a Todo Pallets',                                        tipo: 'Acceso' },
                { regla: 'Solo Carlos puede crear y gestionar la logística',                                tipo: 'Acceso' },
                { regla: 'Al marcar compra como recibida, el stock se actualiza automáticamente',           tipo: 'Automatización' },
                { regla: 'Al registrar un retiro parcial, el stock se descuenta automáticamente',           tipo: 'Automatización' },
                { regla: 'Al convertir cotización a venta, los datos se traspasan automáticamente',        tipo: 'Automatización' },
                { regla: 'Alertas de stock cuando la cantidad cae por debajo del mínimo configurado',      tipo: 'Alerta' },
              ].map((r, i) => (
                <div key={i}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 gap-3">
                  <p className="text-sm text-gray-700 flex-1">{r.regla}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={clsx(
                      'text-xs font-medium px-2 py-0.5 rounded-lg',
                      r.tipo === 'Acceso'        ? 'bg-blue-50 text-blue-700'
                        : r.tipo === 'Automatización' ? 'bg-purple-50 text-purple-700'
                        : 'bg-amber-50 text-amber-700'
                    )}>
                      {r.tipo}
                    </span>
                    <span className="badge-green text-xs">✓</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
