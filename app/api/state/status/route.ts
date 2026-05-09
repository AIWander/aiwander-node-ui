import { readFile, stat } from "fs/promises";

export const dynamic = "force-dynamic";

const STATUS_PATH = "/opt/cpc/state/STATUS.md";

export async function GET() {
  try {
    const [content, info] = await Promise.all([
      readFile(STATUS_PATH, "utf8"),
      stat(STATUS_PATH),
    ]);
    return Response.json({
      content,
      mtime: info.mtime.toISOString(),
      exists: true,
    });
  } catch {
    return Response.json({ content: "", mtime: "", exists: false });
  }
}
