import { MCPCONFIG_URL } from "@/lib/defaults";

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
          user_prompt: "Take a screenshot of the current Chrome tab and return the image.",
          max_iterations: 2,
          mcp_servers: ["hands"],
          tool_filter: ["browser_screenshot"],
        },
      }),
    });

    if (!upstream.ok || !upstream.body) {
      return Response.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: 500 },
      );
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let screenshotB64: string | null = null;

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
          if (event.kind === "tool_result" && event.ok) {
            // content may be JSON string with a result/image key, or raw base64
            try {
              const parsed = JSON.parse(event.content);
              screenshotB64 = parsed.result || parsed.image || parsed.data || null;
            } catch {
              // might be raw base64
              if (event.content.length > 100) {
                screenshotB64 = event.content;
              }
            }
          }
        } catch {
          // skip malformed
        }
      }
    }

    if (!screenshotB64) {
      return Response.json({ error: "No screenshot data received" }, { status: 500 });
    }

    // Strip data URI prefix if present
    const raw = screenshotB64.replace(/^data:image\/[^;]+;base64,/, "");
    const buf = Buffer.from(raw, "base64");

    return new Response(buf, {
      headers: { "content-type": "image/jpeg", "cache-control": "no-store" },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Screenshot failed" },
      { status: 500 },
    );
  }
}
