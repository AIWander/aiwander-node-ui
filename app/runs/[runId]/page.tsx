"use client";

import { useEffect, useState, use } from "react";
import { parseHarmony } from "@/lib/harmony";

const C = {
  bg: "#0f1117",
  card: "#1a1d27",
  border: "#2d3140",
  text: "#e4e4e7",
  textSec: "#9ca3af",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  blue: "#3b82f6",
  purple: "#a855f7",
};

interface RunEvent {
  kind: string;
  ts?: string;
  iteration?: number;
  content?: string;
  name?: string;
  arguments?: string;
  ok?: boolean;
  error?: string;
  duration_ms?: number;
  iterations?: number;
  total_tokens?: number;
  [key: string]: unknown;
}

interface RunData {
  run_id: string;
  plan: string;
  status: string;
  events: RunEvent[];
  files: string[];
}

function CollapsibleSection({
  title,
  defaultOpen,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "transparent",
          border: "none",
          borderBottom: open ? `1px solid ${C.border}` : "none",
          color: C.text,
          fontSize: 12,
          fontWeight: 600,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ transition: "transform 0.2s", transform: open ? "rotate(90deg)" : "rotate(0)" }}>
          {"\u25B6"}
        </span>
        {title}
        {badge && (
          <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: `${C.blue}22`, color: C.blue }}>
            {badge}
          </span>
        )}
      </button>
      {open && <div style={{ padding: 12 }}>{children}</div>}
    </div>
  );
}

export default function RunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = use(params);
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/runs/phased/${runId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [runId]);

  if (error) {
    return (
      <div style={{ background: C.bg, color: C.red, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ background: C.bg, color: C.textSec, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        Loading transcript...
      </div>
    );
  }

  // Group events by iteration
  const iterations: Map<number, RunEvent[]> = new Map();
  let runEnd: RunEvent | null = null;
  for (const ev of data.events) {
    if (ev.kind === "run_end") {
      runEnd = ev;
      continue;
    }
    const iter = ev.iteration ?? 0;
    if (!iterations.has(iter)) iterations.set(iter, []);
    iterations.get(iter)!.push(ev);
  }

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
      {/* Header */}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <a href="/dashboard" style={{ color: C.blue, textDecoration: "none", fontSize: 12 }}>&larr; Dashboard</a>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Phased Run: {data.run_id}</span>
        {runEnd && (
          <>
            <span style={{ fontSize: 11, color: C.textSec }}>
              {runEnd.iterations} iterations &middot; {((runEnd.duration_ms || 0) / 1000).toFixed(1)}s &middot; {(runEnd.total_tokens || 0).toLocaleString()} tokens
            </span>
            <span style={{ padding: "1px 8px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: runEnd.ok ? `${C.green}22` : `${C.red}22`, color: runEnd.ok ? C.green : C.red }}>
              {runEnd.ok ? "OK" : "ERROR"}
            </span>
          </>
        )}
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Plan */}
        <CollapsibleSection title="Plan of Action" defaultOpen={true} badge="Phase 1">
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: C.textSec, margin: 0, lineHeight: 1.6 }}>
            {data.plan || "No plan found"}
          </pre>
        </CollapsibleSection>

        {/* Iterations */}
        {Array.from(iterations.entries())
          .sort(([a], [b]) => a - b)
          .map(([iter, events]) => {
            const toolCalls = events.filter((e) => e.kind === "tool_call");
            const toolResults = events.filter((e) => e.kind === "tool_result");
            const llmResp = events.find((e) => e.kind === "llm_response");
            const finalAns = events.find((e) => e.kind === "final_answer");

            let thinking = "";
            let finalContent = "";
            if (llmResp?.content) {
              const parsed = parseHarmony(llmResp.content);
              thinking = parsed.thinking;
              finalContent = parsed.final;
            }
            if (finalAns?.content) {
              const parsed = parseHarmony(finalAns.content);
              if (parsed.thinking) thinking = thinking ? thinking + "\n\n" + parsed.thinking : parsed.thinking;
              if (parsed.final) finalContent = parsed.final;
            }

            return (
              <CollapsibleSection
                key={iter}
                title={`Iteration ${iter}`}
                badge={`${toolCalls.length} tool calls`}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Thinking */}
                  {thinking && (
                    <div style={{ background: `${C.amber}11`, border: `1px solid ${C.amber}33`, borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: C.amber, marginBottom: 4 }}>THINKING</div>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: C.textSec, margin: 0 }}>{thinking}</pre>
                    </div>
                  )}

                  {/* Tool calls */}
                  {toolCalls.map((tc, i) => {
                    const result = toolResults.find((r) => r.kind === "tool_result" && (r as Record<string, unknown>).id === (tc as Record<string, unknown>).id);
                    return (
                      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.blue }}>{tc.name}</span>
                          {result && (
                            <span style={{ fontSize: 10, color: result.ok ? C.green : C.red }}>
                              {result.ok ? "OK" : "FAIL"}
                            </span>
                          )}
                        </div>
                        {tc.arguments && (
                          <pre style={{ whiteSpace: "pre-wrap", fontSize: 10, color: C.textSec, margin: 0, maxHeight: 100, overflow: "auto" }}>
                            {(() => { try { return JSON.stringify(JSON.parse(tc.arguments), null, 2); } catch { return tc.arguments; } })()}
                          </pre>
                        )}
                        {result?.content && (
                          <pre style={{ whiteSpace: "pre-wrap", fontSize: 10, color: C.textSec, margin: "4px 0 0", maxHeight: 150, overflow: "auto", borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                            {result.content.length > 500 ? result.content.slice(0, 500) + "..." : result.content}
                          </pre>
                        )}
                      </div>
                    );
                  })}

                  {/* Final content */}
                  {finalContent && (
                    <div style={{ background: `${C.green}11`, border: `1px solid ${C.green}33`, borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: C.green, marginBottom: 4 }}>RESPONSE</div>
                      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: C.text, margin: 0 }}>{finalContent}</pre>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            );
          })}

        {/* Final Status */}
        {data.status && (
          <CollapsibleSection title="Final STATUS.md" badge="Result">
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: C.textSec, margin: 0, lineHeight: 1.6 }}>
              {data.status}
            </pre>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
