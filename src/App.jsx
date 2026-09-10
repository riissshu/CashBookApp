import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { checkForUpdate, installUpdate } from "./services/updater";

import CreateCashBook from "./pages/CreateCashBook";
import Dashboard from "./pages/DashBoard";
import Settings from "./pages/Settings";
import CashBookRegister from "./pages/CashBookRegister";
import ViewCashBook from "./pages/ViewCashBook";
import LandingPage from "./pages/LandingPage";
import CreateCompany from "./pages/CreateCompany";
import BackupRestore from "./pages/Backup&Restore";



function App() {

  const [startupUpdate, setStartupUpdate] = useState(null);
const [updating, setUpdating] = useState(false);

useEffect(() => {
  const checkStartupUpdate = async () => {
    const update = await checkForUpdate();

    if (update) {
      setStartupUpdate(update);
    }
  };

  checkStartupUpdate();
}, []);


  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/create-cash-book" element={<CreateCashBook />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/cash-book-register" element={<CashBookRegister />} />
        <Route path="/view-cash-book" element={<ViewCashBook />} />
        <Route path="/create-company" element={<CreateCompany />} />
        <Route
  path="/backup-restore"
  element={<BackupRestore />}
/>

        {/* Temporary fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

        {/* Auto Update Checker - Modal */}
        {startupUpdate && (
  <div
    className="modal fade show d-block"
    tabIndex="-1"
    role="dialog"
    style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
  >
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">

        <div className="modal-header">
          <h5 className="modal-title">
            CashBook Update Available
          </h5>

          <button
            type="button"
            className="btn-close"
            onClick={() => setStartupUpdate(null)}
            disabled={updating}
          ></button>
        </div>

        <div className="modal-body">
          <p className="mb-2">
            A new version of CashBook is available.
          </p>

          <p className="mb-0">
            <strong>New version:</strong>{" "}
            {startupUpdate.version}
          </p>

          {startupUpdate.body && (
            <div className="mt-3 text-muted">
              {startupUpdate.body}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStartupUpdate(null)}
            disabled={updating}
          >
            Later
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={updating}
            onClick={async () => {
              setUpdating(true);

              const success = await installUpdate(startupUpdate);

              if (!success) {
                setUpdating(false);
              }
            }}
          >
            {updating ? "Updating..." : "Update Now"}
          </button>
        </div>

      </div>
    </div>
  </div>
)}


    </BrowserRouter>
  );
}

export default App;