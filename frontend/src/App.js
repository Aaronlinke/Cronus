import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import OmnigenesisDashboard from "@/pages/OmnigenesisDashboard";
import { Toaster } from "sonner";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<OmnigenesisDashboard />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#0a0a0a",
            border: "1px solid rgba(255,176,0,0.4)",
            color: "#FFB000",
            borderRadius: 0,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: "12px",
            letterSpacing: "0.05em",
          },
        }}
      />
    </div>
  );
}

export default App;
