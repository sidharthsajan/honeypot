import { useCallback, useEffect, useRef, useState } from 'react'

function describeError(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera permission denied. Allow camera access in your browser address bar, then press START again.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera found. Connect a webcam and try again.'
    case 'NotReadableError':
      return 'Camera is in use by another application. Close it and try again.'
    default:
      return `Could not start camera: ${err?.message || 'unknown error'}`
  }
}

// Video stays in the browser. Nothing is recorded or uploaded.
export function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('stopped') // stopped | starting | running | error
  const [error, setError] = useState(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setStatus('stopped')
  }, [])

  const start = useCallback(async () => {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera API unavailable. Use a modern browser over HTTPS or localhost.')
      setStatus('error')
      return
    }
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      setStatus('running')
    } catch (err) {
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      setError(describeError(err))
      setStatus('error')
    }
  }, [])

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  return { videoRef, status, error, start, stop }
}
