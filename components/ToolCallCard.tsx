"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ToolCallCardProps {
  name: string;
  iteration: number;
  args: string;
  result?: { ok: boolean; content: string } | null;
}

export function ToolCallCard({ name, iteration, args, result }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFullResult, setShowFullResult] = useState(false);

  let formattedArgs = args;
  try {
    formattedArgs = JSON.stringify(JSON.parse(args), null, 2);
  } catch {
    // keep raw
  }

  const truncatedResult = result?.content && result.content.length > 500 && !showFullResult
    ? result.content.slice(0, 500) + "..."
    : result?.content;

  return (
    <Card size="sm" className="my-2">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center gap-2 text-sm">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <code className="font-mono text-xs">{name}</code>
          <Badge variant="secondary" className="ml-auto text-xs">
            iter {iteration}
          </Badge>
          {result && (
            <Badge variant={result.ok ? "default" : "destructive"} className="text-xs">
              {result.ok ? "ok" : "error"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Arguments</p>
            <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">{formattedArgs}</pre>
          </div>
          {result && (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Result</p>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-muted p-2 text-xs">
                {truncatedResult}
              </pre>
              {result.content.length > 500 && !showFullResult && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFullResult(true); }}
                  className="mt-1 text-xs text-primary underline"
                >
                  View full result
                </button>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
