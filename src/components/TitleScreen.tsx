import React from 'react';
import { Play, Map, Shield, HelpCircle, Volume2, VolumeX, Globe } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { sounds } from '../audio/soundManager';

interface TitleScreenProps {
  lang: Language;
  isMuted: boolean;
  onPlay: () => void;
  onOpenLevelSelect: () => void;
  onOpenDojo: () => void;
  onOpenHowToPlay: () => void;
  onToggleMute: () => void;
  onToggleLang: () => void;
  bgUrl?: string;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  lang,
  isMuted,
  onPlay,
  onOpenLevelSelect,
  onOpenDojo,
  onOpenHowToPlay,
  onToggleMute,
  onToggleLang,
  bgUrl,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className="relative w-full h-full min-h-screen flex flex-col justify-between p-6 sm:p-10 bg-zinc-950 text-zinc-100 select-none overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background artwork */}
      {bgUrl && (
        <img
          src={bgUrl}
          alt="Ninja Arashi Background"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none brightness-90 contrast-110"
        />
      )}

      {/* Atmospheric dark gradient scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-black/60 pointer-events-none" />

      {/* Top Bar Controls */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono">
            SHINOBI ACTION CHRONICLES
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center Branding & Action Menu */}
      <div className="relative z-10 max-w-xl mx-auto text-center flex flex-col items-center my-auto">
        {/* Title */}
        <h1
          className={`text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] ${
            lang === 'fa' ? 'font-sans' : 'font-serif'
          }`}
        >
          {trans.gameTitle}
        </h1>

        <p className="mt-3 text-sm sm:text-base text-zinc-300 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {trans.gameSubtitle}
        </p>

        {/* Buttons List */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          {/* Main Play CTA */}
          <button
            onClick={() => {
              sounds.playSlash();
              onPlay();
            }}
            className="w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-base transition-all shadow-[0_0_25px_rgba(225,29,72,0.6)] active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{trans.play}</span>
          </button>

          {/* Dojo Sanctuary */}
          <button
            onClick={() => {
              sounds.playCoin();
              onOpenDojo();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-amber-300 font-semibold text-sm transition-all active:scale-95 shadow-xl"
          >
            <Shield className="w-4 h-4" />
            <span className="whitespace-nowrap">{trans.dojo}</span>
          </button>
        </div>

        {/* Secondary buttons */}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playCoin();
              onOpenLevelSelect();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:bg-zinc-800/80 text-zinc-300 text-xs font-medium transition-colors"
          >
            <Map className="w-3.5 h-3.5" />
            <span>{trans.levels}</span>
          </button>

          <button
            onClick={() => {
              sounds.playCoin();
              onOpenHowToPlay();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:bg-zinc-800/80 text-zinc-300 text-xs font-medium transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{trans.howToPlay}</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800/50 pt-4">
        <span>Arashi Legacy · Katana, Shuriken & Shadow Ninjutsu</span>
        <span className="font-mono">HTML5 / Canvas 60 FPS</span>
      </div>
    </div>
  );
};
