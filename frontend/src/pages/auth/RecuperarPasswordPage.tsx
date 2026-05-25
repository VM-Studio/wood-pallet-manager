import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import api from '../../services/api'

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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #3c250f 0%, #6B3A2A 50%, #8B5030 100%)',
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
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem', fontWeight: 600, color: '#3c250f', textDecoration: 'none' }}>
                <ArrowLeft size={15} />
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
