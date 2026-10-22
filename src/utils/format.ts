/**
 * Small formatting helpers. Persian (fa) UI converts western digits to
 * Persian-Indic digits everywhere numbers are shown, per Persian-first design.
 */
import { Language } from '../types/game';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Convert every ASCII digit in a value to its Persian glyph (and back for fa). */
export function toFaDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * Locale-aware digit helper (S.d = "shown digits"):
 *   S.d(1250, 'fa') -> '۱۲۵۰'   S.d(1250, 'en') -> '1250'
 */
export const S = {
  d(value: number | string, lang: Language): string {
    return lang === 'fa' ? toFaDigits(value) : String(value);
  },
  /** m:ss clock, Persian digits under fa. */
  time(totalSeconds: number, lang: Language): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const raw = `${m}:${String(r).padStart(2, '0')}`;
    return S.d(raw, lang);
  },
  /** ~2h 14m playtime style, localized unit letters kept minimal. */
  duration(totalSeconds: number, lang: Language): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${S.d(h, lang)}${lang === 'fa' ? 'سا' : 'h'} ${S.d(m, lang)}${lang === 'fa' ? 'د' : 'm'}`;
    return `${S.d(m, lang)}${lang === 'fa' ? 'د' : 'm'} ${S.d(s % 60, lang)}${lang === 'fa' ? 'ث' : 's'}`;
  },
};
