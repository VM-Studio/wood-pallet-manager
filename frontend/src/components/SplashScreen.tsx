import { useEffect, useRef, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

const DURATION = 2600 // ms total de carga

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      // Easing: arranca rápido, frena al final
      const linear = Math.min(elapsed / DURATION, 1)
      const eased = linear < 0.8 ? linear * 1.1 : 0.88 + (linear - 0.8) * 0.6
      const pct = Math.min(eased * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setFadeOut(true)
        setTimeout(onFinish, 550)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onFinish])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.55s ease',
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      {/* ── Imagen portada full-cover ── */}
      <img
        src="/portada.png"
        alt="WoodPallet Manager"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* ── Gradiente inferior para que la barra sea legible ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(to bottom, transparent 0%, rgba(20,10,5,0.55) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Barra de progreso y label ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(300px, 75vw)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem',
        }}
      >
        {/* Track */}
        <div
          style={{
            width: '100%',
            height: 3,
            background: 'rgba(255,255,255,0.25)',
            borderRadius: 99,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: '#ffffff',
              borderRadius: 99,
              transition: 'width 0.08s linear',
              boxShadow: '0 0 8px rgba(255,255,255,0.6)',
            }}
          />
        </div>

        {/* Texto */}
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 500,
            color: 'rgba(255,255,255,0.65)',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {Math.round(progress) < 100 ? 'Cargando…' : 'Listo'}
        </span>
      </div>
    </div>
  )
}
