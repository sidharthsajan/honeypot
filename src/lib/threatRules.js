// Transparent demo rules. This is a joke: the "honeypot" label is purely a
// score-threshold parody and says nothing about any real person.

export const TONES = { idle: 'idle', trusted: 'trusted', unknown: 'unknown', alert: 'alert' }

export function evaluateThreat({ cameraRunning, modelReady, faceDetected, mog, threshold, trusted }) {
  if (!cameraRunning) return { key: 'OFFLINE', label: 'CAMERA OFF', tone: TONES.idle }
  if (!modelReady) return { key: 'SCANNING', label: 'LOADING…', tone: TONES.idle }
  if (!faceDetected) return { key: 'NO_SUBJECT', label: 'NO FACE FOUND', tone: TONES.idle }
  if (trusted) return { key: 'TRUSTED', label: 'SAFE ✅', tone: TONES.trusted }
  if (mog != null && mog >= threshold) {
    return { key: 'HONEYPOT', label: '🚨 HONEYPOT DETECTED 🚨', tone: TONES.alert }
  }
  return { key: 'UNKNOWN', label: 'NOT ON SAFE LIST 🤨', tone: TONES.unknown }
}
