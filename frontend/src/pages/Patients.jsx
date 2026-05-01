export default function Patients({ beds, onSelectBed, onViewProfile }) {
  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Patients</h1>
        <p>Monitor all admitted patients</p>
      </header>

      <div className="patients-content">
        <div className="patients-table-wrapper">
          <table className="patients-table">
            <thead>
              <tr>
                <th>Bed</th>
                <th>Respiratory Rate</th>
                <th>Status</th>
                <th>Breathing Pattern</th>
                <th>Condition</th>
                <th>Severity</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {beds.map((bed, idx) => {
                const status = bed.severity >= 0.66 ? 'severe' : bed.severity >= 0.33 ? 'mild' : 'normal';
                return (
                  <tr key={bed.id} className={`status-${status}`}>
                    <td className="bed-name">{bed.id}</td>
                    <td>{bed.rate} bpm</td>
                    <td><span className={`badge badge-${status}`}>{status}</span></td>
                    <td>{bed.breathingPattern}</td>
                    <td>{bed.condition}</td>
                    <td>
                      <div className="severity-bar">
                        <div className="severity-fill" style={{ width: `${bed.severity * 100}%` }}></div>
                      </div>
                      {bed.severity.toFixed(2)}
                    </td>
                    <td>{bed.confidence}%</td>
                    <td>
                      <button
                        className="btn-view"
                        onClick={() => {
                          onSelectBed(idx);
                          onViewProfile();
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
