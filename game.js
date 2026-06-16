(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const hud = document.getElementById("hud");
  const startScreen = document.getElementById("startScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const livesEl = document.getElementById("lives");
  const summaryEl = document.getElementById("summary");

  const assets = {
    bg: loadImage("assets/stadium_bg.png"),
    gloves: loadImage("assets/gloves_dark_red.png"),
    ball: loadImage("assets/ball.png"),
    foxReady: loadImage("assets/fox_ready.png"),
    foxPrep: loadImage("assets/fox_prep.png"),
    foxKick: loadImage("assets/fox_kick.png"),
    foxCelebrate1: loadImage("assets/fox_celebrate_1.png"),
    foxCelebrate2: loadImage("assets/fox_celebrate_2.png"),
    foxCelebrate3: loadImage("assets/fox_celebrate_3.png")
  };

  const celebrateSprites = [
    () => assets.foxCelebrate1,
    () => assets.foxCelebrate2,
    () => assets.foxCelebrate3
  ];

  const goal = {
    left: 31,
    right: 389,
    top: 162,
    bottom: 655
  };

  const keeperArea = {
    left: 74,
    right: 346,
    top: 228,
    bottom: 625
  };

  const state = {
    mode: "menu",
    round: "idle",
    score: 0,
    lives: 3,
    best: Number(localStorage.getItem("foxito_keeper_best_assets_v3") || 0),
    nextShotMs: 420,
    roundTimerMs: 0,
    ball: null,
    gloves: {
      x: W / 2,
      y: 585,
      targetX: W / 2,
      targetY: 585,
      w: 128,
      h: 84
    },
    particles: [],
    feedback: null,
    shake: 0,
    time: 0,
    lastPointerType: "mouse",
    countdownValue: null,
    audio: {
      ctx: null,
      enabled: false
    },
    celebrateOrder: [0, 1, 2],
    celebratePointer: 0,
    currentCelebrate: 0,
    countdownMode: null
  };

  bestEl.textContent = state.best;

  document.getElementById("startBtn").addEventListener("click", startGame);
  document.getElementById("restartBtn").addEventListener("click", startGame);

  canvas.addEventListener("pointerdown", updatePointer);
  canvas.addEventListener("pointermove", updatePointer);
  canvas.addEventListener("pointercancel", stopTouch);
  canvas.addEventListener("pointerup", stopTouch);

  window.addEventListener("keydown", (event) => {
    if (event.code === "Space" && state.mode !== "playing") {
      event.preventDefault();
      startGame();
    }
  });

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  function initAudio() {
    if (state.audio.enabled) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    state.audio.ctx = state.audio.ctx || new AudioContext();
    if (state.audio.ctx.state === "suspended") {
      state.audio.ctx.resume();
    }

    state.audio.enabled = true;
  }

  function playTone(freq, duration = 0.12, type = "sine", gain = 0.06, delay = 0) {
    const audioCtx = state.audio.ctx;
    if (!audioCtx || !state.audio.enabled) return;

    const start = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const amp = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(amp);
    amp.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  function playKickSound() {
    playTone(110, 0.08, "triangle", 0.08);
    playTone(58, 0.12, "sine", 0.04, 0.03);
  }

  function playSaveSound() {
    playTone(240, 0.08, "square", 0.045);
    playTone(520, 0.13, "triangle", 0.07, 0.04);
    playTone(760, 0.09, "sine", 0.045, 0.12);
  }

  function playGoalSound() {
    playTone(120, 0.16, "sawtooth", 0.055);
    playTone(86, 0.24, "triangle", 0.06, 0.08);
    playTone(55, 0.28, "sine", 0.05, 0.18);
  }

  function playCountdownSound(value) {
    if (value === 1) {
      playTone(720, 0.11, "square", 0.05);
      playTone(960, 0.12, "triangle", 0.05, 0.11);
      return;
    }
    playTone(620, 0.11, "square", 0.045);
  }

  function startGame() {
    initAudio();
    state.mode = "playing";
    state.round = "countdown";
    state.score = 0;
    state.lives = 3;
    state.nextShotMs = 160;
    state.roundTimerMs = 0;
    state.ball = null;
    state.particles = [];
    state.feedback = null;
    state.countdownValue = 3;
    state.countdownMode = "start";
    state.shake = 0;
    state.gloves.x = state.gloves.targetX = W / 2;
    state.gloves.y = state.gloves.targetY = 600;
    state.celebrateOrder = shuffle([0, 1, 2]);
    state.celebratePointer = 0;
    state.currentCelebrate = state.celebrateOrder[0];

    playCountdownSound(3);
    updateHud();
    hud.classList.remove("hidden");
    startScreen.classList.remove("visible");
    gameOverScreen.classList.remove("visible");
  }

  function endGame() {
    state.mode = "gameover";
    state.best = Math.max(state.best, state.score);
    localStorage.setItem("foxito_keeper_best_assets_v3", String(state.best));
    bestEl.textContent = state.best;
    summaryEl.innerHTML = `Tapadas <strong style="color:#ffd34d">${state.score}</strong><br>Mejor marca <strong style="color:#ffd34d">${state.best}</strong>`;
    gameOverScreen.classList.add("visible");
  }

  function updateHud() {
    scoreEl.textContent = state.score;
    bestEl.textContent = state.best;
    livesEl.textContent = state.lives;
  }

  function updatePointer(event) {
    if (state.mode !== "playing") return;
    event.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (W / rect.width);
    const y = (event.clientY - rect.top) * (H / rect.height);

    state.lastPointerType = event.pointerType || "mouse";

    const yOffset = state.lastPointerType === "touch" ? 76 : 0;
    state.gloves.targetX = clamp(x, keeperArea.left, keeperArea.right);
    state.gloves.targetY = clamp(y - yOffset, keeperArea.top, keeperArea.bottom);
  }

  function stopTouch(event) {
    if (event.pointerType === "touch") {
      event.preventDefault();
    }
  }

  function scheduleWindup() {
    state.round = "windup";
    state.roundTimerMs = 0;
  }

  function launchBall() {
    playKickSound();
    const score = state.score;
    const target = pickTarget(score);

    state.round = "flight";
    state.roundTimerMs = 0;
    state.ball = {
      x: 210,
      y: 382,
      startX: 210,
      startY: 382,
      targetX: target.x,
      targetY: target.y,
      curve: (Math.random() - 0.5) * Math.min(30, 8 + score * 0.85),
      durationMs: Math.max(300, (1210 - score * 22) / 2.1),
      size: 26,
      spin: 0,
      trail: [],
      resolved: false
    };
  }

  function pickTarget(score) {
    // These are the "arrow zones" across the goal.
    // Top corners, top center, side posts, middle and low corners.
    const zones = [
      { x: 74, y: 270, weight: 1.05 },
      { x: 210, y: 246, weight: 0.55 },
      { x: 346, y: 270, weight: 1.05 },
      { x: 68, y: 410, weight: 1.2 },
      { x: 352, y: 410, weight: 1.2 },
      { x: 118, y: 548, weight: 1.1 },
      { x: 302, y: 548, weight: 1.1 },
      { x: 210, y: 500, weight: 0.22 },
      { x: 96, y: 628, weight: 0.7 },
      { x: 324, y: 628, weight: 0.7 }
    ];

    const base = weightedPick(zones);
    const jitter = score >= 8 ? 34 : 24;

    return {
      x: clamp(base.x + (Math.random() - 0.5) * jitter, goal.left + 26, goal.right - 26),
      y: clamp(base.y + (Math.random() - 0.5) * jitter, 236, goal.bottom - 18)
    };
  }

  function pickDecoyTarget(finalTarget, score) {
    const horizontalFlip = finalTarget.x < W / 2 ? 322 : 98;
    const verticalShift = finalTarget.y < 420 ? 560 : 315;
    const mild = score < 5;

    if (mild) {
      return {
        x: clamp(210 + (Math.random() - 0.5) * 160, goal.left + 34, goal.right - 34),
        y: clamp(440 + (Math.random() - 0.5) * 170, 250, goal.bottom - 32)
      };
    }

    return {
      x: clamp(horizontalFlip + (Math.random() - 0.5) * 86, goal.left + 28, goal.right - 28),
      y: clamp(verticalShift + (Math.random() - 0.5) * 130, 240, goal.bottom - 24)
    };
  }

  function weightedPick(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;

    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }

    return items[items.length - 1];
  }

  function update(dt) {
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 42);

    updateFeedback(dt);
    updateParticles(dt);
    updateGloves(dt);

    if (state.mode !== "playing") return;

    state.roundTimerMs += dt * 1000;

    if (state.round === "idle") {
      state.nextShotMs -= dt * 1000;
      if (state.nextShotMs <= 0) scheduleWindup();
    }

    if (state.round === "windup" && state.roundTimerMs >= 220) {
      launchBall();
    }

    if (state.round === "goalCelebrate" && state.roundTimerMs >= 950) {
      state.round = "countdown";
      state.roundTimerMs = 0;
      state.countdownValue = 3;
      state.countdownMode = "resume";
      playCountdownSound(3);
    }

    if (state.round === "goalCelebrateFinal" && state.roundTimerMs >= 950) {
      endGame();
      return;
    }

    if (state.round === "countdown") {
      const nextValue = 3 - Math.floor(state.roundTimerMs / 1247);
      const visibleValue = Math.max(1, nextValue);

      if (visibleValue !== state.countdownValue) {
        state.countdownValue = visibleValue;
        playCountdownSound(visibleValue);
      }

      if (state.roundTimerMs >= 3741) {
        state.countdownValue = null;
        state.countdownMode = null;
        state.round = "idle";
        state.nextShotMs = 160;
      }
    }

    if (state.round === "flight") {
      updateBall(dt);
    }
  }

  function updateGloves(dt) {
    const speed = state.lastPointerType === "touch" ? 0.38 : 0.32;
    state.gloves.x = lerp(state.gloves.x, state.gloves.targetX, speed);
    state.gloves.y = lerp(state.gloves.y, state.gloves.targetY, speed);
  }

  function updateBall(dt) {
    const b = state.ball;
    if (!b) return;

    const t = clamp(state.roundTimerMs / b.durationMs, 0, 1);
    if (b.hasBreak) {
      if (t < b.breakAt) {
        const p1 = easeOutCubic(t / b.breakAt);
        b.x = lerp(b.startX, b.decoyX, p1);
        b.y = lerp(b.startY, b.decoyY, p1);
      } else {
        const p2 = easeOutCubic((t - b.breakAt) / (1 - b.breakAt));
        b.x = lerp(b.decoyX, b.targetX, p2) + Math.sin(p2 * Math.PI) * b.curve;
        b.y = lerp(b.decoyY, b.targetY, p2);
      }
    } else {
      const p = easeOutCubic(t);
      const late = easeInOutCubic(clamp((t - 0.22) / 0.78, 0, 1));
      const aimX = lerp(210, b.targetX, late);
      const aimY = lerp(382, b.targetY, late);
      b.x = lerp(b.startX, aimX, p) + Math.sin(p * Math.PI) * b.curve;
      b.y = lerp(b.startY, aimY, p);
    }

    b.size = lerp(24, 82, easeInCubic(t));
    b.spin += dt * (7 + state.score * 0.22);

    b.trail.push({ x: b.x, y: b.y, size: b.size, alpha: 0.14 });
    if (b.trail.length > 5) b.trail.shift();

    const ballRadius = b.size * 0.28;
    const inScoringWindow = t > 0.90 && b.size > 64;

    if (inScoringWindow && !b.resolved && hitsGloves(b.x, b.y, ballRadius)) {
      saveBall();
      return;
    }

    if (t >= 1 && !b.resolved) {
      goalScored();
    }
  }

  function hitsGloves(ballX, ballY, ballRadius) {
    const g = state.gloves;

    const leftPalm = { x: g.x - 24, y: g.y - 4 };
    const rightPalm = { x: g.x + 24, y: g.y - 4 };
    const palmRadius = 22;

    const d1 = Math.hypot(ballX - leftPalm.x, ballY - leftPalm.y);
    const d2 = Math.hypot(ballX - rightPalm.x, ballY - rightPalm.y);

    const centerBox =
      ballX > g.x - 34 - ballRadius &&
      ballX < g.x + 34 + ballRadius &&
      ballY > g.y - 26 - ballRadius &&
      ballY < g.y + 16 + ballRadius;

    return d1 < palmRadius + ballRadius || d2 < palmRadius + ballRadius || centerBox;
  }

  function saveBall() {
    const b = state.ball;
    b.resolved = true;
    playSaveSound();
    state.score += 1;
    state.best = Math.max(state.best, state.score);
    showFeedback("¡TAPADA!", "#34d399");
    burst(b.x, b.y, "#34d399", 26);
    state.shake = 7;
    state.ball = null;
    state.round = "idle";
    state.nextShotMs = Math.max(120, 360 - state.score * 8) + 300;
    updateHud();
  }

  function goalScored() {
    const b = state.ball;
    playGoalSound();
    showFeedback("¡Gol de Foxito!", "#fb7185");
    burst(b.x, b.y, "#fb7185", 24);
    state.shake = 18;
    state.lives -= 1;
    state.ball = null;
    state.roundTimerMs = 0;
    state.countdownValue = null;

    state.currentCelebrate = state.celebrateOrder[state.celebratePointer % state.celebrateOrder.length];
    state.celebratePointer += 1;
    updateHud();

    if (state.lives <= 0) {
      state.round = "goalCelebrateFinal";
      return;
    }

    state.round = "goalCelebrate";
  }

  function draw() {
    ctx.save();

    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }

    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawFox();
    drawBall();
    drawGloves();
    drawParticles();
    drawGuide();
    drawCountdown();
    drawFeedback();

    ctx.restore();
  }

  function drawBackground() {
    if (assets.bg.complete) {
      ctx.drawImage(assets.bg, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#0f7d36";
      ctx.fillRect(0, 0, W, H);
    }

    // Darkens the foreground just a bit so the red gloves read better.
    const fade = ctx.createLinearGradient(0, 470, 0, H);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,.22)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 470, W, H - 470);
  }

  function drawFox() {
    let img = assets.foxReady;
    let config = { width: 104, centerX: 210, bottomY: 398 };

    if (state.round === "windup") {
      img = assets.foxPrep;
      config = { width: 118, centerX: 206, bottomY: 404 };
    }

    if (state.round === "flight") {
      img = assets.foxKick;
      config = { width: 132, centerX: 206, bottomY: 404 };
    }

    if (state.round === "goalCelebrate" || state.round === "goalCelebrateFinal" || (state.round === "countdown" && state.countdownMode === "resume")) {
      const celebrateIndex = state.currentCelebrate ?? 0;
      const celebrateConfigs = [
        { width: 112, centerX: 210, bottomY: 404 },
        { width: 118, centerX: 210, bottomY: 404 },
        { width: 116, centerX: 210, bottomY: 404 }
      ];
      img = celebrateSprites[celebrateIndex] ? celebrateSprites[celebrateIndex]() : assets.foxCelebrate1;
      config = celebrateConfigs[celebrateIndex] || celebrateConfigs[0];
    }

    if (!img.complete) return;

    const height = config.width * (img.naturalHeight / img.naturalWidth);
    ctx.drawImage(img, config.centerX - config.width / 2, config.bottomY - height, config.width, height);
  }

  function drawBall() {
    const b = state.ball;
    if (!b || !assets.ball.complete) return;

    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const a = (i + 1) / b.trail.length * 0.11;
      ctx.globalAlpha = a;
      drawImageCentered(assets.ball, t.x, t.y, t.size * 0.8, t.size * 0.8);
    }
    ctx.globalAlpha = 1;

    drawImageCentered(assets.ball, b.x, b.y, b.size, b.size);
  }

  function drawGloves() {
    if (!assets.gloves.complete) return;
    const g = state.gloves;
    const w = g.w;
    const h = w * (assets.gloves.naturalHeight / assets.gloves.naturalWidth);
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(assets.gloves, g.x - w / 2, g.y - h / 2, w, h);
    ctx.restore();
  }

  function drawGuide() {
    if (state.mode !== "playing") return;
    if (state.round === "countdown") return;

    ctx.save();
    ctx.fillStyle = "rgba(2,6,23,.56)";
    roundRect(66, 690, 288, 42, 18);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Rápido. El balón cambia tarde", 210, 716);
    ctx.restore();
  }

  function drawParticles() {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.ttl);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCountdown() {
    if (state.mode !== "playing" || state.round !== "countdown" || !state.countdownValue) return;

    const pulse = 1 + Math.sin(state.time * 0.028) * 0.07;
    const titleY = 118;
    const numberY = 220;

    ctx.save();
    ctx.textAlign = "center";

    ctx.font = "bold 26px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(2,6,23,.82)";
    ctx.lineWidth = 6;
    ctx.strokeText("Prepárate", 210, titleY);
    ctx.fillText("Prepárate", 210, titleY);

    ctx.translate(210, numberY);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#ffd34d";
    ctx.strokeStyle = "rgba(2,6,23,.82)";
    ctx.lineWidth = 10;
    ctx.font = "bold 96px Arial";
    ctx.strokeText(String(state.countdownValue), 0, 0);
    ctx.fillText(String(state.countdownValue), 0, 0);
    ctx.restore();
  }

  function drawFeedback() {
    if (!state.feedback) return;

    const f = state.feedback;
    const alpha = clamp(f.timer / 550, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.fillStyle = f.color;
    ctx.strokeStyle = "rgba(2,6,23,.65)";
    ctx.lineWidth = 7;
    ctx.font = f.big ? "bold 50px Arial" : "bold 36px Arial";
    const y = f.big ? 286 : 122;
    ctx.strokeText(f.text, 210, y);
    ctx.fillText(f.text, 210, y);
    ctx.restore();
  }

  function drawImageCentered(img, x, y, w, h) {
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
  }

  function showFeedback(text, color) {
    state.feedback = makeFeedback(text, color, false);
  }

  function makeFeedback(text, color, big) {
    return { text, color, big, timer: 1000 };
  }

  function updateFeedback(dt) {
    if (!state.feedback) return;
    state.feedback.timer -= dt * 1000;
    if (state.feedback.timer <= 0) state.feedback = null;
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 45 + Math.random() * 125;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 520 + Math.random() * 300,
        ttl: 830,
        color,
        size: 3 + Math.random() * 5
      });
    }
  }

  function updateParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt * 1000;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 80 * dt;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shuffle(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInCubic(t) {
    return t * t * t;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
