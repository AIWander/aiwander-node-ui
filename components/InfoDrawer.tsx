"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronDown, Wrench, Cpu, Brain, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ---------- Types ---------- */

export interface DrawerToolCall {
  id: string;
  name: string;
  iteration: number;
  args: string;
  result?: { ok: boolean; content: string };
}

export interface ReasoningEntry {
  iteration: number;
  content: string;
}

interface VramPoint {
  ts: string;
  used_mib: number;
  free_mib: number;
  total_mib: number;
  gpu_util_pct?: number;
}

interface InfoDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  toolCalls: DrawerToolCall[];
  reasoning: ReasoningEntry[];
}

/* ---------- Sub-components ---------- */

function ToolEntry({ tc }: { tc: DrawerToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const [showFull, setShowFull] = useState(false);

  let fmtArgs = tc.args;
  try { fmtArgs = JSON.stringify(JSON.parse(tc.args), null, 2); } catch { /* keep raw */ }
  const truncArgs = !expanded && fmtArgs.length > 120 ? fmtArgs.slice(0, 120) + "..." : fmtArgs;
  const resultPreview = tc.result
    ? (showFull ? tc.result.content : tc.result.content.slice(0, 300) + (tc.result.content.length > 300 ? "..." : ""))
    : null;

  return (
    <div className="border-b border-border py-2">
      <button className="flex w-full items-center gap-2 text-left text-xs" onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <Badge variant="secondary" className="text-[10px] px-1">{tc.iteration}</Badge>
        <code className="font-mono truncate">{tc.name}</code>
        {tc.result && (
          <Badge variant={tc.result.ok ? "default" : "destructive"} className="ml-auto text-[10px] px-1">
            {tc.result.ok ? "ok" : "err"}
          </Badge>
        )}
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 pl-5">
          <pre className="overflow-x-auto rounded bg-muted p-1.5 text-[11px] leading-tight">{truncArgs}</pre>
          {resultPreview !== null && (
            <div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-1.5 text-[11px] leading-tight">{resultPreview}</pre>
              {tc.result && tc.result.content.length > 300 && !showFull && (
                <button onClick={() => setShowFull(true)} className="text-[10px] text-primary underline mt-0.5">Show full</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VramChart() {
  const [points, setPoints] = useState<VramPoint[]>([]);
  const [latest, setLatest] = useState<VramPoint | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/vram");
      if (!res.ok) return;
      const d: VramPoint & { mock?: boolean } = await res.json();
      const label = new Date(d.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const pt = { ...d, ts: label };
      setLatest(pt);
      setPoints((prev) => [...prev.slice(-29), pt]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [poll]);

  return (
    <div className="space-y-2">
      {latest && (
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span>Total: <strong>{latest.total_mib}</strong> MiB</span>
          <span>Used: <strong>{latest.used_mib}</strong></span>
          <span>Free: <strong>{latest.free_mib}</strong></span>
          {latest.gpu_util_pct !== undefined && <span>GPU: <strong>{latest.gpu_util_pct}%</strong></span>}
        </div>
      )}
      {points.length > 1 && (
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={points}>
            <XAxis dataKey="ts" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 9 }} width={40} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="used_mib" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Used MiB" />
          </LineChart>
        </ResponsiveContainer>
      )}
      {points.length <= 1 && <p className="text-[11px] text-muted-foreground">Collecting data...</p>}
    </div>
  );
}

function ReasoningSection({ entries }: { entries: ReasoningEntry[] }) {
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  if (entries.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No reasoning content received yet.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((e, i) => {
        const isCollapsed = collapsed[i] ?? false;
        return (
          <div key={i} className="border-b border-border pb-2">
            <button
              className="flex items-center gap-1 text-xs font-medium"
              onClick={() => setCollapsed((p) => ({ ...p, [i]: !isCollapsed }))}
            >
              {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Iteration {e.iteration}
            </button>
            {!isCollapsed && (
              <pre className="mt-1 whitespace-pre-wrap rounded bg-muted p-2 text-[11px] leading-relaxed">{e.content}</pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Main drawer ---------- */

type Section = "tools" | "vram" | "reasoning";

export function InfoDrawer({ isOpen, onToggle, toolCalls, reasoning }: InfoDrawerProps) {
  const [active, setActive] = useState<Section>("tools");

  // Collapse to icon strip on small screens when open
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-md bg-card border border-r-0 border-border p-2 shadow-lg hover:bg-accent transition-colors"
        title="Open info drawer"
      >
        <PanelRightOpen className="h-5 w-5" />
      </button>
    );
  }

  const tabs: { key: Section; icon: typeof Wrench; label: string }[] = [
    { key: "tools", icon: Wrench, label: "Tools" },
    { key: "vram", icon: Cpu, label: "VRAM" },
    { key: "reasoning", icon: Brain, label: "Reasoning" },
  ];

  return (
    <div className="fixed right-0 top-0 z-40 flex h-full w-80 max-w-[90vw] flex-col border-l border-border bg-card shadow-xl md:relative md:w-72 md:shadow-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                active === t.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onToggle} className="rounded p-1 hover:bg-accent transition-colors" title="Close drawer">
          <PanelRightClose className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-3 py-2">
        {active === "tools" && (
          toolCalls.length === 0
            ? <p className="text-[11px] text-muted-foreground">No tool calls yet.</p>
            : toolCalls.map((tc) => <ToolEntry key={tc.id} tc={tc} />)
        )}
        {active === "vram" && <VramChart />}
        {active === "reasoning" && <ReasoningSection entries={reasoning} />}
      </ScrollArea>
    </div>
  );
}
