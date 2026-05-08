import { MCPCONFIG_URL } from "@/lib/defaults";

export async function GET() {
  try {
    const res = await fetch(`${MCPCONFIG_URL}/health`);
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { status: "error", error: err instanceof Error ? err.message : "Health check failed" },
      { status: 502 },
    );
  }
}
