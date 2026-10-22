/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameState,
  Language,
  PlayerStats,
  LevelData,
} from './types/game';
import { LEVELS } from './levels/levelsData';
import { NinjaEngine } from './engine/NinjaEngine';
import { sounds } from './audio/soundManager';
import { music, MusicTrack } from './audio/music';
import { MainMenu } from './components/MainMenu';
import { LevelSelect } from './components/LevelSelect';
import { HUD } from './components/HUD';
import { VirtualControls } from './components/VirtualControls';
import { DojoModal } from './components/DojoModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { SettingsModal, GameSettings, loadSettings } from './components/SettingsModal';
import { StatsModal } from './components/StatsModal';
import { getTranslation } from './utils/translations';
import {
  MetaProgress,
  loadMeta,
  saveMeta,
  evaluateAchievements,
  AchievementCtx,
} from './utils/achievements';
import {
  initAndroidBackButton,
  exitApp,
  preventTouchChrome,
  shouldShowRotateHint,
  watchOrientation,
  isNativeApp,
} from './utils/mobile';

// Generated cinematic background images
import titleBg from './assets/images/ninja_arashi_title_bg_1792666724099.jpg';
import dojoBg from './assets/images/ninja_dojo_shrine_bg_1792666739047.jpg';

const STORAGE_KEY = 'ninja_arashi_2_save_v1';

const INITIAL_STATS: PlayerStats = {
  maxHp: 3,
  hp: 3,
  shurikensMax: 3,
  shurikens: 3,
  shurikenRechargeTime: 3.0,
  katanaDamage: 18,
  dashCooldown: 3.2,
  disguiseDuration: 4.5,
  coins: 50,
  diamonds: 1,
  skin: 'arashi',
  unlockedSkins: ['arashi'],
  levelsCompleted: [],
  levelStars: {},
  upgrades: {
    katana: 1,
    shuriken: 1,
    dash: 1,
    disguise: 1,
    health: 1,
  },
};

/** Lightweight achievement toast model. */
interface Toast {
  id: number;
  title: string;
  desc: string;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const lang = settings.lang;
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showDojo, setShowDojo] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showStats, setShowStats] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Player Stats with local storage (merge-safe with old saves)
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...INITIAL_STATS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return INITIAL_STATS;
  });

  // Lifetime meta progress (v1.2.0, own key — never collides with the save)
  const [meta, setMeta] = useState<MetaProgress>(() => loadMeta());
  const metaRef = useRef<MetaProgress>(meta);
  metaRef.current = meta;
  const statsRef = useRef<PlayerStats>(stats);
  statsRef.current = stats;
  const langRef = useRef<Language>(lang);
  langRef.current = lang;

  // Active HUD state (synchronized with 60FPS engine)
  const [hudHp, setHudHp] = useState<number>(stats.hp);
  const [hudShurikens, setHudShurikens] = useState<number>(stats.shurikens);
  const [shurikenRechargePct, setShurikenRechargePct] = useState<number>(1);
  const [dashCooldownPct, setDashCooldownPct] = useState<number>(1);
  const [isDisguised, setIsDisguised] = useState<boolean>(false);
  const [disguisePct, setDisguisePct] = useState<number>(1);
  const [coins, setCoins] = useState<number>(stats.coins);
  const [diamonds, setDiamonds] = useState<number>(stats.diamonds);
  const [scrolls, setScrolls] = useState<number>(0);
  const [bossHp, setBossHp] = useState<{ current: number; max: number } | undefined>(undefined);

  // Victory summary stats
  const [victoryStats, setVictoryStats] = useState<{ time: number; scrolls: number; kills: number }>({
    time: 0,
    scrolls: 0,
    kills: 0,
  });
  const [coinsEarnedInRun, setCoinsEarnedInRun] = useState<number>(0);

  // Rotate-device hint (touch devices held in portrait)
  const [showRotateHint, setShowRotateHint] = useState<boolean>(() => shouldShowRotateHint());
  // Double-back-to-exit toast on Android
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  // Refs mirroring state for listeners that must not re-subscribe
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;
  const mutedRef = useRef<boolean>(isMuted);
  mutedRef.current = isMuted;
  const settingsRef = useRef<GameSettings>(settings);
  settingsRef.current = settings;
  /** Live-applied engine presentation switches (mutated in place). */
  const visualSettingsRef = useRef({ shake: true, reducedParticles: false });
  visualSettingsRef.current = { shake: settings.shake, reducedParticles: settings.reducedParticles };
  /** Deaths accumulated during the current run (for the flawless achievement). */
  const deathsThisRunRef = useRef<number>(0);
  /** Last absolute coin/scroll counts, for lifetime deltas. */
  const lastCoinsRef = useRef<number>(stats.coins);
  const lastScrollsRef = useRef<number>(0);
  const toastIdRef = useRef<number>(1);

  // Canvas & Engine refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<NinjaEngine | null>(null);
  // Last activated checkpoint per level — used to respawn after death.
  const checkpointsRef = useRef<Record<number, { x: number; y: number }>>({});

  // Save stats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Storage quota or error
    }
  }, [stats]);

  // Persist + apply settings immediately (volumes, shake, particles, language)
  useEffect(() => {
    try {
      localStorage.setItem('ninja_arashi_2_settings_v1', JSON.stringify(settings));
    } catch {
      // ignore
    }
    sounds.setSfxVolume(settings.sfxVolume);
    music.setVolume(settings.musicVolume);
  }, [settings]);

  /** Push a toast (achievement unlock etc.) — auto-dismisses after 3.2s. */
  const pushToast = useCallback((title: string, desc: string) => {
    const id = toastIdRef.current++;
    setToasts((prev) => [...prev.slice(-2), { id, title, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  /** Persist meta and refresh the mirror state. */
  const flushMeta = useCallback(() => {
    saveMeta(metaRef.current);
    setMeta({ ...metaRef.current, bestTimes: { ...metaRef.current.bestTimes }, achievements: [...metaRef.current.achievements] });
  }, []);

  /** Evaluate achievements against current meta/stats; toast + persist unlocks. */
  const checkAchievements = useCallback(
    (ctx: AchievementCtx = {}) => {
      const unlockedIds = evaluateAchievements(metaRef.current, statsRef.current, ctx);
      if (unlockedIds.length === 0) return;
      const trans = getTranslation(langRef.current);
      metaRef.current.achievements = [...metaRef.current.achievements, ...unlockedIds];
      for (const id of unlockedIds) {
        const a = trans.achievements[id];
        pushToast(a.name, a.desc);
      }
      flushMeta();
    },
    [pushToast, flushMeta]
  );

  const currentLevel: LevelData = LEVELS.find((l) => l.id === currentLevelId) || LEVELS[0];

  // Initialize or restart engine
  const initEngine = useCallback(
    (level: LevelData) => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;

      // Backing store + logical viewport are sized by the engine (HiDPI aware)

      // Start level with full HP
      stats.hp = stats.maxHp;
      setHudHp(stats.maxHp);
      setHudShurikens(stats.shurikensMax);
      setShurikenRechargePct(1);
      setDashCooldownPct(1);
      setIsDisguised(false);
      setScrolls(0);
      setCoins(stats.coins);
      setDiamonds(stats.diamonds);

      // Run-scoped trackers
      deathsThisRunRef.current = 0;
      lastCoinsRef.current = stats.coins;
      lastScrollsRef.current = 0;

      // Boss bar only for the level-3 Akumu fight (level 4 is a non-boss gauntlet)
      if (level.id === 3) {
        setBossHp({ current: 200, max: 200 });
      } else {
        setBossHp(undefined);
      }

      const initialCoins = stats.coins;

      // Respawn at the activated checkpoint (if any) — keeps the checkpoint
      // system meaningful instead of restarting the whole level on death.
      const savedCheckpoint = checkpointsRef.current[level.id] || null;

      const engine = new NinjaEngine(
        canvas,
        level,
        stats,
        {
          onHealthChange: (hp) => setHudHp(hp),
          onShurikensChange: (shurikensLeft, rechargePct) => {
            setHudShurikens(shurikensLeft);
            setShurikenRechargePct(rechargePct);
          },
          onDashCooldownChange: (pct) => setDashCooldownPct(pct),
          onDisguiseChange: (disguised, pct) => {
            setIsDisguised(disguised);
            setDisguisePct(pct);
          },
          onCollect: (newCoins, newDiamonds, newScrolls) => {
            // Lifetime deltas for meta achievements
            if (newCoins > lastCoinsRef.current) {
              metaRef.current.lifetimeCoins += newCoins - lastCoinsRef.current;
            }
            if (newScrolls > lastScrollsRef.current) {
              metaRef.current.lifetimeScrolls += newScrolls - lastScrollsRef.current;
            }
            lastCoinsRef.current = newCoins;
            lastScrollsRef.current = newScrolls;

            setCoins(newCoins);
            setDiamonds(newDiamonds);
            setScrolls(newScrolls);
            setStats((prev) => ({
              ...prev,
              coins: newCoins,
              diamonds: newDiamonds,
            }));
            checkAchievements();
          },
          onBossHpChange: (hp, max) => {
            setBossHp({ current: hp, max });
          },
          onCheckpoint: (spawn) => {
            checkpointsRef.current[level.id] = spawn;
          },
          onJump: () => {
            metaRef.current.totalJumps += 1;
            checkAchievements();
          },
          onKill: () => {
            metaRef.current.totalKills += 1;
            checkAchievements();
          },
          onDeath: () => {
            metaRef.current.totalDeaths += 1;
            deathsThisRunRef.current += 1;
            checkAchievements();
            flushMeta();
          },
          onLevelComplete: (runSummary) => {
            setVictoryStats(runSummary);
            setCoinsEarnedInRun(Math.max(0, engine.player ? stats.coins - initialCoins : 0));

            // Record completed level and stars
            const stars = runSummary.scrolls >= 3 ? 3 : runSummary.scrolls >= 1 ? 2 : 1;
            setStats((prev) => {
              const completed = prev.levelsCompleted.includes(level.id)
                ? prev.levelsCompleted
                : [...prev.levelsCompleted, level.id];
              const bestStars = Math.max(prev.levelStars[level.id] || 0, stars);
              return {
                ...prev,
                levelsCompleted: completed,
                levelStars: { ...prev.levelStars, [level.id]: bestStars },
              };
            });

            // Best-time record + playtime bookkeeping
            const prevBest = metaRef.current.bestTimes[level.id];
            if (!prevBest || runSummary.time < prevBest) {
              metaRef.current.bestTimes[level.id] = runSummary.time;
            }
            flushMeta();
            checkAchievements({ lastRunDeaths: deathsThisRunRef.current });

            setGameState('ROUND_SUMMARY');
          },
          onGameOver: () => {
            setGameState('GAME_OVER');
          },
        },
        undefined, // procedural themed backgrounds replace the old JPEG backdrop
        savedCheckpoint,
        visualSettingsRef.current
      );

      engineRef.current = engine;
      engine.start();
    },
    [stats, checkAchievements, flushMeta]
  );

  // Resize / orientation listener (HiDPI aware, handled by engine)
  // Robustness notes:
  // - `orientationchange` fires BEFORE the viewport/layout settles on some
  //   browsers (esp. iOS Safari) — so we re-apply several times over ~1s.
  // - The matchMedia "change" event is the source of truth for actual flips.
  // - visualViewport resize covers URL-bar show/hide and iOS quirks.
  useEffect(() => {
    const delayed: ReturnType<typeof setTimeout>[] = [];
    const apply = () => {
      engineRef.current?.handleResize();
      setShowRotateHint(shouldShowRotateHint());
    };
    const handleResize = () => apply();
    const handleOrientation = () => {
      apply();
      delayed.forEach(clearTimeout);
      delayed.length = 0;
      // Staggered re-applies: layout settles at different speeds per browser
      // (Android Chrome can finish after 300ms, iOS Safari after ~600ms).
      delayed.push(setTimeout(apply, 120));
      delayed.push(setTimeout(apply, 400));
      delayed.push(setTimeout(apply, 900));
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientation);
    const cleanupWatch = watchOrientation(handleOrientation);
    const vv = window.visualViewport;
    const handleVv = () => apply();
    vv?.addEventListener('resize', handleVv);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientation);
      vv?.removeEventListener('resize', handleVv);
      delayed.forEach(clearTimeout);
      cleanupWatch();
    };
  }, []);

  // Mobile shell: context-menu suppression + Android back button (pause in game, double-back to exit)
  useEffect(() => {
    const cleanupTouch = preventTouchChrome();
    const cleanupBack = initAndroidBackButton();
    return () => {
      cleanupTouch();
      cleanupBack();
    };
  }, []);

  // Auto-pause when the tab/app goes to the background (returning mid-jump
  // causes unfair deaths). Music suspends/resumes itself via music.ts.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (gameStateRef.current === 'PLAYING') {
          setGameState('PAUSED');
          engineRef.current?.stop();
        }
        flushMeta();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [flushMeta]);

  // Audio unlock: Web Audio requires a user gesture to start (iOS Safari
  // especially). The FIRST pointerdown/keydown/touchstart boots both the SFX
  // context and the MusicEngine (which then plays the desired menu/level
  // track with a proper crossfade).
  useEffect(() => {
    const kick = () => {
      sounds.setMuted(mutedRef.current);
      sounds.setSfxVolume(settingsRef.current.sfxVolume);
      music.setVolume(settingsRef.current.musicVolume);
      music.setMuted(mutedRef.current);
      music.unlock();
    };
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    window.addEventListener('touchstart', kick, { once: true });
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchstart', kick);
    };
  }, []);

  // Music follows the game state with lazy per-level preloads and crossfades
  useEffect(() => {
    if (gameState === 'PLAYING') {
      music.resume();
      music.play(`level${currentLevelId}` as MusicTrack);
    } else if (gameState === 'ROUND_SUMMARY') {
      music.play('victory', false); // one-shot sting
    } else if (gameState === 'GAME_OVER') {
      music.play('gameover', false); // somber sting
    } else if (gameState === 'PAUSED') {
      music.pause(); // suspends ctx mid-track; resumes on PLAYING
    } else {
      // Menus / summaries
      music.resume();
      music.play('menu');
    }
  }, [gameState, currentLevelId]);

  // Playtime accumulator: ticks while playing, persists on state change
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const iv = setInterval(() => {
      metaRef.current.playtime += 5;
    }, 5000);
    return () => {
      clearInterval(iv);
      flushMeta();
    };
  }, [gameState, flushMeta]);

  useEffect(() => {
    let lastBack = 0;
    let toastTimer: ReturnType<typeof setTimeout>;
    const onAndroidBack = () => {
      // 1. Close any open modal first (Dojo / How-to-play / Settings / Stats)
      if (showDojo) {
        setShowDojo(false);
        return;
      }
      if (showHowToPlay) {
        setShowHowToPlay(false);
        return;
      }
      if (showSettings) {
        setShowSettings(false);
        return;
      }
      if (showStats) {
        setShowStats(false);
        return;
      }
      // 2. In-game: pause.  Paused: resume (symmetric with the Escape key).
      if (gameState === 'PLAYING') {
        setGameState('PAUSED');
        engineRef.current?.stop();
        return;
      }
      if (gameState === 'PAUSED') {
        setGameState('PLAYING');
        engineRef.current?.start();
        return;
      }
      // 3. Menus / summaries: double-back to exit
      const now = Date.now();
      if (now - lastBack < 2500) {
        exitApp();
      } else {
        lastBack = now;
        setShowExitToast(true);
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => setShowExitToast(false), 2500);
      }
    };
    window.addEventListener('android-back', onAndroidBack);
    return () => {
      window.removeEventListener('android-back', onAndroidBack);
      clearTimeout(toastTimer);
    };
  }, [gameState, showDojo, showHowToPlay, showSettings, showStats]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || !engineRef.current) {
        if (e.key === 'Escape' && gameState === 'PAUSED') {
          setGameState('PLAYING');
          engineRef.current?.start();
        }
        return;
      }

      const key = e.key.toLowerCase();

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(key)) {
        e.preventDefault();
      }

      if (key === 'escape' || key === 'p') {
        setGameState('PAUSED');
        engineRef.current.stop();
        return;
      }

      if (key === 'w' || key === 'arrowup' || key === ' ') {
        engineRef.current.triggerJump();
      } else if (key === 'j' || key === 'z') {
        engineRef.current.triggerSlash();
      } else if (key === 'k' || key === 'x') {
        engineRef.current.triggerShuriken();
      } else if (key === 'l' || key === 'shift') {
        engineRef.current.triggerDash();
      } else if (key === 'u' || key === 'q') {
        engineRef.current.triggerDisguise();
      } else {
        engineRef.current.setInput(key, true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING' || !engineRef.current) return;
      const key = e.key.toLowerCase();
      engineRef.current.setInput(key, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Start Level
  const startLevel = (lvlId: number) => {
    // Fresh entry into a level — clear any checkpoint from a previous attempt
    // (restartLevel deliberately does NOT clear it so respawn works).
    delete checkpointsRef.current[lvlId];
    setCurrentLevelId(lvlId);
    setGameState('PLAYING');
    setTimeout(() => {
      const targetLvl = LEVELS.find((l) => l.id === lvlId) || LEVELS[0];
      initEngine(targetLvl);
    }, 50);
  };

  // Restart active level
  const restartLevel = () => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setGameState('PLAYING');
    setTimeout(() => {
      initEngine(currentLevel);
    }, 50);
  };

  const handleNextLevel = () => {
    const nextId = currentLevelId + 1;
    if (nextId <= LEVELS.length) {
      startLevel(nextId);
    } else {
      setGameState('LEVEL_SELECT');
    }
  };

  /** Stop the level and land on the animated main menu. */
  const goHome = () => {
    engineRef.current?.stop();
    flushMeta();
    setGameState('TITLE_MENU');
  };

  /** "شروع بازی": continue from the first uncompleted level (or L1). */
  const startCampaign = () => {
    const next = LEVELS.find((l) => !stats.levelsCompleted.includes(l.id));
    startLevel(next ? next.id : 1);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    sounds.setMuted(newMuted);
    music.setMuted(newMuted);
  };

  const toggleLang = () => {
    setSettings((prev) => ({ ...prev, lang: prev.lang === 'fa' ? 'en' : 'fa' }));
  };

  const patchSettings = (patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  return (
    <div className="relative app-shell bg-black overflow-hidden font-sans select-none">
      {/* 1. Main Menu (animated, v1.2.0) */}
      {gameState === 'TITLE_MENU' && (
        <MainMenu
          lang={lang}
          isMuted={isMuted}
          stats={stats}
          onPlay={startCampaign}
          onOpenLevelSelect={() => setGameState('LEVEL_SELECT')}
          onOpenDojo={() => setShowDojo(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSettings={() => setShowSettings(true)}
          onToggleMute={toggleMute}
          onToggleLang={toggleLang}
          bgUrl={titleBg}
        />
      )}

      {/* 2. Level Select Screen */}
      {gameState === 'LEVEL_SELECT' && (
        <LevelSelect
          levels={LEVELS}
          stats={stats}
          lang={lang}
          onSelectLevel={startLevel}
          onBack={() => setGameState('TITLE_MENU')}
          bgUrl={titleBg}
        />
      )}

      {/* 3. Game Canvas (Rendered during PLAYING, PAUSED, VICTORY, GAME_OVER) */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block touch-none ${
          gameState === 'PLAYING' || gameState === 'PAUSED' || gameState === 'ROUND_SUMMARY' || gameState === 'GAME_OVER'
            ? 'visible'
            : 'hidden'
        }`}
      />

      {/* 4. Active In-Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
        <>
          <HUD
            hp={hudHp}
            maxHp={stats.maxHp}
            shurikens={hudShurikens}
            shurikensMax={stats.shurikensMax}
            shurikenRechargePct={shurikenRechargePct}
            dashCooldownPct={dashCooldownPct}
            isDisguised={isDisguised}
            disguisePct={disguisePct}
            coins={coins}
            diamonds={diamonds}
            scrolls={scrolls}
            levelTitle={lang === 'fa' ? currentLevel.titleFa : currentLevel.titleEn}
            isMuted={isMuted}
            lang={lang}
            bossHp={bossHp}
            onPause={() => {
              setGameState('PAUSED');
              engineRef.current?.stop();
            }}
            onRestart={restartLevel}
            onToggleMute={toggleMute}
          />

          {/* Virtual Controls for Mobile/Touch and mouse */}
          <VirtualControls
            onMoveLeft={(pressed) => engineRef.current?.setInput('a', pressed)}
            onMoveRight={(pressed) => engineRef.current?.setInput('d', pressed)}
            onCrouch={(pressed) => engineRef.current?.setInput('s', pressed)}
            onJump={() => engineRef.current?.triggerJump()}
            onSlash={() => engineRef.current?.triggerSlash()}
            onShuriken={() => engineRef.current?.triggerShuriken()}
            onDash={() => engineRef.current?.triggerDash()}
            onDisguise={() => engineRef.current?.triggerDisguise()}
            dashReady={dashCooldownPct >= 1}
            shurikensLeft={hudShurikens}
          />
        </>
      )}

      {/* 5. Pause Modal */}
      {gameState === 'PAUSED' && (
        <PauseModal
          lang={lang}
          isMuted={isMuted}
          onResume={() => {
            setGameState('PLAYING');
            engineRef.current?.start();
          }}
          onRestart={restartLevel}
          onDojo={() => setShowDojo(true)}
          onSettings={() => setShowSettings(true)}
          onHome={goHome}
          onToggleMute={toggleMute}
        />
      )}

      {/* 6. Victory Modal */}
      {gameState === 'ROUND_SUMMARY' && (
        <VictoryModal
          levelId={currentLevelId}
          stats={victoryStats}
          coinsEarned={coinsEarnedInRun}
          lang={lang}
          onNextLevel={handleNextLevel}
          onRestart={restartLevel}
          onHome={goHome}
          hasNextLevel={currentLevelId < LEVELS.length}
        />
      )}

      {/* 7. Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          lang={lang}
          onRestart={restartLevel}
          onDojo={() => setShowDojo(true)}
          onHome={goHome}
        />
      )}

      {/* 8. Dojo Sanctuary Modal (شخصیت‌ها) */}
      {showDojo && (
        <DojoModal
          stats={stats}
          lang={lang}
          onUpdateStats={(newStats) => {
            setStats(newStats);
            setCoins(newStats.coins);
            setDiamonds(newStats.diamonds);
          }}
          onClose={() => setShowDojo(false)}
          dojoBgUrl={dojoBg}
        />
      )}

      {/* 9. How to Play Modal */}
      {showHowToPlay && (
        <HowToPlayModal
          lang={lang}
          onClose={() => setShowHowToPlay(false)}
        />
      )}

      {/* 10. Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          lang={lang}
          onChange={patchSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 11. Stats & Achievements Modal */}
      {showStats && (
        <StatsModal
          meta={meta}
          stats={stats}
          levels={LEVELS}
          lang={lang}
          onClose={() => setShowStats(false)}
        />
      )}

      {/* 12. Achievement toasts */}
      <div className="fixed bottom-20 right-3 sm:right-5 z-[90] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="na-toast flex items-start gap-2.5 max-w-[240px] px-3.5 py-2.5 rounded-xl bg-zinc-900/95 border border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]"
          >
            <span className="mt-0.5 text-amber-400">🏆</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-amber-300 truncate">{t.title}</p>
              <p className="text-[10px] text-zinc-400 leading-snug">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 13. Rotate-device hint (portrait touch devices; native app locks landscape) */}
      {!isNativeApp() && showRotateHint && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="w-20 h-32 rounded-2xl border-4 border-zinc-600 relative animate-pulse">
            <div className="absolute inset-2 rounded-xl bg-zinc-800" />
          </div>
          <p className="text-zinc-200 text-xl font-bold">
            {lang === 'fa' ? 'گوشی را بچرخانید' : 'Rotate your device'}
          </p>
          <p className="text-zinc-500 text-sm max-w-xs">
            {lang === 'fa'
              ? 'این بازی برای حالت افقی طراحی شده است. گوشی را به حالت افقی بچرخانید.'
              : 'This game is designed for landscape mode. Please rotate your phone sideways.'}
          </p>
        </div>
      )}

      {/* 14. Android double-back-to-exit toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-zinc-900/95 border border-zinc-700 text-zinc-200 text-sm px-5 py-2.5 rounded-full shadow-2xl pointer-events-none">
          {lang === 'fa' ? 'برای خروج دوباره لمس کنید' : 'Tap back again to exit'}
        </div>
      )}
    </div>
  );
}
