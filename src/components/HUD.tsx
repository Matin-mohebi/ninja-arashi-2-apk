import React from 'react';
import { Volume2, VolumeX, Pause, RotateCcw, Heart, Sparkles, Scroll, Coins } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';

interface HUDProps {
  hp: number;
  maxHp: number;
  shurikens: number;
  shurikensMax: number;
  shurikenRechargePct: number;
  dashCooldownPct: number; // 0 to 1 (1 = ready)
  isDisguised: boolean;
  disguisePct: number; // 0 to 1
  coins: number;
  diamonds: number;
  scrolls: number;
  levelTitle: string;
  isMuted: boolean;
  lang: Language;
  bossHp?: { current: number; max: number };
  onPause: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  hp,
  maxHp,
  shurikens,
  shurikensMax,
  shurikenRechargePct,
  dashCooldownPct,
  isDisguised,
  disguisePct,
  coins,
  diamonds,
  scrolls,
  levelTitle,
  isMuted,
  lang,
  bossHp,
  onPause,
  onRestart,
  onToggleMute,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className={`absolute inset-x-0 top-0 pointer-events-none p-3 sm:p-4 safe-h safe-v select-none ${
        isRtl ? 'font-sans' : 'font-sans'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Bar Status */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Health Hearts & Ninja Powers */}
        <div className="flex items-center gap-3 sm:gap-4 bg-zinc-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-zinc-800/80 shadow-2xl pointer-events-auto">
          {/* Health Hearts */}
          <div className="flex items-center gap-1">
            {Array.from({ length: maxHp }).map((_, i) => (
              <div
                key={i}
                className={`transition-transform duration-300 ${
                  i < hp ? 'scale-100 text-rose-500' : 'scale-90 text-zinc-700'
                }`}
              >
                <Heart
                  className="w-5 h-5 fill-current drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                />
              </div>
            ))}
          </div>

          <div className="h-5 w-px bg-zinc-800" />

          {/* Shurikens */}
          <div className="flex items-center gap-1.5" title="Shurikens">
            <span className="text-zinc-400 text-xs font-mono">✦</span>
            <span className="text-sm font-semibold text-zinc-200 tabular-nums">
              {shurikens}/{shurikensMax}
            </span>
            {shurikenRechargePct < 1 && (
              <div className="w-8 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-100"
                  style={{ width: `${shurikenRechargePct * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-zinc-800" />

          {/* Dash Ready Indicator */}
          <div className="flex items-center gap-1" title="Phantom Dash">
            <span className="text-xs text-zinc-400">DASH</span>
            <div className="w-10 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-100 ${
                  dashCooldownPct >= 1 ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-zinc-600'
                }`}
                style={{ width: `${dashCooldownPct * 100}%` }}
              />
            </div>
          </div>

          {/* Disguise Active Indicator */}
          {isDisguised && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-medium animate-pulse">
              <span>{isRtl ? 'استتار فعال' : 'DISGUISED'}</span>
              <span className="font-mono">{Math.ceil(disguisePct * 100)}%</span>
            </div>
          )}
        </div>

        {/* Center: Level Title */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-sm font-bold tracking-wider text-zinc-200 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {levelTitle}
          </span>
        </div>

        {/* Right: Collectibles & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Collectibles Pill */}
          <div className="flex items-center gap-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 shadow-2xl text-xs font-medium">
            {/* Coins */}
            <div className="flex items-center gap-1 text-amber-400">
              <Coins className="w-4 h-4" />
              <span className="font-mono tabular-nums">{coins}</span>
            </div>

            {/* Diamonds */}
            <div className="flex items-center gap-1 text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span className="font-mono tabular-nums">{diamonds}</span>
            </div>

            {/* Ancient Scrolls */}
            <div className="flex items-center gap-1 text-cyan-400">
              <Scroll className="w-4 h-4" />
              <span className="font-mono tabular-nums">{scrolls}/3</span>
            </div>
          </div>

          {/* Action buttons */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onRestart}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"
            title={trans.restart}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-lg"
            title={trans.pause}
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Menacing Boss Health Bar (When in Boss Level) */}
      {bossHp && bossHp.current > 0 && (
        <div className="mt-4 flex flex-col items-center max-w-lg mx-auto pointer-events-auto">
          <div className="flex items-center justify-between w-full text-xs font-bold text-rose-400 tracking-wider mb-1 px-1 drop-shadow">
            <span>{trans.bossHp}</span>
            <span className="font-mono tabular-nums">
              {bossHp.current} / {bossHp.max}
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-950/90 rounded-full border border-red-900/80 overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.4)]">
            <div
              className="h-full bg-gradient-to-r from-red-700 via-rose-500 to-red-600 transition-all duration-150"
              style={{ width: `${Math.max(0, (bossHp.current / bossHp.max) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
