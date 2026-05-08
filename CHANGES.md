# Changes — feat/drawer-vnc-prefs

## Shipped

### A) Live noVNC iframe (replaces polling screenshots)
- `components/BrowserPreview.tsx` — rewrote to render `<iframe>` pointing at `/vnc/vnc_auto.html` with autoconnect + view_only params.
- `app/vnc/[...path]/route.ts` — HTTP GET proxy to `localhost:6080` for noVNC static files (HTML, JS, CSS).
- `ws-proxy.mjs` — standalone Node.js WebSocket proxy (no external deps). Run this in front of `next start` to handle `/websockify` upgrade requests that Next.js route handlers cannot serve. Configurable via `PORT`, `NEXT_PORT`, `NOVNC_PORT` env vars.
- Existing `/api/screenshot/route.ts` preserved for backward compat (not referenced from UI).

### B) Right-edge info drawer (Tools / VRAM / Reasoning)
- `components/InfoDrawer.tsx` — collapsible panel with three tab sections:
  - **Tools**: live tool_call + tool_result trace from SSE stream. Shows iteration badge, monospace tool name, expandable args + result preview.
  - **VRAM**: recharts `LineChart` polling `/api/vram` every 5s. Displays total/used/free MiB and GPU utilization %.
  - **Reasoning**: renders `reasoning` field from `llm_response` events, collapsible per iteration.
- Drawer collapses to a small edge icon on close; mobile-friendly max-width.

### C) `/api/vram` route
- `app/api/vram/route.ts` — spawns `rocm-smi --showmeminfo vram --csv` + `--showuse --csv`, parses output. 4s response cache. Falls back to randomized mock data when rocm-smi is unavailable (local dev).

### D) User Preferences
- `components/UserPreferences.tsx` — settings gear button (bottom-right of chat) opens a textarea. Value persisted to `localStorage` as `aiwander.userPreferences` with 400ms debounce.
- `app/api/run/route.ts` — accepts `user_preferences` field; prepends `[User Preferences]\n{prefs}\n\n[System]` to `task.system_prompt` when non-empty.
- `components/Chat.tsx` — forwards `userPreferences` prop in API call body; new `onEvent` callback for drawer data flow.

### Layout
- `app/page.tsx` — two-column flex: Chat (flex-1) + noVNC iframe (flex-1), with InfoDrawer overlay on right edge. Events routed from Chat → page state → InfoDrawer.

## Deferred
- Full Markdown rendering for reasoning section (using `react-markdown` or similar) — currently uses `<pre>` with whitespace-pre-wrap.
- noVNC WebSocket proxy integration into Next.js custom server (requires `ws` package or framework support).
- VRAM chart historical persistence across page reloads.

## Dependencies added
- `recharts` (VRAM line chart)
