import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCashBooks } from "../services/api";

function CashBookRegister() {
  const navigate = useNavigate();

  const [cashBooks, setCashBooks] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");


useEffect(() => {
  const loadCashBooks = async () => {
    try {
      setError("");

      const data = await listCashBooks();
      setCashBooks(data);
    } catch (err) {
      console.error("Failed to load cash books:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  loadCashBooks();
}, []);

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
            onClick={() => navigate("/dashboard")}
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
  {error && (
    <tr>
      <td colSpan="7" className="text-center py-4 text-danger">
        {error}
      </td>
    </tr>
  )}

  {loading ? (
    <tr>
      <td colSpan="7" className="text-center py-4 text-muted">
        Loading Cash Books...
      </td>
    </tr>
  ) : cashBooks.length === 0 ? (
    <tr>
      <td colSpan="7" className="text-center py-4 text-muted">
        No Cash Books found
      </td>
    </tr>
  ) : (
    cashBooks.map((cashBook, index) => (
      <tr key={cashBook.id}>
        <td>{index + 1}</td>

        <td>{cashBook.date}</td>

        <td className="text-end">
          ₹ {Number(cashBook.opening_balance || 0).toFixed(2)}
        </td>

        <td className="text-end">
          ₹ {Number(cashBook.total_receipt || 0).toFixed(2)}
        </td>

        <td className="text-end">
          ₹ {Number(cashBook.total_payment || 0).toFixed(2)}
        </td>

        <td className="text-end">
          ₹ {Number(cashBook.closing_balance || 0).toFixed(2)}
        </td>

        <td>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => navigate(`/view-cash-book?date=${cashBook.date}`)}
          >
            View
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}

export default CashBookRegister;