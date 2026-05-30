#!/usr/bin/env node
/**
 * Dev proxy for Android emulator → backend.
 * Emulator calls http://10.0.2.2:8787/api/v1/* (HTTP, no TLS on loopback).
 * This process forwards to https://backend.julow.ru/api/v1/* on the host network.
 */
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const LISTEN_HOST = '0.0.0.0';
const LISTEN_PORT = Number(process.env.EMULATOR_PROXY_PORT ?? 8787);
const TARGET_BASE =
  (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://backend.julow.ru/api/v1').replace(/\/$/, '');

const targetOrigin = new URL(TARGET_BASE).origin;

function copyHeaders(reqHeaders, contentLength) {
  const headers = { ...reqHeaders, host: new URL(TARGET_BASE).host };
  delete headers.connection;
  delete headers['content-length'];
  if (contentLength != null) headers['content-length'] = String(contentLength);
  return headers;
}

const server = http.createServer((req, res) => {
  const incoming = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const suffix = incoming.pathname.startsWith('/api/v1')
    ? incoming.pathname.slice('/api/v1'.length)
    : incoming.pathname;
  const targetUrl = `${TARGET_BASE}${suffix}${incoming.search}`;

  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const proxyReq = https.request(
      targetUrl,
      {
        method: req.method,
        headers: copyHeaders(req.headers, body?.length),
        family: 4,
        timeout: 20_000,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Upstream timeout', target: targetUrl }));
      }
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, target: targetUrl }));
      }
    });

    if (body) proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[emulator-proxy] http://${LISTEN_HOST}:${LISTEN_PORT} → ${TARGET_BASE}`);
  console.log('[emulator-proxy] Android emulator should use EXPO_PUBLIC_ANDROID_EMULATOR_API_BASE_URL=http://10.0.2.2:8787/api/v1');
});
