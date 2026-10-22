import React from 'react';
import { RotateCcw, Home, Skull, Shield } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { sounds } from '../audio/soundManager';

interface GameOverModalProps {
  lang: Language;
  onRestart: () => void;
  onDojo: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  lang,
  onRestart,
  onDojo,
  onHome,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-sm bg-zinc-950 border border-red-950/80 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.25)] overflow-hidden text-zinc-100 flex flex-col p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)] mb-4">
          <Skull className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-rose-500 tracking-tight">
          {trans.gameOver}
        </h2>
        <p className="text-xs text-zinc-400 mt-2">{trans.gameOverDesc}</p>

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-2.5">
          <button
            onClick={() => {
              sounds.playSlash();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(225,29,72,0.5)] transition-all active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{trans.tryAgain}</span>
          </button>

          <button
            onClick={() => {
              sounds.playCoin();
              onDojo();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-amber-300 text-xs font-semibold transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>{trans.dojo}</span>
          </button>

          <button
            onClick={() => {
              sounds.playCoin();
              onHome();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 text-xs font-medium transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{trans.mainMenu}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
