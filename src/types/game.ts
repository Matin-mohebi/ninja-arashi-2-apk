export type GameState =
  | 'TITLE_MENU'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'PAUSED'
  | 'ROUND_SUMMARY'
  | 'GAME_OVER'
  | 'DOJO';

export type Language = 'fa' | 'en';

export interface PlayerStats {
  maxHp: number;
  hp: number;
  shurikensMax: number;
  shurikens: number;
  shurikenRechargeTime: number; // in seconds
  katanaDamage: number;
  dashCooldown: number; // in seconds
  disguiseDuration: number; // in seconds
  coins: number;
  diamonds: number;
  skin: 'arashi' | 'crimson' | 'ghost' | 'golden';
  levelsCompleted: number[];
  levelStars: Record<number, number>; // level index -> stars (1-3)
  upgrades: {
    katana: number; // 1 to 5
    shuriken: number;
    dash: number;
    disguise: number;
    health: number;
  };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Platform extends Rect {
  type: 'solid' | 'one_way' | 'breakable' | 'bamboo';
  health?: number;
  secretReveal?: boolean;
}

export interface Trap {
  id: string;
  type: 'spikes' | 'swinging_blade' | 'dart_shooter' | 'falling_spikes';
  x: number;
  y: number;
  w: number;
  h: number;
  // For swinging blade
  anchorX?: number;
  anchorY?: number;
  length?: number;
  angle?: number;
  speed?: number;
  // For dart shooter
  direction?: 'left' | 'right';
  cooldown?: number;
  timer?: number;
  // For falling spikes
  fallen?: boolean;
  vy?: number;
}

export type EnemyType = 'guard' | 'archer' | 'spearman' | 'hound' | 'boss_akumu';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  direction: 1 | -1;
  patrolMinX: number;
  patrolMaxX: number;
  state: 'patrol' | 'alert' | 'attack' | 'hurt' | 'dead';
  attackTimer: number;
  attackCooldown: number;
  detectionRange: number;
  isGrounded: boolean;
  bossPhase?: number;
  teleportTimer?: number;
}

export interface Projectile {
  id: string;
  type: 'shuriken' | 'enemy_arrow' | 'boss_blade_wave';
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  fromPlayer: boolean;
  life: number;
  maxLife: number;
  stuck?: boolean;
}

export interface Collectible {
  id: string;
  type: 'coin' | 'scroll' | 'diamond' | 'health_potion';
  x: number;
  y: number;
  collected: boolean;
  floatOffset?: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  activated: boolean;
}

export interface SecretWall {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  broken: boolean;
}

export interface LevelData {
  id: number;
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  subtitleEn: string;
  worldWidth: number;
  worldHeight: number;
  spawnPoint: { x: number; y: number };
  exitPortal: { x: number; y: number; w: number; h: number };
  platforms: Platform[];
  traps: Trap[];
  enemies: Enemy[];
  collectibles: Collectible[];
  checkpoints: Checkpoint[];
  secretWalls: SecretWall[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type?: 'blood' | 'spark' | 'smoke' | 'sakura' | 'slash_wave';
  rotation?: number;
  vRot?: number;
}
