import { Slider } from "@/components/ui/slider";
import { Sliders } from "@phosphor-icons/react";

const ROWS = [
  { key: "causality_entropy", label: "Causality Entropy", code: "SCC-Δ" },
  { key: "twist_45", label: "45° Twist", code: "TWS-45" },
  { key: "pec_gamma", label: "PEC-Gamma", code: "PEC-Γ" },
];

export default function KernelControls({ kernel, setKernel }) {
  return (
    <div
      data-testid="kernel-controls"
      className="omni-panel p-3 w-full min-h-0 flex flex-col"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="omni-panel-title">
          <Sliders size={12} weight="bold" />
          Logic-Kernel Controls
        </div>
        <div className="text-[9px] tracking-[0.25em] uppercase text-amber-400/60">
          live · armed
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 gap-4 content-center">
        {ROWS.map((r) => (
          <div key={r.key} className="omni-mono">
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] tracking-[0.25em] uppercase text-amber-400">
                  {r.code}
                </span>
                <span className="text-[10px] tracking-wider uppercase text-gray-400">
                  {r.label}
                </span>
              </div>
              <span
                className="text-amber-300 text-xs tabular-nums"
                data-testid={`kernel-value-${r.key}`}
              >
                {kernel[r.key].toFixed(4)}
              </span>
            </div>
            <div className="omni-slider">
              <Slider
                data-testid={`kernel-slider-${r.key}`}
                value={[kernel[r.key]]}
                min={0}
                max={1}
                step={0.001}
                onValueChange={(v) =>
                  setKernel((k) => ({ ...k, [r.key]: v[0] }))
                }
              />
            </div>
            <div className="flex justify-between text-[8px] tracking-[0.3em] uppercase text-amber-500/30 mt-1">
              <span>0.000</span>
              <span>0.500</span>
              <span>1.000</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
