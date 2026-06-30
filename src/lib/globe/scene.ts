import * as THREE from 'three';

export type GlobePulse = {
  label: string;
  lat: number;
  lon: number;
  color: string;
  kind: 'center' | 'trial' | 'drug' | 'support';
};

export type GeoPoint = { lat: number; lon: number };

export function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Simplified continent outlines (lat/lon). Stylized — meant as a geographic
 * reference on the globe, not a precise coastline.
 */
export const CONTINENT_OUTLINES: GeoPoint[][] = [
  // North America
  [
    { lat: 71, lon: -156 }, { lat: 70, lon: -128 }, { lat: 69, lon: -95 },
    { lat: 67, lon: -82 }, { lat: 60, lon: -64 }, { lat: 47, lon: -52 },
    { lat: 45, lon: -66 }, { lat: 40, lon: -74 }, { lat: 31, lon: -81 },
    { lat: 25, lon: -80 }, { lat: 25, lon: -97 }, { lat: 20, lon: -105 },
    { lat: 23, lon: -110 }, { lat: 33, lon: -118 }, { lat: 40, lon: -124 },
    { lat: 48, lon: -125 }, { lat: 58, lon: -135 }, { lat: 60, lon: -148 },
    { lat: 71, lon: -156 }
  ],
  // South America
  [
    { lat: 11, lon: -72 }, { lat: 10, lon: -61 }, { lat: 5, lon: -52 },
    { lat: -2, lon: -44 }, { lat: -13, lon: -38 }, { lat: -23, lon: -41 },
    { lat: -34, lon: -54 }, { lat: -41, lon: -62 }, { lat: -52, lon: -69 },
    { lat: -55, lon: -71 }, { lat: -42, lon: -74 }, { lat: -18, lon: -70 },
    { lat: -5, lon: -81 }, { lat: 2, lon: -79 }, { lat: 8, lon: -77 },
    { lat: 11, lon: -72 }
  ],
  // Africa
  [
    { lat: 37, lon: 10 }, { lat: 33, lon: 22 }, { lat: 31, lon: 33 },
    { lat: 16, lon: 39 }, { lat: 11, lon: 43 }, { lat: 2, lon: 42 },
    { lat: -10, lon: 40 }, { lat: -26, lon: 33 }, { lat: -34, lon: 26 },
    { lat: -34, lon: 18 }, { lat: -18, lon: 12 }, { lat: -6, lon: 9 },
    { lat: 4, lon: 9 }, { lat: 5, lon: -4 }, { lat: 11, lon: -16 },
    { lat: 21, lon: -17 }, { lat: 31, lon: -9 }, { lat: 37, lon: 10 }
  ],
  // Europe
  [
    { lat: 60, lon: -9 }, { lat: 64, lon: 11 }, { lat: 71, lon: 26 },
    { lat: 65, lon: 40 }, { lat: 55, lon: 38 }, { lat: 45, lon: 38 },
    { lat: 41, lon: 28 }, { lat: 37, lon: 24 }, { lat: 38, lon: 15 },
    { lat: 36, lon: -6 }, { lat: 44, lon: -9 }, { lat: 49, lon: -5 },
    { lat: 60, lon: -9 }
  ],
  // Asia
  [
    { lat: 55, lon: 38 }, { lat: 68, lon: 55 }, { lat: 76, lon: 100 },
    { lat: 73, lon: 140 }, { lat: 62, lon: 162 }, { lat: 60, lon: 142 },
    { lat: 48, lon: 135 }, { lat: 39, lon: 124 }, { lat: 30, lon: 122 },
    { lat: 22, lon: 109 }, { lat: 9, lon: 100 }, { lat: 8, lon: 78 },
    { lat: 20, lon: 70 }, { lat: 25, lon: 60 }, { lat: 30, lon: 48 },
    { lat: 40, lon: 49 }, { lat: 47, lon: 47 }, { lat: 55, lon: 38 }
  ],
  // Australia
  [
    { lat: -12, lon: 131 }, { lat: -11, lon: 142 }, { lat: -20, lon: 149 },
    { lat: -28, lon: 153 }, { lat: -38, lon: 150 }, { lat: -39, lon: 144 },
    { lat: -35, lon: 137 }, { lat: -32, lon: 116 }, { lat: -22, lon: 114 },
    { lat: -16, lon: 123 }, { lat: -14, lon: 127 }, { lat: -12, lon: 131 }
  ]
];

/** Densify a lat/lon polyline and project every vertex onto the sphere. */
export function buildSurfacePoints(
  points: GeoPoint[],
  radius: number,
  segmentsPerEdge = 8
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    for (let s = 0; s < segmentsPerEdge; s += 1) {
      const t = s / segmentsPerEdge;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lon = a.lon + (b.lon - a.lon) * t;
      out.push(latLonToVector3(lat, lon, radius));
    }
  }
  const last = points[points.length - 1];
  out.push(latLonToVector3(last.lat, last.lon, radius));
  return out;
}

/** Build a lat/lon graticule (meridians + parallels) as line segments. */
export function buildGraticule(radius: number): THREE.BufferGeometry {
  const verts: number[] = [];
  const pushSeg = (latA: number, lonA: number, latB: number, lonB: number) => {
    const p1 = latLonToVector3(latA, lonA, radius);
    const p2 = latLonToVector3(latB, lonB, radius);
    verts.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  };
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -80; lat < 80; lat += 5) pushSeg(lat, lon, lat + 5, lon);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += 5) pushSeg(lat, lon, lat, lon + 5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  return geo;
}

export function disposeThreeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((entry) => entry.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

