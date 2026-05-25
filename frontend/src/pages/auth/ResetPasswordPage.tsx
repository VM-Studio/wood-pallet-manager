import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import api from '../../services/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [nuevaPass, setNuevaPass] = useState('')
  const [confirmarPass, setConfirmarPass] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9F7F5', fontFamily: "'Inter',sans-serif" }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#374151', fontWeight: 600 }}>Enlace inválido</p>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '0.5rem' }}>El enlace de recuperación no es válido o ya fue utilizado.</p>
          <Link to="/login" style={{ display: 'inline-block', marginTop: '1rem', color: '#3c250f', fontWeight: 600, fontSize: '0.875rem' }}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nuevaPass.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (nuevaPass !== confirmarPass) { setError('Las contraseñas no coinciden'); return }
    setLoading(true); setError('')
    try {
      await api.post('/auth/reset-password', { token, nuevaPassword: nuevaPass })
      setOk(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error
      setError(msg || 'El enlace es inválido o ha expirado')
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 700, fontSize: '2rem', color: '#3c250f', margin: 0 }}>
            Wood Pallet
          </h1>
        </div>

        {!ok ? (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FDF6EE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Lock size={22} color="#92400E" />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937', margin: '0 0 0.375rem' }}>
                Crear nueva contraseña
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
                Ingresá tu nueva contraseña. Debe tener al menos 6 caracteres.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Nueva contraseña
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={mostrar ? 'text' : 'password'}
                    value={nuevaPass}
                    onChange={e => setNuevaPass(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                    style={{
                      width: '100%', padding: '0.625rem 2.5rem 0.625rem 0.875rem', fontSize: '0.875rem',
                      border: '1px solid #E5E7EB', borderRadius: '0.5rem', outline: 'none',
                      background: '#FAFAFA', color: '#111827', boxSizing: 'border-box',
                    }}
                  />
                  <button type="button" onClick={() => setMostrar(!mostrar)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                    {mostrar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Confirmar contraseña
                </label>
                <input
                  type={mostrar ? 'text' : 'password'}
                  value={confirmarPass}
                  onChange={e => setConfirmarPass(e.target.value)}
                  placeholder="Repetí la contraseña"
                  style={{
                    width: '100%', padding: '0.625rem 0.875rem', fontSize: '0.875rem',
                    border: confirmarPass && nuevaPass !== confirmarPass ? '1px solid #EF4444' : '1px solid #E5E7EB',
                    borderRadius: '0.5rem', outline: 'none',
                    background: '#FAFAFA', color: '#111827', boxSizing: 'border-box',
                  }}
                />
                {confirmarPass && (
                  <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: nuevaPass === confirmarPass ? '#16A34A' : '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {nuevaPass === confirmarPass ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                    {nuevaPass === confirmarPass ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                  </p>
                )}
              </div>

              {error && (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#DC2626', margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '0.75rem', fontSize: '0.875rem', fontWeight: 600,
                  background: loading ? '#9CA3AF' : '#3c250f', color: 'white',
                  border: 'none', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <CheckCircle size={28} color="#16A34A" />
            </div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1F2937', margin: '0 0 0.75rem' }}>
              Contraseña restablecida
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Tu contraseña fue actualizada correctamente. Ya podés iniciar sesión con la nueva contraseña.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '0.75rem 2rem', fontSize: '0.875rem', fontWeight: 600,
                background: '#3c250f', color: 'white',
                border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
              }}
            >
              Ir al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
