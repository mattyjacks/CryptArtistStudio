import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { StudioCoreProvider } from "./core/context/StudioCoreContext";
import { AIProvider } from "./core/context/AIContext";
import { ProjectProvider } from "./core/context/ProjectContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StudioCoreProvider>
        <AIProvider>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </AIProvider>
      </StudioCoreProvider>
    </BrowserRouter>
  </React.StrictMode>
);
