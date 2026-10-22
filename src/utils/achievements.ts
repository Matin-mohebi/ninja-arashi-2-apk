/**
 * Persistent "meta" progress (v1.2.0) — lifetime statistics + achievements.
 *
 * Stored under its own localStorage key (`ninja_arashi_2_meta_v1`) so the
 * legacy save object (`ninja_arashi_2_save_v1`) keeps its exact shape —
 * old saves merge trivially (missing meta fields fall back to defaults)
 * and nothing can corrupt skin/upgrade persistence.
 */
import { PlayerStats } from '../types/game';

export interface MetaProgress {
  /** levelId -> best clear time in seconds. */
  bestTimes: Record<number, number>;
  totalDeaths: number;
  /** Coins ever earned (lifetime, not current balance). */
  lifetimeCoins: number;
  totalJumps: number;
  /** Accumulated seconds played. */
  playtime: number;
  /** Scrolls ever picked up (lifetime). */
  lifetimeScrolls: number;
  totalKills: number;
  /** Unlocked achievement ids. */
  achievements: string[];
}

export const META_KEY = 'ninja_arashi_2_meta_v1';

export const DEFAULT_META: MetaProgress = {
  bestTimes: {},
  totalDeaths: 0,
  lifetimeCoins: 0,
  totalJumps: 0,
  playtime: 0,
  lifetimeScrolls: 0,
  totalKills: 0,
  achievements: [],
};

/** Merge-safe load: unknown/old payloads fall back to per-field defaults. */
export function loadMeta(): MetaProgress {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { ...DEFAULT_META, bestTimes: {}, achievements: [] };
    const parsed = JSON.parse(raw) as Partial<MetaProgress>;
    return {
      ...DEFAULT_META,
      ...parsed,
      bestTimes: { ...(parsed.bestTimes || {}) },
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    };
  } catch {
    return { ...DEFAULT_META, bestTimes: {}, achievements: [] };
  }
}

export function saveMeta(meta: MetaProgress) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // quota / private mode — non-fatal
  }
}

// ----------------------------------------------------------------- achievements

export type AchievementId =
  | 'first_win'
  | 'flawless'
  | 'speedrun'
  | 'treasure'
  | 'bird'
  | 'scholar'
  | 'slayer'
  | 'wealthy'
  | 'phoenix'
  | 'master';

export interface AchievementDef {
  id: AchievementId;
  /** lucide-react icon key mapped in the UI components. */
  icon: 'trophy' | 'sparkles' | 'zap' | 'coins' | 'bird' | 'scroll' | 'swords' | 'gem' | 'heart' | 'crown';
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_win', icon: 'trophy' },
  { id: 'flawless', icon: 'sparkles' },
  { id: 'speedrun', icon: 'zap' },
  { id: 'treasure', icon: 'coins' },
  { id: 'bird', icon: 'bird' },
  { id: 'scholar', icon: 'scroll' },
  { id: 'slayer', icon: 'swords' },
  { id: 'wealthy', icon: 'gem' },
  { id: 'phoenix', icon: 'heart' },
  { id: 'master', icon: 'crown' },
];

/** Optional per-evaluation context (e.g. info about the run that just ended). */
export interface AchievementCtx {
  /** Deaths that happened during the run that just completed. */
  lastRunDeaths?: number;
}

type Condition = (meta: MetaProgress, stats: PlayerStats, ctx: AchievementCtx) => boolean;

const CONDITIONS: Record<AchievementId, Condition> = {
  first_win: (_m, s) => s.levelsCompleted.length >= 1,
  flawless: (_m, _s, ctx) => ctx.lastRunDeaths === 0,
  speedrun: (m) => Object.values(m.bestTimes).some((t) => t > 0 && t < 60),
  treasure: (m) => m.lifetimeCoins >= 150,
  bird: (m) => m.totalJumps >= 300,
  scholar: (m) => m.lifetimeScrolls >= 9,
  slayer: (m) => m.totalKills >= 40,
  wealthy: (_m, s) => s.coins >= 300,
  phoenix: (m) => m.totalDeaths >= 10,
  master: (_m, s) => [1, 2, 3, 4].every((id) => s.levelsCompleted.includes(id)),
};

/**
 * Returns the ids of achievements that are newly satisfied (not already
 * persisted in meta.achievements). Caller persists them + shows toasts.
 */
export function evaluateAchievements(meta: MetaProgress, stats: PlayerStats, ctx: AchievementCtx = {}): AchievementId[] {
  const have = new Set(meta.achievements);
  const out: AchievementId[] = [];
  for (const { id } of ACHIEVEMENTS) {
    if (have.has(id)) continue;
    try {
      if (CONDITIONS[id](meta, stats, ctx)) out.push(id);
    } catch {
      // a broken condition must never break gameplay
    }
  }
  return out;
}
