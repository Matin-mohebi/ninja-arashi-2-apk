import {
  LevelData,
  PlayerStats,
  Projectile,
  Particle,
  Enemy,
  Trap,
  Rect,
} from '../types/game';
import { sounds } from '../audio/soundManager';

export interface EngineCallbacks {
  onHealthChange: (hp: number) => void;
  onShurikensChange: (shurikens: number, rechargePct: number) => void;
  onDashCooldownChange: (cooldownPct: number) => void;
  onDisguiseChange: (isDisguised: boolean, durationPct: number) => void;
  onCollect: (coins: number, diamonds: number, scrolls: number) => void;
  onLevelComplete: (stats: { time: number; scrolls: number; kills: number }) => void;
  onGameOver: () => void;
  onBossHpChange?: (hp: number, maxHp: number) => void;
  /** Fired when the player activates a checkpoint so the shell can respawn there on death. */
  onCheckpoint?: (spawn: { x: number; y: number }) => void;
}

export class NinjaEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelData;
  private stats: PlayerStats;
  private callbacks: EngineCallbacks;

  // Player state
  public player = {
    x: 100,
    y: 650,
    vx: 0,
    vy: 0,
    w: 34,
    h: 58,
    isGrounded: false,
    isWallSliding: false,
    wallDir: 0 as -1 | 0 | 1,
    facing: 1 as 1 | -1,
    jumpCount: 0,
    crouching: false,
    sliding: false,
    slideTimer: 0,
    slashing: false,
    slashTimer: 0,
    slashCombo: 1,
    dashing: false,
    dashTimer: 0,
    dashCooldownTimer: 0,
    disguised: false,
    disguiseTimer: 0,
    disguiseCooldownTimer: 0,
    invulnerableTimer: 0,
    shurikens: 3,
    shurikenRechargeTimer: 0,
    animFrame: 0,
    runCycle: 0,
  };

  // World & Camera
  private camera = { x: 0, y: 0, targetX: 0, targetY: 0, shake: 0 };
  private particles: Particle[] = [];
  private projectiles: Projectile[] = [];
  private enemies: Enemy[] = [];
  private traps: Trap[] = [];
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private levelStartTime: number = 0;
  private killsCount: number = 0;
  private scrollsCollected: number = 0;
  private keys: Record<string, boolean> = {};

  // Background image
  private bgImage: HTMLImageElement | null = null;
  private titleBgImage: HTMLImageElement | null = null;

  /** Optional checkpoint spawn point (set by the shell when the player died). */
  private spawnOverride: { x: number; y: number } | null = null;
  /** Pre-bound rAF loop (avoids per-frame closure allocation). */
  private boundLoop: (timestamp: number) => void = () => {};

  // HiDPI support: logical viewport size in CSS pixels + device pixel ratio
  private dpr: number = 1;
  private viewW: number = 1280;
  private viewH: number = 720;

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelData,
    stats: PlayerStats,
    callbacks: EngineCallbacks,
    bgImgUrl?: string,
    spawnOverride?: { x: number; y: number }
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.handleResize();
    this.level = JSON.parse(JSON.stringify(level)); // deep clone so restarts work fresh
    this.stats = stats;
    this.callbacks = callbacks;
    this.spawnOverride = spawnOverride || null;
    // Bind the loop ONCE — binding per frame inside requestAnimationFrame
    // allocated a new closure every frame (GC churn on mobile).
    this.boundLoop = this.loop.bind(this);

    if (bgImgUrl) {
      this.bgImage = new Image();
      this.bgImage.src = bgImgUrl;
    }

    this.resetLevel();
  }

  /**
   * HiDPI-aware resize: sizes the canvas backing store to CSS viewport * dpr
   * (capped at 2 for performance) and updates the logical viewport used by
   * camera math, so rendering stays crisp on phone screens.
   */
  public handleResize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = Math.max(320, window.innerWidth);
    const cssH = Math.max(240, window.innerHeight);
    this.dpr = dpr;
    this.viewW = cssW;
    this.viewH = cssH;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    // Recenter camera immediately on viewport change (guard: player/level may not be initialized yet)
    if (this.player && this.level) {
      const clampX = Math.max(0, Math.min(this.level.worldWidth - cssW, this.player.x - cssW / 2));
      const clampY = Math.max(0, Math.min(this.level.worldHeight - cssH, this.player.y - cssH / 2));
      this.camera.x = clampX;
      this.camera.y = clampY;
      this.camera.targetX = clampX;
      this.camera.targetY = clampY;
      // Resizing the backing store clears the canvas. While the loop is paused
      // (PAUSED / ROUND_SUMMARY / GAME_OVER) no frame would repaint it, leaving
      // a blank/black screen after a device rotation — draw one frame now.
      if (!this.isRunning) {
        this.render();
      }
    }
  }

  public resetLevel(checkpointSpawn?: { x: number; y: number }) {
    const spawn = checkpointSpawn || this.spawnOverride || this.level.spawnPoint;
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = false;
    this.player.isWallSliding = false;
    this.player.facing = 1;
    this.player.jumpCount = 0;
    this.player.slashing = false;
    this.player.dashing = false;
    this.player.disguised = false;
    this.player.dashCooldownTimer = 0;
    this.player.disguiseCooldownTimer = 0;
    this.player.invulnerableTimer = 0;
    this.player.shurikens = this.stats.shurikensMax;
    this.player.shurikenRechargeTimer = 0;

    this.enemies = JSON.parse(JSON.stringify(this.level.enemies));
    this.traps = JSON.parse(JSON.stringify(this.level.traps));
    this.projectiles = [];
    this.particles = [];
    this.camera.x = this.player.x - this.viewW / 2;
    this.camera.y = this.player.y - this.viewH / 2;
    this.levelStartTime = performance.now();
    this.killsCount = 0;
    this.scrollsCollected = this.level.collectibles.filter(
      (c) => c.type === 'scroll' && c.collected
    ).length;

    // Spawn ambient sakura petals
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: Math.random() * this.viewW + this.camera.x,
        y: Math.random() * this.viewH + this.camera.y,
        vx: -(0.5 + Math.random() * 1.5),
        vy: 0.8 + Math.random() * 1.2,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.4 ? '#fb7185' : '#f43f5e',
        alpha: 0.5 + Math.random() * 0.4,
        life: 100,
        maxLife: 100,
        type: 'sakura',
        rotation: Math.random() * Math.PI,
        vRot: 0.02 + Math.random() * 0.04,
      });
    }

    this.callbacks.onHealthChange(this.stats.hp);
    this.callbacks.onShurikensChange(this.player.shurikens, 1);
    this.callbacks.onDashCooldownChange(1);
    this.callbacks.onDisguiseChange(false, 1);
  }

  public setInput(key: string, pressed: boolean) {
    this.keys[key.toLowerCase()] = pressed;
  }

  public start() {
    // Guard against double-start: two concurrent rAF chains would run the
    // simulation at 2x speed with duplicated entities.
    if (this.isRunning) return;
    this.isRunning = true;
    this.keys = {}; // drop any input held from a previous session/pause
    this.lastTime = performance.now();
    requestAnimationFrame(this.boundLoop);
  }

  public stop() {
    this.isRunning = false;
    // Release held inputs (keyboard / virtual buttons) so the player doesn't
    // keep auto-running after resume — the matching keyup may be swallowed
    // while paused.
    this.keys = {};
  }

  // Action methods
  public triggerJump() {
    if (this.player.dashing) return;

    // Wall jump check
    if (this.player.isWallSliding) {
      this.player.vy = -14.5;
      this.player.vx = -this.player.wallDir * 8.5;
      this.player.facing = (-this.player.wallDir) as 1 | -1;
      this.player.jumpCount = 1;
      this.player.isWallSliding = false;
      this.createSparks(this.player.x + (this.player.wallDir === 1 ? this.player.w : 0), this.player.y + 20, 8);
      sounds.playJump();
      return;
    }

    // Normal or double jump
    if (this.player.isGrounded) {
      this.player.vy = -14.2;
      this.player.isGrounded = false;
      this.player.jumpCount = 1;
      sounds.playJump();
      this.createPuff(this.player.x + this.player.w / 2, this.player.y + this.player.h, 6);
    } else if (this.player.jumpCount === 1) {
      // Double jump flip
      this.player.vy = -13.2;
      this.player.jumpCount = 2;
      sounds.playJump();
      this.createPuff(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 8, '#ffffff');
    }
  }

  public triggerSlash() {
    if (this.player.slashing || this.player.dashing || this.player.disguised) return;
    this.player.slashing = true;
    this.player.slashTimer = 0.22; // ~220ms slash duration
    this.player.slashCombo = (this.player.slashCombo % 2) + 1;
    sounds.playSlash();

    // Katana Slash Hitbox calculation
    const slashRange = 68;
    const slashBox: Rect = {
      x: this.player.facing === 1 ? this.player.x + this.player.w - 10 : this.player.x - slashRange + 10,
      y: this.player.y - 12,
      w: slashRange,
      h: this.player.h + 24,
    };

    // Slash particle wave
    this.particles.push({
      x: this.player.facing === 1 ? this.player.x + this.player.w + 10 : this.player.x - 10,
      y: this.player.y + this.player.h / 2,
      vx: this.player.facing * 4,
      vy: 0,
      size: 28,
      color: '#ffffff',
      alpha: 1.0,
      life: 0.18,
      maxLife: 0.18,
      type: 'slash_wave',
      rotation: this.player.facing === 1 ? 0 : Math.PI,
    });

    // Check hit secret walls
    for (const sw of this.level.secretWalls) {
      if (!sw.broken && this.checkOverlap(slashBox, sw)) {
        sw.hp -= this.stats.katanaDamage;
        this.createSparks(sw.x + sw.w / 2, sw.y + sw.h / 2, 10);
        sounds.playClash();
        if (sw.hp <= 0) {
          sw.broken = true;
          this.createPuff(sw.x + sw.w / 2, sw.y + sw.h / 2, 20, '#64748b');
          sounds.playSecret();
        }
      }
    }

    // Check hit projectiles (deflect arrows!)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.fromPlayer && this.checkOverlap(slashBox, { x: p.x - 6, y: p.y - 6, w: 12, h: 12 })) {
        sounds.playClash();
        this.createSparks(p.x, p.y, 8);
        // Deflect back towards enemy!
        p.fromPlayer = true;
        p.vx = -p.vx * 1.5;
        p.damage = this.stats.katanaDamage;
      }
    }

    // Check hit enemies
    let hitAny = false;
    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead' && this.checkOverlap(slashBox, enemy)) {
        hitAny = true;
        const damage = this.stats.katanaDamage;
        enemy.hp -= damage;
        enemy.state = 'hurt';
        enemy.vx = this.player.facing * 5; // knockback
        enemy.vy = -3;
        this.createBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 14);
        sounds.playHit();
        this.camera.shake = 5;

        if (enemy.hp <= 0) {
          enemy.state = 'dead';
          this.killsCount++;
          this.stats.coins += 15;
          this.callbacks.onCollect(this.stats.coins, this.stats.diamonds, this.scrollsCollected);
          this.createBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 25);
          sounds.playHit();
        }

        if (enemy.type === 'boss_akumu' && this.callbacks.onBossHpChange) {
          this.callbacks.onBossHpChange(Math.max(0, enemy.hp), enemy.maxHp);
        }
      }
    }
    if (hitAny) {
      this.camera.shake = 6;
    }
  }

  public triggerShuriken() {
    if (this.player.shurikens <= 0 || this.player.disguised) return;
    this.player.shurikens--;
    this.callbacks.onShurikensChange(
      this.player.shurikens,
      1 - this.player.shurikenRechargeTimer / this.stats.shurikenRechargeTime
    );
    sounds.playShurikenThrow();

    const startX = this.player.facing === 1 ? this.player.x + this.player.w + 5 : this.player.x - 10;
    const startY = this.player.y + this.player.h / 2 - 4;

    this.projectiles.push({
      id: 'sh_' + Math.random(),
      type: 'shuriken',
      x: startX,
      y: startY,
      vx: this.player.facing * 18,
      vy: 0,
      damage: Math.round(this.stats.katanaDamage * 0.75),
      fromPlayer: true,
      life: 2.0,
      maxLife: 2.0,
    });
  }

  public triggerDash() {
    if (this.player.dashCooldownTimer > 0 || this.player.dashing || this.player.disguised) return;
    this.player.dashing = true;
    this.player.dashTimer = 0.22;
    this.player.dashCooldownTimer = this.stats.dashCooldown;
    this.player.invulnerableTimer = 0.35;
    this.player.vx = this.player.facing * 26;
    this.player.vy = 0;
    sounds.playDash();

    // Dash trail effect
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: this.player.x - this.player.facing * (i * 12),
        y: this.player.y,
        vx: -this.player.facing * 1.5,
        vy: 0,
        size: 20,
        color: '#38bdf8',
        alpha: 0.7,
        life: 0.25,
        maxLife: 0.25,
        type: 'smoke',
      });
    }

    // Dash slash damage
    const dashBox: Rect = {
      x: this.player.facing === 1 ? this.player.x : this.player.x - 140,
      y: this.player.y,
      w: 160,
      h: this.player.h,
    };

    for (const enemy of this.enemies) {
      if (enemy.state !== 'dead' && this.checkOverlap(dashBox, enemy)) {
        enemy.hp -= Math.round(this.stats.katanaDamage * 1.2);
        enemy.state = 'hurt';
        this.createBlood(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, 20);
        sounds.playHit();
        if (enemy.hp <= 0) {
          enemy.state = 'dead';
          this.killsCount++;
          this.stats.coins += 20;
          this.callbacks.onCollect(this.stats.coins, this.stats.diamonds, this.scrollsCollected);
        }
      }
    }
  }

  public triggerDisguise() {
    if (this.player.disguiseCooldownTimer > 0 || this.player.dashing) return;
    this.player.disguised = !this.player.disguised;
    sounds.playDisguise();
    this.createPuff(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 25, '#94a3b8');

    if (this.player.disguised) {
      this.player.disguiseTimer = this.stats.disguiseDuration;
      this.player.vx = 0;
    } else {
      this.player.disguiseCooldownTimer = 4.0;
    }
    this.callbacks.onDisguiseChange(this.player.disguised, 1);
  }

  // Main Loop
  private loop(timestamp: number) {
    if (!this.isRunning) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.boundLoop);
  }

  private update(dt: number) {
    // 1. Shuriken recharge timer
    if (this.player.shurikens < this.stats.shurikensMax) {
      this.player.shurikenRechargeTimer += dt;
      if (this.player.shurikenRechargeTimer >= this.stats.shurikenRechargeTime) {
        this.player.shurikens++;
        this.player.shurikenRechargeTimer = 0;
      }
      this.callbacks.onShurikensChange(
        this.player.shurikens,
        this.player.shurikenRechargeTimer / this.stats.shurikenRechargeTime
      );
    }

    // 2. Dash cooldown timer
    if (this.player.dashCooldownTimer > 0) {
      this.player.dashCooldownTimer -= dt;
      this.callbacks.onDashCooldownChange(
        1 - Math.max(0, this.player.dashCooldownTimer) / this.stats.dashCooldown
      );
    }

    // 3. Disguise timer
    if (this.player.disguised) {
      this.player.disguiseTimer -= dt;
      this.callbacks.onDisguiseChange(
        true,
        Math.max(0, this.player.disguiseTimer) / this.stats.disguiseDuration
      );
      if (this.player.disguiseTimer <= 0) {
        this.player.disguised = false;
        this.player.disguiseCooldownTimer = 4.0;
        this.createPuff(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 20, '#94a3b8');
        sounds.playDisguise();
        this.callbacks.onDisguiseChange(false, 0);
      }
    } else if (this.player.disguiseCooldownTimer > 0) {
      this.player.disguiseCooldownTimer -= dt;
      this.callbacks.onDisguiseChange(
        false,
        1 - Math.max(0, this.player.disguiseCooldownTimer) / 4.0
      );
    }

    // 4. Invulnerability timer
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // 5. Slash timer
    if (this.player.slashing) {
      this.player.slashTimer -= dt;
      if (this.player.slashTimer <= 0) {
        this.player.slashing = false;
      }
    }

    // 6. Dash active timer
    if (this.player.dashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.dashing = false;
        this.player.vx = this.player.facing * 4;
      }
    }

    // 7. Player horizontal movement from keys
    if (!this.player.dashing && !this.player.disguised) {
      const left = this.keys['a'] || this.keys['arrowleft'];
      const right = this.keys['d'] || this.keys['arrowright'];
      const crouch = this.keys['s'] || this.keys['arrowdown'];

      this.player.crouching = crouch && this.player.isGrounded;

      const targetSpeed = this.player.crouching ? 2.5 : 7.2;

      if (left && !right) {
        this.player.vx = -targetSpeed;
        this.player.facing = -1;
        this.player.runCycle += dt * 14;
      } else if (right && !left) {
        this.player.vx = targetSpeed;
        this.player.facing = 1;
        this.player.runCycle += dt * 14;
      } else {
        this.player.vx *= 0.78; // friction
        if (Math.abs(this.player.vx) < 0.2) this.player.vx = 0;
      }
    } else if (this.player.disguised) {
      this.player.vx = 0;
    }

    // 8. Gravity and vertical physics
    if (!this.player.dashing) {
      const gravity = this.player.isWallSliding ? 14 : 32;
      this.player.vy += gravity * dt;
      if (this.player.isWallSliding && this.player.vy > 3.5) {
        this.player.vy = 3.5; // slow slide drag
        // Wall sparks
        if (Math.random() < 0.4) {
          this.createSparks(
            this.player.x + (this.player.wallDir === 1 ? this.player.w : 0),
            this.player.y + 25,
            1
          );
        }
      }
    }

    // 9. Integrate Player Position & Collisions
    this.movePlayerWithCollisions(dt);

    // 10. Update Traps
    this.updateTraps(dt);

    // 11. Update Enemies
    this.updateEnemies(dt);

    // 12. Update Projectiles
    this.updateProjectiles(dt);

    // 13. Update Collectibles & Checkpoints
    this.updateCollectibles();

    // 14. Check Exit Portal
    if (this.checkOverlap(this.player, this.level.exitPortal)) {
      this.triggerVictory();
    }

    // 15. Check Void / Pit Fall
    if (this.player.y > this.level.worldHeight + 100) {
      this.playerTakeDamage(999);
    }

    // 16. Update Particles
    this.updateParticles(dt);

    // 17. Smooth Camera Lerp
    this.camera.targetX = this.player.x - this.viewW / 2 + (this.player.facing * 120);
    this.camera.targetY = this.player.y - this.viewH / 2;

    // Bounds clamp
    this.camera.targetX = Math.max(0, Math.min(this.level.worldWidth - this.viewW, this.camera.targetX));
    this.camera.targetY = Math.max(0, Math.min(this.level.worldHeight - this.viewH, this.camera.targetY));

    this.camera.x += (this.camera.targetX - this.camera.x) * 0.12;
    this.camera.y += (this.camera.targetY - this.camera.y) * 0.12;

    if (this.camera.shake > 0) {
      this.camera.shake *= 0.88;
      if (this.camera.shake < 0.2) this.camera.shake = 0;
    }
  }

  private movePlayerWithCollisions(dt: number) {
    const p = this.player;
    const dx = p.vx * 60 * dt;
    const dy = p.vy * 60 * dt;

    // Move X
    p.x += dx;
    let wallTouchDir: -1 | 0 | 1 = 0;

    for (const plat of this.level.platforms) {
      if (plat.type === 'bamboo') continue; // bamboo is one-way from top only
      if (this.checkOverlap(p, plat)) {
        if (p.vx > 0) {
          p.x = plat.x - p.w;
          wallTouchDir = 1;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.w;
          wallTouchDir = -1;
        }
        p.vx = 0;
      }
    }

    // Secret unbroken walls collision
    for (const sw of this.level.secretWalls) {
      if (!sw.broken && this.checkOverlap(p, sw)) {
        if (p.vx > 0) p.x = sw.x - p.w;
        else if (p.vx < 0) p.x = sw.x + sw.w;
        p.vx = 0;
      }
    }

    // Move Y
    p.y += dy;
    p.isGrounded = false;

    for (const plat of this.level.platforms) {
      if (plat.type === 'bamboo') {
        // One way: only land if falling through top
        if (p.vy > 0 && p.y + p.h - dy <= plat.y + 10 && this.checkOverlap(p, plat)) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.isGrounded = true;
          p.jumpCount = 0;
        }
        continue;
      }

      if (this.checkOverlap(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.isGrounded = true;
          p.jumpCount = 0;
        } else if (p.vy < 0) {
          p.y = plat.y + plat.h;
          p.vy = 0;
        }
      }
    }

    // Wall slide detection
    if (!p.isGrounded && wallTouchDir !== 0 && p.vy > 0) {
      p.isWallSliding = true;
      p.wallDir = wallTouchDir;
    } else {
      p.isWallSliding = false;
      p.wallDir = 0;
    }
  }

  private updateTraps(dt: number) {
    for (const trap of this.traps) {
      if (trap.type === 'spikes') {
        // Spikes deal damage if player touches them and isn't invulnerable/disguised
        if (!this.player.disguised && this.checkOverlap(this.player, trap)) {
          this.playerTakeDamage(1);
        }
      } else if (trap.type === 'swinging_blade') {
        // Harmonic motion
        trap.angle = Math.sin(performance.now() * 0.001 * (trap.speed || 2.5)) * 1.2;
        const bladeX = (trap.anchorX || trap.x) + Math.sin(trap.angle) * (trap.length || 180);
        const bladeY = (trap.anchorY || trap.y) + Math.cos(trap.angle) * (trap.length || 180);
        trap.x = bladeX - trap.w / 2;
        trap.y = bladeY - trap.h / 2;

        if (!this.player.disguised && this.checkOverlap(this.player, trap)) {
          this.playerTakeDamage(1);
          sounds.playHit();
        }
      } else if (trap.type === 'dart_shooter') {
        trap.timer = (trap.timer || 0) + dt;
        if (trap.timer >= (trap.cooldown || 2.5)) {
          trap.timer = 0;
          // Shoot poison dart
          this.projectiles.push({
            id: 'dart_' + Math.random(),
            type: 'enemy_arrow',
            x: trap.direction === 'right' ? trap.x + trap.w + 4 : trap.x - 10,
            y: trap.y + trap.h / 2,
            vx: (trap.direction === 'right' ? 1 : -1) * 11,
            vy: 0,
            damage: 1,
            fromPlayer: false,
            life: 3.5,
            maxLife: 3.5,
          });
          sounds.playShurikenThrow();
        }
      }
    }
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      const distToPlayer = Math.hypot(
        this.player.x + this.player.w / 2 - (enemy.x + enemy.w / 2),
        this.player.y + this.player.h / 2 - (enemy.y + enemy.h / 2)
      );

      // Disguise makes enemies oblivious!
      const playerDetected = !this.player.disguised && distToPlayer < enemy.detectionRange;

      if (enemy.type === 'boss_akumu') {
        this.updateBossAkumu(enemy, dt, distToPlayer);
        continue;
      }

      if (enemy.type === 'archer') {
        // Archer stays in place, aims and fires poison arrows
        if (playerDetected) {
          enemy.direction = this.player.x > enemy.x ? 1 : -1;
          enemy.attackTimer += dt;
          if (enemy.attackTimer >= enemy.attackCooldown) {
            enemy.attackTimer = 0;
            // Fire arrow
            this.projectiles.push({
              id: 'arr_' + Math.random(),
              type: 'enemy_arrow',
              x: enemy.direction === 1 ? enemy.x + enemy.w + 5 : enemy.x - 10,
              y: enemy.y + 20,
              vx: enemy.direction * 10.5,
              vy: -1.2,
              damage: 1,
              fromPlayer: false,
              life: 3.5,
              maxLife: 3.5,
            });
            sounds.playShurikenThrow();
          }
        }
      } else {
        // Patrol / Melee attack
        if (playerDetected) {
          enemy.direction = this.player.x > enemy.x ? 1 : -1;
          const chaseSpeed = enemy.type === 'hound' ? 5.2 : 2.8;
          enemy.vx = enemy.direction * chaseSpeed;

          // Melee attack if close
          if (distToPlayer < 45) {
            enemy.attackTimer += dt;
            if (enemy.attackTimer >= enemy.attackCooldown) {
              enemy.attackTimer = 0;
              this.playerTakeDamage(1);
              sounds.playSlash();
            }
          }
        } else {
          // Normal patrol
          const patrolSpeed = enemy.type === 'hound' ? 3.0 : 1.4;
          enemy.vx = enemy.direction * patrolSpeed;
          if (enemy.x <= enemy.patrolMinX) {
            enemy.direction = 1;
          } else if (enemy.x >= enemy.patrolMaxX) {
            enemy.direction = -1;
          }
        }

        // Apply enemy physics with a LEDGE GUARD: enemies have no gravity, so
        // without this check a chasing enemy would happily walk off a platform
        // and float across spike chasms.
        const nextEnemyX = enemy.x + enemy.vx * 60 * dt;
        const probeX = enemy.vx > 0 ? nextEnemyX + enemy.w : nextEnemyX;
        if (this.hasGroundBelow(probeX, enemy.y + enemy.h)) {
          enemy.x = nextEnemyX;
        } else {
          enemy.vx = 0;
          if (!playerDetected) {
            // Patrol reached a ledge before its bounds — turn around.
            enemy.direction = (enemy.direction * -1) as 1 | -1;
          }
        }
      }
    }
  }

  /** True when there is walkable solid ground within a step below (footY). */
  private hasGroundBelow(cx: number, footY: number): boolean {
    for (const plat of this.level.platforms) {
      if (plat.type !== 'solid') continue;
      if (cx >= plat.x && cx <= plat.x + plat.w && plat.y >= footY - 8 && plat.y <= footY + 48) {
        return true;
      }
    }
    return false;
  }

  private updateBossAkumu(boss: Enemy, dt: number, distToPlayer: number) {
    boss.attackTimer += dt;
    boss.teleportTimer = (boss.teleportTimer || 4.0) - dt;
    boss.direction = this.player.x > boss.x ? 1 : -1;

    // Boss Phase transition at 50% HP
    if (boss.hp < boss.maxHp * 0.5 && boss.bossPhase === 1) {
      boss.bossPhase = 2;
      this.createPuff(boss.x + boss.w / 2, boss.y + boss.h / 2, 35, '#dc2626');
      sounds.playDeath();
    }

    // Teleportation mechanic
    if (boss.teleportTimer <= 0) {
      boss.teleportTimer = boss.bossPhase === 2 ? 3.0 : 4.5;
      this.createPuff(boss.x + boss.w / 2, boss.y + boss.h / 2, 25, '#7f1d1d');
      // Teleport behind or above player
      const targetSide = Math.random() > 0.5 ? 1 : -1;
      boss.x = Math.max(1800, Math.min(2900, this.player.x + targetSide * 160));
      this.createPuff(boss.x + boss.w / 2, boss.y + boss.h / 2, 25, '#7f1d1d');
      sounds.playDash();
    }

    // Attacks
    const attackCd = boss.bossPhase === 2 ? 1.4 : 2.0;
    if (boss.attackTimer >= attackCd) {
      boss.attackTimer = 0;
      const attackChoice = Math.random();

      if (attackChoice > 0.4) {
        // Blade wave projectile
        this.projectiles.push({
          id: 'bwave_' + Math.random(),
          type: 'boss_blade_wave',
          x: boss.direction === 1 ? boss.x + boss.w + 10 : boss.x - 20,
          y: boss.y + boss.h / 2 - 10,
          vx: boss.direction * 12,
          vy: 0,
          damage: 1,
          fromPlayer: false,
          life: 3.0,
          maxLife: 3.0,
        });
        sounds.playSlash();
      } else {
        // Melee leap rush
        boss.vx = boss.direction * 9.5;
        sounds.playDash();
      }
    }

    boss.x += (boss.vx || 0) * 60 * dt;
    boss.vx *= 0.88;

    // Contact damage if close
    if (distToPlayer < 55 && !this.player.disguised) {
      this.playerTakeDamage(1);
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;

      // Shuriken spin sparks
      if (p.type === 'shuriken') {
        p.vy += 0.08; // slight gravity drop
      }

      // Check hit platforms
      let hitSolid = false;
      for (const plat of this.level.platforms) {
        if (plat.type === 'solid' && this.pointInRect(p.x, p.y, plat)) {
          hitSolid = true;
          this.createSparks(p.x, p.y, 4);
          sounds.playClash();
          break;
        }
      }

      if (hitSolid) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check hit enemies (if from player)
      if (p.fromPlayer) {
        for (const enemy of this.enemies) {
          if (enemy.state !== 'dead' && this.pointInRect(p.x, p.y, enemy)) {
            enemy.hp -= p.damage;
            enemy.state = 'hurt';
            this.createBlood(p.x, p.y, 12);
            sounds.playHit();

            if (enemy.hp <= 0) {
              enemy.state = 'dead';
              this.killsCount++;
              this.stats.coins += 15;
              this.callbacks.onCollect(this.stats.coins, this.stats.diamonds, this.scrollsCollected);
            }

            if (enemy.type === 'boss_akumu' && this.callbacks.onBossHpChange) {
              this.callbacks.onBossHpChange(Math.max(0, enemy.hp), enemy.maxHp);
            }

            this.projectiles.splice(i, 1);
            break;
          }
        }
      } else {
        // Enemy projectile hits player
        if (!this.player.disguised && this.pointInRect(p.x, p.y, this.player)) {
          this.playerTakeDamage(p.damage);
          this.createBlood(p.x, p.y, 8);
          sounds.playHit();
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private updateCollectibles() {
    for (const c of this.level.collectibles) {
      if (!c.collected && this.checkOverlap(this.player, { x: c.x - 14, y: c.y - 14, w: 28, h: 28 })) {
        c.collected = true;
        if (c.type === 'coin') {
          this.stats.coins += 10;
          sounds.playCoin();
          this.createSparks(c.x, c.y, 6, '#facc15');
        } else if (c.type === 'scroll') {
          this.scrollsCollected++;
          this.stats.diamonds += 1;
          sounds.playSecret();
          this.createSparks(c.x, c.y, 12, '#38bdf8');
        } else if (c.type === 'diamond') {
          this.stats.diamonds += 3;
          sounds.playSecret();
          this.createSparks(c.x, c.y, 15, '#a855f7');
        } else if (c.type === 'health_potion') {
          this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 2);
          this.callbacks.onHealthChange(this.stats.hp);
          sounds.playCoin();
          this.createPuff(c.x, c.y, 12, '#22c55e');
        }
        this.callbacks.onCollect(this.stats.coins, this.stats.diamonds, this.scrollsCollected);
      }
    }

    // Checkpoints
    for (const chk of this.level.checkpoints) {
      if (!chk.activated && this.checkOverlap(this.player, { x: chk.x - 20, y: chk.y - 30, w: 40, h: 60 })) {
        chk.activated = true;
        sounds.playCheckpoint();
        this.createPuff(chk.x, chk.y, 18, '#38bdf8');
        // Report to the shell so death/respawn can start from here.
        this.callbacks.onCheckpoint?.({ x: chk.x, y: chk.y - 30 });
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        if (pt.type === 'sakura') {
          // Recycle sakura petals across viewport
          pt.life = 100;
          pt.x = this.camera.x + this.viewW + 10;
          pt.y = this.camera.y + Math.random() * this.viewH;
          continue;
        }
        this.particles.splice(i, 1);
        continue;
      }

      pt.x += pt.vx * 60 * dt;
      pt.y += pt.vy * 60 * dt;

      if (pt.rotation !== undefined && pt.vRot !== undefined) {
        pt.rotation += pt.vRot;
      }

      if (pt.type === 'blood') {
        pt.vy += 0.4; // gravity on blood drops
      }
    }
  }

  public playerTakeDamage(amount: number) {
    if (this.player.invulnerableTimer > 0 || this.player.dashing || this.player.disguised) return;

    this.stats.hp -= amount;
    this.player.invulnerableTimer = 1.0;
    this.camera.shake = 10;
    this.createBlood(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 20);
    sounds.playHit();
    this.callbacks.onHealthChange(Math.max(0, this.stats.hp));

    if (this.stats.hp <= 0) {
      this.triggerGameOver();
    }
  }

  private triggerVictory() {
    this.stop();
    sounds.playVictory();
    const elapsedTime = Math.round((performance.now() - this.levelStartTime) / 1000);
    this.callbacks.onLevelComplete({
      time: elapsedTime,
      scrolls: this.scrollsCollected,
      kills: this.killsCount,
    });
  }

  private triggerGameOver() {
    this.stop();
    sounds.playDeath();
    this.callbacks.onGameOver();
  }

  // Particle Generators
  private createBlood(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 2.5 + Math.random() * 3,
        color: Math.random() > 0.3 ? '#dc2626' : '#991b1b',
        alpha: 0.95,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        type: 'blood',
      });
    }
  }

  private createSparks(x: number, y: number, count: number, color = '#fef08a') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 7;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 2,
        color,
        alpha: 1.0,
        life: 0.2 + Math.random() * 0.25,
        maxLife: 0.45,
        type: 'spark',
      });
    }
  }

  private createPuff(x: number, y: number, count: number, color = '#94a3b8') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 5 + Math.random() * 10,
        color,
        alpha: 0.7,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        type: 'smoke',
      });
    }
  }

  // Collision Helpers
  private checkOverlap(r1: Rect, r2: Rect): boolean {
    return (
      r1.x < r2.x + r2.w &&
      r1.x + r1.w > r2.x &&
      r1.y < r2.y + r2.h &&
      r1.y + r1.h > r2.y
    );
  }

  private pointInRect(px: number, py: number, r: Rect): boolean {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  }

  // RENDERING
  public render() {
    const ctx = this.ctx;
    const w = this.viewW;
    const h = this.viewH;

    // Apply camera shake
    const shakeX = (Math.random() - 0.5) * this.camera.shake * 2;
    const shakeY = (Math.random() - 0.5) * this.camera.shake * 2;

    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Parallax Background
    this.renderParallaxBackground(ctx, w, h);

    // Translate to camera coordinates
    ctx.translate(-Math.round(this.camera.x + shakeX), -Math.round(this.camera.y + shakeY));

    // 2. Draw Checkpoints
    this.renderCheckpoints(ctx);

    // 3. Draw Platforms & Secret Walls
    this.renderPlatforms(ctx);

    // 4. Draw Traps
    this.renderTraps(ctx);

    // 5. Draw Exit Portal
    this.renderExitPortal(ctx);

    // 6. Draw Collectibles
    this.renderCollectibles(ctx);

    // 7. Draw Enemies
    this.renderEnemies(ctx);

    // 8. Draw Player (Ninja Arashi silhouette)
    this.renderPlayer(ctx);

    // 9. Draw Projectiles
    this.renderProjectiles(ctx);

    // 10. Draw Particles
    this.renderParticles(ctx);

    ctx.restore();
  }

  private renderParallaxBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.bgImage && this.bgImage.complete && this.bgImage.naturalWidth > 0) {
      // Draw parallax image background
      const parX = -(this.camera.x * 0.25) % w;
      ctx.drawImage(this.bgImage, parX, 0, w, h);
      ctx.drawImage(this.bgImage, parX + w, 0, w, h);
    } else {
      // Rich procedural twilight / blood moon sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#1c0f24');
      skyGrad.addColorStop(0.5, '#3b1227');
      skyGrad.addColorStop(1, '#09050d');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Huge blood red moon
      const moonX = w * 0.72 - this.camera.x * 0.05;
      const moonY = h * 0.28;
      const moonGrad = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 80);
      moonGrad.addColorStop(0, '#fee2e2');
      moonGrad.addColorStop(0.3, '#ef4444');
      moonGrad.addColorStop(0.8, '#991b1b');
      moonGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 80, 0, Math.PI * 2);
      ctx.fill();

      // Silhouetted mountain ridges
      ctx.fillStyle = 'rgba(18, 10, 24, 0.75)';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      for (let x = 0; x <= w; x += 100) {
        const my = h * 0.55 + Math.sin((x + this.camera.x * 0.1) * 0.005) * 60;
        ctx.lineTo(x, my);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
    }
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    for (const plat of this.level.platforms) {
      if (plat.type === 'bamboo') {
        // Bamboo platform (slender wooden bridge with rope ties)
        ctx.fillStyle = '#1e1b18';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Bamboo nodes
        ctx.strokeStyle = '#3a332a';
        ctx.lineWidth = 2;
        for (let bx = plat.x + 15; bx < plat.x + plat.w; bx += 22) {
          ctx.beginPath();
          ctx.moveTo(bx, plat.y);
          ctx.lineTo(bx, plat.y + plat.h);
          ctx.stroke();
        }

        // Top moss / highlight line
        ctx.strokeStyle = '#4a5538';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(plat.x, plat.y + 1);
        ctx.lineTo(plat.x + plat.w, plat.y + 1);
        ctx.stroke();
      } else {
        // Dark silhouette ground/rock platform
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Upper rim outline with dark moss sheen
        ctx.fillStyle = '#1c221e';
        ctx.fillRect(plat.x, plat.y, plat.w, 4);

        // Small decorative grass tufts on edges
        ctx.fillStyle = '#0a0a0c';
        for (let gx = plat.x + 8; gx < plat.x + plat.w - 8; gx += 28) {
          ctx.beginPath();
          ctx.moveTo(gx, plat.y);
          ctx.lineTo(gx + 3, plat.y - 6);
          ctx.lineTo(gx + 6, plat.y);
          ctx.fill();
        }
      }
    }

    // Secret Walls (show slight crack fissures until broken)
    for (const sw of this.level.secretWalls) {
      if (!sw.broken) {
        ctx.fillStyle = '#17171d';
        ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
        // Crack lines
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sw.x + 6, sw.y + 10);
        ctx.lineTo(sw.x + 18, sw.y + sw.h * 0.4);
        ctx.lineTo(sw.x + 8, sw.y + sw.h * 0.8);
        ctx.stroke();
      }
    }
  }

  private renderTraps(ctx: CanvasRenderingContext2D) {
    for (const trap of this.traps) {
      if (trap.type === 'spikes') {
        // Deadly sharp spikes
        ctx.fillStyle = '#09090b';
        const numSpikes = Math.floor(trap.w / 14);
        const spikeW = trap.w / numSpikes;
        ctx.beginPath();
        for (let i = 0; i < numSpikes; i++) {
          const sx = trap.x + i * spikeW;
          ctx.moveTo(sx, trap.y + trap.h);
          ctx.lineTo(sx + spikeW / 2, trap.y);
          ctx.lineTo(sx + spikeW, trap.y + trap.h);
        }
        ctx.fill();

        // Blood glint on tips
        ctx.fillStyle = '#991b1b';
        for (let i = 0; i < numSpikes; i++) {
          const sx = trap.x + i * spikeW;
          ctx.fillRect(sx + spikeW / 2 - 1, trap.y, 2, 6);
        }
      } else if (trap.type === 'swinging_blade') {
        // Chain
        ctx.strokeStyle = '#52525b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(trap.anchorX || trap.x, trap.anchorY || trap.y);
        ctx.lineTo(trap.x + trap.w / 2, trap.y + trap.h / 2);
        ctx.stroke();

        // Spiked blade ball
        const bx = trap.x + trap.w / 2;
        const by = trap.y + trap.h / 2;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(performance.now() * 0.005);

        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.arc(0, 0, trap.w / 2, 0, Math.PI * 2);
        ctx.fill();

        // Spikes on ball
        ctx.fillStyle = '#09090b';
        for (let a = 0; a < 8; a++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(-6, -trap.w / 2);
          ctx.lineTo(0, -trap.w / 2 - 16);
          ctx.lineTo(6, -trap.w / 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (trap.type === 'dart_shooter') {
        // Gargoyle head on wall
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);
        // Glowing red mouth/eye
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(trap.x + 8, trap.y + 12, 12, 6);
      }
    }
  }

  private renderCheckpoints(ctx: CanvasRenderingContext2D) {
    for (const chk of this.level.checkpoints) {
      // Jizo stone lantern
      ctx.fillStyle = '#18181b';
      // Base & Pillar
      ctx.fillRect(chk.x - 14, chk.y + 15, 28, 25);
      // Lantern box
      ctx.fillRect(chk.x - 18, chk.y - 15, 36, 30);
      // Roof pagoda cap
      ctx.beginPath();
      ctx.moveTo(chk.x - 26, chk.y - 15);
      ctx.lineTo(chk.x, chk.y - 32);
      ctx.lineTo(chk.x + 26, chk.y - 15);
      ctx.fill();

      // Flame inside
      if (chk.activated) {
        const flamePulse = Math.sin(performance.now() * 0.008) * 3;
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(chk.x, chk.y, 8 + flamePulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#52525b';
        ctx.fillRect(chk.x - 4, chk.y - 4, 8, 8);
      }
    }
  }

  private renderExitPortal(ctx: CanvasRenderingContext2D) {
    const ep = this.level.exitPortal;
    // Grand Torii Gate
    ctx.fillStyle = '#171717';
    // Left & Right pillars
    ctx.fillRect(ep.x, ep.y - 40, 14, ep.h + 40);
    ctx.fillRect(ep.x + ep.w - 14, ep.y - 40, 14, ep.h + 40);
    // Upper curved lintel
    ctx.fillRect(ep.x - 15, ep.y - 45, ep.w + 30, 16);
    ctx.fillRect(ep.x - 6, ep.y - 25, ep.w + 12, 10);

    // Swirling shadow portal vortex
    const pTime = performance.now() * 0.004;
    ctx.save();
    ctx.translate(ep.x + ep.w / 2, ep.y + ep.h / 2);
    const portalGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, ep.w * 0.6);
    portalGrad.addColorStop(0, '#f43f5e');
    portalGrad.addColorStop(0.6, '#881337');
    portalGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = portalGrad;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.ellipse(0, 0, ep.w * 0.45, ep.h * 0.45, pTime * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private renderCollectibles(ctx: CanvasRenderingContext2D) {
    const time = performance.now() * 0.004;
    for (const c of this.level.collectibles) {
      if (c.collected) continue;
      const floatY = Math.sin(time + c.x * 0.05) * 5;
      const cy = c.y + floatY;

      if (c.type === 'coin') {
        // Gold Coin with square hole (Mon)
        ctx.fillStyle = '#eab308';
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(c.x, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#713f12';
        ctx.fillRect(c.x - 3, cy - 3, 6, 6);
      } else if (c.type === 'scroll') {
        // Ancient Ninjutsu Scroll with red ribbon
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        // Scroll body
        ctx.fillRect(c.x - 12, cy - 8, 24, 16);
        // Red seal
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(c.x - 4, cy - 8, 8, 16);
        ctx.shadowBlur = 0;
      } else if (c.type === 'diamond') {
        // Soul Gem
        ctx.fillStyle = '#c084fc';
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(c.x, cy - 12);
        ctx.lineTo(c.x + 9, cy);
        ctx.lineTo(c.x, cy + 12);
        ctx.lineTo(c.x - 9, cy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (c.type === 'health_potion') {
        // Gourd bottle
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(c.x, cy + 4, 8, 0, Math.PI * 2);
        ctx.arc(c.x, cy - 4, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);

    // Flashing if invulnerable
    if (p.invulnerableTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // IF DISGUISED: Render as ancient stone statue or wooden log
    if (p.disguised) {
      ctx.fillStyle = '#334155';
      // Stone guardian silhouette
      ctx.fillRect(-16, -24, 32, 48);
      // Moss top
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-14, -28, 28, 6);
      // Sleeping eyes (-)
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-8, -12, 5, 2);
      ctx.fillRect(3, -12, 5, 2);
      ctx.restore();
      return;
    }

    if (p.facing === -1) {
      ctx.scale(-1, 1);
    }

    // Eye color according to skin
    let eyeColor = '#38bdf8'; // Arashi cyan
    let scarfColor = '#dc2626'; // Red scarf
    if (this.stats.skin === 'crimson') {
      eyeColor = '#f43f5e';
      scarfColor = '#e11d48';
    } else if (this.stats.skin === 'ghost') {
      eyeColor = '#e2e8f0';
      scarfColor = '#64748b';
    } else if (this.stats.skin === 'golden') {
      eyeColor = '#fbbf24';
      scarfColor = '#d97706';
    }

    // Ninja Silhouette drawing in classic Arashi style
    ctx.fillStyle = '#050505';

    if (p.dashing) {
      // Dashing pose (sleek horizontal slice)
      ctx.fillRect(-22, -10, 44, 20);
      // Katana extended front
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(34, 0);
      ctx.stroke();
    } else if (p.slashing) {
      // Slashing pose
      // Torso & legs lunging
      ctx.fillRect(-12, -22, 24, 44);
      // Glowing katana arc
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.shadowColor = eyeColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(8, -4, 34, -Math.PI * 0.4, Math.PI * 0.35);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (p.isWallSliding) {
      // Wall slide pose (gripping wall with one hand, legs bent)
      ctx.fillRect(-10, -22, 20, 44);
      // Kunai gripping
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(10, -10, 8, 4);
    } else if (!p.isGrounded) {
      // Airborne somersault flip
      const rot = (performance.now() * 0.015) % (Math.PI * 2);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.crouching) {
      // Crouched pose
      ctx.fillRect(-14, 0, 28, 26);
    } else if (Math.abs(p.vx) > 0.5) {
      // Running animation
      const legOffset = Math.sin(p.runCycle) * 10;
      // Head & Torso leaning forward
      ctx.fillRect(-10, -26, 20, 26);
      // Legs
      ctx.fillRect(-12, 0, 8, 24 + legOffset);
      ctx.fillRect(4, 0, 8, 24 - legOffset);
    } else {
      // Idle breathing pose
      const breath = Math.sin(performance.now() * 0.004) * 1.5;
      // Head
      ctx.beginPath();
      ctx.arc(0, -20 + breath, 9, 0, Math.PI * 2);
      ctx.fill();
      // Torso
      ctx.fillRect(-11, -12 + breath, 22, 22);
      // Legs
      ctx.fillRect(-11, 10, 9, 18);
      ctx.fillRect(2, 10, 9, 18);
    }

    // Glowing Eyes slit
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(3, -22, 7, 3);
    ctx.shadowBlur = 0;

    // Fluttering Scarf trailing behind
    const scarfWave1 = Math.sin(performance.now() * 0.01) * 6;
    const scarfWave2 = Math.cos(performance.now() * 0.012) * 8;
    ctx.strokeStyle = scarfColor;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.quadraticCurveTo(-22, -18 + scarfWave1, -38, -12 + scarfWave2);
    ctx.stroke();

    ctx.restore();
  }

  private renderEnemies(ctx: CanvasRenderingContext2D) {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      ctx.save();
      ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);

      if (enemy.direction === -1) {
        ctx.scale(-1, 1);
      }

      if (enemy.state === 'hurt') {
        ctx.fillStyle = '#ef4444'; // Flash red on hurt
      } else {
        ctx.fillStyle = '#09090b'; // Pure black silhouette
      }

      if (enemy.type === 'boss_akumu') {
        // Massive Boss Demon Samurai
        // Demon horns
        ctx.beginPath();
        ctx.moveTo(-16, -34);
        ctx.lineTo(-24, -48);
        ctx.lineTo(-12, -38);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(16, -34);
        ctx.lineTo(24, -48);
        ctx.lineTo(12, -38);
        ctx.fill();

        // Towering Body & Armor
        ctx.fillRect(-22, -30, 44, 65);

        // Burning red aura
        const auraAlpha = 0.25 + Math.sin(performance.now() * 0.008) * 0.15;
        ctx.strokeStyle = `rgba(220, 38, 38, ${auraAlpha})`;
        ctx.lineWidth = 6;
        ctx.strokeRect(-25, -34, 50, 72);

        // Glowing red eyes
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillRect(4, -26, 9, 4);
        ctx.shadowBlur = 0;

        // Dual cursed Katanas
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(42, 20);
        ctx.moveTo(-18, 0);
        ctx.lineTo(-38, 20);
        ctx.stroke();
      } else if (enemy.type === 'archer') {
        // Archer with drawn bow
        ctx.fillRect(-10, -22, 20, 44);
        // Wooden bow
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(14, 0, 18, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();

        // Glowing orange eyes
        ctx.fillStyle = '#f97316';
        ctx.fillRect(2, -18, 6, 2.5);
      } else if (enemy.type === 'hound') {
        // Shadow Wolf Beast
        ctx.fillRect(-20, -10, 40, 20);
        // Head
        ctx.beginPath();
        ctx.moveTo(12, -12);
        ctx.lineTo(26, -2);
        ctx.lineTo(12, 6);
        ctx.fill();
        // Burning red eye
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(16, -6, 4, 3);
      } else {
        // Standard Guard & Spearman
        ctx.fillRect(-12, -22, 24, 44);
        // Weapon
        if (enemy.type === 'spearman') {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-4, 15);
          ctx.lineTo(34, -20);
          ctx.stroke();
        } else {
          // Curved sword
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(6, 4);
          ctx.lineTo(24, 16);
          ctx.stroke();
        }

        // Glowing orange eyes
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(3, -18, 6, 2.5);
      }

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      if (p.type === 'shuriken') {
        // Spinning four-pointed silver ninja star
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(performance.now() * 0.035);
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(-3, 0);
          ctx.lineTo(0, -9);
          ctx.lineTo(3, 0);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      } else if (p.type === 'enemy_arrow') {
        // Poison arrow
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 1.5, p.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        // Glowing tip
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      } else if (p.type === 'boss_blade_wave') {
        // Crimson sword energy wave
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 22, -Math.PI * 0.4, Math.PI * 0.4);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const pt of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.alpha * (pt.life / pt.maxLife));
      ctx.fillStyle = pt.color;

      if (pt.type === 'sakura') {
        // Drifting cherry blossom petal
        ctx.translate(pt.x, pt.y);
        if (pt.rotation) ctx.rotate(pt.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, pt.size, pt.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.type === 'slash_wave') {
        ctx.translate(pt.x, pt.y);
        if (pt.rotation) ctx.rotate(pt.rotation);
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, pt.size, -Math.PI * 0.35, Math.PI * 0.35);
        ctx.stroke();
      } else {
        // Blood or spark circle
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
