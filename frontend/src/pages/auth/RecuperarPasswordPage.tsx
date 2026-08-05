import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import api from '../../services/api'

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

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) { setError('Ingresá un email válido'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/recuperar-password', { email })
      setEnviado(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#d0ccc6' }}>

      {/* ── Panel izquierdo (solo desktop) ── */}
      <div
        style={{
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
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(196,137,90,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(107,58,42,0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '320px' }}>
          <img
            src="/sistemalogo.png"
            alt="WoodPallet"
            style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 1.5rem' }}
          />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', textAlign: 'left' }}>
            {[
              'Clientes, cotizaciones y ventas',
              'Stock, compras y proveedores',
              'Logística y facturación',
              'Remitos con firma digital',
              'Reportes y alertas en tiempo real',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c4b2c', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>

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

            {/* Logo + nombre */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
              <img src="/sistemalogo.png" alt="WoodPallet" style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: '0.5rem' }} />
              <span style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 600,
                fontSize: '1.75rem',
                color: '#3c250f',
                lineHeight: 1,
              }}>WoodPallet</span>
            </div>

            {!enviado ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.375rem' }}>
                    Recuperar contraseña
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                    Ingresá tu email y te enviamos un link para crear una nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div>
                    <label style={labelStyle}>Email registrado</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      autoFocus
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C4895A')}
                      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                  </div>

                  {error && (
                    <div style={{
                      background: '#FEF2F2', border: '1px solid #FECACA',
                      color: '#B91C1C', fontSize: '0.8rem',
                      padding: '0.625rem 0.875rem', borderRadius: '0.25rem',
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand"
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                    {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                  <Link
                    to="/login"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#6B7280', textDecoration: 'none' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#3c250f')}
                    onMouseOut={e => (e.currentTarget.style.color = '#6B7280')}
                  >
                    <ArrowLeft size={13} />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '0.25rem',
                  background: '#F0FDF4',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <CheckCircle size={26} color="#16A34A" />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>
                  Revisá tu bandeja de entrada
                </h3>
                <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
                  Si el email <strong style={{ color: '#374151' }}>{email}</strong> está registrado, vas a recibir un link de recuperación.
                </p>
                <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                  El link expira en 30 minutos. Si no lo ves, revisá spam.
                </p>
                <Link
                  to="/login"
                  className="btn-brand"
                  style={{ display: 'inline-flex', justifyContent: 'center', gap: '0.4rem', padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  <ArrowLeft size={15} />
                  Volver al login
                </Link>
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

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) { setError('Ingresá un email válido'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/recuperar-password', { email })
      setEnviado(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#d0ccc6' }}>

      {/* ── Panel izquierdo (solo desktop) ── */}
      <div
        style={{
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
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 50%, rgba(196,137,90,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(107,58,42,0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '320px' }}>
          <img src="/sistemalogo.png" alt="WoodPallet" style={{ width: 72, height: 72, objectFit: 'contain', margin: '0 auto 1.5rem' }} />
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 600, fontSize: '2.5rem', color: '#fff', margin: '0 0 0.375rem', letterSpacing: '-0.01em' }}>
            WoodPallet
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', margin: '0 0 3rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Sistema de Gestión
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', textAlign: 'left' }}>
            {['Clientes, cotizaciones y ventas', 'Stock, compras y proveedores', 'Logística y facturación', 'Remitos con firma digital', 'Reportes y alertas en tiempo real'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7c4b2c', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ position: 'absolute', bottom: '1.5rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem', letterSpacing: '0.08em' }}>
          © {new Date().getFullYear()} WoodPallet
        </p>
      </div>

      {/* ── Panel derecho ── */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Card */}
          <div style={{ background: '#fff', borderRadius: '0.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', padding: '2rem', border: '1px solid rgba(255,255,255,0.9)' }}>

            {/* Logo + nombre */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
              <img src="/sistemalogo.png" alt="WoodPallet" style={{ width: 52, height: 52, objectFit: 'contain', marginBottom: '0.5rem' }} />
              <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 600, fontSize: '1.75rem', color: '#3c250f', lineHeight: 1 }}>WoodPallet</span>
            </div>

            {!enviado ? (
              <>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.375rem' }}>Recuperar contraseña</h2>
                  <p style={{ fontSize: '0.8rem', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>
                    Ingresá tu email y te enviamos un link para crear una nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <div>
                    <label style={labelStyle}>Email registrado</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      autoFocus
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = '#C4895A')}
                      onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
                    />
                  </div>

                  {error && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.8rem', padding: '0.625rem 0.875rem', borderRadius: '0.25rem' }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-brand"
                    style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600, justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {loading && <Loader2 size={15} className="animate-spin" />}
                    {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
                  <Link
                    to="/login"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: '#6B7280', textDecoration: 'none' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#3c250f')}
                    onMouseOut={e => (e.currentTarget.style.color = '#6B7280')}
                  >
                    <ArrowLeft size={13} />
                    Volver al inicio de sesión
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '0.25rem', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                  <CheckCircle size={26} color="#16A34A" />
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Revisá tu bandeja de entrada</h3>
                <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
                  Si el email <strong style={{ color: '#374151' }}>{email}</strong> está registrado, vas a recibir el link.
                </p>
                <p style={{ color: '#9CA3AF', fontSize: '0.78rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                  Expira en 30 minutos. Si no lo ves, revisá spam.
                </p>
                <Link
                  to="/login"
                  className="btn-brand"
                  style={{ display: 'inline-flex', justifyContent: 'center', gap: '0.4rem', padding: '0.625rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  <ArrowLeft size={15} />
                  Volver al login
                </Link>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(0,0,0,0.3)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
            WoodPallet Manager © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}

      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: '1.5rem',
    }}>
      <div style={{
        background: 'white', borderRadius: '1.25rem', padding: '2.5rem',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 700, fontSize: '2rem', color: '#3c250f', margin: 0 }}>
            Wood Pallet
          </h1>
        </div>

        {!enviado ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Mail size={22} color="#92400E" />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937', margin: '0 0 0.375rem' }}>
                Recuperar contraseña
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
                Ingresá tu email y te enviamos un link para crear una nueva contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Email registrado
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoFocus
                  style={{
                    width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.875rem',
                    border: '1px solid #E5E7EB', borderRadius: '0.5rem', outline: 'none',
                    background: '#FAFAFA', color: '#111827', boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontSize: '0.8rem', color: '#EF4444', marginBottom: '0.75rem' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600,
                  background: loading ? '#9CA3AF' : '#3c250f', color: 'white',
                  border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  marginBottom: '1rem',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                {loading ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>

            <Link to="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', fontSize: '0.8rem', color: '#6B7280', textDecoration: 'none' }}>
              <ArrowLeft size={14} />
              Volver al inicio de sesión
            </Link>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle size={28} color="#16A34A" />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937', margin: '0 0 0.75rem' }}>
                Revisá tu bandeja de entrada
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0 0 0.5rem', lineHeight: 1.5 }}>
                Si el email <strong>{email}</strong> está registrado, vas a recibir un link de recuperación.
              </p>
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '0 0 1.5rem', lineHeight: 1.4 }}>
                El link expira en 30 minutos y es de un solo uso. Si no lo ves, revisá la carpeta de spam.
              </p>
