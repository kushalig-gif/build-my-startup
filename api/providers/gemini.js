/**
 * api/providers/gemini.js
 *
 * Gemini REST provider for the startup blueprint generator.
 *
 * Important:
 * - Gemini is explicitly instructed to return structured JSON.
 * - responseSchema forces the response into the blueprint shape.
 * - We read response.text() first so Gemini errors are never hidden.
 * - The API key is server-side only.
 */

const DEFAULT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Gemini 3.6 Flash supports up to 65,536 output tokens.
// 16k is more than enough for this blueprint while avoiding
// unnecessarily huge responses.
const MAX_OUTPUT_TOKENS =
  Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 16384;

const REQUEST_TIMEOUT_MS =
  Number(process.env.GEMINI_TIMEOUT_MS) || 120000;

/**
 * Error type used by the Gemini provider.
 */
class ProviderError extends Error {
  constructor(message, { status, rawBody } = {}) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.rawBody = rawBody;
  }
}

/**
 * JSON schema for the exact blueprint expected by the frontend.
 *
 * Gemini's structured-output mode uses this schema to constrain
 * the generated JSON instead of relying only on prompt instructions.
 */
const BLUEPRINT_SCHEMA = {
  type: "object",

  properties: {
    startup: {
      type: "object",
      properties: {
        name: {
          type: "string"
        },

        tagline: {
          type: "string"
        },

        description: {
          type: "string"
        },

        category: {
          type: "string"
        }
      },

      required: [
        "name",
        "tagline",
        "description",
        "category"
      ]
    },

    problem: {
      type: "string"
    },

    targetAudience: {
      type: "object",

      properties: {
        primary: {
          type: "string"
        },

        secondary: {
          type: "string"
        },

        idealCustomer: {
          type: "string"
        }
      },

      required: [
        "primary",
        "secondary",
        "idealCustomer"
      ]
    },

    solution: {
      type: "string"
    },

    features: {
      type: "array",

      items: {
        type: "object",

        properties: {
          name: {
            type: "string"
          },

          explanation: {
            type: "string"
          },

          whyItMatters: {
            type: "string"
          }
        },

        required: [
          "name",
          "explanation",
          "whyItMatters"
        ]
      }
    },

    usp: {
      type: "string"
    },

    competitors: {
      type: "array",

      items: {
        type: "object",

        properties: {
          name: {
            type: "string"
          },

          whatTheyDo: {
            type: "string"
          },

          strength: {
            type: "string"
          },

          weakness: {
            type: "string"
          }
        },

        required: [
          "name",
          "whatTheyDo",
          "strength",
          "weakness"
        ]
      }
    },

    differentiation: {
      type: "string"
    },

    businessModel: {
      type: "object",

      properties: {
        revenueModel: {
          type: "string"
        },

        primaryRevenueSource: {
          type: "string"
        },

        secondaryRevenueSource: {
          type: "string"
        },

        pricingTiers: {
          type: "array",

          items: {
            type: "object",

            properties: {
              name: {
                type: "string"
              },

              price: {
                type: "string"
              },

              features: {
                type: "array",

                items: {
                  type: "string"
                }
              }
            },

            required: [
              "name",
              "price",
              "features"
            ]
          }
        },

        pricingNote: {
          type: "string"
        }
      },

      required: [
        "revenueModel",
        "primaryRevenueSource",
        "secondaryRevenueSource",
        "pricingTiers",
        "pricingNote"
      ]
    },

    marketOpportunity: {
      type: "object",

      properties: {
        marketPotential: {
          type: "string",
          enum: [
            "Low",
            "Medium",
            "High"
          ]
        },

        demand: {
          type: "string",
          enum: [
            "Low",
            "Medium",
            "High"
          ]
        },

        competition: {
          type: "string",
          enum: [
            "Low",
            "Medium",
            "High"
          ]
        },

        difficulty: {
          type: "string",
          enum: [
            "Low",
            "Medium",
            "High"
          ]
        },

        reasoning: {
          type: "string"
        }
      },

      required: [
        "marketPotential",
        "demand",
        "competition",
        "difficulty",
        "reasoning"
      ]
    },

    goToMarket: {
      type: "array",

      items: {
        type: "object",

        properties: {
          title: {
            type: "string"
          },

          description: {
            type: "string"
          }
        },

        required: [
          "title",
          "description"
        ]
      }
    },

    mvp: {
      type: "object",

      properties: {
        mustHave: {
          type: "array",

          items: {
            type: "string"
          }
        },

        niceToHave: {
          type: "array",

          items: {
            type: "string"
          }
        },

        dontBuildYet: {
          type: "array",

          items: {
            type: "string"
          }
        }
      },

      required: [
        "mustHave",
        "niceToHave",
        "dontBuildYet"
      ]
    },

    roadmap: {
      type: "array",

      items: {
        type: "object",

        properties: {
          phase: {
            type: "string"
          },

          title: {
            type: "string"
          },

          description: {
            type: "string"
          }
        },

        required: [
          "phase",
          "title",
          "description"
        ]
      }
    },

    techStack: {
      type: "object",

      properties: {
        frontend: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        },

        backend: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        },

        database: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        },

        ai: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        },

        authentication: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        },

        payments: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        },

        hosting: {
          type: "object",

          properties: {
            choice: {
              type: "string"
            },

            why: {
              type: "string"
            }
          },

          required: [
            "choice",
            "why"
          ]
        }
      },

      required: [
        "frontend",
        "backend",
        "database",
        "ai",
        "authentication",
        "payments",
        "hosting"
      ]
    },

    score: {
      type: "object",

      properties: {
        overall: {
          type: "integer"
        },

        marketPotential: {
          type: "integer"
        },

        problemStrength: {
          type: "integer"
        },

        differentiation: {
          type: "integer"
        },

        feasibility: {
          type: "integer"
        }
      },

      required: [
        "overall",
        "marketPotential",
        "problemStrength",
        "differentiation",
        "feasibility"
      ]
    },

    verdict: {
      type: "object",

      properties: {
        decision: {
          type: "string",

          enum: [
            "BUILD",
            "VALIDATE FIRST",
            "RECONSIDER"
          ]
        },

        reason: {
          type: "string"
        },

        biggestOpportunity: {
          type: "string"
        },

        biggestRisk: {
          type: "string"
        }
      },

      required: [
        "decision",
        "reason",
        "biggestOpportunity",
        "biggestRisk"
      ]
    }
  },

  required: [
    "startup",
    "problem",
    "targetAudience",
    "solution",
    "features",
    "usp",
    "competitors",
    "differentiation",
    "businessModel",
    "marketOpportunity",
    "goToMarket",
    "mvp",
    "roadmap",
    "techStack",
    "score",
    "verdict"
  ]
};


/**
 * Call Gemini generateContent.
 */
async function callGemini({
  systemPrompt,
  userPrompt
}) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new ProviderError(
      "GEMINI_API_KEY is not configured on the server."
    );
  }

  const model = DEFAULT_MODEL;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  /*
   * Add an explicit instruction on top of the system prompt.
   *
   * This is intentionally short because the schema below is doing
   * the heavy lifting.
   */
  const finalSystemPrompt = `${systemPrompt}

IMPORTANT OUTPUT RULES:
- Return the complete startup blueprint.
- Do not omit any required field.
- Do not return markdown.
- Do not return explanations outside the JSON object.
- Keep descriptions concise enough to fit the response limit.
- The JSON schema supplied by the API is authoritative.
`;

  const requestBody = {
    systemInstruction: {
      parts: [
        {
          text: finalSystemPrompt
        }
      ]
    },

    contents: [
      {
        role: "user",

        parts: [
          {
            text: userPrompt
          }
        ]
      }
    ],

    generationConfig: {
      responseMimeType: "application/json",

      responseSchema:
        BLUEPRINT_SCHEMA,

      maxOutputTokens:
        MAX_OUTPUT_TOKENS
    }
  };


  // --------------------------------------------------
  // GEMINI REQUEST WITH RETRY / EXPONENTIAL BACKOFF
  // --------------------------------------------------

  const MAX_RETRIES = 3;

  let response = null;
  let lastError = null;

  for (
    let attempt = 1;
    attempt <= MAX_RETRIES;
    attempt++
  ) {

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS
      );

    try {

      console.log(
        `[generate] Gemini request attempt ${attempt}/${MAX_RETRIES}`
      );

      response = await fetch(
        url,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-goog-api-key":
              apiKey
          },

          body:
            JSON.stringify(
              requestBody
            ),

          signal:
            controller.signal
        }
      );

      clearTimeout(timeout);


      // ------------------------------------------------
      // SUCCESS
      // ------------------------------------------------

      if (response.ok) {
        break;
      }


      // ------------------------------------------------
      // READ ERROR RESPONSE
      // ------------------------------------------------

      const retryBody =
        await response.text();

      const parsedRetryError =
        safeJsonParse(
          retryBody
        );

      const retryMessage =
        parsedRetryError &&
        parsedRetryError.error &&
        parsedRetryError.error.message
          ? parsedRetryError.error.message
          : `Gemini request failed with status ${response.status}`;

      lastError = {
        status:
          response.status,

        message:
          retryMessage,

        rawBody:
          retryBody
      };

      console.error(
        "========== GEMINI HTTP ERROR =========="
      );

      console.error(
        "Attempt:",
        `${attempt}/${MAX_RETRIES}`
      );

      console.error(
        "Status:",
        response.status
      );

      console.error(
        "Message:",
        retryMessage
      );


      // ------------------------------------------------
      // RETRY TEMPORARY ERRORS
      // ------------------------------------------------

      const retryable =
        response.status === 408 ||
        response.status === 429 ||
        response.status === 500 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;

      if (
        !retryable ||
        attempt === MAX_RETRIES
      ) {

        throw new ProviderError(
          retryMessage,
          {
            status:
              response.status,

            rawBody:
              retryBody.slice(
                0,
                4000
              )
          }
        );
      }


      // ------------------------------------------------
      // EXPONENTIAL BACKOFF
      // 1.5s -> 3s -> 6s
      // with small random jitter
      // ------------------------------------------------

      const baseDelay =
        1500 *
        Math.pow(
          2,
          attempt - 1
        );

      const jitter =
        Math.floor(
          Math.random() * 500
        );

      const delay =
        baseDelay + jitter;

      console.log(
        `[generate] Gemini returned ${response.status}. ` +
        `Retrying in ${delay}ms...`
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delay
          )
      );

    } catch (err) {

      clearTimeout(timeout);


      // ------------------------------------------------
      // TIMEOUT
      // ------------------------------------------------

      if (
        err &&
        err.name === "AbortError"
      ) {

        console.error(
          `[generate] Gemini request timed out on attempt ` +
          `${attempt}/${MAX_RETRIES}.`
        );

        lastError =
          new ProviderError(
            "Gemini request timed out.",
            {
              status: 504
            }
          );

        if (
          attempt === MAX_RETRIES
        ) {
          throw lastError;
        }

        const delay =
          1500 *
          Math.pow(
            2,
            attempt - 1
          );

        console.log(
          `[generate] Retrying after timeout in ${delay}ms...`
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              delay
            )
        );

        continue;
      }


      // ------------------------------------------------
      // PROVIDER ERROR
      // ------------------------------------------------

      if (
        err instanceof ProviderError
      ) {
        throw err;
      }


      // ------------------------------------------------
      // NETWORK ERROR
      // ------------------------------------------------

      console.error(
        "[generate] Network error calling Gemini:",
        err
      );

      if (
        attempt === MAX_RETRIES
      ) {

        throw new ProviderError(
          `Network error calling Gemini: ${
            err && err.message
              ? err.message
              : "Unknown network error"
          }`,
          {
            status:
              undefined
          }
        );
      }

      const delay =
        1500 *
        Math.pow(
          2,
          attempt - 1
        );

      console.log(
        `[generate] Retrying network error in ${delay}ms...`
      );

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delay
          )
      );
    }
  }


  // --------------------------------------------------
  // FINAL SAFETY CHECK
  // --------------------------------------------------

  if (
    !response ||
    !response.ok
  ) {

    throw new ProviderError(
      lastError &&
      lastError.message
        ? lastError.message
        : "Gemini request failed after retries.",

      {
        status:
          lastError
            ? lastError.status
            : 502,

        rawBody:
          lastError &&
          lastError.rawBody
            ? lastError.rawBody.slice(
                0,
                4000
              )
            : undefined
      }
    );
  }


  /*
   * ALWAYS read text first.
   */
  const rawBody =
    await response.text();


  /*
   * HTTP-level Gemini error.
   *
   * This should normally never happen here
   * because non-OK responses are handled above.
   */
  if (!response.ok) {

    console.error(
      "========== GEMINI HTTP ERROR =========="
    );

    console.error(
      "status:",
      response.status
    );

    console.error(
      "body:",
      rawBody.slice(
        0,
        4000
      )
    );

    const parsedError =
      safeJsonParse(
        rawBody
      );

    const message =
      parsedError &&
      parsedError.error &&
      parsedError.error.message
        ? parsedError.error.message
        : `Gemini request failed with status ${response.status}`;

    throw new ProviderError(
      message,
      {
        status:
          response.status,

        rawBody:
          rawBody.slice(
            0,
            4000
          )
      }
    );
  }


  /*
   * Parse Gemini's HTTP response.
   */
  const data =
    safeJsonParse(
      rawBody
    );

  if (!data) {

    console.error(
      "Gemini returned HTTP 200 but the body was not valid JSON."
    );

    console.error(
      "BODY:",
      rawBody.slice(
        0,
        4000
      )
    );

    throw new ProviderError(
      "Gemini returned an unreadable response.",
      {
        status: 502,

        rawBody:
          rawBody.slice(
            0,
            4000
          )
      }
    );
  }


  /*
   * Check for candidates.
   */
  const candidate =
    data.candidates &&
    data.candidates[0];

  if (!candidate) {

    console.error(
      "Gemini response contained no candidates."
    );

    console.error(
      JSON.stringify(
        data,
        null,
        2
      ).slice(
        0,
        4000
      )
    );

    throw new ProviderError(
      "Gemini returned no candidates.",
      {
        status: 502,

        rawBody:
          JSON.stringify(
            data
          ).slice(
            0,
            4000
          )
      }
    );
  }


  /*
   * Check finish reason.
   */
  const finishReason =
    candidate.finishReason;

  if (
    finishReason &&
    finishReason !== "STOP"
  ) {

    console.error(
      "Gemini finishReason:",
      finishReason
    );

    if (
      finishReason ===
      "MAX_TOKENS"
    ) {

      throw new ProviderError(
        "Gemini stopped because the output reached the maximum token limit.",
        {
          status: 502,

          rawBody:
            JSON.stringify(
              candidate
            ).slice(
              0,
              4000
            )
        }
      );
    }

    if (
      finishReason ===
      "SAFETY"
    ) {

      throw new ProviderError(
        "Gemini blocked the response because of its safety filters.",
        {
          status: 502,

          rawBody:
            JSON.stringify(
              candidate
            ).slice(
              0,
              4000
            )
        }
      );
    }

    throw new ProviderError(
      `Gemini stopped generation with finish reason: ${finishReason}`,
      {
        status: 502,

        rawBody:
          JSON.stringify(
            candidate
          ).slice(
            0,
            4000
          )
      }
    );
  }


  /*
   * Extract model text.
   */
  const parts =
    candidate.content &&
    Array.isArray(
      candidate.content.parts
    )
      ? candidate.content.parts
      : [];

  const text =
    parts
      .map(
        (part) =>
          part &&
          typeof part.text ===
            "string"
            ? part.text
            : ""
      )
      .join("")
      .trim();

  if (!text) {

    console.error(
      "Gemini candidate contained no text."
    );

    console.error(
      JSON.stringify(
        candidate,
        null,
        2
      ).slice(
        0,
        4000
      )
    );

    throw new ProviderError(
      "Gemini returned an empty response.",
      {
        status: 502,

        rawBody:
          JSON.stringify(
            candidate
          ).slice(
            0,
            4000
          )
      }
    );
  }


  console.log(
    "========== GEMINI SUCCESS =========="
  );

  console.log(
    "Model:",
    model
  );

  console.log(
    "Finish reason:",
    finishReason || "STOP"
  );

  console.log(
    "Response length:",
    text.length
  );

  return text;
}


/**
 * Safe JSON parser.
 */
function safeJsonParse(value) {

  if (
    !value ||
    typeof value !== "string"
  ) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}


module.exports = {
  callGemini,
  ProviderError
};