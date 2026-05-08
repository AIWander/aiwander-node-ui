"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";

interface BrowserPreviewProps {
  isStreaming: boolean;
  lastBrowserUrl?: string;
}

const VNC_SRC = "/vnc/vnc_auto.html?path=websockify&autoconnect=1&resize=remote&view_only=1";

export function BrowserPreview({ isStreaming, lastBrowserUrl }: BrowserPreviewProps) {
  return (
    <Card className="flex h-full flex-col rounded-none border-0 ring-0">
      <CardHeader className="shrink-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Globe className="h-4 w-4" />
          Live Browser
          <div className="ml-auto flex items-center gap-2">
            {isStreaming && (
              <Badge variant="default" className="text-xs">
                streaming
              </Badge>
            )}
          </div>
        </CardTitle>
        {lastBrowserUrl && (
          <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-xs font-mono text-muted-foreground">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{lastBrowserUrl}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <iframe
          src={VNC_SRC}
          className="h-full w-full border-0"
          title="Live browser view via noVNC"
          sandbox="allow-scripts allow-same-origin"
        />
      </CardContent>
    </Card>
  );
}
