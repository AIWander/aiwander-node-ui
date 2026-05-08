const NOVNC_ORIGIN = process.env.NOVNC_URL || "http://127.0.0.1:6080";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const joined = path.join("/");
  const url = new URL(request.url);
  const target = `${NOVNC_ORIGIN}/${joined}${url.search}`;

  try {
    const upstream = await fetch(target);
    if (!upstream.ok) {
      return new Response(`noVNC upstream error: ${upstream.status}`, { status: upstream.status });
    }
    const body = await upstream.arrayBuffer();
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    return new Response(body, {
      headers: {
        "content-type": ct,
        "cache-control": "public, max-age=3600",
      },
    });
  } catch {
    return Response.json(
      { error: "noVNC server unreachable at " + NOVNC_ORIGIN },
      { status: 502 },
    );
  }
}
