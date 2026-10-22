import React from 'react';
import {
  X,
  Clock,
  Skull,
  Coins,
  ArrowUp,
  Swords,
  Scroll,
  Trophy,
  Sparkles,
  Zap,
  Bird,
  Gem,
  Heart,
  Crown,
  Lock,
  Check,
  Timer,
} from 'lucide-react';
import { Language, LevelData, PlayerStats } from '../types/game';
import { getTranslation } from '../utils/translations';
import { S } from '../utils/format';
import { MetaProgress, ACHIEVEMENTS, AchievementId } from '../utils/achievements';

interface StatsModalProps {
  meta: MetaProgress;
  stats: PlayerStats;
  levels: LevelData[];
  lang: Language;
  onClose: () => void;
}

const ACH_ICONS: Record<AchievementId, React.ReactNode> = {
  first_win: <Trophy className="w-5 h-5" />,
  flawless: <Sparkles className="w-5 h-5" />,
  speedrun: <Zap className="w-5 h-5" />,
  treasure: <Coins className="w-5 h-5" />,
  bird: <Bird className="w-5 h-5" />,
  scholar: <Scroll className="w-5 h-5" />,
  slayer: <Swords className="w-5 h-5" />,
  wealthy: <Gem className="w-5 h-5" />,
  phoenix: <Heart className="w-5 h-5" />,
  master: <Crown className="w-5 h-5" />,
};

/** Stats & achievements screen (v1.2.0) — Persian digits via S.d. */
export const StatsModal: React.FC<StatsModalProps> = ({ meta, stats, levels, lang, onClose }) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';
  const unlocked = new Set(meta.achievements);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-lg max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg text-white">{trans.statsTitle}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-mono">
              {S.d(unlocked.size, lang)}/{S.d(ACHIEVEMENTS.length, lang)}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Lifetime stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <StatCard icon={<Clock className="w-4 h-4 text-sky-400" />} label={trans.statsPlaytime} value={S.duration(meta.playtime, lang)} />
            <StatCard icon={<Skull className="w-4 h-4 text-rose-400" />} label={trans.statsDeaths} value={S.d(meta.totalDeaths, lang)} />
            <StatCard icon={<Coins className="w-4 h-4 text-amber-400" />} label={trans.statsLifetimeCoins} value={S.d(meta.lifetimeCoins, lang)} />
            <StatCard icon={<ArrowUp className="w-4 h-4 text-emerald-400" />} label={trans.statsJumps} value={S.d(meta.totalJumps, lang)} />
            <StatCard icon={<Swords className="w-4 h-4 text-orange-400" />} label={trans.statsKills} value={S.d(meta.totalKills, lang)} />
            <StatCard icon={<Scroll className="w-4 h-4 text-cyan-400" />} label={trans.statsScrolls} value={S.d(meta.lifetimeScrolls, lang)} />
          </div>

          {/* Best times */}
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Timer className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-semibold text-zinc-200">{trans.statsBestTimes}</h4>
            </div>
            <div className="space-y-1.5">
              {levels.map((lvl) => {
                const best = meta.bestTimes[lvl.id];
                return (
                  <div key={lvl.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      {trans.levelShort} {S.d(lvl.id, lang)} · {lang === 'fa' ? lvl.titleFa : lvl.titleEn}
                    </span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        best ? 'text-sky-400' : 'text-zinc-600'
                      }`}
                    >
                      {best ? S.time(best, lang) : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
            {Object.keys(meta.bestTimes).length === 0 && (
              <p className="text-[11px] text-zinc-600 mt-2">{trans.statsNoRecord}</p>
            )}
          </div>

          {/* Achievements */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-200 mb-3">{trans.achievementsTitle}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ACHIEVEMENTS.map(({ id }) => {
                const isUnlocked = unlocked.has(id);
                const text = trans.achievements[id];
                return (
                  <div
                    key={id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      isUnlocked
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-zinc-900/40 border-zinc-800/60 opacity-70'
                    }`}
                  >
                    <div
                      className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border ${
                        isUnlocked
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : 'bg-zinc-800/60 border-zinc-700 text-zinc-600'
                      }`}
                    >
                      {isUnlocked ? ACH_ICONS[id] : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold truncate ${isUnlocked ? 'text-amber-300' : 'text-zinc-400'}`}>
                          {text.name}
                        </span>
                        {isUnlocked && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{text.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer note about save data */}
          <p className="text-center text-[10px] text-zinc-700 font-mono">
            {stats.levelsCompleted.length > 0
              ? `${S.d(stats.levelsCompleted.length, lang)}/${S.d(levels.length, lang)} ${trans.statsTitle}`
              : ''}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition-colors"
          >
            {trans.close}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3">
    <div className="flex items-center gap-2 text-zinc-500 mb-1">
      {icon}
      <span className="text-[10px] leading-tight">{label}</span>
    </div>
    <span className="text-lg font-bold text-zinc-100 font-mono tabular-nums">{value}</span>
  </div>
);
