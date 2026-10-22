/**
 * MusicEngine — real streamed/sampled soundtrack for Ninja Arashi 2 (v1.2.0).
 *
 * Design notes:
 * - Own AudioContext, separate from the SFX manager (suspending music on
 *   pause/visibility must never mute gameplay SFX).
 * - Files live in `public/audio/*.ogg` (OGG Vorbis q6, seamless loops) and
 *   are fetched + decoded lazily per level — nothing blocks first paint and
 *   the JS bundle stays lean.
 * - Gapless loops via AudioBufferSourceNode.loop = true (sample-accurate).
 * - 0.8 s equal-power crossfade whenever the track changes.
 * - Small LRU cache (3 decoded buffers ≈ 90 MB worst case) bounds memory on
 *   low-end phones; evicted tracks simply re-fetch + re-decode on demand.
 * - Integrates with the game's one-time gesture unlock (pointerdown/keydown):
 *   the desired track is remembered and starts as soon as audio is allowed.
 * - Auto pause/resume on document visibilitychange.
 */

export type MusicTrack =
  | 'menu'
  | 'level1'
  | 'level2'
  | 'level3'
  | 'level4'
  | 'boss'
  | 'victory'
  | 'gameover';

const CACHE_MAX = 3;
const CROSSFADE_S = 0.8;

interface ActiveVoice {
  track: MusicTrack;
  source: AudioBufferSourceNode;
  gain: GainNode;
  loop: boolean;
}

class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cache = new Map<MusicTrack, AudioBuffer>();
  private inflight = new Map<MusicTrack, Promise<AudioBuffer | null>>();

  private current: ActiveVoice | null = null;
  /** What should be playing right now (remembered even before unlock). */
  private desired: { track: MusicTrack; loop: boolean } | null = null;
  /** Bumps on every play/stop so stale async loads are discarded. */
  private seq = 0;

  private volume = 0.8;
  private muted = false;
  private unlocked = false;
  private suspendedByVisibility = false;
  private visibilityHooked = false;

  // ------------------------------------------------------------ plumbing

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      try {
        this.ctx = new AC();
      } catch {
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (!this.visibilityHooked) {
      this.visibilityHooked = true;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Background tab / locked screen: save battery + avoid desync.
          if (this.ctx && this.ctx.state === 'running') {
            this.suspendedByVisibility = true;
            this.ctx.suspend().catch(() => {});
          }
        } else if (this.suspendedByVisibility && this.ctx) {
          this.suspendedByVisibility = false;
          this.ctx.resume().catch(() => {});
        }
      });
    }
    return this.ctx;
  }

  /**
   * Called from the app's one-time user-gesture handler. Creates/resumes the
   * context and immediately starts the desired track (menu or level).
   */
  unlock() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.unlocked = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (this.desired && !this.current) {
      void this.startTrack(this.desired.track, this.desired.loop);
    }
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    }
  }

  get isUnlocked() {
    return this.unlocked;
  }

  // ------------------------------------------------------------ loading

  private trackUrl(track: MusicTrack): string {
    // Relative to document base — works for dev (/), Pages subpath and the
    // Capacitor APK without any build-time constant.
    return new URL(`audio/${track}.ogg`, document.baseURI).href;
  }

  private load(track: MusicTrack): Promise<AudioBuffer | null> {
    const cached = this.cache.get(track);
    if (cached) return Promise.resolve(cached);
    const pending = this.inflight.get(track);
    if (pending) return pending;

    const p = (async () => {
      const ctx = this.ensureCtx();
      if (!ctx) return null;
      try {
        const res = await fetch(this.trackUrl(track));
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const buf = await ctx.decodeAudioData(arr);
        // LRU insert
        this.cache.set(track, buf);
        while (this.cache.size > CACHE_MAX) {
          let oldest: MusicTrack | null = null;
          for (const key of this.cache.keys()) {
            if (!this.current || this.current.track !== key) {
              oldest = key;
              break;
            }
          }
          if (!oldest) break; // everything left is in use
          this.cache.delete(oldest);
        }
        return buf;
      } catch {
        return null;
      } finally {
        this.inflight.delete(track);
      }
    })();
    this.inflight.set(track, p);
    return p;
  }

  /** Optional warm-up (e.g. start decoding the menu while the title shows). */
  preload(track: MusicTrack) {
    if (this.unlocked) void this.load(track);
  }

  // ------------------------------------------------------------ playback

  /**
   * Crossfade to a track. Safe to call repeatedly with the same track
   * (no-ops). `loop=false` plays the sting once and then stays silent.
   */
  play(track: MusicTrack, loop = true) {
    this.desired = { track, loop };
    if (!this.unlocked) return; // starts after the gesture unlock
    void this.startTrack(track, loop);
  }

  private async startTrack(track: MusicTrack, loop: boolean) {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const mySeq = ++this.seq;
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        /* will retry on next gesture */
      }
    }
    // Already playing exactly this? Keep the seamless loop untouched.
    if (
      this.current &&
      this.current.track === track &&
      this.current.loop === loop &&
      this.seq === mySeq
    )
      return;

    const buf = await this.load(track);
    if (!buf) return;
    // Superseded while decoding (rapid navigation)?
    if (mySeq !== this.seq || !this.desired || this.desired.track !== track) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(1.0, now + CROSSFADE_S);
    gain.connect(this.master!);

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = loop;
    source.connect(gain);
    source.onended = () => {
      // Natural end (one-shot sting) — forget the voice so it can replay.
      if (this.current && this.current.source === source) {
        this.current = null;
        if (!loop && this.desired && this.desired.track === track) {
          this.desired = null;
        }
      }
    };

    // Fade out whatever is currently playing (crossfade).
    if (this.current) {
      const old = this.current;
      this.current = null;
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0.0001, now + CROSSFADE_S);
      try {
        old.source.stop(now + CROSSFADE_S + 0.05);
      } catch {
        /* already stopped */
      }
    }

    this.current = { track, source, gain, loop };
    source.start(now);
  }

  /** Pause playback (suspend ctx) — used on level pause & app background. */
  pause() {
    if (this.ctx && this.ctx.state === 'running' && this.current) {
      this.suspendedByVisibility = false;
      this.ctx.suspend().catch(() => {});
    }
  }

  /** Resume after pause(). */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Hard stop (fade out + forget desired track) — e.g. teardown. */
  stop(fadeSeconds = 0.4) {
    this.desired = null;
    this.seq++;
    if (!this.ctx || !this.current) return;
    const now = this.ctx.currentTime;
    const old = this.current;
    this.current = null;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(old.gain.gain.value, now);
    old.gain.gain.linearRampToValueAtTime(0.0001, now + fadeSeconds);
    try {
      old.source.stop(now + fadeSeconds + 0.05);
    } catch {
      /* already stopped */
    }
  }
}

export const music = new MusicEngine();
