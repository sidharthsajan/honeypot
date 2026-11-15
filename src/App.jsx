import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import CameraPanel from './components/CameraPanel'
import SafeList from './components/SafeList'
import SettingsModal from './components/SettingsModal'
import { REL_LABEL } from './lib/people'
import MogScorePanel from './components/MogScorePanel'
import IncidentConsole from './components/IncidentConsole'
import BouncingClip from './components/BouncingClip'
import { useCamera } from './hooks/useCamera'
import { useFaceLandmarker } from './hooks/useFaceLandmarker'
import { useFaceRecognition } from './hooks/useFaceRecognition'
import { evaluateThreat } from './lib/threatRules'
import { generateIncident } from './lib/incidentTemplates'

const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : JSON.parse(v)
  } catch { return fallback }
}
const save = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export default function App() {
  const camera = useCamera()
  const canvasRef = useRef(null)
  const running = camera.status === 'running'

  const [threshold, setThreshold] = useState(() => load('hp.threshold', 8.0))
  const [people, setPeople] = useState(() => {
    const saved = load('hp.people', null)
    if (saved) return saved
    const old = load('hp.profile', null) // migrate the old single profile
    return old?.descriptor ? [{ id: 'legacy', name: old.name, relationship: 'friend', descriptor: old.descriptor }] : []
  })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [matchThreshold, setMatchThreshold] = useState(() => load('hp.matchThreshold', 0.5))
  const [incident, setIncident] = useState(null)
  const [log, setLog] = useState([])
  const logId = useRef(0)

  const addLog = useCallback((msg, tone = 'idle') => {
    setLog((l) => [{ id: logId.current++, time: new Date(), msg, tone }, ...l].slice(0, 40))
  }, [])

  useEffect(() => save('hp.threshold', threshold), [threshold])
  useEffect(() => save('hp.people', people), [people])
  useEffect(() => save('hp.matchThreshold', matchThreshold), [matchThreshold])

  // Two-pass: tone for the overlay colour needs the threat; tracker needs the tone.
  const toneRef = useRef('idle')
  const tracker = useFaceLandmarker({ videoRef: camera.videoRef, canvasRef, active: running, tone: toneRef.current })

  const rec = useFaceRecognition({ videoRef: camera.videoRef, active: running && people.length > 0, people, threshold: matchThreshold })
  const trusted = people.length > 0 && rec.matched
  const threat = evaluateThreat({
    cameraRunning: running,
    modelReady: tracker.modelState === 'ready',
    faceDetected: tracker.faces > 0,
    mog: tracker.mog?.available ? tracker.mog.score : null,
    threshold,
    trusted,
  })
  const tone = threat.tone
  const label = threat.key === 'TRUSTED' && rec.person ? `${rec.person.name.toUpperCase()} · ${REL_LABEL[rec.person.relationship].toUpperCase()} ✅` : threat.label
  toneRef.current = tone

  // Log status changes
  const lastKey = useRef(null)
  useEffect(() => {
    if (lastKey.current !== threat.key) {
      if (lastKey.current !== null || threat.key !== 'OFFLINE') addLog(`Status → ${threat.label}`, threat.tone)
      lastKey.current = threat.key
    }
  }, [threat.key, threat.label, threat.tone, addLog])

  // Log who was recognised
  const lastPerson = useRef(null)
  useEffect(() => {
    const id = rec.person?.id ?? null
    if (id !== lastPerson.current) {
      if (rec.person) addLog(`Recognised ${rec.person.name} (${REL_LABEL[rec.person.relationship]})`, 'trusted')
      lastPerson.current = id
    }
  }, [rec.person, addLog])

  // Rule-driven alert raises an incident too
  useEffect(() => {
    if (threat.key === 'HONEYPOT') {
      const inc = generateIncident('rule')
      setIncident(inc)
      addLog(`HONEYPOT DETECTED ${inc.id} — ${inc.operation}`, 'alert')
    }
  }, [threat.key, addLog])

  const reset = () => {
    setIncident(null)
    addLog('Incident dismissed.', 'trusted')
  }

  return (
    <div className={`app ${tone === 'alert' ? 'is-alert' : ''}`}>
      {threat.key === 'HONEYPOT' && <div className="alert-banner mono">🚨 HONEYPOT DETECTED 🚨 STRANGER ABOVE YOUR ALERT LIMIT. 🚨</div>}
      <BouncingClip active={threat.key === 'HONEYPOT'} />
      <Header online={running} />
      <main className="grid">
        <SafeList
          people={people}
          onAdd={(p) => { setPeople((l) => [...l.filter((x) => !(['self', 'partner'].includes(p.relationship) && x.relationship === p.relationship)), p]); addLog(`Added ${p.name} (${REL_LABEL[p.relationship]})`, 'trusted') }}
          onRemove={(id) => { setPeople((l) => l.filter((x) => x.id !== id)); addLog('Person removed') }}
          rec={rec}
          cameraRunning={running}
          videoRef={camera.videoRef}
          onOpenSettings={() => setSettingsOpen(true)}
          matchThreshold={matchThreshold}
        />
        <CameraPanel camera={camera} canvasRef={canvasRef} tracker={tracker} threat={threat} tone={tone} displayLabel={label} />
        <MogScorePanel mog={tracker.mog} threshold={threshold} onThreshold={setThreshold} faceDetected={tracker.faces > 0} running={running && tracker.modelState === 'ready'} />
      </main>
      {settingsOpen && (
        <SettingsModal
          onClose={() => setSettingsOpen(false)}
          people={people}
          onAdd={(p) => { setPeople((l) => [...l.filter((x) => x.relationship !== p.relationship), p]); addLog(`Added ${p.name} (${REL_LABEL[p.relationship]})`, 'trusted') }}
          onRemove={(id) => { setPeople((l) => l.filter((x) => x.id !== id)); addLog('Person removed') }}
          cameraRunning={running}
          videoRef={camera.videoRef}
          matchThreshold={matchThreshold}
          onMatchThreshold={setMatchThreshold}
        />
      )}
      <IncidentConsole log={log} incident={incident} onReset={reset} />
    </div>
  )
}
