import { LABELS, WEIGHTS } from '../lib/mogScore'

export default function MogScorePanel({ mog, threshold, onThreshold, faceDetected, running }) {
  const available = mog?.available
  const over = available && mog.score >= threshold
  return (
    <section className="panel">
      <div className="panel-head"><h2 className="mono">MOG-O-METER 🟩</h2></div>

      <div className={`score ${over ? 'over' : ''}`}>
        {available ? (
          <>
            <span className="score-num">{mog.score.toFixed(1)}</span>
            <span className="score-den mono"> / 10.0</span>
          </>
        ) : (
          <span className="score-na mono">
            {!running ? 'NO CAMERA, NO MOG' : !faceDetected ? 'NO FACE, NO MOG' : `Score unavailable — ${mog?.reason?.toLowerCase() || 'reposition toward camera'}`}
          </span>
        )}
      </div>

      <label className="field">
        <span className="mono tiny dim">ALERT LIMIT (STRANGERS ABOVE THIS = HONEYPOT): {threshold.toFixed(1)}</span>
        <input type="range" min="5" max="10" step="0.1" value={threshold} onChange={(e) => onThreshold(+e.target.value)} />
      </label>

      <ul className="bars">
        {Object.keys(WEIGHTS).map((k) => {
          const v = available ? mog.components[k] : 0
          return (
            <li key={k}>
              <div className="bar-label mono">
                <span>{LABELS[k]} <em>{Math.round(WEIGHTS[k] * 100)}%</em></span>
                <span>{available ? `${Math.round(v * 100)}` : '—'}</span>
              </div>
              <div className="bar"><div style={{ width: `${v * 100}%` }} /></div>
            </li>
          )
        })}
      </ul>

    </section>
  )
}
