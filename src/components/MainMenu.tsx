import React from 'react';
import {
  Play,
  Users,
  HelpCircle,
  BarChart3,
  Settings as SettingsIcon,
  Map,
  Volume2,
  VolumeX,
  Globe,
  Coins,
  Sparkles,
} from 'lucide-react';
import { Language, PlayerStats } from '../types/game';
import { getTranslation } from '../utils/translations';
import { S } from '../utils/format';
import { sounds } from '../audio/soundManager';

interface MainMenuProps {
  lang: Language;
  isMuted: boolean;
  stats: PlayerStats;
  onPlay: () => void;
  onOpenLevelSelect: () => void;
  onOpenDojo: () => void;
  onOpenHowToPlay: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
  onToggleLang: () => void;
  bgUrl?: string;
}

/**
 * Animated main menu (v1.2.0): slow CSS-driven parallax + drifting ember
 * particles + glowing title. Zero per-frame JS — all motion is composited
 * on the GPU via keyframes, keeping mobile CPUs free for the game itself.
 */
export const MainMenu: React.FC<MainMenuProps> = ({
  lang,
  isMuted,
  stats,
  onPlay,
  onOpenLevelSelect,
  onOpenDojo,
  onOpenHowToPlay,
  onOpenStats,
  onOpenSettings,
  onToggleMute,
  onToggleLang,
  bgUrl,
}) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  // Deterministic pseudo-random particle layout (stable across re-renders)
  const particles = React.useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 137.5) % 100,
        top: (i * 61.8 + 13) % 100,
        size: 2 + ((i * 7) % 5),
        delay: (i * 1.37) % 14,
        dur: 11 + ((i * 3.7) % 9),
      })),
    []
  );

  return (
    <div
      className="relative w-full h-full overflow-hidden bg-zinc-950 text-zinc-100 select-none"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Layer 1: artwork (slowest parallax drift) */}
      {bgUrl && (
        <div className="absolute inset-[-6%] na-menu-drift pointer-events-none">
          <img
            src={bgUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center brightness-[0.72] contrast-110"
          />
        </div>
      )}

      {/* Layer 2: color wash + vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-[#2b1030]/50 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />

      {/* Layer 3: drifting ember particles (GPU keyframes, no JS per frame) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full na-menu-particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: p.size,
              height: p.size,
              background: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f43f5e' : '#38bdf8',
              boxShadow: '0 0 6px currentColor',
              color: i % 3 === 0 ? '#fbbf24' : i % 3 === 1 ? '#f43f5e' : '#38bdf8',
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4 sm:p-6">
        <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-400 font-mono drop-shadow">
          NINJA · SHADOW ACTION
        </span>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 backdrop-blur text-amber-300 text-xs font-semibold">
            <Coins className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{S.d(stats.coins, lang)}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 backdrop-blur text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">{S.d(stats.diamonds, lang)}</span>
          </div>
          <button
            onClick={onToggleLang}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'fa' ? 'English' : 'فارسی'}</span>
          </button>
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-zinc-900/80 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800 text-zinc-200 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Center: glowing title + menu */}
      <div className="relative z-10 flex flex-col items-center justify-center h-[calc(100%-8rem)] text-center px-4">
        <div className="absolute top-2 w-40 h-40 rounded-full bg-rose-600/20 blur-[80px] pointer-events-none na-menu-glow" />

        <h1
          className={`text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400 na-title-glow ${
            lang === 'fa' ? 'font-sans' : 'font-serif'
          }`}
          style={{ WebkitTextFillColor: 'transparent' }}
        >
          {trans.gameTitle}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-md drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {trans.gameSubtitle}
        </p>

        {/* Primary action */}
        <button
          onClick={() => {
            sounds.playSlash();
            onPlay();
          }}
          className="mt-8 w-full max-w-xs flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-lg transition-all shadow-[0_0_35px_rgba(225,29,72,0.55)] active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{trans.startGame}</span>
        </button>

        {/* Secondary grid */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 w-full max-w-xs">
          <MenuBtn icon={<Users className="w-4 h-4" />} label={trans.characters} onClick={() => { sounds.playCoin(); onOpenDojo(); }} />
          <MenuBtn icon={<HelpCircle className="w-4 h-4" />} label={trans.guide} onClick={() => { sounds.playCoin(); onOpenHowToPlay(); }} />
          <MenuBtn icon={<BarChart3 className="w-4 h-4" />} label={trans.statsAndAchievements} onClick={() => { sounds.playCoin(); onOpenStats(); }} />
          <MenuBtn icon={<SettingsIcon className="w-4 h-4" />} label={trans.settings} onClick={() => { sounds.playCoin(); onOpenSettings(); }} />
        </div>

        {/* Tertiary: level select */}
        <button
          onClick={() => {
            sounds.playCoin();
            onOpenLevelSelect();
          }}
          className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-950/70 border border-zinc-800/80 hover:bg-zinc-800/80 text-zinc-400 text-xs font-medium transition-colors"
        >
          <Map className="w-3.5 h-3.5" />
          <span>{trans.levels}</span>
        </button>
      </div>

      {/* Footer (informational only — never blocks buttons above it) */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 text-[10px] sm:text-xs text-zinc-600 border-t border-zinc-900/60">
        <span>Legacy of the Shadow · Katana, Shuriken &amp; Ninjutsu</span>
        <span className="font-mono">v1.2.0 · 60 FPS</span>
      </div>
    </div>
  );
};

const MenuBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({
  icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-zinc-900/85 backdrop-blur border border-zinc-700/70 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold transition-all active:scale-95 shadow-lg"
  >
    <span className="text-amber-300">{icon}</span>
    <span className="truncate">{label}</span>
  </button>
);
