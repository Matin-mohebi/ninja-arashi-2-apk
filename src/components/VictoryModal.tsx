import React from 'react';
import { Star, RotateCcw, ArrowRight, Home, Scroll, Coins, Skull, Clock } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { sounds } from '../audio/soundManager';

interface VictoryModalProps {
  levelId: number;
  stats: { time: number; scrolls: number; kills: number };
  coinsEarned: number;
  lang: Language;
  onNextLevel: () => void;
  onRestart: () => void;
  onHome: () => void;
  hasNextLevel: boolean;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  stats,
  coinsEarned,
  lang,
  onNextLevel,
  onRestart,
  onHome,
  hasNextLevel,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  // Stars calculation (1 star = completed, 2 stars = 2+ scrolls, 3 stars = 3 scrolls)
  const stars = stats.scrolls >= 3 ? 3 : stats.scrolls >= 1 ? 2 : 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        {/* Victory crest / Torii seal */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)] mb-4">
          <Star className="w-8 h-8 fill-amber-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {trans.victory}
        </h2>
        <p className="text-xs text-zinc-400 mt-1">{trans.victoryDesc}</p>

        {/* Stars */}
        <div className="flex items-center justify-center gap-3 my-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`transition-all duration-500 ${
                s <= stars ? 'scale-110 text-amber-400' : 'scale-90 text-zinc-800'
              }`}
            >
              <Star
                className={`w-8 h-8 ${s <= stars ? 'fill-amber-400 drop-shadow-[0_0_12px_#f59e0b]' : ''}`}
              />
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Scroll className="w-4 h-4 text-cyan-400" />
              <span>{trans.scrollsFound}</span>
            </div>
            <span className="font-mono font-bold text-cyan-400 tabular-nums">
              {stats.scrolls} / 3
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{trans.coinsCollected}</span>
            </div>
            <span className="font-mono font-bold text-amber-400 tabular-nums">
              +{coinsEarned}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-400" />
              <span>{trans.enemiesSlain}</span>
            </div>
            <span className="font-mono font-bold text-rose-400 tabular-nums">
              {stats.kills}
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>{trans.clearTime}</span>
            </div>
            <span className="font-mono font-bold text-sky-400 tabular-nums">
              {stats.time} {trans.seconds}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          {hasNextLevel ? (
            <button
              onClick={() => {
                sounds.playSlash();
                onNextLevel();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(225,29,72,0.5)] transition-all active:scale-95"
            >
              <span>{trans.nextLevel}</span>
              <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playCoin();
                onHome();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>{trans.mainMenu}</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playSlash();
                onRestart();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{trans.restart}</span>
            </button>

            <button
              onClick={() => {
                sounds.playCoin();
                onHome();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{trans.mainMenu}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
