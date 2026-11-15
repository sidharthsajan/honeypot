// Transparent demo rules, evaluated across EVERYONE on screen.
// Recognised safe people are fine; any unrecognised face scoring at/above the MOG limit is a honeypot.

export const TONES = { idle: 'idle', trusted: 'trusted', unknown: 'unknown', alert: 'alert' }

export function evaluateThreat({ cameraRunning, modelReady, pending, faceCount, strangerCount, topStrangerMog, threshold }) {
  if (!cameraRunning) return { key: 'OFFLINE', label: 'CAMERA OFF', tone: TONES.idle }
  if (!modelReady || pending) return { key: 'SCANNING', label: 'LOADING…', tone: TONES.idle }
  if (faceCount === 0) return { key: 'NO_SUBJECT', label: 'NO FACE FOUND', tone: TONES.idle }
  if (strangerCount === 0) return { key: 'TRUSTED', label: 'SAFE ✅', tone: TONES.trusted }
  if (topStrangerMog != null && topStrangerMog >= threshold) {
    return { key: 'HONEYPOT', label: '🚨 HONEYPOT DETECTED 🚨', tone: TONES.alert }
  }
  return { key: 'UNKNOWN', label: 'NOT ON SAFE LIST 🤨', tone: TONES.unknown }
}
