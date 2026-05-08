"use client";

import { useState, useCallback, useRef } from "react";
import { Chat } from "@/components/Chat";
import { BrowserPreview } from "@/components/BrowserPreview";
import { InfoDrawer, type DrawerToolCall, type ReasoningEntry } from "@/components/InfoDrawer";
import { UserPreferences } from "@/components/UserPreferences";
import type { Event } from "@/lib/types";

export default function Home() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastBrowserUrl, setLastBrowserUrl] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toolCalls, setToolCalls] = useState<DrawerToolCall[]>([]);
  const [reasoning, setReasoning] = useState<ReasoningEntry[]>([]);
  const userPrefsRef = useRef("");

  const handleBrowserAction = useCallback((url?: string) => {
    if (url) setLastBrowserUrl(url);
  }, []);

  const handleEvent = useCallback((event: Event) => {
    switch (event.kind) {
      case "tool_call":
        setToolCalls((prev) => [
          ...prev,
          { id: event.id, name: event.name, iteration: event.iteration, args: event.arguments },
        ]);
        break;
      case "tool_result":
        setToolCalls((prev) =>
          prev.map((tc) =>
            tc.id === event.id ? { ...tc, result: { ok: event.ok, content: event.content } } : tc,
          ),
        );
        break;
      case "llm_response":
        if (event.reasoning) {
          setReasoning((prev) => [...prev, { iteration: event.iteration, content: event.reasoning! }]);
        }
        break;
      case "run_start":
        setToolCalls([]);
        setReasoning([]);
        break;
    }
  }, []);

  const handlePrefsChange = useCallback((prefs: string) => {
    userPrefsRef.current = prefs;
  }, []);

  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Left: Chat */}
      <div className="h-1/2 border-b md:h-full md:flex-1 md:border-b-0 md:border-r relative">
        <Chat
          onBrowserAction={handleBrowserAction}
          onStreamingChange={setIsStreaming}
          onEvent={handleEvent}
          userPreferences={userPrefsRef.current}
        />
        {/* User prefs button anchored bottom-right of chat pane */}
        <div className="absolute bottom-20 right-6 z-10">
          <UserPreferences onChange={handlePrefsChange} />
        </div>
      </div>

      {/* Center: Live browser (noVNC iframe) */}
      <div className="h-1/2 md:h-full md:flex-1">
        <BrowserPreview
          isStreaming={isStreaming}
          lastBrowserUrl={lastBrowserUrl}
        />
      </div>

      {/* Right: Info drawer */}
      <InfoDrawer
        isOpen={drawerOpen}
        onToggle={() => setDrawerOpen((o) => !o)}
        toolCalls={toolCalls}
        reasoning={reasoning}
      />
    </div>
  );
}
