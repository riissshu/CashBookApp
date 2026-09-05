import { useNavigate } from "react-router-dom";
import { useState } from "react";

function CreateCompany() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Database connection will be added later.
    console.log({
      companyName,
      openingBalance,
    });
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-4">

      <div
        className="card shadow-sm border-0"
        style={{ width: "100%", maxWidth: "700px" }}
      >

        {/* Header */}
        <div className="card-body p-4 border-bottom">
          <div className="d-flex justify-content-between align-items-center">

            <div>
              <h2 className="mb-1">Create New Company</h2>
              <div className="text-muted">
                Set up your Cash Book
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate("/")}
            >
              ← Back
            </button>

          </div>
        </div>

        {/* Form */}
        <div className="card-body p-4">

          <form onSubmit={handleSubmit}>

            <div className="row mb-4">
              <label className="col-md-4 col-form-label">
                Company / Factory Name
              </label>

              <div className="col-md-8">
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company / factory name"
                  required
                />
              </div>
            </div>

            <div className="row mb-4">
              <label className="col-md-4 col-form-label">
                Opening Balance
              </label>

              <div className="col-md-8">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                />

                <div className="form-text">
                  Opening cash balance when starting this Cash Book.
                </div>
              </div>
            </div>

            <hr />

            <div className="d-flex justify-content-end gap-2">

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/")}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
              >
                Create Company
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}

export default CreateCompany;