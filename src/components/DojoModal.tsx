import React, { useEffect, useState } from 'react';
import { X, Sword, Sparkles, Zap, Shield, Heart, Coins, ArrowUpRight, Check } from 'lucide-react';
import { PlayerSkin, PlayerStats, Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { SKINS, SKIN_ORDER, qualifiedSkins } from '../utils/skins';
import { S } from '../utils/format';
import { sounds } from '../audio/soundManager';

interface DojoModalProps {
  stats: PlayerStats;
  lang: Language;
  onUpdateStats: (newStats: PlayerStats) => void;
  onClose: () => void;
  dojoBgUrl?: string;
}

/** Per-skin flavor text + card theming (keys mirror PlayerSkin). */
const SKIN_DESC_FA: Record<PlayerSkin, string> = {
  arashi: 'شینوبی افسانه‌ای با چشمان آبی و شال سرخ',
  crimson: 'فرمانده سایه‌های سرخ با شمشیر خونین',
  ghost: 'روح انتقام‌جوی رونین با چشمان نقره‌ای',
  golden: 'استاد باستانی با هاله زرین خورشید',
  frost: 'شینوبی یخی با رد بلورهای سرد',
  ember: 'شعلهٔ کوه آتشین با جرقه‌های آتش',
  void: 'سایهٔ بنفش مه‌آلود از دنیای دیگر',
};
const SKIN_DESC_EN: Record<PlayerSkin, string> = {
  arashi: 'Legendary shadow shinobi with cyan gaze',
  crimson: 'Scarlet phantom bathed in the blood moon',
  ghost: 'Vengeful ronin spirit walking between realms',
  golden: 'Ancient clan master blessed by solar embers',
  frost: 'Glacial shinobi trailing cold crystal shards',
  ember: 'Living flame leaving fire sparks behind',
  void: 'Violet wraith bleeding mist from the void',
};
const SKIN_COLOR: Record<PlayerSkin, { colorClass: string }> = {
  arashi: { colorClass: 'border-cyan-500/50 bg-cyan-950/20' },
  crimson: { colorClass: 'border-rose-500/50 bg-rose-950/20' },
  ghost: { colorClass: 'border-slate-400/50 bg-slate-900/30' },
  golden: { colorClass: 'border-amber-400/50 bg-amber-950/20' },
  frost: { colorClass: 'border-sky-300/50 bg-sky-950/30' },
  ember: { colorClass: 'border-orange-500/50 bg-orange-950/20' },
  void: { colorClass: 'border-purple-500/50 bg-purple-950/30' },
};

export const DojoModal: React.FC<DojoModalProps> = ({
  stats,
  lang,
  onUpdateStats,
  onClose,
  dojoBgUrl,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';
  const [activeTab, setActiveTab] = useState<'skills' | 'skins'>('skills');

  // Upgrade costs
  const UPGRADE_COSTS = {
    katana: [0, 80, 160, 260, 400],
    shuriken: [0, 60, 140, 240, 360],
    dash: [0, 70, 150, 250, 380],
    disguise: [0, 60, 130, 220, 340],
    health: [0, 100, 200, 350, 500],
  };

  const totalScrolls = Object.values(stats.levelStars).reduce((a, b) => a + b, 0);

  // Persistent skin unlocks: once earned (coins OR scrolls threshold), a skin
  // stays unlocked forever. Previously the check used the live coin balance,
  // so spending coins re-locked already-owned skins.
  const unlockedSkins: PlayerSkin[] =
    stats.unlockedSkins && stats.unlockedSkins.length > 0 ? stats.unlockedSkins : ['arashi'];
  // Promote any newly-qualified skin into the persistent unlock list.
  // (Self-terminating: after the update, `missing` is empty so no loop.)
  useEffect(() => {
    const qualified = qualifiedSkins(stats.coins, totalScrolls);
    const missing = qualified.filter((s) => !unlockedSkins.includes(s));
    if (missing.length > 0) {
      onUpdateStats({ ...stats, unlockedSkins: [...unlockedSkins, ...missing] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.coins, totalScrolls]);

  const upgradeSkill = (skill: keyof PlayerStats['upgrades']) => {
    const currentLvl = stats.upgrades[skill];
    if (currentLvl >= 5) return;
    const cost = UPGRADE_COSTS[skill][currentLvl];

    if (stats.coins < cost) {
      sounds.playClash();
      return;
    }

    const updated = { ...stats };
    updated.coins -= cost;
    updated.upgrades[skill] = currentLvl + 1;

    // Apply stat benefits
    if (skill === 'katana') {
      updated.katanaDamage = 18 + (updated.upgrades.katana - 1) * 6;
    } else if (skill === 'shuriken') {
      updated.shurikensMax = 3 + Math.floor((updated.upgrades.shuriken - 1) * 0.8);
      updated.shurikenRechargeTime = Math.max(1.2, 3.0 - (updated.upgrades.shuriken - 1) * 0.4);
    } else if (skill === 'dash') {
      updated.dashCooldown = Math.max(1.5, 3.2 - (updated.upgrades.dash - 1) * 0.4);
    } else if (skill === 'disguise') {
      updated.disguiseDuration = 4.0 + (updated.upgrades.disguise - 1) * 1.0;
    } else if (skill === 'health') {
      updated.maxHp = 3 + (updated.upgrades.health - 1);
      updated.hp = updated.maxHp;
    }

    sounds.playSecret();
    onUpdateStats(updated);
  };

  const equipSkin = (skinId: PlayerSkin) => {
    if (!unlockedSkins.includes(skinId)) {
      sounds.playClash();
      return;
    }
    sounds.playCoin();
    onUpdateStats({ ...stats, skin: skinId });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header with background aesthetic */}
        <div className="relative p-6 border-b border-zinc-800/80 overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900">
          {dojoBgUrl && (
            <img
              src={dojoBgUrl}
              alt="Dojo Background"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            />
          )}

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Sword className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                  {trans.dojo}
                </h2>
                <p className="text-xs text-zinc-400">{trans.gameSubtitle}</p>
              </div>
            </div>

            {/* Balances */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400 text-sm font-semibold">
                <Coins className="w-4 h-4" />
                <span className="font-mono tabular-nums">{stats.coins}</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-purple-400 text-sm font-semibold">
                <Sparkles className="w-4 h-4" />
                <span className="font-mono tabular-nums">{stats.diamonds}</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="relative z-10 flex items-center gap-2 mt-4 pt-2 border-t border-zinc-800/60">
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'skills'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {isRtl ? 'مهارت‌ها و فنون رزمی' : 'Skills & Ninjutsu'}
            </button>
            <button
              onClick={() => setActiveTab('skins')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'skins'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {trans.skinsTitle}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'skills' && (
            <div className="space-y-3">
              {/* 1. Katana */}
              <SkillCard
                icon={<Sword className="w-5 h-5 text-rose-400" />}
                title={trans.katanaUpgrade}
                desc={trans.katanaDesc}
                level={stats.upgrades.katana}
                cost={UPGRADE_COSTS.katana[stats.upgrades.katana] || 0}
                canAfford={stats.coins >= (UPGRADE_COSTS.katana[stats.upgrades.katana] || 0)}
                isMax={stats.upgrades.katana >= 5}
                statLabel={`${stats.katanaDamage} DMG`}
                onUpgrade={() => upgradeSkill('katana')}
                trans={trans}
              />

              {/* 2. Shurikens */}
              <SkillCard
                icon={<Sparkles className="w-5 h-5 text-cyan-400" />}
                title={trans.shurikenUpgrade}
                desc={trans.shurikenDesc}
                level={stats.upgrades.shuriken}
                cost={UPGRADE_COSTS.shuriken[stats.upgrades.shuriken] || 0}
                canAfford={stats.coins >= (UPGRADE_COSTS.shuriken[stats.upgrades.shuriken] || 0)}
                isMax={stats.upgrades.shuriken >= 5}
                statLabel={`${stats.shurikensMax} Stars · ${(stats.shurikenRechargeTime).toFixed(1)}s`}
                onUpgrade={() => upgradeSkill('shuriken')}
                trans={trans}
              />

              {/* 3. Phantom Dash */}
              <SkillCard
                icon={<Zap className="w-5 h-5 text-sky-400" />}
                title={trans.dashUpgrade}
                desc={trans.dashDesc}
                level={stats.upgrades.dash}
                cost={UPGRADE_COSTS.dash[stats.upgrades.dash] || 0}
                canAfford={stats.coins >= (UPGRADE_COSTS.dash[stats.upgrades.dash] || 0)}
                isMax={stats.upgrades.dash >= 5}
                statLabel={`${stats.dashCooldown.toFixed(1)}s CD`}
                onUpgrade={() => upgradeSkill('dash')}
                trans={trans}
              />

              {/* 4. Kawarimi Disguise */}
              <SkillCard
                icon={<Shield className="w-5 h-5 text-emerald-400" />}
                title={trans.disguiseUpgrade}
                desc={trans.disguiseDesc}
                level={stats.upgrades.disguise}
                cost={UPGRADE_COSTS.disguise[stats.upgrades.disguise] || 0}
                canAfford={stats.coins >= (UPGRADE_COSTS.disguise[stats.upgrades.disguise] || 0)}
                isMax={stats.upgrades.disguise >= 5}
                statLabel={`${stats.disguiseDuration.toFixed(1)}s Stealth`}
                onUpgrade={() => upgradeSkill('disguise')}
                trans={trans}
              />

              {/* 5. Health */}
              <SkillCard
                icon={<Heart className="w-5 h-5 text-rose-500 fill-current" />}
                title={trans.healthUpgrade}
                desc={trans.healthDesc}
                level={stats.upgrades.health}
                cost={UPGRADE_COSTS.health[stats.upgrades.health] || 0}
                canAfford={stats.coins >= (UPGRADE_COSTS.health[stats.upgrades.health] || 0)}
                isMax={stats.upgrades.health >= 5}
                statLabel={`${stats.maxHp} Hearts`}
                onUpgrade={() => upgradeSkill('health')}
                trans={trans}
              />
            </div>
          )}

          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SKIN_ORDER.map((skinId) => {
                const def = SKINS[skinId];
                return (
                  <SkinCard
                    key={skinId}
                    id={skinId}
                    name={trans[`skin${skinId.charAt(0).toUpperCase()}${skinId.slice(1)}` as keyof typeof trans] as string}
                    desc={isRtl ? SKIN_DESC_FA[skinId] : SKIN_DESC_EN[skinId]}
                    colorClass={SKIN_COLOR[skinId].colorClass}
                    glowColor={def.eye}
                    isEquipped={stats.skin === skinId}
                    isUnlocked={unlockedSkins.includes(skinId)}
                    unlockText={
                      def.minCoins > 0
                        ? `${S.d(def.minCoins, lang)} ${isRtl ? 'سکه' : 'Coins'} ${isRtl ? 'یا' : 'or'} ${S.d(def.minScrolls, lang)} ${isRtl ? 'طومار' : 'Scrolls'}`
                        : undefined
                    }
                    onEquip={() => equipSkin(skinId)}
                    trans={trans}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-sm transition-colors"
          >
            {trans.close}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SkillCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  level: number;
  cost: number;
  canAfford: boolean;
  isMax: boolean;
  statLabel: string;
  onUpgrade: () => void;
  trans: ReturnType<typeof getTranslation>;
}

const SkillCard: React.FC<SkillCardProps> = ({
  icon,
  title,
  desc,
  level,
  cost,
  canAfford,
  isMax,
  statLabel,
  onUpgrade,
  trans,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-zinc-800/90 border border-zinc-700 shrink-0">
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-zinc-100">{title}</h3>
            {/* Level pips */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <div
                  key={lvl}
                  className={`w-2 h-2 rounded-full ${
                    lvl <= level ? 'bg-amber-400' : 'bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-400 font-mono">({statLabel})</span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
        {!isMax ? (
          <button
            onClick={onUpgrade}
            disabled={!canAfford}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              canAfford
                ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-95'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{cost}</span>
            <span>{trans.upgradeBtn}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Check className="w-3.5 h-3.5" />
            <span>{trans.maxLevel}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface SkinCardProps {
  id: string;
  name: string;
  desc: string;
  colorClass: string;
  glowColor: string;
  isEquipped: boolean;
  isUnlocked: boolean;
  unlockText?: string;
  onEquip: () => void;
  trans: ReturnType<typeof getTranslation>;
}

const SkinCard: React.FC<SkinCardProps> = ({
  name,
  desc,
  colorClass,
  glowColor,
  isEquipped,
  isUnlocked,
  unlockText,
  onEquip,
  trans,
}) => {
  return (
    <div className={`p-4 rounded-xl border ${colorClass} flex flex-col justify-between gap-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full bg-black border-2 flex items-center justify-center relative shadow-lg"
            style={{ borderColor: glowColor }}
          >
            {/* Glowing slit */}
            <div
              className="w-4 h-1 rounded-full shadow-[0_0_8px_currentColor]"
              style={{ backgroundColor: glowColor, color: glowColor }}
            />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-zinc-100">{name}</h4>
            <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
        {isUnlocked ? (
          isEquipped ? (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <Check className="w-4 h-4" />
              <span>{trans.equipped}</span>
            </div>
          ) : (
            <button
              onClick={onEquip}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
            >
              {trans.equip}
            </button>
          )
        ) : (
          <span className="text-xs text-zinc-500 font-mono">{unlockText || trans.locked}</span>
        )}
      </div>
    </div>
  );
};
