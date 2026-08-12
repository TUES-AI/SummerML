const CHALLENGES = window.SUMMERML_CHALLENGES;
const UI = window.SUMMERML_UI;
const challengeId = document.body.dataset.challenge;
const root = document.body.dataset.root || "../../";
const challenge = CHALLENGES.find(item => item.id === challengeId);
const ui = UI[challengeId];
const student = localStorage.getItem("summerml-name") || "";
let payload = null;
let online = false;

if (!challenge) throw new Error(`Unknown challenge: ${challengeId}`);
document.documentElement.style.setProperty("--challenge", ui.color);
document.documentElement.style.setProperty("--challenge-soft", ui.soft);
document.title = `${challenge.short} — SummerML`;
document.querySelector('meta[name="description"]').content = `${challenge.short}: recreate ${challenge.paper.title}`;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function formatScore(value) {
  if (value === null || value === undefined) return "Pending";
  if (challenge.metric === "perplexity") return Number(value).toFixed(2);
  if (challenge.metric === "roc_auc") return Number(value).toFixed(4);
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function stableHue(name) {
  let hash = 0;
  for (const char of name) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

function scoreWidth(value, rows) {
  if (challenge.metric !== "perplexity") return Math.max(4, Math.min(100, Number(value) * 100));
  const values = rows.map(row => Number(row.value));
  const best = Math.min(...values), worst = Math.max(...values);
  return worst === best ? 100 : 35 + ((worst - Number(value)) / (worst - best)) * 65;
}

function referenceHtml() {
  const refs = payload?.challenges?.[challengeId]?.references || {};
  const definitions = [
    ["paper", "Paper reproduction", "Faithful historical recipe"],
    ["pass", "Pass reference", "Threshold to complete this challenge"],
    ["strong", "Strong reference", "Organizer-tuned target"],
  ];
  return definitions.map(([key, title, description]) => {
    const row = refs[key] || {};
    return `<div class="reference-card reference-${key}">
      <span class="reference-dot"></span><span class="reference-kicker">${escapeHtml(title)}</span>
      <strong>${formatScore(row.value)}</strong><small>${escapeHtml(description)}</small>
    </div>`;
  }).join("");
}

function runHtml(run, index) {
  return `<div class="run-row"><span>Run ${index + 1}</span><strong>${formatScore(run.value)}</strong></div>`;
}

function leaderboardHtml() {
  const rows = payload?.challenges?.[challengeId]?.leaderboard || [];
  if (!rows.length) return `<div class="empty-board">${online ? "No submissions yet. Be the first." : "Start the evaluator to see live scores."}</div>`;
  return `<div class="scoreboard">${rows.slice(0, 20).map((row, index) => {
    const rank = row.rank || index + 1;
    const hue = stableHue(row.name);
    const width = scoreWidth(row.value, rows);
    const rankClass = rank <= 3 ? ` rank-${rank}` : "";
    const runs = row.runs?.length ? `<details class="run-history"><summary>${row.run_count} runs</summary>${row.runs.map(runHtml).join("")}</details>` : `<span class="single-run">1 run</span>`;
    return `<article class="score-row${rankClass}">
      <div class="rank-badge">${rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}</div>
      <div class="student-avatar" style="--hue:${hue}">${escapeHtml(row.name.slice(0, 1).toUpperCase())}</div>
      <div class="student-score">
        <div class="student-line"><strong>${escapeHtml(row.name)}</strong><span>${formatScore(row.value)}</span></div>
        <div class="score-track"><span style="width:${width.toFixed(2)}%; --hue:${hue}"></span></div>
      </div>
      <div class="runs-cell">${runs}</div>
    </article>`;
  }).join("")}</div>`;
}

function navigationHtml() {
  const index = CHALLENGES.findIndex(item => item.id === challengeId);
  const links = [];
  if (index > 0) links.push(`<a href="${root}${UI[CHALLENGES[index - 1].id].path}">← ${escapeHtml(CHALLENGES[index - 1].short)}</a>`);
  if (index < CHALLENGES.length - 1) links.push(`<a href="${root}${UI[CHALLENGES[index + 1].id].path}">${escapeHtml(CHALLENGES[index + 1].short)} →</a>`);
  return links.join("");
}

function render() {
  const progress = payload?.progress || {};
  const passed = (progress.passed || []).includes(challengeId);
  const unlocked = challenge.level === 1 || Boolean(progress.levels?.[String(challenge.level)]?.unlocked);
  document.getElementById("challenge-main").innerHTML = `
    <section class="challenge-hero">
      <div class="challenge-hero-top"><span class="challenge-index">${challenge.number}</span><span class="modality-pill">${escapeHtml(challenge.type)}</span><span class="challenge-state ${passed ? "passed" : unlocked ? "" : "locked"}">${passed ? "Passed" : unlocked ? "Open" : "Locked"}</span></div>
      <p class="eyebrow">Level ${challenge.level} · Recreate the paper</p>
      <h1>${escapeHtml(challenge.short)}</h1>
      <p class="challenge-intro">${escapeHtml(challenge.task)}</p>
    </section>

    <section class="paper-spotlight colorful-paper">
      <div><span class="paper-label">The paper · ${challenge.paper.year}</span><h2 class="paper-title">${escapeHtml(challenge.paper.title)}</h2><p class="paper-authors">${escapeHtml(challenge.paper.authors)}</p></div>
      <a class="paper-button" href="${challenge.paper.url}" target="_blank" rel="noreferrer">Open paper ↗</a>
    </section>

    <section class="rules-layout">
      <div class="rule-panel allowed-panel"><h2>Build with</h2><ul>${challenge.allowed.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
      <div class="rule-panel forbidden-panel"><h2>Not accepted</h2><ul>${challenge.forbidden.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    </section>

    <section class="code-grid">
      <article class="code-section"><div class="code-heading"><span>01</span><h2>Import the paper dataset</h2></div><div class="code-frame"><button class="copy-button" type="button">Copy</button><pre><code class="language-python">${escapeHtml(challenge.dataset)}</code></pre></div></article>
      <article class="code-section"><div class="code-heading"><span>02</span><h2>Submit your model</h2></div><div class="code-frame"><button class="copy-button" type="button">Copy</button><pre><code class="language-python">${escapeHtml(challenge.submit)}</code></pre></div></article>
    </section>

    <section class="references"><div class="section-title"><div><p class="eyebrow">Targets</p><h2>Three reference points</h2></div><p>Every reference is evaluated on the same hidden protocol as student submissions.</p></div><div class="reference-cards">${referenceHtml()}</div></section>

    <section class="leaderboard"><div class="section-title"><div><p class="eyebrow">Live standings</p><h2>${escapeHtml(challenge.short)} leaderboard</h2></div><span class="metric-pill">${challenge.metric === "perplexity" ? "Lower is better" : "Higher is better"}</span></div>${leaderboardHtml()}</section>

    <nav class="challenge-navigation" aria-label="Challenge navigation">${navigationHtml()}</nav>`;

  document.querySelectorAll(".copy-button").forEach(button => button.addEventListener("click", async () => {
    await navigator.clipboard.writeText(button.nextElementSibling.textContent);
    button.textContent = "Copied!";
    setTimeout(() => { button.textContent = "Copy"; }, 1200);
  }));
  if (window.Prism) document.querySelectorAll("code.language-python").forEach(code => Prism.highlightElement(code));
}

function setStatus(kind, text) {
  document.getElementById("status-dot").className = `status-dot ${kind}`;
  document.getElementById("backend-status").textContent = text;
}

async function loadState() {
  try {
    const broker = await fetch(`${root}server-url/current.txt?t=${Date.now()}`, {cache: "no-store"});
    const serverUrl = (await broker.text()).trim().replace(/\/$/, "");
    if (!serverUrl) throw new Error("sleeping");
    const query = student ? `?name=${encodeURIComponent(student)}` : "";
    const response = await fetch(`${serverUrl}/api/state${query}`, {cache: "no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    payload = await response.json();
    online = true;
    setStatus("online", `Evaluator online${student ? ` · progress for ${student}` : ""}`);
  } catch (error) {
    payload = null;
    online = false;
    setStatus(error.message === "sleeping" ? "offline" : "error", "Evaluator sleeping · instructions remain available");
  }
  render();
}

render();
loadState();
