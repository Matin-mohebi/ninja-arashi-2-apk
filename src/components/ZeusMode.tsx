/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ZeusMode — full-screen endless 3D runner (NINJA ZEUS, v1.4.0).
 * Wraps ZeusGame (Three.js) with a React HUD; unmount fully disposes the
 * WebGL context. Tap = jump, swipe = lane change, keyboard also supported.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Volume2, VolumeX, Zap, Gem, Trophy, Play, RotateCcw, Home } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { ZeusGame, ZeusHud } from '../zeus/ZeusGame';
import { sounds } from '../audio/soundManager';

interface ZeusModeProps {
  lang: Language;
  isMuted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
}

type Phase = 'ready' | 'running' | 'over';

export const ZeusMode: React.FC<ZeusModeProps> = ({ lang, isMuted, onToggleMute, onExit }) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ZeusGame | null>(null);

  const [phase, setPhase] = useState<Phase>('ready');
  const [hud, setHud] = useState<ZeusHud>({ score: 0, gems: 0, health: 3 });
  const [best, setBest] = useState(0);
  const [final, setFinal] = useState({ score: 0, gems: 0 });

  useEffect(() => {
    if (!hostRef.current) return;
    const game = new ZeusGame(hostRef.current, {
      onHud: (h) => setHud(h),
      onGameOver: (score, gems, bestScore) => {
        setFinal({ score, gems });
        setBest(bestScore);
        setPhase('over');
      },
      onBest: (b) => setBest(b),
    }, isMuted);
    setBest(game.getBest());
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gameRef.current?.setMuted(isMuted);
  }, [isMuted]);

  const startRun = useCallback(() => {
    sounds.playCoin();
    setPhase('running');
    gameRef.current?.startRun();
  }, []);

  // Escape returns to the menu (Android back is handled globally in App.tsx)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'running') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onExit]);

  const hearts = '❤'.repeat(Math.max(0, hud.health)) + '🖤'.repeat(Math.max(0, 3 - hud.health));

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#00080c] text-cyan-100 select-none" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* WebGL host */}
      <div ref={hostRef} className="absolute inset-0" />

      {/* Cyan vignette to fuse the theme */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,8,12,0.85)_100%)]" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 sm:p-4">
        <button
          onClick={() => { sounds.playCoin(); onExit(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#001a22]/85 backdrop-blur border border-cyan-500/30 hover:bg-[#00242e] text-cyan-200 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span className="hidden sm:inline">{trans.mainMenu}</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#001a22]/85 backdrop-blur border border-cyan-500/30 text-cyan-200 text-xs font-semibold">
            <Trophy className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-mono tabular-nums">{best.toLocaleString('en-US')}</span>
          </div>
          <button
            onClick={onToggleMute}
            className="p-2 rounded-xl bg-[#001a22]/85 backdrop-blur border border-cyan-500/30 hover:bg-[#00242e] text-cyan-200 transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* HUD */}
      {phase === 'running' && (
        <>
          <div className="pointer-events-none absolute top-14 sm:top-16 left-3 sm:left-4 z-10 flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001a22]/80 border border-cyan-500/25 backdrop-blur text-cyan-200 text-sm font-bold">
              <Zap className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-mono tabular-nums">{hud.score.toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001a22]/80 border border-cyan-500/25 backdrop-blur text-cyan-200 text-sm font-bold">
              <Gem className="w-3.5 h-3.5 text-cyan-300" />
              <span className="font-mono tabular-nums">{hud.gems}</span>
            </div>
          </div>
          <div className="pointer-events-none absolute top-14 sm:top-16 right-3 sm:right-4 z-10 px-3 py-1.5 rounded-lg bg-[#001a22]/80 border border-cyan-500/25 backdrop-blur text-sm">
            {hearts}
          </div>
          <div className="pointer-events-none absolute bottom-4 inset-x-0 z-10 text-center text-[11px] text-cyan-500/70 animate-pulse">
            {trans.zeusTapHint}
          </div>
        </>
      )}

      {/* Ready screen */}
      {phase === 'ready' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#000a0f]/95 via-[#00131a]/90 to-[#001a22]/95 px-6 text-center">
          <div className="absolute w-56 h-56 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />
          <Zap className="w-14 h-14 text-cyan-300 drop-shadow-[0_0_18px_rgba(0,255,255,0.8)]" />
          <h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-cyan-200">
            {trans.zeusMode}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-cyan-500/90 tracking-[0.25em] uppercase">Shadow of Olympus</p>
          <p className="mt-4 max-w-sm text-xs sm:text-sm text-cyan-200/70 leading-6">{trans.zeusModeDesc}</p>
          <button
            onClick={startRun}
            className="mt-8 flex items-center justify-center gap-2.5 px-10 py-4 rounded-full font-bold text-base text-[#001a1a] bg-gradient-to-r from-cyan-300 to-teal-300 hover:from-cyan-200 hover:to-teal-200 shadow-[0_0_35px_rgba(0,255,255,0.45)] transition-all active:scale-95"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{trans.play}</span>
          </button>
          <div className="mt-5 flex items-center gap-1.5 text-cyan-400/80 text-xs">
            <Trophy className="w-3.5 h-3.5" />
            <span>{trans.zeusBest}: <b className="font-mono">{best.toLocaleString('en-US')}</b></span>
          </div>
        </div>
      )}

      {/* Game over */}
      {phase === 'over' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#000508]/85 backdrop-blur-[3px] px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black text-rose-400 drop-shadow-[0_0_16px_rgba(255,60,60,0.6)]">
            {trans.gameOver}
          </h2>
          <div className="mt-5 flex items-center gap-3">
            <div className="px-5 py-3 rounded-2xl bg-[#001a22]/90 border border-cyan-500/30">
              <div className="text-[10px] uppercase tracking-widest text-cyan-500">{trans.zeusScoreLabel}</div>
              <div className="text-2xl font-black font-mono text-cyan-200">{final.score.toLocaleString('en-US')}</div>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-[#001a22]/90 border border-cyan-500/30">
              <div className="text-[10px] uppercase tracking-widest text-cyan-500">{trans.zeusGemsLabel}</div>
              <div className="text-2xl font-black font-mono text-cyan-200">{final.gems}</div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-cyan-400/90 text-sm">
            <Trophy className="w-4 h-4" />
            <span>{trans.zeusBest}: <b className="font-mono">{best.toLocaleString('en-US')}</b></span>
          </div>
          <div className="mt-7 flex flex-col sm:flex-row items-center gap-2.5">
            <button
              onClick={startRun}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-bold text-[#001a1a] bg-gradient-to-r from-cyan-300 to-teal-300 hover:from-cyan-200 hover:to-teal-200 shadow-[0_0_28px_rgba(0,255,255,0.4)] transition-all active:scale-95"
            >
              <RotateCcw className="w-4.5 h-4.5" />
              <span>{trans.restart}</span>
            </button>
            <button
              onClick={() => { sounds.playCoin(); onExit(); }}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-full font-semibold text-cyan-200 border border-cyan-500/50 hover:bg-cyan-500/10 transition-all active:scale-95"
            >
              <Home className="w-4.5 h-4.5" />
              <span>{trans.mainMenu}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
