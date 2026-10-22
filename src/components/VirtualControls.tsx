import React from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, ArrowUp, Sword, Zap, Shield, Sparkles } from 'lucide-react';

interface VirtualControlsProps {
  onMoveLeft: (pressed: boolean) => void;
  onMoveRight: (pressed: boolean) => void;
  onCrouch: (pressed: boolean) => void;
  onJump: () => void;
  onSlash: () => void;
  onShuriken: () => void;
  onDash: () => void;
  onDisguise: () => void;
  dashReady: boolean;
  shurikensLeft: number;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onCrouch,
  onJump,
  onSlash,
  onShuriken,
  onDash,
  onDisguise,
  dashReady,
  shurikensLeft,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-0 pointer-events-none p-4 pb-6 safe-h flex items-end justify-between select-none">
      {/* Left Hand: D-Pad Directional Controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onTouchStart={(e) => { e.preventDefault(); onMoveLeft(true); }}
          onTouchEnd={(e) => { e.preventDefault(); onMoveLeft(false); }}
          onTouchCancel={() => onMoveLeft(false)}
          onMouseDown={() => onMoveLeft(true)}
          onMouseUp={() => onMoveLeft(false)}
          onMouseLeave={() => onMoveLeft(false)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-zinc-200 active:bg-zinc-800 flex flex-col items-center justify-center backdrop-blur-md shadow-2xl transition-transform active:scale-95"
          title="Move Left (A)"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-[10px] text-zinc-500 font-mono">A</span>
        </button>

        <button
          onTouchStart={(e) => { e.preventDefault(); onCrouch(true); }}
          onTouchEnd={(e) => { e.preventDefault(); onCrouch(false); }}
          onTouchCancel={() => onCrouch(false)}
          onMouseDown={() => onCrouch(true)}
          onMouseUp={() => onCrouch(false)}
          onMouseLeave={() => onCrouch(false)}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-zinc-300 active:bg-zinc-800 flex flex-col items-center justify-center backdrop-blur-md shadow-2xl transition-transform active:scale-95"
          title="Crouch / Slide (S)"
        >
          <ArrowDown className="w-5 h-5" />
          <span className="text-[10px] text-zinc-500 font-mono">S</span>
        </button>

        <button
          onTouchStart={(e) => { e.preventDefault(); onMoveRight(true); }}
          onTouchEnd={(e) => { e.preventDefault(); onMoveRight(false); }}
          onTouchCancel={() => onMoveRight(false)}
          onMouseDown={() => onMoveRight(true)}
          onMouseUp={() => onMoveRight(false)}
          onMouseLeave={() => onMoveRight(false)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950/70 border border-zinc-800 text-zinc-200 active:bg-zinc-800 flex flex-col items-center justify-center backdrop-blur-md shadow-2xl transition-transform active:scale-95"
          title="Move Right (D)"
        >
          <ArrowRight className="w-6 h-6" />
          <span className="text-[10px] text-zinc-500 font-mono">D</span>
        </button>
      </div>

      {/* Right Hand: Action Buttons */}
      <div className="flex items-end gap-2.5 sm:gap-3 pointer-events-auto">
        {/* Disguise / Kawarimi (U / Q) */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onDisguise(); }}
          onClick={onDisguise}
          className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-zinc-950/75 border border-emerald-900/60 text-emerald-400 active:bg-emerald-950 flex flex-col items-center justify-center backdrop-blur-md shadow-xl transition-transform active:scale-90"
          title="Disguise (U / Q)"
        >
          <Shield className="w-5 h-5" />
          <span className="text-[9px] text-emerald-500/80 font-mono">U</span>
        </button>

        {/* Shuriken Throw (K / X) */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onShuriken(); }}
          onClick={onShuriken}
          disabled={shurikensLeft <= 0}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md shadow-xl transition-transform active:scale-90 ${
            shurikensLeft > 0
              ? 'bg-zinc-950/75 border border-cyan-800/70 text-cyan-400 active:bg-cyan-950'
              : 'bg-zinc-900/40 border border-zinc-800 text-zinc-600 opacity-60'
          }`}
          title="Shuriken (K)"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] font-mono">K</span>
        </button>

        {/* Phantom Dash (L / Shift) */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onDash(); }}
          onClick={onDash}
          disabled={!dashReady}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center backdrop-blur-md shadow-xl transition-transform active:scale-90 ${
            dashReady
              ? 'bg-zinc-950/80 border border-sky-600 text-sky-400 active:bg-sky-950 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
              : 'bg-zinc-900/40 border border-zinc-800 text-zinc-600 opacity-60'
          }`}
          title="Dash (L / Shift)"
        >
          <Zap className="w-5 h-5" />
          <span className="text-[9px] font-mono">L</span>
        </button>

        {/* Katana Slash (J / Z) */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onSlash(); }}
          onClick={onSlash}
          className="w-15 h-15 sm:w-17 sm:h-17 rounded-2xl bg-rose-950/80 border-2 border-rose-600/80 text-rose-200 active:bg-rose-900 flex flex-col items-center justify-center backdrop-blur-md shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-transform active:scale-90"
          title="Katana Slash (J)"
        >
          <Sword className="w-6 h-6 fill-rose-500/30" />
          <span className="text-[10px] text-rose-400 font-mono font-bold">J</span>
        </button>

        {/* Jump / Double Jump (Space / W) */}
        <button
          onTouchStart={(e) => { e.preventDefault(); onJump(); }}
          onClick={onJump}
          className="w-15 h-15 sm:w-17 sm:h-17 rounded-2xl bg-zinc-950/80 border-2 border-zinc-700 text-white active:bg-zinc-800 flex flex-col items-center justify-center backdrop-blur-md shadow-2xl transition-transform active:scale-90"
          title="Jump / Somersault (W / Space)"
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[10px] text-zinc-400 font-mono">W / Space</span>
        </button>
      </div>
    </div>
  );
};
