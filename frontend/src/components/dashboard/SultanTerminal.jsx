import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, Pause, Play, Trash } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SultanTerminal({ target }) {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef(null);
  const esRef = useRef(null);

  const connect = useCallback(() => {
    if (esRef.current) return;
    const es = new EventSource(`${API}/inversion/stream`);
    esRef.current = es;
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      setLines((prev) => {
        const next = [...prev, e.data];
        if (next.length > 400) next.splice(0, next.length - 400);
        return next;
      });
    };
  }, []);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  useEffect(() => {
    if (target?.address) {
      const ts = new Date().toISOString().substr(11, 12);
      const newLines = [`[${ts}] [LOCK] >> TARGET LOCKED :: ${target.address}`];
      if (target.hash160) {
        newLines.push(`[${ts}] [LOCK] >> hash160 :: ${target.hash160}`);
      }
      setLines((prev) => [...prev, ...newLines]);
    }
  }, [target?.address, target?.hash160]);

  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, paused]);

  const togglePause = () => {
    if (paused) {
      connect();
      setPaused(false);
    } else {
      disconnect();
      setPaused(true);
    }
  };

  const clearTerminal = () => setLines([]);

  const tagColor = (line) => {
    if (line.includes("[LOCK]")) return "text-cyan-300 font-bold";
    if (line.includes("[SCC]")) return "text-amber-400";
    if (line.includes("[DLT]")) return "text-cyan-300";
    if (line.includes("[PHI]")) return "text-amber-300";
    if (line.includes("[GAM]")) return "text-orange-300";
    if (line.includes("[PEC]")) return "text-emerald-300";
    if (line.includes("[TWS]")) return "text-pink-300";
    if (line.includes("[KRN]")) return "text-amber-200";
    if (line.includes("[OBS]")) return "text-cyan-400";
    if (line.includes("[BCH]")) return "text-fuchsia-300";
    if (line.includes("[TIC]")) return "text-violet-300";
    if (line.includes("[AFR]")) return "text-rose-300";
    if (line.includes("[TQES]")) return "text-teal-300";
    if (line.includes("[ECDLP]")) return "text-yellow-300";
    return "text-amber-400/80";
  };

  const statusLabel = paused
    ? "paused"
    : connected
      ? "live · streaming"
      : "linking…";

  return (
    <div
      data-testid="sultan-terminal"
      className="omni-panel p-3 flex flex-col w-full min-h-0"
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="omni-panel-title">
          <Terminal size={12} weight="bold" />
          Sultan-Inversion Terminal
        </div>
        <div className="flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase">
          <button
            data-testid="terminal-pause-btn"
            onClick={togglePause}
            title={paused ? "resume stream" : "pause stream"}
            className="border border-amber-500/30 px-1.5 py-1 hover:bg-amber-400/10 text-amber-300 flex items-center gap-1"
          >
            {paused ? <Play size={10} weight="bold" /> : <Pause size={10} weight="bold" />}
            <span className="hidden sm:inline">{paused ? "resume" : "pause"}</span>
          </button>
          <button
            data-testid="terminal-clear-btn"
            onClick={clearTerminal}
            title="clear terminal"
            className="border border-amber-500/30 px-1.5 py-1 hover:bg-amber-400/10 text-amber-300/80 flex items-center gap-1"
          >
            <Trash size={10} weight="bold" />
            <span className="hidden sm:inline">clear</span>
          </button>
          <span
            className={`omni-status-dot ${paused ? "" : connected ? "" : "cyan"} ${
              !paused && connected ? "omni-pulse" : ""
            }`}
            style={paused ? { background: "#FF3B30", boxShadow: "0 0 8px #FF3B30" } : {}}
            data-testid="terminal-status-dot"
          />
          <span
            className={
              paused
                ? "text-red-400"
                : connected
                  ? "text-amber-400"
                  : "text-cyan-300"
            }
            data-testid="terminal-status-label"
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto omni-mono text-[11px] leading-relaxed pr-1"
        data-testid="terminal-log-feed"
      >
        {lines.length === 0 && (
          <div className="text-amber-500/40 omni-pulse">
            // awaiting kernel handshake…
          </div>
        )}
        {lines.map((l, i) => (
          <div
            key={i}
            className={`omni-line-in ${tagColor(l)} whitespace-pre-wrap break-words`}
          >
            {l}
          </div>
        ))}
        {!paused && <div className="omni-cursor h-3" />}
      </div>
    </div>
  );
}
