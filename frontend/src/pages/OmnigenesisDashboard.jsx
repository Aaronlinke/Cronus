import { useState, useEffect } from "react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import SultanTerminal from "@/components/dashboard/SultanTerminal";
import ChronoField from "@/components/dashboard/ChronoField";
import KernelControls from "@/components/dashboard/KernelControls";
import BalanceChecker from "@/components/dashboard/BalanceChecker";
import InversionResult from "@/components/dashboard/InversionResult";

export default function OmnigenesisDashboard() {
  const [kernel, setKernel] = useState({
    causality_entropy: 0.42,
    twist_45: 0.5,
    pec_gamma: 0.35,
  });
  const [target, setTarget] = useState({ address: null, hash160: null });

  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      data-testid="omnigenesis-root"
      className="md:h-screen w-screen bg-[#030303] text-gray-200 p-3 md:p-4 flex flex-col gap-3 md:overflow-hidden min-h-screen"
    >
      <DashboardHeader clock={clock} kernel={kernel} target={target} />

      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        <div className="col-span-12 md:col-span-4 row-span-2 min-h-[260px] md:min-h-0 flex">
          <SultanTerminal target={target} />
        </div>

        <div className="col-span-12 md:col-span-5 min-h-[320px] md:min-h-0 flex">
          <ChronoField kernel={kernel} />
        </div>

        <div className="col-span-12 md:col-span-3 min-h-[280px] md:min-h-0 flex">
          <InversionResult kernel={kernel} target={target} />
        </div>

        <div className="col-span-12 md:col-span-5 min-h-[240px] md:min-h-0 flex">
          <KernelControls kernel={kernel} setKernel={setKernel} />
        </div>

        <div className="col-span-12 md:col-span-3 min-h-[240px] md:min-h-0 flex">
          <BalanceChecker setTarget={setTarget} />
        </div>
      </div>
    </div>
  );
}
