import { useEffect, useRef, useState } from "react";
import { Terminal } from "@phosphor-icons/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SultanTerminal({ target }) {
  const [lines, setLines] = useState([]);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
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

    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (target?.address) {
      const ts = new Date().toISOString().substr(11, 12);
      const msg = `[${ts}] [LOCK] >> TARGET LOCKED :: ${target.address}`;
      setLines((prev) => [...prev, msg]);
    }
  }, [target?.address]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

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

  return (
    <div
      data-testid="sultan-terminal"
      className="omni-panel p-3 flex flex-col w-full min-h-0"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="omni-panel-title">
          <Terminal size={12} weight="bold" />
          Sultan-Inversion Terminal
        </div>
        <div className="flex items-center gap-2 text-[9px] tracking-[0.25em] uppercase">
          <span
            className={`omni-status-dot ${connected ? "" : "cyan"} ${
              connected ? "omni-pulse" : ""
            }`}
            data-testid="terminal-status-dot"
          />
          <span
            className={connected ? "text-amber-400" : "text-cyan-300"}
            data-testid="terminal-status-label"
          >
            {connected ? "live · streaming" : "linking…"}
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
        <div className="omni-cursor h-3" />
      </div>
    </div>
  );
}
