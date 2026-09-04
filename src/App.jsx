import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import CreateCashBook from "./pages/CreateCashBook";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import CashBookRegister from "./pages/CashBookRegister";
import ViewCashBook from "./pages/ViewCashBook";

import { initDatabase } from "./database";

function App() {
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => {
        console.log("SQLite database initialized");
        setDatabaseReady(true);
      })
      .catch((error) => {
        console.error("SQLite initialization failed:", error);
      });
  }, []);

  if (!databaseReady) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-cash-book" element={<CreateCashBook />} />
        <Route path="/settings" element = {<Settings />} />
        <Route path="/cash-book-register" element = {<CashBookRegister/>}/>
        <Route path="/view-cash-book" element = {<ViewCashBook/>}/>

        {/* Temporary fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;