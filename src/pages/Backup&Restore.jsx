import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import {
  createBackup,
  restoreBackup,
  getCompanySettings,
} from "../services/api";

function BackupRestore() {
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);

  const handleBackup = async () => {
  try {
    const settings = await getCompanySettings();

    const companyName = settings.company_name?.trim();

    if (!companyName) {
      console.log("Company name not found.");
      return;
    }

    const filePath = await save({
      defaultPath: `${companyName}.001`,
      filters: [
        {
          name: "CashBook Backup",
          extensions: ["001"],
        },
      ],
    });

    if (!filePath) {
      return;
    }

    await createBackup(filePath);

    console.log("Backup created successfully.");
  } catch (error) {
    console.error("Backup failed:", error);
    console.log(`Backup failed: ${error}`);
  }
};


const handleSelectBackup = async () => {
  try {
    const filePath = await open({
      multiple: false,
      directory: false,
      filters: [
        {
          name: "CashBook Backup",
          extensions: ["001"],
        },
      ],
    });

    if (!filePath) {
      return;
    }

    setSelectedFile(filePath);
  } catch (error) {
    console.error("Failed to select backup:", error);
    console.log(`Failed to select backup: ${error}`);
  }
};


  const handleRestore = async () => {
  if (!selectedFile) {
    return;
  }

  try {
    const confirmed = window.confirm(
      "Restoring this backup will replace the current Cash Book data. Do you want to continue?"
    );

    if (!confirmed) {
      return;
    }

    await restoreBackup(selectedFile);

    alert("Backup restored successfully.");

    setSelectedFile(null);
  } catch (error) {
    console.error("Restore failed:", error);
    console.log(`Restore failed: ${error}`);
  }
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
          className="btn btn-outline-secondary mx-4"
          onClick={() => navigate("/settings")}
        >
          ← Back
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


              <button
                type="button"
                className="btn btn-warning mt-3"
                onClick={handleSelectBackup}
              >
                Restore Backup
              </button>

              {selectedFile && (
  <div className="mt-2 text-muted small">
    Selected: {selectedFile}
  </div>
)}

              <div className="alert alert-warning mt-4 mb-0">
                <strong>Warning:</strong> Restoring a backup will
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