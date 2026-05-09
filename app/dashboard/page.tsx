"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Cpu,
  Server,
  Activity,
  Wifi,
  WifiOff,
  MonitorCheck,
  MemoryStick,
  Thermometer,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wrench,
  GraduationCap,
  Terminal,
  Layers,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────
interface McpServer {
  name: string;
  command: string;
  graduated: boolean;
}
interface VllmEndpoint {
  port: number;
  model: string;
  healthy: boolean;
}
interface GpuInfo {
  vendor: string | null;
  vram_used_mb: number;
  vram_total_mb: number;
  util_pct: number;
  temp_c: number;
  name: string;
}
interface ModelInfo {
  name: string;
  base_url: string;
  max_tokens: number;
  mcp_servers: string[];
}
interface RecentRun {
  ts: string;
  model: string;
  prompt: string;
  iters: number;
  duration_ms: number;
  total_tokens: number;
  ok: boolean;
}
interface DashboardData {
  generated_at: string;
  health: { mcpconfig_ok: boolean; models_configured: number; mcp_servers: McpServer[] };
  gpu: GpuInfo | null;
  vllm_endpoints: VllmEndpoint[];
  models: ModelInfo[];
  workflow: { credentials: number; totps: number; flows: number; watches: number } | null;
  recent_runs: RecentRun[];
  ngrok: { online: boolean; url: string } | null;
}

// ── Palette (matches CPC local dashboard) ────────────────────────────
const C = {
  bg: "#0f1117",
  card: "#1a1d27",
  cardHover: "#242836",
  border: "#2d3140",
  text: "#e4e4e7",
  textSec: "#9ca3af",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  blue: "#3b82f6",
  purple: "#a855f7",
};

// ── Tiny helpers ─────────────────────────────────────────────────────
function Dot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        boxShadow: color === C.green ? `0 0 6px ${C.green}` : undefined,
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}

function Pill({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: C.text,
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "3px 10px",
      }}
    >
      <Dot color={ok ? C.green : C.red} />
      {label}
    </span>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${C.border}`,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: C.textSec,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {icon}
        {title}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      style={{
        padding: "1px 8px",
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 600,
        background: `${color}22`,
        color,
      }}
    >
      {text}
    </span>
  );
}

function VramBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? (used / total) * 100 : 0;
  const barColor = pct > 90 ? C.amber : pct > 70 ? C.blue : C.green;
  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: C.textSec,
          marginBottom: 4,
        }}
      >
        <span>VRAM</span>
        <span>
          {(used / 1024).toFixed(1)} / {(total / 1024).toFixed(1)} GB ({pct.toFixed(0)}%)
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: C.bg,
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: barColor,
            borderRadius: 4,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (!data && !error) {
    return (
      <div style={{ background: C.bg, color: C.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <span style={{ color: C.textSec }}>Loading dashboard...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ background: C.bg, color: C.red, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <AlertCircle size={16} style={{ marginRight: 6 }} /> {error}
      </div>
    );
  }

  const d = data!;
  const gpu = d.gpu;

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      {/* ── Top health strip ─────────────────────────────────────── */}
      <div
        style={{
          background: C.card,
          borderBottom: `1px solid ${C.border}`,
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14, marginRight: 8 }}>AIWander Droplet</span>
        <Pill label="mcpconfig :8003" ok={d.health.mcpconfig_ok} />
        {d.vllm_endpoints.map((ep) => (
          <Pill key={ep.port} label={`${ep.model} :${ep.port}`} ok={ep.healthy} />
        ))}
        <Pill
          label={d.ngrok ? `ngrok` : "ngrok"}
          ok={d.ngrok?.online ?? false}
        />
        {gpu && (
          <Pill label={`GPU ${gpu.util_pct}% / ${gpu.temp_c}\u00B0C`} ok={gpu.temp_c < 80} />
        )}
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.textSec }}>
          {d.generated_at.replace("T", " ").substring(0, 19)}Z
        </span>
      </div>

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Row 1: GPU + Models */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* GPU Card */}
          <Card title="GPU" icon={<Cpu size={13} />}>
            {gpu ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MonitorCheck size={16} color={C.blue} />
                  <span style={{ fontWeight: 500 }}>{gpu.name}</span>
                  <Badge text={gpu.vendor?.toUpperCase() ?? "?"} color={C.blue} />
                </div>
                <VramBar used={gpu.vram_used_mb} total={gpu.vram_total_mb} />
                <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
                  <span style={{ color: C.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                    <Activity size={12} /> Util: {gpu.util_pct}%
                  </span>
                  <span style={{ color: C.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                    <Thermometer size={12} /> Temp: {gpu.temp_c}&deg;C
                  </span>
                  <span style={{ color: C.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                    <MemoryStick size={12} /> {(gpu.vram_total_mb / 1024).toFixed(0)} GB VRAM
                  </span>
                </div>
              </div>
            ) : (
              <span style={{ color: C.textSec }}>GPU data unavailable</span>
            )}
          </Card>

          {/* Models Card */}
          <Card title="Models" icon={<Layers size={13} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {d.models.length === 0 && <span style={{ color: C.textSec }}>No models loaded</span>}
              {d.models.map((m) => {
                const ep = d.vllm_endpoints.find((e) => e.model === m.name);
                return (
                  <div
                    key={m.name}
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "8px 10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Dot color={ep?.healthy ? C.green : C.red} />
                      <span style={{ fontWeight: 500, fontSize: 12 }}>{m.name}</span>
                      <Badge text={`${m.max_tokens} tokens`} color={C.blue} />
                    </div>
                    <div style={{ fontSize: 11, color: C.textSec, marginTop: 4 }}>
                      {m.base_url}
                    </div>
                    <div style={{ fontSize: 10, color: C.textSec, marginTop: 3 }}>
                      MCP: {m.mcp_servers.join(", ")}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Row 2: MCP Servers + Workflow */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {/* MCP Servers */}
          <Card title={`MCP Servers (${d.health.mcp_servers.length})`} icon={<Server size={13} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {d.health.mcp_servers.map((s) => (
                <div
                  key={s.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                >
                  <Wrench size={12} color={C.textSec} />
                  <span style={{ fontWeight: 500, minWidth: 120 }}>{s.name}</span>
                  {s.graduated && (
                    <Badge text="graduated" color={C.purple} />
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      color: C.textSec,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 300,
                    }}
                    title={s.command}
                  >
                    {s.command.split("/").slice(-1)[0]}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Workflow Stats */}
          <Card title="Workflow" icon={<Activity size={13} />}>
            {d.workflow ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Credentials", value: d.workflow.credentials, icon: <Server size={14} /> },
                  { label: "TOTPs", value: d.workflow.totps, icon: <Clock size={14} /> },
                  { label: "Flows", value: d.workflow.flows, icon: <Activity size={14} /> },
                  { label: "Watches", value: d.workflow.watches, icon: <MonitorCheck size={14} /> },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      background: C.bg,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6,
                      padding: "10px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: C.textSec }}>Workflow data unavailable</span>
            )}
          </Card>
        </div>

        {/* Row 3: Recent Agent Runs */}
        <Card title="Recent Agent Runs" icon={<Terminal size={13} />}>
          {d.recent_runs.length === 0 ? (
            <span style={{ color: C.textSec }}>No recent runs</span>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 100px 1fr 60px 80px 80px 40px",
                  gap: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  color: C.textSec,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "4px 8px",
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <span>Time</span>
                <span>Model</span>
                <span>Prompt</span>
                <span>Iters</span>
                <span>Duration</span>
                <span>Tokens</span>
                <span>OK</span>
              </div>
              {d.recent_runs.map((run, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "130px 100px 1fr 60px 80px 80px 40px",
                    gap: 8,
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: i % 2 === 0 ? "transparent" : `${C.bg}88`,
                  }}
                >
                  <span style={{ color: C.textSec, fontVariantNumeric: "tabular-nums" }}>
                    {run.ts.replace("T", " ").substring(5, 19)}
                  </span>
                  <span>
                    <Badge
                      text={run.model}
                      color={run.model.includes("qwen") ? C.green : C.blue}
                    />
                  </span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: C.textSec,
                    }}
                    title={run.prompt}
                  >
                    {run.prompt}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{run.iters}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: C.textSec }}>
                    {run.duration_ms >= 1000
                      ? `${(run.duration_ms / 1000).toFixed(1)}s`
                      : `${run.duration_ms}ms`}
                  </span>
                  <span style={{ fontVariantNumeric: "tabular-nums", color: C.textSec }}>
                    {run.total_tokens.toLocaleString()}
                  </span>
                  <span>
                    {run.ok ? (
                      <CheckCircle2 size={14} color={C.green} />
                    ) : (
                      <XCircle size={14} color={C.red} />
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "8px 16px",
          fontSize: 10,
          color: C.textSec,
          textAlign: "center",
          borderTop: `1px solid ${C.border}`,
        }}
      >
        AIWander Node UI &mdash; AMD MI300X Hackathon &mdash; Polls every 5s
        {error && (
          <span style={{ color: C.amber, marginLeft: 12 }}>
            <AlertCircle size={10} style={{ verticalAlign: "middle" }} /> {error}
          </span>
        )}
      </div>
    </div>
  );
}
