export default function IncidentConsole({ log, incident, onReset }) {
  return (
    <section className="panel console">
      <div className="console-actions">
        <button className="btn" onClick={onReset} disabled={!incident}>DISMISS</button>
        <p className="note mono">Alert fires when someone NOT on the safe list scores above your alert limit.</p>
      </div>

      <div className="console-cols">
        <div>
          <div className="panel-head"><h2 className="mono">HONEYPOT REPORT 🍯</h2></div>
          {incident ? (
            <article className="report mono">
              <div><b>INCIDENT</b> {incident.id}</div>
              <div><b>CODENAME</b> {incident.operation}</div>
              <div><b>FILED</b> {incident.time.toLocaleTimeString()}</div>
              <div><b>ASSET</b> Subject identified as {incident.asset}.</div>
              <div><b>FINDING</b> {incident.finding}</div>
              <div><b>ACTION</b> {incident.action}</div>
              <div className="disc">{incident.disclaimer}</div>
            </article>
          ) : (
            <p className="dim mono tiny">no honeypots rn. you're safe (for now).</p>
          )}
        </div>
        <div>
          <div className="panel-head"><h2 className="mono">EVENT LOG 🧾</h2></div>
          <ul className="log mono">
            {log.length === 0 && <li className="dim">nothing yet.</li>}
            {log.map((e) => (
              <li key={e.id} className={`tone-${e.tone}`}>
                <time>{e.time.toLocaleTimeString()}</time> {e.msg}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
