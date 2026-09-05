// --- 1. Scene, Camera, and Renderer Setup ---
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x8cd3eb);
const fogColor = new THREE.Color(0xa7e1f2);
scene.background = skyColor;
scene.fog = new THREE.FogExp2(fogColor, 0.0018);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.5,
  2500
);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
container.appendChild(renderer.domElement);

// --- 2. PS1 Tropical Lighting ---
const ambientLight = new THREE.AmbientLight(0xdcf4ff, 0.75);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff6dd, 1.1);
sunLight.position.set(200, 450, 250);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x78b8d0, 0.4);
fillLight.position.set(-200, -50, -200);
scene.add(fillLight);

// --- Audio Synthesizer (GTA / PS1 Checkpoint Chime) ---
let audioCtx = null;
function playRingChime() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const t = audioCtx.currentTime;

    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, t); // D5
    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t);
    osc1.stop(t + 0.18);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t + 0.1); // A5
    gain2.gain.setValueAtTime(0.3, t + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t + 0.1);
    osc2.stop(t + 0.45);
  } catch (err) {}
}

// --- 3. Paraglider + Bird Assembly ---
const gliderRoot = new THREE.Group();
scene.add(gliderRoot);

const paragliderGroup = new THREE.Group();
gliderRoot.add(paragliderGroup);

// Canopy
const canopyGroup = new THREE.Group();
canopyGroup.position.set(0, 2.3, 0);
paragliderGroup.add(canopyGroup);

const panelColors = [
  0xdc3545, // Bright Red
  0xe67e22, // Orange
  0xf4d03f, // Warm Yellow
  0x2ecc71, // Light Green
  0x1b7a3e  // Forest Green
];

const totalWidth = 4.6;
const numPanels = 5;
const depth = 1.8;

function getCanopyPoint(uNorm, vNorm) {
  const x = uNorm * (totalWidth / 2);
  const z = (vNorm - 0.5) * depth;
  const arch = Math.cos(uNorm * Math.PI * 0.45) * 0.45;
  const frontDroop = -Math.pow(1.0 - vNorm, 1.8) * 0.45;
  const rearRise = (vNorm - 0.5) * 0.15;
  return new THREE.Vector3(x, arch + frontDroop + rearRise, z);
}

for (let i = 0; i < numPanels; i++) {
  const uStart = -1.0 + (i / numPanels) * 2.0;
  const uEnd = -1.0 + ((i + 1) / numPanels) * 2.0;
  const uSegs = 2;
  const vSegs = 3;

  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const indices = [];

  for (let iv = 0; iv <= vSegs; iv++) {
    const vNorm = iv / vSegs;
    for (let iu = 0; iu <= uSegs; iu++) {
      const uNorm = uStart + (iu / uSegs) * (uEnd - uStart);
      const pt = getCanopyPoint(uNorm, vNorm);
      positions.push(pt.x, pt.y, pt.z);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + 1;
      const c = (iv + 1) * (uSegs + 1) + iu;
      const d = c + 1;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshLambertMaterial({
    color: panelColors[i],
    side: THREE.DoubleSide,
    flatShading: true,
  });

  canopyGroup.add(new THREE.Mesh(geometry, material));
}

// Low-Poly Green Bird
const birdGroup = new THREE.Group();
birdGroup.position.set(0, -0.45, 0);
paragliderGroup.add(birdGroup);

const bodyGeo = new THREE.IcosahedronGeometry(0.7, 1);
bodyGeo.scale(0.85, 0.8, 1.15);
birdGroup.add(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true })));

const beakGeo = new THREE.ConeGeometry(0.18, 0.85, 4);
beakGeo.rotateX(-Math.PI / 2);
const beakMesh = new THREE.Mesh(beakGeo, new THREE.MeshLambertMaterial({ color: 0xf1c40f, flatShading: true }));
beakMesh.position.set(0, -0.05, -0.95);
birdGroup.add(beakMesh);

// Eyes
const eyeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
eyeRight.position.set(0.13, 0.19, -0.62);
birdGroup.add(eyeRight);

const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
eyeLeft.position.set(-0.13, 0.19, -0.62);
birdGroup.add(eyeLeft);

// Legs
const legMat = new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true });
const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 4);
const footGeo = new THREE.BoxGeometry(0.1, 0.035, 0.25);

function createLeg(xOffset) {
  const legGrp = new THREE.Group();
  legGrp.position.set(xOffset, -0.45, 0.1);
  const leg = new THREE.Mesh(legGeo, legMat);
  leg.position.y = -0.3;
  const foot = new THREE.Mesh(footGeo, legMat);
  foot.position.set(0, -0.62, -0.08);
  legGrp.add(leg, foot);
  return legGrp;
}
birdGroup.add(createLeg(-0.25));
birdGroup.add(createLeg(0.25));

// Side Rings
const ringMat = new THREE.MeshLambertMaterial({ color: 0x82878d, flatShading: true });
const ringGeo = new THREE.TorusGeometry(0.09, 0.025, 6, 12);

const leftRingGroup = new THREE.Group();
leftRingGroup.position.set(-0.45, 0.15, 0);
const leftRing = new THREE.Mesh(ringGeo, ringMat);
leftRing.rotation.y = Math.PI / 2;
leftRingGroup.add(leftRing);
birdGroup.add(leftRingGroup);

const rightRingGroup = new THREE.Group();
rightRingGroup.position.set(0.45, 0.15, 0);
const rightRing = new THREE.Mesh(ringGeo, ringMat);
rightRing.rotation.y = Math.PI / 2;
rightRingGroup.add(rightRing);
birdGroup.add(rightRingGroup);

// --- 4. Corner Suspension Ropes ---
const canopyRopeAnchors = [
  getCanopyPoint(-1.0, 1.0),
  getCanopyPoint(-1.0, 0.0),
  getCanopyPoint( 1.0, 1.0),
  getCanopyPoint( 1.0, 0.0)
];

const ropeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
const ropeRadius = 0.038;
const ropeCylGeo = new THREE.CylinderGeometry(ropeRadius, ropeRadius, 1, 6);
ropeCylGeo.translate(0, 0.5, 0);
ropeCylGeo.rotateX(Math.PI / 2);

const ropeMeshes = [];
for (let i = 0; i < 4; i++) {
  const ropeMesh = new THREE.Mesh(ropeCylGeo, ropeMat);
  scene.add(ropeMesh);
  ropeMeshes.push(ropeMesh);
}

function updateRopes() {
  const leftRingWorld = new THREE.Vector3();
  const rightRingWorld = new THREE.Vector3();
  leftRingGroup.getWorldPosition(leftRingWorld);
  rightRingGroup.getWorldPosition(rightRingWorld);

  for (let i = 0; i < 4; i++) {
    const canopyWorld = canopyRopeAnchors[i].clone();
    canopyGroup.localToWorld(canopyWorld);
    const birdAnchor = (i < 2) ? leftRingWorld : rightRingWorld;
    const rope = ropeMeshes[i];
    const dist = birdAnchor.distanceTo(canopyWorld);

    rope.position.copy(birdAnchor);
    rope.lookAt(canopyWorld);
    rope.scale.set(1, 1, dist);
  }
}

// --- 5. Navigational 3D Arrow (Points to Next Vortex) ---
const arrowAnchorGroup = new THREE.Group();
scene.add(arrowAnchorGroup);

const arrowMeshGroup = new THREE.Group();
arrowAnchorGroup.add(arrowMeshGroup);

const arrowHeadGeo = new THREE.ConeGeometry(0.55, 1.3, 5);
arrowHeadGeo.rotateX(Math.PI / 2);
const arrowHeadMat = new THREE.MeshBasicMaterial({ color: 0xffe600 });
const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowHeadMat);
arrowHead.position.set(0, 0, 0.7);

const arrowShaftGeo = new THREE.BoxGeometry(0.26, 0.26, 0.9);
const arrowShaftMat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowShaftMat);
arrowShaft.position.set(0, 0, -0.2);

arrowMeshGroup.add(arrowHead, arrowShaft);

// --- 6. GTA Yellow Vortex Checkpoint Rings ---
const vortexGroup = new THREE.Group();
scene.add(vortexGroup);

const vortexWaypoints = [
  new THREE.Vector3(0, 180, 330),
  new THREE.Vector3(-80, 160, 190),
  new THREE.Vector3(-180, 145, 50),
  new THREE.Vector3(-140, 175, -100),
  new THREE.Vector3(-45, 225, -75),
  new THREE.Vector3(65, 190, -125),
  new THREE.Vector3(180, 140, -40),
  new THREE.Vector3(210, 95, 90),
  new THREE.Vector3(130, 115, 235),
  new THREE.Vector3(30, 150, 360),
  new THREE.Vector3(-90, 180, 420),
  new THREE.Vector3(-10, 190, 480)
];

const vortexRings = [];
let currentRingIndex = 0;
let totalScore = 0;

const ringOuterGeo = new THREE.TorusGeometry(8.5, 0.55, 6, 20);
const ringInnerGeo = new THREE.TorusGeometry(7.6, 0.22, 5, 16);

vortexWaypoints.forEach((pos, idx) => {
  const vRing = new THREE.Group();
  vRing.position.copy(pos);

  const outerMat = new THREE.MeshLambertMaterial({
    color: 0xffd700,
    emissive: 0xffb700,
    emissiveIntensity: 0.45,
    flatShading: true,
    side: THREE.DoubleSide
  });
  const outerMesh = new THREE.Mesh(ringOuterGeo, outerMat);

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xffea00,
    wireframe: true,
    transparent: true,
    opacity: 0.65
  });
  const innerMesh = new THREE.Mesh(ringInnerGeo, innerMat);

  const spokesGroup = new THREE.Group();
  for (let s = 0; s < 4; s++) {
    const spokeGeo = new THREE.ConeGeometry(0.7, 2.2, 4);
    spokeGeo.rotateZ(Math.PI);
    const spokeMat = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    const spoke = new THREE.Mesh(spokeGeo, spokeMat);
    const ang = (s / 4) * Math.PI * 2;
    spoke.position.set(Math.cos(ang) * 7.5, Math.sin(ang) * 7.5, 0);
    spoke.rotation.z = ang + Math.PI / 2;
    spokesGroup.add(spoke);
  }

  vRing.add(outerMesh, innerMesh, spokesGroup);
  const nextTarget = vortexWaypoints[(idx + 1) % vortexWaypoints.length];
  vRing.lookAt(nextTarget);

  vortexGroup.add(vRing);
  vortexRings.push({
    group: vRing,
    outerMesh,
    innerMesh,
    spokesGroup,
    pos: pos.clone(),
    radius: 9.2
  });
});

function updateVortexStates(t) {
  const activeRing = vortexRings[currentRingIndex];

  vortexRings.forEach((ring, idx) => {
    ring.innerMesh.rotation.z = -t * 2.8;
    ring.spokesGroup.rotation.z = t * 2.2;

    if (idx === currentRingIndex) {
      const pulse = 1.0 + Math.sin(t * 8.0) * 0.12;
      ring.group.scale.set(pulse, pulse, pulse);
      ring.outerMesh.material.color.setHex(0xffff00);
      ring.outerMesh.material.emissiveIntensity = 0.8;
      ring.group.visible = true;
    } else if (idx === (currentRingIndex + 1) % vortexRings.length) {
      ring.group.scale.set(0.9, 0.9, 0.9);
      ring.outerMesh.material.color.setHex(0xe67e22);
      ring.outerMesh.material.emissiveIntensity = 0.2;
      ring.group.visible = true;
    } else {
      ring.group.scale.set(0.85, 0.85, 0.85);
      ring.outerMesh.material.color.setHex(0xd4ac0d);
      ring.outerMesh.material.emissiveIntensity = 0.1;
      ring.group.visible = true;
    }
  });

  if (activeRing) {
    const arrowPos = flight.pos.clone().add(new THREE.Vector3(0, 3.6, 0));
    arrowAnchorGroup.position.copy(arrowPos);

    arrowMeshGroup.position.y = Math.sin(t * 5.0) * 0.15;
    arrowMeshGroup.rotation.z = Math.sin(t * 3.5) * 0.15;
    arrowAnchorGroup.lookAt(activeRing.pos);

    const dist = Math.round(flight.pos.distanceTo(activeRing.pos));
    const distEl = document.getElementById('dist-val');
    if (distEl) distEl.innerText = `${dist}m`;
  }
}

function triggerRingPassPopup() {
  const popup = document.getElementById('ring-popup');
  if (popup) {
    popup.classList.add('show');
    clearTimeout(popup._timer);
    popup._timer = setTimeout(() => {
      popup.classList.remove('show');
    }, 850);
  }
}

// --- 7. Massive Tropical Island Terrain ---
const islandGroup = new THREE.Group();
scene.add(islandGroup);

const terrainSize = 1400;
const terrainSegs = 90;
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
terrainGeo.rotateX(-Math.PI / 2);

const rockColors = [
  new THREE.Color(0x8a5229),
  new THREE.Color(0x6e4321),
  new THREE.Color(0x54361c),
  new THREE.Color(0x82898f),
  new THREE.Color(0x5c656d),
  new THREE.Color(0xa1aaaf),
  new THREE.Color(0x272b30),
  new THREE.Color(0x191c20)
];
const sandColor = new THREE.Color(0xe5c365);
const lushGreen = new THREE.Color(0x2d8a3e);
const forestGreen = new THREE.Color(0x1e612b);

const posAttr = terrainGeo.attributes.position;
const colors = [];
const vCount = posAttr.count;

for (let i = 0; i < vCount; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  const distFromCenter = Math.hypot(x, z);
  const islandRadius = 380;
  let h = -12;

  if (distFromCenter < islandRadius) {
    const mask = Math.pow(Math.cos((distFromCenter / islandRadius) * (Math.PI / 2)), 1.25);
    const peak1 = Math.exp(-Math.hypot(x + 50, z - 30) / 95) * 220;
    const peak2 = Math.exp(-Math.hypot(x - 90, z + 70) / 110) * 190;
    const peak3 = Math.exp(-Math.hypot(x + 110, z + 90) / 80) * 150;
    const ridges = (Math.sin(x * 0.022) * Math.cos(z * 0.022) * 45) +
                   (Math.sin(x * 0.05 + 1.2) * Math.sin(z * 0.05) * 22);
    h = (peak1 + peak2 + peak3 + ridges + 16) * mask;
  }

  h += (Math.sin(x * 0.15) * Math.cos(z * 0.15)) * 1.5;
  posAttr.setY(i, h);

  const vertexCol = new THREE.Color();
  if (h <= 1.5) {
    vertexCol.copy(sandColor);
  } else if (h <= 10.0) {
    const t = (h - 1.5) / 8.5;
    vertexCol.copy(sandColor).lerp(lushGreen, t * 0.6);
  } else if (h <= 38.0) {
    const t = (h - 10.0) / 28.0;
    vertexCol.copy(lushGreen).lerp(forestGreen, t);
  } else {
    const rockPick = rockColors[Math.floor(Math.abs(Math.sin(x * 12.3 + z * 7.7)) * rockColors.length)];
    const blendFactor = Math.min(1.0, (h - 38.0) / 30.0);
    vertexCol.copy(forestGreen).lerp(rockPick, blendFactor);
  }
  colors.push(vertexCol.r, vertexCol.g, vertexCol.b);
}

terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();

const terrainMesh = new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true
}));
islandGroup.add(terrainMesh);

// Palm Trees
const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 5, 4);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6e4321, flatShading: true });
const leavesGeo = new THREE.ConeGeometry(3.2, 2.0, 5);
const leavesMat = new THREE.MeshLambertMaterial({ color: 0x1f7a31, flatShading: true });

for (let i = 0; i < 90; i++) {
  const angle = Math.random() * Math.PI * 2;
  const rad = 230 + Math.random() * 95;
  const treeGroup = new THREE.Group();
  treeGroup.position.set(Math.cos(angle) * rad, 3.5, Math.sin(angle) * rad);

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 2.5;
  trunk.rotation.z = (Math.random() - 0.5) * 0.25;

  const leaves = new THREE.Mesh(leavesGeo, leavesMat);
  leaves.position.y = 5.0;

  treeGroup.add(trunk, leaves);
  treeGroup.scale.setScalar(0.8 + Math.random() * 0.5);
  islandGroup.add(treeGroup);
}

// Low-Poly Ocean
const oceanGeo = new THREE.PlaneGeometry(3000, 3000, 35, 35);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMesh = new THREE.Mesh(oceanGeo, new THREE.MeshLambertMaterial({
  color: 0x1da2b4,
  transparent: true,
  opacity: 0.88,
  flatShading: true
}));
scene.add(oceanMesh);

// --- 8. Floating Virtual Joystick Module ---
const VirtualJoystick = (function () {
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let maxRadius = 75;

  const vector = { x: 0, y: 0 };
  let joystickEl = null;
  let thumbEl = null;

  function init(options = {}) {
    joystickEl = document.getElementById(options.joystickId || 'virtual-joystick');
    if (joystickEl) {
      thumbEl = joystickEl.querySelector(options.thumbSelector || '.joystick-thumb');
    }
    if (options.maxRadius) maxRadius = options.maxRadius;

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }

  function isInteractiveElement(target) {
    if (!target) return false;
    return !!target.closest('button, select, input, textarea, a, .no-joystick');
  }

  function onPointerDown(e) {
    if (activePointerId !== null) return;
    if (isInteractiveElement(e.target)) return;

    activePointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;

    if (joystickEl) {
      joystickEl.style.left = `${startX}px`;
      joystickEl.style.top = `${startY}px`;
      joystickEl.classList.add('active');
    }

    if (thumbEl) thumbEl.style.transform = 'translate(0px, 0px)';

    vector.x = 0;
    vector.y = 0;
  }

  function onPointerMove(e) {
    if (activePointerId === null || e.pointerId !== activePointerId) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const distance = Math.hypot(deltaX, deltaY);

    if (distance === 0) {
      vector.x = 0;
      vector.y = 0;
      if (thumbEl) thumbEl.style.transform = 'translate(0px, 0px)';
      return;
    }

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(deltaY, deltaX);

    const thumbX = Math.cos(angle) * clampedDist;
    const thumbY = Math.sin(angle) * clampedDist;

    if (thumbEl) thumbEl.style.transform = `translate(${thumbX}px, ${thumbY}px)`;

    const strength = clampedDist / maxRadius;
    vector.x = Math.cos(angle) * strength;
    vector.y = deltaY / maxRadius;
  }

  function onPointerUp(e) {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    activePointerId = null;
    vector.x = 0;
    vector.y = 0;

    if (joystickEl) joystickEl.classList.remove('active');
    if (thumbEl) thumbEl.style.transform = 'translate(0px, 0px)';
  }

  return {
    init,
    getVector: () => vector,
    isActive: () => activePointerId !== null
  };
})();

VirtualJoystick.init({ maxRadius: 70 });

// --- 9. Mobile Mode, Invert Y & Control Listeners ---
let invertY = false;

const keys = {
  ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
  a: false, d: false, w: false, s: false
};

const mobileToggleBtn = document.getElementById('mobile-btn');
const invertToggleBtn = document.getElementById('invert-btn');
const mobileLeftBtn = document.getElementById('mobile-left');
const mobileRightBtn = document.getElementById('mobile-right');
const mobileUpBtn = document.getElementById('mobile-up');
const mobileDownBtn = document.getElementById('mobile-down');
const mobileResetBtn = document.getElementById('mobile-reset');

function toggleInvertY() {
  invertY = !invertY;
  if (invertToggleBtn) {
    invertToggleBtn.classList.toggle('active', invertY);
    invertToggleBtn.innerText = invertY ? '↕ Invert Y: ON' : '↕ Invert Y: OFF';
  }
}

if (invertToggleBtn) {
  invertToggleBtn.addEventListener('click', toggleInvertY);
}

function checkMobileMode() {
  const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  if (isFullscreen || isTouchDevice || window.innerWidth < 800) {
    document.body.classList.add('mobile-mode');
  } else {
    document.body.classList.remove('mobile-mode');
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
}

if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', toggleFullscreen);
window.addEventListener('fullscreenchange', checkMobileMode);
window.addEventListener('webkitfullscreenchange', checkMobileMode);
window.addEventListener('resize', checkMobileMode);
checkMobileMode();

function setupMobileControls() {
  const addControlListener = (element, key) => {
    if (!element) return;
    const press = (e) => {
      if (e.cancelable) e.preventDefault();
      if (key) keys[key] = true;
    };
    const release = (e) => {
      if (e.cancelable) e.preventDefault();
      if (key) keys[key] = false;
    };

    element.addEventListener('pointerdown', press);
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('mouseleave', release);
  };

  addControlListener(mobileLeftBtn, 'ArrowLeft');
  addControlListener(mobileRightBtn, 'ArrowRight');
  addControlListener(mobileUpBtn, 'ArrowUp');
  addControlListener(mobileDownBtn, 'ArrowDown');
  if (mobileResetBtn) {
    mobileResetBtn.addEventListener('pointerdown', (e) => {
      if (e.cancelable) e.preventDefault();
      resetFlight();
    });
  }
}
setupMobileControls();

// --- 10. Flight Kinematics ---
const flight = {
  pos: new THREE.Vector3(0, 185, 480),
  yaw: 0.0,
  pitch: 0.0,
  roll: 0.0,
  speed: 14.0,
  steerX: 0,
  steerPitch: 0
};

const intro = {
  active: true,
  elapsed: 0.0,
  duration: 4.0,
  radius: 10.5,
  height: 2.8
};

function resetFlight() {
  flight.pos.set(0, 185, 480);
  flight.yaw = 0.0;
  flight.pitch = 0.0;
  flight.roll = 0.0;
  flight.speed = 14.0;
  flight.steerX = 0;
  flight.steerPitch = 0;
  intro.active = true;
  intro.elapsed = 0.0;
}

let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (e) => {
  if (!VirtualJoystick.isActive()) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }
});

window.addEventListener('keydown', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = true;
  if (e.key === 'r' || e.key === 'R') resetFlight();
  if (e.key === 'i' || e.key === 'I') toggleInvertY();
});

window.addEventListener('keyup', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = false;
});

// --- 11. Main Render Loop ---
const clock = new THREE.Clock();
const altDisplay = document.getElementById('alt-val');
const spdDisplay = document.getElementById('spd-val');
const ringDisplay = document.getElementById('ring-val');
const scoreDisplay = document.getElementById('score-val');

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  let targetTurn = 0;
  let targetPitch = 0;

  if (VirtualJoystick.isActive()) {
    const joy = VirtualJoystick.getVector();
    targetTurn = joy.x;
    targetPitch = -joy.y * 1.35;
  } else if (keys.ArrowLeft || keys.a || keys.ArrowRight || keys.d ||
             keys.ArrowUp || keys.w || keys.ArrowDown || keys.s) {
    if (keys.ArrowLeft || keys.a) targetTurn -= 1.0;
    if (keys.ArrowRight || keys.d) targetTurn += 1.0;
    if (keys.ArrowUp || keys.w) targetPitch += 1.0;
    if (keys.ArrowDown || keys.s) targetPitch -= 1.0;
  } else {
    targetTurn = mouseX;
    targetPitch = -mouseY; 
  }

  if (invertY) {
    targetPitch = -targetPitch;
  }

  flight.steerX = THREE.MathUtils.lerp(flight.steerX, targetTurn, delta * 3.5);
  flight.steerPitch = THREE.MathUtils.lerp(flight.steerPitch, targetPitch, delta * 3.5);

  // Flight Kinematics
  flight.yaw -= flight.steerX * 0.95 * delta;
  flight.roll = THREE.MathUtils.lerp(flight.roll, -flight.steerX * 0.55, delta * 4.0);

  // Pitch calculation: positive = climb, negative = dive
  const clampedPitchTarget = THREE.MathUtils.clamp(flight.steerPitch * 0.55, -0.65, 0.55);
  flight.pitch = THREE.MathUtils.lerp(flight.pitch, clampedPitchTarget, delta * 3.8);

  const forwardX = -Math.sin(flight.yaw);
  const forwardZ = -Math.cos(flight.yaw);

  const currentAirspeed = flight.speed - (flight.pitch * 5.0);
  flight.pos.x += forwardX * currentAirspeed * delta;
  flight.pos.z += forwardZ * currentAirspeed * delta;

  // Positive pitch climbs up, negative pitch dives down
  const verticalSpeed = (flight.pitch * 16.5) - 0.75; 
  flight.pos.y += verticalSpeed * delta;

  // Floor limit
  if (flight.pos.y < 7.5) flight.pos.y = 7.5;

  // Paraglider Mesh Orientation
  gliderRoot.position.copy(flight.pos);
  gliderRoot.rotation.set(0, flight.yaw, 0, 'YXZ');
  gliderRoot.rotateZ(flight.roll);

  // Leans forwards (nose down) to fly down, leans backwards (nose up) to fly up
  gliderRoot.rotateX(flight.pitch);

  // Paraglider Sway & Physics
  paragliderGroup.position.y = Math.sin(t * 1.8) * 0.08;
  birdGroup.rotation.z = -flight.roll * 0.65 + Math.sin(t * 1.2) * 0.04;
  birdGroup.rotation.x = Math.sin(t * 1.5) * 0.03;
  canopyGroup.scale.y = 1.0 + Math.sin(t * 2.8) * 0.015;

  gliderRoot.updateMatrixWorld(true);
  updateRopes();

  // Check GTA Vortex Ring Hit Collision
  const activeRing = vortexRings[currentRingIndex];
  if (activeRing && flight.pos.distanceTo(activeRing.pos) < activeRing.radius) {
    playRingChime();
    triggerRingPassPopup();

    totalScore += 100;
    currentRingIndex = (currentRingIndex + 1) % vortexRings.length;

    if (scoreDisplay) scoreDisplay.innerText = `${totalScore}`;
    if (ringDisplay) ringDisplay.innerText = `${currentRingIndex + 1} / ${vortexRings.length}`;
  }

  // Update Vortex Checkpoint Visuals and 3D Arrow
  updateVortexStates(t);

  // Ocean Animation
  const oceanPos = oceanGeo.attributes.position;
  for (let i = 0; i < oceanPos.count; i++) {
    const ox = oceanPos.getX(i);
    const oz = oceanPos.getZ(i);
    oceanPos.setY(i, Math.sin(ox * 0.03 + t * 1.2) * Math.cos(oz * 0.03 + t * 0.9) * 0.7);
  }
  oceanPos.needsUpdate = true;

  // Camera Controller
  const standardChaseOffset = new THREE.Vector3(0, 3.2, 10.5);
  standardChaseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), flight.yaw);
  const targetCamPos = flight.pos.clone().add(standardChaseOffset);

  if (intro.active) {
    intro.elapsed += delta;
    const progress = Math.min(intro.elapsed / intro.duration, 1.0);
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const orbitAngle = flight.yaw + Math.PI + (ease * Math.PI * 2);

    const orbitOffset = new THREE.Vector3(
      Math.sin(orbitAngle) * intro.radius,
      intro.height,
      Math.cos(orbitAngle) * intro.radius
    );

    if (progress >= 1.0) {
      intro.active = false;
      camera.position.lerp(targetCamPos, delta * 5.0);
    } else {
      camera.position.copy(flight.pos.clone().add(orbitOffset));
    }
    camera.lookAt(flight.pos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  } else {
    camera.position.lerp(targetCamPos, delta * 4.5);
    const lookAheadPoint = flight.pos.clone().add(
      new THREE.Vector3(forwardX * 20, flight.pitch * 10 - 1.0, forwardZ * 20)
    );
    camera.lookAt(lookAheadPoint);
  }

  // HUD updates
  if (altDisplay && spdDisplay) {
    altDisplay.innerText = `ALT: ${Math.round(flight.pos.y)}m`;
    spdDisplay.innerText = `SPD: ${Math.round(currentAirspeed * 1.8)} km/h`;
  }

  renderer.render(scene, camera);
}

// Window Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize and start flight
resetFlight();
animate();
