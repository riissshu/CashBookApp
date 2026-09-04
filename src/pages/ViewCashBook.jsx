import { useNavigate } from "react-router-dom";

function ViewCashBook() {
  const navigate = useNavigate();

  return (
    <div className="container-fluid p-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">View Cash Book</h2>
          <div className="text-muted">
            Daily Cash Book Details
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => navigate("/cash-book-register")}
          >
            ← Register
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/")}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">

          <div className="row align-items-end">

            <div className="col-md-4">
              <label className="form-label">
                Cash Book Date
              </label>

              <input
                type="date"
                className="form-control"
                defaultValue="2026-09-04"
              />
            </div>

            <div className="col-md-2">
              <button
                type="button"
                className="btn btn-primary w-100"
              >
                View
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Cash Book Summary */}
      <div className="card shadow-sm mb-4">

        <div className="card-header bg-white">
          <h5 className="mb-0">
            Cash Book — 04-09-2026
          </h5>
        </div>

        <div className="card-body">

          <div className="row">

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Opening Balance
                </div>
                <h4 className="mb-0">
                  ₹ 0.00
                </h4>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Total Receipt
                </div>
                <h4 className="mb-0">
                  ₹ 0.00
                </h4>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Total Payment
                </div>
                <h4 className="mb-0">
                  ₹ 0.00
                </h4>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Closing Balance
                </div>
                <h4 className="mb-0">
                  ₹ 0.00
                </h4>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Transactions */}
      <div className="card shadow-sm">

        <div className="card-header bg-white">
          <h5 className="mb-0">
            Transactions
          </h5>
        </div>

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-bordered table-hover mb-0">

              <thead className="table-light">
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th style={{ width: "120px" }}>Type</th>
                  <th>Party / Particulars</th>
                  <th>Description</th>
                  <th
                    className="text-end"
                    style={{ width: "160px" }}
                  >
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>

                {/* Sample Receipt */}
                <tr>
                  <td>1</td>
                  <td>
                    <span className="badge bg-success">
                      Receipt
                    </span>
                  </td>
                  <td>Cash Received</td>
                  <td>Sample receipt entry</td>
                  <td className="text-end">
                    ₹ 0.00
                  </td>
                </tr>

                {/* Sample Payment */}
                <tr>
                  <td>2</td>
                  <td>
                    <span className="badge bg-danger">
                      Payment
                    </span>
                  </td>
                  <td>Cash Payment</td>
                  <td>Sample payment entry</td>
                  <td className="text-end">
                    ₹ 0.00
                  </td>
                </tr>

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ViewCashBook;