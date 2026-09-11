import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { checkForUpdate, installUpdate, downloadUpdate,} from "../services/updater";
import {
  getCompanySettings,
  updateCompanySettings,
  clearActiveCompany,
} from "../services/api";

function Settings() {
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const [availableUpdate, setAvailableUpdate] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateReady, setUpdateReady] = useState(false)
  const [downloadedUpdate, setDownloadedUpdate] = useState(null);

  useEffect(() => {
  const loadSettings = async () => {
    try {
      const data = await getCompanySettings();

      setCompanyName(data.company_name || "");
      setOpeningBalance(data.opening_balance ?? "");
    } catch (err) {
      console.error("Failed to load company settings:", err);
    }
  };

  loadSettings();
}, []);

const handleCloseCompany = async () => {
  try {
    await clearActiveCompany();
    navigate("/");
  } catch (err) {
    console.error("Failed to close company:", err);
  }
};

  const handleSave = async (e) => {
  e.preventDefault();

  try {
    await updateCompanySettings(
      companyName,
      Number(openingBalance || 0)
    );

    console.log("Settings saved successfully");
  } catch (err) {
    console.error("Failed to save settings:", err);
  }
};


  const handleCheckForUpdates = async () => {
  setUpdateChecking(true);
  setUpdateMessage("");
  setAvailableUpdate(null);

  const update = await checkForUpdate();

  if (update) {
    setAvailableUpdate(update);
  } else {
  const currentVersion = await getVersion();

  setUpdateMessage(
    `You are using the latest version. Current version: ${currentVersion}`
  );
}

  setUpdateChecking(false);
};

  const handleInstallUpdate = async () => {
  if (!availableUpdate) return;

  setUpdateChecking(true);
  setDownloadProgress(0);
  setUpdateMessage("Downloading update...");

  const success = await downloadUpdate(
    availableUpdate,
    (progress) => {
      setDownloadProgress(progress);
    }
  );

  if (success) {
      setUpdateChecking(false);
  setDownloadedUpdate(availableUpdate);
  setAvailableUpdate(null);
  setUpdateReady(true);
  setUpdateMessage("");
  } else {
    setUpdateMessage("Failed to download the update.");
    setUpdateChecking(false);
  }
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
                className="btn btn-success"
              >
                Save Settings
              </button>

              <button className="btn btn-primary">
                Edit Settings
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/settings")}
              >
                Cancel
              </button>
            </div>

          </form>

        </div>
      </div>

            {/* Application Updates */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-white">
          <h5 className="mb-0">Application Updates</h5>
        </div>

        <div className="card-body">
          <p className="mb-3">
            Check whether a newer version of CashBook is available.
          </p>

          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleCheckForUpdates}
            disabled={updateChecking}
          >
            {updateChecking ? "Checking..." : "Check for Updates"}
          </button>

          {updateMessage && (
            <div className="mt-3 text-muted">
              {updateMessage}
            </div>
          )}
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
          onClick={handleCloseCompany}
        >
           Close Company
        </button>
      
      </div>

      </div>

      {availableUpdate && (
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
            Update Available
          </h5>

          <button
            type="button"
            className="btn-close"
            onClick={() => setAvailableUpdate(null)}
            disabled={updateChecking}
          ></button>
        </div>

        <div className="modal-body">
          <p className="mb-2">
            A new version of CashBook is available.
          </p>

          <p className="mb-0">
            <strong>New version:</strong>{" "}
            {availableUpdate.version}
          </p>

          {availableUpdate.body && (
            <p className="mt-3 mb-0 text-muted">
              {availableUpdate.body}
            </p>
          )}

          {updateChecking && (
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
            onClick={() => setAvailableUpdate(null)}
            disabled={updateChecking}
          >
            Later
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleInstallUpdate}
            disabled={updateChecking}
          >
            {updateChecking
  ? `Downloading... ${downloadProgress}%`
  : "Update Now"}
          </button>
        </div>

      </div>
    </div>
  </div>
)}

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
          <h5 className="modal-title">
            Update Ready
          </h5>

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
            <strong>New version:</strong>{" "}
            {downloadedUpdate.version}
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
              setUpdateChecking(true);

              const success = await installUpdate(downloadedUpdate);

              if (!success) {
                setUpdateChecking(false);
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


    </div>
  );
}

export default Settings;
