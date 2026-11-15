import { useEffect, useRef, useState } from 'react'

const W = 300
const H = Math.round((W * 480) / 726)
const END = 14.25 // the TikTok end card starts at ~14.35s; loop before it

// Honeypot alert clip: loops like a GIF and bounces around like a DVD logo.
// Always mounted so a user click can "unlock" its audio before the alert fires.
export default function BouncingClip({ active }) {
  const boxRef = useRef(null)
  const videoRef = useRef(null)
  const [needsClick, setNeedsClick] = useState(false)

  // Unlock audio on the first click/key anywhere (browsers block sound before a gesture).
  useEffect(() => {
    const video = videoRef.current
    const unlock = () => {
      video.muted = false
      video.volume = 1
      video.play().then(() => { if (!activeRef.current) video.pause() }).catch(() => {})
      setNeedsClick(false)
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => { window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock) }
  }, [])

  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    const box = boxRef.current
    const video = videoRef.current
    if (!active) { video.pause(); return }

    video.muted = false
    video.volume = 1
    video.currentTime = 0
    video.play().then(() => setNeedsClick(false)).catch(() => {
      // Sound blocked: play silently and ask for a click to turn it on
      video.muted = true
      video.play().catch(() => {})
      setNeedsClick(true)
    })

    let x = Math.random() * (window.innerWidth - W)
    let y = Math.random() * (window.innerHeight - H)
    let vx = 3.2 * (Math.random() < 0.5 ? -1 : 1)
    let vy = 2.6 * (Math.random() < 0.5 ? -1 : 1)
    let hue = 0
    let raf
    const loop = () => {
      if (video.currentTime >= END) video.currentTime = 0
      const maxX = window.innerWidth - W, maxY = window.innerHeight - H
      x += vx; y += vy
      let hit = false
      if (x <= 0) { x = 0; vx = Math.abs(vx); hit = true }
      if (x >= maxX) { x = maxX; vx = -Math.abs(vx); hit = true }
      if (y <= 0) { y = 0; vy = Math.abs(vy); hit = true }
      if (y >= maxY) { y = maxY; vy = -Math.abs(vy); hit = true }
      if (hit) { hue = (hue + 70) % 360; box.style.filter = `hue-rotate(${hue}deg)` }
      box.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); video.pause() }
  }, [active])

  return (
    <>
      <div ref={boxRef} className="bounce-clip" style={{ width: W, height: H, display: active ? 'block' : 'none' }}>
        <video ref={videoRef} src={`${import.meta.env.BASE_URL}honeypot.mov`} playsInline preload="auto" />
      </div>
      {active && needsClick && <div className="sound-hint mono">🔊 CLICK ANYWHERE FOR SOUND</div>}
    </>
  )
}
