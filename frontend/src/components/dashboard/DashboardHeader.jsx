import { Pulse, Lightning, ShieldCheck, Crosshair } from "@phosphor-icons/react";

export default function DashboardHeader({ clock, kernel, target }) {
  const tStr = clock.toISOString().replace("T", " ").slice(0, 19) + "Z";
  return (
    <header
      data-testid="dashboard-header"
      className="flex items-center justify-between border-b border-amber-500/20 pb-3"
    >
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} weight="bold" color="#FFB000" />
          <h1
            className="omni-heading font-extrabold text-amber-400 text-lg md:text-xl tracking-tighter"
            data-testid="header-title"
          >
            OMNIGENESIS
          </h1>
          <span className="text-[10px] tracking-[0.3em] text-amber-400/60 hidden md:inline">
            // MASTER DASHBOARD
          </span>
          <span
            data-testid="sim-badge"
            className="omni-mono text-[9px] tracking-[0.25em] uppercase px-1.5 py-0.5 border border-cyan-400/60 text-cyan-300 ml-2"
            title="Theoretische Simulation – keine reale Schlüsselableitung."
          >
            ▲ theoretical · sim
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase text-gray-400">
          <span className="omni-status-dot cyan" />
          <span>Φ {kernel.causality_entropy.toFixed(3)}</span>
          <span className="text-amber-500/40">|</span>
          <span>θ {kernel.twist_45.toFixed(3)}</span>
          <span className="text-amber-500/40">|</span>
          <span>Γ {kernel.pec_gamma.toFixed(3)}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {target?.address && (
          <div
            data-testid="header-target"
            className="hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-amber-300 border border-amber-400/40 px-2 py-1 omni-mono"
          >
            <Crosshair size={12} weight="bold" />
            <span className="text-amber-400/60">target</span>
            <span>{target.address.slice(0, 8)}…{target.address.slice(-6)}</span>
          </div>
        )}
        <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gray-400">
          <Pulse size={14} color="#34C759" />
          <span>link · stable</span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-gray-400">
          <Lightning size={14} color="#FFB000" />
          <span>pwr · nominal</span>
        </div>
        <div
          className="omni-mono text-amber-400 text-xs tracking-wider"
          data-testid="header-clock"
        >
          {tStr}
        </div>
      </div>
    </header>
  );
}
