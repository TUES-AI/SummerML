const CHALLENGES = window.SUMMERML_CHALLENGES;
const UI = window.SUMMERML_UI;
const state = {
  online: false,
  payload: null,
  student: localStorage.getItem("summerml-name") || "",
};

const levelsEl = document.getElementById("levels");
const nameEl = document.getElementById("student-name");
const statusEl = document.getElementById("backend-status");
const statusDot = document.getElementById("status-dot");
const progressSummary = document.getElementById("progress-summary");
nameEl.value = state.student;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
}

function passedIds() {
  const passed = state.payload?.progress?.passed || [];
  return new Set(passed);
}

function isUnlocked(level) {
  if (level === 1) return true;
  return Boolean(state.payload?.progress?.levels?.[String(level)]?.unlocked);
}

function challengeCard(challenge) {
  const ui = UI[challenge.id];
  const passed = passedIds().has(challenge.id);
  const unlocked = isUnlocked(challenge.level);
  const stateLabel = passed ? "Passed" : unlocked ? "Open" : "Locked";
  return `<a class="curriculum-card ${unlocked ? "" : "locked"}" style="--challenge:${ui.color}; --challenge-soft:${ui.soft}" href="${ui.path}">
    <span class="card-accent"></span>
    <span class="card-number">${challenge.number}</span>
    <div class="card-copy">
      <span class="card-modality">${escapeHtml(challenge.type)}</span>
      <h4>${escapeHtml(challenge.short)}</h4>
      <p>${escapeHtml(challenge.paper.title)}</p>
      <span class="card-paper">${challenge.paper.year} · ${escapeHtml(challenge.paper.authors)}</span>
    </div>
    <span class="challenge-state ${passed ? "passed" : unlocked ? "" : "locked"}">${stateLabel}</span>
    <span class="card-arrow" aria-hidden="true">↗</span>
  </a>`;
}

function render() {
  levelsEl.innerHTML = [1, 2, 3].map(level => {
    const rule = level === 1 ? "Pass any 2 of 3" : level === 2 ? "Pass either challenge" : "Final level";
    return `<section class="level">
      <div class="level-header"><h3>Level ${level}</h3><span class="level-rule">${rule}</span></div>
      <div class="curriculum-grid">${CHALLENGES.filter(c => c.level === level).map(challengeCard).join("")}</div>
    </section>`;
  }).join("");
  const passed = passedIds();
  progressSummary.textContent = state.student ? `${passed.size} / 7 passed · ${state.student}` : "Enter a name to load progress";
}

function setBackendStatus(kind, text) {
  statusDot.className = `status-dot ${kind}`;
  statusEl.textContent = text;
}

async function loadState() {
  setBackendStatus("", "Checking evaluator…");
  try {
    const broker = await fetch(`server-url/current.txt?t=${Date.now()}`, {cache: "no-store"});
    const serverUrl = (await broker.text()).trim().replace(/\/$/, "");
    if (!serverUrl) throw new Error("sleeping");
    const query = state.student ? `?name=${encodeURIComponent(state.student)}` : "";
    const response = await fetch(`${serverUrl}/api/state${query}`, {cache: "no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.payload = await response.json();
    state.online = true;
    setBackendStatus("online", "Evaluator online · leaderboards are live");
  } catch (error) {
    state.online = false;
    state.payload = null;
    setBackendStatus(error.message === "sleeping" ? "offline" : "error", "Evaluator sleeping · challenge pages remain available");
  }
  render();
}

document.getElementById("load-progress").addEventListener("click", () => {
  state.student = nameEl.value.trim();
  localStorage.setItem("summerml-name", state.student);
  loadState();
});
nameEl.addEventListener("keydown", event => {
  if (event.key === "Enter") document.getElementById("load-progress").click();
});

render();
loadState();
