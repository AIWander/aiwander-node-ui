#!/usr/bin/env node
/**
 * WebSocket proxy for noVNC.
 *
 * Next.js route handlers cannot upgrade HTTP to WebSocket, so this small
 * proxy sits in front of `next start` and handles:
 *   - /websockify  → proxied as WebSocket to localhost:6080/websockify
 *   - everything else → forwarded as HTTP to Next.js (localhost:3000)
 *
 * Usage:
 *   node ws-proxy.mjs                     # listens on 8080, Next on 3000
 *   PORT=80 NEXT_PORT=3000 node ws-proxy.mjs
 */

import { createServer, request as httpRequest } from "node:http";
import { connect } from "node:net";

const LISTEN = parseInt(process.env.PORT || "8080", 10);
const NEXT = parseInt(process.env.NEXT_PORT || "3000", 10);
const VNC = parseInt(process.env.NOVNC_PORT || "6080", 10);

const server = createServer((req, res) => {
  const opts = {
    hostname: "127.0.0.1",
    port: NEXT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = httpRequest(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on("error", () => {
    res.writeHead(502);
    res.end("Next.js unreachable");
  });
  req.pipe(proxy, { end: true });
});

server.on("upgrade", (req, clientSocket, head) => {
  if (!req.url?.startsWith("/websockify")) {
    clientSocket.destroy();
    return;
  }
  const vncSocket = connect(VNC, "127.0.0.1", () => {
    const reqLine = `GET ${req.url} HTTP/1.1\r\n`;
    const headers = Object.entries(req.headers)
      .filter(([k]) => k !== "host")
      .map(([k, v]) => `${k}: ${v}`)
      .join("\r\n");
    vncSocket.write(reqLine + `Host: 127.0.0.1:${VNC}\r\n` + headers + "\r\n\r\n");
    if (head.length) vncSocket.write(head);

    let responded = false;
    let buf = Buffer.alloc(0);

    vncSocket.on("data", (chunk) => {
      if (responded) {
        clientSocket.write(chunk);
        return;
      }
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf("\r\n\r\n");
      if (idx === -1) return;
      // Forward the entire HTTP 101 response + any trailing data
      clientSocket.write(buf);
      responded = true;
      // Now just pipe bidirectionally
      vncSocket.pipe(clientSocket);
      clientSocket.pipe(vncSocket);
    });
  });

  vncSocket.on("error", () => clientSocket.destroy());
  clientSocket.on("error", () => vncSocket.destroy());
  clientSocket.on("close", () => vncSocket.destroy());
  vncSocket.on("close", () => clientSocket.destroy());
});

server.listen(LISTEN, () => {
  console.log(`ws-proxy listening on :${LISTEN}  (Next→:${NEXT}, VNC→:${VNC})`);
});
