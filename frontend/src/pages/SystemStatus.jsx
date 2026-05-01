export default function SystemStatus() {
  const systemMetrics = {
    uptime: '12d 4h 32m',
    cpuUsage: 34,
    memoryUsage: 62,
    storageUsage: 45,
    networkLatency: 12,
    databaseStatus: 'healthy',
    apiStatus: 'operational',
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>System Status</h1>
        <p>Monitor system health and performance metrics</p>
      </header>

      <div className="system-content">
        <section className="system-health">
          <h2>Overall Health</h2>
          <div className="health-indicator operational">
            <div className="health-dot"></div>
            <span>OPERATIONAL</span>
          </div>
        </section>

        <section className="system-metrics-grid">
          <div className="metric-box">
            <h3>System Uptime</h3>
            <p className="metric-large">{systemMetrics.uptime}</p>
            <p className="metric-desc">Last restart: 12 days ago</p>
          </div>

          <div className="metric-box">
            <h3>CPU Usage</h3>
            <div className="metric-gauge">
              <div className="gauge-fill" style={{ width: `${systemMetrics.cpuUsage}%` }}></div>
            </div>
            <p className="metric-value">{systemMetrics.cpuUsage}%</p>
          </div>

          <div className="metric-box">
            <h3>Memory Usage</h3>
            <div className="metric-gauge">
              <div className="gauge-fill" style={{ width: `${systemMetrics.memoryUsage}%` }}></div>
            </div>
            <p className="metric-value">{systemMetrics.memoryUsage}%</p>
          </div>

          <div className="metric-box">
            <h3>Storage Usage</h3>
            <div className="metric-gauge">
              <div className="gauge-fill" style={{ width: `${systemMetrics.storageUsage}%` }}></div>
            </div>
            <p className="metric-value">{systemMetrics.storageUsage}%</p>
          </div>
        </section>

        <section className="service-status">
          <h2>Service Status</h2>
          <div className="service-list">
            <div className="service-item">
              <span>Database Connection</span>
              <span className={`service-badge service-${systemMetrics.databaseStatus}`}>
                {systemMetrics.databaseStatus}
              </span>
            </div>
            <div className="service-item">
              <span>API Server</span>
              <span className={`service-badge service-${systemMetrics.apiStatus}`}>
                {systemMetrics.apiStatus}
              </span>
            </div>
            <div className="service-item">
              <span>Audio Processing</span>
              <span className="service-badge service-healthy">operational</span>
            </div>
            <div className="service-item">
              <span>Data Sync</span>
              <span className="service-badge service-healthy">synchronized</span>
            </div>
          </div>
        </section>

        <section className="network-info">
          <h3>Network</h3>
          <p>Latency: <strong>{systemMetrics.networkLatency}ms</strong></p>
          <p>Connected Clients: <strong>8</strong></p>
          <p>Data Throughput: <strong>2.4 MB/s</strong></p>
        </section>
      </div>
    </div>
  );
}
