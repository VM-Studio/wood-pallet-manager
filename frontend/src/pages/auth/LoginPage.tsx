import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package2, Leaf } from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import api from '../../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [tab, setTab] = useState<'login' | 'registro'>('login')

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [regData, setRegData] = useState({ nombre: '', email: '', password: '', password2: '' })
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await api.post('/auth/login', loginData)
      login(res.data.token, res.data.user)
      navigate('/dashboard')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setLoginError(msg ?? 'Credenciales incorrectas')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegError('')
    if (regData.password !== regData.password2) { setRegError('Las contraseñas no coinciden'); return }
    if (regData.password.length < 8) { setRegError('La contraseña debe tener al menos 8 caracteres'); return }
    setRegLoading(true)
    try {
      await api.post('/auth/registro', { nombre: regData.nombre, email: regData.email, password: regData.password })
      setRegSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setRegError(msg ?? 'Error al crear la cuenta')
    } finally {
      setRegLoading(false)
    }
  }

  const switchTab = (t: 'login' | 'registro') => {
    setTab(t); setLoginError(''); setRegError(''); setRegSuccess(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1e3a5f] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-green-400 blur-3xl" />
          <div className="absolute bottom-[-20%] right-[-10%] w-80 h-80 rounded-full bg-teal-400 blur-3xl" />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
            <Package2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">WoodPallet</h1>
          <p className="text-white/60 text-lg mb-10">Sistema de Gestión Integral</p>
          <div className="space-y-4 text-left max-w-xs mx-auto">
            {['Gestión de clientes y ventas', 'Control de stock e inventario', 'Logística y facturación', 'Reportes y alertas en tiempo real'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-white/80 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F4F6FA]">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-xl flex items-center justify-center">
              <Package2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">WoodPallet</span>
          </div>

          <div className="card p-8">
            <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
              {(['login', 'registro'] as const).map(t => (
                <button key={t} onClick={() => switchTab(t)}
                  className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                <div>
                  <label className="label">Correo electrónico</label>
                  <input type="email" className="input" placeholder="tu@empresa.com"
                    value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} required autoFocus />
                </div>
                <div>
                  <label className="label">Contraseña</label>
                  <input type="password" className="input" placeholder="••••••••"
                    value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} required />
                </div>
                {loginError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{loginError}</div>}
                <button type="submit" className="btn-primary w-full btn-lg" disabled={loginLoading}>
                  {loginLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            )}

            {tab === 'registro' && (
              <div className="animate-fade-in">
                {regSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Leaf className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Cuenta creada!</h3>
                    <p className="text-gray-500 text-sm mb-6">Tu cuenta fue creada exitosamente.</p>
                    <button onClick={() => switchTab('login')} className="btn-primary">Iniciar sesión</button>
                  </div>
                ) : (
                  <form onSubmit={handleRegistro} className="space-y-4">
                    <div>
                      <label className="label">Nombre completo</label>
                      <input type="text" className="input" placeholder="Juan García"
                        value={regData.nombre} onChange={e => setRegData(p => ({ ...p, nombre: e.target.value }))} required autoFocus />
                    </div>
                    <div>
                      <label className="label">Correo electrónico</label>
                      <input type="email" className="input" placeholder="tu@empresa.com"
                        value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="label">Contraseña</label>
                      <input type="password" className="input" placeholder="Mínimo 8 caracteres"
                        value={regData.password} onChange={e => setRegData(p => ({ ...p, password: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="label">Confirmar contraseña</label>
                      <input type="password" className="input" placeholder="Repetí tu contraseña"
                        value={regData.password2} onChange={e => setRegData(p => ({ ...p, password2: e.target.value }))} required />
                    </div>
                    {regError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{regError}</div>}
                    <button type="submit" className="btn-primary w-full btn-lg" disabled={regLoading}>
                      {regLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">WoodPallet Manager © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}
