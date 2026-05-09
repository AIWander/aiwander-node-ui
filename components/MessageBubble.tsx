"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ThinkingDisclosure } from "./ThinkingDisclosure";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  isStreaming?: boolean;
}

const roleConfig = {
  user: { label: "You", color: "bg-primary text-primary-foreground" },
  assistant: { label: "AI", color: "bg-secondary text-secondary-foreground" },
  system: { label: "Sys", color: "bg-muted text-muted-foreground" },
};

export function MessageBubble({ role, content, thinking, isStreaming }: MessageBubbleProps) {
  const config = roleConfig[role];
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 py-3", isUser && "flex-row-reverse")}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[80%]", isUser && "text-right")}>
        {role === "assistant" && (thinking || isStreaming) && (
          <ThinkingDisclosure thinking={thinking || ""} isStreaming={isStreaming} />
        )}
        <div
          className={cn(
            "rounded-lg px-4 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground",
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
}
