import { useCallback, useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import CameraPanel from './components/CameraPanel'
import SafeList from './components/SafeList'
import SettingsModal from './components/SettingsModal'
import { REL_LABEL } from './lib/people'
import { usePartnerAlerts } from './hooks/usePartnerAlerts'
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
  const [alerts, setAlerts] = useState(() => ({
    enabled: false, email: '', phone: '', serviceId: '', templateId: '', publicKey: '', webhookUrl: '', cooldownMin: 10, discordBot: false,
    ...load('hp.alerts', {}),
  }))
  const [matchThreshold, setMatchThreshold] = useState(() => load('hp.matchThreshold', 0.5))
  const [incident, setIncident] = useState(null)
  const [log, setLog] = useState([])
  const logId = useRef(0)

  const addLog = useCallback((msg, tone = 'idle') => {
    setLog((l) => [{ id: logId.current++, time: new Date(), msg, tone }, ...l].slice(0, 40))
  }, [])

  useEffect(() => save('hp.threshold', threshold), [threshold])
  useEffect(() => save('hp.people', people), [people])
  useEffect(() => save('hp.alerts', alerts), [alerts])
  useEffect(() => save('hp.matchThreshold', matchThreshold), [matchThreshold])

  // Every face on screen is scored (tracker) and identified (rec); boxes are drawn from annotRef.
  const annotRef = useRef({ faces: [], threshold })
  const tracker = useFaceLandmarker({ videoRef: camera.videoRef, canvasRef, active: running, annotRef })
  const rec = useFaceRecognition({ videoRef: camera.videoRef, active: running && people.length > 0, people, threshold: matchThreshold })
  annotRef.current = { faces: rec.faceList, threshold }

  const sceneFaces = tracker.faceList.map((f) => {
    let person = null, best = 0.2
    for (const r of rec.faceList) { const d = Math.hypot(r.cx - f.cx, r.cy - f.cy); if (d < best) { best = d; person = r.person } }
    return { ...f, person }
  })
  const strangers = sceneFaces.filter((f) => !f.person)
  const scoredStrangers = strangers.filter((f) => f.mog.available).sort((a, b) => b.mog.score - a.mog.score)
  const topStranger = scoredStrangers[0] || null
  const safeHere = [...new Map(sceneFaces.filter((f) => f.person).map((f) => [f.person.id, f.person])).values()]
  const threat = evaluateThreat({
    cameraRunning: running,
    modelReady: tracker.modelState === 'ready',
    pending: people.length > 0 && !rec.ticked,
    faceCount: tracker.faces,
    strangerCount: strangers.length,
    topStrangerMog: topStranger ? topStranger.mog.score : null,
    threshold,
  })
  const tone = threat.tone
  const label = threat.key === 'TRUSTED' && safeHere.length
    ? safeHere.map((p) => `${p.name.toUpperCase()} · ${REL_LABEL[p.relationship].toUpperCase()}`).join(' + ') + ' ✅'
    : threat.label

  // Scene: is the user on screen together with an unrecognised face above the MOG limit?
  const selfHere = sceneFaces.some((f) => f.person?.relationship === 'self')
  const honeypots = scoredStrangers.filter((f) => f.mog.score >= threshold)
  const together = running && selfHere && honeypots.length > 0
  const selfName = people.find((p) => p.relationship === 'self')?.name || 'Your partner’s person'
  const alertStatus = usePartnerAlerts({
    together,
    alerts,
    message: `Honeypot.exe: ${selfName} was on camera with an unrecognised person (MOG ${Math.max(...honeypots.map((h) => h.mog.score), 0).toFixed(1)}) at ${new Date().toLocaleString()}.`,
    onEvent: addLog,
  })
  const alertLine = !alerts.enabled ? 'Partner alerts are off (Settings).'
    : alertStatus.phase === 'confirming' ? 'You + a honeypot spotted together… confirming.'
    : alertStatus.phase === 'open' ? `Incident open${alertStatus.lastSentAt ? ` — partner texted at ${new Date(alertStatus.lastSentAt).toLocaleTimeString()}` : ''}. No repeat messages until it closes.`
    : 'Partner alerts armed.'

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
          presentIds={rec.faceList.filter((f) => f.person).map((f) => f.person.id)}
        />
        <CameraPanel camera={camera} canvasRef={canvasRef} tracker={tracker} threat={threat} tone={tone} displayLabel={label} />
        <MogScorePanel
          mog={topStranger ? topStranger.mog : null}
          threshold={threshold}
          onThreshold={setThreshold}
          faceDetected={tracker.faces > 0}
          running={running && tracker.modelState === 'ready'}
          onlySafe={tracker.faces > 0 && strangers.length === 0}
          chips={sceneFaces.map((f) => ({ name: f.person ? f.person.name : 'Stranger', safe: !!f.person, score: f.mog.available ? f.mog.score : null }))}
        />
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
          alerts={alerts}
          onAlertsChange={setAlerts}
        />
      )}
      <IncidentConsole log={log} incident={incident} onReset={reset} alertLine={alertLine} />
    </div>
  )
}
