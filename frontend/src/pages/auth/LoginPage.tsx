import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../services/api'

// ── Estilos inline base para inputs del login ──────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.875rem',
  fontSize: '0.875rem',
  border: '1px solid #E5E7EB',
  borderRadius: '0.25rem',
  outline: 'none',
  background: '#FAFAFA',
  color: '#111827',
  transition: 'border-color 0.15s',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6B7280',
  marginBottom: '0.375rem',
  letterSpacing: '0.02em',
  textTransform: 'uppercase',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'login' | 'registro'>('login')

  const [loginData, setLoginData] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [regData, setRegData] = useState({ nombre: '', apellido: '', email: '', password: '', password2: '' })
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const res = await api.post('/auth/login', loginData)
      queryClient.clear()
      login(res.data.token, res.data.usuario)
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
      await api.post('/auth/register', { nombre: regData.nombre, apellido: regData.apellido, email: regData.email, password: regData.password })
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
    setRegData({ nombre: '', apellido: '', email: '', password: '', password2: '' })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#d0ccc6' }}>

      {/* ── Panel izquierdo (solo desktop) ── */}
      <div style={{
        display: 'none',
        width: '42%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#3c250f',
        padding: '3rem',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="lg:flex"
      >
        {/* Textura sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(196,137,90,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(107,58,42,0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '320px' }}>
          {/* Logo */}
          <img
            src="/palletlogo.png"
            alt="WoodPallet"
            style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 1.5rem' }}
          />

          {/* Nombre */}
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: '2.5rem',
            color: '#fff',
            margin: '0 0 0.375rem',
            letterSpacing: '-0.01em',
          }}>
            WoodPallet
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', margin: '0 0 3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Sistema de Gestión
          </p>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', textAlign: 'left' }}>
            {[
              'Clientes, cotizaciones y ventas',
              'Stock, compras y proveedores',
              'Logística y facturación',
              'Remitos con firma digital',
              'Reportes y alertas en tiempo real',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C4895A, #6B3A2A)',
                  flexShrink: 0,
                }} />
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Año */}
        <p style={{ position: 'absolute', bottom: '1.5rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          © {new Date().getFullYear()} WoodPallet
        </p>
      </div>

      {/* ── Panel derecho — formulario ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Card */}
          <div style={{
            background: '#fff',
            borderRadius: '0.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            padding: '2rem',
            border: '1px solid rgba(255,255,255,0.9)',
          }}>

            {/* Logo + nombre dentro de la card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
              <img src="/palletlogo.png" alt="WoodPallet" style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: '0.5rem' }} />
              <span style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: '1.75rem',
                color: '#3c250f',
                lineHeight: 1,
              }}>WoodPallet</span>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              background: '#F3F4F6',
              borderRadius: '0.25rem',
              padding: '3px',
              marginBottom: '1.75rem',
            }}>
              {(['login', 'registro'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: '0.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? '#3c250f' : '#9CA3AF',
                    boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            {/* ── LOGIN ── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input
                    type="email"
                    style={inputStyle}
                    placeholder="tu@empresa.com"
                    value={loginData.email}
                    onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                    required
                    autoFocus
                    onFocus={e => (e.target.style.borderColor = '#C4895A')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña</label>
                  <input
                    type="password"
                    style={inputStyle}
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                    required
                    onFocus={e => (e.target.style.borderColor = '#C4895A')}
                    onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                  />
                </div>

                {loginError && (
                  <div style={{
                    background: '#FEF2F2', border: '1px solid #FECACA',
                    color: '#B91C1C', fontSize: '0.8rem',
                    padding: '0.625rem 0.875rem', borderRadius: '0.25rem',
                  }}>
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="btn-brand"
                  style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, justifyContent: 'center' }}
                >
                  {loginLoading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            )}

            {/* ── REGISTRO ── */}
            {tab === 'registro' && (
              <div>
                {regSuccess ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '0.25rem',
                      background: 'linear-gradient(135deg, #6B3A2A, #C4895A)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 1.25rem',
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>✓</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                      ¡Cuenta creada!
                    </h3>
                    <p style={{ color: '#6B7280', fontSize: '0.8rem', margin: '0 0 1.5rem' }}>
                      Tu cuenta fue creada exitosamente.
                    </p>
                    <button onClick={() => switchTab('login')} className="btn-brand" style={{ justifyContent: 'center' }}>
                      Iniciar sesión
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleRegistro} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Nombre</label>
                        <input type="text" style={inputStyle} placeholder="Juan"
                          value={regData.nombre} onChange={e => setRegData(p => ({ ...p, nombre: e.target.value }))}
                          required autoFocus
                          onFocus={e => (e.target.style.borderColor = '#C4895A')}
                          onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                      </div>
                      <div>
                        <label style={labelStyle}>Apellido</label>
                        <input type="text" style={inputStyle} placeholder="García"
                          value={regData.apellido} onChange={e => setRegData(p => ({ ...p, apellido: e.target.value }))}
                          onFocus={e => (e.target.style.borderColor = '#C4895A')}
                          onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Correo electrónico</label>
                      <input type="email" style={inputStyle} placeholder="tu@empresa.com"
                        value={regData.email} onChange={e => setRegData(p => ({ ...p, email: e.target.value }))}
                        required
                        onFocus={e => (e.target.style.borderColor = '#C4895A')}
                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                    </div>
                    <div>
                      <label style={labelStyle}>Contraseña</label>
                      <input type="password" style={inputStyle} placeholder="Mínimo 8 caracteres"
                        value={regData.password} onChange={e => setRegData(p => ({ ...p, password: e.target.value }))}
                        required
                        onFocus={e => (e.target.style.borderColor = '#C4895A')}
                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                    </div>
                    <div>
                      <label style={labelStyle}>Confirmar contraseña</label>
                      <input type="password" style={inputStyle} placeholder="Repetí tu contraseña"
                        value={regData.password2} onChange={e => setRegData(p => ({ ...p, password2: e.target.value }))}
                        required
                        onFocus={e => (e.target.style.borderColor = '#C4895A')}
                        onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
                    </div>

                    {regError && (
                      <div style={{
                        background: '#FEF2F2', border: '1px solid #FECACA',
                        color: '#B91C1C', fontSize: '0.8rem',
                        padding: '0.625rem 0.875rem', borderRadius: '0.25rem',
                      }}>
                        {regError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="btn-brand"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, justifyContent: 'center', marginTop: '0.25rem' }}
                    >
                      {regLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(0,0,0,0.3)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
            WoodPallet Manager © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
