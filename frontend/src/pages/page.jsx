import { useMemo, useRef, useEffect } from "react";
import ward3d from "../assets/ward-3d.svg";
import bed3d from "../assets/bed-3d.svg";
import mic3d from "../assets/mic-3d.svg";

function computeStatusFromSeverity(severity) {
  if (severity === null || severity === undefined) return "vacant";
  if (severity >= 0.66) return "severe";
  if (severity >= 0.33) return "mild";
  return "normal";
}

function BreathingWave({ bpm }) {
  const cvsRef = useRef(null);
  const phase = useRef(0);
  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    let raf = null;
    const draw = () => {
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(10,20,40,0.15)";
      ctx.fillRect(0, 0, w, h);
      const freq = (bpm || 16) / 60;
      const amp = 10 + Math.max(0, Math.min(20, (bpm - 12) * 1.2));
      ctx.beginPath();
      for (let x = 0; x < w; x++) {
        const t = x / w;
        const y = h / 2 + Math.sin((t * Math.PI * 4) + phase.current) * amp * Math.sin(phase.current * 0.3);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#ff4e63";
      ctx.lineWidth = 2;
      ctx.stroke();
      phase.current += 0.06 + (freq * 0.2);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [bpm]);
  return <canvas ref={cvsRef} width={520} height={72} style={{ width: "100%", borderRadius: 6 }} />;
}

const zoneCenters = {
  north: { x: 50, y: 14 },
  east: { x: 86, y: 50 },
  south: { x: 50, y: 86 },
  west: { x: 14, y: 50 },
  tray: { x: 50, y: 50 },
};

function getPercent(value) {
  if (typeof value === "number") return value;
  return Number.parseFloat(String(value).replace("%", "")) || 0;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function DashboardPage({ beds, microphones = [], alerts, selectedBed, setSelectedBed, onViewProfile, wardName = "Ward A" }) {
  const totalDetected = beds.filter(b => b.rate !== null).length;
  const normalCount = beds.filter(b => computeStatusFromSeverity(b.severity) === "normal").length;
  const mildCount = beds.filter(b => computeStatusFromSeverity(b.severity) === "mild").length;
  const severeCount = beds.filter(b => computeStatusFromSeverity(b.severity) === "severe").length;
  const micTelemetry = useMemo(() => microphones.map((mic) => {
    const point = zoneCenters[mic.zone] || zoneCenters.tray;
    const connected = Boolean(mic.connected && mic.zone !== "tray");
    const coverageBeds = beds
      .map((bed) => ({ bed, distance: distance(point, { x: getPercent(bed.left), y: getPercent(bed.top) }) }))
      .sort((a, b) => a.distance - b.distance)
      .filter((entry) => entry.distance <= 30)
      .map((entry) => entry.bed);
    const nearest = beds
      .map((bed) => ({ bed, distance: distance(point, { x: getPercent(bed.left), y: getPercent(bed.top) }) }))
      .sort((a, b) => a.distance - b.distance)[0];
    const signal = connected ? Math.min(100, Math.max(18, Math.round((nearest?.bed.rate ?? 12) * 3 + (coverageBeds.length * 7) + (28 - Math.min(28, nearest?.distance ?? 28))))) : 0;

    return {
      ...mic,
      online: connected,
      captureAudio: connected && coverageBeds.length > 0,
      coverageBeds,
      nearestBed: nearest?.bed || null,
      signal,
      point,
    };
  }), [beds, microphones]);

  const connectedMicrophones = micTelemetry.filter((mic) => mic.online);
  const signalRoutes = beds.map((bed) => {
    const bedPoint = { x: getPercent(bed.left), y: getPercent(bed.top) };
    const nearestMic = connectedMicrophones
      .map((mic) => ({ mic, distance: distance(bedPoint, mic.point) }))
      .sort((a, b) => a.distance - b.distance)[0];

    return nearestMic ? {
      bed,
      mic: nearestMic.mic,
      bedPoint,
      micPoint: nearestMic.mic.point,
    } : null;
  }).filter(Boolean);

  return (
    <>
      <section className="summary-grid">
        <article className="summary-card neutral">
          <p>Total Patients Detected</p>
          <h3>{totalDetected}</h3>
          <span>/ 8 Beds</span>
        </article>
        <article className="summary-card normal">
          <p>Normal</p>
          <h3>{normalCount}</h3>
          <span>{Math.round((normalCount / 8) * 100)}%</span>
        </article>
        <article className="summary-card warning">
          <p>Mild Distress</p>
          <h3>{mildCount}</h3>
          <span>{Math.round((mildCount / 8) * 100)}%</span>
        </article>
        <article className="summary-card danger">
          <p>Severe Distress</p>
          <h3>{severeCount}</h3>
          <span>{Math.round((severeCount / 8) * 100)}%</span>
        </article>
        <article className="summary-card alert">
          <p>Alerts</p>
          <h3>{alerts.length}</h3>
          <span>Active Now</span>
        </article>
      </section>

      <section className="content-grid">
        <div className="ward-panel">
          <div className="panel-title">{wardName} Map (Acoustic Heatmap)</div>
          <div className="ward-scene ward-scene-dashboard">
            <img src={ward3d} alt="3D ward" className="ward-background" />
            <svg className="signal-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {signalRoutes.map((route) => (
                <g key={`${route.bed.id}-${route.mic.id}`}>
                  <line
                    x1={route.bedPoint.x}
                    y1={route.bedPoint.y}
                    x2={route.micPoint.x}
                    y2={route.micPoint.y}
                    className={`signal-line ${route.mic.captureAudio ? "live" : "idle"}`}
                  />
                  <circle cx={route.bedPoint.x} cy={route.bedPoint.y} r="1.6" className={`signal-burst ${route.mic.captureAudio ? "live" : "idle"}`} />
                </g>
              ))}
            </svg>
            {beds.map((b, i) => {
              const status = computeStatusFromSeverity(b.severity);
              return (
                <div key={b.id}
                  className={`bed-marker ${status} ${selectedBed === i ? "selected" : ""}`}
                  style={{ top: b.top, left: b.left }}
                  onClick={() => setSelectedBed(i)}
                >
                  <span>{b.id}</span>
                  <img src={bed3d} alt="3D bed" />
                </div>
              );
            })}
            {micTelemetry.filter((mic) => mic.zone !== "tray").map((mic) => (
              <div
                key={mic.id}
                className={`mic mic-node ${mic.captureAudio ? "live" : mic.online ? "ready" : "offline"}`}
                style={{ left: mic.left, top: mic.top }}
              >
                <img src={mic3d} alt={mic.id} />
                <span>{mic.id}</span>
                <small>{mic.captureAudio ? `${mic.coverageBeds.length} beds live` : mic.online ? "Connected" : "Offline"}</small>
              </div>
            ))}
          </div>

          <div className="signal-strip">
            <div className="signal-strip-header">
              <h4>Live Sound Pickup</h4>
              <span>{connectedMicrophones.length} connected microphones</span>
            </div>
            <div className="signal-strip-list">
              {signalRoutes.map((route) => (
                <div key={`${route.bed.id}-${route.mic.id}`} className={`signal-strip-item ${route.mic.captureAudio ? "live" : "ready"}`}>
                  <div>
                    <strong>{route.bed.id}</strong>
                    <span>sending to {route.mic.id}</span>
                  </div>
                  <div className="signal-wave">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))}
              {signalRoutes.length === 0 && <p className="signal-empty">No connected microphones yet. Place and connect a mic to see live pickup.</p>}
            </div>
          </div>

          <div className="bottom-row">
            <article className="alerts-panel">
              <h4>Active Alerts</h4>
              {alerts.length === 0 && <p style={{ color: '#9fb8e8' }}>No active alerts</p>}
              {alerts.map((a, idx) => <p key={idx}>{a}</p>)}
            </article>

            <article className="chart-panel">
              <h4>Respiratory Rate Overview (All Patients)</h4>
              <div className="bars">
                {beds.map((b, index) => (
                  <div key={`bar-${index}`} className="bar-wrap">
                    <span>{b.rate}</span>
                    <div
                      className={`bar ${computeStatusFromSeverity(b.severity) === 'severe' ? 'danger' : computeStatusFromSeverity(b.severity) === 'mild' ? 'warning' : 'normal'}`}
                      style={{ height: `${(b.rate || 10) * 2.2}px` }}
                    />
                    <small>{`Bed ${index + 1}`}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        <aside className="patient-panel">
          <div className="selected-patient">
            <div>
              <h3>{beds[selectedBed]?.id ?? 'Bed'}</h3>
              <p>Patient Detected · Since 09:58 AM</p>
            </div>
            <span style={{ textTransform: 'capitalize' }}>{computeStatusFromSeverity(beds[selectedBed]?.severity)}</span>
          </div>

          <div className="vitals">
            <h4>Respiratory Status</h4>
            <div><span>Respiratory Rate</span><strong>{beds[selectedBed]?.rate ?? '--'} bpm</strong></div>
            <div><span>Breathing Pattern</span><strong>{beds[selectedBed]?.breathingPattern ?? '—'}</strong></div>
            <div><span>Condition</span><strong className="danger-txt">{beds[selectedBed]?.condition ?? '—'}</strong></div>
            <div><span>Severity Score</span><strong>{(beds[selectedBed]?.severity ?? 0).toFixed(2)} / 1.00</strong></div>
            <div><span>Confidence</span><strong>{beds[selectedBed]?.confidence ?? '--'}%</strong></div>
          </div>

          <div className="wave-panel">
            <h4>Live Breathing Waveform</h4>
            <BreathingWave bpm={beds[selectedBed]?.rate ?? 16} />
          </div>

          <div className="wave-panel">
            <h4>Microphone Pickup Status</h4>
            {micTelemetry.length === 0 && <p style={{ color: '#9fb8e8' }}>No microphones registered yet.</p>}
            {micTelemetry.map((mic) => (
              <div key={mic.id} className="pickup-row">
                <div>
                  <strong>{mic.id}</strong>
                  <span>{mic.zone === "tray" ? "In tray" : mic.captureAudio ? `Capturing ${mic.coverageBeds.length} beds` : mic.online ? "Connected" : "Offline"}</span>
                </div>
                <div className={`pickup-pill ${mic.captureAudio ? "live" : mic.online ? "ready" : "offline"}`}>{mic.signal}%</div>
              </div>
            ))}
          </div>

          <div className="trend-panel">
            <h4>Trend (Last 30 min)</h4>
            <div className="trend-line" />
          </div>

          <button className="danger-btn">High Priority Alert</button>
          <button className="outline-btn" onClick={onViewProfile}>View Full Patient Profile</button>
        </aside>
      </section>
    </>
  );
}
