/* Wave3-meta */
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
// Wave 2: Unhandled rejection handler
window.addEventListener("unhandledrejection", (e) => {
  console.error("[CryptArtist] Unhandled promise rejection:", e.reason);
  e.preventDefault();
});


// Wave 3: Set theme-color meta tag
const meta = document.createElement("meta");
meta.name = "theme-color";
meta.content = "#0a0e17";
document.head.appendChild(meta);

import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { logger } from "./utils/logger";
import "./index.css";

// Initialize the frontend logging system - sends all logs to Rust backend
logger.init();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
