export default function Settings() {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Settings</h1>
        <p>Configure system preferences and alert thresholds</p>
      </header>

      <div className="settings-content">
        <section className="settings-section">
          <h2>Alert Thresholds</h2>
          <div className="settings-group">
            <label className="setting-item">
              <span>Mild Distress Threshold</span>
              <input type="range" min="0" max="1" step="0.01" defaultValue="0.33" />
              <span className="value-display">0.33</span>
            </label>
            <label className="setting-item">
              <span>Severe Distress Threshold</span>
              <input type="range" min="0" max="1" step="0.01" defaultValue="0.66" />
              <span className="value-display">0.66</span>
            </label>
            <label className="setting-item">
              <span>Minimum Respiratory Rate</span>
              <input type="number" defaultValue="8" min="0" max="50" />
              <span className="unit">bpm</span>
            </label>
            <label className="setting-item">
              <span>Maximum Respiratory Rate</span>
              <input type="number" defaultValue="40" min="0" max="100" />
              <span className="unit">bpm</span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>Display Preferences</h2>
          <div className="settings-group">
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked /> Dark Mode
            </label>
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked /> Enable Animations
            </label>
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked /> Sound Alerts
            </label>
            <label className="setting-checkbox">
              <input type="checkbox" /> High Contrast Mode
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>Notification Settings</h2>
          <div className="settings-group">
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked /> Email Notifications
            </label>
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked /> Browser Notifications
            </label>
            <label className="setting-checkbox">
              <input type="checkbox" defaultChecked /> SMS Alerts (Critical Only)
            </label>
            <label className="setting-item">
              <span>Update Frequency</span>
              <select>
                <option>Real-time</option>
                <option>Every 30 seconds</option>
                <option>Every 1 minute</option>
                <option>Every 5 minutes</option>
              </select>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>System Settings</h2>
          <div className="settings-group">
            <label className="setting-item">
              <span>Temperature Unit</span>
              <select>
                <option>Celsius</option>
                <option>Fahrenheit</option>
              </select>
            </label>
            <label className="setting-item">
              <span>Time Format</span>
              <select>
                <option>24-hour</option>
                <option>12-hour</option>
              </select>
            </label>
            <label className="setting-item">
              <span>Default Language</span>
              <select>
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </label>
          </div>
        </section>

        <section className="settings-actions">
          <button className="btn-primary">Save Changes</button>
          <button className="btn-secondary">Reset to Defaults</button>
          <button className="btn-secondary">Export Settings</button>
        </section>
      </div>
    </div>
  );
}
