export default function Alerts({ beds }) {
  const alertsList = beds.reduce((acc, bed) => {
    const severity = bed.severity ?? 0;
    if (severity >= 0.66) {
      acc.push({
        id: `${bed.id}-severe`,
        bed: bed.id,
        type: 'severe',
        message: `Severe respiratory distress detected`,
        rate: bed.rate,
        time: new Date().toLocaleTimeString(),
      });
    } else if (severity >= 0.33) {
      acc.push({
        id: `${bed.id}-mild`,
        bed: bed.id,
        type: 'mild',
        message: `Elevated respiratory rate detected`,
        rate: bed.rate,
        time: new Date().toLocaleTimeString(),
      });
    }
    return acc;
  }, []);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Alerts</h1>
        <p>Active patient alerts and notifications</p>
      </header>

      <div className="alerts-content">
        <div className="alerts-stats">
          <div className="alert-stat">
            <h3>{alertsList.filter(a => a.type === 'severe').length}</h3>
            <p>Critical Alerts</p>
          </div>
          <div className="alert-stat">
            <h3>{alertsList.filter(a => a.type === 'mild').length}</h3>
            <p>Warnings</p>
          </div>
          <div className="alert-stat">
            <h3>{alertsList.length}</h3>
            <p>Total Active</p>
          </div>
        </div>

        <div className="alerts-list">
          {alertsList.length === 0 ? (
            <div className="no-alerts">
              <p>✓ No active alerts at this time</p>
            </div>
          ) : (
            alertsList.map((alert) => (
              <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                <div className="alert-icon">
                  {alert.type === 'severe' ? '⚠' : '⚡'}
                </div>
                <div className="alert-content">
                  <div className="alert-header">
                    <strong>{alert.bed}</strong>
                    <span className="alert-badge">{alert.type.toUpperCase()}</span>
                  </div>
                  <p>{alert.message}</p>
                  <div className="alert-details">
                    <span>Rate: {alert.rate} bpm</span>
                    <span>{alert.time}</span>
                  </div>
                </div>
                <button className="btn-acknowledge">Acknowledge</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
