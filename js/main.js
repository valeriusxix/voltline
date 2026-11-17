import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* =====================================================================
   Basics
   ===================================================================== */
const $ = (s, r = document) => r.querySelector(s);
const ACCENT = 0x10B981;
const FLOOR = 0.4;
const TAKT_REAL = 52, SIM = 4, TAKT = TAKT_REAL / SIM, TF = 0.22;
const MOBILE = matchMedia('(max-width: 900px)').matches;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const eio = t => { t = clamp(t, 0, 1); return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
const r01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const fmt = n => Math.round(n).toLocaleString('en-US');
const p2 = n => String(n).padStart(2, '0');
const hms = d => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const hm = d => `${p2(d.getHours())}:${p2(d.getMinutes())}`;
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tA = {}, tB = {}, tV = V(), tV2 = V(), tV3 = V();
let simT = 0;
const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
const ICON = {
  sun: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i" viewBox="0 0 24 24"><path d="M20.5 13.4A8.5 8.5 0 1 1 10.6 3.5a6.6 6.6 0 0 0 9.9 9.9z"/></svg>',
  rain: '<svg class="i" viewBox="0 0 24 24"><path d="M17.5 15.5A4.5 4.5 0 0 0 17 6.6 6 6 0 0 0 5.5 8.5 3.6 3.6 0 0 0 6.5 15.5"/><path d="M8 18l-1 3M12 17l-1 4M16 18l-1 3"/></svg>',
  fog: '<svg class="i" viewBox="0 0 24 24"><path d="M4 8h12M3 12h17M6 16h14M5 20h10"/></svg>',
  heat: '<svg class="i" viewBox="0 0 24 24"><path d="M14 14.8V4.5a2 2 0 0 0-4 0v10.3a4 4 0 1 0 4 0z"/><path d="M18 6h3M18 10h2"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
};

try { await Promise.race([document.fonts.load(`800 48px ${FONT}`), new Promise(r => setTimeout(r, 1500))]); } catch (e) { }

/* =====================================================================
   Renderer / camera / controls / lights
   ===================================================================== */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
$('#scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xE9F0ED);
scene.fog = new THREE.Fog(0xE9F0ED, 300, 900);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 2400);
const controls = new OrbitControls(camera, renderer.domElement);
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.screenSpacePanning = false;
controls.enableDamping = true; controls.dampingFactor = .09;
controls.minDistance = 10; controls.maxDistance = 520;
controls.minPolarAngle = .18; controls.maxPolarAngle = 1.33;
controls.panSpeed = 1.1; controls.rotateSpeed = .6; controls.zoomSpeed = 1.1;
const VIEW_DIR = V(.6, .74, .86).normalize();
const HOME = { target: MOBILE ? V(4, 0, 8) : V(18, 0, 12), dist: MOBILE ? (innerWidth < innerHeight ? 450 : 290) : 212 };
controls.target.copy(HOME.target);
camera.position.copy(HOME.target).addScaledVector(VIEW_DIR, HOME.dist);
controls.update();

const hemi = new THREE.HemisphereLight(0xffffff, 0xD6DBD8, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(105, 128, 62); sun.target.position.set(10, 0, -4);
scene.add(sun, sun.target);
sun.castShadow = true;
const SM = MOBILE ? 1024 : 2048;
sun.shadow.mapSize.set(SM, SM);
Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 100, bottom: -100, near: 20, far: 460 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
const interiorLights = [-42, -14, 14, 42].map(x => { const l = new THREE.PointLight(0xFFEFD2, 0, 50, 2); l.position.set(x, FLOOR + 8, -2); scene.add(l); return l; });
const yardLights = [[70, 11, 24], [96, 11, 24], [86, 12, -18], [-70, 10, 0]].map(([x, y, z]) => { const l = new THREE.PointLight(0xFFEFD2, 0, 70, 2); l.position.set(x, y, z); scene.add(l); return l; });
const weldLight = new THREE.PointLight(0xFFD49A, 0, 16, 2); weldLight.position.set(-21, FLOOR + 2.4, 0); scene.add(weldLight);

/* =====================================================================
   Materials & geometry helpers
   ===================================================================== */
const matCache = new Map();
function M(color, o = {}) {
  const k = [color, o.r, o.m, o.op, o.e].join('|');
  if (matCache.has(k)) return matCache.get(k);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.r ?? .82, metalness: o.m ?? 0 });
  if (o.op != null) { m.transparent = true; m.opacity = o.op; m.depthWrite = false; }
  if (o.e != null) { m.emissive = new THREE.Color(o.e); m.emissiveIntensity = o.ei ?? 1; }
  matCache.set(k, m); return m;
}
const mWhite = M(0xF6F7F6), mPaper = M(0xEDF0EE, { r: .95 }), mLight = M(0xDCE1DE), mMid = M(0xBAC1BD), mSteel = M(0xA3ABA7, { r: .55, m: .25 });
const mDark = M(0x5A6460), mChar = M(0x2F3634, { r: .7 }), mAccent = M(ACCENT, { r: .55 });
const mAccentGlow = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: .9, roughness: .4 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0xDDE9E6, emissive: 0xFFE2A6, emissiveIntensity: .04, roughness: .55 });
const lampMat = new THREE.MeshStandardMaterial({ color: 0xF4F4EE, emissive: 0xFFF0CC, emissiveIntensity: .1 });
const tunnelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .85 });
const headOnMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFF8E6, emissiveIntensity: 1 });
const headOffMat = M(0xE6EBE9, { r: .25 });
const tailMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: .7 });
const mCabinGlass = new THREE.MeshStandardMaterial({ color: 0x25302E, roughness: .12, metalness: .35 });
const mGlassPanel = M(0xDDEBE7, { r: .1, op: .3 });
const chargeOn = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.1 });
const chargeDone = new THREE.MeshStandardMaterial({ color: 0xE9F7F1, emissive: ACCENT, emissiveIntensity: .35 });
const chargeOff = M(0x4A5350, { r: .4 });
const beaconOn = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.3 });
const beaconWait = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.1 });
const signMats = [];

const geoCache = new Map();
function RB(w, h, d, r = .12) {
  r = Math.min(r, w / 2 - .01, h / 2 - .01, d / 2 - .01);
  const k = `${w}|${h}|${d}|${r.toFixed(3)}`;
  let g = geoCache.get(k);
  if (!g) { g = r > .03 ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
  return g;
}
function blk(p, w, h, d, mat, x, yb, z, r = .1, cast = true) {
  const m = new THREE.Mesh(RB(w, h, d, r), mat);
  m.position.set(x, yb + h / 2, z); m.castShadow = cast; m.receiveShadow = true; p.add(m); return m;
}
function cyl(p, rt, rb, h, mat, x, yb, z, seg = 16) {
  const k = `c${rt}|${rb}|${h}|${seg}`; let g = geoCache.get(k);
  if (!g) { g = new THREE.CylinderGeometry(rt, rb, h, seg); geoCache.set(k, g); }
  const m = new THREE.Mesh(g, mat); m.position.set(x, yb + h / 2, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
const DOT = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.35, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const SOFT = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
function curveFrom(pts, y = 0) { const c = new THREE.CatmullRomCurve3(pts.map(p => V(p[0], y, p[1])), false, 'centripetal', .5); c.arcLengthDivisions = 600; return c; }
function smoothPts(pts, n = 60) { return curveFrom(pts).getSpacedPoints(n); }
function ribbon(pts, width, y, mat, closed = false) {
  const n = pts.length, pos = new Float32Array(n * 6), nor = new Float32Array(n * 6), idx = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
    let dx = b.x - a.x, dz = b.z - a.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const nx = -dz, nz = dx, p = pts[i];
    pos.set([p.x + nx * width / 2, y, p.z + nz * width / 2, p.x - nx * width / 2, y, p.z - nz * width / 2], i * 6);
    nor.set([0, 1, 0, 0, 1, 0], i * 6);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) { const j = (i + 1) % n; const a = i * 2, b = a + 1, c = j * 2, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; scene.add(m); return m;
}

/* =====================================================================
   Picking / entity registry
   ===================================================================== */
const entities = new Map();
const pickSet = new Set();
function tagPick(obj, id) { obj.traverse(o => { if (o.isMesh) { o.userData.eid = id; pickSet.add(o); } }); }
function untagPick(obj) { obj.traverse(o => { if (o.isMesh) pickSet.delete(o); }); }
function addEnt(e) { e.focusDist ??= 30; e.ring ??= 3; e.labelH ??= 3; e.moving ??= false; entities.set(e.id, e); return e; }

/* =====================================================================
   World: ground, building
   ===================================================================== */
const groundMat = new THREE.MeshStandardMaterial({ color: 0xE3E8E4, roughness: 1 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), groundMat);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const asphalt = new THREE.MeshStandardMaterial({ color: 0xCDD3CF, roughness: .9, side: THREE.DoubleSide });
const lineMat = new THREE.MeshStandardMaterial({ color: 0xFAFBFA, roughness: .6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });

function textPlane(draw, w, h, cw = 1024, ch = 256, emissive = false) {
  const tex = canvasTex(cw, ch, draw);
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
  if (emissive) { mat.emissive = new THREE.Color(0xffffff); mat.emissiveMap = tex; mat.emissiveIntensity = 0; signMats.push(mat); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.receiveShadow = true; return m;
}
function floorLabel(num, name, x, z, w = 9) {
  const m = textPlane((g) => {
    g.fillStyle = '#10B981'; rr(g, 8, 40, 176, 176, 38); g.fill();
    g.fillStyle = '#fff'; g.font = `800 100px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(num, 96, 132);
    g.fillStyle = '#2B3331'; g.textAlign = 'left'; g.font = `800 118px ${FONT}`; g.fillText(name, 216, 134);
  }, w, w / 4);
  m.rotation.x = -Math.PI / 2; m.position.set(x, FLOOR + .036, z); scene.add(m); return m;
}
function logoTex(g, W, H, ink = '#2B3331') {
  g.fillStyle = '#10B981'; rr(g, 10, 38, 180, 180, 44); g.fill();
  g.fillStyle = '#fff'; g.beginPath(); const s = 7.2, ox = 100 - 12 * s + 0, oy = 128 - 12 * s;
  const P = [[13.2, 2], [4.5, 13.4], [10.8, 13.4], [9.9, 22], [18.5, 10.4], [12.3, 10.4]];
  P.forEach(([x, y], i) => i ? g.lineTo(ox + x * s, oy + y * s) : g.moveTo(ox + x * s, oy + y * s)); g.closePath(); g.fill();
  g.fillStyle = ink; g.font = `800 150px ${FONT}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText('VOLTLINE', 226, 134);
}

const station = {}; // id -> group of meshes for picking
function buildBuilding() {
  const g = new THREE.Group(); scene.add(g);
  const wall = M(0xF7F8F7, { r: .9 });
  blk(g, 112, FLOOR, 36, mPaper, 0, 0, 0, .12, false);
  blk(g, 7, FLOOR, 30, M(0xE6EAE7, { r: .95 }), -59.5, 0, 0, .08, false);
  const H = 9;
  blk(g, 112.6, H, .6, wall, 0, FLOOR, -18.3, .08);
  for (let x = -50; x <= 50; x += 10) for (const zz of [-17.97, -18.63]) { const w = new THREE.Mesh(RB(7, 2.6, .06, .02), windowMat); w.position.set(x, FLOOR + 5.9, zz); g.add(w); }
  blk(g, 112.6, .35, .66, mAccent, 0, FLOOR + H - .35, -18.3, .04);
  blk(g, .6, H, 4, wall, -56.3, FLOOR, -16, .06); blk(g, .6, H, 4, wall, -56.3, FLOOR, 16, .06);
  blk(g, .6, H - 6.8, 28, wall, -56.3, FLOOR + 6.8, 0, .06);
  for (const z of [-9, 0, 9]) for (const xx of [-56.63, -55.97]) { const w = new THREE.Mesh(RB(.06, 1.1, 6, .02), windowMat); w.position.set(xx, FLOOR + 7.9, z); g.add(w); }
  // east wall (cutaway) + portal
  for (const z of [-11.3, 11.3]) { blk(g, .6, 1.3, 13.4, wall, 56.3, FLOOR, z, .06); blk(g, .64, .08, 13.4, mAccent, 56.3, FLOOR + 1.3, z, .02, false); }
  blk(g, .9, 7.2, .9, wall, 56.3, FLOOR, -5.05, .12); blk(g, .9, 7.2, .9, wall, 56.3, FLOOR, 5.05, .12);
  blk(g, 1.0, 1.7, 11, wall, 56.3, FLOOR + 7.2, 0, .14);
  const sign = textPlane((c, W, Hh) => logoTex(c, W, Hh), 8.4, 2.1, 1024, 256, true);
  sign.rotation.y = Math.PI / 2; sign.position.set(56.83, FLOOR + 8.05, 0); g.add(sign);
  // south wall (cutaway)
  blk(g, 112.6, 1.3, .6, wall, 0, FLOOR, 18.3, .06); blk(g, 112.6, .08, .64, mAccent, 0, FLOOR + 1.3, 18.3, .02, false);
  for (let x = -48; x <= 48; x += 12) {
    blk(g, .7, H, .7, wall, x, FLOOR, -17.4, .08);
    blk(g, .7, 2.6, .7, wall, x, FLOOR, 17.4, .08); blk(g, .74, .08, .74, mAccent, x, FLOOR + 2.6, 17.4, .02, false);
  }
  // roof band (cut) + trusses
  const roofY = FLOOR + H;
  blk(g, 112.6, .45, 7.6, M(0xF1F3F2), 0, roofY, -14.5, .08);
  blk(g, 112.6, .47, .12, mAccent, 0, roofY, -10.66, .02, false);
  for (let x = -48; x <= 48; x += 12) { const w = new THREE.Mesh(RB(6, .06, 3.2, .02), windowMat); w.position.set(x + 3, roofY + .47, -14.6); g.add(w); }
  for (let x = -54; x <= 54; x += 12) {
    blk(g, .45, .8, 16.6, mLight, x, roofY - .62, -9.7, .06);
    blk(g, .5, .86, .1, mAccent, x, roofY - .64, -1.35, .02, false);
  }
  blk(g, 108.5, .3, .3, mLight, 0, roofY - .45, -5.5, .05);
  for (let x = -50; x <= 50; x += 8) blk(g, 2.4, .16, .5, lampMat, x, roofY - .64, -5.5, .05, false);
  // station pads
  const PADS = [['ST10', '10', 'PRESS', -43.5, 25], ['ST20', '20', 'BODY', -21, 16], ['ST30', '30', 'PAINT', -5, 14], ['ST40', '40', 'BATTERY', 10, 14], ['ST50', '50', 'ASSEMBLY', 32.5, 26], ['ST60', '60', 'EOL TEST', 48.3, 5.6]];
  for (const [id, n, name, x, w] of PADS) {
    const pad = blk(scene, w - .4, .03, 13.6, M(0xF8F9F8, { r: .95 }), x, FLOOR, 0, .05, false);
    station[id] = [pad];
    floorLabel(n, name, x, 5.6, id === 'ST60' ? 5 : 8.4);
  }
  // main line guide strip
  blk(scene, 100, .02, .5, M(0xD8DEDA), -6, FLOOR, 0, .02, false);
}

/* =====================================================================
   Stations
   ===================================================================== */
const presses = []; let pressSheet;
function buildPress() {
  const g = new THREE.Group(); scene.add(g);
  for (const x of [-52.4, -47.4, -42.4]) {
    const P = new THREE.Group(); P.position.set(x, FLOOR, 0); g.add(P);
    blk(P, 4.2, 1.1, 5.4, mMid, 0, 0, 0, .14);
    blk(P, 3.6, .5, 4.6, mChar, 0, 1.1, 0, .06);
    for (const sx of [-1.75, 1.75]) for (const sz of [-2.35, 2.35]) blk(P, .7, 6.2, .7, mWhite, sx, 1.1, sz, .12);
    blk(P, 4.6, 1.9, 5.8, mWhite, 0, 7.0, 0, .22);
    blk(P, 4.66, .28, 5.86, mAccent, 0, 7.75, 0, .06);
    cyl(P, .34, .34, .7, mDark, -1, 8.9, 0); cyl(P, .34, .34, .7, mDark, 1, 8.9, 0);
    const ram = blk(P, 3.3, 1.0, 4.5, mLight, 0, 5.4, 0, .1);
    presses.push({ ram, top: 5.4, bot: 1.65 });
  }
  for (const [x, z] of [[-54.2, -5.3], [-51.6, -5.3]]) { const c = cyl(g, .95, .95, 1.1, mSteel, x, FLOOR + .95 - .55, z, 24); c.rotation.z = Math.PI / 2; c.position.y = FLOOR + .95; }
  pressSheet = blk(g, 2.6, .05, 1.6, mSteel, -55, FLOOR + 1.6, 0, .02);
  station.ST10.push(...g.children.flatMap(c => c.isGroup ? c.children : [c]));
}
const robots = [];
const L1 = 2.0, L2 = 1.6;
function makeRobot(id, kind, x, z) {
  const g = new THREE.Group(); g.position.set(x, FLOOR, z); scene.add(g);
  cyl(g, .72, .82, .45, mChar, 0, 0, 0, 20);
  const turret = new THREE.Group(); turret.position.y = .45; g.add(turret);
  blk(turret, 1.0, .58, 1.0, mWhite, 0, 0, 0, .2);
  cyl(turret, .53, .53, .08, mAccent, 0, .58, 0, 20);
  const sh = new THREE.Group(); sh.position.y = .8; turret.add(sh);
  blk(sh, .62, .62, .78, mLight, 0, -.31, 0, .24);
  blk(sh, .44, L1, .44, mWhite, 0, 0, 0, .17);
  const el = new THREE.Group(); el.position.y = L1; sh.add(el);
  blk(el, .52, .52, .6, mLight, 0, -.26, 0, .2);
  blk(el, .34, L2, .34, mWhite, 0, 0, 0, .13);
  const wr = new THREE.Group(); wr.position.y = L2; el.add(wr);
  blk(wr, .38, .3, .38, mChar, 0, -.08, 0, .08);
  const tip = new THREE.Object3D(); wr.add(tip);
  let held = null;
  let flash = null;
  if (kind === 'weld') { blk(wr, .5, .14, .2, mDark, .1, .22, 0, .05); blk(wr, .1, .42, .1, mDark, .3, .2, 0, .03); tip.position.set(.3, .62, 0); flash = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xFFF1C2 })); flash.position.copy(tip.position); flash.visible = false; wr.add(flash); }
  else if (kind === 'paint') { cyl(wr, .16, .22, .3, mLight, 0, .2, 0, 14); cyl(wr, .24, .16, .1, mAccent, 0, .5, 0, 14); tip.position.set(0, .7, 0); }
  else if (kind === 'glaze') { blk(wr, .9, .08, .7, mDark, 0, .22, 0, .03); tip.position.set(0, .4, 0); held = blk(wr, 1.6, .05, 1.2, mCabinGlass, 0, .32, 0, .02); }
  else { blk(wr, .5, .3, .5, mDark, 0, .2, 0, .08); tip.position.set(0, .55, 0); held = new THREE.Mesh(carG.tire, mTire); held.add(new THREE.Mesh(carG.hub, mHub)); held.rotation.x = Math.PI / 2; held.position.set(0, .66, 0); held.castShadow = true; wr.add(held); }
  const r = { id, kind, x, z, g, turret, sh, el, wr, tip, held, flash, yaw: Math.atan2(z, 0), a1: .3, a2: .6, t: rand(0, 10), off: rand(0, 6), burst: 0, count: Math.floor(rand(900, 2600)), state: 'Idle', wasOn: false };
  robots.push(r);
  return r;
}
function aimRobot(r, tx, ty, tz, dt, k) {
  const dx = tx - r.x, dz = tz - r.z;
  const yaw = Math.atan2(-dz, dx);
  const d = Math.hypot(dx, dz), h = ty - (FLOOR + 1.25);
  const D = clamp(Math.hypot(d, h), Math.abs(L1 - L2) + .05, L1 + L2 - .02);
  const phi = Math.atan2(d, h);
  const alpha = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  const bend = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
  const f = Math.min(1, k * dt);
  r.yaw += angDiff(yaw, r.yaw) * f; r.a1 += (phi - alpha - r.a1) * f; r.a2 += (bend - r.a2) * f;
  r.turret.rotation.y = r.yaw; r.sh.rotation.z = -r.a1; r.el.rotation.z = -r.a2;
}
function buildBody() {
  const g = new THREE.Group(); scene.add(g);
  blk(g, 5.8, .12, 2.7, mDark, -21, FLOOR, 0, .04);
  for (const sx of [-2.4, 2.4]) for (const sz of [-1.2, 1.2]) blk(g, .4, .5, .3, mAccent, -21 + sx, FLOOR + .12, sz, .05);
  const fence = M(0xE4ECE9, { op: .42, r: .3 });
  for (const s of [-1, 1]) {
    for (let x = -28.5; x <= -13.5; x += 2.5) blk(g, .12, 1.8, .12, mChar, x, FLOOR, s * 7.2, .03);
    blk(g, 15, 1.4, .04, fence, -21, FLOOR + .25, s * 7.2, .01, false);
    blk(g, 15.1, .08, .1, mAccent, -21, FLOOR + 1.75, s * 7.2, .02, false);
  }
  station.ST20.push(...g.children);
}
const battery = {};
function buildPaint() {
  const g = new THREE.Group(); scene.add(g);
  const x0 = -11.5, x1 = 1.5, zH = 4.8, h = 4.6, cx = -5;
  blk(g, 13, .06, 9.6, mDark, cx, FLOOR, 0, .02, false);
  for (const s of [-1, 1]) {
    blk(g, 13, h, .08, mGlassPanel, cx, FLOOR, s * zH, .02, false);
    for (let x = x0; x <= x1 + .01; x += 3.25) blk(g, .25, h, .25, mWhite, x, FLOOR, s * zH, .05);
    blk(g, 13.3, .32, .38, mWhite, cx, FLOOR + h, s * zH, .06);
    blk(g, 13.3, .08, .4, mAccent, cx, FLOOR + h + .32, s * zH, .02, false);
  }
  for (const xe of [x0, x1]) {
    for (const s of [-1, 1]) blk(g, .3, h, 3.1, mWhite, xe, FLOOR, s * 3.25, .05);
    blk(g, .3, h - 2.9, 3.4, mWhite, xe, FLOOR + 2.9, 0, .05);
    blk(g, .32, .1, 3.42, mAccent, xe, FLOOR + 2.9, 0, .02, false);
  }
  for (const x of [x0, cx, x1]) blk(g, .3, .3, 9.6, mWhite, x, FLOOR + h, 0, .05);
  cyl(g, .55, .55, 3.2, mLight, -9.2, FLOOR + h, -3.2, 18); cyl(g, .55, .55, 3.2, mLight, -.8, FLOOR + h, -3.2, 18);
  cyl(g, .6, .6, .2, mAccent, -9.2, FLOOR + h + 3.2, -3.2, 18); cyl(g, .6, .6, .2, mAccent, -.8, FLOOR + h + 3.2, -3.2, 18);
  station.ST30.push(...g.children);
}
function buildBattery() {
  const g = new THREE.Group(); scene.add(g);
  for (const x of [7.2, 12.8]) blk(g, .4, 6.4, .4, mWhite, x, FLOOR, -3.4, .08);
  blk(g, 6.4, .5, .6, mWhite, 10, FLOOR + 6.4, -3.4, .1);
  blk(g, 6.42, .1, .62, mAccent, 10, FLOOR + 6.9, -3.4, .03, false);
  blk(g, 1.2, .6, .9, mChar, 10, FLOOR + 5.8, -3.4, .1);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 1, 6), mChar); cable.position.set(10, 0, -3.4); g.add(cable);
  const hook = blk(g, 1.6, .12, .9, mDark, 10, 0, -3.4, .03);
  const pack = new THREE.Group(); g.add(pack);
  blk(pack, 3.4, .18, 1.6, mChar, 0, -.09, 0, .05);
  blk(pack, 3.42, .04, 1.62, mAccent, 0, .09, 0, .01, false);
  const shuttle = blk(g, 3.6, .2, 1.8, mMid, 10, FLOOR + .04, -3.4, .05);
  const lifters = [];
  for (const sx of [-1.9, 1.9]) for (const sz of [-1.22, 1.22]) { const l = blk(g, .26, 1, .26, mAccent, 10 + sx, FLOOR, sz, .04); lifters.push(l); }
  for (const y of [.8, 1.6, 2.4]) { blk(g, 6.4, .1, 1.3, mLight, 10, FLOOR + y, -5.9, .03); blk(g, 3.0, .18, 1.1, mChar, 8.4, FLOOR + y + .1, -5.9, .04); blk(g, 3.0, .18, 1.1, mChar, 11.6, FLOOR + y + .1, -5.9, .04); }
  for (const x of [6.9, 13.1]) for (const z of [-6.5, -5.3]) blk(g, .12, 2.6, .12, mDark, x, FLOOR, z, .03);
  Object.assign(battery, { cable, hook, pack, shuttle, lifters });
  station.ST40.push(...g.children.filter(c => c.isMesh));
}
let slats, conveyorOff = 0; const rollers = [];
function buildAssembly() {
  const g = new THREE.Group(); scene.add(g);
  blk(g, 24.4, .3, 4.4, mMid, 32.5, FLOOR, 0, .06);
  for (const s of [-1, 1]) blk(g, 24.4, .12, .14, mAccent, 32.5, FLOOR + .3, s * 2.25, .03, false);
  slats = new THREE.InstancedMesh(new THREE.BoxGeometry(.66, .06, 3.9), mLight, 30); slats.receiveShadow = true; scene.add(slats);
  // glass rack
  blk(g, 2.0, .12, 1.2, mLight, 24.2, FLOOR, -5.5, .03);
  for (let i = 0; i < 3; i++) { const p = blk(g, 1.7, 1.25, .05, mCabinGlass, 24.2, FLOOR + .15, -5.85 + i * .3, .02); p.rotation.x = -.18; }
  // wheel racks
  for (const s of [-1, 1]) {
    blk(g, 1.4, .12, 1.2, mLight, 40.6, FLOOR, s * 4.65, .03);
    for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(carG.tire, mTire); w.rotation.x = Math.PI / 2; w.position.set(40.6, FLOOR + .28 + i * .32, s * 4.65); w.castShadow = true; g.add(w); }
  }
  // overhead trim gantry
  for (const x of [21.2, 43.8]) for (const s of [-1, 1]) blk(g, .25, 5.2, .25, mWhite, x, FLOOR, s * 2.9, .05);
  blk(g, 22.9, .28, .28, mWhite, 32.5, FLOOR + 5.2, -2.9, .05); blk(g, 22.9, .28, .28, mWhite, 32.5, FLOOR + 5.2, 2.9, .05);
  for (let x = 23; x <= 42; x += 3.8) blk(g, .45, .1, 4.6, lampMat, x, FLOOR + 5.1, 0, .03, false);
  // EOL rollers + light tunnel
  blk(g, 5.2, .04, 2.4, mChar, 46, FLOOR, 0, .02, false);
  const rg = new THREE.CylinderGeometry(.2, .2, .5, 12).rotateX(Math.PI / 2);
  for (const sx of [-1.45, 1.45]) for (const sz of [-.92, .92]) { const r = new THREE.Mesh(rg, mSteel); r.position.set(46 + sx, FLOOR + .1, sz); g.add(r); rollers.push(r); }
  for (const x of [44.3, 47.7]) for (const s of [-1, 1]) { blk(g, .35, 3.9, .35, mWhite, x, FLOOR, s * 1.95, .06); blk(g, .08, 3.2, .26, tunnelMat, x, FLOOR + .4, s * 1.75, .02, false); }
  blk(g, 3.9, .32, 4.3, mWhite, 46, FLOOR + 3.9, 0, .06);
  blk(g, 3.2, .05, 3.5, tunnelMat, 46, FLOOR + 3.85, 0, .02, false);
  // kitting supermarket for loop C
  blk(g, 1.2, 2.6, 7, mLight, 54.8, FLOOR, 8.2, .06);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) blk(g, .9, .4, 1.4, j ? mAccent : mWhite, 54.8, FLOOR + .4 + j * 1.0, 5.6 + i * 1.75, .06);
  station.ST50.push(...g.children.filter(c => c.isMesh && c.position.x < 44.5));
  station.ST60.push(...g.children.filter(c => c.isMesh && c.position.x >= 44.2 && c.position.x < 48));
}

/* =====================================================================
   Outdoor: track, yard, roads, dock, office, trees, lamps
   ===================================================================== */
const TX0 = 74, TX1 = 98, TCZ = -18;
function ovalPts(r, n = 24) {
  const P = [];
  for (let i = 0; i < 8; i++) P.push([lerp(TX0, TX1, i / 8), TCZ + r]);
  for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; P.push([TX1 + r * Math.sin(a), TCZ + r * Math.cos(a)]); }
  for (let i = 1; i < 8; i++) P.push([lerp(TX1, TX0, i / 8), TCZ - r]);
  for (let i = 0; i <= n; i++) { const a = Math.PI * i / n; P.push([TX0 - r * Math.sin(a), TCZ - r * Math.cos(a)]); }
  return P;
}
function ovalPath(p, r) { const cy = -TCZ; p.moveTo(TX0, cy - r); p.lineTo(TX1, cy - r); p.absarc(TX1, cy, r, -Math.PI / 2, Math.PI / 2, false); p.lineTo(TX0, cy + r); p.absarc(TX0, cy, r, Math.PI / 2, Math.PI * 1.5, false); return p; }
const SLOT_N = 16;
const slotPos = i => { const row = i < 8 ? 0 : 1, c = i % 8; return { x: 63 + 4.4 * c, z: row ? 29.5 : 18.5, row }; };
const chargers = [];
function buildOutdoor() {
  // test track
  const shape = ovalPath(new THREE.Shape(), 15); shape.holes.push(ovalPath(new THREE.Path(), 9));
  const tm = new THREE.Mesh(new THREE.ShapeGeometry(shape, 32), asphalt); tm.rotation.x = -Math.PI / 2; tm.position.y = .045; tm.receiveShadow = true; scene.add(tm);
  station.TT1 = [tm];
  const toV = a => a.map(([x, z]) => ({ x, z }));
  ribbon(toV(ovalPts(14.6, 40)), .22, .06, lineMat, true);
  ribbon(toV(ovalPts(9.4, 40)), .22, .06, lineMat, true);
  const kerbG = new THREE.BoxGeometry(.85, .08, .5), m4 = new THREE.Matrix4();
  const kA = new THREE.InstancedMesh(kerbG, mAccent, 80), kW = new THREE.InstancedMesh(kerbG, mWhite, 80); let na = 0, nw = 0;
  for (const [cx, sgn] of [[TX1, 1], [TX0, -1]]) for (const r of [9.3, 14.7]) {
    const n = Math.floor(Math.PI * r / .9);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (i + .5) / n; const x = cx + sgn * r * Math.sin(a), z = TCZ + sgn * r * Math.cos(a);
      m4.makeRotationY(a); m4.setPosition(x, .07, z);
      if (i % 2) { if (na < 80) kA.setMatrixAt(na++, m4); } else { if (nw < 80) kW.setMatrixAt(nw++, m4); }
    }
  }
  kA.count = na; kW.count = nw; kA.receiveShadow = kW.receiveShadow = true; scene.add(kA, kW);
  const chk = textPlane((g, W, H) => { const s = 32; for (let y = 0; y < H / s; y++) for (let x = 0; x < W / s; x++) { g.fillStyle = (x + y) % 2 ? '#2B3331' : '#ffffff'; g.fillRect(x * s, y * s, s, s); } }, 1.3, 6, 64, 256);
  chk.rotation.x = -Math.PI / 2; chk.position.set(82, .07, -6); scene.add(chk);
  const tt = textPlane((g) => { g.fillStyle = '#2B3331'; g.font = `800 92px ${FONT}`; g.textBaseline = 'middle'; g.fillText('TEST TRACK', 40, 128); g.fillStyle = '#10B981'; g.fillRect(40, 190, 140, 16); }, 13, 3.25);
  tt.rotation.x = -Math.PI / 2; tt.position.set(86, .05, -18); scene.add(tt);
  // roads
  ribbon(smoothPts([[56, 0], [60, -.4], [65, -2.2], [70, -4.8], [76, -6]], 30), 7, .035, asphalt);
  ribbon(smoothPts([[84, -6], [92, -4.6], [99, -.5], [103, 6], [104.5, 14], [103.4, 21], [100.5, 24]], 40), 6.6, .035, asphalt);
  ribbon(smoothPts([[60, 24], [55.5, 25.5], [51, 30], [45, 40], [39, 56], [35, 78], [33, 100], [32, 140]], 70), 7, .035, asphalt);
  ribbon(smoothPts([[-56, -22], [-60, -24], [-66, -24.4], [-90, -24.4], [-140, -24.4]], 30), 6, .035, asphalt);
  // ramp at east door
  const rs = new THREE.Shape(); rs.moveTo(0, 0); rs.lineTo(0, FLOOR); rs.lineTo(4, 0); rs.closePath();
  const ramp = new THREE.Mesh(new THREE.ExtrudeGeometry(rs, { depth: 8, bevelEnabled: false }), mPaper); ramp.position.set(56, 0, -4); ramp.receiveShadow = true; scene.add(ramp);
  // charging yard
  const yard = blk(scene, 52, .05, 27, asphalt, 83, 0, 24, .04, false); station.CY1 = [yard];
  for (let i = 0; i < SLOT_N; i++) {
    const { x, z, row } = slotPos(i); const s = row ? 1 : -1;
    for (const dx of [-2.2, 2.2]) blk(scene, .1, .02, 4.8, lineMat, x + dx, .05, z, .01, false);
    const post = blk(scene, .55, 1.7, .4, mWhite, x, .05, z + s * 3.25, .1);
    const scr = new THREE.Mesh(RB(.38, .46, .05, .02), chargeOff); scr.position.set(x, 1.25, z + s * 3.02); scene.add(scr);
    blk(scene, .57, .1, .42, mAccent, x, 1.75, z + s * 3.25, .02, false);
    chargers.push({ scr, x, z });
    station.CY1.push(post);
  }
  const yt = textPlane((g) => { g.fillStyle = '#2B3331'; g.font = `800 92px ${FONT}`; g.textBaseline = 'middle'; g.fillText('CHARGING YARD', 40, 128); g.fillStyle = '#10B981'; g.fillRect(40, 190, 140, 16); }, 13, 3.25);
  yt.rotation.x = -Math.PI / 2; yt.position.set(70, .07, 35.6); scene.add(yt);
}
// dock + rail
const dockSlots = []; const dockCrates = []; let dockStock = 11;
const crane = { x: -70, z: 0, hookY: 7 };
function makeCrate(p) { const g = new THREE.Group(); blk(g, 1.7, 1.2, 1.7, M(0xE9ECE8), 0, 0, 0, .1); blk(g, 1.74, .16, 1.74, mAccent, 0, .78, 0, .03, false); p.add(g); return g; }
function buildDock() {
  const g = new THREE.Group(); scene.add(g);
  const plat = blk(g, 10, 1.1, 34, M(0xE4E8E5), -68, 0, -1, .08);
  blk(g, .3, .04, 34, mAccent, -63.3, 1.1, -1, .01, false);
  blk(scene, 4.6, .32, 600, mLight, -76.5, 0, 0, .04, false);
  for (const s of [-.72, .72]) blk(scene, .14, .16, 600, mSteel, -76.5 + s, .32, 0, .02, false);
  const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.7, .1, .4), mMid, 460), m4 = new THREE.Matrix4();
  for (let i = 0; i < 460; i++) { m4.makeTranslation(-76.5, .34, -299 + i * 1.3); sl.setMatrixAt(i, m4); } sl.receiveShadow = true; scene.add(sl);
  // crane
  for (const x of [-80.2, -63.7]) { for (const z of [-20, 18]) blk(g, .55, 9.2, .55, mWhite, x, 0, z, .08); blk(g, .6, .55, 38.6, mWhite, x, 9.2, -1, .08); blk(g, .62, .1, 38.6, mAccent, x, 9.75, -1, .02, false); }
  const bridge = new THREE.Group(); scene.add(bridge);
  blk(bridge, 17.2, .6, .8, M(0xF0F2F1), 0, 0, 0, .1); blk(bridge, 17.22, .12, .82, mAccent, 0, .6, 0, .02, false);
  bridge.position.set(-71.95, 9.75, 0);
  const trolley = blk(scene, 1.5, .7, 1.4, mChar, -70, 9.3, 0, .1);
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1, 6), mChar); scene.add(cable);
  const hook = blk(scene, 1.8, .14, 1.8, mDark, -70, 6, 0, .03);
  Object.assign(crane, { bridge, trolley, cable, hook });
  for (const z of [-14, -9, -4, 1, 6, 11]) for (const x of [-70.8, -68, -65.2]) dockSlots.push([x, z]);
  for (const [x, z] of dockSlots) { const c = makeCrate(scene); c.position.set(x, 1.1, z); dockCrates.push(c); }
  station.RD1 = [plat, ...g.children.filter(c => c.isMesh)];
}
const train = { g: new THREE.Group(), state: 'arriving', t: 0, z: -230, crates: [], cur: null, done: false, wait: 0, delivered: 64, fly: null };
function buildTrain() {
  const T = train.g; scene.add(T); T.position.set(-76.5, .45, -230);
  blk(T, 2.8, .5, 8, mChar, 0, 0, -4, .1);
  blk(T, 2.7, 3.1, 6.4, mWhite, 0, .5, -4.6, .4);
  blk(T, 2.6, 2.2, 1.6, mWhite, 0, .5, -.85, .5);
  blk(T, 2.74, .7, 1.2, mCabinGlass, 0, 2.3, -2.2, .12);
  blk(T, 2.76, .32, 6.6, mAccent, 0, 1.3, -4.6, .05);
  blk(T, 1.6, .4, 3, mLight, 0, 3.6, -5.2, .1);
  const lightL = blk(T, .5, .2, .1, headOnMat, -.8, 1.1, .02, .03, false); const lightR = blk(T, .5, .2, .1, headOnMat, .8, 1.1, .02, .03, false);
  for (const z of [-1.8, -6.4]) blk(T, 2.2, .5, 2.4, mChar, 0, -.45, z, .1);
  for (let k = 0; k < 4; k++) {
    const cz = -8.6 - 3.5 - k * 7.6;
    blk(T, 2.7, .45, 7, mDark, 0, .05, cz, .08);
    for (const z of [cz - 2.4, cz + 2.4]) blk(T, 2.2, .5, 1.8, mChar, 0, -.45, z, .1);
    for (const dz of [-1.8, 1.8]) { const c = makeCrate(T); c.position.set(0, .5, cz + dz); train.crates.push(c); }
  }
  train.fly = makeCrate(scene); train.fly.visible = false;
}
function buildOffice() {
  const g = new THREE.Group(); scene.add(g);
  const wall = M(0xF7F8F7, { r: .85 });
  blk(g, 24, 3.8, 14, wall, -42, 0, -37, .3);
  blk(g, 22, 3.6, 13, wall, -42.5, 3.8, -37.3, .3);
  blk(g, 18, 3.6, 11, wall, -43.5, 7.4, -37.8, .3);
  blk(g, 18.1, .2, 11.1, mAccent, -43.5, 11.0, -37.8, .05, false);
  const W = (w, h, d, x, y, z) => { const m = new THREE.Mesh(RB(w, h, d, .02), windowMat); m.position.set(x, y, z); g.add(m); };
  W(22, 1.3, .06, -42, 1.9, -29.97); W(20, 1.3, .06, -42.5, 5.5, -30.77); W(16, 1.3, .06, -43.5, 9.1, -32.27);
  W(.06, 1.3, 12, -29.97, 1.9, -37); W(.06, 1.3, 11, -31.47, 5.5, -37.3); W(.06, 1.3, 9, -34.47, 9.1, -37.8);
  blk(g, 6, .22, 3.2, mAccent, -42, 3.0, -28.6, .05); for (const x of [-44.6, -39.4]) blk(g, .2, 3, .2, mWhite, x, 0, -27.2, .05);
  const sign = textPlane((c, Wd, H) => logoTex(c, Wd, H), 11, 2.75, 1024, 256, true); sign.position.set(-43.5, 12.5, -32.6); g.add(sign);
  blk(g, 11.2, .3, .3, mWhite, -43.5, 11.05, -32.6, .05);
  station.OF1 = g.children.filter(c => c.isMesh);
}
function buildTrees() {
  const ex = [[-64, 61, -23, 23], [-88, -59, -999, 999], [57, 117, -37, 1], [55, 112, 8, 40], [53, 80, -10, 5], [93, 111, -8, 30], [-58, -24, -50, -21], [26, 62, 18, 160], [-150, -54, -28, -21]];
  const pts = []; const want = MOBILE ? 70 : 115; let guard = 0;
  while (pts.length < want && guard++ < 6000) {
    const x = rand(-150, 160), z = rand(-120, 110);
    if (ex.some(([a, b, c, d]) => x > a && x < b && z > c && z < d)) continue;
    if (pts.some(p => Math.hypot(p[0] - x, p[1] - z) < 5)) continue;
    pts.push([x, z, rand(1.4, 2.6)]);
  }
  for (const p of [[82, -18, 1.8], [90, -17, 1.5], [78, -20, 1.3]]) pts.push(p);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 2.2, 6), M(0xC9D0CC), pts.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xE9EFEB, roughness: .85, flatShading: true }), pts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = V();
  pts.forEach(([x, z, k], i) => {
    m4.compose(V(x, 1.1, z), q.identity(), s.set(1, 1, 1)); trunk.setMatrixAt(i, m4);
    q.setFromEuler(new THREE.Euler(0, rand(0, 6), 0)); m4.compose(V(x, 2.0 + k * 1.05, z), q, s.set(k, k * 1.25, k)); crown.setMatrixAt(i, m4);
  });
  trunk.castShadow = crown.castShadow = true; crown.receiveShadow = true; scene.add(trunk, crown);
}
function buildLamps() {
  const L = [[60, 5], [68, 3.5], [57, 11], [57, 37.5], [109.5, 11], [109.5, 37.5], [83, 10.2], [72, 1.2], [101, 1.5], [-83, -19], [-83, 16], [-27.5, -28], [-57, -27], [48, 27], [42, 46], [36, 70]];
  for (const [x, z] of L) { cyl(scene, .1, .14, 6.2, mLight, x, 0, z, 8); blk(scene, 1.0, .22, .5, lampMat, x, 6.15, z, .06, false); }
}

/* =====================================================================
   Cars
   ===================================================================== */
const carG = {
  body: RB(4.6, .62, 1.84, .28), cabin: RB(2.5, .6, 1.62, .26), batt: RB(3.4, .18, 1.6, .05), skid: RB(4.9, .12, 2.0, .04),
  panel: new THREE.BoxGeometry(3.0, .05, 1.7), tire: new THREE.CylinderGeometry(.38, .38, .3, 18).rotateX(Math.PI / 2),
  hub: new THREE.CylinderGeometry(.2, .2, .32, 10).rotateX(Math.PI / 2), head: new THREE.BoxGeometry(.08, .11, .46), tail: new THREE.BoxGeometry(.08, .08, 1.5),
};
const mTire = M(0x2B3130, { r: .85 }), mHub = M(0xE7EBE9, { r: .4, m: .3 });
const PRIMER = new THREE.Color(0xC6CCC9);
const PAINTS = [{ n: 'Glacier White', c: 0xF3F5F4, w: .38 }, { n: 'Volt Green', c: 0x10B981, w: .2 }, { n: 'Graphite', c: 0x3B4341, w: .2 }, { n: 'Silica Grey', c: 0xB4BCB8, w: .16 }, { n: 'Pearl Sand', c: 0xE5E0D4, w: .06 }];
const TRIMS = [{ n: 'Arc Standard', code: 'S', kwh: 75, range: 438, w: .45 }, { n: 'Arc Long Range', code: 'L', kwh: 82, range: 512, w: .4 }, { n: 'Arc Performance', code: 'P', kwh: 100, range: 568, w: .15 }];
const weighted = arr => { let r = Math.random(), a = 0; for (const x of arr) { a += x.w; if (r <= a) return x; } return arr[arr.length - 1]; };
let serial = 4800 + Math.floor(Math.random() * 400);
const VCH = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
function makeVin(trim) { let s = '7VLA' + trim.code; for (let i = 0; i < 3; i++) s += VCH[Math.floor(Math.random() * VCH.length)]; s += '0123456789X'[Math.floor(Math.random() * 11)]; return s + 'TL' + String(serial++).padStart(6, '0'); }
const cars = new Set();
const LINE = [
  { key: 'press', label: 'Press line', x0: -36, x1: -36, y: .05 },
  { key: 'body', label: 'Body shop', x0: -21, x1: -21, y: .05 },
  { key: 'paint', label: 'Paint shop', x0: -5, x1: -5, y: .05 },
  { key: 'battery', label: 'Battery marriage', x0: 10, x1: 10, y: .05 },
  { key: 'assyA', label: 'Final assembly · glazing', x0: 22, x1: 31, y: .35 },
  { key: 'assyB', label: 'Final assembly · wheels', x0: 33, x1: 42, y: .35 },
  { key: 'eol', label: 'End-of-line test', x0: 46, x1: 46, y: .05 },
];
const STEP_NAMES = ['Stamped', 'Welded', 'Painted', 'Battery in', 'Assembled', 'Tested'];
const STAGE_STEP = { 0: 0, 1: 1, 2: 2, 3: 3, 5: 4 };
const STAGE_CUR = [0, 1, 2, 3, 4, 4, 5];
class Car {
  constructor(opts = {}) {
    this.type = 'vehicle'; this.trim = weighted(TRIMS); this.paint = weighted(PAINTS); this.id = makeVin(this.trim);
    this.name = this.trim.n; this.steps = Array(6).fill(null); this.state = 'line'; this.stage = 0; this.stageProc = 0;
    this.v = 0; this.soc = rand(30, 42); this.pass = Math.random() > .034; this.static = !!opts.static; this.headOn = null;
    this.focusDist = 20; this.ring = 3.4; this.labelH = 2.4; this.nvh = rand(37.5, 41.5); this.stuck = 0;
    this.paintColor = new THREE.Color(this.paint.c);
    this.bodyMat = new THREE.MeshStandardMaterial({ color: PRIMER.clone(), roughness: .55, metalness: .05 });
    const g = this.group = new THREE.Group(); scene.add(g);
    const mk = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    this.skid = mk(carG.skid, mDark, 0, .06, 0);
    this.panels = new THREE.Group(); g.add(this.panels);
    for (let i = 0; i < 4; i++) mk(carG.panel, mSteel, i % 2 ? .12 : -.1, .16 + i * .065, i % 2 ? .05 : -.04, this.panels);
    this.body = mk(carG.body, this.bodyMat, 0, .74, 0);
    this.cabin = mk(carG.cabin, this.bodyMat, -.25, 1.3, 0);
    this.batt = mk(carG.batt, mChar, 0, .32, 0);
    this.wheels = [];
    for (const [x, z] of [[1.45, .92], [1.45, -.92], [-1.45, .92], [-1.45, -.92]]) { const w = mk(carG.tire, mTire, x, .38, z); mk(carG.hub, mHub, 0, 0, 0, w); this.wheels.push(w); }
    this.heads = [mk(carG.head, headOffMat, 2.31, .86, .58), mk(carG.head, headOffMat, 2.31, .86, -.58)];
    this.tail = mk(carG.tail, tailMat, -2.31, .92, 0);
    if (!this.static) { tagPick(g, this.id); cars.add(this); entities.set(this.id, this); }
  }
  get moving() { return this.state === 'line' || this.state === 'drive' || this.state === 'ship'; }
  getPos(v) { return v.copy(this.group.position); }
  setHeads(on) { if (on === this.headOn) return; this.headOn = on; for (const h of this.heads) h.material = on ? headOnMat : headOffMat; }
  setBuild(panels, shell, shellK, paintK, batt, glass, wf, wr, skid) {
    this.panels.visible = panels; this.body.visible = this.cabin.visible = shell;
    const s = .5 + .5 * shellK; this.body.scale.set(1, s, s); this.cabin.scale.set(1, s, s);
    this.bodyMat.color.copy(PRIMER).lerp(this.paintColor, paintK);
    this.bodyMat.roughness = lerp(.6, .3, paintK); this.bodyMat.metalness = lerp(.02, .12, paintK);
    this.batt.visible = batt; this.cabin.material = glass ? mCabinGlass : this.bodyMat;
    this.wheels[0].visible = this.wheels[1].visible = wf; this.wheels[2].visible = this.wheels[3].visible = wr;
    this.heads[0].visible = this.heads[1].visible = this.tail.visible = glass;
    this.skid.visible = skid;
  }
  setFull() { this.setBuild(false, true, 1, 1, true, true, true, true, false); }
  dispose() {
    scene.remove(this.group); untagPick(this.group); this.bodyMat.dispose(); cars.delete(this); entities.delete(this.id);
    if (selected === this) select(null);
  }
  location() {
    if (this.state === 'line') return LINE[this.stage].label;
    if (this.state === 'drive') return ['Leaving EOL', 'Test track · lap', 'To charging yard'][this.segI] || 'Driving';
    if (this.state === 'parked') return `Charging yard · bay ${this.slot + 1}`;
    return 'Outbound · car carrier';
  }
  status() {
    if (this.state === 'line') return ['In build', 'ok'];
    if (this.state === 'drive') return this.segI === 1 ? ['Testing', 'ok'] : ['Driving', 'ok'];
    if (this.state === 'ship') return ['Shipping', 'idle'];
    if (this.steps[5] && !this.pass) return ['Rework', 'warn'];
    return this.soc >= 80 ? ['Ready to ship', 'ok'] : ['Charging', 'ok'];
  }
  progress() {
    const done = this.steps.filter(Boolean).length;
    if (this.state === 'line') return Math.min(1, (done + this.stageProc * .9) / 6);
    return done / 6;
  }
  sub() { return this.location(); }
  stats() {
    const st = [['Trim', this.trim.n], ['Battery pack', `${this.trim.kwh} kWh`], ['Colour', `<i class="swatch" style="background:#${this.paintColor.getHexString()}"></i>${this.paint.n}`], ['Location', this.location(), 0, 1]];
    if (this.state === 'drive' || this.state === 'ship') st.push(['Speed', `${(this.v * 3.6 * 1.25).toFixed(0)} km/h`]);
    if (this.state === 'line') st.push(['Station progress', `${Math.round(this.stageProc * 100)}%`, this.stageProc]);
    if (this.state === 'parked' || this.state === 'ship') { st.push(['State of charge', `${this.soc.toFixed(0)}%`, this.soc / 100]); st.push(['Charge rate', this.state === 'parked' && this.soc < 80 ? `${(150 * cur.charge).toFixed(0)} kW` : this.state === 'parked' ? '11 kW top-up' : '—']); }
    st.push(['Est. range', `${Math.round(this.trim.range * (this.state === 'parked' ? this.soc / 100 : 1))} km${this.state === 'parked' ? '' : ' (full)'}`]);
    if (this.lapTime) st.push(['Test lap', `${this.lapTime.toFixed(1)} s`], ['Cabin NVH', `${this.nvh.toFixed(1)} dB(A)`]);
    st.push(['Started', this.steps[0] ? hms(this.steps[0]) : 'In press'], ['Result', this.steps[5] ? (this.pass ? 'First-time pass' : 'Rework · wind noise') : 'Pending test']);
    return st;
  }
}
const lineSlots = Array(7).fill(null);
let taktT = 0;
const LS = { ph: 0, proc: -1 };
let lineBusy = false;

/* driving routes */
const EXIT = curveFrom([[46, 0], [51, 0], [56, 0], [60, -.4], [65, -2.2], [70, -4.8], [74, -6]]);
const LAPP = ovalPts(12, 26); LAPP.push([TX0, TCZ + 12]);
const LAP = curveFrom(LAPP);
const EXIT_LEN = EXIT.getLength(), LAP_LEN = LAP.getLength();
function yardCurve(slot) {
  const { x, row } = slotPos(slot);
  const pts = [[74, -6], [84, -6], [92, -4.6], [99, -.5], [103, 6], [104.5, 14], [103.4, 21], [100.5, 24], [x + 4.6, 24]];
  if (row === 0) pts.push([x + 1.3, 22.7], [x + .15, 20.6], [x, 18.5]); else pts.push([x + 1.3, 25.3], [x + .15, 27.4], [x, 29.5]);
  return curveFrom(pts);
}
function shipRoute(slot) {
  const { x, row } = slotPos(slot);
  const rev = row === 0 ? [[x, 18.5], [x, 20.6], [x + 1.3, 22.9], [x + 3.2, 24]] : [[x, 29.5], [x, 27.4], [x + 1.3, 25.1], [x + 3.2, 24]];
  const fwd = [[x + 3.2, 24], [x + .5, 24], [60, 24], [55.5, 25.5], [51, 30], [45, 40], [39, 56], [35, 78], [33, 100]];
  const a = curveFrom(rev), b = curveFrom(fwd);
  return [{ curve: a, len: a.getLength(), reverse: true, speed: 2.4, kind: 'rev' }, { curve: b, len: b.getLength(), speed: 7.5, kind: 'ship' }];
}
const slots = Array(SLOT_N).fill(null);
function heightAt(x, z) {
  if (x >= -63 && x <= 56 && Math.abs(z) <= 18) return FLOOR;
  if (x > 56 && x < 60 && Math.abs(z) < 4.5) return lerp(FLOOR, .05, (x - 56) / 4);
  return .05;
}
function ship(car) {
  if (car.slot != null && slots[car.slot] === car) slots[car.slot] = null;
  const freed = car.slot;
  car.state = 'ship'; car.route = shipRoute(car.slot); car.segI = 0; car.s = 0; car.v = 0; car.setHeads(true);
  stats.shipped++;
  return freed;
}
function startDrive(car) {
  car.state = 'drive'; car.setFull(); car.setHeads(true);
  let slot = slots.indexOf(null);
  if (slot < 0) {
    const parked = [...cars].filter(c => c.state === 'parked').sort((a, b) => (b.soc >= 80) - (a.soc >= 80) || a.parkedAt - b.parkedAt);
    if (parked[0]) { slot = ship(parked[0]); pushAlert('info', `Bay ${slot + 1} cleared — ${parked[0].id.slice(-6)} loaded on car carrier`, parked[0].id); }
  }
  if (slot < 0) slot = 0;
  slots[slot] = car; car.slot = slot;
  const yc = yardCurve(slot);
  car.route = [{ curve: EXIT, len: EXIT_LEN, speed: 6, kind: 'exit' }, { curve: LAP, len: LAP_LEN, kind: 'lap' }, { curve: yc, len: yc.getLength(), speed: 6, kind: 'yard', final: true }];
  car.segI = 0; car.s = 0; car.v = 0;
}

/* =====================================================================
   AGV carts
   ===================================================================== */
class Loop {
  constructor(id, name, corners, r = 1.8) {
    this.id = id; this.name = name; this.pts = [];
    const n = corners.length;
    for (let i = 0; i < n; i++) {
      const p0 = corners[(i - 1 + n) % n], c = corners[i], p1 = corners[(i + 1) % n];
      const din = [c[0] - p0[0], c[1] - p0[1]], dout = [p1[0] - c[0], p1[1] - c[1]];
      const li = Math.hypot(...din), lo = Math.hypot(...dout);
      const a = [c[0] - din[0] / li * r, c[1] - din[1] / li * r], b = [c[0] + dout[0] / lo * r, c[1] + dout[1] / lo * r];
      for (let k = 0; k <= 6; k++) { const t = k / 6, u = 1 - t; this.pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); }
    }
    this.cum = [0];
    for (let i = 0; i < this.pts.length; i++) { const p = this.pts[i], q = this.pts[(i + 1) % this.pts.length]; this.cum.push(this.cum[i] + Math.hypot(q[0] - p[0], q[1] - p[1])); }
    this.total = this.cum[this.pts.length];
  }
  wrap(s) { return ((s % this.total) + this.total) % this.total; }
  at(s, out) {
    s = this.wrap(s); let lo = 0, hi = this.pts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (this.cum[m] <= s) lo = m; else hi = m - 1; }
    const p = this.pts[lo], q = this.pts[(lo + 1) % this.pts.length]; const L = this.cum[lo + 1] - this.cum[lo]; const t = L > 0 ? (s - this.cum[lo]) / L : 0;
    out.x = p[0] + (q[0] - p[0]) * t; out.z = p[1] + (q[1] - p[1]) * t; out.h = Math.atan2(-(q[1] - p[1]), q[0] - p[0]); return out;
  }
  project(x, z) {
    let best = 1e9, bs = 0;
    for (let i = 0; i < this.pts.length; i++) {
      const p = this.pts[i], q = this.pts[(i + 1) % this.pts.length]; const dx = q[0] - p[0], dz = q[1] - p[1]; const L2 = dx * dx + dz * dz || 1;
      const t = clamp(((x - p[0]) * dx + (z - p[1]) * dz) / L2, 0, 1); const d = (p[0] + dx * t - x) ** 2 + (p[1] + dz * t - z) ** 2;
      if (d < best) { best = d; bs = this.cum[i] + Math.sqrt(L2) * t; }
    }
    return bs;
  }
}
const loops = {
  A: new Loop('A', 'Loop A · west feeder', [[-61.5, -8.5], [6, -8.5], [6, 8.5], [-61.5, 8.5]]),
  B: new Loop('B', 'Loop B · trunk', [[-58, 12.5], [50, 12.5], [50, -12.5], [-58, -12.5]]),
  C: new Loop('C', 'Loop C · east kitting', [[24, 6], [53, 6], [53, 10.5], [24, 10.5]]),
};
const zones = [
  { id: 'J1', x: -58, z: -8.5, r: 2.3 }, { id: 'J2', x: -58, z: 8.5, r: 2.3 },
  { id: 'J3', x: 6, z: 0, r: 3.2, line: true }, { id: 'J4', x: 50, z: 0, r: 3.2, line: true },
  { id: 'J5', x: 50, z: 6, r: 2.0 }, { id: 'J6', x: 50, z: 10.5, r: 2.0 },
];
const STOPS = {
  A: [{ at: [-61.5, 0], type: 'load', label: 'Rail dock', dur: 2.6, dock: true }, { at: [-38, -8.5], type: 'drop', label: 'ST10 Press', dur: 1.6 }, { at: [-5, -8.5], type: 'drop', label: 'ST30 Paint', dur: 1.6 }, { at: [-21, 8.5], type: 'drop', label: 'ST20 Body', dur: 1.6 }],
  B: [{ at: [-58, 0], type: 'load', label: 'Rail dock', dur: 2.6, dock: true }, { at: [10, 12.5], type: 'drop', label: 'ST40 Battery', dur: 1.8 }, { at: [28, 12.5], type: 'drop', label: 'ST50 Assembly', dur: 1.6 }, { at: [37, -12.5], type: 'drop', label: 'ST50 Wheels', dur: 1.6 }],
  C: [{ at: [53, 8.2], type: 'load', label: 'Kitting supermarket', dur: 2.2 }, { at: [40, 10.5], type: 'drop', label: 'ST50 Trim', dur: 1.5 }, { at: [28, 10.5], type: 'drop', label: 'ST50 Glazing', dur: 1.5 }],
};
const PAYLOAD = { A: ['Steel blanks', 'Weld studs', 'Sealant drums', 'Paint consumables'], B: ['Battery modules', 'Seat sets', 'Tire & wheel sets', 'Harness kits', 'Battery modules'], C: ['Trim kits', 'Glass modules'] };
for (const k in STOPS) for (const s of STOPS[k]) s.s = loops[k].project(s.at[0], s.at[1]);
const carts = [];
const CART_SPEED = 4.4;
let cartN = 0;
class Cart {
  constructor(loop, s, payload) {
    this.type = 'agv'; this.id = 'AGV-' + p2(++cartN); this.loop = loop; this.s = s; this.v = 0; this.stops = STOPS[loop.id];
    this.payload = payload; this.cap = this.stops.filter(t => t.type === 'drop').length; this.load = Math.floor(rand(0, this.cap + 1));
    this.wait = 0; this.status = 'Moving'; this.batt = rand(42, 97); this.km = rand(4, 11); this.stuck = 0; this.delivered = Math.floor(rand(60, 160));
    this.name = 'Autonomous cart'; this.focusDist = 17; this.ring = 1.8; this.labelH = 1.9;
    const g = this.group = new THREE.Group(); scene.add(g);
    blk(g, 1.5, .14, 1.0, mChar, 0, .02, 0, .04);
    blk(g, 1.72, .36, 1.14, mWhite, 0, .12, 0, .12);
    blk(g, .06, .12, .9, mAccentGlow, .87, .26, 0, .02, false);
    this.beacon = cyl(g, .1, .1, .16, beaconOn, -.6, .48, .38, 10);
    this.totes = [];
    for (let i = 0; i < 3; i++) { const t = new THREE.Group(); blk(t, .5, .36, .9, M(0xEEF1EF), 0, 0, 0, .06); blk(t, .52, .06, .92, mAccent, 0, .36, 0, .02, false); t.position.set(-.55 + i * .55, .48, 0); g.add(t); this.totes.push(t); }
    tagPick(g, this.id);
    addEnt(this);
    this.place();
  }
  get moving() { return true; }
  getPos(v) { return v.copy(this.group.position); }
  nextStop() { let best = null, bd = 1e9; for (const st of this.stops) { const d = this.loop.wrap(st.s - this.s); if (d > .001 && d < bd) { bd = d; best = st; } } return [best, bd]; }
  arrive(st) {
    this.cur = st;
    if (st.type === 'load') {
      if (st.dock) {
        if (dockStock > 0) { dockStock--; updateDock(); this.load = this.cap; this.wait = st.dur; this.status = 'Loading'; }
        else { this.wait = 1.2; this.status = 'Waiting for parts'; this.retry = true; if (simT - lastStarve > 40) { lastStarve = simT; pushAlert('warn', `Rail dock empty — ${this.id} waiting for train FT-204`, 'RD1'); } }
      } else { this.load = this.cap; this.wait = st.dur; this.status = 'Loading'; }
      if (this.batt < 35 && !this.retry) { this.wait += 3.5; this.status = 'Charging'; this.batt = Math.min(100, this.batt + 45); }
    } else { if (this.load > 0) { this.load--; this.delivered++; } this.wait = st.dur; this.status = 'Unloading'; }
  }
  update(dt) {
    const L = this.loop;
    this.batt = Math.max(8, this.batt - dt * .03);
    if (this.wait > 0) {
      this.wait -= dt; this.v = 0;
      if (this.wait <= 0) { if (this.retry) { this.retry = false; this.arrive(this.cur); } else { this.s = L.wrap(this.s + .06); this.status = 'Moving'; } }
      this.place(); return;
    }
    let target = CART_SPEED, status = 'Moving';
    for (const o of carts) if (o !== this && o.loop === L) { const d = L.wrap(o.s - this.s); if (d < 4.2) { target = Math.min(target, d < 2.8 ? 0 : CART_SPEED * .35); status = 'Queued'; } }
    const cp = L.at(this.s, tA), lp = L.at(this.s + 3.4, tB);
    let blocked = null;
    for (const zn of zones) {
      const inC = Math.hypot(cp.x - zn.x, cp.z - zn.z) < zn.r, inL = Math.hypot(lp.x - zn.x, lp.z - zn.z) < zn.r;
      if (inC || inL) {
        if (!inC) {
          if (zn.line && lineBusy) blocked = { zn, by: 'line' };
          else if (zn.owner && zn.owner !== this) blocked = { zn, by: zn.owner };
          else zn.owner = this;
        } else if (!zn.owner) zn.owner = this;
      } else if (zn.owner === this) zn.owner = null;
    }
    if (blocked && this.stuck < 9) {
      target = 0; this.stuck += dt;
      status = blocked.by === 'line' ? `Yielding · line at ${blocked.zn.id}` : `Yielding · ${blocked.by.id}`;
      if (!this.yieldNoted && simT - lastYieldAlert > 28 && Math.random() < .5) { lastYieldAlert = simT; pushAlert('info', blocked.by === 'line' ? `${this.id} holding at ${blocked.zn.id} for body transfer` : `${this.id} gave way to ${blocked.by.id} at junction ${blocked.zn.id}`, this.id); }
      this.yieldNoted = true;
    } else if (!blocked) { this.stuck = 0; this.yieldNoted = false; }
    const [st, dS] = this.nextStop();
    if (st) target = Math.min(target, Math.max(Math.sqrt(2 * 3 * Math.max(0, dS - .02)), .5));
    const a = target > this.v ? 2.4 : 8; this.v += clamp(target - this.v, -a * dt, a * dt);
    const step = this.v * dt;
    if (st && step >= dS) { this.s = st.s; this.v = 0; this.arrive(st); }
    else this.s = L.wrap(this.s + step);
    this.km += step / 1000;
    if (this.wait <= 0) this.status = this.v < .05 && status === 'Moving' ? 'Moving' : status;
    this.place();
  }
  place() {
    const p = this.loop.at(this.s, tA); this.group.position.set(p.x, FLOOR, p.z);
    this.group.rotation.y = p.h;
    for (let i = 0; i < 3; i++) this.totes[i].visible = i < this.load;
    const waiting = this.status.startsWith('Yield') || this.status === 'Queued' || this.status.startsWith('Waiting');
    this.beacon.material = waiting && Math.sin(simT * 10) > 0 ? beaconWait : beaconOn;
  }
  sub() { return this.loop.name; }
  statusPill() { const s = this.status; if (s.startsWith('Yield') || s === 'Queued') return [s, 'warn']; if (s.startsWith('Waiting')) return [s, 'warn']; return [s, 'ok']; }
  stats() {
    const [st] = this.nextStop();
    return [['Route', this.loop.name, 0, 1], ['Payload', this.load ? `${this.load}× ${this.payload}` : 'Empty'], ['Speed', `${(this.v / SIM).toFixed(2)} m/s`],
    ['Battery', `${this.batt.toFixed(0)}%`, this.batt / 100], ['Next stop', st ? st.label : '—'], ['Totes today', fmt(this.delivered)], ['Distance today', `${this.km.toFixed(2)} km`], ['Nav mode', 'Lidar SLAM · lane lock']];
  }
}
let lastYieldAlert = -99, lastStarve = -99;

/* =====================================================================
   Particles & weather FX
   ===================================================================== */
class PSys {
  constructor(n, { size = .2, blending = THREE.AdditiveBlending, opacity = 1, fade = true } = {}) {
    this.n = n; this.fade = fade; this.i = 0; this.any = false;
    this.pos = new Float32Array(n * 3).fill(-999); this.col = new Float32Array(n * 3); this.base = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3); this.life = new Float32Array(n); this.max = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo = g; this.mat = new THREE.PointsMaterial({ size, map: DOT, transparent: true, opacity, depthWrite: false, blending, vertexColors: true, sizeAttenuation: true });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  emit(p, vx, vy, vz, life, c) {
    const i = this.i; this.i = (i + 1) % this.n; const j = i * 3;
    this.pos[j] = p.x; this.pos[j + 1] = p.y; this.pos[j + 2] = p.z; this.vel[j] = vx; this.vel[j + 1] = vy; this.vel[j + 2] = vz;
    this.life[i] = this.max[i] = life; this.base[j] = c.r; this.base[j + 1] = c.g; this.base[j + 2] = c.b; this.any = true;
  }
  update(dt, grav, floorY, drag = 0) {
    if (!this.any) return; let alive = false;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue; const j = i * 3; this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[j + 1] = -999; continue; }
      alive = true; this.vel[j + 1] -= grav * dt;
      if (drag) { const k = Math.max(0, 1 - drag * dt); this.vel[j] *= k; this.vel[j + 1] *= k; this.vel[j + 2] *= k; }
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < floorY) { this.pos[j + 1] = floorY; this.vel[j + 1] *= -.35; this.vel[j] *= .5; this.vel[j + 2] *= .5; }
      const f = this.fade ? this.life[i] / this.max[i] : 1;
      this.col[j] = this.base[j] * f; this.col[j + 1] = this.base[j + 1] * f; this.col[j + 2] = this.base[j + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true; this.any = alive;
  }
}
const sparks = new PSys(MOBILE ? 600 : 1100, { size: .32, blending: THREE.NormalBlending, fade: false });
const mist = new PSys(MOBILE ? 300 : 600, { size: .75, blending: THREE.NormalBlending, opacity: .45, fade: false });
const SPARK_C = new THREE.Color(0xFFA62B);
function outdoorPoint() {
  for (let i = 0; i < 30; i++) {
    const r = Math.random(); let x, z;
    if (r < .55) { x = rand(54, 122); z = rand(-46, 44); } else if (r < .75) { x = rand(-98, -57); z = rand(-32, 32); } else { x = rand(-120, 130); z = rand(-80, 80); }
    if (!(x > -57 && x < 57.5 && Math.abs(z) < 19)) return [x, z];
  }
  return [90, 20];
}
const RAIN_N = MOBILE ? 1000 : 2200;
const rainPos = new Float32Array(RAIN_N * 6), drops = [];
for (let i = 0; i < RAIN_N; i++) { const [x, z] = outdoorPoint(); drops.push({ x, z, y: rand(0, 42) }); }
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainMat = new THREE.LineBasicMaterial({ color: 0xBFCDD6, transparent: true, opacity: 0 });
const rain = new THREE.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const SNOW_N = MOBILE ? 500 : 1000;
const snowPos = new Float32Array(SNOW_N * 3), flakes = [];
for (let i = 0; i < SNOW_N; i++) { const [x, z] = outdoorPoint(); flakes.push({ x, z, y: rand(0, 26), p: rand(0, 6) }); }
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snowMat = new THREE.PointsMaterial({ size: .32, map: DOT, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
const snow = new THREE.Points(snowGeo, snowMat); snow.frustumCulled = false; snow.visible = false; scene.add(snow);
const fogMat = new THREE.SpriteMaterial({ map: SOFT, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
const banks = [];
for (let i = 0; i < (MOBILE ? 22 : 34); i++) {
  let x, z; if (i < 20) { x = rand(58, 116); z = rand(-40, 40); } else { [x, z] = outdoorPoint(); }
  const s = new THREE.Sprite(fogMat); const sz = rand(24, 42); const y = rand(2, 5);
  s.position.set(x, y, z); s.scale.set(sz, sz * .42, 1); s.userData = { by: y, bx: x, ph: rand(0, 6) }; s.visible = false; scene.add(s); banks.push(s);
}

/* =====================================================================
   Weather & daylight
   ===================================================================== */
const WEATHER = {
  clear: { name: 'Clear', icon: 'sun', sub: 'Dry track · full charge rate', sky: 0xEAF1EE, fog: [160, 560], sun: 3.1, sunCol: 0xFFFDF8, hemi: .82, ground: 0xEBEFEC, asph: 0xCDD3CF, aR: .9, rain: 0, snow: 0, bank: 0, haze: 0, cloud: 0, dark: 0, track: 12, charge: 1, grip: .98, surf: 'Dry · 24 °C' },
  monsoon: { name: 'Monsoon', icon: 'rain', sub: 'Wet track · speed limited', sky: 0xACB8B6, fog: [50, 260], sun: .7, sunCol: 0xDDE6EA, hemi: .85, ground: 0xC4CCC8, asph: 0x7E8884, aR: .16, rain: 1, snow: 0, bank: 0, haze: 0, cloud: 1, dark: .45, track: 7.5, charge: .95, grip: .62, surf: 'Standing water · 21 °C' },
  fog: { name: 'Winter fog', icon: 'fog', sub: 'Low visibility · cold packs', sky: 0xDEE4E7, fog: [10, 150], sun: 1.0, sunCol: 0xE8F0FF, hemi: 1.15, ground: 0xEEF2F4, asph: 0xD5DBDE, aR: .75, rain: 0, snow: .7, bank: 1, haze: 0, cloud: 0, dark: .22, track: 8.5, charge: .76, grip: .74, surf: 'Frost risk · −2 °C' },
  heat: { name: 'Heatwave', icon: 'heat', sub: 'Charger derate · HVAC +18%', sky: 0xF5EADB, fog: [100, 420], sun: 3.1, sunCol: 0xFFE2B8, hemi: 1.05, ground: 0xEEE8DD, asph: 0xD8D1C5, aR: .88, rain: 0, snow: 0, bank: 0, haze: 1, cloud: 0, dark: 0, track: 11, charge: .7, grip: .9, surf: 'Surface 58 °C' },
};
for (const k in WEATHER) { const w = WEATHER[k]; for (const c of ['sky', 'sunCol', 'ground', 'asph']) w[c] = new THREE.Color(w[c]); }
const cur = { sky: WEATHER.clear.sky.clone(), sunCol: new THREE.Color(1, 1, 1), ground: WEATHER.clear.ground.clone(), asph: WEATHER.clear.asph.clone(), sun: 2.5, hemi: 1.08, aR: .9, fogA: 160, fogB: 560, rain: 0, snow: 0, bank: 0, haze: 0, cloud: 0, dark: 0, track: 12, charge: 1, grip: .98 };
const NIGHT_SKY = new THREE.Color(0x0D1716), MOON = new THREE.Color(0x9EB4FF), HEMI_N_SKY = new THREE.Color(0x4A5E80), HEMI_N_GND = new THREE.Color(0x141A1A), WHITE = new THREE.Color(1, 1, 1), HEMI_GND = new THREE.Color(0xD6DBD8);
const FOG_WARM = new THREE.Color(0xF6DDB8), FOG_GREY = new THREE.Color(0x9DA8A6);
const hour = new Date().getHours();
const env = { weather: 'clear', night: (hour < 6 || hour >= 19) ? 1 : 0 }; env.nightTarget = env.night;
function updateEnv(dt) {
  const W = WEATHER[env.weather], k = 1 - Math.exp(-dt * 1.6);
  cur.sky.lerp(W.sky, k); cur.sunCol.lerp(W.sunCol, k); cur.ground.lerp(W.ground, k); cur.asph.lerp(W.asph, k);
  for (const [a, b] of [['sun', 'sun'], ['hemi', 'hemi'], ['aR', 'aR'], ['rain', 'rain'], ['snow', 'snow'], ['bank', 'bank'], ['haze', 'haze'], ['cloud', 'cloud'], ['dark', 'dark'], ['track', 'track'], ['charge', 'charge'], ['grip', 'grip']]) cur[a] += (W[b] - cur[a]) * k;
  cur.fogA += (W.fog[0] - cur.fogA) * k; cur.fogB += (W.fog[1] - cur.fogB) * k;
  env.night += clamp(env.nightTarget - env.night, -dt / 2.6, dt / 2.6);
  const n = sstep(env.night);
  scene.background.copy(cur.sky).lerp(NIGHT_SKY, n);
  scene.fog.color.copy(scene.background);
  const dist = camera.position.distanceTo(controls.target);
  scene.fog.near = dist * .55 + cur.fogA; scene.fog.far = dist * 1.1 + cur.fogB + n * 120;
  sun.intensity = lerp(cur.sun, .28, n); sun.color.copy(cur.sunCol).lerp(MOON, n);
  hemi.intensity = lerp(cur.hemi, .55, n); hemi.color.copy(WHITE).lerp(HEMI_N_SKY, n); hemi.groundColor.copy(HEMI_GND).lerp(HEMI_N_GND, n);
  groundMat.color.copy(cur.ground);
  asphalt.color.copy(cur.asph); asphalt.roughness = cur.aR; asphalt.metalness = (1 - cur.aR) * .3;
  const dark = clamp(Math.max(n, cur.dark), 0, 1);
  windowMat.emissiveIntensity = .04 + dark * 2.1;
  lampMat.emissiveIntensity = .08 + dark * 2.8;
  for (const m of signMats) m.emissiveIntensity = dark * .9;
  for (const l of interiorLights) l.intensity = dark * (MOBILE ? 170 : 140);
  for (const l of yardLights) l.intensity = dark * 260;
  headOnMat.emissiveIntensity = .8 + dark * 3;
  tailMat.emissiveIntensity = .5 + dark * 1.6;
  renderer.toneMappingExposure = lerp(1, 1.18, n);
  document.body.classList.toggle('night', n > .5);
}
function updateWeatherFx(dt) {
  if (cur.rain > .01) {
    rain.visible = true; rainMat.opacity = .5 * cur.rain;
    for (let i = 0; i < RAIN_N; i++) {
      const d = drops[i]; d.y -= 40 * dt; if (d.y < 0) { const [x, z] = outdoorPoint(); d.x = x; d.z = z; d.y += 42; }
      const j = i * 6; rainPos[j] = d.x; rainPos[j + 1] = d.y; rainPos[j + 2] = d.z; rainPos[j + 3] = d.x + .22; rainPos[j + 4] = d.y + 1.4; rainPos[j + 5] = d.z + .1;
    }
    rainGeo.attributes.position.needsUpdate = true;
  } else rain.visible = false;
  if (cur.snow > .01) {
    snow.visible = true; snowMat.opacity = .85 * cur.snow;
    for (let i = 0; i < SNOW_N; i++) {
      const f = flakes[i]; f.y -= 1.5 * dt; if (f.y < 0) { const [x, z] = outdoorPoint(); f.x = x; f.z = z; f.y += 26; }
      const j = i * 3; snowPos[j] = f.x + Math.sin(simT * .8 + f.p) * .6; snowPos[j + 1] = f.y; snowPos[j + 2] = f.z + Math.cos(simT * .6 + f.p) * .4;
    }
    snowGeo.attributes.position.needsUpdate = true;
  } else snow.visible = false;
  const op = cur.bank * .6 + cur.haze * .2 + cur.cloud * .42;
  fogMat.opacity = op;
  const wsum = cur.bank + cur.haze + cur.cloud + 1e-4;
  const wb = cur.bank / wsum, wh = cur.haze / wsum, wc = cur.cloud / wsum;
  fogMat.color.setRGB(wb + FOG_WARM.r * wh + FOG_GREY.r * wc, wb + FOG_WARM.g * wh + FOG_GREY.g * wc, wb + FOG_WARM.b * wh + FOG_GREY.b * wc);
  fogMat.color.lerp(NIGHT_SKY, sstep(env.night) * .7);
  for (const s of banks) {
    s.visible = op > .01; if (!s.visible) continue;
    s.position.y = s.userData.by + cur.cloud * 14 - cur.haze * 1.2;
    s.position.x = s.userData.bx + Math.sin(simT * .05 + s.userData.ph) * 4;
  }
}

/* =====================================================================
   Build world
   ===================================================================== */
buildBuilding(); buildPress(); buildBody(); buildPaint(); buildBattery(); buildAssembly();
buildOutdoor(); buildDock(); buildTrain(); buildOffice(); buildTrees(); buildLamps();
// lane dashes + junction hatches
const laneMat = new THREE.MeshStandardMaterial({ color: ACCENT, roughness: .6, transparent: true, opacity: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
for (const k in loops) {
  const L = loops[k], n = Math.floor(L.total / 1.5), inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(.8, .13).rotateX(-Math.PI / 2), laneMat, n), m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { const p = L.at(i * 1.5, tA); m4.makeRotationY(p.h); m4.setPosition(p.x, FLOOR + .03, p.z); inst.setMatrixAt(i, m4); }
  scene.add(inst);
}
const hatchTex = canvasTex(128, 128, (g) => { g.strokeStyle = 'rgba(16,185,129,.75)'; g.lineWidth = 12; for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); } g.strokeStyle = 'rgba(16,185,129,.9)'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120); });
for (const zn of zones) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(zn.r * 1.3, zn.r * 1.3), new THREE.MeshStandardMaterial({ map: hatchTex, transparent: true, depthWrite: false, opacity: .8, polygonOffset: true, polygonOffsetFactor: -3 }));
  m.rotation.x = -Math.PI / 2; m.position.set(zn.x, FLOOR + .032, zn.z); scene.add(m);
}
// robots
for (const [id, x, z] of [['R-21A', -24, -3.6], ['R-21B', -24, 3.6], ['R-22A', -18, -3.6], ['R-22B', -18, 3.6]]) makeRobot(id, 'weld', x, z);
makeRobot('P-31A', 'paint', -7.5, -3.4); makeRobot('P-31B', 'paint', -2.5, 3.4);
makeRobot('G-51A', 'glaze', 26.5, -3.6);
makeRobot('W-52A', 'wheel', 37.5, -3.6); makeRobot('W-52B', 'wheel', 37.5, 3.6);

/* =====================================================================
   Stats & entities
   ===================================================================== */
const stats = { built: 0, tested: 0, passed: 0, rework: 0, stepCounts: [0, 0, 0, 0, 0, 0], taktHist: [], fpyHist: [], hourly: [], shipped: 0, bestLap: null, lastLap: null, lastTakt: 52 };
const RATE = 3600 / TAKT_REAL;
function hoursSinceStart() { const d = new Date(); const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; return h >= 6 ? h - 6 : h + 18; }
{
  const hrs = hoursSinceStart();
  stats.built = Math.floor(hrs * RATE * .962); stats.rework = Math.round(stats.built * rand(.027, .034)); stats.tested = stats.built; stats.passed = stats.built - stats.rework;
  const B = stats.built; stats.stepCounts = [B + 6, B + 5, B + 4, B + 3, B + 1, B];
  for (let i = 0; i < 28; i++) stats.taktHist.push(TAKT_REAL + gauss() * .25 + .05);
  for (let i = 0; i < 28; i++) stats.fpyHist.push(96.6 + gauss() * .55);
  for (let i = 0; i < 12; i++) stats.hourly.push(Math.round(RATE * .962 + gauss() * 2.2));
  stats.bestLap = 39.8 + rand(0, 1.2);
}
const OEE = { ST10: 91.2, ST20: 89.6, ST30: 87.4, ST40: 90.8, ST50: 88.1, ST60: 93.3 };
const ST = {
  ST10: { name: 'Press line', area: 'Press', x: -43.5, z: 0, target: 48.2, stage: 0, step: 0, focus: 60, ring: 13.5, labelH: 10.5, extra: () => [['Press tonnage', '2,500 t tandem'], ['Stroke rate', `${(13.6 + Math.sin(simT * .3) * .4).toFixed(1)} SPM`], ['Die set', 'Arc body side · D-114', 0, 1], ['Coil stock', `${Math.round(212 - (simT * .06) % 40)} t`]] },
  ST20: { name: 'Body shop', area: 'Body', x: -21, z: 0, target: 50.6, stage: 1, step: 1, focus: 44, ring: 9, labelH: 6, extra: () => [['Weld robots', '4 active'], ['Spot welds / body', '4,286'], ['Spots this shift', fmt(robots.filter(r => r.kind === 'weld').reduce((a, r) => a + r.count, 0))], ['Geometry CpK', '1.67']] },
  ST30: { name: 'Paint shop', area: 'Paint', x: -5, z: 0, target: 51.2, stage: 2, step: 2, focus: 44, ring: 9, labelH: 7, extra: () => [['Booth temp', `${(env.weather === 'heat' ? 25.8 : env.weather === 'fog' ? 22.1 : 23.4).toFixed(1)} °C`], ['Humidity', `${env.weather === 'monsoon' ? 66 : env.weather === 'heat' ? 47 : 58}% RH`], ['Film build', `${(118 + Math.sin(simT * .2) * 2).toFixed(0)} µm`], ['Current colour', lineSlots[2] ? lineSlots[2].paint.n : '—']] },
  ST40: { name: 'Battery marriage', area: 'Battery', x: 10, z: 0, target: 49.8, stage: 3, step: 3, focus: 40, ring: 8, labelH: 8, extra: () => [['Pack on lift', lineSlots[3] ? `${lineSlots[3].trim.kwh} kWh` : '—'], ['Fastener torque', `${(42 + Math.sin(simT * 1.3) * .3).toFixed(1)} N·m`], ['Isolation test', '> 500 MΩ'], ['Packs in buffer', `${6 + Math.floor((simT / 9) % 3)}`]] },
  ST50: { name: 'Final assembly', area: 'Assembly', x: 32.5, z: 0, target: 51.9, stage: 5, step: 4, focus: 54, ring: 14, labelH: 7, extra: () => [['Conveyor speed', '0.89 m/s (sim)'], ['Glazing robot', robots.find(r => r.id === 'G-51A').state], ['Wheel robots', robots.find(r => r.id === 'W-52A').state], ['Wheel nut torque', '140 N·m']] },
  ST60: { name: 'End-of-line test', area: 'Assembly', x: 47.5, z: 0, target: 47.0, stage: 6, step: 5, focus: 30, ring: 5, labelH: 6, extra: () => [['Roll test', lineSlots[6] && LS.proc > .1 && LS.proc < .85 ? 'Running' : 'Standby'], ['Headlamp aim', '±0.1°'], ['ADAS calibration', 'Pass'], ['Water test', 'Pass']] },
  TT1: { name: 'Test track', area: 'Test track', x: 86, z: -18, y: 0, focus: 118, ring: 21, labelH: 6, outdoor: true, extra: () => { const oc = [...cars].find(c => c.state === 'drive' && c.segI === 1); return [['Surface', WEATHER[env.weather].surf, 0, 1], ['Grip µ', cur.grip.toFixed(2)], ['Speed limit', `${Math.round(cur.track * 3.6 * 1.25)} km/h`], ['Car on lap', oc ? oc.id.slice(-8) : '—'], ['Last lap', stats.lastLap ? `${stats.lastLap.toFixed(1)} s` : '—'], ['Best lap today', `${stats.bestLap.toFixed(1)} s`]]; } },
  CY1: { name: 'Charging yard', area: null, x: 82, z: 24, y: 0, focus: 82, ring: 20, labelH: 5, outdoor: true, extra: () => { const pk = [...cars].filter(c => c.state === 'parked'); const ch = pk.filter(c => c.soc < 80).length; return [['Bays occupied', `${slots.filter(Boolean).length} / ${SLOT_N}`, slots.filter(Boolean).length / SLOT_N], ['Charging now', `${ch}`], ['Ready to ship', `${pk.length - ch}`], ['Site load', `${Math.round(ch * 150 * cur.charge + 40)} kW`], ['Charger derate', cur.charge < .98 ? `${Math.round((1 - cur.charge) * 100)}%` : 'None'], ['Shipped today', fmt(stats.shipped + Math.floor(stats.built * .91))]]; } },
  RD1: { name: 'Rail dock', area: null, x: -69, z: -1, y: 0, focus: 66, ring: 16, labelH: 11, outdoor: true, extra: () => [['Dock stock', `${dockStock} crates`, dockStock / 18], ['Train FT-204', trainState()], ['Crates today', fmt(train.delivered)], ['Crane', train.cur ? 'Lifting' : 'Parked']] },
  OF1: { name: 'Office block', area: null, x: -42, z: -37, y: 0, focus: 60, ring: 15, labelH: 13, outdoor: true, extra: () => [['People on site', '1,248'], ['Shift', 'B · 14:00–22:00'], ['Control room', 'Staffed'], ['Plant power', `${(9.4 + Math.sin(simT * .05) * .3 + (env.weather === 'heat' ? 1.6 : 0)).toFixed(1)} MW`]] },
};
for (const id in ST) {
  const s = ST[id]; s.ct = s.target ? s.target + gauss() * .4 : null;
  addEnt({
    id, type: 'station', name: s.name, focusDist: s.focus, ring: s.ring, labelH: s.labelH, area: s.area,
    getPos: v => v.set(s.x, s.outdoor ? .05 : FLOOR, s.z), sub: () => s.area ? `${s.area} area` : 'Facility',
    statusPill: () => stationStatus(id),
    stats: () => {
      const out = [];
      if (s.target) {
        out.push(['Cycle time', `${s.ct.toFixed(1)} s`, s.ct / TAKT_REAL], ['Target', `${s.target.toFixed(1)} s`], ['OEE', `${(OEE[id] + Math.sin(simT * .02 + s.x) * .5).toFixed(1)}%`, OEE[id] / 100], ['Output today', fmt(stats.stepCounts[s.step])]);
        const c = lineSlots[s.stage]; out.push(['Current VIN', c ? `<span class="mono">${c.id}</span>` : '—', 0, 1]);
      }
      return out.concat(s.extra());
    },
  });
  tagPick({ traverse: f => (station[id] || []).forEach(m => m.traverse ? m.traverse(f) : f(m)) }, id);
}
function stationStatus(id) {
  if (id === 'ST10' && dockStock === 0) return ['Material low', 'warn'];
  if (id === 'TT1') return env.weather === 'clear' ? ['Open', 'ok'] : ['Restricted', 'warn'];
  if (id === 'CY1') return slots.filter(Boolean).length >= SLOT_N - 1 ? ['Near capacity', 'warn'] : ['Charging', 'ok'];
  if (id === 'RD1') return train.state === 'unloading' ? ['Unloading', 'ok'] : dockStock < 3 ? ['Stock low', 'warn'] : ['Ready', 'ok'];
  if (id === 'OF1') return ['Open', 'ok'];
  return ['Running', 'ok'];
}
const ROBOT_INFO = { weld: 'Spot-weld robot', paint: 'Paint robot · rotary bell', glaze: 'Glazing robot', wheel: 'Wheel-fit robot' };
for (const r of robots) {
  tagPick(r.g, r.id);
  addEnt({
    id: r.id, type: 'robot', name: ROBOT_INFO[r.kind], focusDist: 17, ring: 1.6, labelH: 4.6, getPos: v => v.set(r.x, FLOOR, r.z),
    sub: () => ({ weld: 'ST20 Body shop', paint: 'ST30 Paint shop', glaze: 'ST50 Final assembly', wheel: 'ST50 Final assembly' })[r.kind],
    statusPill: () => [r.state, r.state === 'Idle' ? 'idle' : 'ok'],
    stats: () => {
      const base = [['Joint J2 load', `${Math.round(38 + Math.abs(Math.sin(r.a1)) * 40)}%`, (38 + Math.abs(Math.sin(r.a1)) * 40) / 100], ['Axes', '6-axis · 210 kg payload']];
      if (r.kind === 'weld') return [['Spots this shift', fmt(r.count)], ['Tip dress in', `${200 - (r.count % 200)} spots`], ['Weld current', `${(9.8 + Math.sin(simT * 3 + r.off) * .2).toFixed(1)} kA`], ['Cycle time', `${(47.5 + Math.sin(r.off) * 1.2).toFixed(1)} s`], ...base];
      if (r.kind === 'paint') return [['Paint flow', `${Math.round(305 + Math.sin(simT + r.off) * 6)} cc/min`], ['Bell speed', '45,000 rpm'], ['Colour', lineSlots[2] ? lineSlots[2].paint.n : '—'], ['Bodies today', fmt(stats.stepCounts[2])], ...base];
      if (r.kind === 'glaze') return [['Urethane bead', '8.0 mm'], ['Placements today', fmt(stats.stepCounts[4] * 2)], ['Vision offset', '0.3 mm'], ['Cycle time', '44.6 s'], ...base];
      return [['Wheels fitted today', fmt(stats.stepCounts[4] * 2 + r.count % 2)], ['Nut runner torque', '140 N·m'], ['Side', r.z < 0 ? 'Left (north)' : 'Right (south)'], ['Cycle time', '46.2 s'], ...base];
    },
  });
}
function trainState() {
  if (train.state === 'arriving') return `Arriving · ${Math.max(0, Math.ceil((13 - train.t) * SIM / 60 * 10) / 10)} min`;
  if (train.state === 'unloading') return 'At dock · unloading';
  if (train.state === 'departing') return 'Departing';
  return `Next in ${Math.max(1, Math.ceil((9 - train.t + 13) * SIM / 60))} min`;
}
tagPick(train.g, 'FT-204');
addEnt({
  id: 'FT-204', type: 'train', name: 'Freight train', focusDist: 48, ring: 8, labelH: 5.5, get moving() { return true; },
  getPos: v => v.set(-76.5, .1, train.z - 15), sub: () => 'Inbound parts · 4 wagons',
  statusPill: () => [train.state[0].toUpperCase() + train.state.slice(1), train.state === 'away' ? 'idle' : 'ok'],
  stats: () => [['State', trainState(), 0, 1], ['Crates aboard', `${train.crates.filter(c => c.visible).length} / 8`], ['Wagons', '4 flat wagons'], ['Crates today', fmt(train.delivered)], ['Origin', 'Cell supplier hub · 42 km'], ['Locomotive', 'Battery-electric']],
});

/* =====================================================================
   Initial population
   ===================================================================== */
for (let i = 0; i < 7; i++) {
  const c = new Car(); lineSlots[i] = c;
  for (let j = 0; j < i; j++) if (STAGE_STEP[j] != null) c.steps[STAGE_STEP[j]] = new Date(Date.now() - (i - j) * TAKT_REAL * 1000);
}
{
  const pre = [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13].sort(() => Math.random() - .5).slice(0, MOBILE ? 9 : 11);
  pre.forEach((slot, k) => {
    const c = new Car(); c.setFull(); c.state = 'parked'; c.slot = slot; slots[slot] = c;
    for (let j = 0; j < 6; j++) c.steps[j] = new Date(Date.now() - (60 + k * 6) * 60000 + j * 6 * 60000);
    c.soc = rand(45, 92); c.parkedAt = -rand(0, 300) - k * 10; c.lapTime = rand(40, 44); c.pass = Math.random() > .05;
    const p = slotPos(slot); c.group.position.set(p.x, .05, p.z); c.group.rotation.y = p.row ? -Math.PI / 2 : Math.PI / 2; c.setHeads(false);
  });
}
for (let i = 0; i < 5; i++) { const c = new Car({ static: true }); c.setFull(); c.group.position.set(-51 + i * 4.3, .05, -24.6); c.group.rotation.y = Math.PI / 2; c.setHeads(false); }
for (const [k, n] of [['A', 4], ['B', 5], ['C', 2]]) for (let i = 0; i < n; i++) carts.push(new Cart(loops[k], loops[k].total * (i + .3) / n, PAYLOAD[k][i % PAYLOAD[k].length]));

/* =====================================================================
   Simulation updates
   ===================================================================== */
function rollover() {
  const now = new Date();
  lineSlots.forEach((c, i) => { const s = STAGE_STEP[i]; if (c && s != null && !c.steps[s]) { c.steps[s] = now; stats.stepCounts[s]++; } });
  const out = lineSlots[6];
  for (let i = 6; i > 0; i--) lineSlots[i] = lineSlots[i - 1];
  lineSlots[0] = new Car();
  if (out) startDrive(out);
  for (const id in ST) if (ST[id].target) ST[id].ct = clamp(ST[id].target + gauss() * .55, ST[id].target - 2, TAKT_REAL - .2);
  const tk = TAKT_REAL + gauss() * .22 + .05; stats.taktHist.push(tk); if (stats.taktHist.length > 30) stats.taktHist.shift(); stats.lastTakt = tk;
}
function updateLine(dt) {
  taktT += dt; if (taktT >= TAKT) { taktT -= TAKT; rollover(); }
  const ph = taktT / TAKT; LS.ph = ph; const p = LS.proc = ph < TF ? -1 : (ph - TF) / (1 - TF);
  lineBusy = ph < TF + .04 || ph > .965;
  for (let i = 0; i < 7; i++) {
    const car = lineSlots[i]; if (!car) continue;
    const st = LINE[i], pv = i ? LINE[i - 1] : { x1: -40, y: .05 };
    let x, y;
    if (ph < TF) { const k = eio(ph / TF); x = lerp(pv.x1, st.x0, k); y = lerp(pv.y, st.y, k); } else { x = lerp(st.x0, st.x1, p); y = st.y; }
    let lift = 0;
    if (i === 3 && p >= 0) lift = (p < .25 ? sstep(r01(p, .05, .25)) : p < .55 ? 1 : 1 - sstep(r01(p, .55, .72))) * 1.05;
    car.group.position.set(x, FLOOR + y + lift, 0); car.group.rotation.set(0, 0, 0);
    const shell = i > 1 || (i === 1 && p >= .04);
    const shellK = i > 1 ? 1 : i === 1 ? (p < 0 ? 0 : sstep(r01(p, .04, .22))) : 0;
    const paintK = i > 2 ? 1 : i === 2 ? (p < 0 ? 0 : sstep(r01(p, .22, .8))) : 0;
    car.setBuild(!shell, shell, shellK, paintK, i > 3 || (i === 3 && p >= .72), i > 4 || (i === 4 && p >= .55), i > 5 || (i === 5 && p >= .34), i > 5 || (i === 5 && p >= .66), true);
    car.stage = i; car.stageProc = p < 0 ? 0 : p;
    const roll = i === 6 && p > .1 && p < .85;
    if (roll) for (const w of car.wheels) w.rotation.z -= dt * 10;
    car.setHeads(i === 6 && p > .15 && p < .7 && Math.sin(simT * 9) > 0);
  }
  // presses
  for (let j = 0; j < 3; j++) { const pr = presses[j], c = .2 + j * .24; const s = p < 0 ? 0 : clamp(1 - Math.abs((p - c) / .075), 0, 1); pr.ram.position.y = lerp(pr.top, pr.bot, sstep(s)) + .5; }
  pressSheet.visible = p > 0 && p < .9;
  if (pressSheet.visible) { const k = p / .9; pressSheet.position.set(lerp(-55.5, -36.8, k), FLOOR + 1.75 + 1.3 * Math.abs(Math.sin(k * Math.PI * 3)), 0); }
  // battery gantry
  const B = battery; let packY = FLOOR + 5.3, packZ = -3.4, packVis = true, shZ = -3.4, hookY = FLOOR + 5.42;
  if (lineSlots[3] && p >= 0) {
    packY = lerp(FLOOR + 5.3, FLOOR + .37, sstep(r01(p, .05, .35))); packZ = lerp(-3.4, 0, sstep(r01(p, .38, .55))); packVis = p < .72;
    shZ = p < .76 ? packZ : lerp(0, -3.4, sstep(r01(p, .76, .95)));
    hookY = p < .36 ? packY + .12 : lerp(FLOOR + .49, FLOOR + 5.42, sstep(r01(p, .36, .6)));
  } else hookY = packY + .12;
  B.pack.position.set(10, packY, packZ); B.pack.visible = packVis; B.shuttle.position.z = shZ;
  B.hook.position.y = hookY; const top = FLOOR + 5.8, len = Math.max(.05, top - hookY); B.cable.scale.y = len; B.cable.position.y = top - len / 2;
  const lift = lineSlots[3] && p >= 0 ? (p < .25 ? sstep(r01(p, .05, .25)) : p < .55 ? 1 : 1 - sstep(r01(p, .55, .72))) * 1.05 : 0;
  for (const l of B.lifters) { l.scale.y = .05 + lift; l.position.y = FLOOR + (.05 + lift) / 2; }
  // conveyor
  conveyorOff = (conveyorOff + .89 * dt) % 24;
  const m4 = tmpM4;
  for (let i = 0; i < 30; i++) { const x = 20.6 + ((i * .8 + conveyorOff) % 24); m4.makeTranslation(x, FLOOR + .33, 0); slats.setMatrixAt(i, m4); }
  slats.instanceMatrix.needsUpdate = true;
  const spin = lineSlots[6] && p > .1 && p < .85;
  for (const r of rollers) if (spin) r.rotation.z -= dt * 10;
}
const tmpM4 = new THREE.Matrix4();
const MIST_C = new THREE.Color();
function updateRobots(dt) {
  const p = LS.proc; let anyWeld = false;
  for (const r of robots) {
    r.t += dt; const side = Math.sign(r.z);
    let tx = r.x + Math.sin(r.t * .4 + r.off) * .6, ty = FLOOR + 2.7 + Math.sin(r.t * .7) * .15, tz = r.z - side * 1.6, tool = Math.PI * .55, k = 2.5, hold = false;
    r.state = 'Idle';
    if (r.kind === 'weld') {
      const c = lineSlots[1];
      if (c && p > .1 && p < .92) {
        const cx = c.group.position.x; tx = clamp(r.x + Math.sin(r.t * .9 + r.off) * 1.3, cx - 2.1, cx + 2.1); ty = c.group.position.y + .95 + Math.sin(r.t * 2.1 + r.off) * .22; tz = side * 1.15; tool = Math.PI / 2; k = 5;
        r.burst += dt; const on = (r.burst % .6) < .32;
        if (on) { if (!r.wasOn) r.count++; anyWeld = true; r.state = 'Welding'; r.tip.getWorldPosition(tV); r.flash.visible = true; r.flash.scale.setScalar(rand(.7, 1.3)); for (let n = 0; n < 4; n++) sparks.emit(tV, rand(-2.6, 2.6), rand(.5, 3.6), rand(-2.6, 2.6), rand(.25, .65), SPARK_C); }
        else { r.state = 'Repositioning'; r.flash.visible = false; }
        r.wasOn = on;
      }
    } else if (r.kind === 'paint') {
      const c = lineSlots[2];
      if (c && p > .18 && p < .85) {
        const cx = c.group.position.x; tx = clamp(r.x + Math.sin(r.t * 1.2 + r.off) * 1.6, cx - 2.1, cx + 2.1); ty = c.group.position.y + 2.05; tz = side * .4; tool = Math.PI * .82; k = 4;
        r.state = 'Spraying'; r.tip.getWorldPosition(tV); tV2.set(tx - tV.x, c.group.position.y + 1.0 - tV.y, tz - tV.z).normalize();
        MIST_C.copy(c.paintColor);
        for (let n = 0; n < 2; n++) mist.emit(tV, tV2.x * 3 + rand(-.6, .6), tV2.y * 3 + rand(-.4, .4), tV2.z * 3 + rand(-.6, .6), rand(.35, .7), MIST_C);
      }
    } else if (r.kind === 'glaze') {
      const c = lineSlots[4];
      if (c && p >= 0) {
        const cx = c.group.position.x;
        if (p < .2) { tx = 24.2; ty = FLOOR + 1.6; tz = -5.4; hold = p > .1; r.state = 'Picking glass'; }
        else if (p < .55) { tx = cx - .25; ty = c.group.position.y + 1.85; tz = -.2; hold = true; tool = Math.PI * .98; r.state = 'Placing glass'; k = 4; }
        else { r.state = p < .7 ? 'Retracting' : 'Idle'; }
      }
    } else if (r.kind === 'wheel') {
      const c = lineSlots[5]; const rack = [40.6, FLOOR + 1.0, side * 4.65];
      if (c && p >= 0) {
        const cx = c.group.position.x, wy = c.group.position.y + .38, wz = side * 1.4;
        if (p < .34) { [tx, ty, tz] = p < .16 ? rack : [cx + 1.45, wy, wz]; hold = p > .06; r.state = p < .16 ? 'Picking wheel' : 'Fitting front'; }
        else if (p < .5) { [tx, ty, tz] = rack; hold = p > .44; r.state = 'Picking wheel'; }
        else if (p < .66) { [tx, ty, tz] = [cx - 1.45, wy, wz]; hold = true; r.state = 'Fitting rear'; }
        else { [tx, ty, tz] = rack; hold = p > .86; r.state = p > .86 ? 'Ready' : 'Picking wheel'; }
        tool = Math.PI / 2; k = 5;
        if (Math.abs(p - .34) < .01 || Math.abs(p - .66) < .01) r.count++;
      } else hold = true;
    }
    if (r.flash && r.state !== 'Welding') r.flash.visible = false;
    aimRobot(r, tx, ty, tz, dt, k);
    r.wr.rotation.z = -(tool - r.a1 - r.a2);
    if (r.held) r.held.visible = hold;
  }
  weldLight.intensity = anyWeld ? rand(5, 20) : 0;
}
function updateCars(dt) {
  for (const car of cars) {
    if (car.state !== 'drive' && car.state !== 'ship') continue;
    let seg = car.route[car.segI];
    let target = seg.kind === 'lap' ? cur.track : seg.speed;
    const rem = seg.len - car.s;
    if (seg.final || seg.kind === 'rev') target = Math.min(target, Math.sqrt(2 * 3 * Math.max(0, rem)) + .25);
    const h = car.group.rotation.y, fx = Math.cos(h) * (seg.reverse ? -1 : 1), fz = -Math.sin(h) * (seg.reverse ? -1 : 1);
    let blocked = false;
    for (const o of cars) {
      if (o === car || (o.state !== 'drive' && o.state !== 'ship')) continue;
      const dx = o.group.position.x - car.group.position.x, dz = o.group.position.z - car.group.position.z, d = Math.hypot(dx, dz);
      if (d < 8 && d > .01 && (dx * fx + dz * fz) / d > .72) { blocked = true; target = Math.min(target, d < 4.8 ? 0 : target * .4); }
    }
    if (blocked && target === 0) { car.stuck += dt; if (car.stuck > 4) target = 2; } else car.stuck = 0;
    const a = target > car.v ? 4 : 9; car.v += clamp(target - car.v, -a * dt, a * dt);
    car.s += car.v * dt;
    if (car.s >= seg.len) {
      car.s -= seg.len;
      if (seg.kind === 'exit') car.lapStart = simT;
      if (seg.kind === 'lap') finishLap(car);
      car.segI++;
      if (car.segI >= car.route.length) {
        if (car.state === 'ship') { car.dispose(); continue; }
        car.state = 'parked'; car.parkedAt = simT; car.v = 0; car.setHeads(false); car.s = 0;
        continue;
      }
      seg = car.route[car.segI];
    }
    const u = clamp(car.s / seg.len, 0, 1);
    seg.curve.getPointAt(u, tV); seg.curve.getTangentAt(u, tV2);
    let hd = Math.atan2(-tV2.z, tV2.x); if (seg.reverse) hd += Math.PI;
    car.group.position.set(tV.x, heightAt(tV.x, tV.z), tV.z); car.group.rotation.y = hd;
    for (const w of car.wheels) w.rotation.z -= car.v * dt / .38 * (seg.reverse ? -1 : 1);
  }
}
function finishLap(car) {
  const now = new Date();
  car.lapTime = (simT - (car.lapStart ?? simT - 10)) * SIM; stats.lastLap = car.lapTime; if (car.lapTime < stats.bestLap && env.weather === 'clear') stats.bestLap = car.lapTime;
  car.steps[5] = now; stats.stepCounts[5]++; stats.built++; stats.tested++;
  if (car.pass) stats.passed++; else { stats.rework++; pushAlert('warn', `${car.id.slice(-8)} flagged for rework — wind noise ${car.nvh.toFixed(1)} dB(A)`, car.id); }
  stats.fpyHist.push(stats.passed / stats.tested * 100 + gauss() * .35); if (stats.fpyHist.length > 30) stats.fpyHist.shift();
}
let shipTimer = 0;
function updateYard(dt) {
  for (const c of cars) if (c.state === 'parked') c.soc = Math.min(c.soc < 80 ? 100 : 90, c.soc + dt * (c.soc < 80 ? .7 * cur.charge : .08));
  shipTimer += dt;
  if (shipTimer > 15) {
    shipTimer = 0;
    const pk = [...cars].filter(c => c.state === 'parked');
    if (pk.length >= 10) { const ready = pk.filter(c => c.soc >= 80).sort((a, b) => a.parkedAt - b.parkedAt)[0]; if (ready) ship(ready); }
  }
  for (let i = 0; i < SLOT_N; i++) { const c = slots[i]; chargers[i].scr.material = c && c.state === 'parked' ? (c.soc < 80 ? (Math.sin(simT * 3 + i) > -.6 ? chargeOn : chargeDone) : chargeDone) : chargeOff; }
}
function updateCarts(dt) { for (const c of carts) c.update(dt); }
function updateDock() { dockCrates.forEach((c, i) => c.visible = i < dockStock); }
function updateTrain(dt) {
  const T = train; T.t += dt;
  if (T.state === 'arriving') {
    const k = clamp(T.t / 13, 0, 1); T.z = lerp(-230, 21, 1 - Math.pow(1 - k, 3));
    if (k >= 1) { T.state = 'unloading'; T.t = 0; T.done = false; T.wait = 0; pushAlert('info', 'Freight train FT-204 docked — unloading 8 crates', 'FT-204'); }
  } else if (T.state === 'unloading') {
    if (!T.cur && !T.done) {
      const next = T.crates.find(c => c.visible);
      if (!next || dockStock + (T.incoming || 0) >= dockSlots.length) T.done = true;
      else {
        next.getWorldPosition(tV); next.visible = false;
        const slot = dockStock; const [sx, sz] = dockSlots[slot];
        T.cur = { from: tV.clone(), to: V(sx, 1.1, sz), t: 0, cx: crane.x, cz: crane.z };
        T.fly.position.copy(tV); T.fly.visible = true;
      }
    }
    if (T.cur) {
      const c = T.cur; c.t += dt / 2.4; const t = c.t;
      const liftY = 7.2; let x, y, z;
      if (t < .18) { x = c.from.x; y = c.from.y; z = c.from.z; const kk = sstep(t / .18); crane.x = lerp(c.cx, x, kk); crane.z = lerp(c.cz, z, kk); }
      else if (t < .38) { x = c.from.x; z = c.from.z; y = lerp(c.from.y, liftY, sstep(r01(t, .18, .38))); }
      else if (t < .72) { const kk = sstep(r01(t, .38, .72)); x = lerp(c.from.x, c.to.x, kk); z = lerp(c.from.z, c.to.z, kk); y = liftY; }
      else { x = c.to.x; z = c.to.z; y = lerp(liftY, c.to.y, sstep(r01(t, .72, .92))); }
      T.fly.position.set(x, y, z);
      if (t >= .18) { crane.x = x; crane.z = z; }
      crane.hookY = t < .18 ? lerp(crane.hookY, c.from.y + 1.4, .2) : y + 1.4;
      if (t >= 1) { T.fly.visible = false; dockStock = Math.min(dockSlots.length, dockStock + 1); T.delivered++; updateDock(); T.cur = null; }
    }
    if (T.done && !T.cur) { T.wait += dt; if (T.wait > 1.5) { T.state = 'departing'; T.t = 0; } }
  } else if (T.state === 'departing') {
    const k = clamp(T.t / 11, 0, 1); T.z = 21 + 260 * k * k;
    if (k >= 1) { T.state = 'away'; T.t = 0; }
  } else if (T.state === 'away') {
    if (T.t > 9) { T.state = 'arriving'; T.t = 0; T.z = -230; for (const c of T.crates) c.visible = true; }
  }
  if (!T.cur) { crane.z += (0 - crane.z) * Math.min(1, dt * .8); crane.x += (-70 - crane.x) * Math.min(1, dt * .8); crane.hookY += (7 - crane.hookY) * Math.min(1, dt); }
  T.g.position.z = T.z;
  crane.bridge.position.z = crane.z; crane.trolley.position.set(crane.x, 9.3, crane.z);
  crane.hook.position.set(crane.x, crane.hookY, crane.z);
  const top = 9.3, len = Math.max(.1, top - crane.hookY); crane.cable.scale.y = len; crane.cable.position.set(crane.x, top - len / 2, crane.z);
}

/* =====================================================================
   Camera: selection, fly, follow
   ===================================================================== */
let selected = null;
const cam = { flying: false, t: 0, from: V(), fromPos: V(), dir: V(), dist: 30, follow: null };
const ringG = new THREE.Group(); ringG.visible = false; scene.add(ringG);
const ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: .95, side: THREE.DoubleSide, depthWrite: false });
const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 96), ringMat); ring.rotation.x = -Math.PI / 2; ringG.add(ring);
const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: .08, depthWrite: false })); disc.rotation.x = -Math.PI / 2; ringG.add(disc);
const ring2 = new THREE.Mesh(new THREE.RingGeometry(.97, 1, 96), new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: .35, side: THREE.DoubleSide, depthWrite: false })); ring2.rotation.x = -Math.PI / 2; ringG.add(ring2);
function sizeRing(R) {
  const th = clamp(R * .05, .14, .55);
  ring.geometry.dispose(); ring.geometry = new THREE.RingGeometry(R - th, R, 96);
  disc.geometry.dispose(); disc.geometry = new THREE.CircleGeometry(R - th, 96);
  ring2.geometry.dispose(); ring2.geometry = new THREE.RingGeometry(R + th * .6, R + th, 96);
}
ringG.renderOrder = 5;
function focusEntity(e) {
  const dir = camera.position.clone().sub(controls.target).normalize();
  const sph = new THREE.Spherical().setFromVector3(dir); sph.phi = clamp(sph.phi, .55, 1.05); sph.radius = 1; dir.setFromSpherical(sph);
  cam.from.copy(controls.target); cam.fromPos.copy(camera.position); cam.dir.copy(dir);
  cam.dist = e.focusDist * (MOBILE ? 1.45 : 1); cam.t = 0; cam.flying = true; cam.follow = e;
}
function updateCamera(dt) {
  const e = cam.follow;
  if (e) {
    if (!entities.has(e.id)) { cam.follow = null; return; }
    const p = e.getPos(tV3);
    if (cam.flying) {
      cam.t += dt / 1.35; const k = eio(cam.t);
      controls.target.lerpVectors(cam.from, p, k);
      tV2.copy(p).addScaledVector(cam.dir, cam.dist); camera.position.lerpVectors(cam.fromPos, tV2, k);
      if (cam.t >= 1) cam.flying = false;
    } else if (e.moving) {
      tV2.subVectors(p, controls.target); controls.target.add(tV2); camera.position.add(tV2);
    }
  }
  const t = controls.target, cx = clamp(t.x, -130, 140), cz = clamp(t.z, -90, 90);
  if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
}
function updateRing() {
  if (!selected) { ringG.visible = false; return; }
  const p = selected.getPos(tV3);
  ringG.visible = true; ringG.position.set(p.x, p.y + .06, p.z);
  const pulse = 1 + Math.sin(simT * 3) * .025; ring.scale.setScalar(pulse);
  ring2.scale.setScalar(1 + ((simT * .6) % 1) * .22); ring2.material.opacity = .45 * (1 - ((simT * .6) % 1));
  tV3.y += selected.labelH; tV3.project(camera);
  const el = $('#selLabel');
  if (tV3.z < 1 && Math.abs(tV3.x) < 1.2 && Math.abs(tV3.y) < 1.2) {
    el.style.display = 'flex';
    el.style.transform = `translate(${(tV3.x * .5 + .5) * innerWidth}px, ${(-tV3.y * .5 + .5) * innerHeight - 14}px) translate(-50%,-100%)`;
  } else el.style.display = 'none';
}

/* =====================================================================
   Pointer input
   ===================================================================== */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null; const activePointers = new Set();
const cvs = renderer.domElement;
cvs.addEventListener('pointerdown', e => {
  activePointers.add(e.pointerId);
  down = { x: e.clientX, y: e.clientY, t: performance.now(), b: e.button, multi: activePointers.size > 1 };
  if (activePointers.size > 1 && down) down.multi = true;
  cam.flying = false; closeMenus(); hideHint();
});
cvs.addEventListener('pointermove', e => {
  if (!down) return;
  if (activePointers.size > 1) down.multi = true;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 && down.b === 0 && !down.multi && cam.follow) { cam.follow = null; renderDetailActions(); }
});
const endPointer = e => {
  activePointers.delete(e.pointerId);
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  if (e.type === 'pointerup' && down.b === 0 && !down.multi && moved < 7 && performance.now() - down.t < 600) pickAt(e.clientX, e.clientY);
  if (activePointers.size === 0) down = null;
};
cvs.addEventListener('pointerup', endPointer); cvs.addEventListener('pointercancel', endPointer);
cvs.addEventListener('wheel', () => { cam.flying = false; hideHint(); }, { passive: true });
function pickAt(x, y) {
  ndc.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects([...pickSet], false);
  const h = hits.find(h => h.object.visible !== false && h.object.userData.eid && entities.has(h.object.userData.eid));
  if (h) select(entities.get(h.object.userData.eid)); else select(null);
}
function select(e, fly = true) {
  e = e || null; selected = e;
  document.body.classList.toggle('has-sel', !!e);
  if (e) {
    if (fly) focusEntity(e);
    sizeRing(e.ring);
    const lab = $('#selLabel'); lab.innerHTML = `${e.type === 'vehicle' ? e.id.slice(-8) : e.id}<small>${e.name}</small>`;
    document.body.classList.remove('data-open');
  } else { cam.follow = null; $('#selLabel').style.display = 'none'; }
  renderDetail(true); renderTracker(); renderTable(); markAreas();
}

/* =====================================================================
   UI
   ===================================================================== */
const AREAS = [['Press', 'ST10'], ['Body', 'ST20'], ['Paint', 'ST30'], ['Battery', 'ST40'], ['Assembly', 'ST50'], ['Test track', 'TT1']];
for (const host of [$('#areas'), $('#areas2')]) {
  host.innerHTML = AREAS.map(([n, id]) => `<button data-id="${id}">${n}</button>`).join('');
  host.addEventListener('click', e => { const b = e.target.closest('button'); if (b) select(entities.get(b.dataset.id)); });
}
function markAreas() {
  let area = null;
  if (selected) { if (selected.type === 'station') area = selected.area; else if (selected.type === 'robot') area = { weld: 'Body', paint: 'Paint', glaze: 'Assembly', wheel: 'Assembly' }[robots.find(r => r.id === selected.id).kind]; else if (selected.type === 'vehicle' && selected.state === 'drive' && selected.segI === 1) area = 'Test track'; }
  document.querySelectorAll('#areas button, #areas2 button').forEach(b => b.classList.toggle('on', AREAS.find(a => a[1] === b.dataset.id)[0] === area));
}
// menus
function closeMenus(except) { document.querySelectorAll('.menu.open').forEach(m => { if (m !== except) m.classList.remove('open'); }); }
document.addEventListener('pointerdown', e => { if (!e.target.closest('.menu')) closeMenus(); });
$('#weatherBtn').addEventListener('click', () => { const m = $('#weatherMenu'); closeMenus(m); m.classList.toggle('open'); });
$('#alertBtn').addEventListener('click', () => { const m = $('#alertMenu'); closeMenus(m); m.classList.toggle('open'); unread = 0; renderAlertBadge(); renderAlerts(); });
function renderWeather() {
  const W = WEATHER[env.weather];
  $('#weatherIcon').innerHTML = ICON[W.icon]; $('#weatherName').textContent = W.name;
  $('#weatherList').innerHTML = `<div class="dd-title">Site weather · affects yard &amp; track</div>` + Object.entries(WEATHER).map(([k, w]) => `<div class="dd-item ${k === env.weather ? 'on' : ''}" data-w="${k}">${ICON[w.icon]}<div>${w.name}<small>${w.sub}</small></div></div>`).join('');
}
$('#weatherList').addEventListener('click', e => {
  const it = e.target.closest('[data-w]'); if (!it) return;
  const k = it.dataset.w; if (k !== env.weather) {
    env.weather = k; const W = WEATHER[k];
    pushAlert(k === 'clear' ? 'info' : 'warn', k === 'clear' ? 'Weather cleared — test track back to full speed' : `${W.name}: ${W.sub.toLowerCase()}`, 'TT1');
  }
  renderWeather(); closeMenus();
});
function renderDN() { $('#dnBtn').innerHTML = env.nightTarget > .5 ? ICON.moon : ICON.sun; $('#dnBtn').title = env.nightTarget > .5 ? 'Night — switch to day' : 'Day — switch to night'; }
$('#dnBtn').addEventListener('click', () => { env.nightTarget = env.nightTarget > .5 ? 0 : 1; renderDN(); });
// alerts
const alerts = []; let unread = 0;
function pushAlert(level, text, eid) { alerts.unshift({ level, text, eid, time: new Date() }); if (alerts.length > 40) alerts.pop(); unread++; renderAlertBadge(); if ($('#alertMenu').classList.contains('open')) renderAlerts(); }
function renderAlertBadge() { const b = $('#alertBadge'); b.textContent = unread > 9 ? '9+' : unread; b.classList.toggle('hide', unread === 0); }
function renderAlerts() { $('#alertList').innerHTML = `<div class="dd-title">Line alerts</div>` + (alerts.length ? alerts.map((a, i) => `<div class="alert ${a.level}" data-i="${i}"><div class="ad"></div><div><div class="at">${a.text}</div><div class="am">${hms(a.time)}${a.eid ? ' · ' + a.eid.slice(-8) : ''}</div></div></div>`).join('') : '<div class="dd-item">All clear</div>'); }
$('#alertList').addEventListener('click', e => { const it = e.target.closest('[data-i]'); if (!it) return; const a = alerts[+it.dataset.i]; if (a && a.eid && entities.has(a.eid)) select(entities.get(a.eid)); closeMenus(); });
// search
const sInput = $('#search'); let sHits = [], sIdx = 0;
const TYPE_LABEL = { station: 'Station', robot: 'Robot', agv: 'AGV', vehicle: 'Vehicle', train: 'Train' };
function runSearch() {
  const q = sInput.value.trim().toLowerCase();
  if (!q) { $('#searchBox').classList.remove('open'); return; }
  sHits = [...entities.values()].filter(e => e.id.toLowerCase().includes(q) || (e.name || '').toLowerCase().includes(q) || (e.type === 'vehicle' && (e.paint.n.toLowerCase().includes(q)))).slice(0, 8); sIdx = 0;
  $('#searchResults').innerHTML = sHits.length ? sHits.map((e, i) => `<div class="sr ${i === sIdx ? 'hl' : ''}" data-id="${e.id}"><span class="tchip">${TYPE_LABEL[e.type]}</span><b>${e.type === 'vehicle' ? e.id : e.id}</b><span>${e.name}</span></div>`).join('') : '<div class="dd-item">No matches</div>';
  closeMenus($('#searchBox')); $('#searchBox').classList.add('open');
}
sInput.addEventListener('input', runSearch);
sInput.addEventListener('focus', runSearch);
sInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && sHits[sIdx]) { select(sHits[sIdx]); sInput.value = ''; sInput.blur(); $('#searchBox').classList.remove('open'); }
  else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { sIdx = clamp(sIdx + (e.key === 'ArrowDown' ? 1 : -1), 0, sHits.length - 1); document.querySelectorAll('.sr').forEach((el, i) => el.classList.toggle('hl', i === sIdx)); e.preventDefault(); }
  else if (e.key === 'Escape') { sInput.blur(); $('#searchBox').classList.remove('open'); }
});
$('#searchResults').addEventListener('click', e => { const it = e.target.closest('[data-id]'); if (!it) return; select(entities.get(it.dataset.id)); sInput.value = ''; $('#searchBox').classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.activeElement !== sInput) select(null); if (e.key === '/' && document.activeElement !== sInput) { e.preventDefault(); sInput.focus(); } });
// detail actions
$('#btnClose').addEventListener('click', () => select(null));
$('#btnFollow').addEventListener('click', () => { if (!selected) return; if (cam.follow === selected) cam.follow = null; else focusEntity(selected); renderDetailActions(); });
$('#dataBtn').addEventListener('click', () => document.body.classList.toggle('data-open'));
function renderDetailActions() {
  const a = $('#dActions'); a.style.display = selected ? 'flex' : 'none';
  if (!selected) return;
  const b = $('#btnFollow'); const on = cam.follow === selected;
  b.classList.toggle('on', on); b.querySelector('span').textContent = selected.moving ? (on ? 'Following' : 'Follow') : (on ? 'Focused' : 'Focus');
}
const pillHTML = ([t, c]) => `<span class="pill ${c}">${t}</span>`;
function statHTML([k, v, bar, wide]) { return `<div class="stat ${wide ? 'wide' : ''}"><span>${k}</span><b>${v}</b>${bar ? `<i class="bar"><em style="width:${clamp(bar, 0, 1) * 100}%"></em></i>` : ''}</div>`; }
function renderDetail() {
  const H = $('#dHead'), Bd = $('#dBody');
  if (!selected) {
    const pk = [...cars].filter(c => c.state === 'parked').length, moving = carts.filter(c => c.status === 'Moving').length;
    H.innerHTML = `<div class="d-top"><span class="tchip">Plant 01</span>${pillHTML(['Line running', 'ok'])}</div><div class="d-title">Gigaline A overview</div><div class="d-sub">Click any station, robot, cart or car to inspect it</div>`;
    const occ = [0, 1, 2, 3, 4, 5, 6].map(i => `<i class="${lineSlots[i] ? 'f' : ''} ${lineSlots[i] && LS.ph < TF ? 't' : ''}"></i>`).join('');
    Bd.innerHTML = `<div class="d-section">Line occupancy · takt ${Math.round(LS.ph * 100)}%</div><div class="ov-line">${occ}</div><div class="ov-lbl">${['Press', 'Body', 'Paint', 'Batt', 'Glaze', 'Wheel', 'EOL'].map(s => `<span>${s}</span>`).join('')}</div>` +
      `<div class="stats">${[['Work in progress', `${lineSlots.filter(Boolean).length} bodies`], ['On test track', `${[...cars].filter(c => c.state === 'drive').length}`], ['Charging yard', `${pk} / ${SLOT_N} bays`, pk / SLOT_N], ['AGVs moving', `${moving} / ${carts.length}`, moving / carts.length], ['Dock stock', `${dockStock} crates`, dockStock / 18], ['Train FT-204', trainState()], ['Weather', WEATHER[env.weather].name], ['Track grip µ', cur.grip.toFixed(2)], ['Plant power', `${(9.4 + (env.weather === 'heat' ? 1.6 : 0) + Math.sin(simT * .05) * .3).toFixed(1)} MW`, 0, 0], ['Shipped today', fmt(stats.shipped + Math.floor(stats.built * .91))]].map(statHTML).join('')}</div>`;
  } else {
    const e = selected; const sp = e.statusPill ? e.statusPill() : e.status();
    const isV = e.type === 'vehicle';
    H.innerHTML = `<div class="d-top"><span class="tchip">${TYPE_LABEL[e.type]}</span>${pillHTML(sp)}</div><div class="d-title ${isV ? 'mono' : ''}">${isV ? e.id : `${e.id} · ${e.name}`}</div><div class="d-sub">${isV ? e.name + ' · ' + e.sub() : e.sub()}</div>`;
    Bd.innerHTML = `<div class="stats">${e.stats().map(statHTML).join('')}</div>`;
  }
  renderDetailActions();
}
// tracker
function trackedCar() {
  if (selected && selected.type === 'vehicle') return [selected, false];
  const lap = [...cars].find(c => c.state === 'drive'); if (lap) return [lap, true];
  for (let i = 6; i >= 0; i--) if (lineSlots[i]) return [lineSlots[i], true];
  return [null, true];
}
function curStep(c) { if (c.state === 'line') return STAGE_CUR[c.stage]; if (c.state === 'drive' && !c.steps[5]) return 5; return 6; }
function renderTracker() {
  const [c, auto] = trackedCar(); if (!c) return;
  $('#trTitle').textContent = auto ? 'Build tracker · lead vehicle' : 'Build tracker · selected';
  $('#trVin').textContent = c.id;
  $('#trMeta').innerHTML = `<b>${c.trim.n}</b> · ${c.trim.kwh} kWh<br>${c.paint.n}`;
  const cs = curStep(c);
  $('#trSteps').innerHTML = STEP_NAMES.map((n, i) => {
    const done = !!c.steps[i], cls = done ? 'done' : i === cs ? 'cur' : '';
    return `<div class="step ${cls}"><div class="dot">${done ? ICON.check : ''}</div><div class="nm">${n}</div><div class="tm">${done ? hm(c.steps[i]) : i === cs ? 'now' : ''}</div><div class="ct" title="Today">${fmt(stats.stepCounts[i])}</div></div>`;
  }).join('');
  let prog = c.steps.filter(Boolean).length / 6;
  if (c.state === 'line') prog = (STAGE_CUR[c.stage] + (c.stage === 4 ? c.stageProc * .5 : c.stage === 5 ? .5 + c.stageProc * .5 : c.stageProc)) / 6;
  if (c.state === 'drive' && c.segI === 1) prog = (5 + clamp(c.s / LAP_LEN, 0, 1) * .95) / 6;
  $('#trProg').style.width = `${clamp(prog, 0, 1) * 100}%`;
}
// table
let tab = 'stations';
const TABS = [['stations', 'Stations'], ['carts', 'Carts'], ['vehicles', 'Vehicles']];
function renderTabs() {
  const n = { stations: Object.keys(ST).length, carts: carts.length, vehicles: cars.size };
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${l}<span class="n">${n[k]}</span></button>`).join('');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; renderTabs(); renderTable(); $('.tbl').scrollTop = 0; });
$('#tbody').addEventListener('click', e => { const tr = e.target.closest('[data-id]'); if (tr && entities.has(tr.dataset.id)) select(entities.get(tr.dataset.id)); });
const mini = v => `<i class="mini"><em style="width:${clamp(v, 0, 1) * 100}%"></em></i>`;
function renderTable() {
  const sel = selected ? selected.id : '';
  let head = '', rows = '';
  if (tab === 'stations') {
    head = '<tr><th>ID</th><th>Station</th><th>Status</th><th>Cycle</th><th>OEE</th><th>Today</th></tr>';
    rows = Object.entries(ST).map(([id, s]) => `<tr data-id="${id}" class="${id === sel ? 'sel' : ''}"><td class="mono">${id}</td><td>${s.name}</td><td>${pillHTML(stationStatus(id))}</td><td class="mono">${s.ct ? s.ct.toFixed(1) + ' s' : '—'}</td><td class="mono">${OEE[id] ? OEE[id].toFixed(1) + '%' : '—'}</td><td class="mono">${s.step != null ? fmt(stats.stepCounts[s.step]) : id === 'CY1' ? slots.filter(Boolean).length + ' cars' : id === 'RD1' ? dockStock + ' crates' : '—'}</td></tr>`).join('');
  } else if (tab === 'carts') {
    head = '<tr><th>ID</th><th>Route</th><th>Status</th><th>Payload</th><th>Speed</th><th>Battery</th></tr>';
    rows = carts.map(c => `<tr data-id="${c.id}" class="${c.id === sel ? 'sel' : ''}"><td class="mono">${c.id}</td><td>Loop ${c.loop.id}</td><td>${pillHTML(c.statusPill())}</td><td>${c.load ? c.load + '× ' + c.payload : '<span class="muted">Empty</span>'}</td><td class="mono">${(c.v / SIM).toFixed(2)} m/s</td><td class="mono">${mini(c.batt / 100)}${c.batt.toFixed(0)}%</td></tr>`).join('');
  } else {
    head = '<tr><th>VIN</th><th>Trim</th><th>Pack</th><th>Colour</th><th>Location</th><th>Progress</th></tr>';
    const order = { line: 0, drive: 1, parked: 2, ship: 3 };
    rows = [...cars].sort((a, b) => order[a.state] - order[b.state] || (a.state === 'line' ? b.stage - a.stage : 0)).map(c => `<tr data-id="${c.id}" class="${c.id === sel ? 'sel' : ''}"><td class="mono">${c.id}</td><td>${c.trim.n.replace('Arc ', '')}</td><td class="mono">${c.trim.kwh} kWh</td><td><i class="swatch" style="background:#${c.paintColor.getHexString()}"></i>${c.paint.n}</td><td>${c.location()}</td><td class="mono">${mini(c.state === 'parked' ? c.soc / 100 : c.progress())}${c.state === 'parked' ? c.soc.toFixed(0) + '% SoC' : Math.round(c.progress() * 100) + '%'}</td></tr>`).join('');
  }
  $('#thead').innerHTML = head; $('#tbody').innerHTML = rows; renderTabs();
}
// KPIs
function sparkSVG(vals, lo, hi) {
  const w = 180, h = 28, n = vals.length; if (n < 2) return '';
  const mn = lo ?? Math.min(...vals), mx = hi ?? Math.max(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => [i / (n - 1) * w, h - 3 - (clamp(v, mn, mx) - mn) / r * (h - 6)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[n - 1];
  return `<path d="${d} L${w} ${h} L0 ${h} Z" fill="rgba(16,185,129,.12)"/><path d="${d}" fill="none" stroke="#10B981" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="#10B981"/>`;
}
let lastHourly = 0; const PACE0 = hoursSinceStart(); stats.built0 = stats.built;
function renderKPIs() {
  const pace = Math.min(PACE0, 22) * RATE * .95 + simT / TAKT * .985;
  $('#kBuilt').textContent = fmt(stats.built);
  const dlt = (stats.built / Math.max(1, pace) - 1) * 100;
  $('#kBuiltDelta').textContent = `${dlt >= 0 ? '▲' : '▼'} ${Math.abs(dlt).toFixed(1)}% vs plan`; $('#kBuiltDelta').className = 'delta' + (dlt < 0 ? ' down' : '');
  $('#kBuiltPlan').textContent = `plan ${fmt(pace)}`;
  if (simT - lastHourly > 6) { lastHourly = simT; stats.hourly.push(Math.round(RATE * .962 + gauss() * 2.2)); if (stats.hourly.length > 14) stats.hourly.shift(); $('#sBuilt').innerHTML = sparkSVG(stats.hourly); }
  $('#kTakt').innerHTML = `${stats.lastTakt.toFixed(1)}<small>s</small>`;
  const td = stats.lastTakt - TAKT_REAL; $('#kTaktDelta').textContent = `${td >= 0 ? '+' : '−'}${Math.abs(td).toFixed(1)} s`; $('#kTaktDelta').className = 'delta' + (td > .3 ? ' down' : '');
  $('#sTakt').innerHTML = sparkSVG(stats.taktHist, 51, 53);
  const fpy = stats.passed / Math.max(1, stats.tested) * 100;
  $('#kFpy').innerHTML = `${fpy.toFixed(1)}<small>%</small>`;
  $('#kFpyN').textContent = `${fmt(stats.rework)} rework`;
  const fd = fpy - 96; $('#kFpyDelta').textContent = `${fd >= 0 ? '▲' : '▼'} ${Math.abs(fd).toFixed(1)} pts`; $('#kFpyDelta').className = 'delta' + (fd < 0 ? ' down' : '');
  $('#sFpy').innerHTML = sparkSVG(stats.fpyHist, 94, 99);
}
// periodic alerts
let nextAlert = 14;
const ALERT_GEN = [
  () => { const r = pick(robots.filter(r => r.kind === 'weld')); return ['info', `${r.id} tip dress complete · ${fmt(r.count)} spots this shift`, r.id]; },
  () => { const c = carts.reduce((a, b) => a.batt < b.batt ? a : b); return [c.batt < 35 ? 'warn' : 'info', `${c.id} battery ${c.batt.toFixed(0)}% — opportunity charge at next load`, c.id]; },
  () => ['info', `Paint booth humidity ${env.weather === 'monsoon' ? 66 : 58}% RH — within spec`, 'ST30'],
  () => ['info', `ST40 torque audit passed · ${(42 + gauss() * .2).toFixed(1)} N·m`, 'ST40'],
  () => ['info', `Takt ${stats.lastTakt.toFixed(1)} s — line balanced`, 'ST50'],
  () => { const c = [...cars].find(c => c.state === 'parked' && c.soc >= 80); return c ? ['info', `${c.id.slice(-8)} charged to ${c.soc.toFixed(0)}% — ready to ship`, c.id] : ['info', 'Charging yard balanced', 'CY1']; },
];
function uiAlerts() { if (simT > nextAlert) { nextAlert = simT + rand(22, 40); const [l, t, id] = pick(ALERT_GEN)(); pushAlert(l, t, id); } }
let hintHidden = false;
function hideHint() { if (!hintHidden) { hintHidden = true; $('#hint').classList.add('hide'); } }
setTimeout(hideHint, 9000);
let lastUi = 0, lastTable = 0, lastSec = -1;
function uiTick(now) {
  const d = new Date(); if (d.getSeconds() !== lastSec) { lastSec = d.getSeconds(); $('#clock').textContent = hms(d); const h = d.getHours(); $('#shift').textContent = h >= 6 && h < 14 ? 'Shift A' : h >= 14 && h < 22 ? 'Shift B' : 'Shift C'; }
  if (now - lastUi > 250) { lastUi = now; renderKPIs(); renderDetail(); renderTracker(); uiAlerts(); markAreas(); }
  if (now - lastTable > 700) { lastTable = now; renderTable(); }
}
pushAlert('info', 'Paint booth 2 humidity 58% RH — within spec', 'ST30');
pushAlert('warn', `${carts[6].id} battery 31% — opportunity charge at next load`, carts[6].id);
pushAlert('info', 'Freight train FT-204 inbound to rail dock', 'FT-204');
unread = 3; renderAlertBadge();
renderWeather(); renderDN(); renderTabs(); renderTable(); renderDetail(); renderTracker(); renderKPIs(); markAreas(); updateDock();
$('#sBuilt').innerHTML = sparkSVG(stats.hourly);

/* =====================================================================
   Main loop
   ===================================================================== */
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
let last = performance.now(), frames = 0;
function simStep(dt) {
  simT += dt;
  updateLine(dt); updateRobots(dt); updateCarts(dt); updateCars(dt); updateYard(dt); updateTrain(dt);
  sparks.update(dt, 9.8, FLOOR + .02, .6); mist.update(dt, -.2, FLOOR + .05, 2.2);
  updateEnv(dt); updateWeatherFx(dt); updateCamera(dt);
  controls.update();
}
const vOff = { x: 0, y: 0 };
function updateViewOffset(dt) {
  const W = innerWidth, H = innerHeight, mob = W <= 900;
  const tx = mob ? 0 : Math.min(160, W * .1), ty = mob ? ((document.body.classList.contains('has-sel') || document.body.classList.contains('data-open')) ? H * .12 : 0) : Math.min(80, H * .08);
  const k = Math.min(1, dt * 4); vOff.x += (tx - vOff.x) * k; vOff.y += (ty - vOff.y) * k;
  camera.setViewOffset(W, H, vOff.x, vOff.y, W, H);
}
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  simStep(dt); updateViewOffset(dt); updateRing();
  renderer.render(scene, camera);
  uiTick(now);
  if (++frames === 2) $('#loader').classList.add('hide');
  requestAnimationFrame(loop);
}
// Debug handle for the browser console (e.g. __voltline.warp(60) fast-forwards 60 s)
window.__voltline = { LS, lineSlots, warp: sec => { for (let i = 0; i < sec / .05; i++) simStep(.05); }, select, entities, env, cars, carts, stats, controls, camera, WEATHER, renderDN, renderWeather };
requestAnimationFrame(loop);
