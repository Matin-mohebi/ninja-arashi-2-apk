import React from 'react';
import { X, Sword, Shield, Zap, Sparkles, ArrowUp, Compass } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';

interface HowToPlayModalProps {
  lang: Language;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ lang, onClose }) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-rose-500" />
            <h3 className="font-bold text-lg text-white">{trans.howToPlay}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Key Bindings */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
              {trans.controlsTitle}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 font-mono text-xs font-bold text-white">
                  A / D / ← →
                </span>
                <span className="text-zinc-300 text-xs">{isRtl ? 'حرکت به چپ و راست' : 'Move Left & Right'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 font-mono text-xs font-bold text-white">
                  W / Space
                </span>
                <span className="text-zinc-300 text-xs">{isRtl ? 'پرش و پشتک دوبل' : 'Jump & Double Somersault'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 font-mono text-xs font-bold text-rose-400">
                  J / Left Click
                </span>
                <span className="text-zinc-300 text-xs">{isRtl ? 'حمله با شمشیر کاتانا' : 'Katana Slash Attack'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 font-mono text-xs font-bold text-cyan-400">
                  K / Right Click
                </span>
                <span className="text-zinc-300 text-xs">{isRtl ? 'پرتاب ستاره شوریکن' : 'Throw Shuriken Star'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 font-mono text-xs font-bold text-sky-400">
                  L / Shift
                </span>
                <span className="text-zinc-300 text-xs">{isRtl ? 'دش سریع شبح' : 'Phantom Dash'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/80 flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-zinc-800 font-mono text-xs font-bold text-emerald-400">
                  U / Q
                </span>
                <span className="text-zinc-300 text-xs">{isRtl ? 'استتار کاواری‌می' : 'Kawarimi Disguise'}</span>
              </div>
            </div>
          </div>

          {/* Ninja Tactics */}
          <div className="space-y-3 pt-3 border-t border-zinc-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              {isRtl ? 'فنون پیشرفته شینوبی (آراشی)' : 'Advanced Shinobi Techniques'}
            </h4>

            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <ArrowUp className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <p>{trans.wallJumpTip}</p>
              </div>

              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  {isRtl
                    ? 'با فن کاواری‌می (تغییر چهره به مجسمه سنگ یا الوار)، تیرهای زهرآگین به شما آسیب نمی‌زنند و نگهبانان متوجه حضورتان نمی‌شوند.'
                    : 'With Kawarimi Disguise, you become a mossy stone statue. Guards walk past unaware, and poison darts bounce off.'}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <Sword className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{trans.secretWallTip}</p>
              </div>

              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p>
                  {isRtl
                    ? 'دش سریع نه‌تنها از روی تله‌های تیغی عبور می‌کند، بلکه به دشمنان در مسیر ضربه کشنده وارد می‌آورد.'
                    : 'Phantom Dash allows you to cross deadly spike pits and slashes all enemies in your trajectory.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs transition-colors"
          >
            {trans.close}
          </button>
        </div>
      </div>
    </div>
  );
};
