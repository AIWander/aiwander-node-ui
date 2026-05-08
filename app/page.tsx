"use client";

import { useState, useCallback } from "react";
import { Chat } from "@/components/Chat";
import { BrowserPreview } from "@/components/BrowserPreview";

export default function Home() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [lastBrowserUrl, setLastBrowserUrl] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBrowserAction = useCallback((url?: string) => {
    if (url) setLastBrowserUrl(url);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-screen flex-col md:flex-row">
      <div className="h-1/2 border-b md:h-full md:w-3/5 md:border-b-0 md:border-r">
        <Chat
          onBrowserAction={handleBrowserAction}
          onStreamingChange={setIsStreaming}
        />
      </div>
      <div className="h-1/2 md:h-full md:w-2/5">
        <BrowserPreview
          isStreaming={isStreaming}
          lastBrowserUrl={lastBrowserUrl}
          refreshKey={refreshKey}
        />
      </div>
    </div>
  );
}
