import { MCPCONFIG_URL, DEFAULT_MODEL, DEFAULT_MCP_SERVERS, DEFAULT_TOOL_FILTER } from "@/lib/defaults";

export async function POST(request: Request) {
  const body = await request.json();
  const model = body.model || DEFAULT_MODEL;
  const userPreferences: string = body.user_preferences || "";

  const task: Record<string, unknown> = {
    name: "free_play",
    model,
    user_prompt: body.user_prompt,
    max_iterations: 30,
    mcp_servers: DEFAULT_MCP_SERVERS,
    tool_filter: DEFAULT_TOOL_FILTER,
  };

  if (userPreferences.trim()) {
    task.system_prompt = `[User Preferences]\n${userPreferences.trim()}\n\n[System]`;
  }

  const upstream = await fetch(`${MCPCONFIG_URL}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, task }),
  });

  if (!upstream.ok || !upstream.body) {
    return Response.json(
      { error: `Upstream error: ${upstream.status} ${upstream.statusText}` },
      { status: upstream.status },
    );
  }

  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-store" },
  });
}
