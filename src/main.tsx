import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// GitHub Pages SPA fallback: restore the real path after 404.html redirect
const ghpPath = sessionStorage.getItem("ghp_path");
if (ghpPath) {
  sessionStorage.removeItem("ghp_path");
  history.replaceState(null, "", ghpPath);
}
