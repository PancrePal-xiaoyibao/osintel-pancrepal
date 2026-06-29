Build a modern military intelligence dashboard globe similar to War Monitor.

Tech Stack:
- React 18
- TypeScript
- Vite
- React Three Fiber
- Three.js
- @react-three/drei
- TailwindCSS

Design Style:
- Global conflict intelligence platform
- Tactical operations center
- OSINT monitoring system
- Dark military UI
- Intelligence dashboard
- Bloomberg Terminal meets NATO command center

Visual Requirements:

Background:
- Pure black (#000000)
- Subtle procedural fractal noise overlay
- Noise opacity 0.06

Globe:

Create a realistic but stylized Earth.

Do NOT use satellite colors.

Use custom shader rendering.

Ocean Color:
rgb(5,15,20)

Land Low Elevation:
rgb(40,33,23)

Land High Elevation:
rgb(71,61,46)

Use Earth texture only as a luminance mask.

Land detection:

smoothstep(
  0.08,
  0.30,
  luminance
)

Globe Geometry:

SphereGeometry(
  radius: 1,
  widthSegments: 128,
  heightSegments: 128
)

Atmosphere:

Create second sphere:

radius: 1.008

Shader:

fresnel =
pow(
  1 - dot(viewDir, normal),
  4.2
)

Glow Color:

#E8F4FF

Intensity:

0.18

Use additive blending.

Country Borders:

Load world GeoJSON.

Render all borders using LineSegments.

Default Border:

color: #E0E0E0
opacity: 0.14

Selected Country:

opacity: 0.85

Use severity color.

Stars:

Generate procedural stars.

Count:
800

Distance:
12 - 28

Material:

PointsMaterial

opacity: 0.35

size: 0.016

Camera:

PerspectiveCamera

FOV:
45

Initial Position:

latitude: 40
longitude: 45
distance: 2.3

Orbit Controls:

enablePan: false

enableDamping: true

dampingFactor: 0.08

rotateSpeed: 0.15

zoomSpeed: 0.05

minDistance: 1.2

maxDistance: 4

autoRotate: true

autoRotateSpeed: 0.1

Markers:

Render event markers using THREE.Sprite.

Do not use DOM overlays.

Generate labels from CanvasTexture.

Structure:

COUNTRY NAME
|
|
●

Marker Colors:

Severity >= 9

rgb(255,60,50)

Severity >= 7

rgb(245,140,40)

Else

rgb(240,195,60)

Hover Effects:

Increase scale.

Increase opacity.

Show glow pulse.

Hotzones:

Cluster nearby markers.

Create labels:

HOTZONE - N

Use screen-space overlap detection.

Highlight highest severity marker.

Lighting:

Ambient Light:
0.4

Point Light:

position:
[-3,2,-2]

intensity:
8

color:
#2A4A8A

Renderer:

ACES Filmic Tone Mapping

Exposure:
0.82

UI Colors:

Background:
#06080D

Panel:
#0B1119

Card:
#081220

Primary:
#22D3EE

Primary Light:
#67E8F9

Danger:
#FF3C32

Warning:
#F58C28

Low:
#F0C33C

Border:
rgba(34,211,238,0.15)

Typography:

IBM Plex Mono

or

JetBrains Mono

Use uppercase labels.

Use tactical HUD styling.

Animations:

Very subtle.

Everything should feel calm, deliberate and military-grade.

Avoid cyberpunk neon.

Avoid excessive glow.

Avoid gaming aesthetics.

Target:
Professional intelligence operations center.