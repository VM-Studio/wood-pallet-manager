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
        background: '#d0ccc6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
      }}
    >
      {/* ── Logo ── */}
      <img
        src="/loading.png"
        alt="WoodPallet"
        style={{
          width: 220,
          height: 220,
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      {/* ── Barra de progreso ── */}
      <div
        style={{
          width: 'min(300px, 75vw)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {/* Track */}
        <div
          style={{
            width: '100%',
            height: 5,
            background: 'rgba(255,255,255,0.45)',
            borderRadius: 99,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Fill — usa scaleX (GPU composite, sin reflow de layout) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, #7c4b2c 0%, #C4895A 100%)',
              borderRadius: 99,
              transformOrigin: '0 0',
              transform: `scaleX(${progress / 100})`,
              willChange: 'transform',
            }}
          />
        </div>
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: '#6B3A2A',
            fontFamily: 'Inter, sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  )
}
