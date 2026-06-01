import { useState } from "react";
import { CurrencyBtc, MagnifyingGlass, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

const SATS = 1e8;

export default function BalanceChecker({ setTarget }) {
  const [addr, setAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fetchBalance = async () => {
    const a = addr.trim();
    if (!a) {
      toast.error("address required");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`https://blockstream.info/api/address/${a}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const funded = data.chain_stats.funded_txo_sum;
      const spent = data.chain_stats.spent_txo_sum;
      const m_funded = data.mempool_stats.funded_txo_sum;
      const m_spent = data.mempool_stats.spent_txo_sum;
      const balanceSats = funded - spent + m_funded - m_spent;
      setResult({
        address: data.address,
        balance: balanceSats / SATS,
        tx_count: data.chain_stats.tx_count,
        funded: funded / SATS,
        spent: spent / SATS,
      });
      if (setTarget) setTarget({ address: data.address, hash160: null });
    } catch (e) {
      setError(e.message || "lookup failed");
      toast.error("blockstream lookup failed");
    } finally {
      setLoading(false);
    }
  };

  const lockTarget = () => {
    if (!result) return;
    if (setTarget) setTarget({ address: result.address, hash160: null });
    toast.success("target locked → inversion kernel");
  };

  return (
    <div
      data-testid="balance-checker"
      className="omni-panel p-3 w-full min-h-0 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="omni-panel-title">
          <CurrencyBtc size={12} weight="bold" />
          Blockchain Balance Checker
        </div>
        <div className="text-[9px] tracking-[0.25em] uppercase text-amber-400/60">
          blockstream
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <input
          data-testid="balance-input"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchBalance()}
          placeholder="bc1q... · 1... · 3..."
          className="flex-1 bg-black/60 border border-amber-500/20 px-2 py-1.5 text-xs omni-mono text-amber-200 placeholder:text-amber-500/30 focus:outline-none focus:border-amber-400/80"
        />
        <button
          data-testid="balance-fetch-btn"
          onClick={fetchBalance}
          disabled={loading}
          className="px-3 py-1.5 border border-amber-400/70 text-amber-300 text-[10px] tracking-[0.25em] uppercase hover:bg-amber-400/10 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <span className="omni-pulse">scan</span>
          ) : (
            <>
              <MagnifyingGlass size={11} weight="bold" /> scan
            </>
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto omni-mono text-[11px] mt-1">
        {!result && !error && !loading && (
          <div className="text-amber-500/40 text-[10px] tracking-wider">
            // awaiting target address
          </div>
        )}
        {loading && (
          <div className="text-cyan-300 omni-pulse text-[10px] tracking-wider">
            // querying mainnet…
          </div>
        )}
        {error && (
          <div
            data-testid="balance-error"
            className="text-red-400 flex items-center gap-1.5 text-[10px]"
          >
            <Warning size={12} /> {error}
          </div>
        )}
        {result && (
          <div data-testid="balance-result" className="space-y-1">
            <div className="text-amber-400/60 text-[9px] tracking-[0.25em] uppercase">
              balance
            </div>
            <div className="text-amber-200 text-xl font-bold tracking-tight tabular-nums">
              {result.balance.toFixed(8)}{" "}
              <span className="text-[10px] text-amber-400/70 tracking-[0.3em]">
                BTC
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-gray-400 mt-1">
              <span>tx · {result.tx_count}</span>
              <span>in · {result.funded.toFixed(4)}</span>
              <span className="truncate col-span-2 text-amber-500/50">
                {result.address}
              </span>
            </div>
            <button
              data-testid="lock-target-btn"
              onClick={lockTarget}
              className="mt-1.5 w-full py-1 border border-cyan-400/60 text-cyan-300 text-[9px] tracking-[0.3em] uppercase hover:bg-cyan-400/10"
            >
              ↳ lock as inversion target
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
