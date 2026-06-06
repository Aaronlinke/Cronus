import { useState } from "react";
import axios from "axios";
import { Key, Copy, CheckCircle, Lightning, DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function InversionResult({ kernel, target }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const payload = { ...kernel };
      if (target?.address) payload.target_address = target.address;
      if (target?.hash160) payload.target_hash160 = target.hash160;
      const r = await axios.post(`${API}/inversion/run`, payload);
      setResult(r.data);
    } catch (e) {
      toast.error("inversion failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!result?.wif) return;
    try {
      await navigator.clipboard.writeText(result.wif);
      setCopied(true);
      toast.success("WIF copied to clipboard");
      setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("clipboard unavailable");
    }
  };

  const exportJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `omnigenesis-inversion-${result.id?.slice(0, 8) || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("inversion trace exported");
  };

  return (
    <div
      data-testid="result-panel"
      className="omni-panel p-3 w-full min-h-0 flex flex-col"
      style={{ background: "rgba(255,176,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="omni-panel-title">
          <Key size={12} weight="bold" />
          Inversion Result
        </div>
        <button
          data-testid="run-inversion-btn"
          onClick={run}
          disabled={loading}
          className="px-2 py-1 border border-amber-400/70 text-amber-300 text-[9px] tracking-[0.3em] uppercase hover:bg-amber-400/10 disabled:opacity-50 flex items-center gap-1"
        >
          <Lightning size={10} weight="bold" />
          {loading ? "running…" : "execute"}
        </button>
      </div>

      <div className="text-[9px] tracking-[0.25em] uppercase text-amber-400/60 mb-1">
        collapsed WIF key
      </div>

      <div
        data-testid="wif-output"
        className="omni-mono break-all text-amber-200 text-[13px] leading-tight bg-black/50 border border-amber-500/20 p-2 min-h-[64px] flex items-center"
        style={{ wordBreak: "break-all" }}
      >
        {result ? (
          <span className="text-amber-300">{result.wif}</span>
        ) : (
          <span className="text-amber-500/40 omni-pulse">
            // standby — execute kernel to collapse
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px] omni-mono">
        <div>
          <div className="text-amber-400/50 text-[8px] tracking-[0.25em] uppercase">
            fingerprint
          </div>
          <div className="text-amber-300 truncate" data-testid="wif-fingerprint">
            {result?.fingerprint || "—"}
          </div>
        </div>
        <div>
          <div className="text-amber-400/50 text-[8px] tracking-[0.25em] uppercase">
            Φ
          </div>
          <div className="text-amber-300">
            {result ? result.phi.toFixed(5) : "—"}
          </div>
        </div>
        <div>
          <div className="text-amber-400/50 text-[8px] tracking-[0.25em] uppercase">
            elapsed
          </div>
          <div className="text-amber-300">
            {result ? `${result.elapsed_ms}ms` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          data-testid="copy-wif-btn"
          onClick={copy}
          disabled={!result}
          className={`flex-1 py-2 border text-[11px] tracking-[0.35em] uppercase font-bold flex items-center justify-center gap-2 transition-colors ${
            copied
              ? "border-emerald-400 text-emerald-300 bg-emerald-500/10"
              : "border-amber-400 text-amber-300 hover:bg-amber-400/10 disabled:opacity-30 disabled:hover:bg-transparent"
          }`}
        >
          {copied ? (
            <>
              <CheckCircle size={13} weight="bold" /> copied
            </>
          ) : (
            <>
              <Copy size={13} weight="bold" /> copy
            </>
          )}
        </button>
        <button
          data-testid="export-json-btn"
          onClick={exportJson}
          disabled={!result}
          title="export full inversion trace as JSON"
          className="py-2 px-3 border border-cyan-400/60 text-cyan-300 text-[11px] tracking-[0.35em] uppercase hover:bg-cyan-400/10 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-2"
        >
          <DownloadSimple size={13} weight="bold" />
          <span className="hidden sm:inline">json</span>
        </button>
      </div>
    </div>
  );
}
