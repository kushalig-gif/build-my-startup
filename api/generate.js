/**
 * POST /api/generate
 *
 * DEMO MODE
 * ---------
 * This version does NOT call Claude or any external AI API.
 *
 * It takes the user's startup idea and generates a structured
 * startup blueprint using local demo logic.
 *
 * This allows Build My Startup V2 to work without an API key.
 *
 * Later, this file can be switched back to the Claude API
 * without changing the frontend.
 */

const MAX_IDEA_LENGTH = 600;

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

module.exports = async function handler(req, res) {
  // ---------------------------------------------------------
  // CORS
  // ---------------------------------------------------------

  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed. Use POST.'
    });
    return;
  }

  try {
    const body =
      typeof req.body === 'string'
        ? safeJsonParse(req.body)
        : req.body;

    const idea =
      body && typeof body.idea === 'string'
        ? body.idea.trim()
        : '';

    // ---------------------------------------------------------
    // Validate idea
    // ---------------------------------------------------------

    if (!idea || idea.length < 8) {
      res.status(400).json({
        error: 'Please describe your idea in at least a sentence.'
      });
      return;
    }

    if (idea.length > MAX_IDEA_LENGTH) {
      res.status(400).json({
        error: `Idea is too long. Please keep it under ${MAX_IDEA_LENGTH} characters.`
      });
      return;
    }

    // ---------------------------------------------------------
    // Generate demo blueprint
    // ---------------------------------------------------------

    const blueprint = generateDemoBlueprint(idea);

    // Small artificial delay so the frontend loading animation
    // feels like a real AI generation experience.
    await delay(900);

    res.status(200).json(blueprint);

  } catch (err) {
    console.error('Demo generate.js error:', err);

    res.status(500).json({
      error: 'Something went wrong while building your startup. Please try again.'
    });
  }
};


// ============================================================
// DEMO STARTUP GENERATOR
// ============================================================

function generateDemoBlueprint(idea) {

  const lowerIdea = idea.toLowerCase();

  const category = detectCategory(lowerIdea);

  const config = CATEGORY_CONFIG[category];

  const startupName = generateStartupName(category);

  const description =
    `A ${config.productType} designed around this idea: ${idea}`;

  const features = config.features.map((feature) => ({
    name: feature.name,
    explanation: feature.explanation,
    whyItMatters: feature.whyItMatters
  }));

  const competitors = config.competitors.map((competitor) => ({
    name: competitor.name,
    whatTheyDo: competitor.whatTheyDo,
    strength: competitor.strength,
    weakness: competitor.weakness
  }));

  const overallScore = config.score;

  return {
    startup: {
      name: startupName,
      tagline: config.tagline,
      description: description,
      category: config.category
    },

    problem: config.problem,

    targetAudience: {
      primary: config.primaryAudience,
      secondary: config.secondaryAudience,
      idealCustomer: config.idealCustomer
    },

    solution: config.solution,

    features: features,

    usp: config.usp,

    competitors: competitors,

    differentiation: config.differentiation,

    businessModel: {
      revenueModel: config.revenueModel,
      primaryRevenueSource: config.primaryRevenueSource,
      secondaryRevenueSource: config.secondaryRevenueSource,

      pricingTiers: config.pricingTiers,

      pricingNote: config.pricingNote
    },

    marketOpportunity: {
      marketPotential: config.marketPotential,
      demand: config.demand,
      competition: config.competition,
      difficulty: config.difficulty,
      reasoning: config.marketReasoning
    },

    goToMarket: config.goToMarket,

    mvp: {
      mustHave: config.mvp.mustHave,
      niceToHave: config.mvp.niceToHave,
      dontBuildYet: config.mvp.dontBuildYet
    },

    roadmap: config.roadmap,

    techStack: config.techStack,

    score: {
      overall: overallScore,
      marketPotential: config.marketScore,
      problemStrength: config.problemScore,
      differentiation: config.differentiationScore,
      feasibility: config.feasibilityScore
    },

    verdict: {
      decision: config.verdict,
      reason: config.verdictReason,
      biggestOpportunity: config.biggestOpportunity,
      biggestRisk: config.biggestRisk
    }
  };
}


// ============================================================
// CATEGORY DETECTION
// ============================================================

function detectCategory(idea) {

  if (
    containsAny(idea, [
      'internship',
      'job',
      'career',
      'resume',
      'recruit',
      'employment',
      'interview',
      'student'
    ])
  ) {
    return 'career';
  }

  if (
    containsAny(idea, [
      'restaurant',
      'food waste',
      'food',
      'grocery',
      'delivery',
      'meal',
      'recipe'
    ])
  ) {
    return 'food';
  }

  if (
    containsAny(idea, [
      'fitness',
      'gym',
      'workout',
      'exercise',
      'health',
      'wellness',
      'nutrition'
    ])
  ) {
    return 'health';
  }

  if (
    containsAny(idea, [
      'finance',
      'money',
      'budget',
      'expense',
      'investment',
      'investing',
      'bank',
      'payment'
    ])
  ) {
    return 'finance';
  }

  if (
    containsAny(idea, [
      'education',
      'learning',
      'course',
      'teacher',
      'student',
      'study',
      'exam',
      'tutor'
    ])
  ) {
    return 'education';
  }

  if (
    containsAny(idea, [
      'shopping',
      'shop',
      'product',
      'fashion',
      'clothing',
      'store',
      'ecommerce'
    ])
  ) {
    return 'commerce';
  }

  if (
    containsAny(idea, [
      'travel',
      'trip',
      'tourism',
      'hotel',
      'vacation',
      'tour'
    ])
  ) {
    return 'travel';
  }

  if (
    containsAny(idea, [
      'ai',
      'artificial intelligence',
      'automation',
      'chatbot',
      'productivity',
      'software',
      'saas'
    ])
  ) {
    return 'ai';
  }

  return 'general';
}


// ============================================================
// STARTUP NAME GENERATOR
// ============================================================

function generateStartupName(category) {

  const names = {
    career: [
      'Careerly',
      'PathPilot',
      'Launchly',
      'CareerPilot'
    ],

    food: [
      'FreshLoop',
      'FoodCycle',
      'WasteLess',
      'PlateLoop'
    ],

    health: [
      'FitFlow',
      'Wellora',
      'PulsePath',
      'HabitFit'
    ],

    finance: [
      'MoneyMap',
      'Spendly',
      'FinPath',
      'PocketPilot'
    ],

    education: [
      'Learnly',
      'StudyFlow',
      'SkillPilot',
      'LearnLoop'
    ],

    commerce: [
      'ShopPilot',
      'StyleMatch',
      'BuyWise',
      'Cartly'
    ],

    travel: [
      'TripPilot',
      'Roamly',
      'TravelFlow',
      'Wanderly'
    ],

    ai: [
      'FlowAI',
      'LaunchAI',
      'IdeaPilot',
      'SmartFlow'
    ],

    general: [
      'NovaFlow',
      'Launchly',
      'IdeaPilot',
      'Nextora'
    ]
  };

  const options = names[category] || names.general;

  return options[Math.floor(Math.random() * options.length)];
}


// ============================================================
// CATEGORY CONFIGURATION
// ============================================================

const CATEGORY_CONFIG = {

  career: {

    category: 'CareerTech',

    productType: 'AI-powered career platform',

    tagline: 'Turn career goals into your next opportunity.',

    problem:
      'Students and early-career professionals often struggle to discover relevant opportunities, understand what employers are looking for, and know which skills they should develop next.',

    primaryAudience:
      'College students and recent graduates',

    secondaryAudience:
      'Career switchers and early-career professionals',

    idealCustomer:
      'A motivated student or recent graduate actively looking for internships, jobs, or career guidance.',

    solution:
      'A personalized career platform that combines user goals, skills, experience, and interests to recommend relevant opportunities and actionable next steps.',

    usp:
      'Instead of simply showing opportunities, the product connects career goals with personalized recommendations and a clear path toward becoming qualified.',

    differentiation:
      'The strongest differentiation is personalization. Rather than functioning as another generic job board, the product can guide users from discovering an opportunity to understanding how to become a stronger candidate.',

    revenueModel:
      'Freemium subscription combined with employer partnerships',

    primaryRevenueSource:
      'Premium subscriptions',

    secondaryRevenueSource:
      'Recruiter and employer partnerships',

    pricingTiers: [
      {
        name: 'Free',
        price: '₹0',
        features: [
          'Basic opportunity discovery',
          'Basic profile',
          'Limited recommendations'
        ]
      },
      {
        name: 'Pro',
        price: '₹299/month',
        features: [
          'Personalized recommendations',
          'Advanced career insights',
          'Resume improvement',
          'Career roadmap'
        ]
      },
      {
        name: 'Business',
        price: 'Custom',
        features: [
          'Employer access',
          'Recruiter tools',
          'Candidate insights'
        ]
      }
    ],

    pricingNote:
      'Pricing should be validated with students before launch. A low-cost student subscription combined with B2B revenue is a reasonable starting hypothesis.',

    marketPotential: 'High',
    demand: 'High',
    competition: 'High',
    difficulty: 'Medium',

    marketReasoning:
      'Career platforms have strong demand, but the space is competitive. The opportunity depends heavily on delivering a noticeably better personalized experience.',

    features: [
      {
        name: 'Smart Opportunity Matching',
        explanation:
          'Match users with opportunities based on their skills, goals, interests, and experience.',
        whyItMatters:
          'Reduces the time users spend searching through irrelevant opportunities.'
      },
      {
        name: 'Resume Analyzer',
        explanation:
          'Analyze a resume and highlight areas that could be improved.',
        whyItMatters:
          'Helps users become stronger candidates before applying.'
      },
      {
        name: 'Career Roadmap',
        explanation:
          'Create a personalized path of skills, projects, and milestones.',
        whyItMatters:
          'Turns a vague career goal into actionable steps.'
      },
      {
        name: 'Application Assistant',
        explanation:
          'Help users organize and improve their applications.',
        whyItMatters:
          'Reduces friction during the application process.'
      },
      {
        name: 'Opportunity Alerts',
        explanation:
          'Notify users about relevant new opportunities.',
        whyItMatters:
          'Helps users respond quickly to suitable openings.'
      },
      {
        name: 'Skill Gap Analysis',
        explanation:
          'Compare current skills with target role requirements.',
        whyItMatters:
          'Shows users exactly what they should improve.'
      }
    ],

    competitors: [
      {
        name: 'LinkedIn',
        whatTheyDo:
          'Professional networking and job discovery platform.',
        strength:
          'Huge professional network and job database.',
        weakness:
          'Personalization can feel broad and overwhelming.'
      },
      {
        name: 'Indeed',
        whatTheyDo:
          'Large-scale job search platform.',
        strength:
          'Large volume of job listings.',
        weakness:
          'Primarily focused on search rather than career development.'
      },
      {
        name: 'Internshala',
        whatTheyDo:
          'Internship and entry-level opportunity platform.',
        strength:
          'Strong student and internship focus.',
        weakness:
          'Opportunity discovery can still require significant manual searching.'
      }
    ],

    goToMarket: [
      {
        title: 'Campus Ambassadors',
        description:
          'Partner with student communities and college clubs.'
      },
      {
        title: 'Career Content',
        description:
          'Create short-form content around internships, resumes, and careers.'
      },
      {
        title: 'Referral Program',
        description:
          'Reward users for bringing classmates onto the platform.'
      },
      {
        title: 'College Partnerships',
        description:
          'Work with university career centers and placement cells.'
      }
    ],

    mvp: {
      mustHave: [
        'User profile',
        'Opportunity database',
        'Basic matching',
        'Resume upload',
        'Skill gap analysis'
      ],
      niceToHave: [
        'Application tracker',
        'Personalized notifications',
        'Career dashboard',
        'Resume suggestions'
      ],
      dontBuildYet: [
        'Full recruiter marketplace',
        'Complex social network',
        'Native mobile applications'
      ]
    },

    roadmap: [
      {
        phase: '01',
        title: 'Validate',
        description:
          'Interview students and test the core matching concept.'
      },
      {
        phase: '02',
        title: 'Build MVP',
        description:
          'Launch profiles, opportunity discovery, and basic matching.'
      },
      {
        phase: '03',
        title: 'Beta Launch',
        description:
          'Recruit the first student users and measure engagement.'
      },
      {
        phase: '04',
        title: 'Expand',
        description:
          'Add premium features and employer partnerships.'
      }
    ],

    techStack: {

      frontend: {
        choice: 'React',
        why: 'Useful for building an interactive career dashboard.'
      },

      backend: {
        choice: 'Node.js',
        why: 'Simple backend for APIs and user workflows.'
      },

      database: {
        choice: 'PostgreSQL',
        why: 'Good fit for structured users, opportunities, and applications.'
      },

      ai: {
        choice: 'Claude or OpenAI API',
        why: 'Can power resume analysis, matching, and recommendations.'
      },

      authentication: {
        choice: 'Clerk or Auth.js',
        why: 'Provides secure authentication without building everything from scratch.'
      },

      payments: {
        choice: 'Stripe or Razorpay',
        why: 'Supports subscription payments.'
      },

      hosting: {
        choice: 'Vercel',
        why: 'Simple deployment for modern web applications.'
      }
    },

    score: 82,
    marketScore: 88,
    problemScore: 86,
    differentiationScore: 72,
    feasibilityScore: 80,

    verdict: 'VALIDATE FIRST',

    verdictReason:
      'The problem is strong and the audience is easy to identify, but the career platform market is crowded. The idea should be validated with real students before significant development.',

    biggestOpportunity:
      'Build a highly personalized experience for a specific student segment rather than competing with general job platforms.',

    biggestRisk:
      'Acquiring enough high-quality opportunity data and differentiating from established platforms.'
  },


  food: {

    category: 'FoodTech',

    productType: 'food intelligence platform',

    tagline: 'Make every ingredient count.',

    problem:
      'Restaurants, households, and food businesses often waste usable food because they lack accurate demand forecasting, inventory visibility, and simple ways to redistribute surplus.',

    primaryAudience:
      'Independent restaurants and food businesses',

    secondaryAudience:
      'Consumers and food rescue organizations',

    idealCustomer:
      'A food business that regularly throws away surplus ingredients or prepared food.',

    solution:
      'A platform that tracks inventory, predicts demand, identifies potential waste, and helps businesses find ways to use or redistribute surplus.',

    usp:
      'Connect waste reduction directly to cost savings rather than positioning sustainability as the only benefit.',

    differentiation:
      'Focus on measurable financial savings and simple workflows for small businesses instead of enterprise-only sustainability software.',

    revenueModel:
      'B2B SaaS subscription',

    primaryRevenueSource:
      'Monthly business subscriptions',

    secondaryRevenueSource:
      'Partnership and transaction fees',

    pricingTiers: [
      {
        name: 'Starter',
        price: '₹999/month',
        features: [
          'Inventory tracking',
          'Waste dashboard',
          'Basic reports'
        ]
      },
      {
        name: 'Growth',
        price: '₹2,499/month',
        features: [
          'Demand forecasting',
          'Waste alerts',
          'Advanced analytics'
        ]
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        features: [
          'Multiple locations',
          'Advanced reporting',
          'Integrations'
        ]
      }
    ],

    pricingNote:
      'Pricing should ultimately be tied to measurable savings generated for the business.',

    marketPotential: 'High',
    demand: 'Medium',
    competition: 'Medium',
    difficulty: 'Medium',

    marketReasoning:
      'The problem is economically meaningful, but adoption depends on making the product easier than existing inventory workflows.',

    features: [
      {
        name: 'Waste Tracker',
        explanation: 'Track what food is being discarded and why.',
        whyItMatters: 'Shows businesses where money is being lost.'
      },
      {
        name: 'Demand Forecasting',
        explanation: 'Estimate future ingredient requirements.',
        whyItMatters: 'Can reduce over-ordering.'
      },
      {
        name: 'Surplus Alerts',
        explanation: 'Identify ingredients or meals approaching expiry.',
        whyItMatters: 'Gives staff time to act before food becomes waste.'
      },
      {
        name: 'Savings Dashboard',
        explanation: 'Show estimated money saved through waste reduction.',
        whyItMatters: 'Makes sustainability financially measurable.'
      },
      {
        name: 'Donation Matching',
        explanation: 'Connect eligible surplus with local organizations.',
        whyItMatters: 'Creates a second path for usable food.'
      }
    ],

    competitors: [
      {
        name: 'Too Good To Go',
        whatTheyDo: 'Helps consumers purchase surplus food.',
        strength: 'Large consumer network.',
        weakness: 'Focused primarily on surplus food sales.'
      },
      {
        name: 'Winnow',
        whatTheyDo: 'Provides food waste measurement technology.',
        strength: 'Strong enterprise analytics.',
        weakness: 'May be more complex for smaller businesses.'
      },
      {
        name: 'Leanpath',
        whatTheyDo: 'Tracks food waste for commercial kitchens.',
        strength: 'Established food waste measurement.',
        weakness: 'Primarily enterprise focused.'
      }
    ],

    goToMarket: [
      {
        title: 'Pilot Restaurants',
        description: 'Offer free pilots to 10 local restaurants.'
      },
      {
        title: 'Savings Case Studies',
        description: 'Document measurable reductions in food costs.'
      },
      {
        title: 'Restaurant Communities',
        description: 'Partner with local restaurant associations.'
      },
      {
        title: 'Referral Program',
        description: 'Reward businesses for referring other restaurants.'
      }
    ],

    mvp: {
      mustHave: [
        'Inventory tracking',
        'Waste logging',
        'Dashboard',
        'Waste alerts'
      ],
      niceToHave: [
        'Demand forecasting',
        'Donation matching',
        'POS integrations'
      ],
      dontBuildYet: [
        'Consumer marketplace',
        'Complex robotics',
        'Large enterprise integrations'
      ]
    },

    roadmap: [
      {
        phase: '01',
        title: 'Pilot',
        description: 'Test the workflow with a small number of restaurants.'
      },
      {
        phase: '02',
        title: 'MVP',
        description: 'Launch tracking, alerts, and reporting.'
      },
      {
        phase: '03',
        title: 'Automation',
        description: 'Add forecasting and integrations.'
      },
      {
        phase: '04',
        title: 'Scale',
        description: 'Expand into multiple cities and restaurant groups.'
      }
    ],

    techStack: {

      frontend: {
        choice: 'React',
        why: 'Good for interactive business dashboards.'
      },

      backend: {
        choice: 'Node.js',
        why: 'Works well for APIs and integrations.'
      },

      database: {
        choice: 'PostgreSQL',
        why: 'Suitable for inventory and transaction data.'
      },

      ai: {
        choice: 'Forecasting model',
        why: 'Can eventually predict demand and waste.'
      },

      authentication: {
        choice: 'Clerk',
        why: 'Simple business authentication.'
      },

      payments: {
        choice: 'Stripe',
        why: 'Supports recurring SaaS subscriptions.'
      },

      hosting: {
        choice: 'Vercel',
        why: 'Simple deployment.'
      }
    },

    score: 79,
    marketScore: 84,
    problemScore: 87,
    differentiationScore: 74,
    feasibilityScore: 70,

    verdict: 'VALIDATE FIRST',

    verdictReason:
      'The problem has a clear financial impact, but businesses need evidence that the product saves more money than it costs.',

    biggestOpportunity:
      'Position the product around measurable cost savings rather than sustainability alone.',

    biggestRisk:
      'Getting accurate inventory and waste data without creating additional work for restaurant staff.'
  },


  general: {

    category: 'Technology',

    productType: 'digital product',

    tagline: 'Turn a simple idea into something people can use.',

    problem:
      'Many potential customers experience a specific problem but existing solutions can be fragmented, difficult to use, or poorly personalized.',

    primaryAudience:
      'People who experience the problem described in the idea',

    secondaryAudience:
      'Businesses and organizations serving that audience',

    idealCustomer:
      'An early adopter who experiences the problem frequently and is actively looking for a better solution.',

    solution:
      'A focused digital platform that simplifies the problem and provides users with a faster, more personalized way to achieve the desired outcome.',

    usp:
      'Focus on solving one painful problem exceptionally well instead of trying to become a platform for everything.',

    differentiation:
      'Start with a narrow audience and a highly focused MVP. Use real customer feedback to determine which features deserve to be built next.',

    revenueModel:
      'Freemium subscription or transaction-based model',

    primaryRevenueSource:
      'Premium product features',

    secondaryRevenueSource:
      'Business partnerships or transactions',

    pricingTiers: [
      {
        name: 'Free',
        price: '₹0',
        features: [
          'Core functionality',
          'Basic account',
          'Limited usage'
        ]
      },
      {
        name: 'Pro',
        price: '₹299/month',
        features: [
          'Advanced features',
          'Higher usage',
          'Personalized experience'
        ]
      },
      {
        name: 'Business',
        price: 'Custom',
        features: [
          'Team features',
          'Advanced controls',
          'Priority support'
        ]
      }
    ],

    pricingNote:
      'Treat these prices as initial hypotheses. Pricing should be tested with real potential customers.',

    marketPotential: 'Medium',
    demand: 'Medium',
    competition: 'Medium',
    difficulty: 'Medium',

    marketReasoning:
      'The opportunity depends heavily on how painful and frequent the identified problem is and whether users are willing to switch from existing alternatives.',

    features: [
      {
        name: 'Personalized Dashboard',
        explanation:
          'Give users one place to manage the core experience.',
        whyItMatters:
          'Reduces friction and keeps the product focused.'
      },
      {
        name: 'Smart Recommendations',
        explanation:
          'Provide recommendations based on user preferences and behavior.',
        whyItMatters:
          'Makes the product more useful over time.'
      },
      {
        name: 'Progress Tracking',
        explanation:
          'Allow users to see outcomes and progress.',
        whyItMatters:
          'Makes the value of the product visible.'
      },
      {
        name: 'Notifications',
        explanation:
          'Send useful reminders and updates.',
        whyItMatters:
          'Encourages repeat usage.'
      },
      {
        name: 'Analytics',
        explanation:
          'Show users meaningful insights.',
        whyItMatters:
          'Helps users make better decisions.'
      }
    ],

    competitors: [
      {
        name: 'Existing Solutions',
        whatTheyDo:
          'Provide alternative ways to solve the same underlying problem.',
        strength:
          'Already have users and established workflows.',
        weakness:
          'May not be optimized for the specific audience.'
      },
      {
        name: 'Manual Workflows',
        whatTheyDo:
          'Users solve the problem themselves using existing tools.',
        strength:
          'Flexible and familiar.',
        weakness:
          'Often inefficient and time-consuming.'
      },
      {
        name: 'Specialized Startups',
        whatTheyDo:
          'Focus on specific parts of the problem.',
        strength:
          'Can provide focused experiences.',
        weakness:
          'May leave gaps between different parts of the workflow.'
      }
    ],

    goToMarket: [
      {
        title: 'Talk to Users',
        description:
          'Interview potential customers and validate the problem.'
      },
      {
        title: 'Build a Landing Page',
        description:
          'Test whether the target audience understands and wants the solution.'
      },
      {
        title: 'Launch a Small Beta',
        description:
          'Recruit a small group of early adopters.'
      },
      {
        title: 'Measure Retention',
        description:
          'Use user behavior to decide what to improve next.'
      }
    ],

    mvp: {
      mustHave: [
        'Core user flow',
        'Simple onboarding',
        'Basic dashboard',
        'Core problem-solving feature'
      ],
      niceToHave: [
        'Advanced personalization',
        'Notifications',
        'Analytics',
        'Integrations'
      ],
      dontBuildYet: [
        'Native mobile apps',
        'Complex social features',
        'Large enterprise functionality'
      ]
    },

    roadmap: [
      {
        phase: '01',
        title: 'Validate',
        description:
          'Talk to potential users and confirm the problem.'
      },
      {
        phase: '02',
        title: 'Prototype',
        description:
          'Build the smallest useful version.'
      },
      {
        phase: '03',
        title: 'Beta',
        description:
          'Launch to early users and collect feedback.'
      },
      {
        phase: '04',
        title: 'Improve',
        description:
          'Prioritize features based on actual user behavior.'
      }
    ],

    techStack: {

      frontend: {
        choice: 'HTML, CSS and JavaScript',
        why: 'A lightweight starting point for validating the product.'
      },

      backend: {
        choice: 'Node.js',
        why: 'Simple and flexible for APIs.'
      },

      database: {
        choice: 'PostgreSQL',
        why: 'Reliable choice for structured application data.'
      },

      ai: {
        choice: 'Add AI after validating the core workflow',
        why: 'Avoid unnecessary AI complexity before proving the underlying problem.'
      },

      authentication: {
        choice: 'Clerk',
        why: 'Reduces the work required for secure authentication.'
      },

      payments: {
        choice: 'Stripe or Razorpay',
        why: 'Useful for subscriptions or payments.'
      },

      hosting: {
        choice: 'Vercel',
        why: 'Simple deployment for web applications.'
      }
    },

    score: 70,
    marketScore: 70,
    problemScore: 68,
    differentiationScore: 66,
    feasibilityScore: 78,

    verdict: 'VALIDATE FIRST',

    verdictReason:
      'The concept could be promising, but the exact target user and problem need validation before investing heavily in development.',

    biggestOpportunity:
      'Find a narrow audience with a painful and frequent version of the problem.',

    biggestRisk:
      'Building a broad product before confirming that users actually need it.'
  }
};


// ============================================================
// HELPERS
// ============================================================

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}


function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}


function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}