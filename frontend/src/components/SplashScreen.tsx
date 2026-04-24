import { useEffect, useRef, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

const DURATION = 2000 // ms

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number>(0)
  const startRef = useRef<number>(0)

  useEffect(() => {
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        setTimeout(onFinish, 120)
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onFinish])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#d0ccc6',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '1.5rem',
    }}>
      {/* Logo + Nombre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
        <img
          src="/palletlogo.png"
          alt="WoodPallet"
          style={{ width: 56, height: 56, objectFit: 'contain' }}
        />
        <span
          id="splash-title"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            background: 'linear-gradient(135deg, #6B3A2A 0%, #C4895A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          WoodPallet
        </span>
      </div>

      {/* Barra de avance */}
      <ProgressBar progress={progress} />
    </div>
  )
}

function ProgressBar({ progress }: { progress: number }) {
  // Misma anchura que el título (medida via ref del contenedor padre)
  // Usamos un ancho fijo equivalente visual al texto: lo medimos con un span oculto
  const [barWidth, setBarWidth] = useState(0)
  const titleRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Medir el span oculto que replica el título
    if (titleRef.current) {
      setBarWidth(titleRef.current.offsetWidth + 80)
    }
  }, [])

  const pct = Math.round(progress)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      {/* Span oculto para medir el ancho del título */}
      <span
        ref={titleRef}
        aria-hidden
        style={{
          position: 'absolute', visibility: 'hidden', pointerEvents: 'none',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          whiteSpace: 'nowrap',
        }}
      >
        WoodPallet
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Track */}
        <div style={{
          width: barWidth > 0 ? barWidth : 340,
          height: 6,
          background: '#fff',
          borderRadius: 99,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}>
          {/* Fill */}
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6B3A2A 0%, #C4895A 100%)',
            borderRadius: 99,
            transition: 'width 0.05s linear',
          }} />
        </div>

        {/* Porcentaje */}
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#6B3A2A',
          width: '2.5rem',
          textAlign: 'left',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'Inter, sans-serif',
        }}>
          {pct}%
        </span>
      </div>
    </div>
  )
}
