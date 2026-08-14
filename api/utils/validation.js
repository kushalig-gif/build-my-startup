/**
 * api/utils/validation.js
 *
 * Request validation shared by /api/generate, /api/validate and /api/compare.
 * Keeps parsing/validation logic out of the route handlers themselves.
 */

const MIN_IDEA_LENGTH = 8;
const MAX_IDEA_LENGTH = 600;

/**
 * Vercel usually parses JSON bodies automatically, but guard against both
 * an already-parsed object and a raw string body (or malformed JSON).
 */
function parseJsonBody(req) {
  if (req.body === undefined || req.body === null || req.body === '') return {};
  if (typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body);
  } catch (_) {
    throw new ValidationError('MALFORMED_JSON', 'Request body is not valid JSON.');
  }
}

class ValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function validateIdeaField(value, label = 'idea') {
  if (typeof value !== 'string') {
    throw new ValidationError('INVALID_INPUT', `"${label}" is required and must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < MIN_IDEA_LENGTH) {
    throw new ValidationError(
      'INVALID_INPUT',
      `Please describe your startup idea in at least ${MIN_IDEA_LENGTH} characters.`
    );
  }
  if (trimmed.length > MAX_IDEA_LENGTH) {
    throw new ValidationError(
      'INVALID_INPUT',
      `Idea is too long. Please keep "${label}" under ${MAX_IDEA_LENGTH} characters.`
    );
  }
  return trimmed;
}

/** Used by /api/generate and /api/validate. */
function validateSingleIdeaRequest(req) {
  const body = parseJsonBody(req);
  const idea = validateIdeaField(body.idea, 'idea');
  return { idea };
}

/** Used by /api/compare. */
function validateCompareRequest(req) {
  const body = parseJsonBody(req);
  const ideaA = validateIdeaField(body.ideaA, 'ideaA');
  const ideaB = validateIdeaField(body.ideaB, 'ideaB');
  return { ideaA, ideaB };
}

module.exports = {
  ValidationError,
  parseJsonBody,
  validateIdeaField,
  validateSingleIdeaRequest,
  validateCompareRequest,
  MIN_IDEA_LENGTH,
  MAX_IDEA_LENGTH,
};
