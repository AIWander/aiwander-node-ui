"use client";

import { useState, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2 } from "lucide-react";
import { parseSSE } from "@/lib/sse";
import type { Event } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ToolCallCard } from "./ToolCallCard";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ToolCallEntry {
  id: string;
  name: string;
  iteration: number;
  args: string;
  result?: { ok: boolean; content: string };
}

interface RunMeta {
  iteration: number;
  tokens: number;
  duration: number;
}

interface ChatProps {
  onBrowserAction?: (url?: string) => void;
  onStreamingChange?: (streaming: boolean) => void;
}

export function Chat({ onBrowserAction, onStreamingChange }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [runMeta, setRunMeta] = useState<RunMeta | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const setStreamingState = useCallback((v: boolean) => {
    setIsStreaming(v);
    onStreamingChange?.(v);
  }, [onStreamingChange]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        if (viewport) viewport.scrollTop = viewport.scrollHeight;
      }
    }, 50);
  }, []);

  const handleSubmit = async () => {
    const prompt = input.trim();
    if (!prompt || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setToolCalls([]);
    setRunMeta(null);
    setStreamingState(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_prompt: prompt }),
      });

      if (!res.ok || !res.body) {
        setMessages((prev) => [...prev, { role: "system", content: `Error: ${res.status} ${res.statusText}` }]);
        setStreamingState(false);
        return;
      }

      for await (const event of parseSSE(res.body)) {
        handleEvent(event);
        scrollToBottom();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Connection error: ${err instanceof Error ? err.message : "unknown"}` },
      ]);
    } finally {
      setStreamingState(false);
    }
  };

  const handleEvent = (event: Event) => {
    switch (event.kind) {
      case "tool_call":
        setToolCalls((prev) => [
          ...prev,
          { id: event.id, name: event.name, iteration: event.iteration, args: event.arguments },
        ]);
        if (event.name.startsWith("browser_")) {
          let url: string | undefined;
          if (event.name === "browser_navigate") {
            try { url = JSON.parse(event.arguments).url; } catch { /* skip */ }
          }
          onBrowserAction?.(url);
        }
        break;

      case "tool_result":
        setToolCalls((prev) =>
          prev.map((tc) =>
            tc.id === event.id
              ? { ...tc, result: { ok: event.ok, content: event.content } }
              : tc,
          ),
        );
        break;

      case "final_answer":
        setMessages((prev) => [...prev, { role: "assistant", content: event.content }]);
        break;

      case "run_end":
        setRunMeta({
          iteration: event.iterations,
          tokens: event.total_tokens,
          duration: event.duration_ms,
        });
        if (event.error) {
          setMessages((prev) => [...prev, { role: "system", content: `Run error: ${event.error}` }]);
        }
        break;

      case "error":
        setMessages((prev) => [...prev, { role: "system", content: `Error: ${event.error}` }]);
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4">
          {messages.length === 0 && toolCalls.length === 0 && (
            <div className="flex h-full items-center justify-center py-20 text-center text-muted-foreground">
              <p>Send a message to start a task.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i}>
              <MessageBubble role={msg.role} content={msg.content} />
              {/* Show tool calls that happened after this user message */}
              {msg.role === "user" &&
                i === messages.length - 1 &&
                toolCalls.map((tc) => (
                  <ToolCallCard
                    key={tc.id}
                    name={tc.name}
                    iteration={tc.iteration}
                    args={tc.args}
                    result={tc.result}
                  />
                ))}
            </div>
          ))}
          {/* Show tool calls if streaming and last message isn't user */}
          {isStreaming && messages.length > 0 && messages[messages.length - 1].role !== "user" &&
            toolCalls.map((tc) => (
              <ToolCallCard
                key={tc.id}
                name={tc.name}
                iteration={tc.iteration}
                args={tc.args}
                result={tc.result}
              />
            ))}
        </div>
      </ScrollArea>

      {/* Run meta bar */}
      {runMeta && (
        <>
          <Separator />
          <div className="flex gap-3 px-4 py-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-xs">
              {runMeta.iteration} iterations
            </Badge>
            <Badge variant="outline" className="text-xs">
              {runMeta.tokens.toLocaleString()} tokens
            </Badge>
            <Badge variant="outline" className="text-xs">
              {(runMeta.duration / 1000).toFixed(1)}s
            </Badge>
          </div>
        </>
      )}

      {/* Input area */}
      <Separator />
      <div className="flex gap-2 p-4">
        <Textarea
          placeholder="Describe a task..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="min-h-[60px] resize-none"
          disabled={isStreaming}
        />
        <Button
          onClick={handleSubmit}
          disabled={isStreaming || !input.trim()}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
        >
          {isStreaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  );
}
