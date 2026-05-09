"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface ThinkingDisclosureProps {
  thinking: string;
  isStreaming?: boolean;
}

export function ThinkingDisclosure({ thinking, isStreaming }: ThinkingDisclosureProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking && !isStreaming) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-muted/50"
      >
        <ChevronRight
          className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
        {isStreaming && !thinking ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Thinking...
          </span>
        ) : (
          <span>Thinking</span>
        )}
      </button>
      {expanded && thinking && (
        <div className="mt-1 ml-5 px-3 py-2 text-xs text-muted-foreground bg-muted/30 rounded-md border border-border/50 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
          {thinking}
        </div>
      )}
    </div>
  );
}
