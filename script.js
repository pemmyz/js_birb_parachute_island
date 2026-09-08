// --- 1. Scene, Dual Cameras, and Renderer Setup ---
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x8cd3eb);
const fogColor = new THREE.Color(0xa7e1f2);
scene.background = skyColor;
scene.fog = new THREE.FogExp2(fogColor, 0.0018);

const SINGLE_FOV = 52;
const SPLIT_FOV = 75;

const camera1 = new THREE.PerspectiveCamera(SINGLE_FOV, window.innerWidth / window.innerHeight, 0.5, 2600);
const camera2 = new THREE.PerspectiveCamera(SPLIT_FOV, (window.innerWidth * 0.5) / window.innerHeight, 0.5, 2600);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setScissorTest(false);
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

// --- Audio Synthesizer ---
let audioCtx = null;
function playRingChime(freqMultiplier = 1.0) {
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
    osc1.frequency.setValueAtTime(587.33 * freqMultiplier, t);
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t);
    osc1.stop(t + 0.18);

    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880 * freqMultiplier, t + 0.08);
    gain2.gain.setValueAtTime(0.25, t + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.4);
  } catch (err) {}
}

function playWinFanfare() {
  playRingChime(1.4);
  setTimeout(() => playRingChime(1.8), 160);
  setTimeout(() => playRingChime(2.2), 320);
}

// --- 3. Paraglider & Bird Generator Factory ---
function getCanopyPoint(uNorm, vNorm) {
  const totalWidth = 4.6;
  const depth = 1.8;
  const x = uNorm * (totalWidth / 2);
  const z = (vNorm - 0.5) * depth;
  const arch = Math.cos(uNorm * Math.PI * 0.45) * 0.45;
  const frontDroop = -Math.pow(1.0 - vNorm, 1.8) * 0.45;
  const rearRise = (vNorm - 0.5) * 0.15;
  return new THREE.Vector3(x, arch + frontDroop + rearRise, z);
}

const canopyRopeAnchors = [
  getCanopyPoint(-1.0, 1.0),
  getCanopyPoint(-1.0, 0.0),
  getCanopyPoint(1.0, 1.0),
  getCanopyPoint(1.0, 0.0)
];

const ropeRadius = 0.038;
const ropeCylGeo = new THREE.CylinderGeometry(ropeRadius, ropeRadius, 1, 6);
ropeCylGeo.translate(0, 0.5, 0);
ropeCylGeo.rotateX(Math.PI / 2);
const ropeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });

function createPlayerGlider(panelColors, birdColor, beakColor) {
  const root = new THREE.Group();
  scene.add(root);

  const paragliderGroup = new THREE.Group();
  root.add(paragliderGroup);

  const canopyGroup = new THREE.Group();
  canopyGroup.position.set(0, 2.3, 0);
  paragliderGroup.add(canopyGroup);

  const numPanels = panelColors.length;
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

    const mat = new THREE.MeshLambertMaterial({
      color: panelColors[i],
      side: THREE.DoubleSide,
      flatShading: true
    });
    canopyGroup.add(new THREE.Mesh(geometry, mat));
  }

  const birdGroup = new THREE.Group();
  birdGroup.position.set(0, -0.45, 0);
  paragliderGroup.add(birdGroup);

  const bodyGeo = new THREE.IcosahedronGeometry(0.7, 1);
  bodyGeo.scale(0.85, 0.8, 1.15);
  birdGroup.add(new THREE.Mesh(bodyGeo, new THREE.MeshLambertMaterial({ color: birdColor, flatShading: true })));

  const beakLength = 0.85;
  const beakRadius = 0.16;
  const beakGeo = new THREE.ConeGeometry(beakRadius, beakLength, 4);
  beakGeo.translate(0, beakLength / 2, 0);
  beakGeo.rotateX(-Math.PI * 0.75);
  beakGeo.computeVertexNormals();
  const beakMesh = new THREE.Mesh(beakGeo, new THREE.MeshLambertMaterial({ color: beakColor, flatShading: true }));
  beakMesh.position.set(0, 0.02, -0.74);
  birdGroup.add(beakMesh);

  const eyeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
  eyeRight.position.set(0.13, 0.19, -0.62);
  birdGroup.add(eyeRight);
  const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
  eyeLeft.position.set(-0.13, 0.19, -0.62);
  birdGroup.add(eyeLeft);

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

  const ropeMeshes = [];
  for (let i = 0; i < 4; i++) {
    const rm = new THREE.Mesh(ropeCylGeo, ropeMat);
    scene.add(rm);
    ropeMeshes.push(rm);
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

  function setVisible(v) {
    root.visible = v;
    arrowAnchor.visible = v;
    ropeMeshes.forEach(r => (r.visible = v));
  }

  const arrowAnchor = new THREE.Group();
  scene.add(arrowAnchor);
  const arrowMeshGroup = new THREE.Group();
  arrowAnchor.add(arrowMeshGroup);

  const arrowHeadGeo = new THREE.ConeGeometry(0.55, 1.3, 5);
  arrowHeadGeo.rotateX(Math.PI / 2);
  arrowHeadGeo.computeVertexNormals();
  const arrowHeadMat = new THREE.MeshLambertMaterial({
    color: 0xffe600,
    emissive: 0x473900,
    flatShading: true
  });
  const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowHeadMat);
  arrowHead.position.set(0, 0, 0.7);

  const arrowShaftGeo = new THREE.BoxGeometry(0.26, 0.26, 0.9);
  const arrowShaftMat = new THREE.MeshLambertMaterial({
    color: 0xf39c12,
    emissive: 0x3d2000,
    flatShading: true
  });
  const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowShaftMat);
  arrowShaft.position.set(0, 0, -0.2);
  arrowMeshGroup.add(arrowHead, arrowShaft);

  return {
    root,
    paragliderGroup,
    canopyGroup,
    birdGroup,
    ropeMeshes,
    updateRopes,
    setVisible,
    arrowAnchor,
    arrowMeshGroup
  };
}

const gliderP1 = createPlayerGlider(
  [0xdc3545, 0xe67e22, 0xf4d03f, 0x2ecc71, 0x1b7a3e],
  0x2e7d32,
  0xf1c40f
);

const gliderP2 = createPlayerGlider(
  [0x8e44ad, 0x9b59b6, 0x3498db, 0x00bcd4, 0xe74c3c],
  0x1976d2,
  0xe67e22
);

// --- 4. GTA Vortex Checkpoint Rings ---
const vortexGroup = new THREE.Group();
scene.add(vortexGroup);

const vortexWaypoints = [
  new THREE.Vector3(0, 180, 330),       // Gate 1 (idx 0)
  new THREE.Vector3(-80, 160, 190),     // Gate 2 (idx 1)
  new THREE.Vector3(-180, 145, 50),     // Gate 3 (idx 2)
  new THREE.Vector3(-140, 175, -100),   // Gate 4 (idx 3)
  new THREE.Vector3(-45, 225, -75),     // Gate 5 (idx 4)
  new THREE.Vector3(65, 190, -125),     // Gate 6 (idx 5)
  new THREE.Vector3(180, 140, -40),     // Gate 7 (idx 6)
  new THREE.Vector3(210, 95, 90),       // Gate 8 (idx 7)
  new THREE.Vector3(130, 115, 235),     // Gate 9 (idx 8)
  new THREE.Vector3(30, 150, 360),      // Gate 10 (idx 9)
  new THREE.Vector3(-90, 180, 420),     // Gate 11 (idx 10)
  new THREE.Vector3(-10, 190, 480)      // Gate 12 (idx 11)
];

const TOTAL_GATES = vortexWaypoints.length;
const vortexRings = [];
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
    opacity: 0.65,
    side: THREE.DoubleSide
  });
  const innerMesh = new THREE.Mesh(ringInnerGeo, innerMat);

  const spokesGroup = new THREE.Group();
  for (let s = 0; s < 4; s++) {
    const spokeGeo = new THREE.ConeGeometry(0.7, 2.2, 4);
    spokeGeo.rotateZ(Math.PI);
    const spokeMat = new THREE.MeshBasicMaterial({ color: 0xffa500, side: THREE.DoubleSide });
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
    radius: 9.4
  });
});

function updateVortexStates(t) {
  vortexRings.forEach((ring) => {
    ring.innerMesh.rotation.z = -t * 2.8;
    ring.spokesGroup.rotation.z = t * 2.2;
    const pulse = 1.0 + Math.sin(t * 6.0) * 0.08;
    ring.group.scale.set(pulse, pulse, pulse);
  });
}

// --- 5. Tropical Terrain, Ocean & Clouds ---
const islandGroup = new THREE.Group();
scene.add(islandGroup);

const terrainSize = 1400;
const terrainSegs = 85;
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
terrainGeo.rotateX(-Math.PI / 2);

function getTerrainHeightAt(x, z) {
  const distFromCenter = Math.hypot(x, z);
  const islandRadius = 380;
  let h = -12;

  if (distFromCenter < islandRadius) {
    const mask = Math.pow(Math.cos((distFromCenter / islandRadius) * (Math.PI / 2)), 1.25);
    const peak1 = Math.exp(-Math.hypot(x + 50, z - 30) / 95) * 220;
    const peak2 = Math.exp(-Math.hypot(x - 90, z + 70) / 110) * 190;
    const ridges = (Math.sin(x * 0.022) * Math.cos(z * 0.022) * 45) +
                   (Math.sin(x * 0.05 + 1.2) * Math.sin(z * 0.05) * 22);
    h = (peak1 + peak2 + ridges + 16) * mask;
  }
  h += (Math.sin(x * 0.15) * Math.cos(z * 0.15)) * 1.5;
  return h;
}

const rockColors = [
  new THREE.Color(0x8a5229), new THREE.Color(0x6e4321),
  new THREE.Color(0x54361c), new THREE.Color(0x82898f),
  new THREE.Color(0x5c656d), new THREE.Color(0x272b30)
];
const sandColor = new THREE.Color(0xe5c365);
const lushGreen = new THREE.Color(0x2d8a3e);
const forestGreen = new THREE.Color(0x1e612b);

const posAttr = terrainGeo.attributes.position;
const colors = [];
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const z = posAttr.getZ(i);
  const h = getTerrainHeightAt(x, z);
  posAttr.setY(i, h);

  const vertexCol = new THREE.Color();
  if (h <= 1.5) {
    vertexCol.copy(sandColor);
  } else if (h <= 10.0) {
    vertexCol.copy(sandColor).lerp(lushGreen, (h - 1.5) / 8.5 * 0.6);
  } else if (h <= 38.0) {
    vertexCol.copy(lushGreen).lerp(forestGreen, (h - 10.0) / 28.0);
  } else {
    const rockPick = rockColors[Math.floor(Math.abs(Math.sin(x * 12.3 + z * 7.7)) * rockColors.length)];
    vertexCol.copy(forestGreen).lerp(rockPick, Math.min(1.0, (h - 38.0) / 30.0));
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

for (let i = 0; i < 80; i++) {
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

// Ocean
const oceanGeo = new THREE.PlaneGeometry(3000, 3000, 30, 30);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMesh = new THREE.Mesh(oceanGeo, new THREE.MeshLambertMaterial({
  color: 0x1da2b4,
  transparent: true,
  opacity: 0.88,
  flatShading: true
}));
scene.add(oceanMesh);

// Procedural See-Through Clouds (Non-Clipping)
const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

function spawnRandomClouds(count = 34) {
  while (cloudGroup.children.length > 0) {
    cloudGroup.remove(cloudGroup.children[0]);
  }

  const puffGeo = new THREE.DodecahedronGeometry(1, 1);
  const cloudMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    flatShading: true
  });

  for (let i = 0; i < count; i++) {
    const cluster = new THREE.Group();
    const dist = 60 + Math.random() * 520;
    const ang = Math.random() * Math.PI * 2;
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;

    // Keep clouds comfortably above terrain to avoid clipping
    const terrainH = getTerrainHeightAt(x, z);
    const altitude = Math.max(terrainH + 35 + Math.random() * 45, 175 + Math.random() * 95);

    cluster.position.set(x, altitude, z);

    const puffs = 4 + Math.floor(Math.random() * 5);
    const clusterScale = 14 + Math.random() * 16;

    for (let p = 0; p < puffs; p++) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.5) * 0.7,
        (Math.random() - 0.5) * 1.8
      );
      puff.scale.set(
        1.0 + Math.random() * 1.4,
        0.6 + Math.random() * 0.5,
        1.0 + Math.random() * 1.2
      );
      cluster.add(puff);
    }

    cluster.scale.setScalar(clusterScale);
    cluster.userData = { driftSpeed: 0.6 + Math.random() * 0.8 };
    cloudGroup.add(cluster);
  }
}

spawnRandomClouds(34);

// --- 6. Floating Virtual Joystick (Player 1 Fallback) ---
const VirtualJoystick = (function () {
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let maxRadius = 65;
  const vector = { x: 0, y: 0 };
  let joystickEl = null;
  let thumbEl = null;

  function init(options = {}) {
    joystickEl = document.getElementById(options.joystickId || 'virtual-joystick');
    if (joystickEl) thumbEl = joystickEl.querySelector('.joystick-thumb');
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
    if (p1GamepadIndex !== null) return; // Suppress touch joystick if P1 gamepad connected
    if ((gameMode === 'race' || gameMode === 'coop') && e.clientX > window.innerWidth * 0.5) return;

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

VirtualJoystick.init({ maxRadius: 65 });

// --- 7. Dual Xbox Controller Pairing & Left Stick Control ---
let p1GamepadIndex = null;
let p2GamepadIndex = null;

const p1StatusEl = document.getElementById('p1-pad-status');
const p2StatusEl = document.getElementById('p2-pad-status');
const p1ControlHint = document.getElementById('p1-control-hint');
const p2ControlInd = document.getElementById('p2-control-indicator');

function updateControlHints() {
  if (p1ControlHint) {
    if (p1GamepadIndex !== null) {
      p1ControlHint.innerText = '🎮 Xbox Left Stick Flight';
    } else if (gameMode === 'single') {
      p1ControlHint.innerText = 'Left Stick / Touch / Mouse / Arrows / WASD';
    } else {
      p1ControlHint.innerText = 'Left Stick / Touch / Mouse / Arrows';
    }
  }

  if (p2ControlInd) {
    if (p2GamepadIndex !== null) {
      p2ControlInd.innerText = '🎮 Xbox Left Stick Flight';
    } else {
      p2ControlInd.innerText = 'Keys WASD (No Pad Connected)';
    }
  }
}

function updateControllerUI() {
  if (p1StatusEl) {
    if (p1GamepadIndex !== null) {
      p1StatusEl.className = 'pad-slot connected p1-connected';
      p1StatusEl.querySelector('.pad-state').innerText = `✓ Xbox Pad [ID: ${p1GamepadIndex}]`;
    } else {
      p1StatusEl.className = 'pad-slot waiting';
      p1StatusEl.querySelector('.pad-state').innerText = 'Press any [A / B / X / Y]';
    }
  }

  if (p2StatusEl) {
    if (p2GamepadIndex !== null) {
      p2StatusEl.className = 'pad-slot connected p2-connected';
      p2StatusEl.querySelector('.pad-state').innerText = `✓ Xbox Pad [ID: ${p2GamepadIndex}]`;
    } else {
      p2StatusEl.className = 'pad-slot waiting';
      p2StatusEl.querySelector('.pad-state').innerText = 'Press any [A / B / X / Y]';
    }
  }

  updateControlHints();
}

function pollGamepadsForPairingAndInput() {
  if (!navigator.getGamepads) return { p1: { x: 0, y: 0, active: false }, p2: { x: 0, y: 0, active: false } };

  const gamepads = navigator.getGamepads();

  // 1. Scan for ABXY buttons (0: A, 1: B, 2: X, 3: Y) to pair controllers
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp || !gp.connected) continue;

    const abxyPressed = (gp.buttons[0] && gp.buttons[0].pressed) ||
                        (gp.buttons[1] && gp.buttons[1].pressed) ||
                        (gp.buttons[2] && gp.buttons[2].pressed) ||
                        (gp.buttons[3] && gp.buttons[3].pressed);

    if (abxyPressed) {
      if (p1GamepadIndex === null && p2GamepadIndex !== i) {
        p1GamepadIndex = i;
        playRingChime(1.2);
        updateControllerUI();
      } else if (p2GamepadIndex === null && p1GamepadIndex !== i) {
        p2GamepadIndex = i;
        playRingChime(1.5);
        updateControllerUI();
      }
    }
  }

  // 2. Read Left Stick with deadzone
  function readLeftStick(gpIndex) {
    if (gpIndex === null) return { x: 0, y: 0, active: false };
    const gp = gamepads[gpIndex];
    if (!gp || !gp.connected) return { x: 0, y: 0, active: false };

    let lx = gp.axes[0] || 0;
    let ly = gp.axes[1] || 0;

    const DEADZONE = 0.18;
    if (Math.abs(lx) < DEADZONE) lx = 0;
    if (Math.abs(ly) < DEADZONE) ly = 0;

    // D-Pad fallback
    if (gp.buttons[14] && gp.buttons[14].pressed) lx = -1.0;
    if (gp.buttons[15] && gp.buttons[15].pressed) lx = 1.0;
    if (gp.buttons[12] && gp.buttons[12].pressed) ly = -1.0;
    if (gp.buttons[13] && gp.buttons[13].pressed) ly = 1.0;

    return { x: lx, y: ly, active: (Math.abs(lx) > 0 || Math.abs(ly) > 0) };
  }

  const p1Stick = readLeftStick(p1GamepadIndex);
  const p2Stick = readLeftStick(p2GamepadIndex);

  return { p1: p1Stick, p2: p2Stick };
}

window.addEventListener('gamepadconnected', updateControllerUI);
window.addEventListener('gamepaddisconnected', (e) => {
  if (p1GamepadIndex === e.gamepad.index) p1GamepadIndex = null;
  if (p2GamepadIndex === e.gamepad.index) p2GamepadIndex = null;
  updateControllerUI();
});

// --- 8. Controls, Modes & State Management ---
let gameMode = 'menu';
let invertPitch = false;
let raceActive = false;
let raceStartTime = 0;
let raceWinner = null;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
}

const keys = {
  ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
  w: false, a: false, s: false, d: false,
  W: false, A: false, S: false, D: false
};

let mouseP1Active = false;
let mouseP1 = { x: 0, y: 0 };
window.addEventListener('mousemove', (e) => {
  if (p1GamepadIndex === null && !VirtualJoystick.isActive()) {
    const maxX = (gameMode === 'race' || gameMode === 'coop') ? window.innerWidth * 0.5 : window.innerWidth;
    if (e.clientX <= maxX) {
      mouseP1Active = true;
      mouseP1.x = (e.clientX / maxX) * 2 - 1;
      mouseP1.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
  }
});

window.addEventListener('keydown', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = true;
  if (e.key === 'r' || e.key === 'R') resetBothPlayers();
  if (e.key === 'i' || e.key === 'I') toggleInvertPitch();
  if (e.key === 'm' || e.key === 'M') openStartMenu();
});

window.addEventListener('keyup', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = false;
});

// UI Elements
const btnModeSingle = document.getElementById('btn-mode-single');
const btnModeRace = document.getElementById('btn-mode-race');
const btnModeCoop = document.getElementById('btn-mode-coop');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const mobileToggleBtn = document.getElementById('mobile-btn');
const invertToggleBtn = document.getElementById('invert-btn');
const resetBtn = document.getElementById('reset-btn');
const p1TagLabel = document.getElementById('p1-tag-label');
const p1RouteHint = document.getElementById('p1-route-hint');
const p2RouteHint = document.getElementById('p2-route-hint');
const raceFinishModal = document.getElementById('race-finish-modal');
const raceWinnerTitle = document.getElementById('race-winner-title');
const raceWinnerSubtitle = document.getElementById('race-winner-subtitle');
const p1FinishTimeEl = document.getElementById('p1-finish-time');
const p2FinishTimeEl = document.getElementById('p2-finish-time');
const btnRematch = document.getElementById('btn-rematch');
const btnBackMenu = document.getElementById('btn-back-menu');

function setGameMode(mode) {
  gameMode = mode;
  document.body.classList.remove('mode-menu', 'mode-single', 'mode-race', 'mode-coop');
  document.body.classList.add(`mode-${mode}`);
  raceFinishModal.classList.remove('active');
  document.getElementById('p1-winner-banner').classList.remove('show');
  document.getElementById('p2-winner-banner').classList.remove('show');

  if (mode === 'single') {
    gliderP2.setVisible(false);
    camera1.fov = SINGLE_FOV;
    camera1.aspect = window.innerWidth / window.innerHeight;
    camera1.updateProjectionMatrix();

    if (p1TagLabel) p1TagLabel.innerText = 'SOLO PILOT';
    if (p1RouteHint) p1RouteHint.innerText = 'Route: Gate 1 ➔ 12 (Forward)';
  } else if (mode === 'coop') {
    gliderP2.setVisible(true);
    camera1.fov = SPLIT_FOV;
    camera2.fov = SPLIT_FOV;
    const halfWidth = window.innerWidth * 0.5;
    camera1.aspect = halfWidth / window.innerHeight;
    camera1.updateProjectionMatrix();
    camera2.aspect = halfWidth / window.innerHeight;
    camera2.updateProjectionMatrix();

    if (p1TagLabel) p1TagLabel.innerText = 'P1 • EMERALD (FORWARD ➔)';
    if (p1RouteHint) p1RouteHint.innerText = 'Route: Gate 1 ➔ 12 (Forward)';
    if (p2RouteHint) p2RouteHint.innerText = 'Route: Gate 12 ➔ 1 (Reverse ⬅)';
  } else if (mode === 'race') {
    gliderP2.setVisible(true);
    camera1.fov = SPLIT_FOV;
    camera2.fov = SPLIT_FOV;
    const halfWidth = window.innerWidth * 0.5;
    camera1.aspect = halfWidth / window.innerHeight;
    camera1.updateProjectionMatrix();
    camera2.aspect = halfWidth / window.innerHeight;
    camera2.updateProjectionMatrix();

    if (p1TagLabel) p1TagLabel.innerText = 'P1 • EMERALD';
    if (p1RouteHint) p1RouteHint.innerText = 'Route: Gate 1 ➔ 12 (Race)';
    if (p2RouteHint) p2RouteHint.innerText = 'Route: Gate 1 ➔ 12 (Race)';
  }

  updateControlHints();
  resetBothPlayers();
}

function openStartMenu() {
  document.body.classList.add('mode-menu');
}

btnModeSingle.addEventListener('click', () => {
  playRingChime(1.0);
  setGameMode('single');
});

btnModeCoop.addEventListener('click', () => {
  playRingChime(1.3);
  setGameMode('coop');
});

btnModeRace.addEventListener('click', () => {
  playRingChime(1.5);
  setGameMode('race');
});

menuToggleBtn.addEventListener('click', openStartMenu);

if (btnRematch) {
  btnRematch.addEventListener('click', () => {
    raceFinishModal.classList.remove('active');
    resetBothPlayers();
  });
}
if (btnBackMenu) {
  btnBackMenu.addEventListener('click', () => {
    raceFinishModal.classList.remove('active');
    openStartMenu();
  });
}

function toggleInvertPitch() {
  invertPitch = !invertPitch;
  if (invertToggleBtn) {
    invertToggleBtn.classList.toggle('active', invertPitch);
    invertToggleBtn.innerText = invertPitch ? '↕ Invert Pitch: ON' : '↕ Invert Pitch: OFF';
  }
}

if (invertToggleBtn) invertToggleBtn.addEventListener('click', toggleInvertPitch);
if (resetBtn) resetBtn.addEventListener('click', resetBothPlayers);

function checkMobileMode() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if (isTouch || window.innerWidth < 800) {
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
window.addEventListener('resize', checkMobileMode);
checkMobileMode();

function setupMobileControls() {
  const addListener = (el, key) => {
    if (!el) return;
    const press = (e) => { if (e.cancelable) e.preventDefault(); keys[key] = true; };
    const release = (e) => { if (e.cancelable) e.preventDefault(); keys[key] = false; };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('mouseleave', release);
  };
  addListener(document.getElementById('mobile-left'), 'ArrowLeft');
  addListener(document.getElementById('mobile-right'), 'ArrowRight');
  addListener(document.getElementById('mobile-up'), 'ArrowUp');
  addListener(document.getElementById('mobile-down'), 'ArrowDown');
}
setupMobileControls();

// --- 9. Flight State Management ---
function createPlayerState() {
  return {
    pos: new THREE.Vector3(0, 185, 480),
    yaw: 0.0,
    pitch: 0.0,
    roll: 0.0,
    speed: 14.0,
    steerX: 0,
    steerPitch: 0,
    gatesCleared: 0,
    currentRingIndex: 0,
    reverseOrder: false,
    score: 0,
    finishTime: null,
    intro: {
      active: true,
      elapsed: 0.0,
      duration: 3.5,
      radius: 10.5,
      height: 2.8
    }
  };
}

const p1 = createPlayerState();
const p2 = createPlayerState();

function resetBothPlayers() {
  p1.pos.set((gameMode === 'race' || gameMode === 'coop') ? -8 : 0, 185, 480);
  p1.yaw = 0.0;
  p1.pitch = 0.0;
  p1.roll = 0.0;
  p1.steerX = 0;
  p1.steerPitch = 0;
  p1.gatesCleared = 0;
  p1.currentRingIndex = 0;
  p1.reverseOrder = false;
  p1.score = 0;
  p1.finishTime = null;
  p1.intro.active = true;
  p1.intro.elapsed = 0.0;

  if (gameMode === 'coop') {
    const lastGate = vortexWaypoints[11];
    const prevGate = vortexWaypoints[10];
    const reverseApproach = new THREE.Vector3().subVectors(prevGate, lastGate).normalize();

    p2.pos.copy(lastGate).sub(reverseApproach.clone().multiplyScalar(70));
    p2.pos.y = 195;
    p2.yaw = Math.atan2(-(lastGate.x - p2.pos.x), -(lastGate.z - p2.pos.z));
    p2.pitch = 0.0;
    p2.roll = 0.0;
    p2.steerX = 0;
    p2.steerPitch = 0;
    p2.gatesCleared = 0;
    p2.currentRingIndex = 11;
    p2.reverseOrder = true;
    p2.score = 0;
    p2.finishTime = null;
    p2.intro.active = true;
    p2.intro.elapsed = 0.0;
  } else {
    p2.pos.set(8, 185, 480);
    p2.yaw = 0.0;
    p2.pitch = 0.0;
    p2.roll = 0.0;
    p2.steerX = 0;
    p2.steerPitch = 0;
    p2.gatesCleared = 0;
    p2.currentRingIndex = 0;
    p2.reverseOrder = false;
    p2.score = 0;
    p2.finishTime = null;
    p2.intro.active = true;
    p2.intro.elapsed = 0.0;
  }

  spawnRandomClouds(34);

  raceActive = true;
  raceStartTime = performance.now();
  raceWinner = null;
  document.getElementById('p1-winner-banner').classList.remove('show');
  document.getElementById('p2-winner-banner').classList.remove('show');
  raceFinishModal.classList.remove('active');
}

function triggerRingPopup(playerId) {
  const popup = document.getElementById(`${playerId}-ring-popup`);
  if (popup) {
    popup.classList.add('show');
    clearTimeout(popup._timer);
    popup._timer = setTimeout(() => popup.classList.remove('show'), 700);
  }
}

function triggerFinishModal(title, subtitle) {
  playWinFanfare();
  raceWinnerTitle.innerText = title;
  raceWinnerSubtitle.innerText = subtitle;
  p1FinishTimeEl.innerText = p1.finishTime !== null ? formatTime(p1.finishTime) : formatTime((performance.now() - raceStartTime) / 1000);
  p2FinishTimeEl.innerText = p2.finishTime !== null ? formatTime(p2.finishTime) : formatTime((performance.now() - raceStartTime) / 1000);
  raceFinishModal.classList.add('active');
}

// --- 10. Physics, Kinematics & Loop Updates ---
const clock = new THREE.Clock();

const p1TimeEl = document.getElementById('p1-time-val');
const p1RingEl = document.getElementById('p1-ring-val');
const p1ScoreEl = document.getElementById('p1-score-val');
const p1DistEl = document.getElementById('p1-dist-val');
const p1AltEl = document.getElementById('p1-alt-val');
const p1SpdEl = document.getElementById('p1-spd-val');

const p2TimeEl = document.getElementById('p2-time-val');
const p2RingEl = document.getElementById('p2-ring-val');
const p2ScoreEl = document.getElementById('p2-score-val');
const p2DistEl = document.getElementById('p2-dist-val');
const p2AltEl = document.getElementById('p2-alt-val');
const p2SpdEl = document.getElementById('p2-spd-val');

function updatePlayerPhysics(player, glider, steerInput, playerId, delta, t) {
  let pitchIntent = steerInput.y;
  if (invertPitch) pitchIntent = -pitchIntent;

  player.steerX = THREE.MathUtils.lerp(player.steerX, steerInput.x, delta * 3.5);
  player.steerPitch = THREE.MathUtils.lerp(player.steerPitch, pitchIntent, delta * 3.5);

  player.yaw -= player.steerX * 0.95 * delta;
  player.roll = THREE.MathUtils.lerp(player.roll, -player.steerX * 0.55, delta * 4.0);

  const clampedPitchTarget = THREE.MathUtils.clamp(player.steerPitch * 0.55, -0.65, 0.55);
  player.pitch = THREE.MathUtils.lerp(player.pitch, clampedPitchTarget, delta * 3.8);

  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);

  const currentAirspeed = player.speed - (player.pitch * 5.0);
  player.pos.x += forwardX * currentAirspeed * delta;
  player.pos.z += forwardZ * currentAirspeed * delta;

  const verticalSpeed = (player.pitch * 16.5) - 0.75;
  player.pos.y += verticalSpeed * delta;

  if (player.pos.y < 7.5) player.pos.y = 7.5;

  glider.root.position.copy(player.pos);
  glider.root.rotation.set(0, player.yaw, 0, 'YXZ');
  glider.root.rotateZ(player.roll);
  glider.root.rotateX(player.pitch);

  glider.paragliderGroup.position.y = Math.sin(t * 1.8 + player.pos.x * 0.1) * 0.08;
  glider.birdGroup.rotation.z = -player.roll * 0.65 + Math.sin(t * 1.2) * 0.04;
  glider.birdGroup.rotation.x = Math.sin(t * 1.5) * 0.03;
  glider.canopyGroup.scale.y = 1.0 + Math.sin(t * 2.8) * 0.015;

  glider.root.updateMatrixWorld(true);
  glider.updateRopes();

  // Gate Detection
  const activeRing = vortexRings[player.currentRingIndex];
  if (activeRing && player.pos.distanceTo(activeRing.pos) < activeRing.radius) {
    playRingChime(player === p1 ? 1.0 : 1.25);
    triggerRingPopup(playerId);
    player.score += 100;
    player.gatesCleared += 1;

    if (player.reverseOrder) {
      player.currentRingIndex = (player.currentRingIndex - 1 + TOTAL_GATES) % TOTAL_GATES;
    } else {
      player.currentRingIndex = (player.currentRingIndex + 1) % TOTAL_GATES;
    }

    if (player.gatesCleared >= TOTAL_GATES && player.finishTime === null) {
      player.finishTime = (performance.now() - raceStartTime) / 1000;

      if (gameMode === 'race') {
        if (!raceWinner) {
          raceWinner = playerId;
          document.getElementById(`${playerId}-winner-banner`).classList.add('show');
          setTimeout(() => {
            triggerFinishModal(
              `${playerId === 'p1' ? 'PLAYER 1 (EMERALD)' : 'PLAYER 2 (SAPPHIRE)'} WINS!`,
              'Fastest island speedway run!'
            );
          }, 1200);
        }
      } else if (gameMode === 'coop') {
        setTimeout(() => {
          triggerFinishModal(
            'CO-OP MISSION COMPLETE! 🎉',
            'Opposite circuit converged! Both pilots conquered the island gates!'
          );
        }, 1200);
      }
    }
  }

  // 3D Directional Arrow pointing to active gate
  if (activeRing) {
    const arrowPos = player.pos.clone().add(new THREE.Vector3(0, 3.6, 0));
    glider.arrowAnchor.position.copy(arrowPos);
    glider.arrowMeshGroup.position.y = Math.sin(t * 5.0 + player.pos.x * 0.2) * 0.15;
    glider.arrowMeshGroup.rotation.z = Math.sin(t * 3.5) * 0.15;
    glider.arrowAnchor.lookAt(activeRing.pos);
  }

  return currentAirspeed;
}

function updatePlayerCamera(camera, player, delta) {
  const forwardX = -Math.sin(player.yaw);
  const forwardZ = -Math.cos(player.yaw);

  const standardChaseOffset = new THREE.Vector3(0, 3.2, 10.5);
  standardChaseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  const targetCamPos = player.pos.clone().add(standardChaseOffset);

  if (player.intro.active) {
    player.intro.elapsed += delta;
    const progress = Math.min(player.intro.elapsed / player.intro.duration, 1.0);
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);
    const orbitAngle = player.yaw + Math.PI + (ease * Math.PI * 2);

    const orbitOffset = new THREE.Vector3(
      Math.sin(orbitAngle) * player.intro.radius,
      player.intro.height,
      Math.cos(orbitAngle) * player.intro.radius
    );

    if (progress >= 1.0) {
      player.intro.active = false;
      camera.position.lerp(targetCamPos, delta * 5.0);
    } else {
      camera.position.copy(player.pos.clone().add(orbitOffset));
    }
    camera.lookAt(player.pos.clone().add(new THREE.Vector3(0, 0.6, 0)));
  } else {
    camera.position.lerp(targetCamPos, delta * 4.5);
    const lookAheadPoint = player.pos.clone().add(
      new THREE.Vector3(forwardX * 20, player.pitch * 10 - 1.0, forwardZ * 20)
    );
    camera.lookAt(lookAheadPoint);
  }
}

// --- 11. Main Animation Loop & Split Viewport Rendering ---
function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  // Poll Xbox Controllers
  const gpInputs = pollGamepadsForPairingAndInput();

  // Drift see-through clouds across sky
  cloudGroup.children.forEach((c) => {
    c.position.x += c.userData.driftSpeed * delta * 2.0;
    if (c.position.x > 700) c.position.x = -700;
  });

  const currentElapsedSecs = (raceStartTime > 0) ? (performance.now() - raceStartTime) / 1000 : 0;
  const timeP1Formatted = formatTime(p1.finishTime !== null ? p1.finishTime : currentElapsedSecs);
  const timeP2Formatted = formatTime(p2.finishTime !== null ? p2.finishTime : currentElapsedSecs);

  // --- Input Priority Hierarchy ---
  // Player 1: Paired Xbox Pad -> Virtual Joystick -> Keyboard (Arrows/WASD) -> Mouse
  const steerP1 = { x: 0, y: 0 };
  const hasArrowKeys = keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown;
  const hasSoloWasd = (gameMode === 'single') && (keys.a || keys.A || keys.d || keys.D || keys.w || keys.W || keys.s || keys.S);

  if (gpInputs.p1.active) {
    steerP1.x = gpInputs.p1.x;
    steerP1.y = -gpInputs.p1.y * 1.25;
  } else if (VirtualJoystick.isActive()) {
    const joy = VirtualJoystick.getVector();
    steerP1.x = joy.x;
    steerP1.y = -joy.y * 1.35;
  } else if (hasArrowKeys) {
    if (keys.ArrowLeft) steerP1.x -= 1.0;
    if (keys.ArrowRight) steerP1.x += 1.0;
    if (keys.ArrowUp) steerP1.y += 1.0;
    if (keys.ArrowDown) steerP1.y -= 1.0;
  } else if (hasSoloWasd) {
    if (keys.a || keys.A) steerP1.x -= 1.0;
    if (keys.d || keys.D) steerP1.x += 1.0;
    if (keys.w || keys.W) steerP1.y += 1.0;
    if (keys.s || keys.S) steerP1.y -= 1.0;
  } else if (mouseP1Active) {
    steerP1.x = mouseP1.x;
    steerP1.y = -mouseP1.y;
  }

  // Player 2: Paired Xbox Pad -> Keyboard (WASD)
  const steerP2 = { x: 0, y: 0 };
  if (gameMode === 'race' || gameMode === 'coop') {
    if (gpInputs.p2.active) {
      steerP2.x = gpInputs.p2.x;
      steerP2.y = -gpInputs.p2.y * 1.25;
    } else {
      if (keys.a || keys.A) steerP2.x -= 1.0;
      if (keys.d || keys.D) steerP2.x += 1.0;
      if (keys.w || keys.W) steerP2.y += 1.0;
      if (keys.s || keys.S) steerP2.y -= 1.0;
    }
  }

  // Physics updates
  const spdP1 = updatePlayerPhysics(p1, gliderP1, steerP1, 'p1', delta, t);
  let spdP2 = 0;
  if (gameMode === 'race' || gameMode === 'coop') {
    spdP2 = updatePlayerPhysics(p2, gliderP2, steerP2, 'p2', delta, t);
  }

  updateVortexStates(t);

  // Ocean wave simulation
  const oceanPos = oceanGeo.attributes.position;
  for (let i = 0; i < oceanPos.count; i++) {
    const ox = oceanPos.getX(i);
    const oz = oceanPos.getZ(i);
    oceanPos.setY(i, Math.sin(ox * 0.03 + t * 1.2) * Math.cos(oz * 0.03 + t * 0.9) * 0.7);
  }
  oceanPos.needsUpdate = true;

  // Camera updates
  updatePlayerCamera(camera1, p1, delta);
  if (gameMode === 'race' || gameMode === 'coop') {
    updatePlayerCamera(camera2, p2, delta);
  }

  // P1 Telemetry
  if (p1TimeEl) p1TimeEl.innerText = timeP1Formatted;
  if (p1RingEl) p1RingEl.innerText = `Gate #${p1.currentRingIndex + 1} (${p1.gatesCleared}/${TOTAL_GATES})`;
  if (p1ScoreEl) p1ScoreEl.innerText = `${p1.score}`;
  if (p1DistEl) p1DistEl.innerText = `${Math.round(p1.pos.distanceTo(vortexRings[p1.currentRingIndex].pos))}m`;
  if (p1AltEl) p1AltEl.innerText = `ALT: ${Math.round(p1.pos.y)}m`;
  if (p1SpdEl) p1SpdEl.innerText = `SPD: ${Math.round(spdP1 * 1.8)} km/h`;

  // P2 Telemetry
  if (gameMode === 'race' || gameMode === 'coop') {
    if (p2TimeEl) p2TimeEl.innerText = timeP2Formatted;
    if (p2RingEl) p2RingEl.innerText = `Gate #${p2.currentRingIndex + 1} (${p2.gatesCleared}/${TOTAL_GATES})`;
    if (p2ScoreEl) p2ScoreEl.innerText = `${p2.score}`;
    if (p2DistEl) p2DistEl.innerText = `${Math.round(p2.pos.distanceTo(vortexRings[p2.currentRingIndex].pos))}m`;
    if (p2AltEl) p2AltEl.innerText = `ALT: ${Math.round(p2.pos.y)}m`;
    if (p2SpdEl) p2SpdEl.innerText = `SPD: ${Math.round(spdP2 * 1.8)} km/h`;
  }

  // Viewport Rendering
  const width = window.innerWidth;
  const height = window.innerHeight;

  if (gameMode === 'race' || gameMode === 'coop') {
    const halfWidth = Math.floor(width * 0.5);

    renderer.setScissorTest(true);

    // Left Screen: Player 1
    renderer.setViewport(0, 0, halfWidth, height);
    renderer.setScissor(0, 0, halfWidth, height);
    camera1.aspect = halfWidth / height;
    camera1.updateProjectionMatrix();
    renderer.render(scene, camera1);

    // Right Screen: Player 2
    renderer.setViewport(halfWidth, 0, width - halfWidth, height);
    renderer.setScissor(halfWidth, 0, width - halfWidth, height);
    camera2.aspect = (width - halfWidth) / height;
    camera2.updateProjectionMatrix();
    renderer.render(scene, camera2);
  } else {
    // Solo Fullscreen
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, width, height);
    camera1.aspect = width / height;
    camera1.updateProjectionMatrix();
    renderer.render(scene, camera1);
  }
}

// Window Resize Handler
window.addEventListener('resize', () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);

  if (gameMode === 'race' || gameMode === 'coop') {
    const halfWidth = width * 0.5;
    camera1.aspect = halfWidth / height;
    camera1.updateProjectionMatrix();
    camera2.aspect = halfWidth / height;
    camera2.updateProjectionMatrix();
  } else {
    camera1.aspect = width / height;
    camera1.updateProjectionMatrix();
  }
});

// Launch on Menu
setGameMode('menu');
animate();
