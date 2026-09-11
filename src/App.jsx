import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  checkForUpdate,
  downloadUpdate,
  installUpdate,
} from "./services/updater";

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
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false);
  const [downloadedUpdate, setDownloadedUpdate] = useState(null);

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
        <Route path="/backup-restore" element={<BackupRestore />} />

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
                <h5 className="modal-title">CashBook Update Available</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setStartupUpdate(null)}
                  disabled={updating}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-2">A new version of CashBook is available.</p>

                <p className="mb-0">
                  <strong>New version:</strong> {startupUpdate.version}
                </p>

                {startupUpdate.body && (
                  <div className="mt-3 text-muted">{startupUpdate.body}</div>
                )}

                {updating && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between mb-1">
                      <span>Downloading update...</span>
                      <span>{downloadProgress}%</span>
                    </div>

                    <div
                      className="progress"
                      role="progressbar"
                      aria-valuenow={downloadProgress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <div
                        className="progress-bar"
                        style={{ width: `${downloadProgress}%` }}
                      >
                        {downloadProgress}%
                      </div>
                    </div>
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
                    setDownloadProgress(0);

                    const success = await downloadUpdate(
                      startupUpdate,
                      (progress) => {
                        setDownloadProgress(progress);
                      },
                    );

                    if (success) {
                        setUpdating(false);
  setDownloadedUpdate(startupUpdate);
  setStartupUpdate(null);
  setUpdateReady(true);
                    } else {
                      setUpdating(false);
                    }
                  }}
                >
                  {updating
                    ? `Downloading... ${downloadProgress}%`
                    : "Update Now"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Ready Modal */}
      {updateReady && downloadedUpdate && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Ready</h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setUpdateReady(false)}
                ></button>
              </div>

              <div className="modal-body">
                <p className="mb-2">
                  CashBook update has been downloaded successfully.
                </p>

                <p className="mb-0">
                  <strong>New version:</strong> {downloadedUpdate.version}
                </p>

                <p className="mt-3 mb-0 text-muted">
                  Restart CashBook now to install the update.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUpdateReady(false)}
                >
                  Later
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    setUpdating(true);

                    const success = await installUpdate(downloadedUpdate);

                    if (!success) {
                      setUpdating(false);
                    }
                  }}
                >
                  Restart Now
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