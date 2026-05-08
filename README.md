# AIWander Node UI

Two-pane chat interface for MCP agent orchestration with live browser preview.

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Environment

Copy `.env.example` to `.env.local` and adjust:

| Variable | Default | Description |
|----------|---------|-------------|
| `MCPCONFIG_URL` | `http://127.0.0.1:8003` | MCPConfig backend URL |

## Deploy

```bash
rsync -avz --exclude node_modules --exclude .next . user@host:/opt/cpc/aiwander-node-ui/
ssh user@host "cd /opt/cpc/aiwander-node-ui && npm install && npm run build && tmux new -d -s aiwander 'npm start'"
```

## Stack

Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + lucide-react
