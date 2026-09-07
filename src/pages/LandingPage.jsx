import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import {
  getDatabaseDirectory,
  setDatabaseDirectory,
  listCompanies,
} from "../services/api";

function LandingPage() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [databaseDirectory, setDatabaseDirectoryState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleOpenCompany = (company) => {
    console.log("Selected company:", company);

    // Later we will store the selected database
    // and load its Cash Book.
    navigate("/dashboard");
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

        </div>

      </div>

    </div>
  );
}

export default LandingPage;