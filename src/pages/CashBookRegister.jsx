import { useNavigate } from "react-router-dom";

function CashBookRegister() {
  const navigate = useNavigate();

  return (
    <div className="container-fluid p-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Cash Book Register</h2>
          <div className="text-muted">
            Date-wise Cash Book Summary
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate("/create-cash-book")}
          >
            + Create Cash Book
          </button>

          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate("/")}
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Register */}
      <div className="card shadow-sm">

        <div className="card-header bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Cash Books</h5>

          <div>
            <input
              type="date"
              className="form-control"
            />
          </div>
        </div>

        <div className="card-body p-0">

          <div className="table-responsive">

            <table className="table table-bordered table-hover mb-0">

              <thead className="table-light">
                <tr>
                  <th style={{ width: "60px" }}>#</th>
                  <th>Date</th>
                  <th className="text-end">Opening Balance</th>
                  <th className="text-end">Receipt</th>
                  <th className="text-end">Payment</th>
                  <th className="text-end">Closing Balance</th>
                  <th style={{ width: "120px" }}>Action</th>
                </tr>
              </thead>

              <tbody>

                {/* Sample row - database will be connected later */}
                <tr>
                  <td>1</td>
                  <td>04-09-2026</td>
                  <td className="text-end">₹ 0.00</td>
                  <td className="text-end">₹ 0.00</td>
                  <td className="text-end">₹ 0.00</td>
                  <td className="text-end">₹ 0.00</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => navigate("/view-cash-book")}
                    >
                      View
                    </button>
                  </td>
                </tr>

                {/* Empty state example */}
                {/* 
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No Cash Books found
                  </td>
                </tr>
                */}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}

export default CashBookRegister;