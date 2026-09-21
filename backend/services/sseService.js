/**
 * ──────────────────────────────────────────────────────────────────────────────
 * Server-Sent Events (SSE) Service
 * ──────────────────────────────────────────────────────────────────────────────
 * Manages connected SSE clients and broadcasts vehicle telemetry / violation
 * events to all listeners.  No external dependencies required.
 * ──────────────────────────────────────────────────────────────────────────────
 */

/** @type {Set<import("http").ServerResponse>} */
const clients = new Set();

/**
 * SSE endpoint handler — call this as the route handler for `GET /api/events`.
 */
function sseHandler(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send a heartbeat comment immediately so the client knows we're alive.
  res.write(": connected\n\n");

  clients.add(res);
  console.log(`[SSE] Client connected (${clients.size} total)`);

  req.on("close", () => {
    clients.delete(res);
    console.log(`[SSE] Client disconnected (${clients.size} total)`);
  });
}

/**
 * Broadcast an event to all connected SSE clients.
 *
 * @param {string} eventName – e.g. "telemetry", "violation", "warning"
 * @param {object} data      – JSON-serialisable payload
 */
function broadcast(eventName, data) {
  const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

module.exports = { sseHandler, broadcast };
