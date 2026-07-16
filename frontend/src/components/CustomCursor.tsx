import { useEffect, useRef, useState } from 'react'

const LERP = 0.18
const PARTICLE_COUNT = 3

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [hovering, setHovering] = useState(false)
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const particleRefs = useRef<(HTMLSpanElement | null)[]>([])
  const mouse = useRef({ x: 0, y: 0 })
  const ring = useRef({ x: 0, y: 0 })
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({ x: 0, y: 0 })),
  )
  const rafId = useRef<number>(0)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const updateEnabled = () => {
      const on = finePointer.matches && !reducedMotion.matches
      setEnabled(on)
      document.body.classList.toggle('custom-cursor-active', on)
    }

    updateEnabled()
    finePointer.addEventListener('change', updateEnabled)
    reducedMotion.addEventListener('change', updateEnabled)

    return () => {
      finePointer.removeEventListener('change', updateEnabled)
      reducedMotion.removeEventListener('change', updateEnabled)
      document.body.classList.remove('custom-cursor-active')
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY }
    }

    const onDown = () => setClicking(true)
    const onUp = () => setClicking(false)

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const interactive = target.closest(
        'button, a, [data-cursor="pointer"], input, textarea',
      )
      setHovering(!!interactive)
    }

    const tick = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * LERP
      ring.current.y += (mouse.current.y - ring.current.y) * LERP

      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x}px, ${mouse.current.y}px) translate(-50%, -50%)`
      }

      let prevX = mouse.current.x
      let prevY = mouse.current.y
      particles.current.forEach((p, i) => {
        const factor = 0.12 + i * 0.06
        p.x += (prevX - p.x) * factor
        p.y += (prevY - p.y) * factor
        prevX = p.x
        prevY = p.y
        const el = particleRefs.current[i]
        if (el) {
          el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`
          el.style.opacity = String(0.5 - i * 0.15)
        }
      })

      rafId.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup', onUp)
    document.addEventListener('mouseover', onOver)
    rafId.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup', onUp)
      document.removeEventListener('mouseover', onOver)
      cancelAnimationFrame(rafId.current)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      {particles.current.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            particleRefs.current[i] = el
          }}
          className="pointer-events-none fixed left-0 top-0 z-[9998] h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
          aria-hidden
        />
      ))}
      <div
        ref={ringRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-8 w-8 rounded-full border-2 border-[var(--accent)] transition-[width,height,border-color,opacity] duration-150"
        style={{
          width: clicking ? 24 : hovering ? 40 : 32,
          height: clicking ? 24 : hovering ? 40 : 32,
          borderColor: hovering ? 'var(--accent-hover)' : 'var(--accent)',
          opacity: clicking ? 0.6 : 0.9,
        }}
        aria-hidden
      />
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[10000] h-1.5 w-1.5 rounded-full bg-[var(--accent)]"
        aria-hidden
      />
    </>
  )
}
