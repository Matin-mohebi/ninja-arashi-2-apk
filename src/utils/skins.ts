/**
 * Central skin registry — single source of truth for visuals (engine trails,
 * eye/scarf colors) and unlock thresholds (DojoModal auto-promotion).
 */
import { PlayerSkin } from '../types/game';

export interface SkinDef {
  id: PlayerSkin;
  nameFa: string;
  nameEn: string;
  /** Silhouette accent = glowing eye color. */
  eye: string;
  /** Scarf / trailing ribbon color. */
  scarf: string;
  /** Ambient trail particle color (dash ghosts + wisps). */
  trail: string;
  /** Second trail color for variety. */
  trail2: string;
  /** Unlock thresholds — a skin unlocks at coins >= minCoins OR lifetime scrolls >= minScrolls. */
  minCoins: number;
  minScrolls: number;
}

export const SKINS: Record<PlayerSkin, SkinDef> = {
  arashi: {
    id: 'arashi',
    nameFa: 'آراشی اصیل',
    nameEn: 'Original Arashi',
    eye: '#38bdf8',
    scarf: '#dc2626',
    trail: '#38bdf8',
    trail2: '#7dd3fc',
    minCoins: 0,
    minScrolls: 0,
  },
  crimson: {
    id: 'crimson',
    nameFa: 'شبح سرخ',
    nameEn: 'Crimson Ghost',
    eye: '#f43f5e',
    scarf: '#e11d48',
    trail: '#f43f5e',
    trail2: '#fb7185',
    minCoins: 80,
    minScrolls: 2,
  },
  ghost: {
    id: 'ghost',
    nameFa: 'رونین نقره‌ای',
    nameEn: 'Silver Ronin',
    eye: '#e2e8f0',
    scarf: '#64748b',
    trail: '#cbd5e1',
    trail2: '#f1f5f9',
    minCoins: 180,
    minScrolls: 4,
  },
  golden: {
    id: 'golden',
    nameFa: 'استاد زرین',
    nameEn: 'Golden Shinobi',
    eye: '#fbbf24',
    scarf: '#d97706',
    trail: '#fbbf24',
    trail2: '#fde68a',
    minCoins: 300,
    minScrolls: 6,
  },
  frost: {
    id: 'frost',
    nameFa: 'یخ',
    nameEn: 'Frost',
    eye: '#7dd3fc',
    scarf: '#0ea5e9',
    trail: '#a5f3fc',
    trail2: '#67e8f9',
    minCoins: 380,
    minScrolls: 8,
  },
  ember: {
    id: 'ember',
    nameFa: 'اخگر',
    nameEn: 'Ember',
    eye: '#fb923c',
    scarf: '#ea580c',
    trail: '#fb923c',
    trail2: '#fdba74',
    minCoins: 450,
    minScrolls: 10,
  },
  void: {
    id: 'void',
    nameFa: 'سایهٔ بنفش',
    nameEn: 'Void',
    eye: '#c084fc',
    scarf: '#7e22ce',
    trail: '#c084fc',
    trail2: '#a855f7',
    minCoins: 550,
    minScrolls: 12,
  },
};

/** Ordered list for UI display. */
export const SKIN_ORDER: PlayerSkin[] = [
  'arashi',
  'crimson',
  'ghost',
  'golden',
  'frost',
  'ember',
  'void',
];

/**
 * Skins the current stats qualify for (coins OR lifetime-scroll thresholds).
 * Mirrors the auto-promotion pattern in DojoModal.
 */
export function qualifiedSkins(coins: number, totalScrolls: number): PlayerSkin[] {
  return SKIN_ORDER.filter(
    (id) => coins >= SKINS[id].minCoins || totalScrolls >= SKINS[id].minScrolls
  );
}
