/**
 * api/utils/blueprint.js
 *
 * - The shared system prompt (provider-agnostic wording).
 * - A helper to build the per-request user prompt.
 * - Schema validation for whatever JSON a provider returns, so we never
 *   trust it blindly.
 * - A deterministic DEMO_MODE generator so the app works with no AI key.
 */

const SYSTEM_PROMPT = `You are a startup strategist, product manager, market researcher and
product validation expert rolled into one. Your job is to transform a rough startup idea
into a realistic, honest startup blueprint.

Rules you must follow:
1. Analyze the actual idea given — never generic, never generic advice.
2. Do not blindly praise every idea. Identify real weaknesses and risks.
3. Identify the real target customer and the real problem.
4. Suggest a realistic solution and an appropriately small MVP.
5. Identify realistic competitors when possible (existing real companies/products
   where sensible).
6. Explain differentiation clearly and honestly.
7. Suggest an appropriate, idea-specific business model and realistic pricing —
   do not default to a generic template unless it truly fits the idea.
8. Score the opportunity from 0-100 across the requested dimensions.
9. Give an honest verdict: BUILD, VALIDATE FIRST, or RECONSIDER.
10. Do not invent precise statistics or market-size numbers you cannot know.
    If something is uncertain, clearly describe it as an assumption, not a fact.

Output format — return ONLY valid JSON matching this exact shape and key names
(arrays may contain more/fewer items where noted, but keys must match exactly).
Never return markdown. Never return \`\`\`json. Never return any explanation
before or after the JSON object.

{
  "startup": {
    "name": "",
    "tagline": "",
    "description": "",
    "category": ""
  },
  "problem": "",
  "targetAudience": {
    "primary": "",
    "secondary": "",
    "idealCustomer": ""
  },
  "solution": "",
  "features": [
    {
      "name": "",
      "explanation": "",
      "whyItMatters": ""
    }
  ],
  "usp": "",
  "competitors": [
    {
      "name": "",
      "whatTheyDo": "",
      "strength": "",
      "weakness": ""
    }
  ],
  "differentiation": "",
  "businessModel": {
    "revenueModel": "",
    "primaryRevenueSource": "",
    "secondaryRevenueSource": "",
    "pricingTiers": [
      {
        "name": "",
        "price": "",
        "features": [""]
      }
    ],
    "pricingNote": ""
  },
  "marketOpportunity": {
    "marketPotential": "Low|Medium|High",
    "demand": "Low|Medium|High",
    "competition": "Low|Medium|High",
    "difficulty": "Low|Medium|High",
    "reasoning": ""
  },
  "goToMarket": [
    {
      "title": "",
      "description": ""
    }
  ],
  "mvp": {
    "mustHave": [""],
    "niceToHave": [""],
    "dontBuildYet": [""]
  },
  "roadmap": [
    {
      "phase": "",
      "title": "",
      "description": ""
    }
  ],
  "techStack": {
    "frontend": {
      "choice": "",
      "why": ""
    },
    "backend": {
      "choice": "",
      "why": ""
    },
    "database": {
      "choice": "",
      "why": ""
    },
    "ai": {
      "choice": "",
      "why": ""
    },
    "authentication": {
      "choice": "",
      "why": ""
    },
    "payments": {
      "choice": "",
      "why": ""
    },
    "hosting": {
      "choice": "",
      "why": ""
    }
  },
  "score": {
    "overall": 0,
    "marketPotential": 0,
    "problemStrength": 0,
    "differentiation": 0,
    "feasibility": 0
  },
  "verdict": {
    "decision": "BUILD|VALIDATE FIRST|RECONSIDER",
    "reason": "",
    "biggestOpportunity": "",
    "biggestRisk": ""
  }
}

Guidance on array lengths: 5-7 features, 3-5 competitors, 4 goToMarket steps,
2-4 pricingTiers, 3-6 items per mvp list, 3-5 roadmap phases sized to the idea's
real complexity. Score fields are integers 0-100.`;

function buildUserPrompt(idea) {
  return `Startup idea: "${idea}"

Generate the full startup blueprint JSON now, following the schema and rules exactly. Return ONLY the JSON object.`;
}

const VALID_LEVELS = new Set(["Low", "Medium", "High"]);

const VALID_DECISIONS = new Set([
  "BUILD",
  "VALIDATE FIRST",
  "RECONSIDER",
]);

/**
 * Extract a JSON object from raw model text.
 *
 * Handles:
 * - plain JSON
 * - ```json fenced JSON
 * - accidental text before/after JSON
 */
function extractJson(raw) {
  if (!raw || typeof raw !== "string") {
    return null;
  }

  let text = raw.trim();

  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(text);
  } catch (_) {
    // Continue to brace matching.
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

/**
 * Validate the canonical blueprint.
 */
function validateBlueprintShape(data) {
  if (!data || typeof data !== "object") {
    return {
      valid: false,
      reason: "Response is not an object.",
    };
  }

  if (!data.startup || !data.startup.name) {
    return {
      valid: false,
      reason: "Missing startup.name.",
    };
  }

  if (!data.problem) {
    return {
      valid: false,
      reason: "Missing problem.",
    };
  }

  if (!data.solution) {
    return {
      valid: false,
      reason: "Missing solution.",
    };
  }

  if (!Array.isArray(data.features) || !data.features.length) {
    return {
      valid: false,
      reason: "Missing features array.",
    };
  }

  if (!Array.isArray(data.competitors)) {
    return {
      valid: false,
      reason: "Missing competitors array.",
    };
  }

  if (
    !data.businessModel ||
    !Array.isArray(data.businessModel.pricingTiers)
  ) {
    return {
      valid: false,
      reason: "Missing businessModel.pricingTiers.",
    };
  }

  if (!Array.isArray(data.goToMarket)) {
    return {
      valid: false,
      reason: "Missing goToMarket array.",
    };
  }

  if (
    !data.mvp ||
    !Array.isArray(data.mvp.mustHave)
  ) {
    return {
      valid: false,
      reason: "Missing mvp.mustHave.",
    };
  }

  if (!Array.isArray(data.roadmap)) {
    return {
      valid: false,
      reason: "Missing roadmap array.",
    };
  }

  if (!data.techStack) {
    return {
      valid: false,
      reason: "Missing techStack.",
    };
  }

  const marketOpportunity = data.marketOpportunity;

  if (!marketOpportunity) {
    return {
      valid: false,
      reason: "Missing marketOpportunity.",
    };
  }

  for (const key of [
    "marketPotential",
    "demand",
    "competition",
    "difficulty",
  ]) {
    if (!VALID_LEVELS.has(marketOpportunity[key])) {
      return {
        valid: false,
        reason:
          `marketOpportunity.${key} must be Low/Medium/High.`,
      };
    }
  }

  const score = data.score;

  if (!score) {
    return {
      valid: false,
      reason: "Missing score.",
    };
  }

  for (const key of [
    "overall",
    "marketPotential",
    "problemStrength",
    "differentiation",
    "feasibility",
  ]) {
    const value = score[key];

    if (
      typeof value !== "number" ||
      Number.isNaN(value) ||
      value < 0 ||
      value > 100
    ) {
      return {
        valid: false,
        reason:
          `score.${key} must be a number between 0 and 100.`,
      };
    }
  }

  if (
    !data.verdict ||
    !VALID_DECISIONS.has(data.verdict.decision)
  ) {
    return {
      valid: false,
      reason:
        "verdict.decision must be BUILD, VALIDATE FIRST, or RECONSIDER.",
    };
  }

  return {
    valid: true,
  };
}

/**
 * Deterministic fallback for DEMO_MODE.
 */
function generateDemoBlueprint(idea) {
  const trimmedIdea = idea.trim();

  const words = trimmedIdea
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const keyword =
    words.find((word) => word.length > 4) ||
    words[0] ||
    "Venture";

  const name = `${capitalize(keyword)}ly`;

  return {
    startup: {
      name,
      tagline:
        `A focused way to solve: ${truncate(trimmedIdea, 70)}`,
      description:
        `${name} is a demo blueprint generated without calling an AI provider. ` +
        `Your idea: "${truncate(trimmedIdea, 200)}"`,
      category: "General",
    },

    problem:
      `People trying to do "${truncate(
        trimmedIdea,
        120
      )}" currently rely on scattered, generic tools that were not built for this specific need.`,

    targetAudience: {
      primary:
        "Early adopters directly affected by this problem",

      secondary:
        "Adjacent users who encounter the same friction less often",

      idealCustomer:
        "Someone actively searching for a solution to this today",
    },

    solution:
      `A focused product that directly addresses "${truncate(
        trimmedIdea,
        120
      )}" instead of bolting the need onto a general-purpose tool.`,

    features: [
      {
        name: "Core Workflow",
        explanation:
          "Handles the primary use case end-to-end.",
        whyItMatters:
          "This is the reason someone would switch.",
      },
      {
        name: "Onboarding",
        explanation:
          "Gets a new user to value in minutes.",
        whyItMatters:
          "Reduces drop-off before first value.",
      },
      {
        name: "Notifications",
        explanation:
          "Alerts users when something needs attention.",
        whyItMatters:
          "Keeps the product top of mind.",
      },
      {
        name: "Dashboard",
        explanation:
          "A single view of everything that matters.",
        whyItMatters:
          "Reduces time spent hunting for status.",
      },
      {
        name: "Sharing / Collaboration",
        explanation:
          "Lets more than one person participate.",
        whyItMatters:
          "Drives organic growth.",
      },
    ],

    usp:
      `${name} is narrower and more opinionated than general-purpose alternatives, ` +
      "purpose-built around one workflow instead of many.",

    competitors: [
      {
        name: "General-purpose incumbent",
        whatTheyDo:
          "Broad tool that can technically be used for this.",
        strength:
          "Existing user base and trust.",
        weakness:
          "Not built specifically for this workflow.",
      },
      {
        name: "Manual/spreadsheet process",
        whatTheyDo:
          "What most people do today by default.",
        strength:
          "Free and familiar.",
        weakness:
          "Does not scale and is error-prone.",
      },
    ],

    differentiation:
      `Unlike broad tools, ${name} is built around one specific workflow, ` +
      "so the default experience already matches how the user actually works.",

    businessModel: {
      revenueModel: "Freemium subscription",

      primaryRevenueSource:
        "Monthly subscriptions from individual users",

      secondaryRevenueSource:
        "Team/organization plans",

      pricingTiers: [
        {
          name: "Free",
          price: "$0",
          features: [
            "Core workflow",
            "Limited usage",
          ],
        },
        {
          name: "Pro",
          price: "$12/mo",
          features: [
            "Unlimited usage",
            "Priority support",
            "Advanced features",
          ],
        },
        {
          name: "Team",
          price: "Custom",
          features: [
            "Multiple seats",
            "Admin controls",
          ],
        },
      ],

      pricingNote:
        "Demo pricing — assumptions only, not derived from real market research.",
    },

    marketOpportunity: {
      marketPotential: "Medium",
      demand: "Medium",
      competition: "Medium",
      difficulty: "Medium",

      reasoning:
        "This is placeholder DEMO_MODE reasoning. Enable the real AI provider for an idea-specific assessment.",
    },

    goToMarket: [
      {
        title: "Community seeding",
        description:
          "Share in relevant online communities where the target user already spends time.",
      },
      {
        title: "Content marketing",
        description:
          "Publish practical guides that rank for the problem, not the product.",
      },
      {
        title: "Referral loop",
        description:
          "Reward existing users for bringing in new ones.",
      },
      {
        title: "Direct outreach",
        description:
          "Personally onboard the first cohort of users.",
      },
    ],

    mvp: {
      mustHave: [
        "Core workflow",
        "Basic account system",
        'One clear "aha" moment',
      ],

      niceToHave: [
        "Notifications",
        "Sharing/collaboration",
      ],

      dontBuildYet: [
        "Native mobile apps",
        "Enterprise admin tooling",
      ],
    },

    roadmap: [
      {
        phase: "Week 1",
        title: "Validate",
        description:
          "Talk to potential users and confirm the problem is real and worth paying to solve.",
      },
      {
        phase: "Weeks 2-4",
        title: "Build MVP",
        description:
          "Ship the smallest version of the core workflow.",
      },
      {
        phase: "Week 5",
        title: "Private Beta",
        description:
          "Get a small group of real users using it weekly.",
      },
      {
        phase: "Week 6",
        title: "Public Launch",
        description:
          "Open sign-ups and start go-to-market.",
      },
    ],

    techStack: {
      frontend: {
        choice: "HTML/CSS/JS",
        why:
          "Matches this project — no framework needed to validate an idea.",
      },

      backend: {
        choice: "Node.js (Vercel Serverless Functions)",
        why:
          "Simple to deploy, no server to manage.",
      },

      database: {
        choice: "PostgreSQL",
        why:
          "Solid relational default for most product data.",
      },

      ai: {
        choice: "Google Gemini API",
        why:
          "Good fit for structured JSON generation.",
      },

      authentication: {
        choice: "A hosted auth provider",
        why:
          "Avoid building authentication from scratch.",
      },

      payments: {
        choice: "Stripe",
        why:
          "Standard for subscription billing.",
      },

      hosting: {
        choice: "Vercel",
        why:
          "Already used by this project for both frontend and API.",
      },
    },

    score: {
      overall: 62,
      marketPotential: 60,
      problemStrength: 65,
      differentiation: 55,
      feasibility: 70,
    },

    verdict: {
      decision: "VALIDATE FIRST",

      reason:
        "This is a DEMO_MODE placeholder verdict, not a real AI assessment.",

      biggestOpportunity:
        "Being first to build a workflow-specific tool instead of a generic one.",

      biggestRisk:
        'An incumbent adding a "good enough" version of this feature.',
    },
  };
}

/**
 * Normalize a provider response into the canonical shape consumed
 * by the frontend.
 *
 * Gemini is instructed to return the canonical schema, but this adapter
 * also accepts alternative structures such as:
 *
 * target_customer
 * minimum_viable_product
 * scores
 * features
 * competitors
 * verdict
 */
function normalizeBlueprint(data, idea = "") {
  if (!data || typeof data !== "object") {
    return null;
  }

  /*
   * IMPORTANT FIX:
   *
   * Do NOT return data just because startup.name/problem/solution exist.
   *
   * Gemini can return a partially canonical response. If we return it here,
   * validateBlueprintShape() will reject the missing fields.
   *
   * Only return directly when the ENTIRE canonical structure exists.
   */
  if (
    data.startup &&
    data.startup.name &&
    data.startup.tagline &&
    data.startup.description &&
    data.startup.category &&
    data.problem &&
    data.targetAudience &&
    data.solution &&
    Array.isArray(data.features) &&
    data.features.length &&
    data.usp &&
    Array.isArray(data.competitors) &&
    data.differentiation &&
    data.businessModel &&
    Array.isArray(data.businessModel.pricingTiers) &&
    data.businessModel.pricingNote &&
    data.marketOpportunity &&
    Array.isArray(data.goToMarket) &&
    data.mvp &&
    Array.isArray(data.mvp.mustHave) &&
    Array.isArray(data.mvp.niceToHave) &&
    Array.isArray(data.mvp.dontBuildYet) &&
    Array.isArray(data.roadmap) &&
    data.techStack &&
    data.score &&
    data.verdict
  ) {
    return data;
  }

  /*
   * Alternative Gemini field names.
   */
  const target =
    data.target_customer ||
    data.targetCustomer ||
    data.targetAudience ||
    {};

  const scores =
    data.scores ||
    data.score ||
    {};

  const sourceFeatures =
    Array.isArray(data.features)
      ? data.features
      : [];

  const sourceCompetitors =
    Array.isArray(data.competitors)
      ? data.competitors
      : [];

  /*
   * Generate a reasonable startup name when Gemini does not provide
   * one in the expected location.
   */
  const ideaWords = String(idea)
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const key =
    ideaWords.find((word) => word.length >= 5) ||
    ideaWords[0] ||
    "Startup";

  const startupName =
    data.name ||
    data.startupName ||
    data.startup?.name ||
    `${capitalize(key)}ly`;

  /*
   * Normalize features.
   */
  const features = sourceFeatures.map((feature) => ({
    name:
      feature && feature.name
        ? feature.name
        : "Core Feature",

    explanation:
      feature &&
      (feature.explanation || feature.description)
        ? feature.explanation || feature.description
        : "Supports the core product workflow.",

    whyItMatters:
      feature && feature.whyItMatters
        ? feature.whyItMatters
        : feature && feature.description
          ? feature.description
          : "Helps users achieve the primary outcome.",
  }));

  /*
   * Normalize competitors.
   */
  const competitors = sourceCompetitors.map((competitor) => ({
    name:
      competitor && competitor.name
        ? competitor.name
        : "Competitor",

    whatTheyDo:
      competitor &&
      (competitor.whatTheyDo || competitor.description)
        ? competitor.whatTheyDo || competitor.description
        : "Provides a related solution.",

    strength:
      competitor && competitor.strength
        ? competitor.strength
        : "Established alternative for the target problem.",

    weakness:
      competitor && competitor.weakness
        ? competitor.weakness
        : "May not be optimized for this focused use case.",
  }));

  /*
   * Normalize scores.
   */
  const overall = toScore(
    scores.overall_score ?? scores.overall,
    60
  );

  const market = toScore(
    scores.market_demand ?? scores.marketPotential,
    60
  );

  const feasibility = toScore(
    scores.feasibility,
    60
  );

  const differentiation = toScore(
    scores.differentiation_score ??
      scores.differentiation,
    60
  );

  const problemStrength = toScore(
    scores.problemStrength ??
      scores.problem_strength,
    Math.round((market + feasibility) / 2)
  );

  /*
   * Normalize verdict.
   */
  const decision =
    typeof data.verdict === "string" &&
    VALID_DECISIONS.has(data.verdict)
      ? data.verdict
      : data.verdict &&
          typeof data.verdict === "object" &&
          VALID_DECISIONS.has(data.verdict.decision)
        ? data.verdict.decision
        : "VALIDATE FIRST";

  /*
   * Normalize business model.
   */
  const businessModel =
    data.businessModel &&
    typeof data.businessModel === "object"
      ? {
          revenueModel:
            data.businessModel.revenueModel ||
            "Subscription or usage-based pricing",

          primaryRevenueSource:
            data.businessModel.primaryRevenueSource ||
            "Paid product access",

          secondaryRevenueSource:
            data.businessModel.secondaryRevenueSource ||
            "Premium plans or business accounts",

          pricingTiers:
            Array.isArray(
              data.businessModel.pricingTiers
            ) &&
            data.businessModel.pricingTiers.length
              ? data.businessModel.pricingTiers
              : [
                  {
                    name: "Free",
                    price: "$0",
                    features: ["Core functionality"],
                  },
                  {
                    name: "Pro",
                    price: "Paid",
                    features: [
                      "Advanced functionality",
                    ],
                  },
                ],

          pricingNote:
            data.businessModel.pricingNote ||
            "Pricing is an assumption and should be validated with early customers.",
        }
      : {
          revenueModel:
            "Subscription or usage-based pricing",

          primaryRevenueSource:
            "Paid product access",

          secondaryRevenueSource:
            "Premium plans or business accounts",

          pricingTiers: [
            {
              name: "Free",
              price: "$0",
              features: ["Core functionality"],
            },
            {
              name: "Pro",
              price: "Paid",
              features: ["Advanced functionality"],
            },
          ],

          pricingNote:
            "Pricing is an assumption and should be validated with early customers.",
        };

  /*
   * Normalize market opportunity.
   */
  const marketOpportunity =
    data.marketOpportunity &&
    typeof data.marketOpportunity === "object"
      ? {
          marketPotential:
            VALID_LEVELS.has(
              data.marketOpportunity.marketPotential
            )
              ? data.marketOpportunity.marketPotential
              : levelFromScore(market),

          demand:
            VALID_LEVELS.has(
              data.marketOpportunity.demand
            )
              ? data.marketOpportunity.demand
              : levelFromScore(market),

          competition:
            VALID_LEVELS.has(
              data.marketOpportunity.competition
            )
              ? data.marketOpportunity.competition
              : differentiation < 50
                ? "High"
                : "Medium",

          difficulty:
            VALID_LEVELS.has(
              data.marketOpportunity.difficulty
            )
              ? data.marketOpportunity.difficulty
              : levelFromScore(100 - feasibility),

          reasoning:
            data.marketOpportunity.reasoning ||
            data.summary ||
            data.differentiation ||
            "Validate market assumptions with customers.",
        }
      : {
          marketPotential: levelFromScore(market),

          demand: levelFromScore(market),

          competition:
            differentiation < 50
              ? "High"
              : "Medium",

          difficulty:
            levelFromScore(100 - feasibility),

          reasoning:
            data.summary ||
            data.differentiation ||
            "Validate market assumptions with customers.",
        };

  /*
   * Normalize MVP.
   *
   * Gemini may return:
   *
   * minimum_viable_product: {
   *   scope: "...",
   *   delivery_method: "..."
   * }
   *
   * instead of:
   *
   * mvp: {
   *   mustHave: [],
   *   niceToHave: [],
   *   dontBuildYet: []
   * }
   */
  const sourceMvp =
    data.mvp ||
    data.minimum_viable_product ||
    null;

  let mvp;

  if (
    sourceMvp &&
    typeof sourceMvp === "object" &&
    Array.isArray(sourceMvp.mustHave)
  ) {
    mvp = {
      mustHave: sourceMvp.mustHave,

      niceToHave:
        Array.isArray(sourceMvp.niceToHave)
          ? sourceMvp.niceToHave
          : [
              "Analytics",
              "Personalization",
            ],

      dontBuildYet:
        Array.isArray(sourceMvp.dontBuildYet)
          ? sourceMvp.dontBuildYet
          : [
              "Complex integrations",
              "Large enterprise features",
            ],
    };
  } else {
    mvp = {
      mustHave: [
        sourceMvp && sourceMvp.scope
          ? String(sourceMvp.scope)
          : "Core product workflow",

        ...(features.length
          ? features
              .slice(0, 3)
              .map((feature) => feature.name)
          : [
              "Basic user experience",
              "Core functionality",
            ]),
      ],

      niceToHave: [
        sourceMvp && sourceMvp.delivery_method
          ? String(sourceMvp.delivery_method)
          : "Analytics",

        "Personalization",
      ],

      dontBuildYet: [
        "Complex integrations",
        "Large enterprise features",
      ],
    };
  }

  /*
   * Normalize Go-To-Market.
   */
  const goToMarket =
    Array.isArray(data.goToMarket) &&
    data.goToMarket.length
      ? data.goToMarket.map((item) => ({
          title:
            item && item.title
              ? item.title
              : "Validate",
          description:
            item && item.description
              ? item.description
              : "Validate the idea with target customers.",
        }))
      : [
          {
            title: "Validate",
            description:
              "Interview target customers and confirm the problem.",
          },
          {
            title: "Launch MVP",
            description:
              "Release the smallest useful version.",
          },
          {
            title: "Acquire early users",
            description:
              "Use targeted communities, partnerships and direct outreach.",
          },
          {
            title: "Iterate",
            description:
              "Improve the product using real customer feedback.",
          },
        ];

  /*
   * Normalize roadmap.
   */
  const roadmap =
    Array.isArray(data.roadmap) &&
    data.roadmap.length
      ? data.roadmap.map((item, index) => ({
          phase:
            item && item.phase
              ? String(item.phase)
              : String(index + 1),

          title:
            item && item.title
              ? item.title
              : "Next Phase",

          description:
            item && item.description
              ? item.description
              : "Continue validating and improving the product.",
        }))
      : [
          {
            phase: "1",
            title: "Validate",
            description:
              "Confirm the problem and willingness to use or pay.",
          },
          {
            phase: "2",
            title: "Build MVP",
            description:
              "Ship the smallest useful product.",
          },
          {
            phase: "3",
            title: "Launch",
            description:
              "Get the first real users and measure outcomes.",
          },
          {
            phase: "4",
            title: "Scale",
            description:
              "Improve retention, distribution and monetization.",
          },
        ];

  /*
   * Normalize tech stack.
   */
  const techStack =
    data.techStack &&
    typeof data.techStack === "object"
      ? {
          frontend:
            data.techStack.frontend || {
              choice: "HTML/CSS/JavaScript",
              why: "Fast for an MVP.",
            },

          backend:
            data.techStack.backend || {
              choice:
                "Vercel Serverless Functions",
              why:
                "Simple to deploy.",
            },

          database:
            data.techStack.database || {
              choice: "PostgreSQL",
              why:
                "Flexible relational storage.",
            },

          ai:
            data.techStack.ai || {
              choice: "Google Gemini API",
              why:
                "Provides the AI generation layer.",
            },

          authentication:
            data.techStack.authentication || {
              choice:
                "Add after validation",
              why:
                "Avoid unnecessary MVP complexity.",
            },

          payments:
            data.techStack.payments || {
              choice:
                "Add after validation",
              why:
                "Validate willingness to pay first.",
            },

          hosting:
            data.techStack.hosting || {
              choice: "Vercel",
              why:
                "Simple hosting for frontend and API.",
            },
        }
      : {
          frontend: {
            choice: "HTML/CSS/JavaScript",
            why: "Fast for an MVP.",
          },

          backend: {
            choice:
              "Vercel Serverless Functions",
            why:
              "Simple to deploy.",
          },

          database: {
            choice: "PostgreSQL",
            why:
              "Flexible relational storage.",
          },

          ai: {
            choice: "Google Gemini API",
            why:
              "Provides the AI generation layer.",
          },

          authentication: {
            choice:
              "Add after validation",
            why:
              "Avoid unnecessary MVP complexity.",
          },

          payments: {
            choice:
              "Add after validation",
            why:
              "Validate willingness to pay first.",
          },

          hosting: {
            choice: "Vercel",
            why:
              "Simple hosting for frontend and API.",
          },
        };

  /*
   * Return the canonical structure expected by the frontend.
   */
  return {
    startup: {
      name: startupName,

      tagline:
        data.tagline ||
        "A focused solution to a real customer problem.",

      description:
        data.summary ||
        data.description ||
        data.solution ||
        "An idea-specific startup concept.",

      category:
        data.category ||
        "Technology",
    },

    problem:
      data.problem ||
      "A meaningful customer problem needs to be solved more effectively.",

    targetAudience: {
      primary:
        target.primary_user ||
        target.primary ||
        "People directly affected by the problem.",

      secondary:
        target.buyer ||
        target.secondary ||
        "Organizations or adjacent users who benefit from the solution.",

      idealCustomer:
        target.idealCustomer ||
        target.ideal_customer ||
        target.primary_user ||
        "An early adopter who experiences the problem frequently.",
    },

    solution:
      data.solution ||
      "A focused product that addresses the core problem.",

    features:
      features.length
        ? features
        : [
            {
              name: "Core Workflow",
              explanation:
                "Solves the primary use case.",
              whyItMatters:
                "Delivers the main customer value.",
            },
          ],

    usp:
      data.usp ||
      data.differentiation ||
      "Focused on a specific customer problem and workflow.",

    competitors,

    differentiation:
      data.differentiation ||
      "Focus on a defined customer segment and a differentiated workflow.",

    businessModel,

    marketOpportunity,

    goToMarket,

    mvp,

    roadmap,

    techStack,

    score: {
      overall,
      marketPotential: market,
      problemStrength,
      differentiation,
      feasibility,
    },

    verdict: {
      decision,

      reason:
        data.reason ||
        (data.verdict &&
          typeof data.verdict === "object" &&
          data.verdict.reason) ||
        data.summary ||
        "Validate the core assumptions before scaling.",

      biggestOpportunity:
        data.biggestOpportunity ||
        data.solution ||
        "Solve the core problem for a focused customer segment.",

      biggestRisk:
        data.biggestRisk ||
        "Building too much before validating customer demand.",
    },
  };
}

function toScore(value, fallback) {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(number)
        )
      )
    : fallback;
}

function levelFromScore(score) {
  if (score >= 75) {
    return "High";
  }

  if (score >= 50) {
    return "Medium";
  }

  return "Low";
}

function capitalize(str) {
  if (!str) {
    return "Venture";
  }

  return (
    str.charAt(0).toUpperCase() +
    str.slice(1).toLowerCase()
  );
}

function truncate(str, max) {
  if (str.length <= max) {
    return str;
  }

  return (
    str
      .slice(0, max - 1)
      .trimEnd() +
    "…"
  );
}

module.exports = {
  SYSTEM_PROMPT,
  buildUserPrompt,
  extractJson,
  validateBlueprintShape,
  normalizeBlueprint,
  generateDemoBlueprint,
};
