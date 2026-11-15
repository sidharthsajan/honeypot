import { useEffect, useRef, useState } from 'react'
import { describeAllFaces, distance, loadFaceModels } from '../lib/identityMatching'

const HOLD_MS = 1500 // keep a match briefly through single missed frames
const EMPTY = { matched: false, person: null, distance: null }

// Compares the most prominent live face to every registered person (~3x/sec).
export function useFaceRecognition({ videoRef, active, people, threshold }) {
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [out, setOut] = useState(EMPTY)
  const cfg = useRef({ people, threshold })
  cfg.current = { people, threshold }

  useEffect(() => {
    if (!active) { setState('idle'); return }
    let cancelled = false
    setState('loading')
    loadFaceModels().then(() => !cancelled && setState('ready')).catch(() => !cancelled && setState('error'))
    return () => { cancelled = true }
  }, [active])

  useEffect(() => {
    if (state !== 'ready') { setOut(EMPTY); return }
    let stop = false
    let timer
    let lastMatch = 0
    let lastPerson = null
    const tick = async () => {
      const video = videoRef.current
      const { people: list, threshold: th } = cfg.current
      let best = null // { person, dist }
      if (video && video.readyState >= 2 && list.length) {
        try {
          const faces = await describeAllFaces(video)
          if (faces.length) {
            const main = faces.reduce((a, b) => (b.area > a.area ? b : a))
            for (const person of list) {
              const dist = distance(main.descriptor, person.descriptor)
              if (!best || dist < best.dist) best = { person, dist }
            }
            if (best.dist <= th) { lastMatch = performance.now(); lastPerson = best.person }
          }
        } catch { /* skip frame */ }
      }
      if (stop) return
      const matched = best !== null && performance.now() - lastMatch < HOLD_MS
      setOut({ matched, person: matched ? lastPerson : null, distance: best ? best.dist : null })
      timer = setTimeout(tick, 350)
    }
    tick()
    return () => { stop = true; clearTimeout(timer) }
  }, [state, videoRef])

  return { recState: state, ...out }
}
