import { useMemo, useRef, useState } from "react";
import ward3d from "../assets/ward-3d.svg";
import bed3d from "../assets/bed-3d.svg";
import mic3d from "../assets/mic-3d.svg";

// ─── Zone definitions ────────────────────────────────────────────────────────
// Each zone has a percentage-based position inside the ward stage,
// a human-readable label, and the quadrant(s) of beds it should cover.
const ZONES = {
  north:                 { top: "8%", left: "50%", label: "North" },
  east:                  { top: "50%", left: "92%", label: "East" },
  south:                 { top: "92%", left: "50%", label: "South" },
  west:                  { top: "40%", left: "8%", label: "West" },

  // Hardware tray (off-stage staging area)
  tray:                  { top: "50%", left: "50%", label: "Hardware tray"     },
};

// How each zone covers beds (based on bed x/y percentages).
// Returns true if the bed falls within this zone's coverage area.
const zoneCoversBed = (zone, bedX, bedY) => {
  switch (zone) {
    case "north":               return bedY <= 45;
    case "east":                return bedX > 50;
    case "south":               return bedY > 45;
    case "west":                return bedX <= 50;
    default:                    return true;
  }
};

// ─── Drop-zone overlay descriptors (rendered inside the ward stage) ──────────
const DROP_ZONES = [
  { zone: "north", label: "N", style: { top: "-2%", left: "50%", transform: "translateX(-50%)" } },
  { zone: "west", label: "W", style: { top: "40%", left: "1%", transform: "translateY(-50%)" } },
  { zone: "east", label: "E", style: { top: "40%", right: "1%", transform: "translateY(-50%)" } },
  { zone: "south", label: "S", style: { bottom: "22%", left: "50%", transform: "translateX(-50%)" } },
];

// ─── Component ───────────────────────────────────────────────────────────────
export default function Microphones({
  beds = [],
  microphones = [],
  ward,
  onAnalyze,
  onCreateWard,
  onAddMicrophone,
  onPlaceMicrophone,
  onToggleMicrophoneConnection,
  onRemoveMicrophone,
}) {
  const [recordingMics, setRecordingMics] = useState(new Set());
  const [status, setStatus]               = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [levels, setLevels]               = useState({});
  const [previews, setPreviews]           = useState({});
  const recordersRef = useRef({});

  // ── Helpers ──────────────────────────────────────────────────────────────
  const parsePercent = (value) => {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;
    return Number.parseFloat(value.replace("%", "")) || 0;
  };

  const distanceBetween = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  const getBedPosition = (bed) => ({
    x: parsePercent(bed.left),
    y: parsePercent(bed.top),
  });

  // Position of a mic is determined by its zone entry in ZONES
  const getMicPosition = (mic) => {
    const entry = ZONES[mic.zone] ?? ZONES.tray;
    return {
      x: parsePercent(entry.left),
      y: parsePercent(entry.top),
    };
  };

  const getCoverageBeds = (mic) => {
    if (!beds.length || mic.zone === "tray") return [];
    return beds.filter((bed) => {
      const { x, y } = getBedPosition(bed);
      return zoneCoversBed(mic.zone, x, y);
    });
  };

  const pickPrimaryBed = (mic) => {
    const coverageBeds = getCoverageBeds(mic);
    if (!coverageBeds.length) return null;
    const micPos = getMicPosition(mic);
    return coverageBeds.reduce((best, bed) => {
      if (!best) return bed;
      const dBest = distanceBetween(micPos, getBedPosition(best));
      const dCurr = distanceBetween(micPos, getBedPosition(bed));
      return dCurr < dBest ? bed : best;
    }, null);
  };

  const getMicTelemetry = (mic) => {
    const placed    = mic.zone !== "tray";
    const position  = getMicPosition(mic);
    const bedDistances = beds
      .map((bed) => ({ bed, distance: distanceBetween(position, getBedPosition(bed)) }))
      .sort((a, b) => a.distance - b.distance);
    const nearest      = bedDistances[0];
    const coverageBeds = getCoverageBeds(mic);
    const connected    = Boolean(mic.connected && placed);
    const signal = connected
      ? Math.min(100, Math.max(18,
          Math.round(
            (nearest?.bed.rate ?? 12) * 3 +
            coverageBeds.length * 7 +
            (28 - Math.min(28, nearest?.distance ?? 28))
          )
        ))
      : 0;

    return {
      ...mic,
      online:        connected,
      captureAudio:  connected && coverageBeds.length > 0,
      signal,
      coverageBeds,
      nearestBed:    nearest?.bed ?? null,
      location:      ZONES[mic.zone]?.label ?? "Hardware tray",
      position,
    };
  };

  const mics = useMemo(
    () => microphones.map(getMicTelemetry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [microphones, beds]
  );

  const activeMicrophones    = mics.filter((m) => m.zone !== "tray");
  const connectedMicrophones = activeMicrophones.filter((m) => m.online);
  const capturingMicrophones = activeMicrophones.filter((m) => m.captureAudio);
  const activeWardName       = ward?.name || "Ward A";

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const handleDragStart = (event, micId) => {
    event.dataTransfer.setData("text/plain", micId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDropZone = (event, zone) => {
    event.preventDefault();
    const micId = event.dataTransfer.getData("text/plain");
    if (!micId) return;
    onPlaceMicrophone?.(micId, zone);
  };

  // ── Audio upload ──────────────────────────────────────────────────────────
  const uploadAudio = async (mic, file) => {
    const fileToUpload = file || selectedFiles[mic.id];
    if (!fileToUpload) {
      setStatus((prev) => ({ ...prev, [mic.id]: "Choose or record an audio file first." }));
      return;
    }

    const coverageBeds = getCoverageBeds(mic);
    const primaryBed   = pickPrimaryBed(mic);
    const bedId        = primaryBed?.id;

    setStatus((prev) => ({ ...prev, [mic.id]: "Sending audio to backend..." }));

    try {
      const analysis = await onAnalyze({ bedId, file: fileToUpload });
      const label =
        analysis.condition === "abnormal" || (analysis.severity_score ?? 0) >= 0.33
          ? "Abnormal breathing detected"
          : "Breathing looks normal";

      let msg = `${label} in ${mic.location}${bedId ? ` · ${bedId}` : ""}${analysis.respiratory_rate ? ` · ${analysis.respiratory_rate} bpm` : ""}`;
      if (coverageBeds.length > 1)
        msg += ` · coverage: ${coverageBeds.map((b) => b.id).join(", ")}`;

      setStatus((prev) => ({ ...prev, [mic.id]: msg }));
    } catch (error) {
      setStatus((prev) => ({ ...prev, [mic.id]: error.message || "Upload failed" }));
    }
  };

  // ── WAV encoder ───────────────────────────────────────────────────────────
  const encodeWAV = (audioBuffer, sampleRate) => {
    const length      = audioBuffer.length * audioBuffer.numberOfChannels * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view        = new DataView(arrayBuffer);
    const channels    = [];

    for (let i = 0; i < audioBuffer.numberOfChannels; i++)
      channels.push(audioBuffer.getChannelData(i));

    const writeString = (pos, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
    };
    const setU16 = (p, v) => view.setUint16(p, v, true);
    const setU32 = (p, v) => view.setUint32(p, v, true);

    writeString(0, "RIFF"); setU32(4, length - 8); writeString(8, "WAVE");
    writeString(12, "fmt "); setU32(16, 16); setU16(20, 1);
    setU16(22, audioBuffer.numberOfChannels); setU32(24, sampleRate);
    setU32(28, sampleRate * audioBuffer.numberOfChannels * 2);
    setU16(32, audioBuffer.numberOfChannels * 2); setU16(34, 16);
    writeString(36, "data"); setU32(40, length - 44);

    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
        const s = Math.max(-1, Math.min(1, channels[ch][i])) * 0.8;
        setU16(offset, s < 0 ? s * 0x8000 : s * 0x7fff);
        offset += 2;
      }
    }
    return arrayBuffer;
  };

  // ── Live recording ────────────────────────────────────────────────────────
  const startRecording = async (mic) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus((prev) => ({ ...prev, [mic.id]: "Browser microphone access is not available here." }));
      return;
    }

    try {
      const stream       = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source       = audioContext.createMediaStreamSource(stream);
      const processor    = audioContext.createScriptProcessor(4096, 1, 1);
      const audioChunks  = [];
      let   isRecording  = true;

      processor.onaudioprocess = (ev) => {
        if (!isRecording) return;
        const input = ev.inputBuffer.getChannelData(0);
        audioChunks.push(...input);
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        setLevels((prev) => ({ ...prev, [mic.id]: Math.sqrt(sum / input.length) }));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setRecordingMics((prev) => new Set([...prev, mic.id]));
      setStatus((prev) => ({ ...prev, [mic.id]: "Recording for 6 seconds..." }));

      setTimeout(async () => {
        isRecording = false;
        source.disconnect(); processor.disconnect();
        stream.getTracks().forEach((t) => t.stop());

        setStatus((prev) => ({ ...prev, [mic.id]: "Converting to WAV..." }));

        const audioBuffer = audioContext.createBuffer(1, audioChunks.length, audioContext.sampleRate);
        audioBuffer.getChannelData(0).set(audioChunks);

        // Waveform preview
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 200; canvas.height = 48;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#1f2937"; ctx.fillRect(0, 0, 200, 48);
          ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 1; ctx.beginPath();
          const data = audioBuffer.getChannelData(0);
          const step = Math.max(1, Math.floor(data.length / 200));
          for (let i = 0; i < 200; i++) {
            let s = 0;
            for (let j = 0; j < step; j++) s += Math.abs(data[i * step + j] || 0);
            const y = (1 - s / step) * 48;
            i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
          }
          ctx.stroke();
          setPreviews((prev) => ({ ...prev, [mic.id]: canvas.toDataURL() }));
        } catch (_) { /* preview optional */ }

        const wavData = encodeWAV(audioBuffer, audioContext.sampleRate);
        const file    = new File(
          [new Blob([wavData], { type: "audio/wav" })],
          `${mic.id.toLowerCase()}-${Date.now()}.wav`,
          { type: "audio/wav" }
        );

        setSelectedFiles((prev) => ({ ...prev, [mic.id]: file }));
        setLevels((prev) => ({ ...prev, [mic.id]: 0 }));
        setRecordingMics((prev) => { const s = new Set(prev); s.delete(mic.id); return s; });

        setStatus((prev) => ({ ...prev, [mic.id]: "Auto-uploading..." }));
        await uploadAudio(mic, file);
      }, 6000);

      recordersRef.current[mic.id] = { isRecording: () => isRecording };
    } catch (error) {
      setStatus((prev) => ({ ...prev, [mic.id]: error.message || "Unable to record audio" }));
      setRecordingMics((prev) => { const s = new Set(prev); s.delete(mic.id); return s; });
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-container microphones-page">
      <header className="page-header">
        <h1>Microphones</h1>
        <p>Ward-room simulation, microphone placement, and live pickup status</p>
      </header>

      <div className="microphones-content">
        <section className="ward-lab">
          <div className="ward-lab-header">
            <div>
              <h2>{activeWardName} Ward Room</h2>
              <p>
                Drop microphones into any position — corners, edges, or center — to bring
                them online and start capturing breathing activity.
              </p>
            </div>
            <div className="ward-lab-actions">
              <button className="btn-primary"   onClick={() => onCreateWard?.()}>+ Create Ward</button>
              <button className="btn-secondary" onClick={() => onAddMicrophone?.()}>+ Add Microphone</button>
              <button className="btn-secondary">Calibrate All</button>
            </div>
          </div>

          <div className="ward-studio-grid">
            {/* ── Room layout ──────────────────────────────────────────── */}
            <div className="ward-studio-panel">
              <div className="ward-studio-header">
                <div>
                  <h3>Room Layout</h3>
                  <p>{connectedMicrophones.length} connected · {capturingMicrophones.length} capturing</p>
                </div>
                <span className="studio-chip">Drag to any position</span>
              </div>

              <div className="ward-stage">
                <img src={ward3d} alt="Ward room" className="ward-stage-bg" />

                {/* ── 9-zone drop targets ── */}
                {DROP_ZONES.map(({ zone, label, style }) => (
                  <div
                    key={zone}
                    className="ward-dropzone"
                    style={{ position: "absolute", ...style }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDropZone(e, zone)}
                  >
                    {label}
                  </div>
                ))}

                {/* ── Beds ── */}
                {beds.map((bed, idx) => {
                  const sev = bed.severity >= 0.66 ? "severe" : bed.severity >= 0.33 ? "mild" : "normal";
                  return (
                    <div
                      key={bed.id}
                      className={`ward-bed ${sev}`}
                      style={{ top: bed.top, left: bed.left }}
                      title={bed.id}
                    >
                      <img src={bed3d} alt={bed.id} />
                      <span>{bed.id}</span>
                      <small>{bed.rate} bpm</small>
                      <div className="bed-wave" />
                      <div className="bed-index">{idx + 1}</div>
                    </div>
                  );
                })}

                {/* ── Placed microphones ── */}
                {activeMicrophones.map((mic) => {
                  const zoneEntry = ZONES[mic.zone] ?? ZONES.tray;
                  return (
                    <button
                      key={mic.id}
                      type="button"
                      draggable
                      onDragStart={(e) => handleDragStart(e, mic.id)}
                      onClick={() => onToggleMicrophoneConnection?.(mic.id)}
                      className={`ward-mic ${mic.online ? "online" : "offline"} ${mic.captureAudio ? "capturing" : ""}`}
                      style={{ top: zoneEntry.top, left: zoneEntry.left }}
                      title={`${mic.id} · ${mic.location}`}
                    >
                      <img src={mic3d} alt={mic.id} />
                      <span>{mic.id}</span>
                      <small>{mic.captureAudio ? "Capturing" : mic.online ? "Connected" : "Offline"}</small>
                    </button>
                  );
                })}
              </div>

              {/* ── Hardware tray ── */}
              <div className="ward-tray">
                <div className="ward-studio-header">
                  <div>
                    <h3>Hardware Tray</h3>
                    <p>Drag a microphone to any of the 9 positions on the room map above.</p>
                  </div>
                </div>

                {mics.length === 0 && (
                  <div className="empty-tray">No microphones yet. Add one to begin the simulation.</div>
                )}

                <div className="tray-list">
                  {mics.map((mic) => (
                    <button
                      key={mic.id}
                      type="button"
                      className={`tray-mic ${mic.zone !== "tray" ? "placed" : ""}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, mic.id)}
                      onClick={() => onToggleMicrophoneConnection?.(mic.id)}
                    >
                      <img src={mic3d} alt={mic.id} />
                      <div>
                        <strong>{mic.id}</strong>
                        <span>{mic.location}</span>
                      </div>
                      <em className={`microphone-state ${mic.captureAudio ? "capturing" : mic.online ? "online" : "offline"}`}>
                        {mic.captureAudio ? "Capturing" : mic.online ? "Connected" : "Offline"}
                      </em>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Status sidebar ── */}
            <aside className="ward-status-panel">
              <div className="status-pill-card">
                <strong>{microphones.length}</strong>
                <span>Registered microphones</span>
              </div>
              <div className="status-pill-card">
                <strong>{connectedMicrophones.length}</strong>
                <span>Online now</span>
              </div>
              <div className="status-pill-card">
                <strong>{capturingMicrophones.length}</strong>
                <span>Capturing audio</span>
              </div>

              <div className="status-panel-card">
                <h4>Placement Rules</h4>
                <p>Microphones go live when snapped into a position and connected.</p>
                <ul>
                  <li><strong>NW / NE corners</strong> — upper-quadrant beds</li>
                  <li><strong>SW / SE corners</strong> — lower-quadrant beds</li>
                  <li><strong>N / S edges</strong> — entire top / bottom strip</li>
                  <li><strong>W / E edges</strong> — entire left / right strip</li>
                  <li><strong>Center</strong> — covers all beds in the room</li>
                  <li>Click a microphone to connect or disconnect it.</li>
                </ul>
              </div>

              <div className="status-panel-card">
                <h4>Bed Pickup</h4>
                {beds.slice(0, 4).map((bed) => (
                  <div key={bed.id} className="bed-pick-row">
                    <span>{bed.id}</span>
                    <strong>{bed.rate} bpm</strong>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {/* ── Mic cards ────────────────────────────────────────────────────── */}
        <div className="mics-grid">
          {mics.map((mic) => (
            <div key={mic.id} className="mic-card">
              <div className="mic-card-header">
                <h3>{mic.id}</h3>
                <span className={`status-badge ${mic.captureAudio ? "status-capturing" : mic.online ? "status-online" : "status-offline"}`}>
                  {mic.captureAudio ? "capturing" : mic.online ? "online" : "offline"}
                </span>
              </div>

              {/* Level meter + waveform preview */}
              <div style={{ marginTop: 6 }}>
                <div style={{ height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((levels[mic.id] || 0) * 200))}%`, height: 8, background: "#4caf50" }} />
                </div>
                {previews[mic.id] && (
                  <div style={{ marginTop: 8 }}>
                    <img src={previews[mic.id]} alt="waveform" style={{ width: 200, height: 48, display: "block", borderRadius: 4 }} />
                  </div>
                )}
              </div>

              <p className="mic-location">{mic.location}</p>
              <p className="mic-location">Nearest bed: {mic.nearestBed?.id || "No bed detected"}</p>
              <p className="mic-location">Coverage: {getCoverageBeds(mic).map((b) => b.id).join(", ") || "No bed detected"}</p>
              <p className="mic-location">Primary bed: {pickPrimaryBed(mic)?.id || "No bed detected"}</p>
              <p className="mic-location">Signal estimate: {mic.signal}%</p>

              <div className="mic-metric">
                <label>Signal Strength</label>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${mic.signal}%` }} />
                </div>
                <span>{mic.signal}%</span>
              </div>

              <div className="mic-metric">
                <label>Battery Level</label>
                <div className="metric-bar">
                  <div className="metric-fill" style={{ width: `${mic.battery}%` }} />
                </div>
                <span>{mic.battery}%</span>
              </div>

              <div className="mic-metric">
                <label>Audio File</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSelectedFiles((prev) => ({ ...prev, [mic.id]: file }));
                    setStatus((prev) => ({ ...prev, [mic.id]: `Selected ${file.name}` }));
                  }}
                />
                <span>{selectedFiles[mic.id]?.name || "No file selected"}</span>
              </div>

              <div className="mic-actions">
                <button className="btn-icon" onClick={() => startRecording(mic)} disabled={recordingMics.has(mic.id)}>🎙</button>
                <button className="btn-icon" onClick={() => uploadAudio(mic)}     disabled={recordingMics.has(mic.id)}>⇪</button>
                <button className="btn-icon" onClick={() => onToggleMicrophoneConnection?.(mic.id)}>⟲</button>
                <button className="btn-icon" onClick={() => onRemoveMicrophone?.(mic.id)}>🗑</button>
              </div>

              {status[mic.id] && (
                <p className="mic-location" style={{ marginTop: 10 }}>{status[mic.id]}</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Global settings ───────────────────────────────────────────────── */}
        <section className="mic-settings">
          <h2>Global Settings</h2>
          <div className="settings-form">
            <label><input type="checkbox" defaultChecked /> Auto Calibration</label>
            <label><input type="checkbox" defaultChecked /> Noise Reduction</label>
            <label>
              Sensitivity:
              <input type="range" min="0" max="100" defaultValue="80" />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}