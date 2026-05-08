import { MCPCONFIG_URL } from "@/lib/defaults";
import { readFile } from "fs/promises";

// Workaround: hands' browser_screenshot returns empty base64 by default,
// but save_path mode works reliably. We trigger the agent to call
// browser_screenshot with save_path, then read the file ourselves.
const SNAPSHOT_PATH = "/tmp/aiwander_snap.jpg";

export async function GET() {
  try {
    const upstream = await fetch(`${MCPCONFIG_URL}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-oss-20b",
        task: {
          name: "snap",
          model: "gpt-oss-20b",
          user_prompt:
            `First call browser_attach with port=9222. ` +
            `Then call browser_screenshot with these exact arguments: ` +
            `save_path="${SNAPSHOT_PATH}", quality=80, max_width=1280. ` +
            `Then reply with "done".`,
          max_iterations: 3,
          mcp_servers: ["hands"],
          tool_filter: ["browser_attach", "browser_screenshot"],
        },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: 500 },
      );
    }

    // Drain SSE — we just need to wait for completion. We watch for a
    // tool_result whose content references our SNAPSHOT_PATH (proof the
    // tool succeeded) before we trust the file on disk.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let snapshotSaved = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        let data = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("data: ")) data += line.slice(6);
          else if (line.startsWith("data:")) data += line.slice(5);
        }
        if (!data) continue;

        try {
          const event = JSON.parse(data);
          if (
            event.kind === "tool_result" &&
            event.ok &&
            typeof event.content === "string" &&
            event.content.includes(SNAPSHOT_PATH)
          ) {
            snapshotSaved = true;
          }
        } catch {
          // skip malformed
        }
      }
    }

    if (!snapshotSaved) {
      return Response.json(
        { error: "Screenshot tool did not save the file" },
        { status: 500 },
      );
    }

    const buf = await readFile(SNAPSHOT_PATH);
    return new Response(buf, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Screenshot failed" },
      { status: 500 },
    );
  }
}
