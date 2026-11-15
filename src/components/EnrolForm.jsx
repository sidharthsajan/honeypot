import { useRef, useState } from 'react'
import { describeFace, imageFromFile } from '../lib/identityMatching'
import { newId } from '../lib/people'

// Adds one person from an uploaded picture or the live camera.
// `relationships` shows a dropdown; `fixedRelationship` (self/partner) hides it.
export default function EnrolForm({ relationships, fixedRelationship, cameraRunning, videoRef, onAdd, namePlaceholder = 'Name' }) {
  const [name, setName] = useState('')
  const [rel, setRel] = useState(relationships?.[0]?.[0] ?? '')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)
  const canEnrol = name.trim().length > 0 && consent && !busy

  const enrol = async (getInput) => {
    setBusy(true); setError(null)
    try {
      const descriptor = await describeFace(await getInput())
      if (!descriptor) { setError('No face found. Use a clear, front-facing photo.'); return }
      onAdd({ id: newId(), name: name.trim(), relationship: fixedRelationship || rel, descriptor })
      setName(''); setConsent(false)
    } catch (e) {
      setError(e.message || 'Could not add this person.')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="stack">
      <label className="field">
        <span className="mono tiny dim">NAME</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} maxLength={40} />
      </label>
      {relationships && (
        <label className="field">
          <span className="mono tiny dim">RELATIONSHIP TO YOU</span>
          <select value={rel} onChange={(e) => setRel(e.target.value)}>
            {relationships.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>This person said it's cool to scan them.</span>
      </label>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files[0]; if (f) enrol(() => imageFromFile(f)) }} />
      <button className="btn primary" disabled={!canEnrol} onClick={() => fileRef.current.click()}>
        {busy ? 'SCANNING FACE…' : 'ADD BY UPLOADING A PICTURE'}
      </button>
      <button className="btn" disabled={!canEnrol || !cameraRunning} onClick={() => enrol(async () => videoRef.current)}>
        ADD USING THE CAMERA
      </button>
      {!cameraRunning && <p className="note">Turn on the camera to add someone with it.</p>}
      {error && <p className="error mono">{error}</p>}
    </div>
  )
}
