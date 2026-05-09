export const dynamic = "force-dynamic";

async function checkPort(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const [p8008, p8005, p8006, p8007] = await Promise.all([
    checkPort(8008),
    checkPort(8005),
    checkPort(8006),
    checkPort(8007),
  ]);

  let phase: string;
  if (p8008) phase = "phase1-plan";
  else if (p8005 && p8006) phase = "phase2-execute";
  else phase = "unknown";

  return Response.json(
    { phase, ports: { 8005: p8005, 8006: p8006, 8007: p8007, 8008: p8008 } },
    { headers: { "Cache-Control": "max-age=5" } },
  );
}
