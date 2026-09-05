import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  // Sample companies for UI testing.
  // Database connection will be added later.
  const companies = [
    {
      id: 1,
      name: "ABC Traders",
    },
    {
      id: 2,
      name: "XYZ Enterprises",
    },
  ];

  const handleOpenCompany = (company) => {
    console.log("Selected company:", company);

    // Later we will store the selected company
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

        {/* Available Companies */}
        <div className="card-body p-4">

          <h5 className="mb-3">
            Available Companies
          </h5>

          {companies.length > 0 ? (
            <div className="list-group mb-4">

              {companies.map((company) => (
                <div
                  key={company.id}
                  className="list-group-item d-flex justify-content-between align-items-center py-3"
                >

                  <div>
                    <div className="fw-semibold">
                      {company.name}
                    </div>

                    <small className="text-muted">
                      Cash Book
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

              <button
                type="button"
                className="btn btn-primary"
              >
                + Create New Company
              </button>
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

          {/* Settings */}
          <div className="text-center">

            <button
              type="button"
              className="btn btn-link text-decoration-none"
              onClick={() => navigate("/settings")}
            >
              Settings
            </button>

          </div>

        </div>

        {/* Footer */}
        <div className="card-footer bg-white text-center text-muted py-3">
          Cash Book
        </div>

      </div>

    </div>
  );
}

export default LandingPage;
