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
const ambientLight = new THREE.AmbientLight(0xdcf4ff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff6dd, 1.0);
sunLight.position.set(200, 450, 250);
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x78b8d0, 0.4);
fillLight.position.set(-200, -50, -200);
scene.add(fillLight);

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

// --- 5. Massive Tropical Island Terrain ---
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

// --- 6. Floating Virtual Joystick Module ---
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
    vector.y = -(Math.sin(angle) * strength); // UP is positive (+1.0)
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

// --- 7. Mobile Mode & Control Listeners ---
const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false, a: false, d: false, w: false, s: false };

const mobileToggleBtn = document.getElementById('mobile-btn');
const mobileLeftBtn = document.getElementById('mobile-left');
const mobileRightBtn = document.getElementById('mobile-right');
const mobileUpBtn = document.getElementById('mobile-up');
const mobileResetBtn = document.getElementById('mobile-reset');

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
  const addControlListener = (element, key, onToggle) => {
    if (!element) return;
    const press = (e) => {
      if (e.cancelable) e.preventDefault();
      if (key) keys[key] = true;
      if (onToggle) onToggle(true);
    };
    const release = (e) => {
      if (e.cancelable) e.preventDefault();
      if (key) keys[key] = false;
      if (onToggle) onToggle(false);
    };

    element.addEventListener('pointerdown', press);
    element.addEventListener('pointerup', release);
    element.addEventListener('pointercancel', release);
    element.addEventListener('mouseleave', release);
  };

  addControlListener(mobileLeftBtn, 'ArrowLeft');
  addControlListener(mobileRightBtn, 'ArrowRight');
  addControlListener(mobileUpBtn, 'ArrowUp', (active) => { flight.isBoosting = active; });
  addControlListener(mobileResetBtn, null, (active) => { if (active) resetFlight(); });
}
setupMobileControls();

// --- 8. Flight Kinematics ---
const flight = {
  pos: new THREE.Vector3(0, 185, 480),
  yaw: 0.0,
  pitch: 0.04,
  roll: 0.0,
  speed: 13.5,
  sinkRate: 0.85,
  steerX: 0,
  steerY: 0,
  isBoosting: false
};

const intro = {
  active: true,
  elapsed: 0.0,
  duration: 4.5,
  radius: 10.5,
  height: 2.8
};

function resetFlight() {
  flight.pos.set(0, 185, 480);
  flight.yaw = 0.0;
  flight.pitch = 0.04;
  flight.roll = 0.0;
  flight.steerX = 0;
  flight.steerY = 0;
  intro.active = true;
  intro.elapsed = 0.0;
}

// Mouse steering fallback
let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (e) => {
  if (!VirtualJoystick.isActive()) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  }
});

window.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !e.target.closest('button')) flight.isBoosting = true;
});

window.addEventListener('mouseup', () => {
  flight.isBoosting = false;
});

window.addEventListener('keydown', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = true;
  if (e.key === 'r' || e.key === 'R') resetFlight();
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') flight.isBoosting = true;
});

window.addEventListener('keyup', (e) => {
  if (keys[e.key] !== undefined) keys[e.key] = false;
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') flight.isBoosting = false;
});

// --- 9. Main Render Loop ---
const clock = new THREE.Clock();
const altDisplay = document.getElementById('alt-val');
const spdDisplay = document.getElementById('spd-val');

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  // 1. Steering inputs (Joystick -> On-Screen Buttons/Keys -> Mouse)
  let targetInputX = 0;
  let targetInputY = 0;

  if (VirtualJoystick.isActive()) {
    const joy = VirtualJoystick.getVector();
    targetInputX = joy.x;
    targetInputY = joy.y;
  } else if (keys.ArrowLeft || keys.a || keys.ArrowRight || keys.d || keys.ArrowDown || keys.s) {
    if (keys.ArrowLeft || keys.a) targetInputX -= 1.0;
    if (keys.ArrowRight || keys.d) targetInputX += 1.0;
    if (keys.ArrowDown || keys.s) targetInputY -= 0.8;
  } else {
    targetInputX = mouseX;
    targetInputY = -mouseY;
  }

  flight.steerX = THREE.MathUtils.lerp(flight.steerX, targetInputX, delta * 3.5);
  flight.steerY = THREE.MathUtils.lerp(flight.steerY, targetInputY, delta * 3.5);

  // 2. Flight Kinematics
  flight.yaw -= flight.steerX * 0.95 * delta;
  flight.roll = THREE.MathUtils.lerp(flight.roll, -flight.steerX * 0.55, delta * 4.0);
  flight.pitch = THREE.MathUtils.lerp(flight.pitch, flight.steerY * 0.35, delta * 3.0);

  const forwardX = -Math.sin(flight.yaw);
  const forwardZ = -Math.cos(flight.yaw);

  flight.pos.x += forwardX * flight.speed * delta;
  flight.pos.z += forwardZ * flight.speed * delta;

  const lift = flight.isBoosting ? 9.5 : 0.0;
  flight.pos.y += (flight.pitch * 6.0 - flight.sinkRate + lift) * delta;
  if (flight.pos.y < 8) flight.pos.y = 8;

  gliderRoot.position.copy(flight.pos);
  gliderRoot.rotation.set(0, flight.yaw, 0, 'YXZ');
  gliderRoot.rotateZ(flight.roll);
  gliderRoot.rotateX(-flight.pitch);

  // 3. Paraglider Sway & Physics
  paragliderGroup.position.y = Math.sin(t * 1.8) * 0.08;
  birdGroup.rotation.z = -flight.roll * 0.65 + Math.sin(t * 1.2) * 0.04;
  birdGroup.rotation.x = Math.sin(t * 1.5) * 0.03;
  canopyGroup.scale.y = 1.0 + Math.sin(t * 2.8) * 0.015;

  gliderRoot.updateMatrixWorld(true);
  updateRopes();

  // 4. Ocean Animation
  const oceanPos = oceanGeo.attributes.position;
  for (let i = 0; i < oceanPos.count; i++) {
    const ox = oceanPos.getX(i);
    const oz = oceanPos.getZ(i);
    oceanPos.setY(i, Math.sin(ox * 0.03 + t * 1.2) * Math.cos(oz * 0.03 + t * 0.9) * 0.7);
  }
  oceanPos.needsUpdate = true;

  // 5. Camera Controller
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
    const lookAheadPoint = flight.pos.clone().add(new THREE.Vector3(forwardX * 18, -1.2, forwardZ * 18));
    camera.lookAt(lookAheadPoint);
  }

  // 6. HUD
  if (altDisplay && spdDisplay) {
    altDisplay.innerText = `ALT: ${Math.round(flight.pos.y)}m`;
    spdDisplay.innerText = `SPD: ${Math.round(flight.speed * 1.8)} km/h`;
  }

  renderer.render(scene, camera);
}

// --- 10. Dynamic Window Resize Handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start flight
resetFlight();
animate();
