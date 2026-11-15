import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { computeMog, scoreFrom, WEIGHTS } from '../lib/mogScore'

const BASE = import.meta.env.BASE_URL
const EMPTY = { faces: 0, faceList: [] }
const COLORS = { safe: '#35e08a', stranger: '#ffc400', danger: '#ff3030' }

async function createLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`)
  const make = (delegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${BASE}models/face_landmarker.task`, delegate },
      runningMode: 'VIDEO',
      numFaces: 4,
    })
  try {
    return await make('GPU')
  } catch {
    return await make('CPU')
  }
}

// Runs the MediaPipe Face Landmarker on the live video, scores EVERY face (up to 4), and draws a
// box + score on each one. `annotRef.current = { faces, threshold }` supplies who each face is
// (from face recognition) so boxes can be coloured and labelled. All processing is local.
export function useFaceLandmarker({ videoRef, canvasRef, active, annotRef }) {
  const [modelState, setModelState] = useState('idle') // idle | loading | ready | error
  const [result, setResult] = useState(EMPTY)
  const landmarkerRef = useRef(null)
  const loadingRef = useRef(false)

  useEffect(() => {
    if (!active || landmarkerRef.current || loadingRef.current) return
    loadingRef.current = true
    setModelState('loading')
    createLandmarker()
      .then((lm) => {
        landmarkerRef.current = lm
        setModelState('ready')
      })
      .catch(() => setModelState('error'))
      .finally(() => {
        loadingRef.current = false
      })
  }, [active])

  useEffect(() => {
    if (!active || modelState !== 'ready') {
      setResult(EMPTY)
      return
    }
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let lastVideoTime = -1
    let lastPush = 0
    let latest = EMPTY
    const tracks = []

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return
      lastVideoTime = video.currentTime
      const w = video.videoWidth, h = video.videoHeight
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h

      const res = landmarkerRef.current.detectForVideo(video, now)
      ctx.clearRect(0, 0, w, h)
      const faces = res.faceLandmarks || []

      if (!faces.length) {
        tracks.length = 0
        latest = EMPTY
      } else {
        const faceList = analyse(faces, w, h, tracks)
        const { faces: ids = [], threshold = 8 } = annotRef.current || {}
        faces.forEach((lm, i) => {
          const f = faceList[i]
          // Who is this face? nearest recognised face by position
          let person = null, best = 0.2
          for (const r of ids) { const d = Math.hypot(r.cx - f.cx, r.cy - f.cy); if (d < best) { best = d; person = r.person } }
          const score = f.mog.available ? f.mog.score : null
          let color, text
          if (person) { color = COLORS.safe; text = `${person.name.toUpperCase()}${score != null ? ` ${score.toFixed(1)}` : ''}` }
          else if (score != null && score >= threshold) { color = COLORS.danger; text = `HONEYPOT ${score.toFixed(1)}` }
          else { color = COLORS.stranger; text = `STRANGER${score != null ? ` ${score.toFixed(1)}` : ''}` }
          draw(ctx, lm, w, h, color, text)
        })
        latest = { faces: faces.length, faceList }
      }
      if (now - lastPush > 150) {
        lastPush = now
        setResult(latest)
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [active, modelState, videoRef, canvasRef, annotRef])

  // Note: no unmount close — StrictMode remounts would destroy the cached model.

  return { modelState, ...result }
}

function draw(ctx, lm, w, h, color, text) {
  ctx.lineWidth = 1.2
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  for (const { start, end } of FaceLandmarker.FACE_LANDMARKS_CONTOURS) {
    ctx.moveTo(lm[start].x * w, lm[start].y * h)
    ctx.lineTo(lm[end].x * w, lm[end].y * h)
  }
  ctx.stroke()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = color
  for (let i = 0; i < 468; i += 2) ctx.fillRect(lm[i].x * w - 1, lm[i].y * h - 1, 2, 2)

  // Corner-bracket bounding box
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0
  for (const q of lm) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
  const pad = 0.02
  x0 = (x0 - pad) * w; x1 = (x1 + pad) * w; y0 = (y0 - pad) * h; y1 = (y1 + pad) * h
  const c = Math.min(x1 - x0, y1 - y0) * 0.14
  ctx.globalAlpha = 1
  ctx.lineWidth = 3
  ctx.beginPath()
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    ctx.moveTo(x + dx * c, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * c)
  }
  ctx.stroke()

  // Label. The canvas is mirrored by CSS, so flip the text back so it reads normally.
  const size = Math.max(14, Math.round((x1 - x0) * 0.11))
  ctx.font = `900 ${size}px Impact, 'Arial Black', sans-serif`
  const tw = ctx.measureText(text).width + 12
  ctx.save()
  ctx.translate(x1, Math.max(size + 6, y0 - 4)) // x1 = visual-left edge after the mirror
  ctx.scale(-1, 1)
  ctx.fillStyle = color
  ctx.fillRect(0, -size - 2, tw, size + 8)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, 6, 2)
  ctx.restore()
}

// Per-face MOG, smoothed per tracked face so scores don't jitter.
function analyse(faces, w, h, tracks) {
  const next = []
  const out = faces.map((lm) => {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0
    for (const q of lm) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    let track = null, best = 0.15
    for (const t of tracks) { const d = Math.hypot(t.cx - cx, t.cy - cy); if (d < best) { best = d; track = t } }
    const raw = computeMog(lm, w, h)
    let mog = { available: false, reason: raw.reason }
    let comps = null
    if (raw.available) {
      comps = { ...(track?.comps || raw.components) }
      for (const k of Object.keys(WEIGHTS)) comps[k] += 0.2 * (raw.components[k] - comps[k])
      mog = { available: true, score: scoreFrom(comps), components: comps }
    }
    next.push({ cx, cy, comps })
    return { cx, cy, width: x1 - x0, mog }
  })
  tracks.splice(0, tracks.length, ...next)
  return out
}
