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
export function shouldShowRotateHint(): () => boolean {
  const portraitMq = window.matchMedia('(orientation: portrait)');
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return () => isTouch && portraitMq.matches;
}
