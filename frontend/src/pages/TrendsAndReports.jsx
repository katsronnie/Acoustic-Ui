export default function TrendsAndReports({ beds }) {
  const avgRate = Math.round(beds.reduce((sum, b) => sum + b.rate, 0) / beds.length);
  const maxRate = Math.max(...beds.map(b => b.rate));
  const minRate = Math.min(...beds.map(b => b.rate));

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Trends & Reports</h1>
        <p>Analytics and historical data insights</p>
      </header>

      <div className="trends-content">
        <section className="trends-stats-grid">
          <div className="stat-card">
            <h3>Average Respiratory Rate</h3>
            <p className="stat-value">{avgRate}</p>
            <span className="stat-unit">breaths/min</span>
          </div>
          <div className="stat-card">
            <h3>Highest Rate</h3>
            <p className="stat-value">{maxRate}</p>
            <span className="stat-unit">breaths/min</span>
          </div>
          <div className="stat-card">
            <h3>Lowest Rate</h3>
            <p className="stat-value">{minRate}</p>
            <span className="stat-unit">breaths/min</span>
          </div>
          <div className="stat-card">
            <h3>Total Patients</h3>
            <p className="stat-value">{beds.length}</p>
            <span className="stat-unit">admitted</span>
          </div>
        </section>

        <section className="trends-chart">
          <h2>Respiratory Rate Distribution</h2>
          <div className="chart-container">
            <div className="chart-bars">
              {beds.map((bed, idx) => (
                <div key={bed.id} className="chart-bar-item">
                  <div
                    className={`chart-bar ${
                      bed.severity >= 0.66 ? 'danger' : bed.severity >= 0.33 ? 'warning' : 'normal'
                    }`}
                    style={{ height: `${(bed.rate / maxRate) * 200}px` }}
                  ></div>
                  <span className="chart-label">{bed.id}</span>
                  <span className="chart-value">{bed.rate}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="report-actions">
          <h2>Reports</h2>
          <div className="report-buttons">
            <button className="report-btn">📊 Generate Daily Report</button>
            <button className="report-btn">📈 Weekly Summary</button>
            <button className="report-btn">📋 Patient Logs</button>
            <button className="report-btn">💾 Export Data</button>
          </div>
        </section>
      </div>
    </div>
  );
}
