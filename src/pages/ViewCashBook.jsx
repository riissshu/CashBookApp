import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCashBookByDate } from "../services/api";

function ViewCashBook() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [cashBook, setCashBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedDate = searchParams.get("date");

  useEffect(() => {
    const loadCashBook = async () => {
      if (!selectedDate) {
        setError("No Cash Book date selected.");
        setLoading(false);
        return;
      }

      try {
        setError("");

        const data = await getCashBookByDate(selectedDate);

        if (!data) {
          setError("Cash Book not found for the selected date.");
          setCashBook(null);
          return;
        }

        setCashBook(data);
      } catch (err) {
        console.error("Failed to load Cash Book:", err);
        setError(String(err));
      } finally {
        setLoading(false);
      }
    };

    loadCashBook();
  }, [selectedDate]);

  if (loading) {
    return <div className="p-4">Loading Cash Book...</div>;
  }

  if (error) {
    return <div className="p-4 text-danger">{error}</div>;
  }

  if (!cashBook) {
    return <div className="p-4 text-danger">Cash Book not found.</div>;
  }

  const receipts = (cashBook.transactions || []).filter(
    (item) => item.transaction_type === "receipt"
  );

  const payments = (cashBook.transactions || []).filter(
    (item) => item.transaction_type === "payment"
  );

  const formatDate = (date) => {
    if (!date) return "";

    const [year, month, day] = date.split("-");

    return `${day}-${month}-${year}`;
  };

  return (
    <div className="container-fluid p-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">View Cash Book</h2>
          <div className="text-muted">
            Cash Book Details
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
            onClick={() => navigate("/dashboard")}
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
                value={cashBook.date}
                readOnly
              />
            </div>

            <div className="col d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-secondary">
                Edit
              </button>

              <button className="btn btn-outline-danger">
                Delete
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Cash Book Summary */}
      <div className="card shadow-sm mb-4">

        <div className="card-header bg-white">
          <h5 className="mb-0">
            Cash Book — {formatDate(cashBook.date)}
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
                  ₹ {cashBook.opening_balance.toFixed(2)}
                </h4>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Total Receipt
                </div>

                <h4 className="mb-0">
                  ₹ {cashBook.total_receipt.toFixed(2)}
                </h4>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Total Payment
                </div>

                <h4 className="mb-0">
                  ₹ {cashBook.total_payment.toFixed(2)}
                </h4>
              </div>
            </div>

            <div className="col-md-3 mb-3">
              <div className="border rounded p-3">
                <div className="text-muted">
                  Closing Balance
                </div>

                <h4 className="mb-0">
                  ₹ {cashBook.closing_balance.toFixed(2)}
                </h4>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Transactions */}
      <div className="row">

        {/* Receipt Side */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm h-100">

            <div className="card-header">
              <h5 className="mb-0">Receipt</h5>
            </div>

            <div className="card-body p-0">

              <table className="table table-bordered mb-0">

                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Particulars</th>
                    <th
                      className="text-end"
                      style={{ width: "150px" }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {receipts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted">
                        No receipts
                      </td>
                    </tr>
                  ) : (
                    receipts.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>

                        <td>
                          {item.party_name || "-"}
                        </td>

                        <td className="text-end">
                          ₹ {Number(item.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot className="table-light">
                  <tr>
                    <th colSpan="2">Total Receipt</th>

                    <th className="text-end">
                      ₹ {cashBook.total_receipt.toFixed(2)}
                    </th>
                  </tr>
                </tfoot>

              </table>

            </div>
          </div>
        </div>

        {/* Payment Side */}
        <div className="col-md-6 mb-4">
          <div className="card shadow-sm h-100">

            <div className="card-header">
              <h5 className="mb-0">Payment</h5>
            </div>

            <div className="card-body p-0">

              <table className="table table-bordered mb-0">

                <thead>
                  <tr>
                    <th style={{ width: "60px" }}>#</th>
                    <th>Particulars</th>
                    <th
                      className="text-end"
                      style={{ width: "150px" }}
                    >
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted">
                        No payments
                      </td>
                    </tr>
                  ) : (
                    payments.map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>

                        <td>
                          {item.party_name || "-"}
                        </td>

                        <td className="text-end">
                          ₹ {Number(item.amount || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                <tfoot className="table-light">
                  <tr>
                    <th colSpan="2">Total Payment</th>

                    <th className="text-end">
                      ₹ {cashBook.total_payment.toFixed(2)}
                    </th>
                  </tr>
                </tfoot>

              </table>

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default ViewCashBook;