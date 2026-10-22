import React from 'react';
import { ArrowLeft, Star, Lock, Play, Scroll } from 'lucide-react';
import { LevelData, PlayerStats, Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { sounds } from '../audio/soundManager';

interface LevelSelectProps {
  levels: LevelData[];
  stats: PlayerStats;
  lang: Language;
  onSelectLevel: (lvlId: number) => void;
  onBack: () => void;
  bgUrl?: string;
}

export const LevelSelect: React.FC<LevelSelectProps> = ({
  levels,
  stats,
  lang,
  onSelectLevel,
  onBack,
  bgUrl,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className="relative w-full h-full min-h-screen flex flex-col justify-between p-4 sm:p-8 bg-zinc-950 text-zinc-100 select-none overflow-y-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt="Level Select Background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
        />
      )}

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <button
          onClick={() => { sounds.playCoin(); onBack(); }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{trans.mainMenu}</span>
        </button>

        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
            {trans.levels}
          </h1>
          <p className="text-xs text-zinc-400">{trans.gameSubtitle}</p>
        </div>

        <div className="w-24" /> {/* Spacer */}
      </div>

      {/* Level Cards Grid */}
      <div className="relative z-10 max-w-5xl mx-auto w-full my-auto py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {levels.map((lvl) => {
          const isUnlocked = lvl.id === 1 || stats.levelsCompleted.includes(lvl.id - 1);
          const starsEarned = stats.levelStars[lvl.id] || 0;
          const isCompleted = stats.levelsCompleted.includes(lvl.id);

          return (
            <div
              key={lvl.id}
              className={`relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-2xl ${
                isUnlocked
                  ? 'bg-zinc-900/85 border-zinc-700/80 hover:border-zinc-500 hover:-translate-y-1'
                  : 'bg-zinc-950/60 border-zinc-900 opacity-65'
              }`}
            >
              {/* Card Header & Badge */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    {lang === 'fa' ? lvl.subtitleFa : lvl.subtitleEn}
                  </span>
                  {/* Stars */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= starsEarned
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-zinc-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-zinc-100">
                  {lang === 'fa' ? lvl.titleFa : lvl.titleEn}
                </h3>

                <div className="flex items-center gap-3 mt-4 text-xs text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Scroll className="w-3.5 h-3.5 text-cyan-400" />
                    <span>3 {isRtl ? 'طومار کهن' : 'Scrolls'}</span>
                  </div>
                  {lvl.id === 3 && (
                    <span className="text-rose-400 font-semibold">
                      {isRtl ? 'نبرد باس آکومو' : 'Boss: Akumu'}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom Action */}
              <div className="p-4 bg-zinc-950/70 border-t border-zinc-800/80 flex items-center justify-between">
                {isUnlocked ? (
                  <button
                    onClick={() => {
                      sounds.playSlash();
                      onSelectLevel(lvl.id);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-colors shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isCompleted ? trans.continue : trans.play}</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-center gap-2 py-2.5 text-zinc-500 text-sm font-medium">
                    <Lock className="w-4 h-4" />
                    <span>{isRtl ? 'مرحله قفل است' : 'Locked'}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 text-center text-xs text-zinc-500 py-2">
        <span>Ninja Arashi 2 tribute edition · 60 FPS HTML5 Canvas</span>
      </div>
    </div>
  );
};
