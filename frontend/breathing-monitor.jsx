import { useState, useEffect, useRef, useCallback } from "react";

// ─── Clinical constants ───────────────────────────────────────────────────────
const NORMAL_MIN = 12, NORMAL_MAX = 20;
const WARN_MIN = 8, WARN_MAX = 25;
const CONDITIONS = ["Post-op","Pneumonia","COPD","Asthma","Trauma","Heart Failure","Bronchitis","Sepsis","Other"];
let ptCounter = 5000;
const newPtId = () => `PT-${++ptCounter}`;
const today = () => new Date().toISOString().slice(0,10);
let bedCounter = 5;
const newBedId = () => `B${++bedCounter}`;
let micCounter = 1;
const newMicId = () => `MIC-${++micCounter}`;

// ─── Default layout ───────────────────────────────────────────────────────────
const DEFAULT_ROOM = { w: 320, h: 260 };
const DEFAULT_MICS = [{ micId:"MIC-1", x:160, y:130 }];
const DEFAULT_BEDS = [
  { bedId:"B1", label:"Bed 1", x:50,  y:40,  angle:0   },
  { bedId:"B2", label:"Bed 2", x:270, y:40,  angle:0   },
  { bedId:"B3", label:"Bed 3", x:270, y:218, angle:180 },
  { bedId:"B4", label:"Bed 4", x:50,  y:218, angle:180 },
  { bedId:"B5", label:"Bed 5", x:160, y:228, angle:180 },
];
const INITIAL_OCCUPANTS = {
  "B1":{ patientId:"PT-2841", age:67, gender:"F", condition:"Post-op",   admitDate:"2026-02-18" },
  "B2":{ patientId:"PT-3305", age:45, gender:"M", condition:"Pneumonia", admitDate:"2026-02-27" },
  "B3":{ patientId:"PT-1192", age:72, gender:"F", condition:"COPD",      admitDate:"2026-02-20" },
  "B4":null,
  "B5":{ patientId:"PT-4471", age:34, gender:"F", condition:"Trauma",    admitDate:"2026-03-01" },
};
const INITIAL_RATES = { "B1":16, "B2":22, "B3":14, "B4":null, "B5":11 };

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getStatus = r => r===null?"vacant":r<WARN_MIN||r>WARN_MAX?"critical":r<NORMAL_MIN||r>NORMAL_MAX?"warning":"normal";
const statusColor = s => ({
  critical:{ text:"#ff3b5c", bg:"rgba(255,59,92,0.09)",  border:"#ff3b5c" },
  warning: { text:"#ffb347", bg:"rgba(255,179,71,0.09)", border:"#ffb347" },
  vacant:  { text:"#3a4d66", bg:"rgba(58,77,102,0.07)",  border:"#3a4d66" },
  normal:  { text:"#00e5a0", bg:"rgba(0,229,160,0.07)",  border:"#00e5a0" },
}[s]||{ text:"#00e5a0", bg:"rgba(0,229,160,0.07)", border:"#00e5a0" });

// Best signal from any mic
function bestSignal(bed, mics, room) {
  if (!mics.length) return 0.1;
  const diag = Math.sqrt(room.w*room.w + room.h*room.h);
  return Math.max(...mics.map(m => {
    const d = Math.sqrt((bed.x-m.x)**2+(bed.y-m.y)**2);
    return Math.max(0.1, 1 - d/(diag/2));
  }));
}
// Per-mic signal (for display)
function micSignal(bed, mic, room) {
  const diag = Math.sqrt(room.w*room.w + room.h*room.h);
  const d = Math.sqrt((bed.x-mic.x)**2+(bed.y-mic.y)**2);
  return Math.max(0.1, 1 - d/(diag/2));
}
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const MARGIN = 24;

// ─── BreathingWave ────────────────────────────────────────────────────────────
function BreathingWave({ rate, status, width=120, height=40 }) {
  const cvRef=useRef(null), offRef=useRef(0), fRef=useRef(null);
  const col = statusColor(status).text;
  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return;
    const ctx=cv.getContext("2d"), spd=((rate||15)/15)*1.5;
    const draw=()=>{
      ctx.clearRect(0,0,width,height);
      ctx.beginPath(); ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.shadowColor=col; ctx.shadowBlur=4;
      for(let x=0;x<=width;x++){const t=(x/width)*Math.PI*4+offRef.current; const y=height/2-Math.sin(t)*(height*.35); x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.stroke(); offRef.current+=spd*.04; fRef.current=requestAnimationFrame(draw);
    };
    draw(); return ()=>cancelAnimationFrame(fRef.current);
  },[rate,col,width,height]);
  return <canvas ref={cvRef} width={width} height={height} style={{display:"block"}}/>;
}

// ─── MiniSparkline ────────────────────────────────────────────────────────────
function MiniSparkline({ history, status }) {
  const w=80,h=28, vals=(history||[]).filter(v=>v!==null);
  if(vals.length<2) return <svg width={w} height={h}/>;
  const mn=Math.min(...vals)-2, mx=Math.max(...vals)+2;
  const pts=(history||[]).map((v,i)=>v===null?null:`${(i/(history.length-1))*w},${h-((v-mn)/(mx-mn))*h}`).filter(Boolean).join(" ");
  const col=statusColor(status).text;
  return(<svg width={w} height={h}><polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeOpacity=".7"/><circle cx={w} cy={h-((vals[vals.length-1]-mn)/(mx-mn))*h} r="2.5" fill={col}/></svg>);
}

// ─── Room Map (monitor view) ──────────────────────────────────────────────────
function RoomMap({ room, beds, mics, rates, occupants, selected, onSelect }) {
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const iv=setInterval(()=>setTick(t=>t+1),700); return ()=>clearInterval(iv); },[]);
  const VW=room.w, VH=room.h;
  return (
    <div style={{background:"#0a0e15",border:"1px solid #1a2130",borderRadius:14,padding:"14px 16px"}}>
      <div style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Room Layout · Ward C</div>
      <svg width="100%" viewBox={`-8 -8 ${VW+16} ${VH+68}`} style={{display:"block",overflow:"visible"}}>
        <defs>
          {mics.map(m=>(
            <radialGradient key={m.micId} id={`mg-${m.micId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.22"/>
              <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0"/>
            </radialGradient>
          ))}
          {beds.map(bed=>{
            const s=getStatus(rates[bed.bedId]); const c=statusColor(s).text; const sg=bestSignal(bed,mics,room);
            return(<radialGradient key={bed.bedId} id={`bgg-${bed.bedId}`} cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor={c} stopOpacity={occupants[bed.bedId]?sg*.28:.07}/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>);
          })}
        </defs>
        {/* Room */}
        <rect x={2} y={2} width={VW-4} height={VH-4} rx={10} fill="#0d1421" stroke="#1e2d40" strokeWidth="1.5"/>
        {[VW/4,VW/2,VW*3/4].map((x,i)=><line key={i} x1={x} y1={2} x2={x} y2={VH-2} stroke="#1a2535" strokeWidth=".5"/>)}
        {[VH/4,VH/2,VH*3/4].map((y,i)=><line key={i} x1={2} y1={y} x2={VW-2} y2={y} stroke="#1a2535" strokeWidth=".5"/>)}
        <rect x={VW/2-14} y={2} width={28} height={5} rx={2} fill="#0d1421" stroke="#2a3a50" strokeWidth="1"/>
        <text x={VW/2} y={6.5} textAnchor="middle" fill="#2a3a50" fontSize="5" fontFamily="monospace">DOOR</text>
        {/* Signal lines from nearest mic */}
        {beds.map(bed=>{
          const occ=occupants[bed.bedId]; const s=getStatus(rates[bed.bedId]); const c=statusColor(s).text; const isSel=selected===bed.bedId;
          const sg=bestSignal(bed,mics,room);
          // find nearest mic
          const nearMic=mics.length?mics.reduce((a,b)=>Math.hypot(bed.x-a.x,bed.y-a.y)<Math.hypot(bed.x-b.x,bed.y-b.y)?a:b):null;
          return nearMic?<line key={bed.bedId} x1={nearMic.x} y1={nearMic.y} x2={bed.x} y2={bed.y}
            stroke={c} strokeWidth={isSel?1.6:.8} strokeOpacity={occ?(isSel?.9:sg*.4):.1} strokeDasharray="4 3" style={{transition:"stroke-opacity .3s"}}/>:null;
        })}
        {/* Mics */}
        {mics.map((m,mi)=>(
          <g key={m.micId}>
            <circle cx={m.x} cy={m.y} r={30} fill={`url(#mg-${m.micId})`}/>
            {[16,34,55].map((r,i)=>(
              <circle key={r} cx={m.x} cy={m.y} r={r} fill="none" stroke="#4fc3f7" strokeWidth=".6"
                strokeOpacity={Math.max(0,.18-i*.04)*(0.5+0.5*Math.sin(tick*.9-i*1.1))}/>
            ))}
            <circle cx={m.x} cy={m.y} r={11} fill="#0a0e15" stroke="#4fc3f7" strokeWidth="1.5"/>
            <circle cx={m.x} cy={m.y} r={5} fill="#4fc3f7" fillOpacity=".9"/>
            <text x={m.x} y={m.y+20} textAnchor="middle" fill="#4fc3f7" fontSize="6" fontFamily="monospace" opacity=".7">{m.micId}</text>
          </g>
        ))}
        {/* Beds */}
        {beds.map(bed=>{
          const occ=occupants[bed.bedId]; const rate=rates[bed.bedId];
          const s=getStatus(rate); const c=statusColor(s); const isSel=selected===bed.bedId;
          const sg=bestSignal(bed,mics,room); const pulse=s==="critical"; const vacant=!occ;
          return(
            <g key={bed.bedId} onClick={()=>onSelect(bed.bedId)} style={{cursor:"pointer"}}>
              <circle cx={bed.x} cy={bed.y} r={22} fill={`url(#bgg-${bed.bedId})`} opacity={isSel?1:.7}/>
              <rect x={bed.x-16} y={bed.y-10} width={32} height={20} rx={4}
                fill={vacant?"#0d1421":(isSel?c.bg.replace(".09",".2"):c.bg)}
                stroke={c.text} strokeWidth={isSel?1.6:.8} strokeOpacity={vacant?.3:(isSel?1:.55)}
                strokeDasharray={vacant?"4,3":"none"} transform={`rotate(${bed.angle},${bed.x},${bed.y})`}/>
              {!vacant&&<rect x={bed.x-13} y={bed.y-7} width={10} height={14} rx={2} fill={c.text} fillOpacity=".2" transform={`rotate(${bed.angle},${bed.x},${bed.y})`}/>}
              {!vacant&&<circle cx={bed.x+13} cy={bed.y-9} r={3.5} fill={c.text} opacity={pulse?(0.5+0.5*Math.sin(tick*2)):.9}/>}
              <text x={bed.x} y={bed.y+23} textAnchor="middle" fill={c.text} fontSize="7.5" fontFamily="monospace" fontWeight="bold" opacity={isSel?1:.8}>{bed.bedId}</text>
              <text x={bed.x} y={bed.y+31} textAnchor="middle" fill={vacant?"#3a4d66":c.text} fontSize="5.5" fontFamily="monospace" opacity=".65">{vacant?"VACANT":occ.patientId}</text>
              {!vacant&&<><rect x={bed.x-15} y={bed.y+34} width={30} height={11} rx={3} fill={isSel?c.bg.replace(".09",".28"):"#0a0e15"} stroke={c.text} strokeWidth=".6" strokeOpacity=".5"/>
              <text x={bed.x} y={bed.y+42} textAnchor="middle" fill={c.text} fontSize="6.5" fontFamily="monospace">{rate!==null?Math.round(rate)+" br":"--"}</text></>}
              {!vacant&&[0,1,2,3].map(i=><rect key={i} x={bed.x-7+i*4} y={bed.y+49-i*2} width={2.5} height={2+i*2} rx={1} fill={c.text} fillOpacity={sg>(i/4)?.85:.15}/>)}
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex",gap:10,marginTop:8,paddingTop:8,borderTop:"1px solid #1a2130",flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:"50%",background:"#4fc3f7",boxShadow:"0 0 6px #4fc3f7"}}/><span style={{color:"#4a5568",fontSize:9,fontFamily:"'DM Mono',monospace"}}>Mic</span></div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:14,height:9,border:"1px dashed #3a4d66",borderRadius:2}}/><span style={{color:"#4a5568",fontSize:9,fontFamily:"'DM Mono',monospace"}}>Vacant</span></div>
      </div>
    </div>
  );
}

// ─── Arrange Mode ─────────────────────────────────────────────────────────────
function ArrangePanel({ room, beds, mics, onBedMove, onBedRotate, onBedAdd, onBedRemove,
                         onMicMove, onMicAdd, onMicRemove, onRoomChange, onDone, onReset }) {
  const svgRef = useRef(null);
  const dragging = useRef(null); // { type:"bed"|"mic", id, offX, offY }
  const [activeTool, setActiveTool] = useState("move"); // "move" | "addBed" | "addMic" | "delete"
  const [tick, setTick] = useState(0);
  useEffect(()=>{ const iv=setInterval(()=>setTick(t=>t+1),700); return ()=>clearInterval(iv); },[]);

  const svgPt = (cx,cy) => {
    const svg=svgRef.current; if(!svg) return {x:cx,y:cy};
    const pt=svg.createSVGPoint(); pt.x=cx; pt.y=cy;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };

  const startDrag = (e, type, id) => {
    if(activeTool!=="move") return;
    e.preventDefault(); e.stopPropagation();
    const src = type==="bed"?beds.find(b=>b.bedId===id):mics.find(m=>m.micId===id);
    const p=svgPt(e.clientX??e.touches?.[0]?.clientX, e.clientY??e.touches?.[0]?.clientY);
    const ox=type==="bed"?p.x-src.x:p.x-src.x, oy=type==="bed"?p.y-src.y:p.y-src.y;
    dragging.current={type,id,offX:ox,offY:oy};
  };

  const onMove = useCallback(e=>{
    if(!dragging.current) return;
    const cl=e.touches?e.touches[0]:e;
    const p=svgPt(cl.clientX,cl.clientY);
    const x=clamp(p.x-dragging.current.offX, MARGIN, room.w-MARGIN);
    const y=clamp(p.y-dragging.current.offY, MARGIN, room.h-MARGIN);
    if(dragging.current.type==="bed") onBedMove(dragging.current.id,x,y);
    else onMicMove(dragging.current.id,x,y);
  },[onBedMove,onMicMove,room]);

  const stopDrag = useCallback(()=>{ dragging.current=null; },[]);

  const handleSvgClick = e => {
    if(activeTool==="move") return;
    const p=svgPt(e.clientX,e.clientY);
    const x=clamp(p.x,MARGIN,room.w-MARGIN), y=clamp(p.y,MARGIN,room.h-MARGIN);
    if(activeTool==="addBed") onBedAdd(x,y);
    if(activeTool==="addMic") onMicAdd(x,y);
  };

  const handleItemClick = (e,type,id) => {
    if(activeTool!=="delete") return;
    e.stopPropagation();
    if(type==="bed") onBedRemove(id);
    if(type==="mic") onMicRemove(id);
  };

  const VW=room.w, VH=room.h;

  const toolBtn = (tool, label, col="#4fc3f7") => (
    <button onClick={()=>setActiveTool(tool)} style={{
      padding:"6px 12px", borderRadius:7, fontFamily:"'DM Mono',monospace", fontSize:9, cursor:"pointer", letterSpacing:1,
      background:activeTool===tool?`rgba(${col==="red"?"255,59,92":col==="#ffb347"?"255,179,71":"79,195,247"},0.18)`:"#141b26",
      border:`1px solid ${activeTool===tool?(col==="red"?"#ff3b5c":col==="#ffb347"?"#ffb347":"#4fc3f7"):"#2a3a50"}`,
      color:activeTool===tool?(col==="red"?"#ff3b5c":col==="#ffb347"?"#ffb347":"#4fc3f7"):"#6b7a8d",
      fontWeight:activeTool===tool?700:400,
    }}>{label}</button>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Toolbar */}
      <div style={{background:"#0d1421",border:"1px solid #4fc3f733",borderRadius:12,padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{color:"#4fc3f7",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase"}}>Layout Editor · Ward C</div>
            <div style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:8,marginTop:2}}>
              {activeTool==="move"?"Drag beds & mics to reposition · ↻ to rotate":
               activeTool==="addBed"?"Click anywhere in the room to place a new bed":
               activeTool==="addMic"?"Click anywhere in the room to place a new microphone":
               "Click a bed or mic to remove it (vacant beds only)"}
            </div>
          </div>
          <div style={{display:"flex",gap:7}}>
            <button onClick={onReset} style={{background:"rgba(255,179,71,0.08)",border:"1px solid #ffb34744",borderRadius:7,padding:"5px 11px",color:"#ffb347",fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer"}}>RESET</button>
            <button onClick={onDone}  style={{background:"rgba(0,229,160,0.12)",border:"1px solid #00e5a0",  borderRadius:7,padding:"5px 11px",color:"#00e5a0", fontFamily:"'DM Mono',monospace",fontSize:9,cursor:"pointer",fontWeight:700}}>SAVE ✓</button>
          </div>
        </div>
        {/* Tool row */}
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {toolBtn("move",   "✥ MOVE")}
          {toolBtn("addBed", "+ BED")}
          {toolBtn("addMic", "+ MIC")}
          {toolBtn("delete", "✕ REMOVE","red")}
        </div>
        {/* Room size */}
        <div style={{display:"flex",gap:12,alignItems:"center",paddingTop:10,borderTop:"1px solid #1a2535"}}>
          <span style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,textTransform:"uppercase",whiteSpace:"nowrap"}}>Room Size</span>
          <div style={{display:"flex",gap:8,flex:1}}>
            {[{label:"Width",key:"w",min:180,max:600},{label:"Height",key:"h",min:160,max:500}].map(f=>(
              <div key={f.key} style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:8}}>{f.label}</span>
                  <span style={{color:"#4fc3f7",fontFamily:"'DM Mono',monospace",fontSize:8}}>{room[f.key]}px</span>
                </div>
                <input type="range" min={f.min} max={f.max} step={10} value={room[f.key]}
                  onChange={e=>onRoomChange({...room,[f.key]:Number(e.target.value)})}
                  style={{width:"100%",accentColor:"#4fc3f7",cursor:"pointer"}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            {[{label:"Small",w:240,h:200},{label:"Medium",w:320,h:260},{label:"Large",w:480,h:360},{label:"XL",w:560,h:420}].map(p=>(
              <button key={p.label} onClick={()=>onRoomChange({w:p.w,h:p.h})}
                style={{padding:"4px 9px",background:room.w===p.w&&room.h===p.h?"rgba(79,195,247,0.15)":"#141b26",
                  border:`1px solid ${room.w===p.w&&room.h===p.h?"#4fc3f7":"#2a3a50"}`,borderRadius:6,
                  color:room.w===p.w&&room.h===p.h?"#4fc3f7":"#6b7a8d",fontFamily:"'DM Mono',monospace",fontSize:8,cursor:"pointer"}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{background:"#0a0e15",border:"1px solid #4fc3f733",borderRadius:14,padding:"14px 16px",overflowX:"auto"}}>
        <svg ref={svgRef} width={Math.max(VW+20,300)} height={VH+20}
          viewBox={`-10 -10 ${VW+20} ${VH+20}`}
          style={{display:"block",touchAction:"none",userSelect:"none",
            cursor:activeTool==="move"?"default":activeTool==="delete"?"crosshair":"copy"}}
          onClick={handleSvgClick}
          onMouseMove={onMove} onMouseUp={stopDrag} onMouseLeave={stopDrag}
          onTouchMove={e=>{e.preventDefault();onMove(e);}} onTouchEnd={stopDrag}>
          <defs>
            {mics.map(m=>(
              <radialGradient key={m.micId} id={`amg-${m.micId}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#4fc3f7" stopOpacity="0.18"/>
                <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0"/>
              </radialGradient>
            ))}
          </defs>
          {/* Room outline */}
          <rect x={2} y={2} width={VW-4} height={VH-4} rx={10}
            fill="#0d1421" stroke="#4fc3f766" strokeWidth="1.5" strokeDasharray="6,4"/>
          {/* Grid */}
          {[VW/4,VW/2,VW*3/4].map((x,i)=><line key={i} x1={x} y1={2} x2={x} y2={VH-2} stroke="#1a2535" strokeWidth=".5"/>)}
          {[VH/4,VH/2,VH*3/4].map((y,i)=><line key={i} x1={2} y1={y} x2={VW-2} y2={y} stroke="#1a2535" strokeWidth=".5"/>)}
          {/* Door */}
          <rect x={VW/2-14} y={2} width={28} height={5} rx={2} fill="#0d1421" stroke="#2a3a50" strokeWidth="1"/>
          <text x={VW/2} y={6.5} textAnchor="middle" fill="#2a3a50" fontSize="5" fontFamily="monospace">DOOR</text>
          {/* Signal lines */}
          {beds.map(bed=>{
            const nearMic=mics.length?mics.reduce((a,b)=>Math.hypot(bed.x-a.x,bed.y-a.y)<Math.hypot(bed.x-b.x,bed.y-b.y)?a:b):null;
            return nearMic?<line key={bed.bedId} x1={nearMic.x} y1={nearMic.y} x2={bed.x} y2={bed.y}
              stroke="#4fc3f7" strokeWidth=".6" strokeOpacity=".2" strokeDasharray="3,4"/>:null;
          })}
          {/* Mics */}
          {mics.map(m=>(
            <g key={m.micId}
              onMouseDown={e=>startDrag(e,"mic",m.micId)}
              onTouchStart={e=>startDrag(e,"mic",m.micId)}
              onClick={e=>handleItemClick(e,"mic",m.micId)}
              style={{cursor:activeTool==="delete"?"crosshair":activeTool==="move"?"grab":"default"}}>
              <circle cx={m.x} cy={m.y} r={30} fill={`url(#amg-${m.micId})`}/>
              {[16,34].map((r,i)=>(
                <circle key={r} cx={m.x} cy={m.y} r={r} fill="none" stroke="#4fc3f7" strokeWidth=".5"
                  strokeOpacity={Math.max(0,.15-i*.04)*(0.5+0.5*Math.sin(tick*.8-i))}/>
              ))}
              <circle cx={m.x} cy={m.y} r={12} fill="#0d1421"
                stroke={activeTool==="delete"?"#ff3b5c":"#4fc3f7"} strokeWidth="1.5"/>
              <circle cx={m.x} cy={m.y} r={5} fill={activeTool==="delete"?"#ff3b5c":"#4fc3f7"} fillOpacity=".9"/>
              <text x={m.x} y={m.y+22} textAnchor="middle" fill="#4fc3f7" fontSize="6" fontFamily="monospace" opacity=".8">{m.micId}</text>
              {activeTool==="delete"&&<text x={m.x} y={m.y+3} textAnchor="middle" fill="#ff3b5c" fontSize="9" fontFamily="monospace">✕</text>}
            </g>
          ))}
          {/* Beds */}
          {beds.map(bed=>{
            const sg=bestSignal(bed,mics,room); const isDelete=activeTool==="delete";
            return(
              <g key={bed.bedId}
                onMouseDown={e=>startDrag(e,"bed",bed.bedId)}
                onTouchStart={e=>startDrag(e,"bed",bed.bedId)}
                onClick={e=>handleItemClick(e,"bed",bed.bedId)}
                style={{cursor:isDelete?"crosshair":activeTool==="move"?"grab":"default"}}>
                <rect x={bed.x-18} y={bed.y-12} width={36} height={24} rx={5}
                  fill="#141b26" stroke={isDelete?"#ff3b5c":"#2a3a55"} strokeWidth={isDelete?1.5:1}
                  transform={`rotate(${bed.angle},${bed.x},${bed.y})`}/>
                <rect x={bed.x-15} y={bed.y-9} width={12} height={18} rx={2}
                  fill="#4fc3f7" fillOpacity=".12" transform={`rotate(${bed.angle},${bed.x},${bed.y})`}/>
                {isDelete
                  ?<text x={bed.x} y={bed.y+4} textAnchor="middle" fill="#ff3b5c" fontSize="9">✕</text>
                  :<text x={bed.x} y={bed.y+4} textAnchor="middle" fill="#a0b8cc" fontSize="8" fontFamily="monospace" fontWeight="bold">{bed.bedId}</text>
                }
                <text x={bed.x} y={bed.y+23} textAnchor="middle" fill="#4fc3f7" fontSize="6.5" fontFamily="monospace" opacity=".6">{Math.round(sg*100)}%</text>
                {/* Rotate btn */}
                {activeTool==="move"&&(
                  <g onClick={e=>{e.stopPropagation();onBedRotate(bed.bedId);}} style={{cursor:"pointer"}}>
                    <circle cx={bed.x+20} cy={bed.y-15} r={8} fill="#141b26" stroke="#2a3a55" strokeWidth="1"/>
                    <text x={bed.x+20} y={bed.y-12} textAnchor="middle" fontSize="8" fill="#4fc3f7">↻</text>
                  </g>
                )}
              </g>
            );
          })}
          {/* "click to place" hint overlay */}
          {(activeTool==="addBed"||activeTool==="addMic")&&(
            <rect x={2} y={2} width={VW-4} height={VH-4} rx={10} fill="transparent"
              stroke={activeTool==="addMic"?"#4fc3f7":"#00e5a0"} strokeWidth="1.5" strokeDasharray="5,5"/>
          )}
        </svg>
      </div>
    </div>
  );
}

// ─── Admit Modal ──────────────────────────────────────────────────────────────
function AdmitModal({ bed, onConfirm, onCancel }) {
  const [form,setForm]=useState({patientId:newPtId(),age:"",gender:"M",condition:CONDITIONS[0]});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#0d1421",border:"1px solid #1e2d40",borderRadius:16,padding:28,width:340,display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <div style={{color:"#4fc3f7",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase"}}>Admit Patient</div>
          <div style={{color:"#f0f4f8",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,marginTop:4}}>{bed.label} · Ward C</div>
        </div>
        {[{label:"Patient ID",key:"patientId",type:"text"},{label:"Age",key:"age",type:"number"}].map(f=>(
          <div key={f.key}>
            <div style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{f.label}</div>
            <input type={f.type} value={form[f.key]} onChange={e=>set(f.key,e.target.value)}
              style={{width:"100%",background:"#141b26",border:"1px solid #2a3a50",borderRadius:8,padding:"8px 12px",color:"#e8ecf0",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none"}}/>
          </div>
        ))}
        <div>
          <div style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Gender</div>
          <div style={{display:"flex",gap:8}}>
            {["M","F","Other"].map(g=>(
              <button key={g} onClick={()=>set("gender",g)} style={{flex:1,padding:"7px 0",background:form.gender===g?"#1e3a50":"#141b26",border:`1px solid ${form.gender===g?"#4fc3f7":"#2a3a50"}`,borderRadius:8,color:form.gender===g?"#4fc3f7":"#6b7a8d",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer"}}>{g}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Condition</div>
          <select value={form.condition} onChange={e=>set("condition",e.target.value)}
            style={{width:"100%",background:"#141b26",border:"1px solid #2a3a50",borderRadius:8,padding:"8px 12px",color:"#e8ecf0",fontFamily:"'DM Mono',monospace",fontSize:12,outline:"none"}}>
            {CONDITIONS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px 0",background:"#141b26",border:"1px solid #2a3a50",borderRadius:10,color:"#6b7a8d",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>form.age&&onConfirm({...form,admitDate:today()})}
            style={{flex:2,padding:"10px 0",background:"rgba(0,229,160,0.12)",border:"1px solid #00e5a0",borderRadius:10,color:"#00e5a0",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",fontWeight:700}}>
            Admit Patient →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Discharge Modal ──────────────────────────────────────────────────────────
function DischargeModal({ bed, occupant, onConfirm, onCancel }) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"#0d1421",border:"1px solid #ff3b5c44",borderRadius:16,padding:28,width:320,display:"flex",flexDirection:"column",gap:16}}>
        <div>
          <div style={{color:"#ff3b5c",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase"}}>Discharge Patient</div>
          <div style={{color:"#f0f4f8",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,marginTop:4}}>{bed.label} · {occupant.patientId}</div>
          <div style={{color:"#6b7a8d",fontFamily:"'DM Mono',monospace",fontSize:11,marginTop:4}}>{occupant.age}y · {occupant.gender} · {occupant.condition}<br/>Admitted: {occupant.admitDate}</div>
        </div>
        <div style={{background:"rgba(255,59,92,0.07)",border:"1px solid #ff3b5c33",borderRadius:10,padding:"12px 14px",color:"#ff3b5c",fontFamily:"'DM Mono',monospace",fontSize:11}}>
          Confirm discharge? This clears the bed and stops monitoring.
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onCancel} style={{flex:1,padding:"10px 0",background:"#141b26",border:"1px solid #2a3a50",borderRadius:10,color:"#6b7a8d",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer"}}>Cancel</button>
          <button onClick={onConfirm} style={{flex:2,padding:"10px 0",background:"rgba(255,59,92,0.12)",border:"1px solid #ff3b5c",borderRadius:10,color:"#ff3b5c",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",fontWeight:700}}>Confirm Discharge →</button>
        </div>
      </div>
    </div>
  );
}

// ─── Bed Card ─────────────────────────────────────────────────────────────────
function BedCard({ bed, occupant, rate, history, onClick, selected, onAdmit, onDischarge, mics, room }) {
  const s=getStatus(rate), c=statusColor(s), pulse=s==="critical", vacant=!occupant;
  const sg=bestSignal(bed,mics,room);
  return(
    <div onClick={onClick} style={{background:selected?"rgba(255,255,255,0.04)":c.bg,border:`1px solid ${selected?c.text:c.border+(vacant?"33":"55")}`,borderStyle:vacant?"dashed":"solid",borderRadius:12,padding:"14px 16px",cursor:"pointer",transition:"all 0.2s",boxShadow:selected?`0 0 20px ${c.text}33`:"none",animation:pulse?"pulseCard 1.5s ease-in-out infinite":"none"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{color:"#f0f4f8",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15}}>{bed.bedId}</span>
            <span style={{color:"#3a4555",fontSize:10,fontFamily:"'DM Mono',monospace"}}>·</span>
            <span style={{color:"#4a5568",fontSize:10,fontFamily:"'DM Mono',monospace"}}>{bed.label}</span>
          </div>
          {vacant
            ?<div style={{color:"#3a4d66",fontFamily:"'DM Mono',monospace",fontSize:10,marginTop:3}}>— VACANT —</div>
            :<><div style={{color:c.text,fontFamily:"'DM Mono',monospace",fontSize:11,fontWeight:"bold",marginTop:2}}>{occupant.patientId}</div>
               <div style={{color:"#4a5568",fontSize:10,fontFamily:"'DM Mono',monospace",marginTop:1}}>{occupant.age}y · {occupant.gender} · {occupant.condition}</div>
               <div style={{color:"#2a3a50",fontSize:9,fontFamily:"'DM Mono',monospace",marginTop:1}}>Admitted: {occupant.admitDate}</div>
             </>
          }
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
          {!vacant&&<><div style={{width:7,height:7,borderRadius:"50%",background:c.text,boxShadow:`0 0 6px ${c.text}`,animation:pulse?"blinkDot 1s ease-in-out infinite":"none"}}/>
            <div style={{display:"flex",alignItems:"flex-end",gap:1.5}}>
              {[0,1,2,3].map(i=><div key={i} style={{width:3,height:4+i*2,background:c.text,borderRadius:1,opacity:sg>(i/4)?.85:.15}}/>)}
            </div>
          </>}
        </div>
      </div>
      {vacant
        ?<button onClick={e=>{e.stopPropagation();onAdmit();}} style={{width:"100%",padding:"9px 0",background:"rgba(0,229,160,0.06)",border:"1px dashed #00e5a044",borderRadius:8,color:"#00e5a066",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",marginTop:4}}>+ Admit Patient</button>
        :<div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{color:c.text,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:28,lineHeight:1}}>{rate!==null?Math.round(rate):"--"}</span>
              <span style={{color:c.text,opacity:.6,fontSize:10,fontFamily:"'DM Mono',monospace"}}>br/min</span>
            </div>
            <div style={{display:"inline-block",marginTop:5,background:c.bg,border:`1px solid ${c.border}44`,borderRadius:4,padding:"2px 7px",color:c.text,fontSize:9,fontFamily:"'DM Mono',monospace",textTransform:"uppercase",letterSpacing:1}}>{s}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
            <BreathingWave rate={rate} status={s} width={90} height={28}/>
            <MiniSparkline history={history} status={s}/>
          </div>
        </div>
      }
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ bed, occupant, rate, history, onClose, onDischarge, mics, room }) {
  const s=getStatus(rate), c=statusColor(s);
  const w=300,h=90, vals=(history||[]).filter(v=>v!==null);
  const mn=vals.length?Math.min(...vals)-3:0, mx=vals.length?Math.max(...vals)+3:30;
  const pts=(history||[]).map((v,i)=>v===null?null:`${(i/((history||[]).length-1))*w},${h-((v-mn)/(mx-mn))*h}`).filter(Boolean).join(" ");
  const fillPts=`0,${h} ${pts} ${w},${h}`;
  const sg=bestSignal(bed,mics,room);
  return(
    <div style={{background:"#0d1117",border:`1px solid ${c.text}44`,borderRadius:16,padding:20,boxShadow:`0 0 40px ${c.text}22`,display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
            <span style={{color:"#f0f4f8",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22}}>{bed.bedId}</span>
            <span style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:11}}>/ {bed.label} · Ward C</span>
          </div>
          <div style={{color:c.text,fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:"bold"}}>{occupant.patientId}</div>
          <div style={{color:"#6b7a8d",fontFamily:"'DM Mono',monospace",fontSize:11,marginTop:2}}>{occupant.age}y · {occupant.gender} · {occupant.condition} · Admitted {occupant.admitDate}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onDischarge} style={{background:"rgba(255,59,92,0.08)",border:"1px solid #ff3b5c44",color:"#ff3b5c",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1}}>DISCHARGE</button>
          <button onClick={onClose} style={{background:"none",border:"1px solid #2a3040",color:"#6b7a8d",borderRadius:8,padding:"5px 10px",cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10}}>✕</button>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
        {[{label:"Rate",val:`${rate!==null?Math.round(rate):"--"}`,unit:"br/min",hi:true},{label:"Status",val:s.toUpperCase(),unit:"",hi:true},
          {label:"24h Avg",val:vals.length?`${Math.round(vals.reduce((a,b)=>a+b,0)/vals.length)}`:"--",unit:"br/min",hi:false},
          {label:"Signal",val:`${Math.round(sg*100)}%`,unit:"",hi:false}].map(item=>(
          <div key={item.label} style={{background:"#141b26",borderRadius:8,padding:"10px 12px",border:"1px solid #1e2737"}}>
            <div style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:2,textTransform:"uppercase",marginBottom:3}}>{item.label}</div>
            <div style={{color:item.hi?c.text:"#e8ecf0",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>{item.val}<span style={{fontSize:9,opacity:.6}}>{item.unit&&" "+item.unit}</span></div>
          </div>
        ))}
      </div>
      {vals.length>1&&(
        <div>
          <div style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Rate History</div>
          <svg width="100%" viewBox={`0 0 ${w} ${h+6}`} preserveAspectRatio="none" style={{display:"block"}}>
            <defs><linearGradient id="dpg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={c.text} stopOpacity=".22"/><stop offset="100%" stopColor={c.text} stopOpacity=".01"/></linearGradient></defs>
            <rect x={0} y={h-((NORMAL_MAX-mn)/(mx-mn))*h} width={w} height={((NORMAL_MAX-NORMAL_MIN)/(mx-mn))*h} fill="rgba(0,229,160,0.05)"/>
            <polygon points={fillPts} fill="url(#dpg)"/>
            <polyline points={pts} fill="none" stroke={c.text} strokeWidth="2"/>
            {[NORMAL_MIN,NORMAL_MAX].map(v=>{const y=h-((v-mn)/(mx-mn))*h; return <line key={v} x1={0} y1={y} x2={w} y2={y} stroke="#00e5a0" strokeWidth=".5" strokeDasharray="4,4" strokeOpacity=".3"/>;  })}
          </svg>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
            <span style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:8}}>60 readings ago</span>
            <span style={{color:c.text,fontFamily:"'DM Mono',monospace",fontSize:8}}>● NOW</span>
          </div>
        </div>
      )}
      <div>
        <div style={{color:"#4a5568",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Live Waveform</div>
        <div style={{background:"#0a0e15",borderRadius:8,padding:"8px 12px",border:"1px solid #1e2737"}}><BreathingWave rate={rate||15} status={s} width={260} height={50}/></div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [room,     setRoom]     = useState(DEFAULT_ROOM);
  const [beds,     setBeds]     = useState(DEFAULT_BEDS);
  const [mics,     setMics]     = useState(DEFAULT_MICS);
  const [savedLayout, setSaved] = useState({ room:DEFAULT_ROOM, beds:DEFAULT_BEDS, mics:DEFAULT_MICS });
  const [arrangeMode, setArrangeMode] = useState(false);

  const [occupants, setOccupants] = useState(INITIAL_OCCUPANTS);
  const [rates,     setRates]     = useState(INITIAL_RATES);
  const [histories, setHistories] = useState(()=>{
    const h={};
    DEFAULT_BEDS.forEach(b=>{const base=INITIAL_RATES[b.bedId]; h[b.bedId]=base!==null?Array.from({length:60},(_,i)=>Math.round(base+Math.sin(i*.3)*2+(Math.random()-.5)*2)):Array(60).fill(null);});
    return h;
  });
  const [selected,     setSelected]     = useState(null);
  const [alerts,       setAlerts]       = useState([]);
  const [time,         setTime]         = useState(new Date());
  const [admitFor,     setAdmitFor]     = useState(null);
  const [dischargeFor, setDischargeFor] = useState(null);

  // Live monitoring
  useEffect(()=>{
    if(arrangeMode) return;
    const iv=setInterval(()=>{
      setTime(new Date());
      setRates(prev=>{
        const next={...prev}, na=[];
        beds.forEach(b=>{
          if(!occupants[b.bedId]){next[b.bedId]=null;return;}
          let r=Math.max(4,Math.min(35,(prev[b.bedId]??15)+(Math.random()-.5)*1.5));
          r=Math.round(r*10)/10; next[b.bedId]=r;
          if(getStatus(prev[b.bedId])!=="critical"&&getStatus(r)==="critical")
            na.push({id:Date.now()+b.bedId,bedId:b.bedId,patientId:occupants[b.bedId]?.patientId,rate:r,time:new Date().toLocaleTimeString()});
        });
        if(na.length) setAlerts(a=>[...na,...a].slice(0,5));
        return next;
      });
      setHistories(prev=>{
        const next={...prev};
        beds.forEach(b=>{ next[b.bedId]=[...(prev[b.bedId]||[]).slice(1), occupants[b.bedId]?(rates[b.bedId]??null):null]; });
        return next;
      });
    },1200);
    return ()=>clearInterval(iv);
  },[arrangeMode,occupants,rates,beds]);

  // Layout callbacks
  const handleBedMove   = useCallback((id,x,y)=>setBeds(p=>p.map(b=>b.bedId===id?{...b,x:Math.round(x),y:Math.round(y)}:b)),[]);
  const handleBedRotate = useCallback(id=>setBeds(p=>p.map(b=>b.bedId===id?{...b,angle:(b.angle+90)%360}:b)),[]);
  const handleMicMove   = useCallback((id,x,y)=>setMics(p=>p.map(m=>m.micId===id?{...m,x:Math.round(x),y:Math.round(y)}:m)),[]);

  const handleBedAdd = (x,y) => {
    const id=newBedId(); const num=beds.length+1;
    setBeds(p=>[...p,{bedId:id,label:`Bed ${num}`,x:Math.round(x),y:Math.round(y),angle:0}]);
    setOccupants(p=>({...p,[id]:null}));
    setRates(p=>({...p,[id]:null}));
    setHistories(p=>({...p,[id]:Array(60).fill(null)}));
  };
  const handleBedRemove = id => {
    if(occupants[id]) return; // safety: only remove vacant
    setBeds(p=>p.filter(b=>b.bedId!==id));
    setOccupants(p=>{const n={...p};delete n[id];return n;});
    setRates(p=>{const n={...p};delete n[id];return n;});
    setHistories(p=>{const n={...p};delete n[id];return n;});
    if(selected===id) setSelected(null);
  };
  const handleMicAdd    = (x,y) => setMics(p=>[...p,{micId:newMicId(),x:Math.round(x),y:Math.round(y)}]);
  const handleMicRemove = id    => { if(mics.length<=1) return; setMics(p=>p.filter(m=>m.micId!==id)); };

  const enterArrange = () => { setSaved({room,beds,mics}); setSelected(null); setArrangeMode(true); };
  const exitArrange  = () => setArrangeMode(false);
  const resetLayout  = () => { setRoom(savedLayout.room); setBeds(savedLayout.beds); setMics(savedLayout.mics); };

  const handleAdmit = (bedId, form) => {
    setOccupants(p=>({...p,[bedId]:{patientId:form.patientId,age:parseInt(form.age),gender:form.gender,condition:form.condition,admitDate:form.admitDate}}));
    setRates(p=>({...p,[bedId]:15+(Math.random()-.5)*4}));
    setHistories(p=>({...p,[bedId]:Array(60).fill(null)}));
    setAdmitFor(null);
  };
  const handleDischarge = bedId => {
    setOccupants(p=>({...p,[bedId]:null})); setRates(p=>({...p,[bedId]:null}));
    setHistories(p=>({...p,[bedId]:Array(60).fill(null)}));
    setSelected(null); setDischargeFor(null);
  };

  const occupied  = beds.filter(b=>occupants[b.bedId]).length;
  const critCount = beds.filter(b=>getStatus(rates[b.bedId])==="critical").length;
  const warnCount = beds.filter(b=>getStatus(rates[b.bedId])==="warning").length;

  return(
    <div style={{minHeight:"100vh",background:"#080c12",fontFamily:"'DM Mono',monospace",color:"#e8ecf0",display:"flex",flexDirection:"column"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0d1117} ::-webkit-scrollbar-thumb{background:#1e2737;border-radius:2px}
        @keyframes pulseCard{0%,100%{box-shadow:0 0 0 rgba(255,59,92,0)}50%{box-shadow:0 0 18px rgba(255,59,92,.25)}}
        @keyframes blinkDot{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        input:focus,select:focus{border-color:#4fc3f7!important}
        input[type=range]{height:3px;border-radius:2px}
      `}</style>

      {/* Modals */}
      {admitFor&&<AdmitModal bed={beds.find(b=>b.bedId===admitFor)} onConfirm={d=>handleAdmit(admitFor,d)} onCancel={()=>setAdmitFor(null)}/>}
      {dischargeFor&&occupants[dischargeFor]&&<DischargeModal bed={beds.find(b=>b.bedId===dischargeFor)} occupant={occupants[dischargeFor]} onConfirm={()=>handleDischarge(dischargeFor)} onCancel={()=>setDischargeFor(null)}/>}

      {/* Header */}
      <div style={{background:"#0d1117",borderBottom:`1px solid ${arrangeMode?"#4fc3f733":"#1a2130"}`,padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:"#00e5a0",boxShadow:"0 0 10px #00e5a0"}}/>
          <span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:"#f0f4f8",letterSpacing:1}}>RESPIRA</span>
          <span style={{color:"#3a4555",fontSize:10}}>/ WARD C · BREATHING MONITOR</span>
          {arrangeMode&&<span style={{background:"rgba(79,195,247,0.12)",border:"1px solid #4fc3f744",borderRadius:6,padding:"2px 9px",color:"#4fc3f7",fontSize:10,marginLeft:4}}>LAYOUT EDITOR</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {!arrangeMode&&<>
            <span style={{color:"#4a5568",fontSize:10}}>{occupied}/{beds.length} beds · {mics.length} mic{mics.length!==1?"s":""}</span>
            <span style={{background:"rgba(255,59,92,0.1)",border:"1px solid #ff3b5c44",borderRadius:6,padding:"2px 9px",color:"#ff3b5c",fontSize:10}}>● {critCount} CRITICAL</span>
            <span style={{background:"rgba(255,179,71,0.1)",border:"1px solid #ffb34744",borderRadius:6,padding:"2px 9px",color:"#ffb347",fontSize:10}}>● {warnCount} WARNING</span>
            <span style={{color:"#4a5568",fontSize:10}}>{time.toLocaleTimeString()}</span>
          </>}
          {!arrangeMode
            ?<button onClick={enterArrange} style={{background:"rgba(79,195,247,0.08)",border:"1px solid #4fc3f744",borderRadius:8,padding:"5px 14px",color:"#4fc3f7",fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",letterSpacing:1}}>⊞ LAYOUT EDITOR</button>
            :<button onClick={exitArrange}  style={{background:"rgba(0,229,160,0.1)", border:"1px solid #00e5a0",   borderRadius:8,padding:"5px 14px",color:"#00e5a0", fontFamily:"'DM Mono',monospace",fontSize:10,cursor:"pointer",fontWeight:700}}>✓ SAVE & EXIT</button>
          }
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* LEFT: alert log */}
        {!arrangeMode&&(
          <div style={{width:182,background:"#0a0e15",borderRight:"1px solid #1a2130",padding:14,display:"flex",flexDirection:"column",gap:7,overflowY:"auto",flexShrink:0}}>
            <div style={{color:"#3a4555",fontSize:8,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Alert Log</div>
            {alerts.length===0&&<div style={{color:"#2a3040",fontSize:10}}>No alerts yet</div>}
            {alerts.map(a=>(
              <div key={a.id} style={{background:"rgba(255,59,92,0.07)",border:"1px solid #ff3b5c33",borderRadius:8,padding:"7px 9px",animation:"slideIn .3s ease"}}>
                <div style={{color:"#ff3b5c",fontSize:8,letterSpacing:1}}>CRITICAL</div>
                <div style={{color:"#e8ecf0",fontSize:12,fontFamily:"'Syne',sans-serif",fontWeight:700,marginTop:1}}>{a.bedId}</div>
                <div style={{color:"#6b7a8d",fontSize:9}}>{a.patientId}</div>
                <div style={{color:"#6b7a8d",fontSize:9}}>{a.rate} br/min</div>
                <div style={{color:"#3a4555",fontSize:8,marginTop:1}}>{a.time}</div>
              </div>
            ))}
          </div>
        )}

        {/* CENTRE */}
        <div style={{flex:1,padding:16,overflowY:"auto"}}>
          {arrangeMode?(
            <ArrangePanel room={room} beds={beds} mics={mics}
              onBedMove={handleBedMove} onBedRotate={handleBedRotate}
              onBedAdd={handleBedAdd} onBedRemove={handleBedRemove}
              onMicMove={handleMicMove} onMicAdd={handleMicAdd} onMicRemove={handleMicRemove}
              onRoomChange={setRoom} onDone={exitArrange} onReset={resetLayout}/>
          ):(
            <div style={{display:"grid",gridTemplateColumns:selected&&occupants[selected]?"1fr 1.5fr":"repeat(auto-fill,minmax(255px,1fr))",gap:12,alignItems:"start"}}>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {beds.map(b=>(
                  <BedCard key={b.bedId} bed={b} occupant={occupants[b.bedId]} rate={rates[b.bedId]}
                    history={histories[b.bedId]} mics={mics} room={room}
                    onClick={()=>setSelected(s=>s===b.bedId?null:b.bedId)} selected={selected===b.bedId}
                    onAdmit={()=>setAdmitFor(b.bedId)} onDischarge={()=>setDischargeFor(b.bedId)}/>
                ))}
              </div>
              {selected&&occupants[selected]&&(
                <DetailPanel bed={beds.find(b=>b.bedId===selected)} occupant={occupants[selected]}
                  rate={rates[selected]} history={histories[selected]} mics={mics} room={room}
                  onClose={()=>setSelected(null)} onDischarge={()=>setDischargeFor(selected)}/>
              )}
            </div>
          )}
        </div>

        {/* RIGHT panel */}
        <div style={{width:315,background:"#0a0e15",borderLeft:"1px solid #1a2130",padding:14,display:"flex",flexDirection:"column",gap:14,overflowY:"auto",flexShrink:0}}>
          {!arrangeMode?(
            <>
              <RoomMap room={room} beds={beds} mics={mics} rates={rates} occupants={occupants}
                selected={selected} onSelect={id=>setSelected(s=>s===id?null:id)}/>
              <div style={{color:"#3a4555",fontSize:8,letterSpacing:2,textTransform:"uppercase"}}>Ward Summary</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{label:"Occupied",val:`${occupied}/${beds.length}`,col:"#e8ecf0"},{label:"Vacant",val:beds.length-occupied,col:"#3a4d66"},{label:"Warning",val:warnCount,col:"#ffb347"},{label:"Critical",val:critCount,col:"#ff3b5c"}].map(item=>(
                  <div key={item.label} style={{background:"#0d1117",borderRadius:8,padding:"9px 11px",border:"1px solid #1e2737"}}>
                    <div style={{color:"#3a4555",fontSize:8,letterSpacing:1,textTransform:"uppercase"}}>{item.label}</div>
                    <div style={{color:item.col,fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:22,lineHeight:1.2}}>{item.val}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:"auto",color:"#2a3040",fontSize:8,lineHeight:1.8}}>Normal: 12–20 br/min<br/>Warning: 8–11 / 21–25<br/>Critical: &lt;8 / &gt;25</div>
            </>
          ):(
            // Signal guide in arrange mode
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{color:"#4fc3f7",fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:2,textTransform:"uppercase"}}>Signal Guide</div>
              <div style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:8,lineHeight:1.7}}>
                Each bed shows signal from its nearest mic. Add more mics to cover larger rooms.
              </div>
              <div style={{display:"flex",gap:6,marginBottom:4}}>
                <div style={{background:"#0d1117",borderRadius:7,padding:"7px 10px",border:"1px solid #1e2737",flex:1,textAlign:"center"}}>
                  <div style={{color:"#4a5568",fontSize:7,letterSpacing:1,textTransform:"uppercase"}}>Beds</div>
                  <div style={{color:"#e8ecf0",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20}}>{beds.length}</div>
                </div>
                <div style={{background:"#0d1117",borderRadius:7,padding:"7px 10px",border:"1px solid #1e2737",flex:1,textAlign:"center"}}>
                  <div style={{color:"#4a5568",fontSize:7,letterSpacing:1,textTransform:"uppercase"}}>Mics</div>
                  <div style={{color:"#4fc3f7",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:20}}>{mics.length}</div>
                </div>
                <div style={{background:"#0d1117",borderRadius:7,padding:"7px 10px",border:"1px solid #1e2737",flex:1,textAlign:"center"}}>
                  <div style={{color:"#4a5568",fontSize:7,letterSpacing:1,textTransform:"uppercase"}}>Room</div>
                  <div style={{color:"#a0b8cc",fontFamily:"'DM Mono',monospace",fontSize:10,marginTop:2}}>{room.w}×{room.h}</div>
                </div>
              </div>
              {beds.map(b=>{
                const sg=bestSignal(b,mics,room), pct=Math.round(sg*100);
                const bc=sg>.7?"#00e5a0":sg>.45?"#ffb347":"#ff3b5c";
                const nearMic=mics.length?mics.reduce((a,m)=>Math.hypot(b.x-a.x,b.y-a.y)<Math.hypot(b.x-m.x,b.y-m.y)?a:m):null;
                return(
                  <div key={b.bedId} style={{background:"#0d1117",borderRadius:8,padding:"9px 11px",border:"1px solid #1e2737"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <div>
                        <span style={{color:"#4fc3f7",fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:"bold"}}>{b.bedId}</span>
                        {nearMic&&<span style={{color:"#3a4555",fontFamily:"'DM Mono',monospace",fontSize:7,marginLeft:5}}>→ {nearMic.micId}</span>}
                      </div>
                      <span style={{color:bc,fontFamily:"'DM Mono',monospace",fontSize:9}}>{pct}%</span>
                    </div>
                    <div style={{background:"#1a2535",borderRadius:3,height:3,overflow:"hidden"}}>
                      <div style={{width:`${pct}%`,height:"100%",background:bc,borderRadius:3,transition:"width .3s"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{marginTop:4,color:"#2a3040",fontSize:7,lineHeight:1.8}}>&gt;70% — strong<br/>&gt;45% — acceptable<br/>&lt;45% — move bed or add mic</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
