import { useEffect, useState } from "react";
import CreateCashBook from "./pages/CreateCashBook";
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

  return <CreateCashBook />;
}

export default App;