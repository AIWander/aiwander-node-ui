"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Settings } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "aiwander.userPreferences";

interface UserPreferencesProps {
  onChange: (prefs: string) => void;
}

export function UserPreferences({ onChange }: UserPreferencesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) || "";
    setValue(saved);
    onChange(saved);
  }, [onChange]);

  const persist = useCallback(
    (text: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, text);
        onChange(text);
      }, 400);
    },
    [onChange],
  );

  const handleChange = (text: string) => {
    setValue(text);
    persist(text);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(!isOpen)}
        title="User Preferences"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-80 max-w-[90vw] rounded-lg border border-border bg-card p-3 shadow-xl">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            User Preferences (prepended to system prompt)
          </p>
          <Textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="e.g. Always explain your reasoning. Prefer concise answers."
            rows={4}
            className="resize-y text-xs"
          />
        </div>
      )}
    </div>
  );
}
