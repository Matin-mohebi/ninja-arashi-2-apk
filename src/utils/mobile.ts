/**
 * Mobile / Android (Capacitor) shell helpers.
 * - Detects native Capacitor runtime (APK)
 * - Bridges the Android hardware Back button into a DOM event
 * - Exposes a safe exitApp() for native builds (no-op on web)
 */

export const isNativeApp = (): boolean => {
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform();
  } catch {
    return false;
  }
};

/** Initialize Android back-button bridging. Returns cleanup fn. */
export function initAndroidBackButton(): () => void {
  if (!isNativeApp()) return () => {};
  let cleanup = () => {};
  // Dynamic import: on web builds this module is never loaded.
  import('@capacitor/app')
    .then(async ({ App }) => {
      const handle = await App.addListener('backButton', () => {
        window.dispatchEvent(new Event('android-back'));
      });
      if (handle && typeof handle.remove === 'function') {
        cleanup = () => handle.remove();
      }
    })
    .catch(() => {});
  return () => cleanup();
}

/** Exit the app on native builds (no-op on web). */
export function exitApp() {
  if (!isNativeApp()) return;
  import('@capacitor/app')
    .then(({ App }) => App.exitApp())
    .catch(() => {});
}

/** Block long-press context menu / selection popups on touch devices. */
export function preventTouchChrome(): () => void {
  const onCtx = (e: MouseEvent) => e.preventDefault();
  const onSelect = (e: Event) => e.preventDefault();
  document.addEventListener('contextmenu', onCtx);
  document.addEventListener('selectstart', onSelect);
  return () => {
    document.removeEventListener('contextmenu', onCtx);
    document.removeEventListener('selectstart', onSelect);
  };
}

/** True for touch devices held in portrait orientation (needs rotate-device hint). */
export function shouldShowRotateHint(): boolean {
  try {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const portrait = window.matchMedia('(orientation: portrait)').matches;
    return isTouch && portrait;
  } catch {
    return false;
  }
}

/**
 * Subscribe to real orientation flips via the matchMedia "change" event.
 * This is the reliable signal on iOS Safari / Android Chrome — it fires only
 * when the orientation query actually flips (unlike orientationchange, which
 * can fire before the viewport/layout has settled). Returns a cleanup fn.
 */
export function watchOrientation(onChange: () => void): () => void {
  try {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = () => onChange();
    type LegacyMq = { addListener?: (cb: () => void) => void; removeListener?: (cb: () => void) => void };
    const legacy = mq as unknown as LegacyMq;
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    if (typeof legacy.addListener === 'function') {
      legacy.addListener(handler);
      return () => legacy.removeListener?.(handler);
    }
    return () => {};
  } catch {
    return () => {};
  }
}
