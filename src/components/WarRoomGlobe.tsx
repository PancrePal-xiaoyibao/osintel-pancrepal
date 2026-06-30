import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Globe, MapPin, Activity, Share2 } from 'lucide-react';
import {
  disposeThreeScene,
  latLonToVector3,
  buildGraticule,
  buildSurfacePoints,
  CONTINENT_OUTLINES,
  type GlobePulse
} from '../lib/globe/scene';

// Major pancreatic-cancer centres / trial hubs around the world.
const HOSPITAL_NODES: GlobePulse[] = [
  { label: 'MD Anderson (Houston)', lat: 29.7072, lon: -95.3963, color: '#10b981', kind: 'center' },
  { label: 'MSKCC (New York)', lat: 40.7644, lon: -73.9566, color: '#10b981', kind: 'center' },
  { label: 'Mayo Clinic (Rochester)', lat: 44.0225, lon: -92.4669, color: '#34d399', kind: 'center' },
  { label: 'Johns Hopkins (Baltimore)', lat: 39.2966, lon: -76.5929, color: '#34d399', kind: 'center' },
  { label: 'Gustave Roussy (Paris)', lat: 48.7758, lon: 2.3528, color: '#38bdf8', kind: 'trial' },
  { label: 'Heidelberg (Germany)', lat: 49.4122, lon: 8.6724, color: '#38bdf8', kind: 'center' },
  { label: 'Royal Marsden (London)', lat: 51.4905, lon: -0.1773, color: '#f97316', kind: 'support' },
  { label: 'IRCCS (Milan)', lat: 45.4642, lon: 9.19, color: '#38bdf8', kind: 'trial' },
  { label: 'NCC (Tokyo)', lat: 35.6655, lon: 139.7626, color: '#f59e0b', kind: 'trial' },
  { label: 'Samsung Medical (Seoul)', lat: 37.4881, lon: 127.0856, color: '#f59e0b', kind: 'trial' },
  { label: 'Fudan (Shanghai)', lat: 31.19, lon: 121.455, color: '#a855f7', kind: 'drug' },
  { label: 'Peter Mac (Melbourne)', lat: -37.8009, lon: 144.9568, color: '#f97316', kind: 'support' }
];

// Connection arcs (index pairs into HOSPITAL_NODES) forming a collaboration web.
const LINKS: Array<[number, number]> = [
  [0, 1], [0, 2], [0, 3], [0, 5], [1, 5], [3, 5],
  [5, 4], [5, 7], [4, 6], [5, 8], [8, 9], [8, 10],
  [10, 11], [9, 11], [0, 10], [5, 8]
];

const STREAM_LOGS = [
  '5-minute cadence online',
  'Center-first evidence ranking',
  'KNOWS fallback ready',
  '24h / 7d / 30d windows mapped',
  '12 global centres linked'
];

const GLOBE_RADIUS = 2.1;

export default function WarRoomGlobe() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [logIndex, setLogIndex] = useState(0);

  const nodes = useMemo(() => HOSPITAL_NODES, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setLogIndex((prev) => (prev + 1) % STREAM_LOGS.length);
    }, 2500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.Fog('#050507', 4, 12);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Ocean sphere — a deep blue so the continent lines read as land.
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.MeshStandardMaterial({ color: '#0b2436', roughness: 0.85, metalness: 0.1 })
    );
    globeGroup.add(globe);

    // Glowing atmosphere halo.
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS + 0.08, 64, 64),
      new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.1, side: THREE.BackSide })
    );
    globeGroup.add(atmosphere);

    // Lat/lon graticule for geographic reference.
    const graticule = new THREE.LineSegments(
      buildGraticule(GLOBE_RADIUS + 0.004),
      new THREE.LineBasicMaterial({ color: '#1f4257', transparent: true, opacity: 0.45 })
    );
    globeGroup.add(graticule);

    // Continent outlines drawn on the surface.
    const continentMaterial = new THREE.LineBasicMaterial({
      color: '#5eead4',
      transparent: true,
      opacity: 0.85
    });
    CONTINENT_OUTLINES.forEach((outline) => {
      const points = buildSurfacePoints(outline, GLOBE_RADIUS + 0.012, 10);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      globeGroup.add(new THREE.Line(geometry, continentMaterial));
    });

    const ambient = new THREE.AmbientLight('#ffffff', 1.1);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#e2e8f0', 1.6);
    key.position.set(4, 2, 6);
    scene.add(key);

    // Hospital node markers + glowing pulse rings.
    const markerGeometry = new THREE.SphereGeometry(0.035, 14, 14);
    const haloGeometry = new THREE.SphereGeometry(0.06, 14, 14);
    const pulseRings: THREE.Mesh[] = [];

    nodes.forEach((node) => {
      const color = new THREE.Color(node.color);
      const position = latLonToVector3(node.lat, node.lon, GLOBE_RADIUS + 0.02);

      const marker = new THREE.Mesh(
        markerGeometry,
        new THREE.MeshBasicMaterial({ color })
      );
      marker.position.copy(position);
      globeGroup.add(marker);

      const halo = new THREE.Mesh(
        haloGeometry,
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25 })
      );
      halo.position.copy(position);
      globeGroup.add(halo);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.07, 0.12, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
      );
      ring.position.copy(latLonToVector3(node.lat, node.lon, GLOBE_RADIUS + 0.04));
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(ring);
      pulseRings.push(ring);
    });

    // Connection arcs between centres, each with a traveling pulse dot.
    const arcMaterial = new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.3 });
    const travelers: Array<{ curve: THREE.QuadraticBezierCurve3; dot: THREE.Mesh; offset: number }> = [];
    const dotGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const dotMaterial = new THREE.MeshBasicMaterial({ color: '#a5f3fc' });

    LINKS.forEach(([from, to], index) => {
      const a = latLonToVector3(nodes[from].lat, nodes[from].lon, GLOBE_RADIUS + 0.02);
      const b = latLonToVector3(nodes[to].lat, nodes[to].lon, GLOBE_RADIUS + 0.02);
      const dist = a.distanceTo(b);
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS + 0.2 + dist * 0.25);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const tube = new THREE.TubeGeometry(curve, 40, 0.006, 6, false);
      globeGroup.add(new THREE.Mesh(tube, arcMaterial));

      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      globeGroup.add(dot);
      travelers.push({ curve, dot, offset: index / LINKS.length });
    });

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      camera.aspect = aspect;

      // Pull the camera back far enough that the whole globe fits, even in a
      // narrow portrait panel where the horizontal field of view is the limit.
      const fitRadius = 2.7;
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const distForHeight = fitRadius / Math.tan(vFov / 2);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const distForWidth = fitRadius / Math.tan(hFov / 2);
      camera.position.z = Math.max(distForHeight, distForWidth);

      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = camera.position.z - fitRadius;
        scene.fog.far = camera.position.z + fitRadius * 1.4;
      }

      camera.updateProjectionMatrix();
    };

    resize();

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(mount);
    window.addEventListener('resize', resize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = Date.now();
      globeGroup.rotation.y += 0.0042;
      globeGroup.rotation.x = Math.sin(now * 0.0002) * 0.1;
      atmosphere.rotation.y = globeGroup.rotation.y * 0.7;

      pulseRings.forEach((ring, index) => {
        const scale = 1 + Math.sin(now * 0.002 + index) * 0.12;
        ring.scale.setScalar(scale);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.18 + Math.abs(Math.sin(now * 0.002 + index)) * 0.25;
      });

      travelers.forEach((traveler) => {
        const t = (now * 0.00012 + traveler.offset) % 1;
        traveler.dot.position.copy(traveler.curve.getPoint(t));
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      disposeThreeScene(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [nodes]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
          <Globe className="h-3.5 w-3.5 text-cyan-400" />
          Global centre network
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-zinc-300">{STREAM_LOGS[logIndex]}</span>
          <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
        </div>
      </div>
      <div ref={mountRef} className="relative h-[340px] rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,#0f172a_0,#050507_70%)] overflow-hidden">
        <div className="absolute inset-x-0 top-3 flex items-center justify-center gap-3 px-4 text-[9px] text-zinc-400 font-mono">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Center</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Trial</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Drug</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> Support</span>
        </div>
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-4 text-[10px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {LINKS.length} links</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {HOSPITAL_NODES.length} centres</span>
          <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> 24h / 7d / 30d</span>
        </div>
      </div>
    </div>
  );
}
