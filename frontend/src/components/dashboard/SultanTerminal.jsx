import { useCallback, useEffect, useRef, useState } from "react";
import { Terminal, Pause, Play, Trash } from "@phosphor-icons/react";

// Convert https://host → wss://host, http://host → ws://host
function wsUrl(httpUrl, path) {
  const u = new URL(path, httpUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  return u.toString();
}

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const WS_ENDPOINT = wsUrl(BACKEND, "/api/ws/terminal");

export default function SultanTerminal({ target }) {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const appendLine = useCallback((line) => {
    setLines((prev) => {
      const next = [...prev, line];
      if (next.length > 400) next.splice(0, next.length - 400);
      return next;
    });
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    let ws;
    try {
      ws = new WebSocket(WS_ENDPOINT);
    } catch {
      setConnected(false);
      return;
    }
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      // (Re-)send current target on connect
      if (target?.address) {
        ws.send(
          JSON.stringify({
            type: "set_target",
            address: target.address,
            hash160: target.hash160 || null,
          }),
        );
      }
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.line) appendLine(data.line);
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      setConnected(false);
      // If wsRef still points at this socket, the close was unexpected → reconnect
      if (wsRef.current === ws) {
        wsRef.current = null;
        reconnectTimerRef.current = setTimeout(connect, 1500);
      }
    };
    ws.onerror = () => {
      setConnected(false);
    };
  }, [appendLine, target?.address, target?.hash160]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    const ws = wsRef.current;
    wsRef.current = null; // mark first so onclose skips reconnect
    if (ws) ws.close();
    setConnected(false);
  }, []);

  // Initial connect + cleanup
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Send target updates to backend whenever target changes (debounced naturally)
  useEffect(() => {
    if (!target?.address) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "set_target",
          address: target.address,
          hash160: target.hash160 || null,
        }),
      );
    }
  }, [target?.address, target?.hash160]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current && !paused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, paused]);

  const togglePause = () => {
    const ws = wsRef.current;
    if (paused) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resume" }));
      } else {
        connect();
      }
      setPaused(false);
    } else {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pause" }));
      }
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
      ? "live · ws"
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
            className={`omni-status-dot ${!paused && connected ? "omni-pulse" : ""}`}
            style={
              paused
                ? { background: "#FF3B30", boxShadow: "0 0 8px #FF3B30" }
                : !connected
                  ? { background: "#00E5FF", boxShadow: "0 0 8px #00E5FF" }
                  : {}
            }
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
