import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AtmosphericShield } from "./components/gateway/AtmosphericShield";
import "./styles/globals.css";

/**
 * Atmospheric Shield & Lazy Router Interceptor
 *
 * Keeps React Router and initial session loaders dormant in memory
 * until the free-tier backend container responds with a clean 200 OK.
 */
function GatewayGuard() {
  const [isServerReady, setIsServerReady] = useState(false);

  if (!isServerReady) {
    return <AtmosphericShield onServerReady={() => setIsServerReady(true)} />;
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GatewayGuard />
  </React.StrictMode>
);
