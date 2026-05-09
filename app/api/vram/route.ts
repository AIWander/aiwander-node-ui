import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

interface VramData {
  total_mib: number;
  used_mib: number;
  free_mib: number;
  gpu_util_pct?: number;
  ts: string;
  mock: boolean;
}

let cache: { data: VramData; at: number } | null = null;
const CACHE_TTL = 4000;

async function queryRocm(): Promise<VramData> {
  const ts = new Date().toISOString();
  try {
    const { stdout } = await execAsync(
      "rocm-smi --showmeminfo vram --csv 2>/dev/null && rocm-smi --showuse --csv 2>/dev/null",
      { timeout: 5000 },
    );
    const lines = stdout.trim().split("\n");
    let total = 0, used = 0;
    let gpuUtil: number | undefined;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("total") && lower.includes("vram")) {
        const m = line.match(/(\d+)/);
        if (m) total = parseInt(m[1]) / (1024 * 1024); // bytes to MiB
      } else if (lower.includes("used") && lower.includes("vram")) {
        const m = line.match(/(\d+)/);
        if (m) used = parseInt(m[1]) / (1024 * 1024);
      } else if (lower.includes("gpu use") || lower.includes("gpu%")) {
        const m = line.match(/(\d+)/);
        if (m) gpuUtil = parseInt(m[1]);
      }
    }

    if (total > 0) {
      return { total_mib: Math.round(total), used_mib: Math.round(used), free_mib: Math.round(total - used), gpu_util_pct: gpuUtil, ts, mock: false };
    }
    throw new Error("Could not parse rocm-smi output");
  } catch {
    // Fallback: mock data for local dev
    const total = 16384;
    const used = 4096 + Math.round(Math.random() * 2048);
    return { total_mib: total, used_mib: used, free_mib: total - used, gpu_util_pct: Math.round(Math.random() * 60 + 10), ts, mock: true };
  }
}

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL) {
    return Response.json(cache.data);
  }
  const data = await queryRocm();
  cache = { data, at: now };
  return Response.json(data);
}
