"use strict";

const svg         = document.getElementById("screen");
const dragonLayer = document.getElementById("dragon-layer");
const humanLayer  = document.getElementById("human-layer");
const NS          = "http://www.w3.org/2000/svg";
const XLINK       = "http://www.w3.org/1999/xlink";

function el(tag, attrs) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function add(parent, child) {
  parent.appendChild(child);
  return child;
}

// ── Viewport ───────────────────────────────────────────────────────────────
let W = window.innerWidth;
let H = window.innerHeight;
svg.setAttribute("viewBox", `0 0 ${W} ${H}`);

// ── Pointer ────────────────────────────────────────────────────────────────
const pointer = { x: W / 2, y: H / 2 };

window.addEventListener("pointermove", e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});

window.addEventListener("touchmove", e => {
  if (e.target.tagName === "BUTTON") return;
  e.preventDefault();
  const t = e.touches[0];
  pointer.x = t.clientX;
  pointer.y = t.clientY;
}, { passive: false });

window.addEventListener("touchstart", e => {
  if (e.target.tagName === "BUTTON") return;
  e.preventDefault();
  const t = e.touches[0];
  pointer.x = t.clientX;
  pointer.y = t.clientY;
}, { passive: false });

// ── Dragon ─────────────────────────────────────────────────────────────────
let N = 22;
const elems = [];

function rebuildDragon() {
  const desired = Math.min(W, H) * 0.78;
  N = Math.max(16, Math.min(26, Math.round(desired / 34)));

  while (dragonLayer.firstChild) {
    dragonLayer.removeChild(dragonLayer.firstChild);
  }
  elems.length = 0;

  for (let i = 0; i < N; i++) {
    elems.push({ use: null, x: pointer.x, y: pointer.y });
  }

  // i = 1 → Head
  // last 3 segments → Tail tip
  // everything else → Spine
  for (let i = 1; i < N; i++) {
    const use = document.createElementNS(NS, "use");
    elems[i].use = use;

    if (i === 1) {
      use.setAttributeNS(XLINK, "xlink:href", "#Cabeza");
    } else if (i >= N - 3) {
      use.setAttributeNS(XLINK, "xlink:href", "#Cola");   // tail
    } else {
      use.setAttributeNS(XLINK, "xlink:href", "#Espina"); // spine
    }

    dragonLayer.prepend(use);
  }
}

rebuildDragon();

// Resize
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    W = window.innerWidth;
    H = window.innerHeight;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    rebuildDragon();
    if (gameState !== "playing" && gHuman) {
      gHuman.setAttribute("opacity", "0");
    }
  }, 120);
});

// ── Game State ─────────────────────────────────────────────────────────────
let gameState = "welcome";
let score = 0;

const scoreEl   = document.getElementById("score-display");
const timerEl   = document.getElementById("timer-display");
const goOverlay = document.getElementById("gameover-overlay");
const goScore   = document.getElementById("gameover-score");
const wlOverlay = document.getElementById("welcome-overlay");

function pad3(n) {
  return String(n).padStart(3, "0");
}

function updateScoreDisplay() {
  scoreEl.textContent = "Score — " + pad3(score);
}

const GAME_DURATION = 60;
let timeLeft = GAME_DURATION;
let timerInterval = null;

function updateTimerDisplay() {
  timerEl.textContent = "Time — " + timeLeft;
  timerEl.classList.toggle("urgent", timeLeft <= 10);
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = GAME_DURATION;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    if (gameState !== "playing") return;
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 1000);
}

function startGame() {
  score = 0;
  gameState = "playing";
  updateScoreDisplay();
  wlOverlay.classList.add("hidden");
  goOverlay.classList.add("hidden");
  spawnHuman();
  scheduleAutoMove();
  startTimer();
}

function endGame() {
  gameState = "gameover";
  clearTimeout(autoMoveTimer);
  if (gHuman) gHuman.setAttribute("opacity", "0");
  particles.forEach(p => p.el.setAttribute("opacity", "0"));
  goScore.textContent = pad3(score);
  goOverlay.classList.remove("hidden");
}

document.getElementById("btn-start").addEventListener("click", startGame);
document.getElementById("btn-restart").addEventListener("click", () => {
  goOverlay.classList.add("hidden");
  setTimeout(startGame, 420);
});

// ── Human ──────────────────────────────────────────────────────────────────
const MARGIN   = 60;
const TARGET_R = 18;
const HEAD_R   = 26;

let gHuman;
const particles = [];
const PARTICLE_COUNT = 6;
let isDying = false;
let deathStartTime = 0;
const DEATH_DURATION = 500;
const target = { x: 0, y: 0 };

function rebuildHuman() {
  while (humanLayer.firstChild) {
    humanLayer.removeChild(humanLayer.firstChild);
  }

  gHuman = add(humanLayer, el("g", { opacity: "0" }));

  add(gHuman, el("circle", {
    cx: "0", cy: "-22", r: "7",
    fill: "#ff2a2a", stroke: "#ff6666", "stroke-width": "1.5"
  }));
  add(gHuman, el("line", {
    x1: "0", y1: "-15", x2: "0", y2: "5",
    stroke: "#ff2a2a", "stroke-width": "3", "stroke-linecap": "round"
  }));
  add(gHuman, el("line", {
    x1: "-12", y1: "-8", x2: "12", y2: "-8",
    stroke: "#ff2a2a", "stroke-width": "3", "stroke-linecap": "round"
  }));
  add(gHuman, el("line", {
    x1: "0", y1: "5", x2: "-9", y2: "20",
    stroke: "#ff2a2a", "stroke-width": "3", "stroke-linecap": "round"
  }));
  add(gHuman, el("line", {
    x1: "0", y1: "5", x2: "9", y2: "20",
    stroke: "#ff2a2a", "stroke-width": "3", "stroke-linecap": "round"
  }));

  particles.length = 0;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pc = add(humanLayer, el("circle", {
      r: "4", fill: "#ff4444", opacity: "0"
    }));
    particles.push({ el: pc, vx: 0, vy: 0, x: 0, y: 0, life: 0 });
  }
}
rebuildHuman();

function placeHuman(x, y) {
  target.x = x;
  target.y = y;
  gHuman.setAttribute("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  gHuman.setAttribute("opacity", "1");
}

function randomPos() {
  return {
    x: MARGIN + Math.random() * (W - MARGIN * 2),
    y: MARGIN + Math.random() * (H - MARGIN * 2)
  };
}

function spawnHuman() {
  isDying = false;
  const pos = randomPos();
  placeHuman(pos.x, pos.y);
  particles.forEach(p => {
    p.el.setAttribute("opacity", "0");
    p.life = 0;
  });
}

let autoMoveTimer = null;
function scheduleAutoMove() {
  clearTimeout(autoMoveTimer);
  autoMoveTimer = setTimeout(() => {
    if (gameState === "playing" && !isDying) {
      const pos = randomPos();
      placeHuman(pos.x, pos.y);
    }
    if (gameState === "playing") scheduleAutoMove();
  }, 1000);
}

function triggerDeath(dx, dy) {
  isDying = true;
  deathStartTime = performance.now();
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
    const speed = 3 + Math.random() * 3;
    particles[i].x = dx;
    particles[i].y = dy;
    particles[i].vx = Math.cos(angle) * speed;
    particles[i].vy = Math.sin(angle) * speed;
    particles[i].life = 1;
    particles[i].el.setAttribute("cx", dx.toFixed(1));
    particles[i].el.setAttribute("cy", dy.toFixed(1));
    particles[i].el.setAttribute("opacity", "1");
  }
}

function updateDeath(now) {
  const t = Math.min((now - deathStartTime) / DEATH_DURATION, 1);
  const angle = t * 180;
  const fallY = t * 30;

  gHuman.setAttribute("opacity", (1 - t).toFixed(3));
  gHuman.setAttribute("transform",
    `translate(${target.x.toFixed(1)},${(target.y + fallY).toFixed(1)}) rotate(${angle.toFixed(1)})`
  );

  particles.forEach(p => {
    if (p.life <= 0) return;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life = 1 - t;
    p.el.setAttribute("cx", p.x.toFixed(1));
    p.el.setAttribute("cy", p.y.toFixed(1));
    p.el.setAttribute("opacity", p.life.toFixed(3));
    p.el.setAttribute("r", Math.max(0, 4 * p.life).toFixed(2));
  });

  if (t >= 1) {
    spawnHuman();
    scheduleAutoMove();
  }
}

function checkCollision() {
  if (gameState !== "playing" || isDying) return;

  const hx = elems[1] ? elems[1].x : elems[0].x;
  const hy = elems[1] ? elems[1].y : elems[0].y;
  const dx = hx - target.x;
  const dy = hy - target.y;

  if (Math.sqrt(dx * dx + dy * dy) < HEAD_R + TARGET_R) {
    score += 1;
    updateScoreDisplay();
    clearTimeout(autoMoveTimer);
    triggerDeath(target.x, target.y);
  }
}

// ── Animation loop ─────────────────────────────────────────────────────────
function tick(now) {
  requestAnimationFrame(tick);

  // Head follows pointer
  let e = elems[0];
  e.x += (pointer.x - e.x) / 5;
  e.y += (pointer.y - e.y) / 5;

  // Body + tail
  for (let i = 1; i < N; i++) {
    e = elems[i];
    const ep = elems[i - 1];
    const a = Math.atan2(e.y - ep.y, e.x - ep.x);

    // spacing
    e.x += (ep.x - e.x + (Math.cos(a) * (90 - i)) / 6) / 3;
    e.y += (ep.y - e.y + (Math.sin(a) * (90 - i)) / 6) / 3;

    // Scale: starts smaller and tapers more toward the tail
    let s = (150 + 3 * (1 - i)) / 95;

    // Extra shrink on the last few tail segments
    if (i >= N - 4) {
      const tailT = (i - (N - 4)) / 3;
      s *= (1 - tailT * 0.55);
    }

    if (e.use) {
      e.use.setAttributeNS(null, "transform",
        `translate(${(ep.x + e.x) / 2},${(ep.y + e.y) / 2}) ` +
        `rotate(${(180 / Math.PI) * a}) ` +
        `scale(${s},${s})`
      );
    }
  }

  if (isDying) updateDeath(now);
  checkCollision();
}

tick();