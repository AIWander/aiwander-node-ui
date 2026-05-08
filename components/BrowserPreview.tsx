"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Zap, ZapOff, Globe } from "lucide-react";

interface BrowserPreviewProps {
  isStreaming: boolean;
  lastBrowserUrl?: string;
  refreshKey?: number;
}

export function BrowserPreview({ isStreaming, lastBrowserUrl, refreshKey }: BrowserPreviewProps) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [liveMode, setLiveMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/screenshot?t=${Date.now()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Screenshot failed" }));
        setError(body.error || "Screenshot failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setImgUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh when parent signals a browser action
  useEffect(() => {
    if (refreshKey && refreshKey > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Auto-refresh when streaming + live mode
  useEffect(() => {
    if (liveMode && isStreaming) {
      refresh();
      intervalRef.current = setInterval(refresh, 2000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [liveMode, isStreaming, refresh]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (imgUrl) URL.revokeObjectURL(imgUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="flex h-full flex-col rounded-none border-0 ring-0">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4" />
          Browser Preview
          <div className="ml-auto flex items-center gap-2">
            {lastUpdate && (
              <span className="text-xs text-muted-foreground">
                {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            {isStreaming && (
              <Badge variant="default" className="text-xs">
                streaming
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setLiveMode(!liveMode)}
              title={liveMode ? "Disable auto-refresh" : "Enable auto-refresh"}
            >
              {liveMode ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={refresh}
              disabled={loading}
              title="Refresh screenshot"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardTitle>
        {lastBrowserUrl && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{lastBrowserUrl}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center text-sm text-destructive">
            <p>{error}</p>
            <Button variant="link" size="sm" onClick={refresh} className="mt-2">
              Retry
            </Button>
          </div>
        ) : imgUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgUrl}
            alt="Browser screenshot"
            className="max-h-full max-w-full rounded-md object-contain"
          />
        ) : loading ? (
          <Skeleton className="h-[400px] w-full rounded-md" />
        ) : (
          <p className="text-sm text-muted-foreground">
            No screenshot yet. Click refresh or start a task.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
