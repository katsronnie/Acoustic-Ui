import React, { useEffect, useState } from "react";
import "./App.css";
import lungs from "./assets/lungs.svg";
import DashboardPage from "./pages/DashboardPage";
import RespiratoryPatientProfile from "./RespiratoryPatientProfile";
import WardMap from "./pages/WardMap";
import Patients from "./pages/Patients";
import Alerts from "./pages/Alerts";
import TrendsAndReports from "./pages/TrendsAndReports";
import Microphones from "./pages/Microphones";
import SystemStatus from "./pages/SystemStatus";
import Settings from "./pages/Settings";

const wardCornerPositions = {
  north: { top: "8%", left: "50%" },
  east: { top: "50%", left: "92%" },
  south: { top: "92%", left: "50%" },
  west: { top: "50%", left: "8%" },
  tray: { top: "50%", left: "50%" },
};

function getWardName(index) {
  return index <= 26 ? `Ward ${String.fromCharCode(64 + index)}` : `Ward ${index}`;
}

function createMicrophone(id, wardId, overrides = {}) {
  return {
    id,
    wardId,
    zone: "tray",
    connected: false,
    top: wardCornerPositions.tray.top,
    left: wardCornerPositions.tray.left,
    ...overrides,
  };
}

function snapToZone(zone) {
  return wardCornerPositions[zone] || wardCornerPositions.tray;
}

// Initial layout
const initialBeds = [
  { id: "Bed 1", top: "12%", left: "14%" },
  { id: "Bed 2", top: "12%", left: "37%" },
  { id: "Bed 3", top: "12%", left: "59%" },
  { id: "Bed 4", top: "12%", left: "81%" },
  { id: "Bed 5", top: "60%", left: "14%" },
  { id: "Bed 6", top: "60%", left: "37%" },
  { id: "Bed 7", top: "60%", left: "59%" },
  { id: "Bed 8", top: "60%", left: "81%" },
];

const patientNames = ["William Nakamura", "Sarah Chen", "Robert Johnson", "Maria Garcia", "James Wilson", "Emily Davis", "Michael Brown", "Jessica Martinez"];
const patientAges = [47, 52, 38, 61, 44, 35, 56, 42];
const patientGenders = ["Male", "Female", "Male", "Female", "Male", "Female", "Male", "Female"];
const patientConditions = ["COPD Stage II", "Asthma", "Pneumonia", "Bronchitis", "Sleep Apnea", "Cystic Fibrosis", "ARDS", "Pulmonary Fibrosis"];

function computeStatusFromSeverity(severity) {
  // severity is 0..1 where 0 = healthy, 1 = worst
  if (severity === null || severity === undefined) return "vacant";
  if (severity >= 0.66) return "severe";
  if (severity >= 0.33) return "mild";
  return "normal";
}

function PatientProfilePage({ patient, onBack }) {
  if (!patient) return null;
  
  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <button className="back-btn" onClick={onBack}>← Back to Dashboard</button>
        <div className="profile-page-title">
          <h1>Patient Health Overview</h1>
          <p className="location">{patient.id} • Ward A</p>
        </div>
      </header>

      <div className="profile-page-grid">
        {/* Left Column: Anatomy & Quick Stats */}
        <section className="profile-section-left">
          <div className="anatomy-card-full">
            <img src={lungs} alt="Lungs" className="anatomy-img-full" />
            <div className="stats-below-anatomy">
              <div className="stat-box">
                <label>Heart Rate</label>
                <value>{Math.round(patient.rate * 1.8)} bpm</value>
              </div>
              <div className="stat-box">
                <label>Oxygen Sat.</label>
                <value>98%</value>
              </div>
              <div className="stat-box">
                <label>Temperature</label>
                <value>37.2°C</value>
              </div>
              <div className="stat-box">
                <label>Blood Pressure</label>
                <value>120/80</value>
              </div>
            </div>
          </div>

          <div className="metrics-card">
            <h3>Vital Signs</h3>
            <div className="metrics-list">
              <div className="metric-item">
                <span className="metric-label">Respiratory Rate</span>
                <span className="metric-value">{patient.rate} breaths/min</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Breathing Pattern</span>
                <span className="metric-value">{patient.breathingPattern}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Condition</span>
                <span className={`metric-value ${patient.severity > 0.66 ? 'severe' : patient.severity > 0.33 ? 'warning' : 'normal'}`}>{patient.condition}</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Severity Score</span>
                <span className="metric-value">{patient.severity.toFixed(2)} / 1.00</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Confidence</span>
                <span className="metric-value">{patient.confidence}%</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Patient Info & Diagnosis */}
        <section className="profile-section-right">
          <div className="patient-card">
            <div className="patient-header">
              <div className="avatar">W</div>
              <div className="patient-meta">
                <h2>William</h2>
                <p>Patient ID: PT-3305</p>
                <p className="appointment">Monday 10:00-11:30</p>
              </div>
            </div>

            <div className="patient-details">
              <div className="detail-row">
                <span className="label">Age</span>
                <span className="value">45 years</span>
              </div>
              <div className="detail-row">
                <span className="label">Gender</span>
                <span className="value">Male</span>
              </div>
              <div className="detail-row">
                <span className="label">Admit Date</span>
                <span className="value">Feb 27, 2026</span>
              </div>
              <div className="detail-row">
                <span className="label">Room</span>
                <span className="value">{patient.id}</span>
              </div>
            </div>
          </div>

          <div className="diagnosis-card-full">
            <h3>Clinical Diagnosis</h3>
            <div className="diagnosis-content-full">
              <div className={`diagnosis-badge ${patient.severity > 0.66 ? 'severe' : patient.severity > 0.33 ? 'warning' : 'normal'}`}>
                {patient.severity > 0.66 ? '⚠ Respiratory Distress' : patient.severity > 0.33 ? '⚡ Elevated Rate' : '✓ Normal Respiration'}
              </div>
              <p className="diagnosis-description">{patient.condition}</p>
              <div className="recommendations">
                <h4>Recommendations</h4>
                <ul>
                  <li>Continue monitoring respiratory patterns</li>
                  <li>Administer prescribed medication as scheduled</li>
                  <li>Record vital signs every 2 hours</li>
                  <li>Alert if severity score exceeds 0.8</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary">Update Medication</button>
            <button className="btn btn-secondary">Schedule Consultation</button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const [beds, setBeds] = useState(() => initialBeds.map((b, i) => ({
    ...b,
    rate: [16, 18, 14, 20, 12, 15, 17, 19][i] || 16,
    history: Array(30).fill(18),
    source: "sim",
    name: patientNames[i],
    age: patientAges[i],
    gender: patientGenders[i],
    bloodType: ["O+", "A+", "B+", "O-", "AB+", "A-", "B-", "AB-"][i],
    condition: patientConditions[i],
    breathingPattern: "Regular",
    severity: [0.2, 0.15, 0.35, 0.18, 0.25, 0.4, 0.3, 0.22][i],
    confidence: 85 + Math.random() * 10,
    bedNumber: i + 1,
    wardSection: "Respiratory — Ward A",
  })));
  const [ward, setWard] = useState(() => ({ id: 1, name: getWardName(1) }));
  const [microphones, setMicrophones] = useState(() => ([
    createMicrophone("MIC-01", 1, { zone: "north", connected: true, ...snapToZone("north") }),
    createMicrophone("MIC-02", 1, { zone: "south", connected: true, ...snapToZone("south") }),
  ]));
  const [selectedBed, setSelectedBed] = useState(1);
  const [alerts, setAlerts] = useState([]);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const backendUrl = "http://127.0.0.1:8000";

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${backendUrl}/health`);
      if (response.ok) {
        console.log("✓ Backend is reachable");
        return true;
      }
      console.error("✗ Backend health check failed:", response.status);
      return false;
    } catch (error) {
      console.error("✗ Cannot reach backend:", error.message);
      return false;
    }
  };

  const applyAnalysisToBed = (bedId, analysis) => {
    if (!bedId) return;

    setBeds(prev => prev.map(bed => {
      if (bed.id !== bedId) return bed;

      const severity = typeof analysis.severity_score === "number" ? analysis.severity_score : 0;
      const condition = analysis.condition === "abnormal" || severity >= 0.33 ? "Abnormal breathing detected" : "Stable";
      const breathingPattern = analysis.breathing_pattern || (severity >= 0.33 ? "Irregular" : "Regular");
      const rate = Number.isFinite(analysis.respiratory_rate) ? analysis.respiratory_rate : bed.rate;
      const confidence = Number.isFinite(analysis.confidence) ? analysis.confidence : bed.confidence ?? 0;

      return {
        ...bed,
        rate,
        severity,
        breathingPattern,
        condition,
        confidence,
        history: (bed.history || []).slice(-29).concat([rate || 0]),
        source: "mic",
        lastAnalysis: analysis,
      };
    }));

    const bedIndex = beds.findIndex(bed => bed.id === bedId);
    if (bedIndex >= 0) setSelectedBed(bedIndex);

    setAlerts(prev => {
      const next = prev.filter(alert => !alert.startsWith(`${bedId} -`));
      if ((analysis.condition === "abnormal") || (analysis.severity_score ?? 0) >= 0.33) {
        next.unshift(`${bedId} - Abnormal breathing detected`);
      }
      return next.slice(0, 8);
    });
  };

  const handleMicAnalysis = async ({ bedId, file }) => {
    console.log(`Starting analysis for bed: ${bedId}, file: ${file.name}`);
    
    const isBackendReachable = await testBackendConnection();
    if (!isBackendReachable) {
      throw new Error("Cannot reach backend at http://127.0.0.1:8000. Make sure it's running.");
    }

    const formData = new FormData();
    formData.append("file", file);
    if (bedId) formData.append("bed_id", bedId);

    console.log(`Uploading to ${backendUrl}/analyze`);
    const response = await fetch(`${backendUrl}/analyze`, {
      method: "POST",
      body: formData,
    });

    const text = await response.text();
    console.log(`Backend response status: ${response.status}, body length: ${text.length}`);

    if (!response.ok) {
      console.error("Backend error response:", text);
      throw new Error(text || `Request failed with ${response.status}`);
    }

    const analysis = JSON.parse(text);
    applyAnalysisToBed(analysis.bed_id || bedId, analysis);
    return analysis;
  };

  const handleCreateWard = () => {
    setWard((prevWard) => {
      const nextId = prevWard.id + 1;
      return { id: nextId, name: getWardName(nextId) };
    });
    setMicrophones([]);
    setCurrentPage("microphones");
  };

  const handleAddMicrophone = () => {
    setMicrophones((prev) => {
      const nextIndex = prev.length + 1;
      return [...prev, createMicrophone(`MIC-${String(nextIndex).padStart(2, "0")}`, ward.id)];
    });
    setCurrentPage("microphones");
  };

  const handlePlaceMicrophone = (micId, zone) => {
    setMicrophones((prev) => prev.map((mic) => {
      if (mic.id !== micId) return mic;
      return {
        ...mic,
        wardId: ward.id,
        zone,
        ...snapToZone(zone),
      };
    }));
  };

  const handleToggleMicrophoneConnection = (micId) => {
    setMicrophones((prev) => prev.map((mic) => (
      mic.id === micId ? { ...mic, connected: !mic.connected } : mic
    )));
  };

  const handleRemoveMicrophone = (micId) => {
    setMicrophones((prev) => prev.filter((mic) => mic.id !== micId));
  };

  // Live simulation loop
  useEffect(() => {
    const iv = setInterval(() => {
      setBeds(prev => prev.map((b, i) => {
        if (b.source === "mic") return b;
        const base = b.rate || 16;
        const target = Math.max(6, Math.min(40, Math.round(base + (Math.random() * 8 - 4))));
        const newRate = Math.round((base * 0.55) + (target * 0.45));
        // severity normalized from rate (8..40 -> 0..1)
        const sev = Math.max(0, Math.min(1, (newRate - 8) / (40 - 8)));
        // breathing pattern and condition derived from severity
        const breathingPattern = sev > 0.6 ? 'Irregular' : (sev > 0.33 ? 'Variable' : 'Regular');
        const condition = sev > 0.7 ? 'Wheezing' : (sev > 0.4 ? 'Elevated respiratory rate' : 'Stable');
        const confidence = 85 + Math.round((1 - Math.abs(0.5 - Math.random())) * 15);
        const newHist = (b.history || []).slice(-29).concat([newRate]);
        return { ...b, rate: newRate, history: newHist, severity: parseFloat(sev.toFixed(2)), breathingPattern, condition, confidence, source: b.source || "sim" };
      }));
    }, 1200);
    return () => clearInterval(iv);
  }, []);

  // Alerts generator
  useEffect(() => {
    setAlerts([]);
    const iv = setInterval(() => {
      setAlerts(() => {
        const next = beds.reduce((acc, b) => {
          const sev = b.severity ?? ((b.rate - 8) / (40 - 8));
          if (sev >= 0.66) acc.push(`${b.id} - Severe distress detected`);
          else if (sev >= 0.33) acc.push(`${b.id} - Mild distress detected`);
          return acc;
        }, []);
        return next.slice(0, 8);
      });
    }, 1400);
    return () => clearInterval(iv);
  }, [beds]);

  const totalDetected = beds.filter(b => b.rate !== null).length;
  const normalCount = beds.filter(b => computeStatusFromSeverity(b.severity) === "normal").length;
  const mildCount = beds.filter(b => computeStatusFromSeverity(b.severity) === "mild").length;
  const severeCount = beds.filter(b => computeStatusFromSeverity(b.severity) === "severe").length;
  const onlineMicrophones = microphones.filter((mic) => mic.connected).length;
  const capturingMicrophones = microphones.filter((mic) => mic.connected && mic.zone !== "tray").length;

  return (
    <div className="monitor-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">◉</div>
          <div>
            <h1>GRAAL-MPR</h1>
            <p>Acoustic Respiratory Monitoring System</p>
          </div>
        </div>

        <nav className="nav">
          <button 
            className={`nav-item ${currentPage === "dashboard" ? "active" : ""}`}
            onClick={() => setCurrentPage("dashboard")}
          >
            Dashboard
          </button>
          <button 
            className={`nav-item ${currentPage === "ward-map" ? "active" : ""}`}
            onClick={() => setCurrentPage("ward-map")}
          >
            Ward Map
          </button>
          <button 
            className={`nav-item ${currentPage === "patients" ? "active" : ""}`}
            onClick={() => setCurrentPage("patients")}
          >
            Patients
          </button>
          <button 
            className={`nav-item ${currentPage === "alerts" ? "active" : ""}`}
            onClick={() => setCurrentPage("alerts")}
          >
            Alerts <span className="pill">{alerts.length}</span>
          </button>
          <button 
            className={`nav-item ${currentPage === "trends" ? "active" : ""}`}
            onClick={() => setCurrentPage("trends")}
          >
            Trends & Reports
          </button>
          <button 
            className={`nav-item ${currentPage === "microphones" ? "active" : ""}`}
            onClick={() => setCurrentPage("microphones")}
          >
            Microphones
          </button>
          <button 
            className={`nav-item ${currentPage === "system-status" ? "active" : ""}`}
            onClick={() => setCurrentPage("system-status")}
          >
            System Status
          </button>
          <button 
            className={`nav-item ${currentPage === "settings" ? "active" : ""}`}
            onClick={() => setCurrentPage("settings")}
          >
            Settings
          </button>
        </nav>

        <div className="status-card">
          <h3>System Status</h3>
          <p>All Systems Operational</p>
          <div><span>Microphones</span><strong>{onlineMicrophones}/{Math.max(microphones.length, 1)} Online</strong></div>
          <div><span>Capturing</span><strong>{capturingMicrophones}</strong></div>
          <div><span>AI Model</span><strong>Active</strong></div>
          <div><span>Processing Latency</span><strong>120 ms</strong></div>
          <div><span>Uptime</span><strong>2d 14h 33m</strong></div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h2>{ward.name} <span>• General Room</span></h2>
            <p>Live Monitoring</p>
          </div>
          <div className="topbar-right">
            <div className="clock">
              <strong>{new Date().toLocaleTimeString()}</strong>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
            <div className="nurse">Nurse Station 1 <small>Online</small></div>
          </div>
        </header>

        {currentPage === "dashboard" && (
          <DashboardPage 
            beds={beds}
            microphones={microphones}
            alerts={alerts}
            selectedBed={selectedBed}
            setSelectedBed={setSelectedBed}
            onViewProfile={() => setCurrentPage("profile")}
            wardName={ward.name}
          />
        )}
        {currentPage === "ward-map" && <WardMap beds={beds} microphones={microphones} wardName={ward.name} onSelectBed={setSelectedBed} />}
          {currentPage === "profile" && (
            <RespiratoryPatientProfile patient={beds[selectedBed]} />
          )}
        {currentPage === "patients" && (
          <Patients 
            beds={beds}
            onSelectBed={setSelectedBed}
            onViewProfile={() => setCurrentPage("profile")}
          />
        )}
        {currentPage === "alerts" && <Alerts beds={beds} />}
        {currentPage === "trends" && <TrendsAndReports beds={beds} />}
        {currentPage === "microphones" && (
          <Microphones
            beds={beds}
            microphones={microphones}
            ward={ward}
            onAnalyze={handleMicAnalysis}
            onCreateWard={handleCreateWard}
            onAddMicrophone={handleAddMicrophone}
            onPlaceMicrophone={handlePlaceMicrophone}
            onToggleMicrophoneConnection={handleToggleMicrophoneConnection}
            onRemoveMicrophone={handleRemoveMicrophone}
          />
        )}
        {currentPage === "system-status" && <SystemStatus />}
        {currentPage === "settings" && <Settings />}
      </main>
    </div>
  );
}


