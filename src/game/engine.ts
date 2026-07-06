// Surf Riders 2.0 — endless runner engine (Canvas 2D)
// Themed per-world: palette, boss, weather and day/night.
// Self-contained, mobile-first, 3-lane runner.

import { DEFAULT_THEME, type WorldTheme } from "./themes";


export type GameStatus = "intro" | "playing" | "paused" | "gameover";

export type GameState = {
  status: GameStatus;
  score: number;
  distance: number; // meters
  coins: number; // silver coins collected this run
  goldRun: number; // gold coins collected this run (from chests / gold pickups)
  silverTarget: number; // required silver to complete level
  level: number;
  combo: number;
  comboTimer: number; // seconds remaining
  multiplier: number;
  health: number;
  shieldActive: boolean;
  bossHealth: number;
  bossActive: boolean;
  bossDefeated: boolean;
};

export type GameCallbacks = {
  onStateChange: (s: GameState) => void;
  onGameOver: (result: { score: number; coins: number; distance: number; bossDefeated: boolean }) => void;
  onLevelComplete?: (silver: number, level: number, goldRun: number) => void;
  onShieldConsumed?: () => void;
};

export type GameOptions = {
  theme?: WorldTheme;
  touchSensitivity?: number; // 0.5..2 (default 1)
  reduceMotion?: boolean;
  level?: number;
  silverTarget?: number;
  disableBoss?: boolean;
  startWithShield?: boolean;
};


type Lane = -1 | 0 | 1;

type Obstacle = {
  type: "rock" | "palm" | "wave" | "crab";
  lane: Lane;
  z: number; // distance ahead (world units)
  hit: boolean;
  size: number;
};

type Pickup = {
  type: "coin" | "chest" | "gold" | "shield";
  lane: Lane;
  z: number;
  y: number; // vertical offset (for arcs)
  collected: boolean;
};


const LANE_OFFSETS: Record<Lane, number> = { [-1]: -1, [0]: 0, [1]: 1 };
// Landscape-first: wider lane, higher horizon, longer visible distance ahead.
const ROAD_HALF_WIDTH = 2.1; // world units — wider gameplay lane
const HORIZON_Y_RATIO = 0.40; // higher horizon = more track visible = more reaction time
const FAR_Z = 110; // draw hazards much further ahead
const NEAR_Z = 2;

// Color-coded hazard palette (consistent across all worlds)
const HAZARD_COLORS: Record<Obstacle["type"], { fill: string; outline: string; warn: string }> = {
  rock: { fill: "#1a1f28", outline: "#ff4d5e", warn: "rgba(255, 77, 94, 0.9)" },   // red = deadly
  palm: { fill: "#3a1f10", outline: "#ff8a1f", warn: "rgba(255, 138, 31, 0.9)" },  // orange = solid
  wave: { fill: "#0e3d5c", outline: "#ffd23f", warn: "rgba(255, 210, 63, 0.9)" },  // yellow = moving
  crab: { fill: "#3a0f2a", outline: "#c084fc", warn: "rgba(192, 132, 252, 0.9)" }, // purple = boss
};

export class SurfGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: GameCallbacks;
  private theme: WorldTheme;
  private touchSens: number;
  private reduceMotion: boolean;
  private raf = 0;
  private last = 0;
  private dpr = 1;
  private w = 0;
  private h = 0;
  private flashT = 0; // storm flash
  private edgeFlash = 0; // red edge on hit
  private warnPulse = 0; // pulsing hazard warnings
  private weatherPhase = 0;


  // player
  private lane: Lane = 0;
  private laneAnim = 0; // smoothed
  private jump = 0; // 0..1 height
  private jumping = false;
  private jumpV = 0;
  private sliding = false;
  private slideTimer = 0;
  private dashTimer = 0;
  private bob = 0;
  private invuln = 0;

  // world
  private speed = 14; // base world units per second
  private targetSpeed = 14;
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private spawnZ = FAR_Z;
  private pickupSpawnZ = FAR_Z;
  private distFloat = 0;
  private scoreFloat = 0;
  private waveOffset = 0;
  private cloudOffset = 0;
  private nextChestAt = 250;
  private bossSpawned = false;
  private bossZ = 0;
  private bossLane: Lane = 0;
  private bossLaneTimer = 0;
  private bossAttackTimer = 2;
  private bossHits = 0;
  private particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }[] = [];

  // input
  private touchStart: { x: number; y: number; t: number } | null = null;
  private lastTap = 0;

  state: GameState = {
    status: "intro",
    score: 0,
    distance: 0,
    coins: 0,
    goldRun: 0,
    silverTarget: 5000,
    level: 1,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    health: 3,
    shieldActive: false,
    bossHealth: 6,
    bossActive: false,
    bossDefeated: false,
  };

  private disableBoss = false;
  private levelCompleteEmitted = false;

  constructor(canvas: HTMLCanvasElement, cb: GameCallbacks, opts: GameOptions = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D unavailable");
    this.ctx = ctx;
    this.cb = cb;
    this.theme = opts.theme ?? DEFAULT_THEME;
    this.touchSens = opts.touchSensitivity ?? 1;
    this.reduceMotion = opts.reduceMotion ?? false;
    this.state.bossHealth = this.theme.bossHp;
    this.state.level = Math.max(1, opts.level ?? 1);
    this.state.silverTarget = Math.max(1, opts.silverTarget ?? 5000);
    this.disableBoss = opts.disableBoss ?? true; // level flow uses post-level monster
    this.state.shieldActive = !!opts.startWithShield;
    // Difficulty scales with level
    this.speed = 14 + (this.state.level - 1) * 0.8;
    this.targetSpeed = this.speed;
    this.resize();
    this.bindInput();
  }

  setTheme(theme: WorldTheme) {
    this.theme = theme;
    this.state.bossHealth = theme.bossHp;
  }
  setSensitivity(v: number) { this.touchSens = Math.max(0.3, Math.min(2.5, v)); }
  setReduceMotion(v: boolean) { this.reduceMotion = v; }


  start() {
    this.state.status = "playing";
    this.emit();
    this.last = performance.now();
    this.loop();
  }

  pause() {
    if (this.state.status !== "playing") return;
    this.state.status = "paused";
    this.emit();
  }

  resume() {
    if (this.state.status !== "paused") return;
    this.state.status = "playing";
    this.last = performance.now();
    this.emit();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  restart() {
    cancelAnimationFrame(this.raf);
    this.lane = 0;
    this.laneAnim = 0;
    this.jump = 0;
    this.jumping = false;
    this.jumpV = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.dashTimer = 0;
    this.invuln = 0;
    this.speed = 14 + (this.state.level - 1) * 0.8;
    this.targetSpeed = this.speed;
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.spawnZ = FAR_Z;
    this.pickupSpawnZ = FAR_Z;
    this.distFloat = 0;
    this.scoreFloat = 0;
    this.nextChestAt = 250;
    this.bossSpawned = false;
    this.bossHits = 0;
    this.levelCompleteEmitted = false;
    this.state = {
      status: "playing",
      score: 0,
      distance: 0,
      coins: 0,
      goldRun: 0,
      silverTarget: this.state.silverTarget,
      level: this.state.level,
      combo: 0,
      comboTimer: 0,
      multiplier: 1,
      health: 3,
      shieldActive: this.state.shieldActive,
      bossHealth: this.theme.bossHp,
      bossActive: false,
      bossDefeated: false,
    };
    this.emit();
    this.last = performance.now();
    this.loop();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.unbindInput();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Fill the container exactly — no min clamps that would force portrait
    // aspect on short landscape viewports (e.g. phones held sideways).
    this.w = Math.max(1, rect.width || window.innerWidth);
    this.h = Math.max(1, rect.height || window.innerHeight);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }


  // ---------- input ----------
  private keyHandler = (e: KeyboardEvent) => {
    if (this.state.status === "gameover") return;
    const k = e.key.toLowerCase();
    if (k === "p" || k === "escape") {
      this.state.status === "playing" ? this.pause() : this.resume();
      return;
    }
    if (this.state.status !== "playing") return;
    if (k === "arrowleft" || k === "a") this.move(-1);
    else if (k === "arrowright" || k === "d") this.move(1);
    else if (k === "arrowup" || k === "w" || k === " ") { e.preventDefault(); this.doJump(); }
    else if (k === "arrowdown" || k === "s") this.doSlide();
    else if (k === "shift") this.doDash();
  };

  private touchStartHandler = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t) return;
    this.touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
  };

  private touchMoveHandler = (e: TouchEvent) => {
    if (!this.touchStart || this.state.status !== "playing") return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    // Fire swipe once motion crosses a low threshold — feels responsive on
    // small phones where users flick quickly without lifting.
    const swipeThresh = 34 / this.touchSens;
    if (adx < swipeThresh && ady < swipeThresh) return;
    if (adx > ady) {
      this.move(dx > 0 ? 1 : -1);
    } else {
      if (dy < 0) this.doJump(); else this.doSlide();
    }
    // Reset origin so a continued gesture can register a second swipe.
    this.touchStart = { x: t.clientX, y: t.clientY, t: performance.now() };
  };

  private touchEndHandler = (e: TouchEvent) => {
    if (!this.touchStart || this.state.status !== "playing") { this.touchStart = null; return; }
    const t = e.changedTouches[0];
    if (!t) { this.touchStart = null; return; }
    const dx = t.clientX - this.touchStart.x;
    const dy = t.clientY - this.touchStart.y;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    const dt = performance.now() - this.touchStart.t;
    const tapThresh = 20 / this.touchSens;
    if (adx < tapThresh && ady < tapThresh && dt < 260) {
      // tap or double-tap
      const now = performance.now();
      if (now - this.lastTap < 300) { this.doDash(); this.lastTap = 0; }
      else this.lastTap = now;
    }
    // Swipe already handled in touchmove; no-op here.
    this.touchStart = null;
  };

  private resizeHandler = () => this.resize();

  private bindInput() {
    window.addEventListener("keydown", this.keyHandler);
    this.canvas.addEventListener("touchstart", this.touchStartHandler, { passive: true });
    this.canvas.addEventListener("touchmove", this.touchMoveHandler, { passive: true });
    this.canvas.addEventListener("touchend", this.touchEndHandler, { passive: true });
    window.addEventListener("resize", this.resizeHandler);
  }

  private unbindInput() {
    window.removeEventListener("keydown", this.keyHandler);
    this.canvas.removeEventListener("touchstart", this.touchStartHandler);
    this.canvas.removeEventListener("touchmove", this.touchMoveHandler);
    this.canvas.removeEventListener("touchend", this.touchEndHandler);
    window.removeEventListener("resize", this.resizeHandler);
  }

  private move(dir: -1 | 1) {
    const next = Math.max(-1, Math.min(1, this.lane + dir)) as Lane;
    if (next !== this.lane) this.lane = next;
  }

  private doJump() {
    if (!this.jumping && !this.sliding) {
      this.jumping = true;
      this.jumpV = 6.5;
    }
  }

  private doSlide() {
    if (!this.jumping && !this.sliding) {
      this.sliding = true;
      this.slideTimer = 0.55;
    }
  }

  private doDash() {
    if (this.dashTimer <= 0) {
      this.dashTimer = 0.9;
      this.invuln = Math.max(this.invuln, 0.6);
      this.targetSpeed = this.speed + 18;
      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: this.w * 0.5 + (Math.random() - 0.5) * 60,
          y: this.h * 0.78 + (Math.random() - 0.5) * 30,
          vx: -Math.random() * 200 - 50,
          vy: (Math.random() - 0.5) * 60,
          life: 0.5,
          color: "rgba(255,255,255,0.9)",
          size: 4 + Math.random() * 4,
        });
      }
    }
  }

  // ---------- loop ----------
  private loop = () => {
    if (this.state.status !== "playing") return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  };

  private emit() { this.cb.onStateChange({ ...this.state }); }

  private update(dt: number) {
    // speed ramp — base and cap grow with level for gradual difficulty
    const lvl = this.state.level;
    const base = 14 + (lvl - 1) * 0.8;
    const cap = Math.min(38, 28 + (lvl - 1) * 1.2);
    if (!this.state.bossActive) {
      this.targetSpeed = Math.min(cap, base + this.distFloat / 120);
    }
    this.speed += (this.targetSpeed - this.speed) * Math.min(1, dt * 2);

    // timers
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) this.targetSpeed = Math.min(cap, base + this.distFloat / 120);
    }
    if (this.invuln > 0) this.invuln -= dt;
    if (this.slideTimer > 0) { this.slideTimer -= dt; if (this.slideTimer <= 0) this.sliding = false; }
    if (this.jumping) {
      this.jump += this.jumpV * dt;
      this.jumpV -= 18 * dt;
      if (this.jump <= 0) { this.jump = 0; this.jumping = false; this.jumpV = 0; }
    }
    this.bob += dt * 6;
    this.laneAnim += (this.lane - this.laneAnim) * Math.min(1, dt * 12);
    this.waveOffset = (this.waveOffset + dt * 40) % 200;
    this.cloudOffset = (this.cloudOffset + dt * 8) % this.w;
    this.weatherPhase += dt;
    this.warnPulse = (this.warnPulse + dt * 4) % (Math.PI * 2);
    if (this.edgeFlash > 0) this.edgeFlash = Math.max(0, this.edgeFlash - dt * 2);
    if (this.theme.weather === "storm") {
      if (this.flashT > 0) this.flashT -= dt * 2;
      else if (Math.random() < dt * 0.25) this.flashT = 1;
    }


    // distance / score
    this.distFloat += this.speed * dt;
    const mult = 1 + Math.floor(this.state.combo / 5) * 0.5;
    this.state.multiplier = mult;
    this.scoreFloat += this.speed * dt * mult;
    this.state.distance = Math.floor(this.distFloat);
    this.state.score = Math.floor(this.scoreFloat);

    // combo timer
    if (this.state.comboTimer > 0) {
      this.state.comboTimer -= dt;
      if (this.state.comboTimer <= 0) { this.state.combo = 0; }
    }

    // spawn obstacles — wider spacing gives players time to read the lane
    if (!this.state.bossActive && !this.bossSpawned) {
      this.spawnZ -= this.speed * dt;
      while (this.spawnZ <= 0) {
        this.spawnObstacleRow();
        this.spawnZ += 9 + Math.random() * 5; // was 6 + rand*4
      }
      this.pickupSpawnZ -= this.speed * dt;
      while (this.pickupSpawnZ <= 0) {
        this.spawnPickupRow();
        this.pickupSpawnZ += 4 + Math.random() * 4; // was 3 + rand*3
      }
    }

    // move world
    for (const o of this.obstacles) o.z -= this.speed * dt;
    for (const p of this.pickups) p.z -= this.speed * dt;

    // boss trigger (disabled by default in level flow — post-level monster battles handle bosses)
    if (!this.disableBoss && !this.bossSpawned && this.distFloat >= 600) {
      this.bossSpawned = true;
      this.state.bossActive = true;
      this.state.bossHealth = this.theme.bossHp;
      this.bossHits = 0;
      this.bossZ = 24;
      this.bossLane = 0;
      this.bossLaneTimer = 1.2;
      this.bossAttackTimer = 2;
      this.targetSpeed = 12;
      this.emit();
    }

    // Level complete: silver target reached → auto-pause and fire callback
    if (!this.levelCompleteEmitted && this.state.coins >= this.state.silverTarget) {
      this.levelCompleteEmitted = true;
      this.state.status = "paused";
      this.emit();
      this.cb.onLevelComplete?.(this.state.coins, this.state.level, this.state.goldRun);
      cancelAnimationFrame(this.raf);
      return;
    }


    // boss behavior
    if (this.state.bossActive) {
      this.bossZ -= this.speed * dt * 0.05; // hovers ahead
      if (this.bossZ < 6) this.bossZ = 6;
      this.bossLaneTimer -= dt;
      if (this.bossLaneTimer <= 0) {
        const lanes: Lane[] = [-1, 0, 1];
        this.bossLane = lanes[Math.floor(Math.random() * 3)];
        this.bossLaneTimer = 1.5 + Math.random();
      }
      this.bossAttackTimer -= dt;
      if (this.bossAttackTimer <= 0) {
        // spawn rock attack from boss
        this.obstacles.push({ type: "rock", lane: this.bossLane, z: this.bossZ - 1, hit: false, size: 1 });
        this.bossAttackTimer = 1.4 + Math.random() * 0.8;
      }
      // collide with boss to damage when dashing
      if (this.dashTimer > 0 && this.bossZ < 4 && this.bossLane === this.lane) {
        this.bossHits++;
        this.state.bossHealth = Math.max(0, this.theme.bossHp - this.bossHits);
        this.bossZ = 18;
        this.burst(this.w / 2, this.h * 0.55, this.theme.accent);
        this.emit();
        if (this.bossHits >= this.theme.bossHp) {
          this.state.bossActive = false;
          this.state.bossDefeated = true;
          this.scoreFloat += 500;
          this.targetSpeed = 16;
          this.bossSpawned = false;
          this.distFloat += 200;
          this.burst(this.w / 2, this.h * 0.55, "#ffd166");
          this.emit();
        }
      }

    }

    // collisions
    const playerLane = this.laneAnim;
    for (const o of this.obstacles) {
      if (o.hit || o.z > 1.4 || o.z < -1) continue;
      const laneDiff = Math.abs(o.lane - playerLane);
      if (laneDiff > 0.55) continue;
      // jump clears short obstacles (rocks low); slide clears palm low branches/waves
      const cleared =
        (o.type === "rock" && this.jump > 0.6) ||
        (o.type === "wave" && this.sliding) ||
        (o.type === "palm" && this.sliding);
      if (cleared) { o.hit = true; continue; }
      if (this.invuln > 0 || this.dashTimer > 0) { o.hit = true; this.burst(this.w / 2, this.h * 0.7, "#9ad8ff"); continue; }
      o.hit = true;
      this.takeHit();
    }

    for (const p of this.pickups) {
      if (p.collected || p.z > 1.2 || p.z < -1) continue;
      const laneDiff = Math.abs(p.lane - playerLane);
      if (laneDiff > 0.5) continue;
      // coins float a bit; sliding misses high coins, jumping grabs them
      if (p.type === "coin") {
        const playerY = this.jump * 1.2 - (this.sliding ? 0.3 : 0);
        if (Math.abs(playerY - p.y) > 1.1) continue;
      }
      p.collected = true;
      if (p.type === "coin") {
        this.state.coins += 50; // silver per coin
        this.state.combo += 1;
        this.state.comboTimer = 2.2;
        this.scoreFloat += 10 * this.state.multiplier;
        this.burst(this.w / 2, this.h * 0.62, "#e6ecf5");
      } else if (p.type === "gold") {
        this.state.goldRun += 10; // in-run gold coin
        this.state.combo += 2;
        this.state.comboTimer = 2.5;
        this.scoreFloat += 30 * this.state.multiplier;
        this.burst(this.w / 2, this.h * 0.6, "#ffb86b");
      } else if (p.type === "chest") {
        this.state.coins += 500;    // silver chest bonus
        this.state.goldRun += 25;   // treasure chest also drops gold
        this.state.combo += 5;
        this.state.comboTimer = 2.5;
        this.scoreFloat += 200;
        this.burst(this.w / 2, this.h * 0.6, "#ffb86b");
      } else if (p.type === "shield") {
        if (!this.state.shieldActive) {
          this.state.shieldActive = true;
          this.burst(this.w / 2, this.h * 0.62, "#7ad0ff");
        }
      }
      this.emit();
    }

    // cull
    this.obstacles = this.obstacles.filter((o) => o.z > -2);
    this.pickups = this.pickups.filter((p) => p.z > -2);

    // particles
    for (const pr of this.particles) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.vy += 200 * dt;
      pr.life -= dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private spawnObstacleRow() {
    // pick a "safe" lane
    const lanes: Lane[] = [-1, 0, 1];
    const safe = lanes[Math.floor(Math.random() * 3)];
    const types: Obstacle["type"][] = ["rock", "palm", "wave"];
    for (const l of lanes) {
      if (l === safe) continue;
      if (Math.random() < 0.55) {
        const t = types[Math.floor(Math.random() * types.length)];
        this.obstacles.push({ type: t, lane: l, z: FAR_Z, hit: false, size: 1 });
      }
    }
  }

  private spawnPickupRow() {
    const lane = ([-1, 0, 1] as Lane[])[Math.floor(Math.random() * 3)];
    // Chest occasionally (silver + gold burst)
    if (this.distFloat >= this.nextChestAt) {
      this.nextChestAt += 220 + Math.random() * 180;
      this.pickups.push({ type: "chest", lane, z: FAR_Z, y: 0, collected: false });
      return;
    }
    // Rare shield pickup (~4% of rows, at most once every ~30s of world distance)
    if (Math.random() < 0.04) {
      this.pickups.push({ type: "shield", lane, z: FAR_Z, y: 0.6, collected: false });
      return;
    }
    // Occasional single gold coin (~10% of rows)
    if (Math.random() < 0.1) {
      this.pickups.push({ type: "gold", lane, z: FAR_Z, y: 0.4, collected: false });
      return;
    }
    // line of 3-5 silver coins, maybe arcing
    const count = 3 + Math.floor(Math.random() * 3);
    const arc = Math.random() < 0.3;
    for (let i = 0; i < count; i++) {
      const y = arc ? Math.sin((i / (count - 1)) * Math.PI) * 1.2 : 0;
      this.pickups.push({ type: "coin", lane, z: FAR_Z + i * 1.4, y, collected: false });
    }
  }


  private takeHit() {
    // Shield absorbs one hit, then breaks.
    if (this.state.shieldActive) {
      this.state.shieldActive = false;
      this.invuln = 1.0;
      this.burst(this.w / 2, this.h * 0.7, "#7ad0ff");
      this.cb.onShieldConsumed?.();
      this.emit();
      return;
    }
    this.state.health -= 1;
    this.state.combo = 0;
    this.state.comboTimer = 0;
    this.invuln = 1.2;
    this.edgeFlash = 1;
    this.targetSpeed = Math.max(10, this.speed - 6);
    this.burst(this.w / 2, this.h * 0.7, "#ff5577");
    this.emit();
    if (this.state.health <= 0) this.gameOver();
  }

  private gameOver() {
    this.state.status = "gameover";
    this.emit();
    cancelAnimationFrame(this.raf);
    this.cb.onGameOver({
      score: this.state.score,
      coins: this.state.coins,
      distance: this.state.distance,
      bossDefeated: this.state.bossDefeated,
    });
  }

  private burst(x: number, y: number, color: string) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 80 + Math.random() * 180;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.6, color, size: 3 + Math.random() * 4 });
    }
  }

  // ---------- render ----------
  private project(z: number, laneOffset: number, yWorld = 0) {
    // z: distance from camera (positive = ahead). near small z -> larger scale.
    const horizonY = this.h * HORIZON_Y_RATIO;
    const groundBottomY = this.h * 1.02;
    const t = Math.max(0.001, z / FAR_Z); // 0 near .. 1 far
    const persp = 1 / (z * 0.08 + 1); // 1 near .. small far
    const screenY = horizonY + (groundBottomY - horizonY) * (1 - t);
    // Dynamic lane width based on aspect ratio: wide landscape screens get a
    // wider lane so the play field uses the horizontal space, phones stay tight.
    const aspect = this.w / Math.max(1, this.h);
    const laneSpread = Math.min(0.34, Math.max(0.22, 0.14 + aspect * 0.09));
    const laneScreenX = this.w / 2 + laneOffset * (this.w * laneSpread) * persp;
    const scale = persp;
    return { x: laneScreenX, y: screenY - yWorld * 60 * persp, scale };
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // sky gradient (themed)
    const sky = ctx.createLinearGradient(0, 0, 0, this.h * HORIZON_Y_RATIO);
    sky.addColorStop(0, this.theme.sky[0]);
    sky.addColorStop(1, this.theme.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.w, this.h * HORIZON_Y_RATIO);

    // sun / moon depending on daytime
    const isNight = this.theme.daytime === "night" || this.theme.daytime === "twilight";
    ctx.fillStyle = isNight ? "rgba(220,230,255,0.85)" : "rgba(255,230,160,0.9)";
    ctx.beginPath();
    ctx.arc(this.w * 0.7, this.h * 0.22, this.h * 0.06, 0, Math.PI * 2);
    ctx.fill();

    // clouds (skip in storm/fog heavily)
    if (this.theme.weather !== "fog") {
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 240) - this.cloudOffset + this.w) % (this.w + 240) - 120;
        const cy = this.h * (0.12 + (i % 2) * 0.06);
        this.cloud(cx, cy, 40 + (i % 2) * 20);
      }
    }

    // distant mountains — heavily desaturated so gameplay pops
    ctx.fillStyle = this.theme.water[1];
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, this.h * HORIZON_Y_RATIO);
    for (let x = 0; x <= this.w; x += 40) {
      const y = this.h * HORIZON_Y_RATIO - Math.sin(x * 0.012) * 18 - 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.w, this.h * HORIZON_Y_RATIO);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // water (themed)
    const water = ctx.createLinearGradient(0, this.h * HORIZON_Y_RATIO, 0, this.h);
    water.addColorStop(0, this.theme.water[0]);
    water.addColorStop(1, this.theme.water[1]);
    ctx.fillStyle = water;
    ctx.fillRect(0, this.h * HORIZON_Y_RATIO, this.w, this.h - this.h * HORIZON_Y_RATIO);

    // atmospheric haze near horizon → blurs distant scenery so foreground reads
    const haze = ctx.createLinearGradient(0, this.h * HORIZON_Y_RATIO, 0, this.h * (HORIZON_Y_RATIO + 0.18));
    haze.addColorStop(0, "rgba(255,255,255,0.25)");
    haze.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, this.h * HORIZON_Y_RATIO, this.w, this.h * 0.2);

    // ---------- DISTINCT SURFING LANE ----------
    // Lane surface: a lighter trapezoid that clearly separates gameplay from the ocean.
    const nearL = this.project(NEAR_Z, -ROAD_HALF_WIDTH);
    const nearR = this.project(NEAR_Z, ROAD_HALF_WIDTH);
    const farL = this.project(FAR_Z * 0.7, -ROAD_HALF_WIDTH);
    const farR = this.project(FAR_Z * 0.7, ROAD_HALF_WIDTH);
    const laneGrad = ctx.createLinearGradient(0, farL.y, 0, nearL.y);
    laneGrad.addColorStop(0, "rgba(180, 230, 255, 0.05)");
    laneGrad.addColorStop(1, "rgba(180, 230, 255, 0.28)");
    ctx.fillStyle = laneGrad;
    ctx.beginPath();
    ctx.moveTo(farL.x, farL.y);
    ctx.lineTo(farR.x, farR.y);
    ctx.lineTo(nearR.x, nearR.y);
    ctx.lineTo(nearL.x, nearL.y);
    ctx.closePath();
    ctx.fill();

    // Glowing foam edges along the lane
    const drawFoamEdge = (side: -1 | 1) => {
      const near = this.project(NEAR_Z, side * ROAD_HALF_WIDTH);
      const far = this.project(FAR_Z * 0.7, side * ROAD_HALF_WIDTH);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(180, 230, 255, 0.8)";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // scrolling foam bubbles
      for (let k = 0; k < 8; k++) {
        const t = ((k / 8) + (this.waveOffset / 200)) % 1;
        const zk = NEAR_Z + t * (FAR_Z * 0.7 - NEAR_Z);
        const p = this.project(zk, side * ROAD_HALF_WIDTH);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 4 * p.scale), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    drawFoamEdge(-1);
    drawFoamEdge(1);

    // wave lines (perspective) — subtle inside the lane
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const z = i * 5 + ((this.waveOffset / 40) * 5) % 5;
      const left = this.project(z, -ROAD_HALF_WIDTH);
      const right = this.project(z, ROAD_HALF_WIDTH);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    // lane stripes
    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.setLineDash([12, 18]);
    for (const lane of [-0.5, 0.5]) {
      ctx.beginPath();
      const near = this.project(NEAR_Z, lane);
      const far = this.project(FAR_Z, lane);
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // sort scene items by z desc (far first)
    type SceneItem = { z: number; draw: () => void };
    const items: SceneItem[] = [];

    // Hazard warning markers ripple on the water where obstacles will arrive
    for (const o of this.obstacles) {
      if (o.hit) continue;
      if (o.z > 8 && o.z < 22) {
        items.push({ z: o.z + 0.02, draw: () => this.drawHazardWarning(o) });
      }
    }

    for (const o of this.obstacles) {
      if (o.hit) continue;
      items.push({ z: o.z, draw: () => this.drawObstacle(o) });
    }
    for (const p of this.pickups) {
      if (p.collected) continue;
      items.push({ z: p.z, draw: () => this.drawPickup(p) });
    }
    if (this.state.bossActive) {
      items.push({ z: this.bossZ, draw: () => this.drawBoss() });
    }

    // Beach sides — fewer, muted palms so they don't compete with the lane
    const palmRail = (((this.distFloat * 3) % 8));
    for (let i = 0; i < 6; i++) {
      const z = i * 8 - palmRail + 2;
      if (z < NEAR_Z || z > FAR_Z) continue;
      items.push({ z, draw: () => this.drawSidePalm(z, -1) });
      items.push({ z: z + 0.01, draw: () => this.drawSidePalm(z, 1) });
    }

    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();

    // player
    this.drawPlayer();

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // weather overlay
    this.drawWeather();

    // day/night tint
    if (this.theme.daytime === "night") {
      ctx.fillStyle = "rgba(10,20,60,0.28)";
      ctx.fillRect(0, 0, this.w, this.h);
    } else if (this.theme.daytime === "dusk") {
      ctx.fillStyle = "rgba(120,40,80,0.16)";
      ctx.fillRect(0, 0, this.w, this.h);
    } else if (this.theme.daytime === "twilight") {
      ctx.fillStyle = "rgba(60,30,120,0.22)";
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // vignette
    const vg = ctx.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.3, this.w / 2, this.h / 2, this.h * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,20,40,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.w, this.h);

    // damage edge flash — red inset when the player just took a hit
    if (this.edgeFlash > 0) {
      const ef = ctx.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.25, this.w / 2, this.h / 2, this.h * 0.8);
      ef.addColorStop(0, "rgba(255, 60, 90, 0)");
      ef.addColorStop(1, `rgba(255, 60, 90, ${0.55 * this.edgeFlash})`);
      ctx.fillStyle = ef;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  private drawHazardWarning(o: Obstacle) {
    const ctx = this.ctx;
    // Place the marker at a fixed "reticle" distance ahead of the player.
    const markerZ = 3.2;
    const p = this.project(markerZ, LANE_OFFSETS[o.lane]);
    const c = HAZARD_COLORS[o.type];
    // Fade the pulse in as the hazard closes in (z: 22 → 8).
    const proximity = 1 - Math.max(0, Math.min(1, (o.z - 8) / 14));
    const pulse = 0.5 + 0.5 * Math.sin(this.warnPulse * 2);
    const alpha = proximity * (0.35 + 0.45 * pulse);
    if (alpha < 0.05) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = c.warn;
    ctx.lineWidth = 3;
    ctx.shadowColor = c.warn;
    ctx.shadowBlur = 14;
    const rx = 44 * p.scale + pulse * 8;
    const ry = 14 * p.scale + pulse * 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    // inner arrow pointing down toward the lane
    ctx.shadowBlur = 0;
    ctx.fillStyle = c.warn;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 22 * p.scale);
    ctx.lineTo(p.x - 8 * p.scale, p.y - 34 * p.scale);
    ctx.lineTo(p.x + 8 * p.scale, p.y - 34 * p.scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawWeather() {
    const ctx = this.ctx;
    const w = this.theme.weather;
    if (w === "clear") return;
    if (w === "fog") {
      ctx.fillStyle = "rgba(200,210,225,0.22)";
      ctx.fillRect(0, 0, this.w, this.h);
      return;
    }
    if (w === "ash") {
      ctx.fillStyle = "rgba(60,30,15,0.25)";
      ctx.fillRect(0, 0, this.w, this.h);
      const n = this.reduceMotion ? 20 : 60;
      ctx.fillStyle = "rgba(40,20,10,0.6)";
      for (let i = 0; i < n; i++) {
        const x = ((i * 53 + this.weatherPhase * 20) % this.w);
        const y = ((i * 91 + this.weatherPhase * 60) % this.h);
        ctx.fillRect(x, y, 2, 2);
      }
      return;
    }
    if (w === "snow") {
      const n = this.reduceMotion ? 30 : 90;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < n; i++) {
        const x = ((i * 47 + this.weatherPhase * 14) % this.w);
        const y = ((i * 73 + this.weatherPhase * 90) % this.h);
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    if (w === "storm") {
      // rain
      ctx.strokeStyle = "rgba(180,210,240,0.4)";
      ctx.lineWidth = 1;
      const n = this.reduceMotion ? 30 : 80;
      for (let i = 0; i < n; i++) {
        const x = ((i * 31 + this.weatherPhase * 60) % this.w);
        const y = ((i * 67 + this.weatherPhase * 220) % this.h);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 4, y + 10);
        ctx.stroke();
      }
      if (this.flashT > 0) {
        ctx.fillStyle = `rgba(255,255,255,${this.flashT * 0.35})`;
        ctx.fillRect(0, 0, this.w, this.h);
      }
    }
  }


  private cloud(x: number, y: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.8, y + 4, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x - r * 0.8, y + 6, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSidePalm(z: number, side: -1 | 1) {
    const ctx = this.ctx;
    // Push palms further from the lane so foreground stays uncluttered.
    const p = this.project(z, side * (ROAD_HALF_WIDTH + 1.9));
    const s = p.scale;
    if (s < 0.05) return;
    ctx.save();
    // Distant palms are muted so they don't compete with hazards.
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "#4a2e1a";
    ctx.fillRect(p.x - 4 * s, p.y - 70 * s, 8 * s, 70 * s);
    ctx.fillStyle = "#256a45";
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.ellipse(p.x + Math.cos(ang) * 22 * s, p.y - 70 * s + Math.sin(ang) * 14 * s, 24 * s, 8 * s, ang, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 12 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawObstacle(o: Obstacle) {
    const ctx = this.ctx;
    const p = this.project(o.z, LANE_OFFSETS[o.lane]);
    const s = p.scale * 1.28; // +28% larger for readability
    if (s < 0.04) return;
    const c = HAZARD_COLORS[o.type];
    const wobble = Math.sin(this.bob * 2 + o.z) * 2 * s;

    // Aura glow behind the hazard so it pops against water.
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = c.outline;
    ctx.shadowColor = c.outline;
    ctx.shadowBlur = 22 * s;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 4 * s, 34 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (o.type === "rock") {
      // Dark silhouette + bright red outline
      ctx.fillStyle = c.fill;
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = Math.max(2, 3.5 * s);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 14 * s + wobble * 0.3, 32 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3b4855";
      ctx.beginPath();
      ctx.ellipse(p.x - 8 * s, p.y - 22 * s + wobble * 0.3, 18 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (o.type === "palm") {
      // Fallen log with warm orange outline
      ctx.fillStyle = c.fill;
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 16 * s, 44 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // rings
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = Math.max(1, 1.5 * s);
      for (const r of [10, 20, 30]) {
        ctx.beginPath();
        ctx.ellipse(p.x + r * s, p.y - 16 * s, 4 * s, 8 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Wave — cresting yellow warning
      ctx.fillStyle = c.fill;
      ctx.strokeStyle = c.outline;
      ctx.lineWidth = Math.max(2, 3 * s);
      ctx.beginPath();
      ctx.moveTo(p.x - 48 * s, p.y);
      ctx.quadraticCurveTo(p.x, p.y - 42 * s + wobble, p.x + 48 * s, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.outline;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - 26 * s + wobble, 34 * s, 5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPickup(p: Pickup) {
    const ctx = this.ctx;
    const pr = this.project(p.z, LANE_OFFSETS[p.lane], p.y);
    const s = pr.scale;
    if (s < 0.04) return;
    if (p.type === "coin" || p.type === "gold") {
      const spin = Math.sin(this.bob + p.z) * 0.9;
      const cx = pr.x;
      const cy = pr.y - 32 * s;
      const rx = Math.max(3, 18 * s * Math.abs(Math.cos(spin)));
      const ry = 18 * s;
      const isGold = p.type === "gold";
      ctx.save();
      ctx.shadowColor = isGold ? "rgba(255,210,90,0.95)" : "rgba(220,235,255,0.95)";
      ctx.shadowBlur = 18 * s;
      const grad = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 1, cx, cy, Math.max(rx, ry));
      if (isGold) {
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.45, "#ffdd66");
        grad.addColorStop(1, "#f59300");
      } else {
        // SILVER — cool white → pale silver → steel blue-grey
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.5, "#e6ecf5");
        grad.addColorStop(1, "#8ea1b8");
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = isGold ? "#7a4700" : "#3a4a5c";
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.3, cy - ry * 0.3, rx * 0.25, ry * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.type === "shield") {
      // Glowing blue shield bubble pickup
      const cx = pr.x;
      const cy = pr.y - 36 * s;
      const r = 22 * s;
      ctx.save();
      ctx.shadowColor = "rgba(120,200,255,0.95)";
      ctx.shadowBlur = 24 * s;
      const g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, "rgba(220,240,255,0.95)");
      g.addColorStop(0.6, "rgba(120,200,255,0.55)");
      g.addColorStop(1, "rgba(60,140,220,0.15)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(180,225,255,0.95)";
      ctx.lineWidth = Math.max(1.5, 2 * s);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // little shield glyph
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `${Math.max(10, 20 * s)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🛡", cx, cy + 1);
    } else {
      // chest
      ctx.fillStyle = "#8b5a2b";
      ctx.fillRect(pr.x - 22 * s, pr.y - 24 * s, 44 * s, 22 * s);
      ctx.fillStyle = "#c8964f";
      ctx.fillRect(pr.x - 22 * s, pr.y - 36 * s, 44 * s, 14 * s);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(pr.x - 4 * s, pr.y - 28 * s, 8 * s, 10 * s);
      // glow
      ctx.fillStyle = "rgba(255,209,102,0.35)";
      ctx.beginPath();
      ctx.arc(pr.x, pr.y - 30 * s, 38 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBoss() {
    const ctx = this.ctx;
    const p = this.project(this.bossZ, LANE_OFFSETS[this.bossLane]);
    const s = p.scale;
    // crab body
    const bx = p.x, by = p.y - 50 * s;
    ctx.fillStyle = "#d94e3a";
    ctx.beginPath();
    ctx.ellipse(bx, by, 80 * s, 50 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(bx - 22 * s, by - 28 * s, 10 * s, 0, Math.PI * 2);
    ctx.arc(bx + 22 * s, by - 28 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(bx - 22 * s, by - 28 * s, 5 * s, 0, Math.PI * 2);
    ctx.arc(bx + 22 * s, by - 28 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    // claws
    ctx.fillStyle = "#b83a28";
    const claw = Math.sin(this.bob * 1.2) * 6 * s;
    ctx.beginPath();
    ctx.ellipse(bx - 90 * s, by + 10 * s + claw, 28 * s, 18 * s, 0.4, 0, Math.PI * 2);
    ctx.ellipse(bx + 90 * s, by + 10 * s - claw, 28 * s, 18 * s, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // health bar above
    if (s > 0.3) {
      const w = 120 * s;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx - w / 2, by - 70 * s, w, 8 * s);
      ctx.fillStyle = "#ff7a59";
      ctx.fillRect(bx - w / 2, by - 70 * s, w * (this.state.bossHealth / 6), 8 * s);
    }
  }

  private drawPlayer() {
    const ctx = this.ctx;
    const baseY = this.h * 0.82;
    const x = this.w / 2 + this.laneAnim * (this.w * 0.22);
    const y = baseY - this.jump * 80 + (this.sliding ? 18 : 0) + Math.sin(this.bob) * 3;
    const flicker = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 0;
    if (flicker) ctx.globalAlpha = 0.5;

    // Persistent glowing water trail behind the surfer
    ctx.save();
    for (let i = 1; i <= 5; i++) {
      const a = (0.28 - i * 0.045) * (this.dashTimer > 0 ? 2 : 1);
      ctx.fillStyle = `rgba(180, 235, 255, ${Math.max(0, a)})`;
      ctx.beginPath();
      ctx.ellipse(x, baseY + 14 + i * 3, 46 - i * 4, 6 - i * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Splash under the board (kicked-up spray)
    if (!this.jumping) {
      const splashPhase = (this.bob * 2) % (Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      for (let i = 0; i < 6; i++) {
        const off = (i - 2.5) * 10;
        const rise = Math.abs(Math.sin(splashPhase + i)) * 4;
        ctx.beginPath();
        ctx.arc(x + off, baseY + 18 - rise, 2 + Math.random() * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(x, baseY + 12, 40 - this.jump * 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bright outline halo so the player is the easiest thing to locate
    ctx.save();
    ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = 3;

    // surfboard
    ctx.save();
    ctx.translate(x, y + (this.sliding ? 4 : 10));
    ctx.rotate(this.laneAnim * -0.15);
    const grad = ctx.createLinearGradient(-50, 0, 50, 0);
    grad.addColorStop(0, "#ffd166");
    grad.addColorStop(1, "#ff7a59");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 52, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(-30, -2, 60, 3);
    ctx.restore();

    // body — surfer
    const bodyH = this.sliding ? 28 : 46;
    // legs
    ctx.fillStyle = "#1b3b5a";
    ctx.fillRect(x - 10, y - bodyH * 0.4, 8, bodyH * 0.4);
    ctx.fillRect(x + 2, y - bodyH * 0.4, 8, bodyH * 0.4);
    // torso (bright, saturated)
    ctx.fillStyle = "#22e0e0";
    ctx.fillRect(x - 14, y - bodyH, 28, bodyH * 0.6);
    ctx.strokeRect(x - 14, y - bodyH, 28, bodyH * 0.6);
    // head
    ctx.fillStyle = "#f3c79b";
    ctx.beginPath();
    ctx.arc(x, y - bodyH - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // hair
    ctx.fillStyle = "#3a2014";
    ctx.beginPath();
    ctx.arc(x, y - bodyH - 12, 10, Math.PI, Math.PI * 2);
    ctx.fill();
    // arms
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - bodyH * 0.7);
    ctx.lineTo(x - 22 - this.laneAnim * 4, y - bodyH * 0.4);
    ctx.moveTo(x + 12, y - bodyH * 0.7);
    ctx.lineTo(x + 22 - this.laneAnim * 4, y - bodyH * 0.4);
    ctx.stroke();
    ctx.restore();

    // Dash burst
    if (this.dashTimer > 0) {
      ctx.fillStyle = "rgba(122,219,255,0.5)";
      for (let i = 1; i <= 5; i++) {
        ctx.beginPath();
        ctx.ellipse(x - i * 20, y + 10, 54 - i * 6, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Active shield bubble around the player
    if (this.state.shieldActive) {
      ctx.save();
      const pulse = 0.5 + 0.5 * Math.sin(this.bob * 2);
      const r = 46 + pulse * 4;
      ctx.shadowColor = "rgba(120,200,255,0.9)";
      ctx.shadowBlur = 22;
      const g = ctx.createRadialGradient(x, y - 24, r * 0.2, x, y - 24, r);
      g.addColorStop(0, "rgba(220,240,255,0.05)");
      g.addColorStop(0.7, "rgba(120,200,255,0.28)");
      g.addColorStop(1, "rgba(60,140,220,0.55)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y - 24, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(180,225,255,${0.6 + pulse * 0.3})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y - 24, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }
}
