/**
 * api/utils/response.js
 *
 * Small helpers so every endpoint returns responses in a consistent shape,
 * with consistent CORS handling, instead of repeating this logic in every
 * handler file.
 */

// Allow localhost during development; make production configurable via
// ALLOWED_ORIGIN so we don't have to permanently rely on "*".
function resolveAllowedOrigin(req) {
  const configured = process.env.ALLOWED_ORIGIN;
  const requestOrigin = (req.headers && req.headers.origin) || '';

  // No ALLOWED_ORIGIN set at all -> fall back to "*" (documented in README
  // as a development convenience, not a production recommendation).
  if (!configured) return '*';

  // Support a comma-separated list so both a local dev origin and a
  // production origin can be allowed at once, e.g.
  // "http://localhost:3000,https://yourusername.github.io"
  const allowedList = configured.split(',').map((s) => s.trim()).filter(Boolean);

  if (allowedList.includes('*')) return '*';
  if (allowedList.includes(requestOrigin)) return requestOrigin;

  // Always allow localhost in development regardless of ALLOWED_ORIGIN,
  // so local testing never gets silently blocked.
  if (/^https?:\/\/localhost(:\d+)?$/.test(requestOrigin)) return requestOrigin;
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(requestOrigin)) return requestOrigin;

  // Origin not recognized — return the first configured origin so the
  // response still has a well-formed header (browser will still block the
  // actual cross-origin read, which is the desired behavior).
  return allowedList[0];
}

function applyCors(req, res) {
  const origin = resolveAllowedOrigin(req);
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function handlePreflight(req, res) {
  if (req.method === 'OPTIONS') {
    applyCors(req, res);
    res.status(204).end();
    return true;
  }
  return false;
}

/**
 * Standard error shape used across every endpoint:
 * { "error": { "code": "INVALID_INPUT", "message": "..." } }
 */
function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = {
  applyCors,
  handlePreflight,
  sendError,
  sendJson,
};
