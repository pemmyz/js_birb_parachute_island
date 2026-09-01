// --- START OF FILE script.js ---

// --- 1. Scene, Camera, and Renderer Setup ---
const container = document.getElementById('canvas-container');

const scene = new THREE.Scene();
const skyColor = new THREE.Color(0x8cd3eb); // Retro tropical sky
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

// --- 2. Tropical Sun & PS1 Lighting ---
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

// Root container for idle physics and sway
const paragliderGroup = new THREE.Group();
gliderRoot.add(paragliderGroup);

// --- Parachute Canopy (5 Segments) ---
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

// Function for curved parachute surface
function getCanopyPoint(uNorm, vNorm) {
  const x = uNorm * (totalWidth / 2);
  const z = (vNorm - 0.5) * depth;
  const arch = Math.cos(uNorm * Math.PI * 0.45) * 0.45;
  const frontDroop = -Math.pow(1.0 - vNorm, 1.8) * 0.45;
  const rearRise = (vNorm - 0.5) * 0.15;
  const y = arch + frontDroop + rearRise;
  return new THREE.Vector3(x, y, z);
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

  const panelMesh = new THREE.Mesh(geometry, material);
  canopyGroup.add(panelMesh);
}

// --- Low-Poly Green Bird with Big Close Eyes & Grey Side Rings ---
const birdGroup = new THREE.Group();
birdGroup.position.set(0, -0.45, 0);
paragliderGroup.add(birdGroup);

// Body
const bodyGeo = new THREE.IcosahedronGeometry(0.7, 1);
bodyGeo.scale(0.85, 0.8, 1.15); // Stretched along -Z for flight streamline
const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true });
const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
birdGroup.add(bodyMesh);

// Yellow Beak pointing forward (-Z)
const beakGeo = new THREE.ConeGeometry(0.18, 0.85, 4);
beakGeo.rotateX(-Math.PI / 2);
const beakMat = new THREE.MeshLambertMaterial({ color: 0xf1c40f, flatShading: true });
const beakMesh = new THREE.Mesh(beakGeo, beakMat);
beakMesh.position.set(0, -0.05, -0.95);
birdGroup.add(beakMesh);

// Symmetrical Dual Black Eyes - 2x Bigger and Closer Together
const eyeGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

// Right Eye
const eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
eyeRight.position.set(0.13, 0.19, -0.62);
birdGroup.add(eyeRight);

// Left Eye
const eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
eyeLeft.position.set(-0.13, 0.19, -0.62);
birdGroup.add(eyeLeft);

// Legs & Feet
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

// Grey Rings on both sides of the bird where ropes attach
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

// --- 4. 5px-Wide Suspension Ropes to the 4 Canopy Corners ---
const canopyRopeAnchors = [
  getCanopyPoint(-1.0, 1.0), // Left Rear Corner
  getCanopyPoint(-1.0, 0.0), // Left Front Corner
  getCanopyPoint( 1.0, 1.0), // Right Rear Corner
  getCanopyPoint( 1.0, 0.0)  // Right Front Corner
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

// --- 5. Massive Tropical Island with Huge Rocky Mountains & Beaches ---
const islandGroup = new THREE.Group();
scene.add(islandGroup);

const terrainSize = 1400;
const terrainSegs = 90;
const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
terrainGeo.rotateX(-Math.PI / 2);

// Variety of rock colors: Browns, Greys, and Charcoal/Blacks
const rockColors = [
  new THREE.Color(0x8a5229), // Warm Sienna Brown
  new THREE.Color(0x6e4321), // Deep Umber Brown
  new THREE.Color(0x54361c), // Dark Cocoa
  new THREE.Color(0x82898f), // Slate Grey
  new THREE.Color(0x5c656d), // Dark Granite Grey
  new THREE.Color(0xa1aaaf), // Pale Limestone Grey
  new THREE.Color(0x272b30), // Charcoal Black Rock
  new THREE.Color(0x191c20)  // Obsidian Black
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

  let h = -12; // Base underwater depth

  if (distFromCenter < islandRadius) {
    const mask = Math.pow(Math.cos((distFromCenter / islandRadius) * (Math.PI / 2)), 1.25);
    
    // Mountain ridges and jagged peaks
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
    vertexCol.copy(sandColor); // Shoreline Sand
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

const terrainMat = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true
});
const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
islandGroup.add(terrainMesh);

// Scattered Palm Trees along the beaches
const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 5, 4);
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6e4321, flatShading: true });
const leavesGeo = new THREE.ConeGeometry(3.2, 2.0, 5);
const leavesMat = new THREE.MeshLambertMaterial({ color: 0x1f7a31, flatShading: true });

for (let i = 0; i < 90; i++) {
  const angle = Math.random() * Math.PI * 2;
  const rad = 230 + Math.random() * 95;
  const px = Math.cos(angle) * rad;
  const pz = Math.sin(angle) * rad;

  const treeGroup = new THREE.Group();
  treeGroup.position.set(px, 3.5, pz);

  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 2.5;
  trunk.rotation.z = (Math.random() - 0.5) * 0.25;

  const leaves = new THREE.Mesh(leavesGeo, leavesMat);
  leaves.position.y = 5.0;

  treeGroup.add(trunk, leaves);
  treeGroup.scale.setScalar(0.8 + Math.random() * 0.5);
  islandGroup.add(treeGroup);
}

// Low-Poly Tropical Ocean
const oceanGeo = new THREE.PlaneGeometry(3000, 3000, 35, 35);
oceanGeo.rotateX(-Math.PI / 2);
const oceanMat = new THREE.MeshLambertMaterial({
  color: 0x1da2b4,
  transparent: true,
  opacity: 0.88,
  flatShading: true
});
const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
oceanMesh.position.y = 0;
scene.add(oceanMesh);

// --- 6. Flight Mechanics & Smooth Mouse Drag Steering ---
const flight = {
  pos: new THREE.Vector3(0, 185, 480), // Starts way up high above water
  yaw: 0.0,                            // 0.0 = Facing forward into -Z (DIRECTLY towards island at 0,0,0)
  pitch: 0.04,                         // Slight natural glide pitch
  roll: 0.0,
  speed: 13.5,                         // Low, relaxed cruising speed
  sinkRate: 0.85,                      // Gentle descent
  steerX: 0,                           // -1 (left) to +1 (right)
  steerY: 0,                           // -1 (down) to +1 (up)
  isBoosting: false
};

// Camera Intro State (360-degree pan around bird before switching to chase view)
const intro = {
  active: true,
  elapsed: 0.0,
  duration: 4.5, // 4.5 seconds for a complete scenic 360-degree orbit
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

// Mouse Steering Input Listener
let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

window.addEventListener('mousedown', (e) => {
  if (e.button === 0) flight.isBoosting = true;
});

window.addEventListener('mouseup', () => {
  flight.isBoosting = false;
});

// Touch support for mobile dragging
window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    mouseX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
  }
});

// Quick reset button
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    resetFlight();
  }
});

// --- 7. Main Animation & Render Loop ---
const clock = new THREE.Clock();
const altDisplay = document.getElementById('alt-val');
const spdDisplay = document.getElementById('spd-val');

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.1);
  const t = clock.getElapsedTime();

  // 1. Mouse Input Response (Smooth Lerping)
  flight.steerX = THREE.MathUtils.lerp(flight.steerX, mouseX, delta * 3.5);
  flight.steerY = THREE.MathUtils.lerp(flight.steerY, -mouseY, delta * 3.5);

  // 2. Flight Kinematics
  const turnRate = flight.steerX * 0.95;
  flight.yaw -= turnRate * delta;

  const targetRoll = -flight.steerX * 0.55;
  flight.roll = THREE.MathUtils.lerp(flight.roll, targetRoll, delta * 4.0);

  const targetPitch = flight.steerY * 0.35;
  flight.pitch = THREE.MathUtils.lerp(flight.pitch, targetPitch, delta * 3.0);

  // Forward velocity vector along yaw (yaw 0 = -Z, toward island)
  const forwardX = -Math.sin(flight.yaw);
  const forwardZ = -Math.cos(flight.yaw);

  flight.pos.x += forwardX * flight.speed * delta;
  flight.pos.z += forwardZ * flight.speed * delta;

  // Gentle altitude descent with thermal lift option
  const lift = flight.isBoosting ? 9.0 : 0.0;
  flight.pos.y += (flight.pitch * 6.0 - flight.sinkRate + lift) * delta;

  // Prevent crashing beneath water; gentle automatic updraft near surface
  if (flight.pos.y < 8) flight.pos.y = 8;

  // Apply positions and rotations to Glider assembly
  gliderRoot.position.copy(flight.pos);
  gliderRoot.rotation.set(0, flight.yaw, 0, 'YXZ');
  gliderRoot.rotateZ(flight.roll);
  gliderRoot.rotateX(-flight.pitch);

  // 3. Dynamic Paraglider Idle Sway & Pendulum Physics
  paragliderGroup.position.y = Math.sin(t * 1.8) * 0.08;
  birdGroup.rotation.z = -flight.roll * 0.65 + Math.sin(t * 1.2) * 0.04;
  birdGroup.rotation.x = Math.sin(t * 1.5) * 0.03;
  canopyGroup.scale.y = 1.0 + Math.sin(t * 2.8) * 0.015;

  // Ensure world matrix is updated before calculating world-space rope anchors
  gliderRoot.updateMatrixWorld(true);

  // 4. Update the 4 Corner Suspension Ropes
  updateRopes();

  // 5. Gentle Ocean Ripple Animation
  const oceanPos = oceanGeo.attributes.position;
  for (let i = 0; i < oceanPos.count; i++) {
    const ox = oceanPos.getX(i);
    const oz = oceanPos.getZ(i);
    oceanPos.setY(i, Math.sin(ox * 0.03 + t * 1.2) * Math.cos(oz * 0.03 + t * 0.9) * 0.7);
  }
  oceanPos.needsUpdate = true;

  // 6. Camera Controller: 360° Intro Pan -> Smooth Chase Cam Transition
  const standardChaseOffset = new THREE.Vector3(0, 3.2, 10.5);
  standardChaseOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), flight.yaw);
  const targetCamPos = flight.pos.clone().add(standardChaseOffset);

  if (intro.active) {
    intro.elapsed += delta;
    const progress = Math.min(intro.elapsed / intro.duration, 1.0);
    
    // Smooth ease in-out curve
    const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

    // Orbit 360 degrees around to the back
    const orbitAngle = flight.yaw + Math.PI + (ease * Math.PI * 2);

    const orbitOffset = new THREE.Vector3(
      Math.sin(orbitAngle) * intro.radius,
      intro.height,
      Math.cos(orbitAngle) * intro.radius
    );

    const introCamPos = flight.pos.clone().add(orbitOffset);

    if (progress >= 1.0) {
      intro.active = false;
      camera.position.lerp(targetCamPos, delta * 5.0);
    } else {
      camera.position.copy(introCamPos);
    }

    const lookTarget = flight.pos.clone().add(new THREE.Vector3(0, 0.6, 0));
    camera.lookAt(lookTarget);

  } else {
    // Normal Third-Person Chase Cam
    camera.position.lerp(targetCamPos, delta * 4.5);

    const lookAheadPoint = flight.pos.clone().add(
      new THREE.Vector3(forwardX * 18, -1.2, forwardZ * 18)
    );
    camera.lookAt(lookAheadPoint);
  }

  // 7. Update HUD
  if (altDisplay && spdDisplay) {
    altDisplay.innerText = `ALT: ${Math.round(flight.pos.y)}m`;
    spdDisplay.innerText = `SPD: ${Math.round(flight.speed * 1.8)} km/h`;
  }

  renderer.render(scene, camera);
}

// --- 8. Window Resize Handler ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start flight!
resetFlight();
animate();
