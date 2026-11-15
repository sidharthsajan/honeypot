import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { computeMog, scoreFrom, WEIGHTS } from '../lib/mogScore'

const BASE = import.meta.env.BASE_URL
const EMPTY = { faces: 0, mog: { available: false, reason: 'No face' } }
const COLORS = { idle: '#8b97a3', trusted: '#35e08a', unknown: '#ffb020', alert: '#ff3b4e' }

async function createLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}wasm`)
  const make = (delegate) =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${BASE}models/face_landmarker.task`, delegate },
      runningMode: 'VIDEO',
      numFaces: 2,
    })
  try {
    return await make('GPU')
  } catch {
    return await make('CPU')
  }
}

// Runs the MediaPipe Face Landmarker on the live video, draws the overlay on the
// canvas, and exposes a throttled, smoothed result. All processing is local.
export function useFaceLandmarker({ videoRef, canvasRef, active, tone }) {
  const [modelState, setModelState] = useState('idle') // idle | loading | ready | error
  const [result, setResult] = useState(EMPTY)
  const landmarkerRef = useRef(null)
  const loadingRef = useRef(false)
  const toneRef = useRef(tone)
  toneRef.current = tone

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
    let smooth = null
    let lastSeen = 0
    let latest = EMPTY

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
        if (now - lastSeen > 500) smooth = null
        latest = EMPTY
      } else {
        lastSeen = now
        // Analyse the most prominent (widest) face only
        const width = (lm) => {
          let lo = 1, hi = 0
          for (const q of lm) { lo = Math.min(lo, q.x); hi = Math.max(hi, q.x) }
          return hi - lo
        }
        const lm = faces.reduce((a, b) => (width(b) > width(a) ? b : a))
        draw(ctx, lm, w, h, COLORS[toneRef.current] || COLORS.idle)

        let mog = computeMog(lm, w, h)
        if (mog.available) {
          smooth = smooth || mog.components
          for (const k of Object.keys(WEIGHTS)) smooth[k] += 0.2 * (mog.components[k] - smooth[k])
          mog = { ...mog, components: { ...smooth }, score: scoreFrom(smooth) }
        } else {
          smooth = null
        }
        latest = { faces: faces.length, mog }
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
  }, [active, modelState, videoRef, canvasRef])

  // Note: no unmount close — StrictMode remounts would destroy the cached model.

  return { modelState, ...result }
}

function draw(ctx, lm, w, h, color) {
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
}
