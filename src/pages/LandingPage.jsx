import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getDatabaseDirectory,
  setDatabaseDirectory,
  listCompanies,
  setActiveCompany,
  inspectBackup,
  restoreBackup,
} from "../services/api";

function LandingPage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [databaseDirectory, setDatabaseDirectoryState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoreInfo, setRestoreInfo] = useState(null);

  // Confirmation modal state
  const [confirmAction, setConfirmAction] = useState(null);

  // Success message
  const [successMessage, setSuccessMessage] = useState("");

  const loadCompanies = async () => {
    try {
      setError("");

      const directory = await getDatabaseDirectory();
      setDatabaseDirectoryState(directory);

      const companyList = await listCompanies();
      setCompanies(companyList);
    } catch (err) {
      console.error("Failed to load companies:", err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleChooseFolder = async () => {
    try {
      setError("");
      setSuccessMessage("");

      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (!selected) {
        return;
      }

      await setDatabaseDirectory(selected);

      setDatabaseDirectoryState(selected);

      const companyList = await listCompanies();
      setCompanies(companyList);
    } catch (err) {
      console.error("Failed to change database directory:", err);
      setError(String(err));
    }
  };

  const handleRestoreBackup = async () => {
    try {
      setError("");
      setSuccessMessage("");

      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          {
            name: "CashBook Backup",
            extensions: ["001"],
          },
        ],
      });

      if (!selected) {
        return;
      }

      const metadata = await inspectBackup(selected);

      const matchingUuid = companies.find(
        (company) => company.company_uuid === metadata.company_uuid
      );

      if (!matchingUuid) {
        setRestoreInfo({
          backupPath: selected,
          metadata,
          type: "new",
        });

        return;
      }

      if (matchingUuid.company_name === metadata.company_name) {
        setRestoreInfo({
          backupPath: selected,
          metadata,
          existingCompany: matchingUuid,
          type: "replace",
        });

        return;
      }

      setRestoreInfo({
        backupPath: selected,
        metadata,
        existingCompany: matchingUuid,
        type: "rename",
      });
    } catch (err) {
      console.error("Failed to inspect backup:", err);
      setError(String(err));
    }
  };

  // Open confirmation modal for replacing an existing company
  const handleReplaceRestore = () => {
    if (!restoreInfo?.existingCompany) {
      return;
    }

    setConfirmAction("replace");
  };

  // Open confirmation modal for restoring as a new company
  const handleCreateNewRestore = () => {
    if (!restoreInfo) {
      return;
    }

    setConfirmAction("new");
  };

  // Actually perform the selected restore after confirmation
  const handleConfirmRestore = async () => {
    try {
      setError("");
      setSuccessMessage("");

      if (!restoreInfo || !confirmAction) {
        return;
      }

      if (confirmAction === "replace") {
        if (!restoreInfo.existingCompany) {
          return;
        }

        await restoreBackup(
          restoreInfo.backupPath,
          "replace",
          restoreInfo.existingCompany.path
        );

        setRestoreInfo(null);
        setConfirmAction(null);

        await loadCompanies();

        setSuccessMessage("Company restored successfully.");
        return;
      }

      if (confirmAction === "new") {
        await restoreBackup(
          restoreInfo.backupPath,
          "new",
          null
        );

        setRestoreInfo(null);
        setConfirmAction(null);

        await loadCompanies();

        setSuccessMessage(
          "Company restored as a new company successfully."
        );
      }
    } catch (err) {
      console.error("Failed to restore company:", err);
      setConfirmAction(null);
      setError(String(err));
    }
  };

  // Close confirmation modal
  const handleCancelConfirmation = () => {
    setConfirmAction(null);
  };

  const handleCancelRestore = () => {
    setRestoreInfo(null);
    setConfirmAction(null);
  };

  const handleOpenCompany = async (company) => {
    try {
      await setActiveCompany(company.path);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to open company:", err);
      setError(String(err));
    }
  };

  return (
    <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center p-4">

      <div
        className="card shadow-sm border-0"
        style={{ width: "100%", maxWidth: "850px" }}
      >

        {/* Header */}
        <div className="card-body text-center p-4 border-bottom">

          <h1 className="fw-bold mb-2">
            Cash Book
          </h1>

          <p className="text-muted mb-0">
            Select a company to continue
          </p>

        </div>

        {/* Database Directory */}
        <div className="card-body px-4 pt-4 pb-3 border-bottom">

          <div className="d-flex justify-content-between align-items-center mb-2">

            <h5 className="mb-0">
              Database Directory
            </h5>

            <button
              type="button"
              className="btn btn-outline-primary btn-sm"
              onClick={handleChooseFolder}
            >
              Change Folder
            </button>

          </div>

          <div className="bg-light border rounded px-3 py-2 text-muted small">
            {databaseDirectory || "Loading..."}
          </div>

        </div>

        {/* Available Companies */}
        <div className="card-body p-4">

          <h5 className="mb-3">
            Available Companies
          </h5>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="alert alert-success">
              {successMessage}
            </div>
          )}

          {loading ? (
            <div className="text-center border rounded p-4 mb-4">
              <div className="text-muted">
                Loading companies...
              </div>
            </div>
          ) : companies.length > 0 ? (
            <div className="list-group mb-4">

              {companies.map((company) => (
                <div
                  key={company.path}
                  className="list-group-item d-flex justify-content-between align-items-center py-3"
                >

                  <div>
                    <div className="fw-semibold">
                      {company.company_name}
                    </div>

                    <small className="text-muted">
                      {company.file_name}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenCompany(company)}
                  >
                    Open
                  </button>

                </div>
              ))}

            </div>
          ) : (
            <div className="text-center border rounded p-4 mb-4">

              <div className="text-muted mb-3">
                No company has been created yet.
              </div>

              <div className="badge text-bg-light">
                Create Company
              </div>

            </div>
          )}

          {/* Restore Decision */}
          {restoreInfo && (
            <div className="card shadow-sm mb-4">

              <div className="card-header bg-light">
                <strong>Restore Backup</strong>
              </div>

              <div className="card-body">

                <div className="mb-3">

                  <div>
                    <strong>Backup Company:</strong>{" "}
                    {restoreInfo.metadata.company_name}
                  </div>

                  <div className="text-muted small mt-1">
                    Company UUID: {restoreInfo.metadata.company_uuid}
                  </div>

                </div>

                {/* Same UUID + Same Name */}
                {restoreInfo.type === "replace" && (
                  <>
                    <div className="alert alert-warning">

                      <strong>Existing company found.</strong>

                      <br />

                      The Company UUID and company name both match an
                      existing company.

                      <br />
                      <br />

                      Existing company:{" "}
                      <strong>
                        {restoreInfo.existingCompany.company_name}
                      </strong>

                    </div>

                    <div className="d-flex gap-2">

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleReplaceRestore}
                      >
                        Replace Existing
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancelRestore}
                      >
                        Cancel
                      </button>

                    </div>
                  </>
                )}

                {/* Same UUID + Different Name */}
                {restoreInfo.type === "rename" && (
                  <>
                    <div className="alert alert-warning">

                      <strong>
                        Company identity matches, but the name is different.
                      </strong>

                      <br />
                      <br />

                      Existing company:{" "}
                      <strong>
                        {restoreInfo.existingCompany.company_name}
                      </strong>

                      <br />

                      Backup company:{" "}
                      <strong>
                        {restoreInfo.metadata.company_name}
                      </strong>

                      <br />
                      <br />

                      The Company UUID is the same, so this may be the same
                      company after a name change.

                    </div>

                    <div className="d-flex gap-2 flex-wrap">

                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleReplaceRestore}
                      >
                        Replace Existing
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreateNewRestore}
                      >
                        Create as New Company
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancelRestore}
                      >
                        Cancel
                      </button>

                    </div>
                  </>
                )}

                {/* Different UUID */}
                {restoreInfo.type === "new" && (
                  <>
                    <div className="alert alert-info">

                      <strong>This is a different company.</strong>

                      <br />
                      <br />

                      No existing company has the same Company UUID.

                      <br />
                      <br />

                      Backup company:{" "}
                      <strong>
                        {restoreInfo.metadata.company_name}
                      </strong>

                    </div>

                    <div className="d-flex gap-2">

                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreateNewRestore}
                      >
                        Restore as New Company
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancelRestore}
                      >
                        Cancel
                      </button>

                    </div>
                  </>
                )}

              </div>
            </div>
          )}

          {/* Create New Company */}
          <div className="text-center mb-3">

            <button
              type="button"
              className="btn btn-success px-4"
              onClick={() => navigate("/create-company")}
            >
              + Create New Company
            </button>

          </div>

          {/* Restore Backup */}
          <div className="text-center mb-3">

            <button
              type="button"
              className="btn btn-outline-primary px-4"
              onClick={handleRestoreBackup}
            >
              Restore Backup
            </button>

          </div>

        </div>

      </div>

      {/* Restore Confirmation Modal */}
      {confirmAction && restoreInfo && (
        <div
          className="modal d-block"
          tabIndex="-1"
          role="dialog"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >

          <div
            className="modal-dialog modal-dialog-centered"
            role="document"
          >

            <div className="modal-content">

              <div className="modal-header">

                <h5 className="modal-title">
                  Confirm Restore
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCancelConfirmation}
                  aria-label="Close"
                />

              </div>

              <div className="modal-body">

                {confirmAction === "replace" ? (
                  <>
                    <p>
                      Are you sure you want to replace this company?
                    </p>

                    <p className="mb-2">
                      <strong>
                        Company:
                      </strong>{" "}
                      {restoreInfo.existingCompany.company_name}
                    </p>

                    <div className="alert alert-danger mb-0">
                      All current data in this company database will be
                      replaced by the backup.
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      Restore this backup as a new company?
                    </p>

                    <p className="mb-2">
                      <strong>
                        Company:
                      </strong>{" "}
                      {restoreInfo.metadata.company_name}
                    </p>

                    <div className="alert alert-info mb-0">
                      A new Company UUID and Company ID will be created.
                    </div>
                  </>
                )}

              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelConfirmation}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    confirmAction === "replace"
                      ? "btn btn-danger"
                      : "btn btn-primary"
                  }
                  onClick={handleConfirmRestore}
                >
                  {confirmAction === "replace"
                    ? "Yes, Replace"
                    : "Yes, Restore as New"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default LandingPage;