import React from 'react';
import { Play, RotateCcw, Home, Volume2, VolumeX, Shield } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { sounds } from '../audio/soundManager';

interface PauseModalProps {
  lang: Language;
  isMuted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onDojo: () => void;
  onHome: () => void;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  lang,
  isMuted,
  onResume,
  onRestart,
  onDojo,
  onHome,
  onToggleMute,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-xs bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold tracking-tight text-white mb-6">
          {trans.pause}
        </h3>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {
              sounds.playSlash();
              onResume();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{trans.resume}</span>
          </button>

          <button
            onClick={() => {
              sounds.playSlash();
              onRestart();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{trans.restart}</span>
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
            onClick={onToggleMute}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
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
