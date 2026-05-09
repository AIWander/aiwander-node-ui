"use client";

import { useEffect, useState, useCallback } from "react";
import { PHASE_LABELS, type Phase } from "@/lib/defaults";
import { ArrowLeftRight } from "lucide-react";

export function PhaseChip() {
  const [phase, setPhase] = useState<Phase>("unknown");
  const [switching, setSwitching] = useState(false);

  const fetchPhase = useCallback(async () => {
    try {
      const res = await fetch("/api/phase");
      if (res.ok) {
        const data = await res.json();
        setPhase(data.phase as Phase);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchPhase();
    const id = setInterval(fetchPhase, 5000);
    return () => clearInterval(id);
  }, [fetchPhase]);

  const handleSwap = async () => {
    const target = phase === "phase1-plan" ? "phase2-execute" : "phase1-plan";
    setSwitching(true);
    try {
      await fetch("/api/swap-phase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      setTimeout(fetchPhase, 3000);
    } finally {
      setSwitching(false);
    }
  };

  const label = PHASE_LABELS[phase];
  const phaseNum = phase === "phase1-plan" ? 1 : phase === "phase2-execute" ? 2 : null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs w-fit">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          phase === "unknown" ? "bg-zinc-500" : "bg-green-500 animate-pulse"
        }`}
      />
      <span className="text-muted-foreground">
        {phaseNum ? `Phase ${phaseNum}` : "Idle"}
      </span>
      <span className="font-medium">{label.lead}</span>
      {label.backing.length > 0 && (
        <span className="text-muted-foreground">
          + {label.backing.join(" + ")}
        </span>
      )}
      {phase !== "unknown" && (
        <button
          onClick={handleSwap}
          disabled={switching}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title={`Switch to ${phase === "phase1-plan" ? "Phase 2" : "Phase 1"}`}
        >
          <ArrowLeftRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
