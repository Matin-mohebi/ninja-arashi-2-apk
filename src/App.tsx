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
import { TitleScreen } from './components/TitleScreen';
import { LevelSelect } from './components/LevelSelect';
import { HUD } from './components/HUD';
import { VirtualControls } from './components/VirtualControls';
import { DojoModal } from './components/DojoModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { VictoryModal } from './components/VictoryModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import {
  initAndroidBackButton,
  exitApp,
  preventTouchChrome,
  shouldShowRotateHint,
  isNativeApp,
} from './utils/mobile';

// Generated cinematic background images
import titleBg from './assets/images/ninja_arashi_title_bg_1792666724099.jpg';
import forestBg from './assets/images/ninja_forest_bamboo_bg_1792666738901.jpg';
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

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [lang, setLang] = useState<Language>('fa'); // Persian default per user prompt
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showDojo, setShowDojo] = useState<boolean>(false);

  // Player Stats with local storage
  const [stats, setStats] = useState<PlayerStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...INITIAL_STATS, ...JSON.parse(saved) };
    } catch {
      // Fallback
    }
    return INITIAL_STATS;
  });

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
  const [showRotateHint, setShowRotateHint] = useState<boolean>(shouldShowRotateHint());
  // Double-back-to-exit toast on Android
  const [showExitToast, setShowExitToast] = useState<boolean>(false);

  // Canvas & Engine refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<NinjaEngine | null>(null);

  // Save stats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // Storage quota or error
    }
  }, [stats]);

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

      if (level.id === 3) {
        setBossHp({ current: 200, max: 200 });
      } else {
        setBossHp(undefined);
      }

      const initialCoins = stats.coins;

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
            setCoins(newCoins);
            setDiamonds(newDiamonds);
            setScrolls(newScrolls);
            setStats((prev) => ({
              ...prev,
              coins: newCoins,
              diamonds: newDiamonds,
            }));
          },
          onBossHpChange: (hp, max) => {
            setBossHp({ current: hp, max });
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

            setGameState('ROUND_SUMMARY');
          },
          onGameOver: () => {
            setGameState('GAME_OVER');
          },
        },
        forestBg
      );

      engineRef.current = engine;
      engine.start();
    },
    [stats]
  );

  // Resize / orientation listener (HiDPI aware, handled by engine)
  useEffect(() => {
    const handleResize = () => {
      engineRef.current?.handleResize();
      setShowRotateHint(shouldShowRotateHint());
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
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

  useEffect(() => {
    let lastBack = 0;
    let toastTimer: ReturnType<typeof setTimeout>;
    const onAndroidBack = () => {
      if (gameState === 'PLAYING') {
        setGameState('PAUSED');
        engineRef.current?.stop();
        return;
      }
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
  }, [gameState]);

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

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    sounds.setMuted(newMuted);
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'fa' ? 'en' : 'fa'));
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none">
      {/* 1. Title Screen */}
      {gameState === 'TITLE_MENU' && (
        <TitleScreen
          lang={lang}
          isMuted={isMuted}
          onPlay={() => startLevel(1)}
          onOpenLevelSelect={() => setGameState('LEVEL_SELECT')}
          onOpenDojo={() => setShowDojo(true)}
          onOpenHowToPlay={() => setShowHowToPlay(true)}
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
          onHome={() => {
            engineRef.current?.stop();
            setGameState('TITLE_MENU');
          }}
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
          onHome={() => setGameState('TITLE_MENU')}
          hasNextLevel={currentLevelId < LEVELS.length}
        />
      )}

      {/* 7. Game Over Modal */}
      {gameState === 'GAME_OVER' && (
        <GameOverModal
          lang={lang}
          onRestart={restartLevel}
          onDojo={() => setShowDojo(true)}
          onHome={() => setGameState('TITLE_MENU')}
        />
      )}

      {/* 8. Dojo Sanctuary Modal */}
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

      {/* 10. Rotate-device hint (portrait touch devices; native app locks landscape) */}
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

      {/* 11. Android double-back-to-exit toast */}
      {showExitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] bg-zinc-900/95 border border-zinc-700 text-zinc-200 text-sm px-5 py-2.5 rounded-full shadow-2xl pointer-events-none">
          {lang === 'fa' ? 'برای خروج دوباره لمس کنید' : 'Tap back again to exit'}
        </div>
      )}
    </div>
  );
}
