import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { MCPCONFIG_URL } from "@/lib/defaults";

const TRANSCRIPT_DIR = "/opt/cpc/transcripts";
const WORKFLOW_DIR = "/root/.cpc/workflow";
const GRADUATED_DIR = "/root/.cpc/graduated";

interface GpuInfo {
  vendor: "amd" | "nvidia" | null;
  vram_used_mb: number;
  vram_total_mb: number;
  util_pct: number;
  temp_c: number;
  name: string;
}

interface VllmEndpoint {
  port: number;
  model: string;
  healthy: boolean;
}

interface McpServer {
  name: string;
  command: string;
  graduated: boolean;
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
  health: {
    mcpconfig_ok: boolean;
    models_configured: number;
    mcp_servers: McpServer[];
  };
  gpu: GpuInfo | null;
  vllm_endpoints: VllmEndpoint[];
  models: { name: string; base_url: string; max_tokens: number; mcp_servers: string[] }[];
  workflow: { credentials: number; totps: number; flows: number; watches: number } | null;
  recent_runs: RecentRun[];
  ngrok: { online: boolean; url: string } | null;
}

async function getGpu(): Promise<GpuInfo | null> {
  try {
    const { execSync } = await import("child_process");
    const memOut = execSync("rocm-smi --showmeminfo vram 2>/dev/null", { encoding: "utf8", timeout: 5000 });
    const tempOut = execSync("rocm-smi --showtemp 2>/dev/null", { encoding: "utf8", timeout: 5000 });
    const useOut = execSync("rocm-smi --showuse 2>/dev/null", { encoding: "utf8", timeout: 5000 });
    const conciseOut = execSync("rocm-smi 2>/dev/null", { encoding: "utf8", timeout: 5000 });

    const totalMatch = memOut.match(/VRAM Total Memory \(B\):\s*(\d+)/);
    const usedMatch = memOut.match(/VRAM Total Used Memory \(B\):\s*(\d+)/);
    const tempMatch = tempOut.match(/Temperature \(Sensor junction\) \(C\):\s*([\d.]+)/);
    const useMatch = useOut.match(/GPU use \(%\):\s*(\d+)/);

    let gpuName = "AMD MI300X";
    const didMatch = conciseOut.match(/0x([0-9a-fA-F]+)/);
    if (didMatch) gpuName = `AMD MI300X (0x${didMatch[1]})`;

    return {
      vendor: "amd",
      vram_used_mb: usedMatch ? Math.round(parseInt(usedMatch[1]) / 1048576) : 0,
      vram_total_mb: totalMatch ? Math.round(parseInt(totalMatch[1]) / 1048576) : 0,
      util_pct: useMatch ? parseInt(useMatch[1]) : 0,
      temp_c: tempMatch ? parseFloat(tempMatch[1]) : 0,
      name: gpuName,
    };
  } catch {
    return null;
  }
}

async function getVllmEndpoints(): Promise<VllmEndpoint[]> {
  const ports = [
    { port: 8001, model: "gpt-oss-120b" },
    { port: 8004, model: "qwen3-coder" },
  ];
  const results = await Promise.allSettled(
    ports.map(async (p) => {
      const res = await fetch(`http://127.0.0.1:${p.port}/v1/models`, {
        signal: AbortSignal.timeout(2000),
      });
      return { ...p, healthy: res.ok };
    })
  );
  return results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { ...ports[i], healthy: false }
  );
}

async function getHealth(): Promise<{
  mcpconfig_ok: boolean;
  models_configured: number;
  mcp_servers: McpServer[];
}> {
  try {
    const res = await fetch(`${MCPCONFIG_URL}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    const servers: McpServer[] = (data.mcp_servers || []).map(
      (s: { name: string; command: string }) => ({
        name: s.name,
        command: s.command,
        graduated: s.command.includes(GRADUATED_DIR),
      })
    );
    return {
      mcpconfig_ok: true,
      models_configured: data.models_configured || 0,
      mcp_servers: servers,
    };
  } catch {
    return { mcpconfig_ok: false, models_configured: 0, mcp_servers: [] };
  }
}

async function getModels(): Promise<
  { name: string; base_url: string; max_tokens: number; mcp_servers: string[] }[]
> {
  try {
    const toml = await readFile("/root/mcpconfig/config/models.toml", "utf8");
    const models: { name: string; base_url: string; max_tokens: number; mcp_servers: string[] }[] = [];
    const blocks = toml.split("[[models]]").slice(1);
    for (const block of blocks) {
      const name = block.match(/name\s*=\s*"([^"]+)"/)?.[1] ?? "unknown";
      const base_url = block.match(/base_url\s*=\s*"([^"]+)"/)?.[1] ?? "";
      const max_tokens = parseInt(block.match(/max_tokens\s*=\s*(\d+)/)?.[1] ?? "0");
      const mcpMatch = block.match(/mcp_servers\s*=\s*\[([^\]]*)\]/);
      const mcp_servers = mcpMatch
        ? mcpMatch[1].match(/"([^"]+)"/g)?.map((s) => s.replace(/"/g, "")) ?? []
        : [];
      models.push({ name, base_url, max_tokens, mcp_servers });
    }
    return models;
  } catch {
    return [];
  }
}

async function getNgrok(): Promise<{ online: boolean; url: string } | null> {
  try {
    const res = await fetch("http://127.0.0.1:4040/api/tunnels", {
      signal: AbortSignal.timeout(2000),
    });
    const data = await res.json();
    const nodeui = data.tunnels?.find(
      (t: { name: string }) => t.name === "nodeui"
    );
    return nodeui
      ? { online: true, url: nodeui.public_url }
      : { online: false, url: "" };
  } catch {
    return null;
  }
}

async function getWorkflow(): Promise<{
  credentials: number;
  totps: number;
  flows: number;
  watches: number;
} | null> {
  try {
    const count = async (sub: string) => {
      try {
        const files = await readdir(join(WORKFLOW_DIR, sub));
        return files.length;
      } catch {
        return 0;
      }
    };
    return {
      credentials: await count("credentials"),
      totps: await count("totps"),
      flows: await count("flows"),
      watches: await count("watches"),
    };
  } catch {
    return null;
  }
}

async function getRecentRuns(): Promise<RecentRun[]> {
  try {
    const dates = await readdir(TRANSCRIPT_DIR);
    const sorted = dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse().slice(0, 2);

    const runs: RecentRun[] = [];
    for (const date of sorted) {
      const dir = join(TRANSCRIPT_DIR, date);
      const files = await readdir(dir);
      const mdFiles = files.filter((f) => f.endsWith(".md")).sort().reverse();
      for (const file of mdFiles) {
        if (runs.length >= 10) break;
        try {
          const content = await readFile(join(dir, file), "utf8");
          const modelMatch = content.match(/\*\*Model:\*\*\s*(\S+)/);
          const durationMatch = content.match(/\*\*Duration:\*\*\s*(\d+)ms/);
          const itersMatch = content.match(/\((\d+) iterations?\)/);
          const tokensMatch = content.match(/\*\*Tokens:\*\*\s*(\d+)/);
          const promptMatch = content.match(/>\s*(.+)/);
          const titleMatch = content.match(/^# (.+)/);
          const timeCode = file.match(/^(\d{6})/)?.[1] ?? "000000";
          const hrs = timeCode.substring(0, 2);
          const mins = timeCode.substring(2, 4);
          const secs = timeCode.substring(4, 6);
          const ts = `${date}T${hrs}:${mins}:${secs}Z`;

          const hasError = content.includes("error") && content.includes("rejected");

          runs.push({
            ts,
            model: modelMatch?.[1] ?? "unknown",
            prompt: (promptMatch?.[1] ?? titleMatch?.[1] ?? file).substring(0, 80),
            iters: parseInt(itersMatch?.[1] ?? "0"),
            duration_ms: parseInt(durationMatch?.[1] ?? "0"),
            total_tokens: parseInt(tokensMatch?.[1] ?? "0"),
            ok: !hasError,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
    return runs.slice(0, 10);
  } catch {
    return [];
  }
}

export async function GET(): Promise<Response> {
  const [health, gpu, vllm, models, ngrok, workflow, runs] =
    await Promise.allSettled([
      getHealth(),
      getGpu(),
      getVllmEndpoints(),
      getModels(),
      getNgrok(),
      getWorkflow(),
      getRecentRuns(),
    ]);

  const data: DashboardData = {
    generated_at: new Date().toISOString(),
    health: health.status === "fulfilled" ? health.value : { mcpconfig_ok: false, models_configured: 0, mcp_servers: [] },
    gpu: gpu.status === "fulfilled" ? gpu.value : null,
    vllm_endpoints: vllm.status === "fulfilled" ? vllm.value : [],
    models: models.status === "fulfilled" ? models.value : [],
    workflow: workflow.status === "fulfilled" ? workflow.value : null,
    recent_runs: runs.status === "fulfilled" ? runs.value : [],
    ngrok: ngrok.status === "fulfilled" ? ngrok.value : null,
  };

  return Response.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
