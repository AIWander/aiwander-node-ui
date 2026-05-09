import type { Event } from "./types";

export async function* parseSSE(stream: ReadableStream<Uint8Array>): AsyncGenerator<Event> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      for (const part of parts) {
        const lines = part.split("\n");
        let data = "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            data += line.slice(6);
          } else if (line.startsWith("data:")) {
            data += line.slice(5);
          }
        }
        if (!data) continue;
        try {
          yield JSON.parse(data) as Event;
        } catch {
          // skip malformed JSON
        }
      }
    }
    // flush remaining
    if (buffer.trim()) {
      const lines = buffer.split("\n");
      let data = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          data += line.slice(6);
        } else if (line.startsWith("data:")) {
          data += line.slice(5);
        }
      }
      if (data) {
        try {
          yield JSON.parse(data) as Event;
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
