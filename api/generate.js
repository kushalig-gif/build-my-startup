/**
 * POST /api/generate
 *
 * Generates a startup blueprint using Gemini.
 *
 * Flow:
 * request
 * -> validation
 * -> demo mode OR Gemini
 * -> extract JSON
 * -> normalize Gemini response
 * -> validate final blueprint
 * -> return blueprint
 */

const {
  applyCors,
  handlePreflight,
  sendError,
  sendJson,
} = require("./utils/response");

const {
  validateSingleIdeaRequest,
  ValidationError,
} = require("./utils/validation");

const {
  checkRateLimit,
} = require("./utils/rateLimit");

const {
  SYSTEM_PROMPT,
  buildUserPrompt,
  extractJson,
  validateBlueprintShape,
  normalizeBlueprint,
  generateDemoBlueprint,
} = require("./utils/blueprint");

const {
  callGemini,
  ProviderError,
} = require("./providers/gemini");

const DEMO_MODE =
  process.env.DEMO_MODE === "true";

module.exports = async function handler(req, res) {
  // ==================================================
  // CORS
  // ==================================================

  applyCors(req, res);

  if (handlePreflight(req, res)) {
    return;
  }

  // ==================================================
  // METHOD
  // ==================================================

  if (req.method !== "POST") {
    sendError(
      res,
      405,
      "METHOD_NOT_ALLOWED",
      "Use POST for /api/generate."
    );
    return;
  }

  // ==================================================
  // RATE LIMIT
  // ==================================================

  const rateLimit =
    checkRateLimit(req, "generate");

  if (!rateLimit.allowed) {
    res.setHeader(
      "Retry-After",
      String(rateLimit.retryAfterSeconds)
    );

    sendError(
      res,
      429,
      "RATE_LIMITED",
      `Too many requests. Try again in ${rateLimit.retryAfterSeconds}s.`
    );

    return;
  }

  // ==================================================
  // VALIDATE REQUEST
  // ==================================================

  let idea;

  try {
    const validated =
      validateSingleIdeaRequest(req);

    idea = validated.idea;
  } catch (err) {
    if (err instanceof ValidationError) {
      sendError(
        res,
        400,
        err.code,
        err.message
      );
      return;
    }

    console.error(
      "[generate] Request validation error:",
      err
    );

    sendError(
      res,
      400,
      "INVALID_INPUT",
      "Invalid startup idea."
    );

    return;
  }

  console.log(
    `[generate] Idea received (${idea.length} characters)`
  );

  console.log(
    `[generate] DEMO_MODE=${DEMO_MODE}`
  );

  console.log(
    `[generate] GEMINI_API_KEY present=${Boolean(
      process.env.GEMINI_API_KEY
    )}`
  );

  // ==================================================
  // DEMO MODE
  // ==================================================

  if (DEMO_MODE) {
    console.log(
      "[generate] DEMO_MODE enabled."
    );

    const demoBlueprint =
      generateDemoBlueprint(idea);

    sendJson(
      res,
      200,
      demoBlueprint
    );

    return;
  }

  // ==================================================
  // CHECK GEMINI KEY
  // ==================================================

  if (!process.env.GEMINI_API_KEY) {
    console.error(
      "[generate] GEMINI_API_KEY is missing."
    );

    sendError(
      res,
      500,
      "AI_NOT_CONFIGURED",
      "GEMINI_API_KEY is not configured."
    );

    return;
  }

  // ==================================================
  // CALL GEMINI
  // ==================================================

  try {
    console.log(
      "[generate] Calling Gemini..."
    );

    const raw =
      await callGemini({
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: buildUserPrompt(idea),
      });

    console.log(
      `[generate] Gemini returned ${raw.length} characters.`
    );

    // =================================================
    // EXTRACT JSON
    // =================================================

    const parsed =
      extractJson(raw);

    if (!parsed) {
      console.error(
        "[generate] Could not extract valid JSON from Gemini."
      );

      console.error(
        "[generate] Gemini response preview:"
      );

      console.error(
        raw.slice(0, 5000)
      );

      sendError(
        res,
        502,
        "AI_INVALID_RESPONSE",
        "Gemini returned a response that could not be parsed as JSON."
      );

      return;
    }

    console.log(
      "[generate] Gemini JSON parsed successfully."
    );

    // =================================================
    // NORMALIZE
    // =================================================

    const normalized =
      normalizeBlueprint(
        parsed,
        idea
      );

    if (!normalized) {
      console.error(
        "[generate] normalizeBlueprint() failed."
      );

      console.error(
        "[generate] Parsed Gemini response:"
      );

      console.error(
        JSON.stringify(
          parsed,
          null,
          2
        ).slice(0, 10000)
      );

      sendError(
        res,
        502,
        "AI_INVALID_RESPONSE",
        "Gemini returned a response that could not be converted into a startup blueprint."
      );

      return;
    }

    console.log(
      "[generate] Gemini response normalized successfully."
    );

    // =================================================
    // VALIDATE FINAL BLUEPRINT
    // =================================================

    const validation =
      validateBlueprintShape(
        normalized
      );

    if (!validation.valid) {
      console.error(
        "[generate] Final blueprint validation failed."
      );

      console.error(
        "[generate] Reason:",
        validation.reason
      );

      console.error(
        "[generate] Normalized blueprint:"
      );

      console.error(
        JSON.stringify(
          normalized,
          null,
          2
        ).slice(0, 10000)
      );

      sendError(
        res,
        502,
        "AI_INVALID_RESPONSE",
        `Gemini blueprint validation failed: ${validation.reason}`
      );

      return;
    }

    // =================================================
    // SUCCESS
    // =================================================

    console.log(
      "========================================"
    );

    console.log(
      "[generate] BLUEPRINT GENERATION SUCCESS"
    );

    console.log(
      "========================================"
    );

    sendJson(
      res,
      200,
      normalized
    );

    return;

  } catch (err) {

    // =================================================
    // GEMINI PROVIDER ERROR
    // =================================================

    if (err instanceof ProviderError) {
      console.error(
        "[generate] GEMINI PROVIDER ERROR"
      );

      console.error(
        "Message:",
        err.message
      );

      console.error(
        "Status:",
        err.status
      );

      if (err.rawBody) {
        console.error(
          "Raw Gemini error:",
          err.rawBody
        );
      }

      if (err.status === 429) {
        sendError(
          res,
          429,
          "RATE_LIMITED",
          "Gemini is currently rate-limiting requests. Please try again shortly."
        );

        return;
      }

      if (err.status === 504) {
        sendError(
          res,
          504,
          "AI_TIMEOUT",
          "Gemini took too long to respond. Please try again."
        );

        return;
      }

      sendError(
        res,
        502,
        "AI_PROVIDER_ERROR",
        "Gemini could not complete the startup blueprint."
      );

      return;
    }

    // =================================================
    // UNEXPECTED ERROR
    // =================================================

    console.error(
      "[generate] UNEXPECTED ERROR:"
    );

    console.error(
      err && err.stack
        ? err.stack
        : err
    );

    sendError(
      res,
      500,
      "SERVER_ERROR",
      "Something went wrong while building your startup. Please try again."
    );
  }
};