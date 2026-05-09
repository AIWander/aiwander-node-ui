import { readFile, readdir } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPT_DIR = "/opt/cpc/transcripts";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const dirPath = join(TRANSCRIPT_DIR, `phased-${runId}`);

  try {
    const files = await readdir(dirPath);

    let plan = "";
    let status = "";
    const events: Record<string, unknown>[] = [];

    try {
      plan = await readFile(join(dirPath, "01c-status-after-plan.md"), "utf8");
    } catch { /* skip */ }

    try {
      status = await readFile(join(dirPath, "03-final-status.md"), "utf8");
    } catch { /* skip */ }

    try {
      const sse = await readFile(join(dirPath, "02b-execution.sse"), "utf8");
      const lines = sse.split("\n");
      let buffer = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          buffer += line.slice(6);
        } else if (line.startsWith("data:")) {
          buffer += line.slice(5);
        } else if (line.trim() === "" && buffer) {
          try { events.push(JSON.parse(buffer)); } catch { /* skip */ }
          buffer = "";
        }
      }
      if (buffer.trim()) {
        try { events.push(JSON.parse(buffer)); } catch { /* skip */ }
      }
      // Fallback: raw JSON lines
      if (events.length === 0) {
        for (const line of sse.split("\n")) {
          if (line.trim()) {
            try { events.push(JSON.parse(line)); } catch { /* skip */ }
          }
        }
      }
    } catch { /* skip */ }

    return Response.json({ run_id: runId, plan, status, events, files });
  } catch {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }
}
