import './App.css'
import { useEffect } from "react";
import { initDatabase } from "./database";

function App() {
  useEffect(() => {
    initDatabase()
      .then(() => {
        console.log("SQLite database initialized");
      })
      .catch((error) => {
        console.error("SQLite initialization failed:", error);
      });
  }, []);

  return (
    <div>
      <h1>CashBook</h1>
    </div>
  );
}

export default App;
