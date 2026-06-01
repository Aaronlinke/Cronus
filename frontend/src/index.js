import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress benign ResizeObserver loop warning that triggers CRA dev overlay
const RO_MSG = "ResizeObserver loop";
window.addEventListener("error", (e) => {
  if (e && e.message && e.message.includes(RO_MSG)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  if (e && e.reason && String(e.reason).includes(RO_MSG)) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
