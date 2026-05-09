import { readdir, readFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

const FLOWS_DIR = "/root/.cpc/workflow/flows";

export async function GET() {
  try {
    const files = await readdir(FLOWS_DIR);
    const flows = await Promise.all(
      files
        .filter((f) => f.endsWith(".json"))
        .map(async (f) => {
          try {
            const data = JSON.parse(await readFile(join(FLOWS_DIR, f), "utf8"));
            return {
              name: data.name || f.replace(".json", ""),
              description: data.description || "",
              step_count: Array.isArray(data.steps) ? data.steps.length : 0,
              last_run: data.last_run || null,
              status: data.status || "active",
            };
          } catch {
            return {
              name: f.replace(".json", ""),
              description: "",
              step_count: 0,
              last_run: null,
              status: "unknown",
            };
          }
        }),
    );
    return Response.json({ flows });
  } catch {
    return Response.json({ flows: [] });
  }
}
