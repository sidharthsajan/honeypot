import StatusBadge from './StatusBadge'
import EnrolForm from './EnrolForm'
import { OTHER_RELATIONSHIPS, REL_LABEL, sortPeople } from '../lib/people'

export default function SafeList({ people, onAdd, onRemove, rec, cameraRunning, videoRef, onOpenSettings, matchThreshold }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="mono">SAFE LIST 🛡️</h2>
        <button className="btn ghost" onClick={onOpenSettings}>⚙ SETTINGS</button>
      </div>

      {people.length === 0 ? (
        <p className="note">Nobody registered yet. Add yourself and your partner in Settings, then add other safe people below.</p>
      ) : (
        <ul className="people">
          {sortPeople(people).map((p) => {
            const here = rec.person?.id === p.id
            return (
              <li key={p.id} className={here ? 'here' : ''}>
                <div>
                  <div className="person-name">{p.name}</div>
                  <StatusBadge tone={here ? 'trusted' : 'idle'}>{here ? `${REL_LABEL[p.relationship]} · ON CAMERA ✅` : REL_LABEL[p.relationship]}</StatusBadge>
                </div>
                <button className="btn ghost" onClick={() => onRemove(p.id)}>REMOVE</button>
              </li>
            )
          })}
        </ul>
      )}

      {people.length > 0 && (
        <p className="mono tiny dim" style={{ marginTop: 8 }}>
          {rec.recState === 'loading' ? 'LOADING FACE MATCHER…' : rec.recState === 'error' ? 'FACE MATCHER FAILED' :
            rec.distance != null ? `CLOSEST FACE DISTANCE ${rec.distance.toFixed(2)} (match ≤ ${matchThreshold.toFixed(2)})` : 'Turn on the camera to verify.'}
        </p>
      )}

      <hr />
      <div className="mono tiny dim" style={{ marginBottom: 8 }}>ADD ANOTHER SAFE PERSON</div>
      <EnrolForm relationships={OTHER_RELATIONSHIPS} cameraRunning={cameraRunning} videoRef={videoRef} onAdd={onAdd} />
    </section>
  )
}
