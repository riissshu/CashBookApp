import { useNavigate } from "react-router-dom";

function Dashboard() {
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container-fluid p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Dashboard</h2>
          <div className="text-muted">Cash Book Management</div>
        </div>

        <div className="text-muted">{today}</div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted mb-2">Opening Balance</div>
              <h3 className="mb-0">₹ 0.00</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted mb-2">Today's Receipt</div>
              <h3 className="mb-0">₹ 0.00</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted mb-2">Today's Payment</div>
              <h3 className="mb-0">₹ 0.00</h3>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted mb-2">Closing Balance</div>
              <h3 className="mb-0">₹ 0.00</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Quick Actions</h5>
        </div>

        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <button
                className="btn btn-primary w-100 py-3"
                onClick={() => navigate("/create-cash-book")}
              >
                Create Cash Book
              </button>
            </div>

            <div className="col-md-3">
              <button
                className="btn btn-outline-primary w-100 py-3"
                onClick={() => navigate("/cash-book-register")}
              >
                Cash Book Register
              </button>
            </div>

            <div className="col-md-3">
              <button
                className="btn btn-outline-primary w-100 py-3"
                onClick={() => navigate("/view-cash-book")}
              >
                View Cash Book
              </button>
            </div>

            <div className="col-md-3">
              <button
                className="btn btn-outline-secondary w-100 py-3"
                onClick={() => navigate("/settings")}
              >
                Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Cash Book */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Today's Cash Book</h5>
        </div>

        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-end">Opening</th>
                  <th className="text-end">Receipt</th>
                  <th className="text-end">Payment</th>
                  <th className="text-end">Closing</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>{today}</td>
                  <td className="text-end">₹ 0.00</td>
                  <td className="text-end">₹ 0.00</td>
                  <td className="text-end">₹ 0.00</td>
                  <td className="text-end">₹ 0.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;