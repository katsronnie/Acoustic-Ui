import { useState, useEffect, useRef } from "react";

/* ─── Breathing states config ───────────────────────────── */
const BREATH_STATES = {
  bad: {
    label: "Critical",
    sublabel: "Rapid & Shallow",
    color: "#ff4d6d",
    glow: "rgba(255,77,109,0.35)",
    bg: "rgba(255,77,109,0.08)",
    border: "rgba(255,77,109,0.35)",
    cycleDuration: 1200,
    chestScale: 0.13,
    waveColor: "rgb(255,77,109)",
    rate: 28,
    desc: "Distress — immediate attention",
    rippleSize: 80,
  },
  moderate: {
    label: "Moderate",
    sublabel: "Slightly Laboured",
    color: "#ffb740",
    glow: "rgba(255,183,64,0.3)",
    bg: "rgba(255,183,64,0.07)",
    border: "rgba(255,183,64,0.35)",
    cycleDuration: 2600,
    chestScale: 0.07,
    waveColor: "rgb(255,183,64)",
    rate: 20,
    desc: "Monitoring — elevated effort",
    rippleSize: 55,
  },
  well: {
    label: "Normal",
    sublabel: "Calm & Deep",
    color: "#00e5a0",
    glow: "rgba(0,229,160,0.25)",
    bg: "rgba(0,229,160,0.07)",
    border: "rgba(0,229,160,0.3)",
    cycleDuration: 4200,
    chestScale: 0.04,
    waveColor: "rgb(0,229,160)",
    rate: 14,
    desc: "Healthy — relaxed rhythm",
    rippleSize: 36,
  },
};

/* ─── Animated wave canvas ───────────────────────────────── */
function LiveWave({ color, speed, amplitude, height = 44 }) {
  const ref = useRef(null);
  const t = useRef(0);
  const raf = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y =
          H / 2 +
          Math.sin((x / W) * Math.PI * 3.5 + t.current * speed * 0.045) * (H * 0.3 * amplitude) +
          Math.sin((x / W) * Math.PI * 7 + t.current * speed * 0.07) * (H * 0.1 * amplitude);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      const rgb = color.replace("rgb(", "").replace(")", "");
      ctx.fillStyle = `rgba(${rgb},0.07)`;
      ctx.fill();
      t.current++;
      raf.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf.current);
  }, [color, speed, amplitude]);
  return (
    <canvas ref={ref} width={300} height={height}
      style={{ width: "100%", height: `${height}px`, display: "block" }} />
  );
}

/* ─── Animated Breathing Person ─────────────────────────── */
function BreathingPerson({ state }) {
  const cfg = BREATH_STATES[state];
  const [phase, setPhase] = useState(0);
  const [inhaling, setInhaling] = useState(true);
  const phaseRef = useRef(0);
  const dirRef = useRef(1);
  const raf = useRef(null);
  const lastTime = useRef(null);

  useEffect(() => {
    const halfCycle = cfg.cycleDuration / 2;
    lastTime.current = null;
    const tick = (ts) => {
      if (!lastTime.current) lastTime.current = ts;
      const dt = Math.min(ts - lastTime.current, 50);
      lastTime.current = ts;
      phaseRef.current += dirRef.current * (dt / halfCycle);
      if (phaseRef.current >= 1) { phaseRef.current = 1; dirRef.current = -1; }
      if (phaseRef.current <= 0) { phaseRef.current = 0; dirRef.current = 1; }
      setPhase(phaseRef.current);
      setInhaling(dirRef.current === 1);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [state, cfg.cycleDuration]);

  const eased = 0.5 - 0.5 * Math.cos(phase * Math.PI);
  const chestExpand = eased * cfg.chestScale;
  const cx = 110;
  const headR = 22, headY = 42;
  const neckTop = headY + headR;
  const shoulderY = neckTop + 16;
  const chestW = 50 + chestExpand * 50;
  const chestH = 62 + chestExpand * 12;
  const chestTop = shoulderY;
  const chestBot = chestTop + chestH;
  const waistY = chestBot + 8;
  const hipY = waistY + 20;
  const shoulderLift = eased * 7;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      {/* Background glow */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 42%, ${cfg.glow} 0%, transparent 60%)`, pointerEvents: "none" }} />

      {/* Ripple rings for bad/moderate */}
      {state !== "well" && [0, 0.4, 0.7].map((off, i) => {
        const p = ((phase + off) % 1);
        const sz = 38 + p * cfg.rippleSize;
        return (
          <div key={i} style={{
            position: "absolute", top: "42%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: sz, height: sz, borderRadius: "50%",
            border: `1.5px solid ${cfg.color}`,
            opacity: (1 - p) * (state === "bad" ? 0.55 : 0.35),
            pointerEvents: "none",
          }} />
        );
      })}

      <svg viewBox="0 0 220 320" width="195" height="285"
        style={{ position: "relative", zIndex: 2, overflow: "visible" }}>
        <defs>
          <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ccdcf5" />
            <stop offset="100%" stopColor="#96b8e4" />
          </linearGradient>
          <radialGradient id="headG" cx="45%" cy="38%">
            <stop offset="0%" stopColor="#e2eeff" />
            <stop offset="100%" stopColor="#adc8f0" />
          </radialGradient>
          <radialGradient id="lungL" cx="50%" cy="50%">
            <stop offset="0%" stopColor={cfg.color} stopOpacity={0.35 + eased * 0.25} />
            <stop offset="100%" stopColor={cfg.color} stopOpacity={0.05} />
          </radialGradient>
          <radialGradient id="lungR" cx="50%" cy="50%">
            <stop offset="0%" stopColor={cfg.color} stopOpacity={0.35 + eased * 0.25} />
            <stop offset="100%" stopColor={cfg.color} stopOpacity={0.05} />
          </radialGradient>
        </defs>

        {/* Exhale breath particles from nose/mouth */}
        {!inhaling && Array.from({ length: state === "bad" ? 7 : state === "moderate" ? 4 : 3 }).map((_, i) => {
          const p2 = (phase + i * 0.18) % 1;
          const ox = (i % 3 - 1) * 5;
          return (
            <ellipse key={i}
              cx={cx + ox}
              cy={headY - headR - 6 - p2 * 28}
              rx={2.5 + p2 * 2} ry={1.8 + p2 * 1.2}
              fill={cfg.color} opacity={(1 - p2) * 0.55} />
          );
        })}

        {/* ── Legs ── */}
        <path d={`M ${cx - 11} ${hipY} L ${cx - 16} ${hipY + 58} L ${cx - 22} ${hipY + 58}`}
          stroke="#96b8e4" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={`M ${cx + 11} ${hipY} L ${cx + 16} ${hipY + 58} L ${cx + 22} ${hipY + 58}`}
          stroke="#96b8e4" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* ── Hip ── */}
        <ellipse cx={cx} cy={hipY} rx={19} ry={11} fill="url(#bodyG)" opacity={0.9} />

        {/* ── Waist ── */}
        <rect x={cx - 16} y={chestBot - 2} width={32} height={14} rx={8} fill="url(#bodyG)" opacity={0.85} />

        {/* ── Chest ── */}
        <rect x={cx - chestW / 2} y={chestTop} width={chestW} height={chestH} rx={15}
          fill="url(#bodyG)"
          style={{ filter: `drop-shadow(0 0 ${3 + eased * 12}px ${cfg.color})` }} />

        {/* Chest inhale glow */}
        <rect x={cx - chestW / 2 + 5} y={chestTop + 5} width={chestW - 10} height={chestH - 10} rx={11}
          fill={cfg.color} opacity={eased * 0.14} />

        {/* Left lung glow */}
        <ellipse cx={cx - 13} cy={chestTop + chestH * 0.44}
          rx={11 + chestExpand * 35} ry={18 + chestExpand * 28}
          fill="url(#lungL)" />
        {/* Right lung glow */}
        <ellipse cx={cx + 13} cy={chestTop + chestH * 0.44}
          rx={11 + chestExpand * 35} ry={18 + chestExpand * 28}
          fill="url(#lungR)" />

        {/* Ribcage lines */}
        {[0.25, 0.45, 0.65].map((r, i) => (
          <path key={i}
            d={`M ${cx - chestW / 2 + 6} ${chestTop + chestH * r} Q ${cx} ${chestTop + chestH * (r + 0.05)} ${cx + chestW / 2 - 6} ${chestTop + chestH * r}`}
            stroke="rgba(140,180,230,0.2)" strokeWidth="1" fill="none" />
        ))}

        {/* ── Arms ── */}
        {/* Left — rises on inhale */}
        <path
          d={`M ${cx - chestW / 2 + 5} ${chestTop + 12 - shoulderLift} Q ${cx - chestW / 2 - 20} ${chestTop + 36} ${cx - chestW / 2 - 12} ${chestBot - 2}`}
          stroke="#96b8e4" strokeWidth="14" strokeLinecap="round" fill="none" />
        {/* Right */}
        <path
          d={`M ${cx + chestW / 2 - 5} ${chestTop + 12 - shoulderLift} Q ${cx + chestW / 2 + 20} ${chestTop + 36} ${cx + chestW / 2 + 12} ${chestBot - 2}`}
          stroke="#96b8e4" strokeWidth="14" strokeLinecap="round" fill="none" />

        {/* ── Neck ── */}
        <rect x={cx - 9} y={neckTop} width={18} height={16} rx={8} fill="url(#headG)" />

        {/* ── Head ── */}
        <circle cx={cx} cy={headY} r={headR} fill="url(#headG)"
          style={{ filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.35))" }} />

        {/* Eyebrows */}
        {state === "bad" && <>
          <path d={`M ${cx - 13} ${headY - 11} L ${cx - 5} ${headY - 9}`} stroke="#2a4a7a" strokeWidth={2.2} strokeLinecap="round" />
          <path d={`M ${cx + 13} ${headY - 11} L ${cx + 5} ${headY - 9}`} stroke="#2a4a7a" strokeWidth={2.2} strokeLinecap="round" />
        </>}
        {state === "moderate" && <>
          <path d={`M ${cx - 12} ${headY - 10} L ${cx - 5} ${headY - 10}`} stroke="#2a4a7a" strokeWidth={1.6} strokeLinecap="round" />
          <path d={`M ${cx + 12} ${headY - 10} L ${cx + 5} ${headY - 10}`} stroke="#2a4a7a" strokeWidth={1.6} strokeLinecap="round" />
        </>}
        {state === "well" && <>
          <path d={`M ${cx - 12} ${headY - 11} Q ${cx - 8} ${headY - 13} ${cx - 4} ${headY - 11}`} stroke="#2a4a7a" strokeWidth={1.4} strokeLinecap="round" fill="none" />
          <path d={`M ${cx + 12} ${headY - 11} Q ${cx + 8} ${headY - 13} ${cx + 4} ${headY - 11}`} stroke="#2a4a7a" strokeWidth={1.4} strokeLinecap="round" fill="none" />
        </>}

        {/* Eyes */}
        <ellipse cx={cx - 8} cy={headY - 4}
          rx={state === "bad" ? 3.8 : 2.6}
          ry={state === "bad" ? 4.2 : state === "moderate" ? 3.2 : 2.8}
          fill="#1e3a6a" />
        <ellipse cx={cx + 8} cy={headY - 4}
          rx={state === "bad" ? 3.8 : 2.6}
          ry={state === "bad" ? 4.2 : state === "moderate" ? 3.2 : 2.8}
          fill="#1e3a6a" />
        {/* Eye shine */}
        <circle cx={cx - 6.5} cy={headY - 5.5} r={1} fill="rgba(255,255,255,0.6)" />
        <circle cx={cx + 9.5} cy={headY - 5.5} r={1} fill="rgba(255,255,255,0.6)" />

        {/* Nose */}
        <path d={`M ${cx - 3} ${headY + 2} Q ${cx} ${headY + 6} ${cx + 3} ${headY + 2}`}
          stroke="#2a4a7a" strokeWidth={1.2} fill="none" strokeLinecap="round" opacity={0.5} />

        {/* Mouth */}
        {state === "bad" && (
          <ellipse cx={cx} cy={headY + 11}
            rx={7 + eased * 4} ry={5 + eased * 3}
            fill="#1e3a6a" opacity={0.75} />
        )}
        {state === "moderate" && (
          <path d={`M ${cx - 7} ${headY + 11} Q ${cx} ${headY + 15} ${cx + 7} ${headY + 11}`}
            stroke="#1e3a6a" strokeWidth={1.6} fill="none" strokeLinecap="round" />
        )}
        {state === "well" && (
          <path d={`M ${cx - 8} ${headY + 9} Q ${cx} ${headY + 16} ${cx + 8} ${headY + 9}`}
            stroke="#1e3a6a" strokeWidth={1.9} fill="none" strokeLinecap="round" />
        )}

        {/* Rate badge above head */}
        <rect x={cx - 30} y={headY - headR - 24} width={60} height={16} rx={8}
          fill="rgba(2,13,36,0.78)" stroke={cfg.color} strokeWidth={1} strokeOpacity={0.55} />
        <text x={cx} y={headY - headR - 12} textAnchor="middle"
          fontSize={8.5} fontWeight="600" fill={cfg.color}
          style={{ fontFamily: "'DM Sans',sans-serif" }}>
          {cfg.rate} br / min
        </text>
      </svg>

      {/* Phase label */}
      <div style={{ position: "relative", zIndex: 3, marginTop: 4, fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: "1px" }}>
        {inhaling ? "↑ INHALING" : "↓ EXHALING"}
      </div>
    </div>
  );
}

/* ─── CSS ─────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --db1:#020d24;--db2:#050f2a;--db3:#081535;--db4:#0b1c44;--db5:#0e2255;
  --accent:#2d7fff;--accent2:#00c4ff;--accent3:#56e0ff;
  --card:#0a1838;--card2:#0d1e48;
  --border:rgba(45,127,255,0.15);--border2:rgba(45,127,255,0.28);
  --text:#dce8ff;--muted:#6a8abf;
  --good:#00e5a0;--warn:#ffb740;--danger:#ff4d6d;
  --fd:'Syne',sans-serif;--fb:'DM Sans',sans-serif;
}
body{font-family:var(--fb);background:var(--db1);color:var(--text)}
.wrap{padding:18px;max-width:1200px;margin:0 auto}
.grid{display:grid;grid-template-columns:1.1fr 1.7fr 1fr;gap:14px}
.tag{font-size:10px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--accent2);margin-bottom:4px}
/* Patient header */
.ph{grid-column:1/3;background:linear-gradient(135deg,var(--db3),var(--db5));border:1px solid var(--border2);border-radius:20px;padding:18px 22px;display:flex;align-items:center;gap:18px;position:relative;overflow:hidden}
.ph::before{content:'';position:absolute;top:-50px;right:-50px;width:200px;height:200px;background:radial-gradient(circle,rgba(45,127,255,0.1),transparent 70%);border-radius:50%;pointer-events:none}
.ava{width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#1a3a7a,#2d5fd0);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:700;font-family:var(--fd);color:#fff;flex-shrink:0;box-shadow:0 0 0 4px rgba(45,127,255,0.1)}
.pi h2{font-family:var(--fd);font-size:20px;font-weight:700;color:#fff;margin-bottom:2px}
.pi .sub{font-size:12px;color:var(--muted)}
.pmeta{display:flex;gap:20px;margin-top:8px;flex-wrap:wrap}
.mi{font-size:11px;color:var(--muted)}.mi span{display:block;color:var(--text);font-weight:500;font-size:12px}
.sbadge{flex-shrink:0;background:rgba(0,229,160,0.1);border:1px solid rgba(0,229,160,0.3);border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;color:var(--good);display:flex;align-items:center;gap:6px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
.sdot{width:7px;height:7px;border-radius:50%;background:var(--good);animation:pulse 2s infinite}
/* Appt */
.ac{background:var(--db3);border:1px solid var(--border2);border-radius:20px;padding:16px 18px;display:flex;flex-direction:column;justify-content:space-between}
.adate{font-family:var(--fd);font-size:21px;font-weight:700;color:#fff;margin:5px 0 2px}
.atime{font-size:13px;color:var(--accent2)}
.adoc{display:flex;align-items:center;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}
.dava{width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#1a3a7a,#2d5fd0);border:1.5px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.dinfo{font-size:12px;color:var(--muted)}.dinfo b{display:block;color:var(--text);font-size:13px;font-weight:500}
/* Breath panel */
.bpanel{grid-column:1/2;grid-row:2/4;background:var(--db3);border:1px solid var(--border2);border-radius:20px;display:flex;flex-direction:column;overflow:hidden;min-height:520px}
.bpanel-top{padding:14px 16px 0;display:flex;align-items:center;justify-content:space-between}
.state-tabs{display:flex;gap:5px}
.stab{padding:5px 11px;border-radius:10px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid transparent;background:rgba(255,255,255,0.04);color:var(--muted);transition:all .2s;font-family:var(--fb)}
.ab{background:rgba(255,77,109,0.13);border-color:rgba(255,77,109,0.4);color:#ff4d6d}
.am{background:rgba(255,183,64,0.11);border-color:rgba(255,183,64,0.4);color:#ffb740}
.aw{background:rgba(0,229,160,0.09);border-color:rgba(0,229,160,0.35);color:#00e5a0}
.bperson-area{flex:1;position:relative;min-height:320px}
.bpanel-bot{padding:12px 14px;background:rgba(2,13,36,0.6);border-top:1px solid var(--border)}
.bstats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
.bstat{text-align:center;border-right:1px solid var(--border)}.bstat:last-child{border-right:none}
.bsval{font-family:var(--fd);font-size:17px;font-weight:700;color:#fff}
.bslbl{font-size:10px;color:var(--muted);margin-top:2px}
/* Breath analytics */
.ba{grid-column:2/3;grid-row:2/3;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:15px 17px}
.stitle{font-family:var(--fd);font-size:14px;font-weight:600;color:#fff;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.stitle::after{content:'';flex:1;height:1px;background:var(--border)}
.wbox{background:var(--db2);border:1px solid var(--border);border-radius:12px;padding:10px 13px;margin-bottom:10px}
.wlbl{display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:7px}
.wlbl span{font-size:13px;font-weight:600}
.brow{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:10px}
.bcard{background:var(--db3);border:1px solid var(--border);border-radius:11px;padding:11px 13px}
.bcval{font-family:var(--fd);font-size:24px;font-weight:700;line-height:1;margin:3px 0 2px}
.bclbl{font-size:11px;color:var(--muted)}
.bdg{display:inline-block;margin-top:4px;font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px}
.ok{background:rgba(0,229,160,0.1);color:var(--good);border:1px solid rgba(0,229,160,0.28)}
.warn{background:rgba(255,183,64,0.1);color:var(--warn);border:1px solid rgba(255,183,64,0.28)}
.bad{background:rgba(255,77,109,0.1);color:var(--danger);border:1px solid rgba(255,77,109,0.28)}
/* Vitals */
.vc{grid-column:3/4;grid-row:2/3;display:flex;flex-direction:column;gap:9px}
.vm{flex:1;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:11px 15px;display:flex;align-items:center;gap:11px}
.vic{width:36px;height:36px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.vnum{font-family:var(--fd);font-size:21px;font-weight:700;line-height:1}
.vunit{font-size:11px;font-weight:400;color:var(--muted);margin-left:2px}
.vlbl{font-size:11px;color:var(--muted);margin-top:2px}
.vt{font-size:10px;margin-top:3px}
/* Diag + Meds */
.dc{grid-column:2/3;grid-row:3/4;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:15px 17px}
.mc{grid-column:3/4;grid-row:3/4;background:var(--card);border:1px solid var(--border);border-radius:20px;padding:15px 17px}
.dlist,.mlist{display:flex;flex-direction:column;gap:7px;margin-top:9px}
.di,.mi2{display:flex;align-items:center;justify-content:space-between;padding:9px 11px;background:var(--db3);border-radius:11px;border:1px solid var(--border)}
.mi2{justify-content:flex-start;gap:9px}
.dn{font-size:13px;font-weight:500;color:var(--text)}
.ds{font-size:11px;color:var(--muted);margin-top:1px}
.mico{width:28px;height:28px;border-radius:7px;background:rgba(45,127,255,0.1);border:1px solid rgba(45,127,255,0.22);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mn{font-size:12px;font-weight:500;color:var(--text)}
.md{font-size:10px;color:var(--muted);margin-top:1px}
.mpct{margin-left:auto;font-size:12px;font-weight:600;text-align:right}
.pb{width:42px;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;margin-top:4px}
.pf{height:100%;border-radius:2px}
`;

/* ─── Severity to Breathing State Mapper ─────────────────── */
function mapSeverityToBreathState(severity) {
  if (severity === undefined || severity === null) return "well";
  if (severity >= 0.66) return "bad";
  if (severity >= 0.33) return "moderate";
  return "well";
}

/* ─── Dashboard ──────────────────────────────────────────── */
export default function RespiratoryPatientProfile({ patient = {} }) {
  if (!patient || !patient.id) {
    return (
      <div style={{ padding: "20px", color: "#dce8ff", textAlign: "center" }}>
        No patient selected
      </div>
    );
  }

  // Auto-set breathing state from patient severity
  const autoBreathState = mapSeverityToBreathState(patient.severity);
  const [breathState, setBreathState] = useState(autoBreathState);
  const cfg = BREATH_STATES[breathState];

  useEffect(() => {
    setBreathState(mapSeverityToBreathState(patient.severity));
  }, [patient.severity, patient.id]);

  // Extract patient initials
  const initials = patient.id ? patient.id.substring(0, 2).toUpperCase() : "??";
  const patientName = patient.name || patient.id || "Patient";
  const patientAge = patient.age || "N/A";
  const patientGender = patient.gender || "Unknown";
  const patientBlood = patient.bloodType || "Unknown";
  const patientCondition = patient.condition || "Under observation";
  const patientRate = patient.rate || cfg.rate;
  const patientSeverity = patient.severity !== undefined ? (patient.severity * 100).toFixed(0) : "N/A";
  const patientConfidence = patient.confidence !== undefined ? patient.confidence : "N/A";
  const breathingPattern = patient.breathingPattern || "Regular";

  return (
    <>
      <style>{CSS}</style>
      <div className="wrap">
        <div className="grid">

          {/* Patient Header */}
          <div className="ph">
            <div className="ava">{initials}</div>
            <div className="pi">
              <div className="tag">Respiratory Patient Profile</div>
              <h2>{patientName}</h2>
              <div className="sub">ID: {patient.id || "N/A"} &nbsp;·&nbsp; {patientGender}, {patientAge} yrs &nbsp;·&nbsp; Blood: {patientBlood}</div>
              <div className="pmeta">
                <div className="mi"><span>Condition</span>{patientCondition}</div>
                <div className="mi"><span>Breathing Pattern</span>{breathingPattern}</div>
                <div className="mi"><span>Severity</span>{patientSeverity}%</div>
                <div className="mi"><span>Confidence</span>{patientConfidence}%</div>
              </div>
            </div>
            <div className="sbadge"><div className="sdot" />{patient.severity !== undefined && patient.severity < 0.33 ? "Stable" : patient.severity !== undefined && patient.severity >= 0.66 ? "Critical" : "Monitor"}</div>
          </div>

          {/* Appointment */}
          <div className="ac">
            <div>
              <div className="tag">Bed Location</div>
              <div className="adate">Bed {patient.bedNumber || patient.id}</div>
              <div className="atime">Ward: {patient.wardSection || "Standard"}</div>
            </div>
            <div className="adoc">
              <div className="dava">MD</div>
              <div className="dinfo"><b>Medical Staff</b>{patient.source === "mic" ? "Mic Source" : "Simulated"}</div>
            </div>
          </div>

          {/* Breathing Person Panel */}
          <div className="bpanel">
            <div className="bpanel-top">
              <div className="tag" style={{ marginBottom: 0 }}>Live Breathing Simulation</div>
              <div className="state-tabs">
                <button className={`stab${breathState === "bad" ? " ab" : ""}`} onClick={() => setBreathState("bad")}>Critical</button>
                <button className={`stab${breathState === "moderate" ? " am" : ""}`} onClick={() => setBreathState("moderate")}>Moderate</button>
                <button className={`stab${breathState === "well" ? " aw" : ""}`} onClick={() => setBreathState("well")}>Normal</button>
              </div>
            </div>
            <div style={{ padding: "8px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }} />
              <span style={{ fontSize: 12, color: cfg.color, fontWeight: 500 }}>{cfg.desc}</span>
            </div>
            <div className="bperson-area">
              <BreathingPerson state={breathState} />
            </div>
            <div className="bpanel-bot">
              <div className="bstats">
                <div className="bstat">
                  <div className="bsval" style={{ color: cfg.color }}>{patientRate}</div>
                  <div className="bslbl">br / min</div>
                </div>
                <div className="bstat">
                  <div className="bsval">{patient.oxygenLevel || "98"}%</div>
                  <div className="bslbl">O₂ Sat</div>
                </div>
                <div className="bstat">
                  <div className="bsval" style={{ color: cfg.color }}>{cfg.label}</div>
                  <div className="bslbl">Status</div>
                </div>
              </div>
            </div>
          </div>

          {/* Breathing Analytics */}
          <div className="ba">
            <div className="stitle">Breathing Analytics</div>
            <div className="wbox">
              <div className="wlbl">
                <span>Respiratory Waveform</span>
                <span style={{ color: cfg.color }}>{patientRate} br/min</span>
              </div>
              <LiveWave
                color={cfg.waveColor}
                speed={breathState === "bad" ? 2.4 : breathState === "moderate" ? 1.5 : 0.85}
                amplitude={breathState === "bad" ? 1.3 : breathState === "moderate" ? 0.9 : 0.55}
              />
            </div>
            <div className="wbox" style={{ marginBottom: 0 }}>
              <div className="wlbl">
                <span>O₂ / CO₂ Exchange</span>
                <span style={{ color: "#00e5a0" }}>Normal</span>
              </div>
              <LiveWave color="rgb(0,229,160)" speed={0.7} amplitude={0.6} />
            </div>
            <div className="brow">
              {[
                { lbl: "Tidal Volume", val: "0.52", unit: "L", col: "#56e0ff", cls: "ok", badge: "Normal" },
                { lbl: "Peak Flow", val: "310", unit: "L/m", col: "#ffb740", cls: "warn", badge: "Below avg" },
                { lbl: "FEV1 Score", val: "62", unit: "%", col: "#ff4d6d", cls: "bad", badge: "Reduced" },
                { lbl: "I/E Ratio", val: "1.2", unit: "x", col: "#00e5a0", cls: "ok", badge: "Balanced" },
              ].map((m, i) => (
                <div className="bcard" key={i}>
                  <div className="bclbl">{m.lbl}</div>
                  <div className="bcval" style={{ color: m.col }}>{m.val}<span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 2 }}>{m.unit}</span></div>
                  <div className={`bdg ${m.cls}`}>{m.badge}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vitals */}
          <div className="vc">
            {[
              { lbl: "Heart Rate", val: patient.heartRate || "110", unit: "bpm", col: "#ff7d94", bg: "rgba(255,77,109,0.1)", bc: "rgba(255,77,109,0.22)", trend: patient.heartRate && patient.heartRate > 100 ? "↑ Elevated" : "Normal", tc: patient.heartRate && patient.heartRate > 100 ? "var(--danger)" : "var(--good)" },
              { lbl: "Temperature", val: patient.temperature || "36.8", unit: "°C", col: "#ffb740", bg: "rgba(255,183,64,0.09)", bc: "rgba(255,183,64,0.22)", trend: patient.temperature && patient.temperature < 36.5 ? "~ Low" : "Normal", tc: patient.temperature && patient.temperature < 36.5 ? "var(--warn)" : "var(--good)" },
              { lbl: "Blood Oxygen", val: patient.oxygenLevel || "98", unit: "%", col: "#00e5a0", bg: "rgba(0,229,160,0.09)", bc: "rgba(0,229,160,0.22)", trend: "↑ Normal", tc: "var(--good)" },
              { lbl: "Resp. Rate", val: `${patientRate}`, unit: "br/m", col: cfg.color, bg: cfg.bg, bc: cfg.border, trend: cfg.sublabel, tc: cfg.color },
            ].map((v, i) => (
              <div className="vm" key={i}>
                <div className="vic" style={{ background: v.bg, border: `1px solid ${v.bc}` }}>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="5" stroke={v.col} strokeWidth="1.5" fill="none" />
                    <circle cx="7.5" cy="7.5" r="2.5" fill={v.col} opacity="0.6" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="vlbl">{v.lbl}</div>
                  <div className="vnum" style={{ color: v.col }}>{v.val}<span className="vunit">{v.unit}</span></div>
                </div>
                <div className="vt" style={{ color: v.tc }}>{v.trend}</div>
              </div>
            ))}
          </div>

          {/* Diagnoses */}
          <div className="dc">
            <div className="tag">Status</div>
            <div className="dlist">
              {[
                { name: patientCondition, sub: breathingPattern, sev: patient.severity !== undefined && patient.severity >= 0.66 ? "Severe" : patient.severity !== undefined && patient.severity >= 0.33 ? "Moderate" : "Mild", cls: patient.severity !== undefined && patient.severity >= 0.66 ? "bad" : patient.severity !== undefined && patient.severity >= 0.33 ? "warn" : "ok" },
              ].map((d, i) => (
                <div className="di" key={i}>
                  <div><div className="dn">{d.name}</div><div className="ds">{d.sub}</div></div>
                  <div className={`bdg ${d.cls}`}>{d.sev}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Medications / Recommendations */}
          <div className="mc">
            <div className="tag">Recommendations</div>
            <div className="mlist">
              {[
                { name: "Monitor Vitals", dose: "Continuous — every 30min", pct: 85, col: "#00e5a0" },
                { name: "Respiratory Support", dose: "As prescribed — PRN", pct: patient.severity !== undefined && patient.severity >= 0.66 ? 95 : 70, col: patient.severity !== undefined && patient.severity >= 0.66 ? "#ff4d6d" : "#ffb740" },
                { name: "Oxygen Therapy", dose: "Standby — if needed", pct: patient.severity !== undefined && patient.severity >= 0.33 ? 75 : 40, col: patient.severity !== undefined && patient.severity >= 0.33 ? "#ffb740" : "#00e5a0" },
              ].map((m, i) => (
                <div className="mi2" key={i}>
                  <div className="mico">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="4.5" stroke="#2d7fff" strokeWidth="1.2" fill="none" />
                      <rect x="3" y="5.5" width="6" height="1" rx="0.5" fill="#2d7fff" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mn">{m.name}</div>
                    <div className="md">{m.dose}</div>
                  </div>
                  <div className="mpct">
                    <span style={{ color: m.col }}>{m.pct}%</span>
                    <div className="pb"><div className="pf" style={{ width: `${m.pct}%`, background: m.col }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}