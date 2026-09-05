import { useNavigate } from "react-router-dom";
import { useState } from "react";

function Settings() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  const handleSave = (e) => {
    e.preventDefault();

    // Database connection will be added later.
    console.log("Settings:", {
      companyName,
      openingBalance,
    });
  };

  return (
    <div className="container-fluid p-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Settings</h2>
          <div className="text-muted">
            Company / Cash Book Settings
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate("/dashboard")}
        >
          ← Dashboard
        </button>
      </div>

      {/* Settings Form */}
      <div className="card shadow-sm mb-4">

        <div className="card-header bg-white">
          <h5 className="mb-0">Basic Settings</h5>
        </div>

        <div className="card-body">

          <form onSubmit={handleSave}>

            <div className="row mb-3">
              <label className="col-md-3 col-form-label">
                Company / Factory Name
              </label>

              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company / factory name"
                />
              </div>
            </div>

            <div className="row mb-3">
              <label className="col-md-3 col-form-label">
                Opening Balance
              </label>

              <div className="col-md-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <hr />

            <div className="d-flex gap-2">
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Settings
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/")}
              >
                Cancel
              </button>
            </div>

          </form>

        </div>
      </div>

      <div className="row g-3 d-flex gap-2 justify-content-center mt-4 pt-4">

       {/* Backup & Restore  */}
      <div className="col-auto">
        <button
          className="btn btn-lg btn-outline-primary"
          onClick={() => navigate("/backup-restore")}
        >
          Backup & Restore
        </button>
      </div>

      {/* Close Company */}
      <div className="col-auto">
          <button
          className="btn btn-lg btn-outline-danger"
          onClick={() => navigate("/")}
        >
           Close Company
        </button>
      
      </div>

      </div>

    </div>
  );
}

export default Settings;
