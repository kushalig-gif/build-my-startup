/* =====================================================
   BUILD MY STARTUP — V2 FRONTEND LOGIC
   Talks to POST /api/generate (serverless function).
   No API key ever lives in this file.
   ===================================================== */

(() => {
  'use strict';

  // ---------- DOM refs ----------
  const form         = document.getElementById('builder');
  const ideaInput     = document.getElementById('idea-input');
  const charCount     = document.getElementById('char-count');
  const ideaError     = document.getElementById('idea-error');
  const buildBtn      = document.getElementById('build-btn');
  const chips         = document.querySelectorAll('.chip[data-fill]');

  const loadingSection = document.getElementById('loading-section');
  const errorSection    = document.getElementById('error-section');
  const errorMsgEl      = document.getElementById('error-msg');
  const retryBtn        = document.getElementById('retry-btn');
  const resultsSection  = document.getElementById('results');
  const resultsContent  = document.getElementById('results-content');

  const stepItems = Array.from(document.querySelectorAll('.step-item'));

  const btnAgain  = document.getElementById('btn-again');
  const btnCopy   = document.getElementById('btn-copy');
  const btnExport = document.getElementById('btn-export');
  const btnShare  = document.getElementById('btn-share');

  const toastEl = document.getElementById('toast');

  let currentBlueprint = null;
  let currentIdea = '';
  let stepTimer = null;

  // ---------- helpers ----------
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function esc(str) { return escapeHtml(str); }

  function escList(arr) {
    return Array.isArray(arr) ? arr.map(esc) : [];
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function levelClass(level) {
    const l = String(level || '').toLowerCase();
    if (l.includes('high')) return 'high';
    if (l.includes('med')) return 'medium';
    return 'low';
  }

  function decisionClass(decision) {
    const d = String(decision || '').toLowerCase();
    if (d.includes('reconsider')) return 'reconsider';
    if (d.includes('validate')) return 'validate';
    return 'build';
  }

  function clamp01to100(n) {
    n = Number(n);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // ---------- char count + chips ----------
  ideaInput.addEventListener('input', () => {
    charCount.textContent = ideaInput.value.length;
    if (ideaInput.value.trim().length > 0) ideaError.classList.remove('show');
  });

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      ideaInput.value = chip.getAttribute('data-fill');
      charCount.textContent = ideaInput.value.length;
      ideaError.classList.remove('show');
      ideaInput.focus();
    });
  });

  // ---------- staged loading animation ----------
  function resetSteps() {
    stepItems.forEach((el) => el.classList.remove('active', 'done'));
  }

  function startStepAnimation() {
    resetSteps();
    let i = 0;
    stepItems[0] && stepItems[0].classList.add('active');
    stepTimer = setInterval(() => {
      if (i < stepItems.length) {
        stepItems[i].classList.remove('active');
        stepItems[i].classList.add('done');
      }
      i++;
      if (i < stepItems.length) {
        stepItems[i].classList.add('active');
      } else {
        clearInterval(stepTimer);
      }
    }, 900);
  }

  function finishStepAnimation() {
    clearInterval(stepTimer);
    stepItems.forEach((el) => {
      el.classList.remove('active');
      el.classList.add('done');
    });
  }

  // ---------- view state ----------
  function showOnly(section) {
    [loadingSection, errorSection, resultsSection].forEach((s) => s.classList.add('hidden'));
    if (section) section.classList.remove('hidden');
  }

  // ---------- submit flow ----------
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const idea = ideaInput.value.trim();

    if (idea.length < 8) {
      ideaError.classList.add('show');
      ideaInput.focus();
      return;
    }

    runGeneration(idea);
  });

  retryBtn.addEventListener('click', () => {
    if (currentIdea) runGeneration(currentIdea);
  });

  async function runGeneration(idea) {
    currentIdea = idea;
    buildBtn.disabled = true;
    showOnly(loadingSection);
    startStepAnimation();
    loadingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const apiBase = window.BUILD_MY_STARTUP_API_BASE || '';
      const res = await fetch(`${apiBase}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch (_) {
        payload = null;
      }

      if (!res.ok || !payload || payload.error) {
        const friendly = (payload && payload.error) || 'The AI couldn\u2019t complete your blueprint. This is usually temporary.';
        throw new Error(friendly);
      }

      validateBlueprint(payload);

      finishStepAnimation();
      currentBlueprint = payload;
      renderResults(payload);

      setTimeout(() => {
        showOnly(resultsSection);
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 350);
    } catch (err) {
      clearInterval(stepTimer);
      errorMsgEl.textContent = safeErrorMessage(err);
      showOnly(errorSection);
    } finally {
      buildBtn.disabled = false;
    }
  }

  function safeErrorMessage(err) {
    // Never surface stack traces or raw server errors to the user.
    const msg = err && err.message ? String(err.message) : '';
    if (!msg || msg.length > 200) {
      return 'The AI couldn\u2019t complete your blueprint. This is usually temporary — please try again.';
    }
    return msg;
  }

  function validateBlueprint(data) {
    if (!data || typeof data !== 'object') throw new Error('Received an unexpected response. Please try again.');
    if (!data.startup || !data.startup.name) throw new Error('The blueprint came back incomplete. Please try again.');
  }

  // ---------- rendering ----------
  function renderResults(data) {
    const s   = data.startup || {};
    const ta  = data.targetAudience || {};
    const bm  = data.businessModel || {};
    const mo  = data.marketOpportunity || {};
    const mvp = data.mvp || {};
    const ts  = data.techStack || {};
    const sc  = data.score || {};
    const vd  = data.verdict || {};

    const overall = clamp01to100(sc.overall);

    resultsContent.innerHTML = `
      ${renderIdentityAndScore(s, sc, overall)}
      ${renderProblemAudienceSolution(data.problem, ta, data.solution)}
      ${renderFeatures(data.features)}
      ${renderUSP(data.usp)}
      ${renderCompetitors(data.competitors, data.differentiation)}
      ${renderBusinessModel(bm)}
      ${renderMarketOpportunity(mo)}
      ${renderGoToMarket(data.goToMarket)}
      ${renderMVP(mvp)}
      ${renderRoadmap(data.roadmap)}
      ${renderTechStack(ts)}
      ${renderVerdict(vd)}
    `;

    // animate score bars after insertion
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.score-fill').forEach((el) => {
          el.style.width = el.getAttribute('data-target') + '%';
        });
      });
    });
  }

  function renderIdentityAndScore(s, sc, overall) {
    const rows = [
      ['Market Potential', sc.marketPotential],
      ['Problem Strength', sc.problemStrength],
      ['Differentiation', sc.differentiation],
      ['Feasibility', sc.feasibility],
    ];
    return `
    <div class="blueprint-card">
      <div class="blueprint-top">
        <div class="startup-id">
          <div class="startup-icon">🚀</div>
          <div>
            <div class="startup-name">${esc(s.name) || 'Untitled Startup'}</div>
            <div class="startup-tagline">${esc(s.tagline)}</div>
            ${s.category ? `<span class="category-badge">${esc(s.category)}</span>` : ''}
          </div>
        </div>
        <span class="ai-badge">◆ AI Generated</span>
      </div>

      ${s.description ? `<p class="startup-desc">${esc(s.description)}</p>` : ''}

      <div class="score-block">
        <div class="score-head">
          <span class="score-num">${overall}<span style="font-size:16px;color:var(--navy-faint);">/100</span></span>
          <span class="score-label">Startup Score</span>
        </div>
        <div class="score-disclaimer">An AI-generated assessment, not an objective investment score.</div>
        <div class="score-bars" style="margin-top:16px;">
          ${rows.map(([label, val]) => {
            const v = clamp01to100(val);
            return `
            <div class="score-row">
              <div class="score-row-top"><span>${esc(label)}</span><span>${v}/100</span></div>
              <div class="score-track"><div class="score-fill" data-target="${v}"></div></div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  function renderProblemAudienceSolution(problem, ta, solution) {
    return `
    <div class="blueprint-card">
      <div class="bp-grid">
        <div class="bp-block">
          <h4>The Problem</h4>
          <p>${esc(problem)}</p>
        </div>
        <div class="bp-block">
          <h4>Who Is This For?</h4>
          <ul>
            ${ta.primary ? `<li><strong>Primary:</strong> ${esc(ta.primary)}</li>` : ''}
            ${ta.secondary ? `<li><strong>Secondary:</strong> ${esc(ta.secondary)}</li>` : ''}
            ${ta.idealCustomer ? `<li><strong>Ideal customer:</strong> ${esc(ta.idealCustomer)}</li>` : ''}
          </ul>
        </div>
        <div class="bp-block" style="grid-column:1/-1;">
          <h4>The Solution</h4>
          <p>${esc(solution)}</p>
        </div>
      </div>
    </div>`;
  }

  function renderFeatures(features) {
    if (!Array.isArray(features) || !features.length) return '';
    const icons = ['🎯','📄','🔔','🧠','💬','📊','⚙️','🔍'];
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Key Features</span>
      <h2>What should you build?</h2>
    </div>
    <div class="feature-grid">
      ${features.map((f, i) => `
        <div class="feature-card">
          <div class="feature-icon">${icons[i % icons.length]}</div>
          <h3>${esc(f.name)}</h3>
          <p>${esc(f.explanation)}</p>
          ${f.whyItMatters ? `<div class="feature-why">Why it matters: ${esc(f.whyItMatters)}</div>` : ''}
        </div>`).join('')}
    </div>`;
  }

  function renderUSP(usp) {
    if (!usp) return '';
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Why This Wins</span>
      <h2>Why would people choose this?</h2>
    </div>
    <div class="advantage-box" style="margin-top:0;">
      <span class="eyebrow">Unique Selling Proposition</span>
      <p>${esc(usp)}</p>
    </div>`;
  }

  function renderCompetitors(competitors, differentiation) {
    if (!Array.isArray(competitors) || !competitors.length) return '';
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Competitive Landscape</span>
      <h2>Who are you competing with?</h2>
    </div>
    <div class="competitor-grid">
      ${competitors.map((c) => `
        <div class="competitor-card">
          <h4>${esc(c.name)}</h4>
          <p class="competitor-does">${esc(c.whatTheyDo)}</p>
          ${c.strength ? `<div class="competitor-row"><span class="tag strength">Strength</span>${esc(c.strength)}</div>` : ''}
          ${c.weakness ? `<div class="competitor-row"><span class="tag weakness">Weakness</span>${esc(c.weakness)}</div>` : ''}
        </div>`).join('')}
    </div>
    ${differentiation ? `
    <div class="advantage-box">
      <span class="eyebrow">Your Advantage</span>
      <p>${esc(differentiation)}</p>
    </div>` : ''}`;
  }

  function renderBusinessModel(bm) {
    const tiers = Array.isArray(bm.pricingTiers) ? bm.pricingTiers : [];
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Business Model</span>
      <h2>How does it make money?</h2>
    </div>
    ${tiers.length ? `
    <div class="pricing-grid">
      ${tiers.map((t, i) => {
        const featured = i === Math.min(1, tiers.length - 1);
        return `
        <div class="price-card ${featured ? 'featured' : ''}">
          ${featured ? '<span class="price-recommend">Recommended</span>' : ''}
          <span class="price-tier">${esc(t.name)}</span>
          <div class="price-amount">${esc(t.price)}</div>
          <ul class="price-list">
            ${escList(t.features).map((f) => `<li>${f}</li>`).join('')}
          </ul>
        </div>`;
      }).join('')}
    </div>` : ''}
    <div class="revenue-note">
      ${bm.revenueModel ? `<div><b>Revenue model:</b> ${esc(bm.revenueModel)}</div>` : ''}
      ${bm.primaryRevenueSource ? `<div style="margin-top:6px;"><b>Primary source:</b> ${esc(bm.primaryRevenueSource)}</div>` : ''}
      ${bm.secondaryRevenueSource ? `<div style="margin-top:6px;"><b>Secondary source:</b> ${esc(bm.secondaryRevenueSource)}</div>` : ''}
      ${bm.pricingNote ? `<div style="margin-top:6px;">${esc(bm.pricingNote)}</div>` : ''}
    </div>`;
  }

  function renderMarketOpportunity(mo) {
    const rows = [
      ['Market Potential', mo.marketPotential],
      ['Demand', mo.demand],
      ['Competition', mo.competition],
      ['Difficulty', mo.difficulty],
    ];
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Market Opportunity</span>
      <h2>Is there a real opportunity here?</h2>
    </div>
    <div class="metrics">
      ${rows.map(([label, val]) => `
        <div class="metric-card">
          <div class="metric-label">${esc(label)}</div>
          <div class="metric-value ${levelClass(val)}">${esc(val) || '—'}</div>
        </div>`).join('')}
    </div>
    ${mo.reasoning ? `<p class="market-reasoning">${esc(mo.reasoning)}</p>` : ''}`;
  }

  function renderGoToMarket(steps) {
    if (!Array.isArray(steps) || !steps.length) return '';
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Go-To-Market</span>
      <h2>How would you get your first 1,000 users?</h2>
    </div>
    <div class="timeline">
      ${steps.map((st, i) => `
        <div class="tl-step">
          <span class="tl-num">${String(i + 1).padStart(2, '0')}</span>
          <h4>${esc(st.title)}</h4>
          <p>${esc(st.description)}</p>
        </div>`).join('')}
    </div>`;
  }

  function renderMVP(mvp) {
    const must = Array.isArray(mvp.mustHave) ? mvp.mustHave : [];
    const nice = Array.isArray(mvp.niceToHave) ? mvp.niceToHave : [];
    const skip = Array.isArray(mvp.dontBuildYet) ? mvp.dontBuildYet : [];
    if (!must.length && !nice.length && !skip.length) return '';
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">MVP Scope</span>
      <h2>What should we build first?</h2>
    </div>
    <div class="mvp-grid">
      <div class="mvp-col must">
        <h4>✓ Must Have</h4>
        <ul>${escList(must).map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="mvp-col nice">
        <h4>+ Nice to Have</h4>
        <ul>${escList(nice).map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div class="mvp-col skip">
        <h4>✕ Don't Build Yet</h4>
        <ul>${escList(skip).map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
    </div>`;
  }

  function renderRoadmap(roadmap) {
    if (!Array.isArray(roadmap) || !roadmap.length) return '';
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">MVP Roadmap</span>
      <h2>From validation to launch</h2>
    </div>
    <div class="roadmap">
      ${roadmap.map((r) => `
        <div class="rm-phase">
          <div class="rm-phase-label">${esc(r.phase)}</div>
          <div>
            <h4>${esc(r.title)}</h4>
            <p>${esc(r.description)}</p>
          </div>
        </div>`).join('')}
    </div>`;
  }

  function renderTechStack(ts) {
    const entries = Object.entries(ts || {}).filter(([, v]) => v && (v.choice || typeof v === 'string'));
    if (!entries.length) return '';
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Suggested Tech Stack</span>
      <h2>What would you build it with?</h2>
    </div>
    <div class="stack-grid">
      ${entries.map(([key, v]) => {
        const choice = typeof v === 'string' ? v : v.choice;
        const why = typeof v === 'string' ? '' : v.why;
        return `
        <div class="stack-pill">
          <span class="k">${esc(key)}</span>
          <span class="v">${esc(choice)}</span>
          ${why ? `<div class="why">${esc(why)}</div>` : ''}
        </div>`;
      }).join('')}
    </div>`;
  }

  function renderVerdict(vd) {
    if (!vd || !vd.decision) return '';
    const cls = decisionClass(vd.decision);
    return `
    <div class="section-head" style="margin-top:56px;">
      <span class="eyebrow">Final AI Verdict</span>
      <h2>Should you build this?</h2>
    </div>
    <div class="verdict-card">
      <div class="verdict-inner">
        <span class="verdict-decision ${cls}">${esc(vd.decision)}</span>
        <p class="verdict-reason">${esc(vd.reason)}</p>
        <div class="verdict-split">
          ${vd.biggestOpportunity ? `
          <div class="verdict-box">
            <span class="eyebrow">Biggest Opportunity</span>
            <p>${esc(vd.biggestOpportunity)}</p>
          </div>` : ''}
          ${vd.biggestRisk ? `
          <div class="verdict-box">
            <span class="eyebrow">Biggest Risk</span>
            <p>${esc(vd.biggestRisk)}</p>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }

  // ---------- plain-text export (for copy + download) ----------
  function buildPlainText(data) {
    const lines = [];
    const s = data.startup || {};
    lines.push(`${s.name || 'Untitled Startup'}`);
    if (s.tagline) lines.push(s.tagline);
    if (s.category) lines.push(`Category: ${s.category}`);
    lines.push('');
    if (s.description) { lines.push(s.description); lines.push(''); }

    if (data.problem) { lines.push('PROBLEM'); lines.push(data.problem); lines.push(''); }
    if (data.solution) { lines.push('SOLUTION'); lines.push(data.solution); lines.push(''); }

    const ta = data.targetAudience || {};
    if (ta.primary || ta.secondary || ta.idealCustomer) {
      lines.push('TARGET AUDIENCE');
      if (ta.primary) lines.push(`Primary: ${ta.primary}`);
      if (ta.secondary) lines.push(`Secondary: ${ta.secondary}`);
      if (ta.idealCustomer) lines.push(`Ideal customer: ${ta.idealCustomer}`);
      lines.push('');
    }

    if (Array.isArray(data.features) && data.features.length) {
      lines.push('KEY FEATURES');
      data.features.forEach((f) => lines.push(`- ${f.name}: ${f.explanation}`));
      lines.push('');
    }

    if (data.usp) { lines.push('UNIQUE SELLING PROPOSITION'); lines.push(data.usp); lines.push(''); }

    if (Array.isArray(data.competitors) && data.competitors.length) {
      lines.push('COMPETITORS');
      data.competitors.forEach((c) => lines.push(`- ${c.name}: ${c.whatTheyDo} (Strength: ${c.strength || '—'} / Weakness: ${c.weakness || '—'})`));
      if (data.differentiation) lines.push(`Differentiation: ${data.differentiation}`);
      lines.push('');
    }

    const bm = data.businessModel || {};
    if (bm.revenueModel || (bm.pricingTiers && bm.pricingTiers.length)) {
      lines.push('BUSINESS MODEL');
      if (bm.revenueModel) lines.push(`Revenue model: ${bm.revenueModel}`);
      (bm.pricingTiers || []).forEach((t) => lines.push(`- ${t.name}: ${t.price} — ${(t.features || []).join(', ')}`));
      lines.push('');
    }

    const mo = data.marketOpportunity || {};
    if (mo.marketPotential) {
      lines.push('MARKET OPPORTUNITY');
      lines.push(`Market potential: ${mo.marketPotential} | Demand: ${mo.demand} | Competition: ${mo.competition} | Difficulty: ${mo.difficulty}`);
      if (mo.reasoning) lines.push(mo.reasoning);
      lines.push('');
    }

    if (Array.isArray(data.goToMarket) && data.goToMarket.length) {
      lines.push('GO-TO-MARKET');
      data.goToMarket.forEach((st, i) => lines.push(`${i + 1}. ${st.title} — ${st.description}`));
      lines.push('');
    }

    const mvp = data.mvp || {};
    if (mvp.mustHave || mvp.niceToHave || mvp.dontBuildYet) {
      lines.push('MVP SCOPE');
      lines.push(`Must have: ${(mvp.mustHave || []).join(', ')}`);
      lines.push(`Nice to have: ${(mvp.niceToHave || []).join(', ')}`);
      lines.push(`Don't build yet: ${(mvp.dontBuildYet || []).join(', ')}`);
      lines.push('');
    }

    if (Array.isArray(data.roadmap) && data.roadmap.length) {
      lines.push('ROADMAP');
      data.roadmap.forEach((r) => lines.push(`${r.phase}: ${r.title} — ${r.description}`));
      lines.push('');
    }

    const ts = data.techStack || {};
    if (Object.keys(ts).length) {
      lines.push('TECH STACK');
      Object.entries(ts).forEach(([k, v]) => {
        const choice = typeof v === 'string' ? v : (v && v.choice);
        if (choice) lines.push(`${k}: ${choice}`);
      });
      lines.push('');
    }

    const sc = data.score || {};
    if (sc.overall !== undefined) {
      lines.push('STARTUP SCORE (AI-generated assessment, not an objective rating)');
      lines.push(`Overall: ${sc.overall}/100`);
      lines.push(`Market Potential: ${sc.marketPotential}/100 | Problem Strength: ${sc.problemStrength}/100 | Differentiation: ${sc.differentiation}/100 | Feasibility: ${sc.feasibility}/100`);
      lines.push('');
    }

    const vd = data.verdict || {};
    if (vd.decision) {
      lines.push('FINAL VERDICT');
      lines.push(`Decision: ${vd.decision}`);
      if (vd.reason) lines.push(vd.reason);
      if (vd.biggestOpportunity) lines.push(`Biggest opportunity: ${vd.biggestOpportunity}`);
      if (vd.biggestRisk) lines.push(`Biggest risk: ${vd.biggestRisk}`);
    }

    lines.push('');
    lines.push('Generated by Build My Startup — buildmystartup app');
    return lines.join('\n');
  }

  // ---------- action buttons ----------
  btnAgain.addEventListener('click', () => {
    currentBlueprint = null;
    ideaInput.value = '';
    charCount.textContent = '0';
    showOnly(null);
    resultsSection.classList.add('hidden');
    document.getElementById('builder').scrollIntoView({ behavior: 'smooth', block: 'center' });
    ideaInput.focus();
  });

  btnCopy.addEventListener('click', async () => {
    if (!currentBlueprint) return;
    const text = buildPlainText(currentBlueprint);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Blueprint copied to clipboard');
    } catch (_) {
      showToast('Could not copy — select and copy manually');
    }
  });

  btnExport.addEventListener('click', () => {
    if (!currentBlueprint) return;
    const text = buildPlainText(currentBlueprint);
    const name = (currentBlueprint.startup && currentBlueprint.startup.name) || 'startup-blueprint';
    const filename = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.txt';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Blueprint downloaded');
  });

  btnShare.addEventListener('click', async () => {
    if (!currentBlueprint) return;
    const s = currentBlueprint.startup || {};
    const shareData = {
      title: s.name || 'My Startup Blueprint',
      text: `${s.name || 'My startup'} — ${s.tagline || 'built with Build My Startup'}`,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (_) { /* user cancelled — no-op */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    } catch (_) {
      showToast('Sharing is not supported on this browser');
    }
  });
})();
