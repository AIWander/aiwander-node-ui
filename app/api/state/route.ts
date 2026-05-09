import { readFile } from "fs/promises";
import { MCPCONFIG_URL } from "@/lib/defaults";

const STATE_PATH = "/opt/cpc/state/STATE.md";

interface DropletState {
  generated_at: string;
  markdown: string;
  mcpconfig_healthy: boolean;
  models_configured: number | null;
  mcp_servers: string[];
  vllm_endpoints: { port: number; healthy: boolean; model: string | null }[];
}

async function getDropletState(): Promise<DropletState> {
  const [mdResult, healthResult] = await Promise.allSettled([
    readFile(STATE_PATH, "utf8"),
    fetch(`${MCPCONFIG_URL}/health`, { signal: AbortSignal.timeout(2500) }),
  ]);

  const markdown =
    mdResult.status === "fulfilled"
      ? mdResult.value
      : "(STATE.md not readable on droplet)";

  let health: { models_configured?: number; mcp_servers?: { name: string }[] } | null = null;
  if (healthResult.status === "fulfilled" && healthResult.value.ok) {
    try {
      health = await healthResult.value.json();
    } catch {
      health = null;
    }
  }

  // Probe vLLM ports listed in STATE.md
  const portRegex = /:(\d+) — \*\*(healthy|DOWN)\*\* — serves `([^`]+)`/g;
  const endpoints: DropletState["vllm_endpoints"] = [];
  let m: RegExpExecArray | null;
  while ((m = portRegex.exec(markdown)) !== null) {
    endpoints.push({
      port: parseInt(m[1], 10),
      healthy: m[2] === "healthy",
      model: m[3],
    });
  }

  return {
    generated_at: new Date().toISOString(),
    markdown,
    mcpconfig_healthy: !!health,
    models_configured: health?.models_configured ?? null,
    mcp_servers: (health?.mcp_servers ?? []).map((s) => s.name),
    vllm_endpoints: endpoints,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderHtml(state: DropletState): string {
  const escaped = escapeHtml(state.markdown);
  const statusLine = state.mcpconfig_healthy
    ? `<span style="color:#22c55e">● ${state.models_configured} models, ${state.mcp_servers.length} MCP servers</span>`
    : `<span style="color:#ef4444">● mcpconfig unreachable</span>`;
  const ts = state.generated_at.replace("T", " ").substring(0, 19);
  const endpointsLine = state.vllm_endpoints
    .map((e) => `${e.healthy ? "🟢" : "🔴"} :${e.port}`)
    .join(" ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="refresh" content="30">
<title>Droplet — AIWander</title>
<style>
  body { background:#0f1117; color:#e4e4e7; font-family:'Segoe UI',system-ui,sans-serif; padding:12px; margin:0; font-size:12px; line-height:1.5; }
  pre { white-space:pre-wrap; word-wrap:break-word; font-family:'Cascadia Code','Consolas',monospace; font-size:11px; color:#e4e4e7; margin:0; }
  .status { font-size:11px; padding:6px 8px; border:1px solid #2d3140; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; background:#1a1d27; }
  .endpoints { color:#9ca3af; font-size:11px; }
  .ts { color:#6b7280; font-size:10px; }
</style>
</head>
<body>
<div class="status">
  <div>${statusLine}</div>
  <div class="endpoints">${endpointsLine}</div>
  <div class="ts">refreshed ${ts}Z</div>
</div>
<pre>${escaped}</pre>
</body>
</html>`;
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const state = await getDropletState();

  if (format === "html") {
    return new Response(renderHtml(state), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "frame-ancestors *",
      },
    });
  }

  return Response.json(state, {
    headers: { "Cache-Control": "no-store" },
  });
}
