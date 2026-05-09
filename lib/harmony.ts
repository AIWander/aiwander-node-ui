/**
 * Parse OpenAI Harmony channel format.
 * Format: <|channel|>name<|message|>content<|end|>
 */
export interface HarmonyParsed {
  thinking: string;
  final: string;
}

export function parseHarmony(raw: string): HarmonyParsed {
  if (!raw) return { thinking: "", final: "" };

  const channelRegex = /<\|channel\|>(\w+)<\|message\|>([\s\S]*?)(?:<\|end\|>|$)/g;
  const channels: Record<string, string> = {};
  let lastIndex = 0;
  let outsideContent = "";
  let match;

  while ((match = channelRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      outsideContent += raw.slice(lastIndex, match.index);
    }
    const name = match[1];
    const content = match[2].trim();
    channels[name] = channels[name] ? channels[name] + "\n\n" + content : content;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    outsideContent += raw.slice(lastIndex);
  }
  outsideContent = outsideContent.trim();

  // No channels found — treat everything as final (graceful degradation)
  if (Object.keys(channels).length === 0) {
    return { thinking: "", final: raw };
  }

  const thinkingParts: string[] = [];
  if (channels.analysis) thinkingParts.push(channels.analysis);
  if (channels.commentary) thinkingParts.push(channels.commentary);

  return {
    thinking: thinkingParts.join("\n\n"),
    final: channels.final || outsideContent || "",
  };
}
