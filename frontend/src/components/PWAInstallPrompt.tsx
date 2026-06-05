import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

// Tipo del evento beforeinstallprompt (no está en el DOM standard TS)
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

const DISMISSED_KEY = 'pwa-install-dismissed-at'
const DISMISS_COOLDOWN_MS = 1000 * 60 * 60 * 24 * 7 // 7 días

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => {
    // Ya instalada → no mostrar
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Cooldown de dismiss
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_COOLDOWN_MS) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
      // Pequeño delay para la animación de entrada
      setTimeout(() => setAnimateIn(true), 50)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      dismiss()
    }
  }

  const dismiss = () => {
    setAnimateIn(false)
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setTimeout(() => setVisible(false), 350)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))',
        left: '50%',
        transform: `translateX(-50%) translateY(${animateIn ? '0' : '100%'})`,
        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 9998,
        width: 'min(420px, calc(100vw - 2rem))',
        background: '#fff',
        borderRadius: '0.875rem',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
        border: '1px solid rgba(124,75,44,0.15)',
        padding: '1rem 1rem 1rem 1.125rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
      }}
      role="dialog"
      aria-label="Instalar WoodPallet Manager"
    >
      {/* Logo */}
      <img
        src="/logoWoodPallet.png"
        alt="WoodPallet"
        style={{ width: 44, height: 44, borderRadius: '0.5rem', flexShrink: 0, objectFit: 'contain', background: '#FDF5F0', padding: 4 }}
      />

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#111827', fontFamily: 'Inter, sans-serif' }}>
          Instalar WoodPallet
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6B7280', fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
          Agregá la app a tu pantalla de inicio para acceso rápido
        </p>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: '0.45rem 0.875rem',
            background: '#7c4b2c',
            color: '#fff',
            border: 'none',
            borderRadius: '0.4rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'background 0.15s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#6b3e25')}
          onMouseLeave={e => (e.currentTarget.style.background = '#7c4b2c')}
        >
          <Download size={13} />
          Instalar
        </button>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30,
            background: 'transparent',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            color: '#9CA3AF',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9CA3AF' }}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
