import { useNavigate } from "react-router-dom";
import { useState } from "react";

function BackupRestore() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);

  const handleBackup = () => {
    // Database backup will be connected later.
    console.log("Create backup");
  };

  const handleRestore = () => {
    // Database restore will be connected later.
    console.log("Restore backup:", selectedFile);
  };

  return (
    <div className="container-fluid p-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">Backup & Restore</h2>
          <div className="text-muted">
            Protect and restore your Cash Book data
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

      <div className="row g-4">

        {/* Backup */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100">

            <div className="card-header bg-white">
              <h5 className="mb-0">Backup</h5>
            </div>

            <div className="card-body">

              <p className="text-muted">
                Create a backup of your Cash Book data so you can
                restore it later if required.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleBackup}
              >
                Create Backup
              </button>

              <div className="mt-4">
                <small className="text-muted">
                  Last Backup
                </small>

                <div className="fw-semibold mt-1">
                  Never
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Restore */}
        <div className="col-md-6">
          <div className="card shadow-sm h-100">

            <div className="card-header bg-white">
              <h5 className="mb-0">Restore</h5>
            </div>

            <div className="card-body">

              <p className="text-muted">
                Select a previously created backup file and
                restore your Cash Book data.
              </p>

              <input
                type="file"
                className="form-control"
                accept=".db,.sqlite,.sqlite3"
                onChange={(e) => {
                  setSelectedFile(e.target.files[0] || null);
                }}
              />

              {selectedFile && (
                <div className="mt-2 text-muted small">
                  Selected: {selectedFile.name}
                </div>
              )}

              <button
                type="button"
                className="btn btn-warning mt-3"
                onClick={handleRestore}
                disabled={!selectedFile}
              >
                Restore Backup
              </button>

              <div className="alert alert-warning mt-4 mb-0">
                <strong>Warning:</strong> Restoring a backup may
                replace the current Cash Book data.
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

export default BackupRestore;