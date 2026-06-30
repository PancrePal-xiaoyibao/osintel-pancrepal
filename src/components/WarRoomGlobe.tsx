import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Globe, MapPin, Activity } from 'lucide-react';
import { disposeThreeScene, latLonToVector3, type GlobePulse } from '../lib/globe/scene';

const PULSES: GlobePulse[] = [
  { label: 'MD Anderson', lat: 29.7072, lon: -95.3963, color: '#10b981', kind: 'center' },
  { label: 'Heidelberg', lat: 49.4122, lon: 8.6724, color: '#38bdf8', kind: 'center' },
  { label: 'Kyoto', lat: 35.021, lon: 135.7792, color: '#f59e0b', kind: 'trial' },
  { label: 'Shanghai', lat: 31.19, lon: 121.455, color: '#a855f7', kind: 'drug' },
  { label: 'Nutrition', lat: 51.5074, lon: -0.1278, color: '#f97316', kind: 'support' }
];

const STREAM_LOGS = [
  '5-minute cadence online',
  'Center-first evidence ranking',
  'KNOWS fallback ready',
  '24h / 7d / 30d windows mapped'
];

export default function WarRoomGlobe() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [logIndex, setLogIndex] = useState(0);

  const pulses = useMemo(() => PULSES, []);

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
    scene.background = new THREE.Color('#050507');
    scene.fog = new THREE.Fog('#050507', 4, 12);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const globeGeometry = new THREE.SphereGeometry(2.1, 64, 64);
    const globeMaterial = new THREE.MeshStandardMaterial({
      color: '#0d1117',
      roughness: 0.9,
      metalness: 0.05
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    globeGroup.add(globe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(2.18, 64, 64),
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
      })
    );
    globeGroup.add(atmosphere);

    const ambient = new THREE.AmbientLight('#ffffff', 1.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight('#e2e8f0', 1.8);
    key.position.set(4, 2, 6);
    scene.add(key);

    const markerMaterial = new THREE.MeshBasicMaterial({ color: '#38bdf8' });
    const markerGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const markers: THREE.Mesh[] = [];

    pulses.forEach((pulse) => {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
      marker.material.color = new THREE.Color(pulse.color);
      const position = latLonToVector3(pulse.lat, pulse.lon, 2.16);
      marker.position.copy(position);
      marker.lookAt(new THREE.Vector3(0, 0, 0));
      globeGroup.add(marker);
      markers.push(marker);
    });

    const connectCurve = (a: THREE.Vector3, b: THREE.Vector3) => {
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(2.7);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const geometry = new THREE.TubeGeometry(curve, 32, 0.012, 6, false);
      const material = new THREE.MeshBasicMaterial({ color: '#0f766e', transparent: true, opacity: 0.35 });
      const mesh = new THREE.Mesh(geometry, material);
      globeGroup.add(mesh);
    };

    connectCurve(latLonToVector3(49.4122, 8.6724, 2.16), latLonToVector3(29.7072, -95.3963, 2.16));
    connectCurve(latLonToVector3(35.021, 135.7792, 2.16), latLonToVector3(31.19, 121.455, 2.16));

    const pulseRings = pulses.map((pulse) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.15, 20),
        new THREE.MeshBasicMaterial({
          color: pulse.color,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide
        })
      );
      ring.position.copy(latLonToVector3(pulse.lat, pulse.lon, 2.18));
      globeGroup.add(ring);
      return ring;
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
      const fitRadius = 2.7; // sphere (2.1) + atmosphere + pulse rings + margin
      const vFov = THREE.MathUtils.degToRad(camera.fov);
      const distForHeight = fitRadius / Math.tan(vFov / 2);
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
      const distForWidth = fitRadius / Math.tan(hFov / 2);
      camera.position.z = Math.max(distForHeight, distForWidth);

      // Keep the depth fog proportional to the (now adaptive) camera distance
      // so the back of the globe fades nicely without darkening the whole sphere.
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.near = camera.position.z - fitRadius;
        scene.fog.far = camera.position.z + fitRadius * 1.4;
      }

      camera.updateProjectionMatrix();
    };

    // Apply correct aspect ratio immediately so the sphere is not stretched.
    resize();

    // Track the container size (more reliable than window resize for panel layouts).
    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(mount);
    window.addEventListener('resize', resize);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      globeGroup.rotation.y += 0.0045;
      globeGroup.rotation.x = Math.sin(Date.now() * 0.0002) * 0.12;
      atmosphere.rotation.y = globeGroup.rotation.y * 0.7;
      pulseRings.forEach((ring, index) => {
        const scale = 1 + Math.sin(Date.now() * 0.002 + index) * 0.08;
        ring.scale.setScalar(scale);
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
  }, [pulses]);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-mono">
          <Globe className="h-3.5 w-3.5 text-cyan-400" />
          Three.js globe
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-zinc-300">{STREAM_LOGS[logIndex]}</span>
          <span className="text-[10px] text-emerald-400 font-mono">LIVE</span>
        </div>
      </div>
      <div ref={mountRef} className="relative h-[340px] rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,#0f172a_0,#050507_70%)] overflow-hidden">
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-4 text-[10px] text-zinc-500 font-mono">
          <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> center-first</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> 24h / 7d / 30d</span>
        </div>
      </div>
    </div>
  );
}
