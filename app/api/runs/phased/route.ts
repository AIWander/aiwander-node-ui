import { readdir, readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const TRANSCRIPT_DIR = "/opt/cpc/transcripts";

export async function GET() {
  try {
    const entries = await readdir(TRANSCRIPT_DIR);
    const phased = entries
      .filter((e) => e.startsWith("phased-"))
      .sort()
      .reverse()
      .slice(0, 20);

    const runs = await Promise.all(
      phased.map(async (dir) => {
        const runId = dir.replace("phased-", "");
        const dirPath = join(TRANSCRIPT_DIR, dir);

        let task = "";
        let plan_duration_ms = 0;
        let exec_duration_ms = 0;
        let total_tool_calls = 0;

        try {
          const status = await readFile(join(dirPath, "01c-status-after-plan.md"), "utf8");
          const taskMatch = status.match(/\*\*Task:\*\*\s*(.+)/);
          if (taskMatch) task = taskMatch[1];
          const planDurMatch = status.match(/\*\*Generated in:\*\*\s*(\d+)s/);
          if (planDurMatch) plan_duration_ms = parseInt(planDurMatch[1]) * 1000;
        } catch { /* skip */ }

        try {
          const sse = await readFile(join(dirPath, "02b-execution.sse"), "utf8");
          total_tool_calls = (sse.match(/"kind"\s*:\s*"tool_call"/g) || []).length;
          const runEndMatch = sse.match(/"duration_ms"\s*:\s*(\d+)/);
          if (runEndMatch) exec_duration_ms = parseInt(runEndMatch[1]);
        } catch { /* skip */ }

        try {
          const log = await readFile(join(dirPath, "run.log"), "utf8");
          if (!exec_duration_ms) {
            const execMatch = log.match(/Phase 2: complete \((\d+)s\)/);
            if (execMatch) exec_duration_ms = parseInt(execMatch[1]) * 1000;
          }
        } catch { /* skip */ }

        return {
          run_id: runId,
          task,
          plan_duration_ms,
          exec_duration_ms,
          total_tool_calls,
          transcript_url: `/runs/${runId}`,
        };
      }),
    );

    return Response.json({ runs });
  } catch {
    return Response.json({ runs: [] });
  }
}
