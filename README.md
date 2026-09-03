# js_birb_parachute_island

# PARABIRD '96

A small browser-based 3D flight experience inspired by the visual style of PlayStation 1-era games.

**PARABIRD '96 – Tropical Island Flight** puts a low-poly green bird under a colorful paraglider canopy and lets the player fly over a large tropical island and animated ocean.

## Features

- PS1-inspired low-poly 3D graphics
- Tropical island with procedurally shaped terrain
- Low-poly palm trees
- Animated ocean surface
- Colorful five-panel paraglider canopy
- Low-poly tropical bird pilot
- Dynamic suspension ropes connecting the canopy to the bird
- Chase camera with a short introductory camera orbit
- Altitude and speed HUD
- Mouse steering
- Keyboard controls
- Floating virtual joystick for touch devices
- On-screen mobile controls
- Fullscreen mode
- Flight reset functionality
- Responsive window resizing
- Three.js rendering through a CDN

## Controls

### Desktop

| Input | Action |
|---|---|
| Mouse movement | Steer |
| Left mouse button | Thermal lift / boost |
| Arrow Left / A | Turn left |
| Arrow Right / D | Turn right |
| Arrow Down / S | Pitch downward |
| Arrow Up / W / Space | Thermal lift / boost |
| R | Reset flight |

### Touch / Mobile

- **Touch and drag** anywhere outside UI buttons to activate the floating virtual joystick.
- Move the joystick left/right to steer.
- Move the joystick upward to provide lift.
- **▲** provides thermal lift.
- **◀ / ▶** steer left and right.
- **↺** resets the flight.
- Use **📱 Fullscreen** to toggle fullscreen mode.

The interface automatically enables mobile-style controls when a touch device, small viewport, or fullscreen mode is detected.

## Project Structure

The project is designed as a simple static web project:

```text
project/
├── index.html
├── style.css
└── script.js
```

### `index.html`

Contains the page structure, HUD, fullscreen button, mobile controls, and virtual joystick elements. It also loads Three.js and the project's JavaScript and CSS files.

### `style.css`

Defines the fullscreen canvas layout, HUD, mobile controls, virtual joystick appearance, and the tropical green/yellow visual theme.

### `script.js`

Contains the Three.js scene, procedural terrain generation, bird and paraglider models, flight physics, controls, camera system, ocean animation, HUD updates, and render loop.

## Requirements

A modern web browser with WebGL support is required.

The project uses:

- HTML5
- CSS3
- JavaScript
- [Three.js](https://threejs.org/) r128

Three.js is loaded from cdnjs:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
```

An internet connection is normally required when loading the project because Three.js is fetched from the CDN.

## Running the Project

No build system or package installation is required.

Place the files together:

```text
index.html
style.css
script.js
```

Then open `index.html` in a modern browser.

For best compatibility, especially with browser fullscreen and local-file restrictions, you can also run a simple local HTTP server.

### Python

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Flight System

The flight model is intentionally arcade-like rather than a realistic paraglider simulation.

The player starts at approximately:

- Altitude: **185 m**
- Position: **X 0, Y 185, Z 480**
- Flight speed: **13.5 internal units/s**
- Sink rate: **0.85**
- Initial pitch: **0.04**

Steering changes:

- **Yaw** for horizontal turning
- **Roll** for visual banking
- **Pitch** for vertical flight behavior

Holding the boost/lift control adds an additional upward force.

The altitude is limited to a minimum of approximately **8 m**.

## World Generation

The island is generated from a large subdivided plane.

The terrain uses several mathematical functions to create:

- A circular island boundary
- Multiple mountain peaks
- Procedural ridges
- Small-scale terrain variation
- Height-based color zones

Terrain colors transition through:

1. Sand
2. Lush green
3. Forest green
4. Rock

The island is surrounded by a large low-poly animated ocean.

## Visual Style

The project intentionally uses simple geometry and flat shading to create a retro low-poly aesthetic.

Examples include:

- Icosahedron geometry for the bird body
- Cone geometry for the beak
- Box geometry for the eyes and feet
- Low-segment cylinders for legs and palm trunks
- Low-segment cones for palm leaves
- Low-segment torus geometry for the paraglider attachment rings
- Flat-shaded terrain and ocean

The lighting uses ambient and directional lights with a bright tropical color palette.

## Performance

The renderer is configured with:

```javascript
antialias: true
powerPreference: 'high-performance'
```

Device pixel ratio is capped at `1.5` to help prevent excessive rendering cost on high-DPI displays.

The terrain uses a `90 × 90` subdivision grid, while the ocean uses a `35 × 35` grid.

The world contains approximately 90 palm trees.

## Browser Compatibility

The project relies on:

- WebGL
- Pointer Events
- Fullscreen API
- Touch-device detection
- Modern JavaScript
- Three.js r128

Desktop and mobile browsers with modern WebGL support should be able to run it.

Fullscreen support may vary between browsers and devices.

## Credits

Created as a standalone retro-style browser experiment using Three.js.

The project is inspired by:

- PlayStation 1-era low-poly graphics
- Retro flight games
- Tropical arcade aesthetics
- Early 3D console rendering

---

## License

MIT License – free to use, modify, and redistribute.

---
