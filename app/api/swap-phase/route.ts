import { execSync } from "child_process";

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

export async function POST(request: Request) {
  const { target } = await request.json();

  if (target !== "phase1-plan" && target !== "phase2-execute") {
    return Response.json(
      { ok: false, current_phase: "unknown", message: "Invalid target phase" },
      { status: 400 },
    );
  }

  const [p8008, p8005, p8006] = await Promise.all([
    checkPort(8008),
    checkPort(8005),
    checkPort(8006),
  ]);

  let currentPhase = "unknown";
  if (p8008) currentPhase = "phase1-plan";
  else if (p8005 && p8006) currentPhase = "phase2-execute";

  if (currentPhase === target) {
    return Response.json({
      ok: true,
      current_phase: target,
      message: `Already in ${target}`,
    });
  }

  try {
    execSync(`bash /opt/cpc/scripts/swap_phase.sh ${target}`, {
      timeout: 30000,
      encoding: "utf8",
    });
    return Response.json({
      ok: true,
      current_phase: target,
      message: `Swapping to ${target}. Models loading...`,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        current_phase: currentPhase,
        message: `Swap failed: ${err instanceof Error ? err.message : "unknown"}`,
      },
      { status: 500 },
    );
  }
}
