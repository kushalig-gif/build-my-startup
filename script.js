/* =====================================================
   BUILD MY STARTUP — V2 FRONTEND LOGIC
   Talks to POST /api/generate (serverless function).
   No API key ever lives in this file.
   ===================================================== */

(() => {
  'use strict';

  // ---------- DOM refs ----------
  const form = document.getElementById('builder');
  const ideaInput = document.getElementById('idea-input');
  const charCount = document.getElementById('char-count');
  const ideaError = document.getElementById('idea-error');
  const buildBtn = document.getElementById('build-btn');

  const chips = document.querySelectorAll('.chip[data-fill]');

  const loadingSection =
    document.getElementById('loading-section');

  const errorSection =
    document.getElementById('error-section');

  const errorMsgEl =
    document.getElementById('error-msg');

  const retryBtn =
    document.getElementById('retry-btn');

  const resultsSection =
    document.getElementById('results');

  const resultsContent =
    document.getElementById('results-content');

  const stepItems =
    Array.from(document.querySelectorAll('.step-item'));

  const btnAgain =
    document.getElementById('btn-again');

  const btnCopy =
    document.getElementById('btn-copy');

  const btnExport =
    document.getElementById('btn-export');

  const btnShare =
    document.getElementById('btn-share');

  const toastEl =
    document.getElementById('toast');

  let currentBlueprint = null;
  let currentIdea = '';
  let stepTimer = null;

  // ---------- helpers ----------

  function escapeHtml(str) {
    if (str === null || str === undefined) {
      return '';
    }

    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function esc(str) {
    return escapeHtml(str);
  }

  function escList(arr) {
    return Array.isArray(arr)
      ? arr.map(esc)
      : [];
  }

  function showToast(message) {
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.classList.add('show');

    clearTimeout(showToast._timer);

    showToast._timer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2400);
  }

  function levelClass(level) {
    const value =
      String(level || '').toLowerCase();

    if (value.includes('high')) {
      return 'high';
    }

    if (value.includes('med')) {
      return 'medium';
    }

    return 'low';
  }

  function decisionClass(decision) {
    const value =
      String(decision || '').toLowerCase();

    if (value.includes('reconsider')) {
      return 'reconsider';
    }

    if (value.includes('validate')) {
      return 'validate';
    }

    return 'build';
  }

  function clamp01to100(value) {
    value = Number(value);

    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round(value))
    );
  }

  // =====================================================
  // CHARACTER COUNT + VALIDATION
  // =====================================================

  ideaInput.addEventListener('input', () => {
    const length =
      ideaInput.value.length;

    charCount.textContent = length;

    if (length > 60) {
      ideaError.textContent =
        `Your startup idea is ${length} characters long. Please keep it within 60 characters.`;

      ideaError.classList.add('show');
    } else if (
      ideaInput.value.trim().length > 0
    ) {
      ideaError.classList.remove('show');
    }
  });

  // =====================================================
  // SUGGESTION CHIPS
  // =====================================================

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      ideaInput.value =
        chip.getAttribute('data-fill');

      const length =
        ideaInput.value.length;

      charCount.textContent = length;

      if (length > 60) {
        ideaError.textContent =
          `Your startup idea is ${length} characters long. Please keep it within 60 characters.`;

        ideaError.classList.add('show');
      } else {
        ideaError.classList.remove('show');
      }

      ideaInput.focus();
    });
  });

  // =====================================================
  // LOADING STEPS
  // =====================================================

  function resetSteps() {
    stepItems.forEach((element) => {
      element.classList.remove(
        'active',
        'done'
      );
    });
  }

  function startStepAnimation() {
    resetSteps();

    let index = 0;

    if (stepItems[0]) {
      stepItems[0].classList.add('active');
    }

    stepTimer = setInterval(() => {
      if (index < stepItems.length) {
        stepItems[index].classList.remove(
          'active'
        );

        stepItems[index].classList.add(
          'done'
        );
      }

      index++;

      if (index < stepItems.length) {
        stepItems[index].classList.add(
          'active'
        );
      } else {
        clearInterval(stepTimer);
      }
    }, 900);
  }

  function finishStepAnimation() {
    clearInterval(stepTimer);

    stepItems.forEach((element) => {
      element.classList.remove('active');
      element.classList.add('done');
    });
  }

  // =====================================================
  // VIEW STATE
  // =====================================================

  function showOnly(section) {
    [
      loadingSection,
      errorSection,
      resultsSection
    ].forEach((element) => {
      if (element) {
        element.classList.add('hidden');
      }
    });

    if (section) {
      section.classList.remove('hidden');
    }
  }

  // =====================================================
  // FORM SUBMISSION
  // =====================================================

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const idea =
      ideaInput.value.trim();

    // Minimum length
    if (idea.length < 8) {
      ideaError.textContent =
        'Please enter a startup idea with at least 8 characters.';

      ideaError.classList.add('show');

      ideaInput.focus();

      return;
    }

    // Maximum length
    if (idea.length > 60) {
      ideaError.textContent =
        `Your startup idea is ${idea.length} characters long. Please keep it within 60 characters.`;

      ideaError.classList.add('show');

      ideaInput.focus();

      return;
    }

    ideaError.classList.remove('show');

    runGeneration(idea);
  });

  // =====================================================
  // API GENERATION
  // =====================================================

  async function runGeneration(idea) {
    currentIdea = idea;

    buildBtn.disabled = true;

    showOnly(loadingSection);

    startStepAnimation();

    try {
      const response =
        await fetch('/api/generate', {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({
            idea: idea
          })
        });

      let payload = null;

      try {
        payload =
          await response.json();
      } catch (_) {
        payload = null;
      }

      // =================================================
      // IMPORTANT:
      // Read the actual backend error message.
      // =================================================

      if (
        !response.ok ||
        !payload ||
        payload.error
      ) {
        let friendly =
          'The AI couldn’t complete your blueprint. This is usually temporary.';

        if (
          payload &&
          payload.error
        ) {
          if (
            typeof payload.error ===
            'string'
          ) {
            friendly =
              payload.error;
          } else if (
            payload.error.message
          ) {
            friendly =
              payload.error.message;
          }
        }

        throw new Error(friendly);
      }

      validateBlueprint(payload);

      finishStepAnimation();

      currentBlueprint =
        payload;

      renderResults(payload);

      setTimeout(() => {
        showOnly(resultsSection);

        resultsSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 350);

    } catch (error) {
      clearInterval(stepTimer);

      errorMsgEl.textContent =
        safeErrorMessage(error);

      showOnly(errorSection);

    } finally {
      buildBtn.disabled = false;
    }
  }

  // =====================================================
  // SAFE ERROR MESSAGE
  // =====================================================

  function safeErrorMessage(error) {
    const message =
      error && error.message
        ? String(error.message)
        : '';

    if (
      !message ||
      message.length > 200
    ) {
      return 'The AI couldn’t complete your blueprint. This is usually temporary — please try again.';
    }

    return message;
  }

  // =====================================================
  // BLUEPRINT VALIDATION
  // =====================================================

  function validateBlueprint(data) {
    if (
      !data ||
      typeof data !== 'object'
    ) {
      throw new Error(
        'Received an unexpected response. Please try again.'
      );
    }

    if (
      !data.startup ||
      !data.startup.name
    ) {
      throw new Error(
        'The blueprint came back incomplete. Please try again.'
      );
    }
  }

  // =====================================================
  // RESULTS
  // =====================================================

  function renderResults(data) {
    const startup =
      data.startup || {};

    const targetAudience =
      data.targetAudience || {};

    const businessModel =
      data.businessModel || {};

    const marketOpportunity =
      data.marketOpportunity || {};

    const mvp =
      data.mvp || {};

    const techStack =
      data.techStack || {};

    const score =
      data.score || {};

    const verdict =
      data.verdict || {};

    const overall =
      clamp01to100(score.overall);

    resultsContent.innerHTML = `
      ${renderIdentityAndScore(
        startup,
        score,
        overall
      )}

      ${renderProblemAudienceSolution(
        data.problem,
        targetAudience,
        data.solution
      )}

      ${renderFeatures(
        data.features
      )}

      ${renderUSP(
        data.usp
      )}

      ${renderCompetitors(
        data.competitors,
        data.differentiation
      )}

      ${renderBusinessModel(
        businessModel
      )}

      ${renderMarketOpportunity(
        marketOpportunity
      )}

      ${renderGoToMarket(
        data.goToMarket
      )}

      ${renderMVP(
        mvp
      )}

      ${renderRoadmap(
        data.roadmap
      )}

      ${renderTechStack(
        techStack
      )}

      ${renderVerdict(
        verdict
      )}
    `;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .querySelectorAll(
            '.score-fill'
          )
          .forEach((element) => {
            element.style.width =
              element.getAttribute(
                'data-target'
              ) + '%';
          });
      });
    });
  }

  function renderIdentityAndScore(
    startup,
    score,
    overall
  ) {
    const rows = [
      [
        'Market Potential',
        score.marketPotential
      ],
      [
        'Problem Strength',
        score.problemStrength
      ],
      [
        'Differentiation',
        score.differentiation
      ],
      [
        'Feasibility',
        score.feasibility
      ]
    ];

    return `
      <div class="blueprint-card">

        <div class="blueprint-top">

          <div class="startup-id">

            <div class="startup-icon">
              🚀
            </div>

            <div>

              <div class="startup-name">
                ${
                  esc(
                    startup.name
                  ) ||
                  'Untitled Startup'
                }
              </div>

              <div class="startup-tagline">
                ${esc(
                  startup.tagline
                )}
              </div>

              ${
                startup.category
                  ? `
                    <span class="category-badge">
                      ${esc(
                        startup.category
                      )}
                    </span>
                  `
                  : ''
              }

            </div>

          </div>

          <span class="ai-badge">
            ◆ AI Generated
          </span>

        </div>

        ${
          startup.description
            ? `
              <p class="startup-desc">
                ${esc(
                  startup.description
                )}
              </p>
            `
            : ''
        }

        <div class="score-block">

          <div class="score-head">

            <span class="score-num">
              ${overall}

              <span
                style="
                  font-size:16px;
                  color:var(--navy-faint);
                "
              >
                /100
              </span>
            </span>

            <span class="score-label">
              Startup Score
            </span>

          </div>

          <div class="score-disclaimer">
            An AI-generated assessment,
            not an objective investment score.
          </div>

          <div
            class="score-bars"
            style="margin-top:16px;"
          >

            ${rows
              .map(
                ([label, value]) => {
                  const v =
                    clamp01to100(
                      value
                    );

                  return `
                    <div class="score-row">

                      <div class="score-row-top">
                        <span>
                          ${esc(label)}
                        </span>

                        <span>
                          ${v}/100
                        </span>
                      </div>

                      <div class="score-track">

                        <div
                          class="score-fill"
                          data-target="${v}"
                        ></div>

                      </div>

                    </div>
                  `;
                }
              )
              .join('')}

          </div>

        </div>

      </div>
    `;
  }

  function renderProblemAudienceSolution(
    problem,
    targetAudience,
    solution
  ) {
    return `
      <div class="blueprint-card">

        <div class="bp-grid">

          <div class="bp-block">

            <h4>
              The Problem
            </h4>

            <p>
              ${esc(problem)}
            </p>

          </div>

          <div class="bp-block">

            <h4>
              Who Is This For?
            </h4>

            <ul>

              ${
                targetAudience.primary
                  ? `
                    <li>
                      <strong>
                        Primary:
                      </strong>

                      ${esc(
                        targetAudience.primary
                      )}
                    </li>
                  `
                  : ''
              }

              ${
                targetAudience.secondary
                  ? `
                    <li>
                      <strong>
                        Secondary:
                      </strong>

                      ${esc(
                        targetAudience.secondary
                      )}
                    </li>
                  `
                  : ''
              }

              ${
                targetAudience.idealCustomer
                  ? `
                    <li>
                      <strong>
                        Ideal customer:
                      </strong>

                      ${esc(
                        targetAudience.idealCustomer
                      )}
                    </li>
                  `
                  : ''
              }

            </ul>

          </div>

          <div
            class="bp-block"
            style="grid-column:1/-1;"
          >

            <h4>
              The Solution
            </h4>

            <p>
              ${esc(solution)}
            </p>

          </div>

        </div>

      </div>
    `;
  }

  function renderFeatures(features) {
    if (
      !Array.isArray(features) ||
      !features.length
    ) {
      return '';
    }

    const icons = [
      '🎯',
      '📄',
      '🔔',
      '🧠',
      '💬',
      '📊',
      '⚙️',
      '🔍'
    ];

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Key Features
        </span>

        <h2>
          What should you build?
        </h2>

      </div>

      <div class="feature-grid">

        ${features
          .map(
            (feature, index) => `
              <div class="feature-card">

                <div class="feature-icon">
                  ${
                    icons[
                      index %
                      icons.length
                    ]
                  }
                </div>

                <h3>
                  ${esc(
                    feature.name
                  )}
                </h3>

                <p>
                  ${esc(
                    feature.explanation
                  )}
                </p>

                ${
                  feature.whyItMatters
                    ? `
                      <div class="feature-why">
                        Why it matters:
                        ${esc(
                          feature.whyItMatters
                        )}
                      </div>
                    `
                    : ''
                }

              </div>
            `
          )
          .join('')}

      </div>
    `;
  }

  function renderUSP(usp) {
    if (!usp) {
      return '';
    }

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Why This Wins
        </span>

        <h2>
          Why would people choose this?
        </h2>

      </div>

      <div
        class="advantage-box"
        style="margin-top:0;"
      >

        <span class="eyebrow">
          Unique Selling Proposition
        </span>

        <p>
          ${esc(usp)}
        </p>

      </div>
    `;
  }

  function renderCompetitors(
    competitors,
    differentiation
  ) {
    if (
      !Array.isArray(competitors) ||
      !competitors.length
    ) {
      return '';
    }

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Competitive Landscape
        </span>

        <h2>
          Who are you competing with?
        </h2>

      </div>

      <div class="competitor-grid">

        ${competitors
          .map(
            (competitor) => `
              <div class="competitor-card">

                <h4>
                  ${esc(
                    competitor.name
                  )}
                </h4>

                <p class="competitor-does">
                  ${esc(
                    competitor.whatTheyDo
                  )}
                </p>

                ${
                  competitor.strength
                    ? `
                      <div class="competitor-row">

                        <span class="tag strength">
                          Strength
                        </span>

                        ${esc(
                          competitor.strength
                        )}

                      </div>
                    `
                    : ''
                }

                ${
                  competitor.weakness
                    ? `
                      <div class="competitor-row">

                        <span class="tag weakness">
                          Weakness
                        </span>

                        ${esc(
                          competitor.weakness
                        )}

                      </div>
                    `
                    : ''
                }

              </div>
            `
          )
          .join('')}

      </div>

      ${
        differentiation
          ? `
            <div class="advantage-box">

              <span class="eyebrow">
                Your Advantage
              </span>

              <p>
                ${esc(
                  differentiation
                )}
              </p>

            </div>
          `
          : ''
      }
    `;
  }

  function renderBusinessModel(
    businessModel
  ) {
    const tiers =
      Array.isArray(
        businessModel.pricingTiers
      )
        ? businessModel.pricingTiers
        : [];

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Business Model
        </span>

        <h2>
          How does it make money?
        </h2>

      </div>

      ${
        tiers.length
          ? `
            <div class="pricing-grid">

              ${tiers
                .map(
                  (tier, index) => {
                    const featured =
                      index ===
                      Math.min(
                        1,
                        tiers.length - 1
                      );

                    return `
                      <div
                        class="
                          price-card
                          ${
                            featured
                              ? 'featured'
                              : ''
                          }
                        "
                      >

                        ${
                          featured
                            ? `
                              <span
                                class="price-recommend"
                              >
                                Recommended
                              </span>
                            `
                            : ''
                        }

                        <span class="price-tier">
                          ${esc(
                            tier.name
                          )}
                        </span>

                        <div class="price-amount">
                          ${esc(
                            tier.price
                          )}
                        </div>

                        <ul class="price-list">

                          ${escList(
                            tier.features
                          )
                            .map(
                              (feature) =>
                                `<li>${feature}</li>`
                            )
                            .join('')}

                        </ul>

                      </div>
                    `;
                  }
                )
                .join('')}

            </div>
          `
          : ''
      }

      <div class="revenue-note">

        ${
          businessModel.revenueModel
            ? `
              <div>
                <b>
                  Revenue model:
                </b>

                ${esc(
                  businessModel.revenueModel
                )}
              </div>
            `
            : ''
        }

        ${
          businessModel.primaryRevenueSource
            ? `
              <div style="margin-top:6px;">
                <b>
                  Primary source:
                </b>

                ${esc(
                  businessModel.primaryRevenueSource
                )}
              </div>
            `
            : ''
        }

        ${
          businessModel.secondaryRevenueSource
            ? `
              <div style="margin-top:6px;">
                <b>
                  Secondary source:
                </b>

                ${esc(
                  businessModel.secondaryRevenueSource
                )}
              </div>
            `
            : ''
        }

        ${
          businessModel.pricingNote
            ? `
              <div style="margin-top:6px;">
                ${esc(
                  businessModel.pricingNote
                )}
              </div>
            `
            : ''
        }

      </div>
    `;
  }

  function renderMarketOpportunity(
    marketOpportunity
  ) {
    const rows = [
      [
        'Market Potential',
        marketOpportunity.marketPotential
      ],
      [
        'Demand',
        marketOpportunity.demand
      ],
      [
        'Competition',
        marketOpportunity.competition
      ],
      [
        'Difficulty',
        marketOpportunity.difficulty
      ]
    ];

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Market Opportunity
        </span>

        <h2>
          Is there a real opportunity here?
        </h2>

      </div>

      <div class="metrics">

        ${rows
          .map(
            ([label, value]) => `
              <div class="metric-card">

                <div class="metric-label">
                  ${esc(label)}
                </div>

                <div
                  class="
                    metric-value
                    ${levelClass(value)}
                  "
                >
                  ${esc(value) || '—'}
                </div>

              </div>
            `
          )
          .join('')}

      </div>

      ${
        marketOpportunity.reasoning
          ? `
            <p class="market-reasoning">
              ${esc(
                marketOpportunity.reasoning
              )}
            </p>
          `
          : ''
      }
    `;
  }

  function renderGoToMarket(
    steps
  ) {
    if (
      !Array.isArray(steps) ||
      !steps.length
    ) {
      return '';
    }

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Go-To-Market
        </span>

        <h2>
          How would you get your first 1,000 users?
        </h2>

      </div>

      <div class="timeline">

        ${steps
          .map(
            (step, index) => `
              <div class="tl-step">

                <span class="tl-num">
                  ${String(
                    index + 1
                  ).padStart(2, '0')}
                </span>

                <h4>
                  ${esc(
                    step.title
                  )}
                </h4>

                <p>
                  ${esc(
                    step.description
                  )}
                </p>

              </div>
            `
          )
          .join('')}

      </div>
    `;
  }

  function renderMVP(mvp) {
    const must =
      Array.isArray(
        mvp.mustHave
      )
        ? mvp.mustHave
        : [];

    const nice =
      Array.isArray(
        mvp.niceToHave
      )
        ? mvp.niceToHave
        : [];

    const skip =
      Array.isArray(
        mvp.dontBuildYet
      )
        ? mvp.dontBuildYet
        : [];

    if (
      !must.length &&
      !nice.length &&
      !skip.length
    ) {
      return '';
    }

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          MVP Scope
        </span>

        <h2>
          What should we build first?
        </h2>

      </div>

      <div class="mvp-grid">

        <div class="mvp-col must">

          <h4>
            ✓ Must Have
          </h4>

          <ul>

            ${escList(must)
              .map(
                (item) =>
                  `<li>${item}</li>`
              )
              .join('')}

          </ul>

        </div>

        <div class="mvp-col nice">

          <h4>
            + Nice to Have
          </h4>

          <ul>

            ${escList(nice)
              .map(
                (item) =>
                  `<li>${item}</li>`
              )
              .join('')}

          </ul>

        </div>

        <div class="mvp-col skip">

          <h4>
            ✕ Don't Build Yet
          </h4>

          <ul>

            ${escList(skip)
              .map(
                (item) =>
                  `<li>${item}</li>`
              )
              .join('')}

          </ul>

        </div>

      </div>
    `;
  }

  function renderRoadmap(
    roadmap
  ) {
    if (
      !Array.isArray(roadmap) ||
      !roadmap.length
    ) {
      return '';
    }

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          MVP Roadmap
        </span>

        <h2>
          From validation to launch
        </h2>

      </div>

      <div class="roadmap">

        ${roadmap
          .map(
            (phase) => `
              <div class="rm-phase">

                <div class="rm-phase-label">
                  ${esc(
                    phase.phase
                  )}
                </div>

                <div>

                  <h4>
                    ${esc(
                      phase.title
                    )}
                  </h4>

                  <p>
                    ${esc(
                      phase.description
                    )}
                  </p>

                </div>

              </div>
            `
          )
          .join('')}

      </div>
    `;
  }

  function renderTechStack(
    techStack
  ) {
    const entries =
      Object.entries(
        techStack || {}
      ).filter(
        ([, value]) =>
          value &&
          (
            value.choice ||
            typeof value === 'string'
          )
      );

    if (!entries.length) {
      return '';
    }

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Suggested Tech Stack
        </span>

        <h2>
          What would you build it with?
        </h2>

      </div>

      <div class="stack-grid">

        ${entries
          .map(
            ([key, value]) => {
              const choice =
                typeof value === 'string'
                  ? value
                  : value.choice;

              const why =
                typeof value === 'string'
                  ? ''
                  : value.why;

              return `
                <div class="stack-pill">

                  <span class="k">
                    ${esc(key)}
                  </span>

                  <span class="v">
                    ${esc(choice)}
                  </span>

                  ${
                    why
                      ? `
                        <div class="why">
                          ${esc(why)}
                        </div>
                      `
                      : ''
                  }

                </div>
              `;
            }
          )
          .join('')}

      </div>
    `;
  }

  function renderVerdict(
    verdict
  ) {
    if (
      !verdict ||
      !verdict.decision
    ) {
      return '';
    }

    const className =
      decisionClass(
        verdict.decision
      );

    return `
      <div
        class="section-head"
        style="margin-top:56px;"
      >

        <span class="eyebrow">
          Final AI Verdict
        </span>

        <h2>
          Should you build this?
        </h2>

      </div>

      <div class="verdict-card">

        <div class="verdict-inner">

          <span
            class="
              verdict-decision
              ${className}
            "
          >
            ${esc(
              verdict.decision
            )}
          </span>

          <p class="verdict-reason">
            ${esc(
              verdict.reason
            )}
          </p>

          <div class="verdict-split">

            ${
              verdict.biggestOpportunity
                ? `
                  <div class="verdict-box">

                    <span class="eyebrow">
                      Biggest Opportunity
                    </span>

                    <p>
                      ${esc(
                        verdict.biggestOpportunity
                      )}
                    </p>

                  </div>
                `
                : ''
            }

            ${
              verdict.biggestRisk
                ? `
                  <div class="verdict-box">

                    <span class="eyebrow">
                      Biggest Risk
                    </span>

                    <p>
                      ${esc(
                        verdict.biggestRisk
                      )}
                    </p>

                  </div>
                `
                : ''
            }

          </div>

        </div>

      </div>
    `;
  }

  // =====================================================
  // PLAIN TEXT EXPORT
  // =====================================================

  function buildPlainText(
    data
  ) {
    const lines = [];

    const startup =
      data.startup || {};

    lines.push(
      startup.name ||
      'Untitled Startup'
    );

    if (startup.tagline) {
      lines.push(
        startup.tagline
      );
    }

    if (startup.category) {
      lines.push(
        `Category: ${startup.category}`
      );
    }

    lines.push('');

    if (startup.description) {
      lines.push(
        startup.description
      );

      lines.push('');
    }

    if (data.problem) {
      lines.push('PROBLEM');

      lines.push(
        data.problem
      );

      lines.push('');
    }

    if (data.solution) {
      lines.push('SOLUTION');

      lines.push(
        data.solution
      );

      lines.push('');
    }

    const targetAudience =
      data.targetAudience || {};

    if (
      targetAudience.primary ||
      targetAudience.secondary ||
      targetAudience.idealCustomer
    ) {
      lines.push(
        'TARGET AUDIENCE'
      );

      if (targetAudience.primary) {
        lines.push(
          `Primary: ${targetAudience.primary}`
        );
      }

      if (targetAudience.secondary) {
        lines.push(
          `Secondary: ${targetAudience.secondary}`
        );
      }

      if (
        targetAudience.idealCustomer
      ) {
        lines.push(
          `Ideal customer: ${targetAudience.idealCustomer}`
        );
      }

      lines.push('');
    }

    if (
      Array.isArray(data.features) &&
      data.features.length
    ) {
      lines.push(
        'KEY FEATURES'
      );

      data.features.forEach(
        (feature) => {
          lines.push(
            `- ${feature.name}: ${feature.explanation}`
          );
        }
      );

      lines.push('');
    }

    if (data.usp) {
      lines.push(
        'UNIQUE SELLING PROPOSITION'
      );

      lines.push(
        data.usp
      );

      lines.push('');
    }

    if (
      Array.isArray(
        data.competitors
      ) &&
      data.competitors.length
    ) {
      lines.push(
        'COMPETITORS'
      );

      data.competitors.forEach(
        (competitor) => {
          lines.push(
            `- ${competitor.name}: ${competitor.whatTheyDo} ` +
            `(Strength: ${
              competitor.strength || '—'
            } / Weakness: ${
              competitor.weakness || '—'
            })`
          );
        }
      );

      if (data.differentiation) {
        lines.push(
          `Differentiation: ${data.differentiation}`
        );
      }

      lines.push('');
    }

    const businessModel =
      data.businessModel || {};

    if (
      businessModel.revenueModel ||
      (
        businessModel.pricingTiers &&
        businessModel.pricingTiers.length
      )
    ) {
      lines.push(
        'BUSINESS MODEL'
      );

      if (
        businessModel.revenueModel
      ) {
        lines.push(
          `Revenue model: ${businessModel.revenueModel}`
        );
      }

      (
        businessModel.pricingTiers ||
        []
      ).forEach(
        (tier) => {
          lines.push(
            `- ${tier.name}: ${tier.price} — ` +
            `${(
              tier.features || []
            ).join(', ')}`
          );
        }
      );

      lines.push('');
    }

    const marketOpportunity =
      data.marketOpportunity || {};

    if (
      marketOpportunity.marketPotential
    ) {
      lines.push(
        'MARKET OPPORTUNITY'
      );

      lines.push(
        `Market potential: ${marketOpportunity.marketPotential} | ` +
        `Demand: ${marketOpportunity.demand} | ` +
        `Competition: ${marketOpportunity.competition} | ` +
        `Difficulty: ${marketOpportunity.difficulty}`
      );

      if (
        marketOpportunity.reasoning
      ) {
        lines.push(
          marketOpportunity.reasoning
        );
      }

      lines.push('');
    }

    if (
      Array.isArray(
        data.goToMarket
      ) &&
      data.goToMarket.length
    ) {
      lines.push(
        'GO-TO-MARKET'
      );

      data.goToMarket.forEach(
        (step, index) => {
          lines.push(
            `${index + 1}. ${step.title} — ${step.description}`
          );
        }
      );

      lines.push('');
    }

    const mvp =
      data.mvp || {};

    if (
      mvp.mustHave ||
      mvp.niceToHave ||
      mvp.dontBuildYet
    ) {
      lines.push(
        'MVP SCOPE'
      );

      lines.push(
        `Must have: ${(mvp.mustHave || []).join(', ')}`
      );

      lines.push(
        `Nice to have: ${(mvp.niceToHave || []).join(', ')}`
      );

      lines.push(
        `Don't build yet: ${(mvp.dontBuildYet || []).join(', ')}`
      );

      lines.push('');
    }

    if (
      Array.isArray(
        data.roadmap
      ) &&
      data.roadmap.length
    ) {
      lines.push(
        'ROADMAP'
      );

      data.roadmap.forEach(
        (phase) => {
          lines.push(
            `${phase.phase}: ${phase.title} — ${phase.description}`
          );
        }
      );

      lines.push('');
    }

    const techStack =
      data.techStack || {};

    if (
      Object.keys(
        techStack
      ).length
    ) {
      lines.push(
        'TECH STACK'
      );

      Object.entries(
        techStack
      ).forEach(
        ([key, value]) => {
          const choice =
            typeof value === 'string'
              ? value
              : (
                value &&
                value.choice
              );

          if (choice) {
            lines.push(
              `${key}: ${choice}`
            );
          }
        }
      );

      lines.push('');
    }

    const score =
      data.score || {};

    if (
      score.overall !== undefined
    ) {
      lines.push(
        'STARTUP SCORE ' +
        '(AI-generated assessment, not an objective rating)'
      );

      lines.push(
        `Overall: ${score.overall}/100`
      );

      lines.push(
        `Market Potential: ${score.marketPotential}/100 | ` +
        `Problem Strength: ${score.problemStrength}/100 | ` +
        `Differentiation: ${score.differentiation}/100 | ` +
        `Feasibility: ${score.feasibility}/100`
      );

      lines.push('');
    }

    const verdict =
      data.verdict || {};

    if (verdict.decision) {
      lines.push(
        'FINAL VERDICT'
      );

      lines.push(
        `Decision: ${verdict.decision}`
      );

      if (verdict.reason) {
        lines.push(
          verdict.reason
        );
      }

      if (
        verdict.biggestOpportunity
      ) {
        lines.push(
          `Biggest opportunity: ${verdict.biggestOpportunity}`
        );
      }

      if (verdict.biggestRisk) {
        lines.push(
          `Biggest risk: ${verdict.biggestRisk}`
        );
      }
    }

    lines.push('');

    lines.push(
      'Generated by Build My Startup'
    );

    return lines.join('\n');
  }

  // =====================================================
  // BUTTONS
  // =====================================================

  if (retryBtn) {
    retryBtn.addEventListener(
      'click',
      () => {
        if (currentIdea) {
          runGeneration(
            currentIdea
          );
        }
      }
    );
  }

  if (btnAgain) {
    btnAgain.addEventListener(
      'click',
      () => {
        currentBlueprint = null;

        ideaInput.value = '';

        charCount.textContent = '0';

        ideaError.classList.remove(
          'show'
        );

        showOnly(null);

        resultsSection.classList.add(
          'hidden'
        );

        form.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        ideaInput.focus();
      }
    );
  }

  if (btnCopy) {
    btnCopy.addEventListener(
      'click',
      async () => {
        if (!currentBlueprint) {
          return;
        }

        const text =
          buildPlainText(
            currentBlueprint
          );

        try {
          await navigator.clipboard.writeText(
            text
          );

          showToast(
            'Blueprint copied to clipboard'
          );

        } catch (_) {
          showToast(
            'Could not copy — select and copy manually'
          );
        }
      }
    );
  }

  if (btnExport) {
    btnExport.addEventListener(
      'click',
      () => {
        if (!currentBlueprint) {
          return;
        }

        const text =
          buildPlainText(
            currentBlueprint
          );

        const startup =
          currentBlueprint.startup || {};

        const filename =
          (
            startup.name ||
            'startup-blueprint'
          )
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              '-'
            )
            .replace(
              /(^-|-$)/g,
              ''
            ) +
          '.txt';

        const blob =
          new Blob(
            [text],
            {
              type:
                'text/plain;charset=utf-8'
            }
          );

        const url =
          URL.createObjectURL(
            blob
          );

        const anchor =
          document.createElement(
            'a'
          );

        anchor.href = url;

        anchor.download =
          filename;

        document.body.appendChild(
          anchor
        );

        anchor.click();

        document.body.removeChild(
          anchor
        );

        URL.revokeObjectURL(
          url
        );

        showToast(
          'Blueprint downloaded'
        );
      }
    );
  }

  if (btnShare) {
    btnShare.addEventListener(
      'click',
      async () => {
        if (!currentBlueprint) {
          return;
        }

        const startup =
          currentBlueprint.startup || {};

        const shareData = {
          title:
            startup.name ||
            'My Startup Blueprint',

          text:
            `${startup.name || 'My startup'} — ` +
            `${startup.tagline || 'built with Build My Startup'}`,

          url:
            window.location.href
        };

        if (navigator.share) {
          try {
            await navigator.share(
              shareData
            );
          } catch (_) {
            // User cancelled.
          }

          return;
        }

        try {
          await navigator.clipboard.writeText(
            window.location.href
          );

          showToast(
            'Link copied to clipboard'
          );

        } catch (_) {
          showToast(
            'Sharing is not supported on this browser'
          );
        }
      }
    );
  }

})();