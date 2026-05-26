// Local PostHog /capture/ sink for desktop-telemetry manual QA.
//
// The desktop build sends telemetry to PostHog's /capture/ endpoint. To exercise
// and inspect that traffic locally without touching real PostHog, point the app at
// this sink and watch the payloads it logs.
//
// Usage:
//   1. node scripts/telemetry-capture-sink.mjs            # starts on :9000, logs to /tmp/qrf-capture.log
//   2. In .env.local (gitignored):
//        VITE_POSTHOG_KEY=phc_localtest                   # any non-empty value; flips the adapter out of no-op mode
//        VITE_POSTHOG_HOST=http://localhost:9000          # point ingest at this sink
//   3. npm run tauri dev                                  # then opt in and exercise the app
//   4. tail -f /tmp/qrf-capture.log                       # watch events arrive
//
// CORS note: the webview sends Content-Type: application/json, which triggers a
// cross-origin preflight. Without the CORS headers below the browser blocks the
// real POST, so events never arrive. Real PostHog returns these headers; this sink
// must too. See docs/desktop-telemetry-manual-qa.md for the full QA procedure.
import { createServer } from 'http';
import { appendFileSync, writeFileSync } from 'fs';

const PORT = Number(process.env.SINK_PORT) || 9000;
const LOG = process.env.SINK_LOG || '/tmp/qrf-capture.log';
writeFileSync(LOG, `# capture log started ${new Date().toISOString()}\n`);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

createServer((req, res) => {
  // Answer the CORS preflight so the actual POST is allowed through.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let pretty = body;
    try {
      pretty = JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      /* keep raw */
    }
    // Log the real method so a preflight can't masquerade as a POST.
    const line = `\n=== ${new Date().toISOString()}  ${req.method} ${req.url} ===\n${pretty}\n`;
    process.stdout.write(line);
    try {
      appendFileSync(LOG, line);
    } catch {
      /* ignore */
    }
    res.writeHead(200, { 'content-type': 'application/json', ...CORS });
    res.end('{"status":1}');
  });
}).listen(PORT, () => {
  process.stdout.write(`telemetry capture sink on http://localhost:${PORT} (CORS-enabled), logging to ${LOG}\n`);
});
