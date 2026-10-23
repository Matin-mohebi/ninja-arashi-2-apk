/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ZeusGame — NINJA ZEUS endless 3D runner (v1.4.0)
 *
 * Ported from the community prototype (Three.js auto-runner) and hardened:
 *  - fixed missing `||` chains in key handlers (prototype had `Space  ArrowUp`)
 *  - fixed undefined `time` references (now threaded through update/animation)
 *  - fixed background scroll (texture map offset, not material offset)
 *  - fixed DirectionalLight.target never added to the scene
 *  - fixed background/particles left behind after ~100 world units (decor group
 *    now follows the player)
 *  - fixed click + touchstart double-firing on mobile (single Pointer Events
 *    pipeline with swipe-to-change-lane + tap-to-jump)
 *  - platform segments no longer overlap; consecutive x offsets stay reachable
 *  - obstacles can never block all three lanes in the same segment
 *  - lazy AudioContext (created on first user gesture), WebAudio SFX only
 *  - persistent best score (localStorage, guarded)
 *  - adaptive quality: pixel-ratio cap, shadow map 1024, reduced particles on
 *    low-end devices
 *  - full dispose() so React unmount never leaks the WebGL context
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export interface ZeusHud {
  score: number;
  gems: number;
  health: number;
}

export interface ZeusGameCallbacks {
  onHud: (hud: ZeusHud) => void;
  onGameOver: (score: number, gems: number, best: number) => void;
  onBest: (best: number) => void;
}

const BEST_KEY = 'ninja_zeus_best_v1';

const LANES = [-1, 0, 1];
const LANE_WIDTH = 4;
const SEGMENT_LEN = 22;
const AHEAD_SEGS = 7; // segments generated beyond the farthest visible
const BEHIND_CUTOFF = 45; // world units behind the player before cleanup
const BASE_SPEED = 12;
const MAX_SPEED = 26;

/** Synth SFX — no audio files needed (prototype design kept). */
class ZeusAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  /** Must be called from a user gesture (click/touch) to satisfy autoplay. */
  resume() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.3;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      /* audio unsupported — game still runs */
    }
  }

  suspend() {
    try {
      if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
    } catch {
      /* ignore */
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number) {
    if (this.muted || !this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol * this.master.gain.value;
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  jump() { this.tone(440, 0.1, 'square', 0.2); }
  gem() { this.tone(880, 0.15, 'sine', 0.3); this.tone(1320, 0.1, 'sine', 0.2); }
  hit() { this.tone(150, 0.3, 'sawtooth', 0.4); }
  over() {
    [200, 150, 100].forEach((f, i) =>
      window.setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.3), i * 150),
    );
  }
}

interface NinjaParts {
  torso: THREE.Mesh;
  head: THREE.Mesh;
  armL: THREE.Mesh;
  armR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  scarf: THREE.Mesh;
  eyeL: THREE.Mesh;
  eyeR: THREE.Mesh;
  aura: THREE.Mesh;
  sword: THREE.Mesh;
}

interface ZeusObstacle extends THREE.Mesh {
  userData: {
    kind: 'spike' | 'block' | 'blade';
    height: number;
    halfWidth: number;
    rotSpeed: number;
  };
}

interface ZeusGem extends THREE.Mesh {
  userData: {
    collected: boolean;
    rotSpeed: number;
    bobSpeed: number;
    bobOffset: number;
    baseY: number;
  };
}

interface ZeusPlatform extends THREE.Mesh {
  userData: { kind: 'normal' | 'ice' | 'breakable'; width: number; broken: boolean };
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(v: number) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* private mode */
  }
}

export class ZeusGame {
  private container: HTMLElement;
  private cb: ZeusGameCallbacks;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private audio = new ZeusAudio();
  private muted = false;

  // world
  private decor = new THREE.Group();
  private bgMesh!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private particles!: THREE.Points;
  private mainLight!: THREE.DirectionalLight;
  private playerGroup = new THREE.Group();
  private ninja!: NinjaParts;

  private platforms: ZeusPlatform[] = [];
  private edges: THREE.Mesh[] = [];
  private obstacles: ZeusObstacle[] = [];
  private gems: ZeusGem[] = [];
  private gemBursts: { pts: THREE.Points; vels: THREE.Vector3[]; life: number }[] = [];
  private lastSegCenter = 0;
  private lastSegX = 0;

  private player = {
    pos: new THREE.Vector3(0, 1, 0),
    vel: new THREE.Vector3(),
    onGround: false,
    jumpForce: 16,
    gravity: -38,
    lane: 0,
    targetLane: 0,
    animTime: 0,
    invincible: 0,
  };

  private state = {
    running: false,
    over: false,
    score: 0,
    gems: 0,
    health: 3,
    speed: BASE_SPEED,
    runTime: 0,
  };

  private best = loadBest();
  private hudDirty = true;
  private resizeHandler = () => this.onResize();
  private keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e, true);
  private keyUpHandler = (e: KeyboardEvent) => this.onKeyDown(e, false);
  private pointerHandler: (e: PointerEvent) => void;
  private gesture = { id: -1, x0: 0, t0: 0, swiped: false };

  constructor(container: HTMLElement, cb: ZeusGameCallbacks, muted: boolean) {
    this.container = container;
    this.cb = cb;
    this.muted = muted;
    this.audio.muted = muted;

    const lowEnd =
      (navigator.hardwareConcurrency || 8) <= 4 ||
      /Android|iPhone|iPad/i.test(navigator.userAgent);

    // --- renderer / scene / camera ---
    this.renderer = new THREE.WebGLRenderer({ antialias: !lowEnd, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !lowEnd;
    if (this.renderer.shadowMap.enabled) this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x00080c, 0.03);
    this.scene.add(this.decor);

    this.camera = new THREE.PerspectiveCamera(
      60,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.1,
      220,
    );
    this.camera.position.set(0, 4, 18);
    this.camera.lookAt(0, 2, 0);

    // --- post-processing (bloom) ---
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(
        (container.clientWidth || window.innerWidth) / 2,
        (container.clientHeight || window.innerHeight) / 2,
      ),
      lowEnd ? 0.55 : 0.8,
      0.4,
      0.6,
    );
    this.composer.addPass(this.bloom);

    // --- environment ---
    this.buildBackground();
    this.buildParticles(lowEnd);
    this.buildLights(lowEnd);
    this.buildNinja();
    this.scene.add(this.playerGroup);

    // --- input ---
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.pointerHandler = (e: PointerEvent) => this.onPointer(e);
    this.renderer.domElement.addEventListener('pointerdown', this.pointerHandler);
    this.renderer.domElement.addEventListener('pointermove', this.pointerHandler);
    this.renderer.domElement.addEventListener('pointerup', this.pointerHandler);
    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.resetWorld();
    this.loop();
  }

  // ================= environment =================

  private buildBackground() {
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, '#002222');
      grad.addColorStop(0.5, '#00111a');
      grad.addColorStop(1, '#000508');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      // lightning bolts
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        const x = size * (0.2 + 0.6 * Math.random());
        const y = size * (0.1 + 0.3 * Math.random());
        g.moveTo(x, y);
        for (let j = 0; j < 8; j++) g.lineTo(x + (Math.random() - 0.5) * 40, y + j * 30 + Math.random() * 20);
        g.lineWidth = 3 + Math.random() * 2;
        g.strokeStyle = '#00ffff15';
        g.stroke();
      }
      // greek meander
      g.strokeStyle = '#00ffff08';
      g.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
        const y = i * 25;
        g.beginPath();
        g.moveTo(0, y);
        for (let x = 0; x < size; x += 20) {
          g.lineTo(x + 10, y + 10);
          g.lineTo(x + 20, y);
        }
        g.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);

    const geo = new THREE.PlaneGeometry(220, 110);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    this.bgMesh = new THREE.Mesh(geo, mat);
    this.bgMesh.position.set(0, 16, -46);
    this.bgMesh.rotation.x = -0.12;
    this.decor.add(this.bgMesh);
  }

  private buildParticles(lowEnd: boolean) {
    const count = lowEnd ? 350 : 800;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 220;
      pos[i * 3 + 1] = Math.random() * 55;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 120 - 20;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 1,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.particles = new THREE.Points(geo, mat);
    this.decor.add(this.particles);
  }

  private buildLights(lowEnd: boolean) {
    this.scene.add(new THREE.AmbientLight(0x00ffff, 0.3));

    this.mainLight = new THREE.DirectionalLight(0x00ffff, 1.05);
    this.mainLight.position.set(24, 44, 18);
    if (!lowEnd) {
      this.mainLight.castShadow = true;
      this.mainLight.shadow.mapSize.set(1024, 1024);
      this.mainLight.shadow.camera.near = 1;
      this.mainLight.shadow.camera.far = 110;
      this.mainLight.shadow.camera.left = -34;
      this.mainLight.shadow.camera.right = 34;
      this.mainLight.shadow.camera.top = 34;
      this.mainLight.shadow.camera.bottom = -12;
      this.mainLight.shadow.bias = -0.001;
    }
    this.scene.add(this.mainLight);
    this.scene.add(this.mainLight.target); // FIX: target must be in the scene

    const rim = new THREE.DirectionalLight(0x0044ff, 0.6);
    rim.position.set(-20, 12, -18);
    this.scene.add(rim);
  }

  private buildNinja() {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x00080c,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x001111,
      emissiveIntensity: 0.25,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6, depthWrite: false });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.7, 4, 8), bodyMat);
    torso.position.y = 1.3;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), bodyMat);
    head.position.y = 2.1;
    head.scale.y = 1.1;

    const mask = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.4),
      new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide }),
    );
    mask.position.set(0, 2.1, 0.36);

    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12, 2.15, 0.38);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12, 2.15, 0.38);

    const armGeo = new THREE.CapsuleGeometry(0.12, 0.55, 4, 8);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.6, 1.4, 0);
    armL.rotation.z = 0.3;
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.6, 1.4, 0);
    armR.rotation.z = -0.3;

    const legGeo = new THREE.CapsuleGeometry(0.14, 0.65, 4, 8);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.2, 0.5, 0);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.2, 0.5, 0);

    const scarf = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 1.2, 4, 8),
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        roughness: 0.7,
        metalness: 0.2,
        side: THREE.DoubleSide,
        emissive: 0x003333,
        emissiveIntensity: 0.35,
      }),
    );
    scarf.position.set(0, 1.5, -0.4);
    scarf.rotation.x = -0.2;

    const sword = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 1.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.1 }),
    );
    sword.position.set(0.35, 1.3, -0.3);
    sword.rotation.z = -0.4;

    const aura = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.05, 8, 32), glowMat);
    aura.position.y = 1.2;
    aura.rotation.x = -Math.PI / 2;

    this.playerGroup.add(torso, head, mask, eyeL, eyeR, armL, armR, legL, legR, scarf, sword, aura);
    this.ninja = { torso, head, armL, armR, legL, legR, scarf, eyeL, eyeR, aura, sword };
  }

  // ================= level generation =================

  private makePlatform(centerZ: number, width: number, kind: ZeusPlatform['userData']['kind'], x: number): ZeusPlatform {
    const geo = new THREE.BoxGeometry(width, 0.6, SEGMENT_LEN);
    let mat: THREE.MeshStandardMaterial;
    if (kind === 'normal') {
      mat = new THREE.MeshStandardMaterial({
        color: 0x001a1f,
        roughness: 0.6,
        metalness: 0.3,
        emissive: 0x001111,
        emissiveIntensity: 0.2,
      });
    } else if (kind === 'ice') {
      mat = new THREE.MeshStandardMaterial({
        color: 0x00c8d8,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.72,
        emissive: 0x00ffff,
        emissiveIntensity: 0.28,
      });
    } else {
      mat = new THREE.MeshStandardMaterial({
        color: 0x331111,
        roughness: 0.8,
        metalness: 0.1,
        emissive: 0x330000,
        emissiveIntensity: 0.25,
      });
    }
    const mesh = new THREE.Mesh(geo, mat) as unknown as ZeusPlatform;
    mesh.position.set(x, 0.3, centerZ);
    mesh.receiveShadow = this.renderer.shadowMap.enabled;
    mesh.userData = { kind, width, broken: false };
    this.scene.add(mesh);
    this.platforms.push(mesh);

    // FIX: the prototype's single "edge" box covered the WHOLE platform top,
    // drowning the dark material in cyan. Real glowing rim = 4 thin strips.
    const rimMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 });
    const rimH = 0.06;
    const rimT = 0.06;
    const topY = 0.63;
    for (const sx of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(rimT, rimH, SEGMENT_LEN + rimT), rimMat);
      r.position.set(x + sx * (width / 2), topY, centerZ);
      this.scene.add(r);
      this.edges.push(r);
    }
    for (const sz of [-1, 1]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(width + rimT, rimH, rimT), rimMat);
      r.position.set(x, topY, centerZ + sz * (SEGMENT_LEN / 2));
      this.scene.add(r);
      this.edges.push(r);
    }
    return mesh;
  }

  private makeObstacle(z: number, lane: number): void {
    const kinds: ZeusObstacle['userData']['kind'][] = ['spike', 'block', 'blade'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    let mesh: THREE.Mesh;
    let height = 1.5;
    let halfWidth = 0.5;

    if (kind === 'spike') {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1.5, 4),
        new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.2, metalness: 0.8, emissive: 0xff0000, emissiveIntensity: 0.6 }),
      );
      // FIX: prototype laid spikes flat (rotation.x = -PI/2); traps point UP
      height = 1.5;
    } else if (kind === 'block') {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.8, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x001111, roughness: 0.4, metalness: 0.5, emissive: 0x002222, emissiveIntensity: 0.35 }),
      );
      height = 1.8;
      halfWidth = 0.6;
    } else {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 2.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9, roughness: 0.1, emissive: 0xff2222, emissiveIntensity: 0.35 }),
      );
      mesh.rotation.z = Math.PI / 2;
      height = 2.0;
      halfWidth = 1.2;
    }

    mesh.position.set(lane * LANE_WIDTH, height / 2, z);
    const obs = mesh as ZeusObstacle;
    obs.userData = { kind, height, halfWidth, rotSpeed: kind === 'blade' ? 8 : 0 };
    this.scene.add(mesh);
    this.obstacles.push(obs);
  }

  private makeGem(z: number, lane: number, y: number): void {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.35, 0),
      new THREE.MeshStandardMaterial({ color: 0x00ffff, roughness: 0.1, metalness: 0.9, emissive: 0x00ffff, emissiveIntensity: 1 }),
    );
    mesh.position.set(lane * LANE_WIDTH, y, z);
    const gem = mesh as unknown as ZeusGem;
    gem.userData = {
      collected: false,
      rotSpeed: 2,
      bobSpeed: 3 + Math.random(),
      bobOffset: Math.random() * Math.PI * 2,
      baseY: y,
    };
    this.scene.add(mesh);
    this.gems.push(gem);
  }

  /** One 22-unit corridor segment. Guarantees >=1 free lane for obstacles. */
  private generateSegment(centerZ: number, safe: boolean): void {
    const kinds: ZeusPlatform['userData']['kind'][] = ['normal', 'normal', 'normal', 'ice', 'breakable'];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const width = 7 + Math.random() * 5; // 7..12
    // FIX: keep consecutive platforms reachable (prototype scattered x freely)
    const x = Math.max(-4, Math.min(4, this.lastSegX + (Math.random() - 0.5) * 5));
    this.lastSegX = x;
    this.makePlatform(centerZ, width, kind, x);

    if (safe) {
      // intro segments: gems only
      for (let i = 0; i < 2; i++) {
        if (Math.random() < 0.7) {
          const lane = LANES[Math.floor(Math.random() * 3)];
          this.makeGem(centerZ + (Math.random() - 0.5) * 10, lane, 1.5 + Math.random() * 1.5);
        }
      }
      return;
    }

    // obstacles: at most 2 of 3 lanes → always a free lane
    const order = [...LANES].sort(() => Math.random() - 0.5);
    const nObs = Math.random() < 0.75 ? 1 + Math.floor(Math.random() * 2) : 0;
    for (let i = 0; i < nObs; i++) {
      const lane = order[i];
      const z = centerZ + (Math.random() - 0.5) * (SEGMENT_LEN * 0.6);
      this.makeObstacle(z, lane);
    }

    // gems
    const nGems = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < nGems; i++) {
      const lane = LANES[Math.floor(Math.random() * 3)];
      this.makeGem(centerZ + (Math.random() - 0.5) * (SEGMENT_LEN * 0.7), lane, 1.5 + Math.random() * 2);
    }
  }

  private resetWorld() {
    for (const arr of [this.platforms, this.obstacles, this.gems] as THREE.Mesh[][]) {
      for (const m of arr) {
        this.scene.remove(m);
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      arr.length = 0;
    }
    for (const m of this.edges) {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    this.edges.length = 0;
    this.lastSegX = 0;
    this.lastSegCenter = 0;
    for (let i = 0; i < AHEAD_SEGS + 2; i++) {
      this.generateSegment(this.lastSegCenter, i < 2);
      this.lastSegCenter -= SEGMENT_LEN;
    }
  }

  // ================= public API =================

  startRun() {
    this.audio.resume();
    this.state = {
      running: true,
      over: false,
      score: 0,
      gems: 0,
      health: 3,
      speed: BASE_SPEED,
      runTime: 0,
    };
    this.player.pos.set(0, 1, 0);
    this.player.vel.set(0, 0, 0);
    this.player.onGround = false;
    this.player.lane = 0;
    this.player.targetLane = 0;
    this.player.animTime = 0;
    this.player.invincible = 0;
    this.hudDirty = true;
    this.resetWorld();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.audio.muted = m;
  }

  pause() {
    this.audio.suspend();
  }

  resume() {
    if (this.state.running && !this.state.over) this.audio.resume();
  }

  getBest() {
    return this.best;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerHandler);
    this.renderer.domElement.removeEventListener('pointermove', this.pointerHandler);
    this.renderer.domElement.removeEventListener('pointerup', this.pointerHandler);
    this.audio.suspend();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // ================= input =================

  private onKeyDown(e: KeyboardEvent, down: boolean) {
    if (e.repeat) return;
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') this.moveLane(down ? -1 : 0);
    else if (c === 'ArrowRight' || c === 'KeyD') this.moveLane(down ? 1 : 0);
    else if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') {
      // FIX: the prototype lost its `||` operators here
      if (down) this.tryJump();
    }
  }

  private moveLane(dir: number) {
    if (!this.state.running || this.state.over) return;
    if (dir === 0) return;
    this.player.targetLane = Math.max(-1, Math.min(1, this.player.targetLane + dir));
  }

  private tryJump() {
    if (!this.state.running || this.state.over) return;
    if (this.player.onGround) {
      this.player.vel.y = this.player.jumpForce;
      this.player.onGround = false;
      this.audio.jump();
    }
  }

  /** Pointer pipeline: swipe left/right changes lane, quick tap jumps. */
  private onPointer(e: PointerEvent) {
    if (e.type === 'pointerdown') {
      this.gesture = { id: e.pointerId, x0: e.clientX, t0: performance.now(), swiped: false };
      return;
    }
    if (e.type === 'pointermove' && e.pointerId === this.gesture.id && !this.gesture.swiped) {
      const dx = e.clientX - this.gesture.x0;
      if (Math.abs(dx) > 28) {
        this.moveLane(dx > 0 ? 1 : -1);
        this.gesture.swiped = true;
      }
      return;
    }
    if (e.type === 'pointerup' && e.pointerId === this.gesture.id) {
      const quick = performance.now() - this.gesture.t0 < 260;
      if (!this.gesture.swiped && quick) this.tryJump();
      this.gesture.id = -1;
    }
  }

  private onResize() {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.setSize(w / 2, h / 2);
  }

  // ================= main loop =================

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const now = this.clock.elapsedTime;

    if (this.state.running && !this.state.over) this.updateGame(dt, now);

    // ambient decor (always alive) — FIX: texture offset lives on the map
    if (this.bgMesh.material.map) this.bgMesh.material.map.offset.y -= dt * 0.02;
    this.particles.rotation.y += dt * 0.002;
    // decor follows the runner so the backdrop never falls behind
    this.decor.position.z = this.player.pos.z;

    if (this.ninja.aura) {
      this.ninja.aura.rotation.z += dt * 2;
      (this.ninja.aura.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(now * 3) * 0.2;
    }

    // gem bursts
    for (let i = this.gemBursts.length - 1; i >= 0; i--) {
      const b = this.gemBursts[i];
      b.life -= dt * 1.4;
      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        (b.pts.material as THREE.Material).dispose();
        this.gemBursts.splice(i, 1);
        continue;
      }
      const attr = b.pts.geometry.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < b.vels.length; j++) {
        b.vels[j].y -= 9 * dt;
        attr.setXYZ(
          j,
          attr.getX(j) + b.vels[j].x * dt,
          attr.getY(j) + b.vels[j].y * dt,
          attr.getZ(j) + b.vels[j].z * dt,
        );
      }
      attr.needsUpdate = true;
      (b.pts.material as THREE.PointsMaterial).opacity = b.life;
    }

    this.composer.render();
  };

  private updateGame(dt: number, now: number) {
    const st = this.state;
    st.runTime += dt;
    st.speed = Math.min(MAX_SPEED, BASE_SPEED + st.runTime * 0.35);

    const dz = st.speed * dt;
    this.player.pos.z -= dz;
    st.score += Math.max(1, Math.floor(dz * 10));

    // smooth lane transition
    const targetX = this.player.targetLane * LANE_WIDTH;
    this.player.pos.x += (targetX - this.player.pos.x) * Math.min(1, dt * 15);

    // physics
    this.player.vel.y += this.player.gravity * dt;
    this.player.pos.y += this.player.vel.y * dt;

    // ground check
    let onPlatform = false;
    let platformY = 1;
    const halfL = SEGMENT_LEN / 2;
    for (const plat of this.platforms) {
      const halfW = plat.userData.width / 2;
      if (
        this.player.pos.x > plat.position.x - halfW &&
        this.player.pos.x < plat.position.x + halfW &&
        this.player.pos.z > plat.position.z - halfL &&
        this.player.pos.z < plat.position.z + halfL &&
        this.player.pos.y <= plat.position.y + 0.75 &&
        this.player.vel.y <= 0
      ) {
        onPlatform = true;
        platformY = plat.position.y + 0.6;
        if (plat.userData.kind === 'ice') this.player.pos.x += (Math.random() - 0.5) * 0.08;
        break;
      }
    }
    this.player.onGround = onPlatform;
    if (onPlatform) {
      this.player.pos.y = platformY;
      this.player.vel.y = 0;
    }

    if (this.player.pos.y < -10) {
      this.gameOver();
      return;
    }

    this.playerGroup.position.copy(this.player.pos);

    this.player.animTime += dt * (st.speed / 8);
    this.animateNinja(this.player.animTime, this.player.onGround, this.player.vel.y, now);

    if (this.player.invincible > 0) this.player.invincible -= dt;

    for (const obs of this.obstacles) {
      if (obs.userData.rotSpeed) obs.rotation.y += obs.userData.rotSpeed * dt;
      this.checkObstacle(obs);
    }

    for (const gem of this.gems) {
      if (gem.userData.collected) continue;
      gem.rotation.y += gem.userData.rotSpeed * dt;
      gem.position.y = gem.userData.baseY + Math.sin(now * gem.userData.bobSpeed + gem.userData.bobOffset) * 0.25;
      if (this.player.pos.distanceTo(gem.position) < 1.25) this.collectGem(gem);
    }

    // streaming cleanup + generation
    const cutoff = this.player.pos.z + BEHIND_CUTOFF;
    this.cleanup(this.platforms, cutoff);
    this.cleanup(this.edges as unknown as (ZeusPlatform | ZeusObstacle | ZeusGem)[], cutoff);
    this.cleanup(this.obstacles, cutoff);
    this.cleanup(this.gems, cutoff);
    while (this.lastSegCenter > this.player.pos.z - AHEAD_SEGS * SEGMENT_LEN) {
      this.generateSegment(this.lastSegCenter, false);
      this.lastSegCenter -= SEGMENT_LEN;
    }

    // camera + light follow
    this.camera.position.z = this.player.pos.z + 18;
    this.camera.position.y = 4 + Math.sin(now * 2) * 0.1;
    this.camera.position.x = this.player.pos.x * 0.5;
    this.camera.lookAt(this.player.pos.x * 0.6, 2, this.player.pos.z - 10);
    this.mainLight.position.z = this.player.pos.z + 20;
    this.mainLight.target.position.set(this.player.pos.x, 0, this.player.pos.z - 10);

    if (this.hudDirty) {
      this.hudDirty = false;
      this.cb.onHud({ score: st.score, gems: st.gems, health: st.health });
    }
  }

  private animateNinja(t: number, grounded: boolean, velY: number, now: number) {
    const lean = Math.max(-0.5, Math.min(0.5, -velY * 0.03));
    const n = this.ninja;
    n.torso.rotation.x = lean;
    n.head.rotation.x = lean * 0.5;
    n.scarf.rotation.x = -0.2 + lean;

    if (grounded) {
      const leg = Math.sin(t * 12) * 0.8;
      const arm = Math.sin(t * 12) * 0.6;
      n.legL.rotation.x = leg;
      n.legR.rotation.x = -leg;
      n.armL.rotation.x = -arm;
      n.armR.rotation.x = arm;
      n.torso.position.y = 1.3 + Math.abs(Math.sin(t * 24)) * 0.05;
      n.head.position.y = 2.1 + Math.abs(Math.sin(t * 24)) * 0.05;
    } else {
      n.legL.rotation.x = -0.3;
      n.legR.rotation.x = 0.5;
      n.armL.rotation.x = -0.8;
      n.armR.rotation.x = 0.3;
      n.torso.position.y = 1.3;
      n.head.position.y = 2.1;
    }

    if (this.player.invincible > 0) {
      const flash = Math.sin(now * 40) > 0;
      n.torso.visible = n.head.visible = n.armL.visible = n.armR.visible = n.legL.visible = n.legR.visible = flash;
    } else {
      n.torso.visible = n.head.visible = n.armL.visible = n.armR.visible = n.legL.visible = n.legR.visible = true;
    }
  }

  private checkObstacle(obs: ZeusObstacle) {
    if (this.player.invincible > 0) return;
    const dx = Math.abs(this.player.pos.x - obs.position.x);
    const dz = Math.abs(this.player.pos.z - obs.position.z);
    const dy = Math.abs(this.player.pos.y - obs.position.y);
    if (dx < obs.userData.halfWidth + 0.4 && dz < 0.7 && dy < obs.userData.height / 2 + 0.55) {
      this.takeDamage();
    }
  }

  private collectGem(gem: ZeusGem) {
    gem.userData.collected = true;
    this.state.gems += 1;
    this.state.score += 50;
    this.hudDirty = true;
    this.audio.gem();
    this.spawnBurst(gem.position.clone());
    this.scene.remove(gem);
    gem.geometry.dispose();
    (gem.material as THREE.Material).dispose();
  }

  private takeDamage() {
    this.state.health -= 1;
    this.player.invincible = 1.5;
    this.hudDirty = true;
    this.audio.hit();
    if (this.state.health <= 0) this.gameOver();
  }

  private gameOver() {
    if (this.state.over) return;
    this.state.over = true;
    this.state.running = false;
    this.audio.over();
    if (this.state.score > this.best) {
      this.best = this.state.score;
      saveBest(this.best);
      this.cb.onBest(this.best);
    }
    this.cb.onGameOver(this.state.score, this.state.gems, this.best);
    this.cb.onHud({ score: this.state.score, gems: this.state.gems, health: Math.max(0, this.state.health) });
  }

  private spawnBurst(pos: THREE.Vector3) {
    const count = 12;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const vels: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      vels.push(new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 8 + 4, (Math.random() - 0.5) * 9));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.3,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.gemBursts.push({ pts, vels, life: 1 });
  }

  private cleanup(arr: (ZeusPlatform | ZeusObstacle | ZeusGem)[], zCutoff: number) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const obj = arr[i];
      if (obj.position.z > zCutoff) {
        this.scene.remove(obj);
        obj.geometry.dispose();
        const m = obj.material as THREE.Material;
        if (m) m.dispose();
        arr.splice(i, 1);
      }
    }
  }
}
