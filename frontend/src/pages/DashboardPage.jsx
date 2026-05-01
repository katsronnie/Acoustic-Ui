import { useRef, useEffect, useMemo } from "react";
import ward3d from "../assets/ward-3d.svg";
import bed3d from "../assets/bed-3d.svg";
import mic3d from "../assets/mic-3d.svg";
import "./dashboard-mic-waves.css";

/* ─────────────────────────────────────────────
   Severity helpers
───────────────────────────────────────────── */
function computeStatusFromSeverity(severity) {
  if (severity === null || severity === undefined) return "vacant";
  if (severity >= 0.66) return "severe";
  if (severity >= 0.33) return "mild";
  return "normal";
}

/* ─────────────────────────────────────────────
   Live Breathing Waveform (sidebar canvas)
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   MicAudioWave — horizontal sound wave canvas
   that sits directly ON the mic icon.

   orientation: "horizontal" for top/bottom mics
                "vertical"   for left/right mics
───────────────────────────────────────────── */
function MicAudioWave({ status, active, orientation = "horizontal" }) {
  const cvsRef = useRef(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(null);

  const params = useMemo(() => ({
    severe: { color: "255,78,99",   speed: 0.18, amp: 7,   freq: 3.5 },
    mild:   { color: "245,166,35",  speed: 0.12, amp: 5,   freq: 3.0 },
    normal: { color: "76,219,143",  speed: 0.08, amp: 3.5, freq: 2.5 },
    vacant: { color: "120,140,180", speed: 0.04, amp: 1.5, freq: 2.0 },
  }[status] || { color: "120,140,180", speed: 0.04, amp: 1.5, freq: 2.0 }), [status]);

  useEffect(() => {
    const cvs = cvsRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");

    const draw = () => {
      const w = cvs.width, h = cvs.height;
      ctx.clearRect(0, 0, w, h);

      if (!active) {
        ctx.beginPath();
        if (orientation === "vertical") {
          ctx.moveTo(w / 2, 0);
          ctx.lineTo(w / 2, h);
        } else {
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
        }
        ctx.strokeStyle = "rgba(120,140,180,0.12)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      [0, 1, 2].forEach((layer) => {
        const layerAmp     = params.amp * (1 - layer * 0.28);
        const layerOpacity = 0.52 - layer * 0.14;
        const phaseOffset  = layer * 0.9;

        ctx.beginPath();

        if (orientation === "vertical") {
          /* Wave travels top → bottom, wiggles left/right */
          for (let y = 0; y < h; y++) {
            const t        = y / h;
            const edgeFade = Math.sin(t * Math.PI);
            const x = w / 2
              + Math.sin((t * Math.PI * 2 * params.freq) + phaseRef.current + phaseOffset)
              * layerAmp * edgeFade;
            y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0,   `rgba(${params.color},0)`);
          grad.addColorStop(0.2, `rgba(${params.color},${layerOpacity})`);
          grad.addColorStop(0.8, `rgba(${params.color},${layerOpacity})`);
          grad.addColorStop(1,   `rgba(${params.color},0)`);
          ctx.strokeStyle = grad;
        } else {
          /* Wave travels left → right, wiggles up/down */
          for (let x = 0; x < w; x++) {
            const t        = x / w;
            const edgeFade = Math.sin(t * Math.PI);
            const y = h / 2
              + Math.sin((t * Math.PI * 2 * params.freq) + phaseRef.current + phaseOffset)
              * layerAmp * edgeFade;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          const grad = ctx.createLinearGradient(0, 0, w, 0);
          grad.addColorStop(0,   `rgba(${params.color},0)`);
          grad.addColorStop(0.2, `rgba(${params.color},${layerOpacity})`);
          grad.addColorStop(0.8, `rgba(${params.color},${layerOpacity})`);
          grad.addColorStop(1,   `rgba(${params.color},0)`);
          ctx.strokeStyle = grad;
        }

        ctx.lineWidth = 1.2 - layer * 0.3;
        ctx.stroke();
      });

      phaseRef.current += params.speed;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, params, orientation]);

  /* Canvas size: horizontal mics get wide short canvas,
     vertical (left/right) mics get tall narrow canvas   */
  const isVertical = orientation === "vertical";
  return (
    <canvas
      ref={cvsRef}
      width={isVertical ? 28 : 90}
      height={isVertical ? 90 : 28}
      className={`mic-audio-wave mic-audio-wave--${orientation}`}
    />
  );
}

/* ─────────────────────────────────────────────
   MicBreathingRings — SVG concentric rings
   expanding from the mic, in viewBox 0–100.
───────────────────────────────────────────── */
function MicBreathingRings({ cx, cy, status, active }) {
  if (!active) return null;

  const ringColor = { severe: "#ff4e63", mild: "#f5a623", normal: "#4cdb8f" }[status];
  const period    = { severe: 2.5, mild: 3.2, normal: 4.0 }[status] || 0;

  if (!ringColor || period === 0) return null;

  return (
    <>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          className="mic-breathing-ring"
          style={{
            "--ring-color": ringColor,
            "--period":     `${period}s`,
            "--delay":      `${(period / 3) * i}s`,
          }}
          cx={cx}
          cy={cy}
          r="2"
          fill="none"
          stroke={ringColor}
          strokeWidth="0.8"
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────
   Mic layout — matching what's visible in the
   screenshot exactly:

   mic-a → top center    (cx≈50, cy≈2)
   mic-b → left middle   (cx≈1,  cy≈50)
   mic-c → right middle  (cx≈99, cy≈50)
   mic-d → bottom center (cx≈50, cy≈95)

   orientation tells MicAudioWave which axis
   the wave should travel along.
───────────────────────────────────────────── */
const MIC_LAYOUT = [
  { id: "mic-a", extraCls: "mic mic-a", cx: 50, cy:  2, orientation: "horizontal" },
  { id: "mic-b", extraCls: "mic mic-b", cx:  1, cy: 50, orientation: "vertical"   },
  { id: "mic-c", extraCls: "mic mic-c", cx: 99, cy: 50, orientation: "vertical"   },
  { id: "mic-d", extraCls: "mic mic-d", cx: 50, cy: 95, orientation: "horizontal" },
];

function getPercent(value) {
  if (typeof value === "number") return value;
  return Number.parseFloat(String(value).replace("%", "")) || 0;
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/* ─────────────────────────────────────────────
   Dashboard
───────────────────────────────────────────── */
export default function DashboardPage({ beds, microphones = [], alerts, selectedBed, setSelectedBed, onViewProfile }) {
  const totalDetected = beds.filter(b => b.rate !== null).length;
  const normalCount   = beds.filter(b => computeStatusFromSeverity(b.severity) === "normal").length;
  const mildCount     = beds.filter(b => computeStatusFromSeverity(b.severity) === "mild").length;
  const severeCount   = beds.filter(b => computeStatusFromSeverity(b.severity) === "severe").length;

  /* Convert mic zone to SVG viewBox coordinates (0-100) */
  const getMicSVGPosition = (mic) => {
    const topPercent = parseFloat(mic.top || "50");
    const leftPercent = parseFloat(mic.left || "50");
    return { cx: leftPercent, cy: topPercent };
  };

  /* Derive per-mic status + active from nearest beds */
  const micData = useMemo(() => 
    microphones
      .filter(mic => mic.zone !== "tray") // Don't show tray mics on dashboard
      .map((mic) => {
        const { cx, cy } = getMicSVGPosition(mic);
        const nearby = beds
          .map(bed => ({
            bed,
            d: dist({ x: cx, y: cy }, { x: getPercent(bed.left), y: getPercent(bed.top) }),
          }))
          .filter(e => e.d <= 55)
          .sort((a, b) => a.d - b.d)
          .map(e => e.bed);

        const maxSeverity = nearby.length > 0 ? Math.max(...nearby.map(b => b.severity ?? 0)) : null;

        return {
          id: mic.id,
          zone: mic.zone,
          cx,
          cy,
          status: computeStatusFromSeverity(maxSeverity),
          active: nearby.some(b => b.rate !== null),
          orientation: cx < 20 || cx > 80 ? "vertical" : "horizontal", // Side mics are vertical
        };
      }),
    [microphones, beds]
  );

  return (
    <>
      {/* ── Summary strip ── */}
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
          <div className="panel-title">Ward Map (Acoustic Heatmap)</div>

          <div className="ward-scene">
            <img src={ward3d} alt="3D ward" className="ward-background" />

            {/* SVG overlay — breathing rings sit behind everything */}
            <svg
              className="signal-overlay"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {micData.map((mic) => (
                <MicBreathingRings
                  key={`rings-${mic.id}`}
                  cx={mic.cx}
                  cy={mic.cy}
                  status={mic.status}
                  active={mic.active}
                />
              ))}
            </svg>

            {/* Bed markers — untouched */}
            {beds.map((b, i) => {
              const status = computeStatusFromSeverity(b.severity);
              return (
                <div
                  key={b.id}
                  className={`bed-marker ${status} ${selectedBed === i ? "selected" : ""}`}
                  style={{ top: b.top, left: b.left }}
                  onClick={() => setSelectedBed(i)}
                >
                  <span>{b.id}</span>
                  <img src={bed3d} alt="3D bed" />
                </div>
              );
            })}

            {/* Mic icons — dynamically positioned from state */}
            {micData.map((mic) => (
              <div 
                key={mic.id} 
                className="mic mic-dynamic"
                style={{ top: `${mic.cy}%`, left: `${mic.cx}%` }}
                title={`${mic.id} (${mic.zone})`}
              >
                <img src={mic3d} alt={mic.id} />
                <MicAudioWave
                  status={mic.status}
                  active={mic.active}
                  orientation={mic.orientation}
                />
              </div>
            ))}
          </div>

          <div className="bottom-row">
            <article className="alerts-panel">
              <h4>Active Alerts</h4>
              {alerts.length === 0 && <p style={{ color: "#9fb8e8" }}>No active alerts</p>}
              {alerts.map((a, idx) => <p key={idx}>{a}</p>)}
            </article>

            <article className="chart-panel">
              <h4>Respiratory Rate Overview (All Patients)</h4>
              <div className="bars">
                {beds.map((b, index) => (
                  <div key={`bar-${index}`} className="bar-wrap">
                    <span>{b.rate}</span>
                    <div
                      className={`bar ${
                        computeStatusFromSeverity(b.severity) === "severe" ? "danger"
                        : computeStatusFromSeverity(b.severity) === "mild" ? "warning"
                        : "normal"
                      }`}
                      style={{ height: `${(b.rate || 10) * 2.2}px` }}
                    />
                    <small>{`Bed ${index + 1}`}</small>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>

        {/* ── Patient sidebar — dynamic status colors ── */}
        <aside className="patient-panel">
          {(() => {
            const bed = beds[selectedBed];
            const status = computeStatusFromSeverity(bed?.severity);
            const statusColor = {
              severe: "#ff4e63",
              mild: "#f5a623",
              normal: "#4cdb8f",
              vacant: "#788fa8",
            }[status] || "#788fa8";
            
            return (
              <>
                <div className="selected-patient" style={{ borderTopColor: statusColor }}>
                  <div>
                    <h3>{bed?.id ?? "Bed"}</h3>
                    <p>Patient Detected · Since 09:58 AM</p>
                  </div>
                  <span 
                    style={{ 
                      textTransform: "capitalize",
                      color: statusColor,
                      fontWeight: "bold"
                    }}
                  >
                    {status}
                  </span>
                </div>

                <div className="vitals">
                  <h4>Respiratory Status</h4>
                  <div><span>Respiratory Rate</span><strong>{bed?.rate ?? "--"} bpm</strong></div>
                  <div><span>Breathing Pattern</span><strong>{bed?.breathingPattern ?? "—"}</strong></div>
                  <div>
                    <span>Condition</span>
                    <strong 
                      style={{ 
                        color: status === "severe" ? "#ff4e63" : status === "mild" ? "#f5a623" : "#4cdb8f"
                      }}
                    >
                      {bed?.condition ?? "—"}
                    </strong>
                  </div>
                  <div><span>Severity Score</span><strong>{(bed?.severity ?? 0).toFixed(2)} / 1.00</strong></div>
                  <div><span>Confidence</span><strong>{bed?.confidence ?? "--"}%</strong></div>
                </div>

                <div className="wave-panel">
                  <h4>Live Breathing Waveform</h4>
                  <BreathingWave bpm={bed?.rate ?? 16} />
                </div>

                <div className="trend-panel">
                  <h4>Trend (Last 30 min)</h4>
                  <div className="trend-line" />
                </div>

                {status !== "normal" && status !== "vacant" && (
                  <button className="danger-btn">High Priority Alert</button>
                )}
                <button className="outline-btn" onClick={onViewProfile}>View Full Patient Profile</button>
              </>
            );
          })()}
        </aside>
      </section>
    </>
  );
}