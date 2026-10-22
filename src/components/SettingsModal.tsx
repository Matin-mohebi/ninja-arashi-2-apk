import React from 'react';
import { X, Music, Volume2, Vibrate, Leaf, Globe, Settings as SettingsGlyph } from 'lucide-react';
import { Language } from '../types/game';
import { getTranslation } from '../utils/translations';
import { S } from '../utils/format';

export interface GameSettings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  shake: boolean;
  reducedParticles: boolean;
  lang: Language;
}

export const SETTINGS_KEY = 'ninja_arashi_2_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  musicVolume: 0.8,
  sfxVolume: 0.9,
  shake: true,
  reducedParticles: false,
  lang: 'fa',
};

/** Merge-safe read (unknown/old payloads fall back to defaults). */
export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<GameSettings>;
      return { ...DEFAULT_SETTINGS, ...p };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_SETTINGS };
}

interface SettingsModalProps {
  settings: GameSettings;
  lang: Language;
  onChange: (patch: Partial<GameSettings>) => void;
  onClose: () => void;
}

/** Settings (v1.2.0): music/SFX volume, screen shake, reduced particles, language. */
export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, lang, onChange, onClose }) => {
  const trans = getTranslation(lang);
  const isRtl = lang === 'fa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <SettingsGlyph className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-lg text-white">{trans.settingsTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Music volume */}
          <VolumeRow
            icon={<Music className="w-4 h-4 text-purple-400" />}
            label={trans.musicVolume}
            value={settings.musicVolume}
            lang={lang}
            onChange={(v) => onChange({ musicVolume: v })}
          />

          {/* SFX volume */}
          <VolumeRow
            icon={<Volume2 className="w-4 h-4 text-sky-400" />}
            label={trans.sfxVolume}
            value={settings.sfxVolume}
            lang={lang}
            onChange={(v) => onChange({ sfxVolume: v })}
          />

          {/* Screen shake */}
          <ToggleRow
            icon={<Vibrate className="w-4 h-4 text-rose-400" />}
            label={trans.screenShake}
            desc={trans.screenShakeDesc}
            checked={settings.shake}
            onText={trans.on}
            offText={trans.off}
            onChange={(v) => onChange({ shake: v })}
          />

          {/* Reduced particles */}
          <ToggleRow
            icon={<Leaf className="w-4 h-4 text-emerald-400" />}
            label={trans.reducedParticles}
            desc={trans.reducedParticlesDesc}
            checked={settings.reducedParticles}
            onText={trans.on}
            offText={trans.off}
            onChange={(v) => onChange({ reducedParticles: v })}
          />

          {/* Language */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-zinc-200">{trans.language}</span>
            </div>
            <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
              {(['fa', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => onChange({ lang: l })}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    lang === l ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {l === 'fa' ? 'فارسی' : 'English'}
                </button>
              ))}
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

const VolumeRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  lang: Language;
  onChange: (v: number) => void;
}> = ({ icon, label, value, lang, onChange }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-sm font-medium text-zinc-200">{label}</span>
      </div>
      <span className="text-xs font-mono tabular-nums text-zinc-400">
        {S.d(Math.round(value * 100), lang)}٪
      </span>
    </div>
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="w-full accent-rose-500 h-2 cursor-pointer"
      dir="ltr"
    />
  </div>
);

const ToggleRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  desc?: string;
  checked: boolean;
  onText: string;
  offText: string;
  onChange: (v: boolean) => void;
}> = ({ icon, label, desc, checked, onText, offText, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className="w-full flex items-center justify-between gap-3 text-right"
  >
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5">{icon}</span>
      <span>
        <span className="block text-sm font-medium text-zinc-200">{label}</span>
        {desc && <span className="block text-[11px] text-zinc-500 mt-0.5">{desc}</span>}
      </span>
    </div>
    <span
      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
        checked
          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
          : 'bg-zinc-900 border-zinc-700 text-zinc-500'
      }`}
    >
      {checked ? onText : offText}
    </span>
  </button>
);
