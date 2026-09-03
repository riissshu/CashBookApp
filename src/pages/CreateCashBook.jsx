import { useEffect, useState } from "react";
import {
  createCashBook,
  getCashBookByDate,
  saveCashBook,
} from "../database";

function CreateCashBook() {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [narration, setNarration] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [receipts, setReceipts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [cashbookId, setCashbookId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadCashBook = async (selectedDate) => {
    try {
      setLoading(true);

      const existing = await getCashBookByDate(selectedDate);

      if (existing) {
        setCashbookId(existing.id);
        setNarration(existing.narration || "");
        setOpeningBalance(Number(existing.opening_balance || 0));

        setReceipts(
          existing.transactions
            .filter((item) => item.type === "receipt")
            .map((item) => ({
              id: item.id,
              party_name: item.party_name,
              amount: item.amount,
              description: item.description || "",
            }))
        );

        setPayments(
          existing.transactions
            .filter((item) => item.type === "payment")
            .map((item) => ({
              id: item.id,
              party_name: item.party_name,
              amount: item.amount,
              description: item.description || "",
            }))
        );
      } else {
        const newCashBook = await createCashBook(selectedDate);

        setCashbookId(newCashBook.id);
        setNarration("");
        setOpeningBalance(Number(newCashBook.opening_balance || 0));
        setReceipts([]);
        setPayments([]);
      }
    } catch (error) {
      console.error("Failed to load Cash Book:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashBook(date);
  }, [date]);

  const addReceipt = () => {
    setReceipts([
      ...receipts,
      {
        id: Date.now(),
        party_name: "",
        amount: "",
        description: "",
      },
    ]);
  };

  const addPayment = () => {
    setPayments([
      ...payments,
      {
        id: Date.now(),
        party_name: "",
        amount: "",
        description: "",
      },
    ]);
  };

  const updateReceipt = (id, field, value) => {
    setReceipts(
      receipts.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const updatePayment = (id, field, value) => {
    setPayments(
      payments.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeReceipt = (id) => {
    setReceipts(receipts.filter((item) => item.id !== id));
  };

  const removePayment = (id) => {
    setPayments(payments.filter((item) => item.id !== id));
  };

  const totalReceipt = receipts.reduce(
    (total, item) => total + (Number(item.amount) || 0),
    0
  );

  const totalPayment = payments.reduce(
    (total, item) => total + (Number(item.amount) || 0),
    0
  );

  const closingBalance =
    openingBalance + totalReceipt - totalPayment;

  const handleSave = async () => {
    try {
      const transactions = [
        ...receipts
          .filter((item) => item.party_name.trim() && Number(item.amount) > 0)
          .map((item) => ({
            type: "receipt",
            party_name: item.party_name.trim(),
            amount: Number(item.amount),
            description: item.description.trim(),
          })),

        ...payments
          .filter((item) => item.party_name.trim() && Number(item.amount) > 0)
          .map((item) => ({
            type: "payment",
            party_name: item.party_name.trim(),
            amount: Number(item.amount),
            description: item.description.trim(),
          })),
      ];

      await saveCashBook(
        cashbookId,
        date,
        narration.trim(),
        transactions
      );

      alert("Cash Book saved successfully.");

      await loadCashBook(date);
    } catch (error) {
      console.error("Failed to save Cash Book:", error);
      alert("Failed to save Cash Book.");
    }
  };

  if (loading) {
    return <div className="container py-4">Loading...</div>;
  }

  return (
  <div className="container-fluid py-4">
    <h2 className="mb-4">Create Cash Book</h2>

    {/* Header */}
    <div className="card mb-4">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-3">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label">Opening Balance</label>
            <input
              type="text"
              className="form-control"
              value={`₹${openingBalance.toFixed(2)}`}
              readOnly
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">
              Description / Narration
            </label>
            <input
              type="text"
              className="form-control"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Enter description / narration"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Receipt & Payment */}
    <div className="row g-4">
      {/* Receipt */}
      <div className="col-lg-6">
        <div className="card h-100">
          <div className="card-header">
            <strong>Receipt</strong>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th>Party / Particulars</th>
                    <th style={{ width: "150px" }}>Amount</th>
                    <th>Description</th>
                    <th style={{ width: "55px" }}></th>
                  </tr>
                </thead>

                <tbody>
                  {receipts.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.party_name}
                          onChange={(e) =>
                            updateReceipt(
                              item.id,
                              "party_name",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className="form-control text-end"
                          value={item.amount}
                          onChange={(e) =>
                            updateReceipt(
                              item.id,
                              "amount",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.description}
                          onChange={(e) =>
                            updateReceipt(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td className="text-center">
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removeReceipt(item.id)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <th className="text-end">Total Receipt</th>

                    <th className="text-end">
                      ₹{totalReceipt.toFixed(2)}
                    </th>

                    <th colSpan="2">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={addReceipt}
                      >
                        + Add Receipt
                      </button>
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="col-lg-6">
        <div className="card h-100">
          <div className="card-header">
            <strong>Payment</strong>
          </div>

          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered align-middle mb-0">
                <thead>
                  <tr>
                    <th>Party / Particulars</th>
                    <th style={{ width: "150px" }}>Amount</th>
                    <th>Description</th>
                    <th style={{ width: "55px" }}></th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.party_name}
                          onChange={(e) =>
                            updatePayment(
                              item.id,
                              "party_name",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className="form-control text-end"
                          value={item.amount}
                          onChange={(e) =>
                            updatePayment(
                              item.id,
                              "amount",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={item.description}
                          onChange={(e) =>
                            updatePayment(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </td>

                      <td className="text-center">
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => removePayment(item.id)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <th className="text-end">Total Payment</th>

                    <th className="text-end">
                      ₹{totalPayment.toFixed(2)}
                    </th>

                    <th colSpan="2">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={addPayment}
                      >
                        + Add Payment
                      </button>
                    </th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Closing Balance */}
    <div className="card mt-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Closing Balance</strong>
          </div>

          <div>
            <h4 className="mb-0">
              ₹{closingBalance.toFixed(2)}
            </h4>
          </div>
        </div>
      </div>
    </div>

    {/* Save */}
    <div className="text-end mt-4">
      <button
        className="btn btn-primary px-4"
        onClick={handleSave}
      >
        Save Cash Book
      </button>
    </div>
  </div>
);
}

export default CreateCashBook;