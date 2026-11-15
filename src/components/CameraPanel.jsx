import StatusBadge from './StatusBadge'

export default function CameraPanel({ camera, canvasRef, tracker, threat, tone, displayLabel }) {
  const running = camera.status === 'running'
  const loadingModel = running && tracker.modelState === 'loading'
  return (
    <section className="panel camera-panel">
      <div className="panel-head">
        <h2 className="mono">LIVE CAMERA 📸</h2>
        <StatusBadge tone={tone} big>{displayLabel}</StatusBadge>
      </div>

      <div className={`stage tone-${tone}`}>
        <div className="stage-inner">
          <video ref={camera.videoRef} playsInline muted />
          <canvas ref={canvasRef} />
        </div>
        {running && <div className="scanline" />}
        {!running && (
          <div className="stage-empty mono">
            {camera.status === 'starting' ? 'ASKING FOR CAMERA ACCESS…' : 'CAMERA IS OFF'}
            <small>(your video never leaves this tab, bro)</small>
          </div>
        )}
        {loadingModel && <div className="stage-note mono">LOADING FACE DETECTION…</div>}
        {running && tracker.modelState === 'error' && (
          <div className="stage-note mono bad">FACE DETECTION FAILED. REFRESH.</div>
        )}
        {running && tracker.faces > 1 && (
          <div className="stage-note mono">{tracker.faces} FACES — SCORING EVERYONE</div>
        )}
      </div>

      {camera.error && <p className="error mono" role="alert">{camera.error}</p>}

      <div className="row">
        {!running ? (
          <button className="btn primary" onClick={camera.start} disabled={camera.status === 'starting'}>
            TURN ON CAMERA
          </button>
        ) : (
          <button className="btn" onClick={camera.stop}>TURN OFF CAMERA</button>
        )}
        <span className="mono tiny dim">
          {running && tracker.modelState === 'ready' ? `FACES FOUND: ${tracker.faces}` : 'press TURN ON CAMERA to start'}
        </span>
      </div>
    </section>
  )
}
