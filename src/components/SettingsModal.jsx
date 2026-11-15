import EnrolForm from './EnrolForm'
import AlertSettings from './AlertSettings'

const SLOTS = [
  ['self', 'YOU', 'Register yourself — the main person everyone else is related to.', 'Your name'],
  ['partner', 'YOUR PARTNER', 'Register your partner.', "Partner's name"],
]

export default function SettingsModal({ onClose, people, onAdd, onRemove, cameraRunning, videoRef, matchThreshold, onMatchThreshold, alerts, onAlertsChange }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal panel" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="panel-head">
          <h2 className="mono">⚙ SETTINGS</h2>
          <button className="btn" onClick={onClose}>DONE</button>
        </div>

        {SLOTS.map(([role, title, help, placeholder]) => {
          const person = people.find((p) => p.relationship === role)
          return (
            <div key={role} className="slot">
              <div className="mono tiny dim">{title}</div>
              {person ? (
                <div className="profile">
                  <div className="person-name">{person.name} ✅</div>
                  <button className="btn ghost" onClick={() => onRemove(person.id)}>REMOVE</button>
                </div>
              ) : (
                <>
                  <p className="note">{help}</p>
                  <EnrolForm fixedRelationship={role} cameraRunning={cameraRunning} videoRef={videoRef} onAdd={onAdd} namePlaceholder={placeholder} />
                </>
              )}
            </div>
          )
        })}

        <AlertSettings alerts={alerts} onChange={onAlertsChange} />

        <div className="slot">
          <label className="field">
            <span className="mono tiny dim">MATCH STRICTNESS: {matchThreshold.toFixed(2)} (lower = stricter)</span>
            <input type="range" min="0.3" max="0.7" step="0.01" value={matchThreshold} onChange={(e) => onMatchThreshold(+e.target.value)} />
          </label>
        </div>
      </div>
    </div>
  )
}
