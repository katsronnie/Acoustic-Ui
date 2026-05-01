export default function WardMap({ beds, microphones = [], wardName = "Ward A", onSelectBed }) {
  const activeMicrophones = microphones.filter((mic) => mic.zone !== "tray");

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>{wardName} Ward Map</h1>
        <p>Real-time bed layout, patient distribution, and microphone placement</p>
      </header>

      <div className="ward-map-content">
        <section className="ward-section">
          <h2>Acoustic Heatmap - Ward A</h2>
          <div className="ward-grid">
            {beds.map((bed, idx) => {
              const status = bed.severity >= 0.66 ? 'severe' : bed.severity >= 0.33 ? 'mild' : 'normal';
              return (
                <div
                  key={bed.id}
                  className={`bed-card ${status}`}
                  onClick={() => onSelectBed(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="bed-card-header">{bed.id}</div>
                  <div className="bed-card-rate">{bed.rate} bpm</div>
                  <div className="bed-card-status">{status.toUpperCase()}</div>
                  <div className="bed-card-severity">Severity: {bed.severity.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="ward-section">
          <h2>Microphone Placement</h2>
          <div className="ward-device-strip">
            {activeMicrophones.length === 0 && <p className="ward-device-empty">No microphones placed yet.</p>}
            {activeMicrophones.map((mic) => (
              <div key={mic.id} className={`ward-device-card ${mic.connected ? "live" : "offline"}`}>
                <strong>{mic.id}</strong>
                <span>{mic.zone.replace("-", " ")}</span>
                <small>{mic.connected ? "Online" : "Offline"}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="map-legend">
          <h3>Legend</h3>
          <div className="legend-items">
            <div className="legend-item normal">
              <div className="legend-color"></div>
              <span>Normal (0.00 - 0.32)</span>
            </div>
            <div className="legend-item warning">
              <div className="legend-color"></div>
              <span>Mild Distress (0.33 - 0.65)</span>
            </div>
            <div className="legend-item severe">
              <div className="legend-color"></div>
              <span>Severe Distress (0.66 - 1.00)</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
