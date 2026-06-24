import React, { useState, useEffect, useRef } from 'react';
import { Radio, Terminal, Loader2 } from 'lucide-react';

interface LogLine {
  time: string;
  source: string;
  action: string;
  status: 'SUCCESS' | 'INFO' | 'CRAWL' | 'SECURE';
}

const SIMULATED_LOGS: LogLine[] = [
  { time: '17:41:01', source: 'PubMed API', action: 'Query matching: KRAS G12D mutation therapeutics', status: 'CRAWL' },
  { time: '17:41:03', source: 'FDA Register', action: 'Checking drug designations for pancreas KRAS-G12D', status: 'SUCCESS' },
  { time: '17:41:07', source: 'NCCN Portal', action: 'Ingesting guidelines-detail?category=pancreatic&id=1455', status: 'SUCCESS' },
  { time: '17:41:12', source: 'CACA Guidelines', action: 'Streaming metadata extraction clinical?id=424', status: 'CRAWL' },
  { time: '17:41:15', source: 'Watchdog Sys', action: 'Evaluating cross-site verification parity score 9.87', status: 'SECURE' },
  { time: '17:41:20', source: 'ASCO Oncology', action: 'Parsing abstract cohorts for mFOLFIRINOX adjuvant', status: 'CRAWL' },
  { time: '17:41:24', source: 'Lancet Biotech', action: 'Extracting survival hazard ratio (HR=0.68) for survival', status: 'SUCCESS' },
  { time: '17:41:28', source: 'clinicaltrials', action: 'Monitoring recruitment status of NCT5894038 [Pancreas Phase III]', status: 'CRAWL' },
  { time: '17:41:35', source: 'PRD Watcher', action: 'Automatic telemetry health parity check complete', status: 'SECURE' },
  { time: '17:41:40', source: 'ESMO European', action: 'Scanning pancreatic adenocarcinoma immunotherapy trials', status: 'CRAWL' }
];

interface Hotspot {
  name: string;
  lat: number;
  lon: number;
  color: string;
}

const GLOBAL_HOTSPOTS: Hotspot[] = [
  { name: 'CANADA', lat: 56, lon: -106, color: '#f59e0b' },
  { name: 'UNITED KINGDOM', lat: 55, lon: -3, color: '#a855f7' },
  { name: 'FRANCE', lat: 46, lon: 2, color: '#10b981' },
  { name: 'POLAND', lat: 51, lon: 19, color: '#ef4444' },
  { name: 'UKRAINE', lat: 48, lon: 31, color: '#ef4444' },
  { name: 'AFGHANISTAN', lat: 33, lon: 65, color: '#f59e0b' },
  { name: 'SUDAN', lat: 15, lon: 30, color: '#ef4444' },
  { name: 'COLOMBIA', lat: 4, lon: -73, color: '#eab308' },
];

// Great-circle links to render between hotspots
const CONNECTIVITY_LINKS = [
  { from: 'FRANCE', to: 'CANADA' },
  { from: 'UKRAINE', to: 'UNITED KINGDOM' },
  { from: 'POLAND', to: 'SUDAN' },
  { from: 'COLOMBIA', to: 'CANADA' },
];

const CANVAS_COUNTRY_BOUNDS = [
  {
    name: 'China',
    color: 'rgba(20, 184, 166, 0.45)',
    points: [
      { lat: 39.9, lon: 116.4 }, { lat: 43.1, lon: 110.2 }, { lat: 45.4, lon: 94.2 },
      { lat: 38.2, lon: 76.5 }, { lat: 31.4, lon: 80.1 }, { lat: 28.2, lon: 88.5 },
      { lat: 22.4, lon: 100.2 }, { lat: 21.8, lon: 106.4 }, { lat: 22.8, lon: 114.2 },
      { lat: 28.5, lon: 121.5 }, { lat: 37.6, lon: 122.2 }, { lat: 40.2, lon: 124.5 },
      { lat: 48.3, lon: 130.4 }, { lat: 51.5, lon: 122.1 }, { lat: 47.9, lon: 115.5 },
      { lat: 42.5, lon: 117.8 }, { lat: 39.9, lon: 116.4 }
    ]
  },
  {
    name: 'USA',
    color: 'rgba(20, 184, 166, 0.45)',
    points: [
      { lat: 48.5, lon: -124.5 }, { lat: 49.0, lon: -95.1 }, { lat: 45.2, lon: -67.1 },
      { lat: 25.1, lon: -80.3 }, { lat: 25.9, lon: -97.2 }, { lat: 31.3, lon: -111.1 },
      { lat: 32.5, lon: -117.1 }, { lat: 48.5, lon: -124.5 }
    ]
  },
  {
    name: 'Europe & UK',
    color: 'rgba(20, 184, 166, 0.45)',
    points: [
      { lat: 55.0, lon: -10.0 }, { lat: 60.0, lon: -5.0 }, { lat: 60.0, lon: 15.0 },
      { lat: 50.0, lon: 30.0 }, { lat: 40.0, lon: 20.0 }, { lat: 35.0, lon: -5.0 },
      { lat: 45.0, lon: -10.0 }, { lat: 55.0, lon: -10.0 }
    ]
  },
  {
    name: 'Japan',
    color: 'rgba(20, 184, 166, 0.45)',
    points: [
      { lat: 45.0, lon: 142.1 }, { lat: 41.2, lon: 140.4 }, { lat: 35.1, lon: 139.7 },
      { lat: 31.1, lon: 130.5 }, { lat: 34.2, lon: 132.5 }, { lat: 38.4, lon: 138.2 },
      { lat: 45.0, lon: 142.1 }
    ]
  },
  {
    name: 'Germany',
    color: 'rgba(20, 184, 166, 0.45)',
    points: [
      { lat: 54.5, lon: 9.1 }, { lat: 54.1, lon: 14.1 }, { lat: 50.3, lon: 12.3 },
      { lat: 47.9, lon: 10.2 }, { lat: 47.6, lon: 7.5 }, { lat: 53.2, lon: 6.8 },
      { lat: 54.5, lon: 9.1 }
    ]
  }
];

const CANVAS_CITIES = [
  { name: '北京 (BJ)', lat: 39.9, lon: 116.4 },
  { name: '上海 (SH)', lat: 31.2, lon: 121.5 },
  { name: '东京 (TYO)', lat: 35.7, lon: 139.7 },
  { name: '纽约 (NYC)', lat: 40.7, lon: -74.0 },
  { name: '海德堡 (HDB)', lat: 49.4, lon: 8.7 }
];

export default function WarRoomGlobe() {
  const [logs, setLogs] = useState<LogLine[]>(SIMULATED_LOGS.slice(0, 4));
  const logIndexRef = useRef(4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const angleRef = useRef<number>(0);

  // Rotate log terminal lines
  useEffect(() => {
    const logInterval = setInterval(() => {
      const nextLog = SIMULATED_LOGS[logIndexRef.current];
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];
      
      const realNextLog = {
        ...nextLog,
        time: timeStr
      };

      setLogs(prev => {
        const updated = [...prev, realNextLog];
        if (updated.length > 5) {
          updated.shift();
        }
        return updated;
      });

      logIndexRef.current = (logIndexRef.current + 1) % SIMULATED_LOGS.length;
    }, 3800);

    return () => clearInterval(logInterval);
  }, []);

  // IsLand geo-classifier
  const isLand = (lat: number, lon: number): boolean => {
    if (lat > 59 && lon > -75 && lon < -15) return true;
    if (lat > 15 && lat <= 75 && lon > -165 && lon < -50) {
      if (lat < 48 && lon > -75) return true;
      if (lat > 48) return true;
      if (lat < 28 && lon < -95) return false;
      return true;
    }
    if (lat > -55 && lat <= 12 && lon > -82 && lon < -34) {
      const centerLon = -60 + (lat + 20) * 0.25;
      return Math.abs(lon - centerLon) < (20 - (12 - lat) * 0.12);
    }
    if (lat > -34 && lat <= 36 && lon > -18 && lon < 51) {
      if (lat > 12 && lon < -8) return false;
      if (lat < 5 && lon > 40) return false;
      return true;
    }
    if (lat > 8 && lat <= 78 && lon > -10 && lon < 145) {
      if (lat < 25 && lon < 45) return false;
      if (lat < 18 && lon > 95) return true;
      if (lat < 30 && lon > 63 && lon < 93) return true;
      return true;
    }
    if (lat > -42 && lat <= -11 && lon > 112 && lon < 154) return true;
    if (lat > 30 && lat < 46 && lon > 129 && lon < 143) return true;
    if (lat > 50 && lat < 61 && lon > -11 && lon < 2) return true;
    if (lat > -26 && lat < -12 && lon > 43 && lon < 51) return true;
    return false;
  };

  const worldPointsRef = useRef<{ lat: number; lon: number }[]>([]);
  useEffect(() => {
    const list: { lat: number; lon: number }[] = [];
    for (let lat = -75; lat <= 75; lat += 3.2) {
      for (let lon = -180; lon <= 180; lon += 3.2) {
        if (isLand(lat, lon)) {
          list.push({ lat, lon });
        }
      }
    }
    worldPointsRef.current = list;
  }, []);

  // 3D Projection Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    handleResize();

    const ob = new ResizeObserver(() => handleResize());
    ob.observe(canvas);

    let animationFrameId: number;

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const R = Math.min(width, height) * 0.38;
      
      const angle = angleRef.current;
      const tilt = 22 * Math.PI / 180;

      // 1. Atmos radial glow
      const radialGlow = ctx.createRadialGradient(centerX, centerY, R * 0.8, centerX, centerY, R * 1.3);
      radialGlow.addColorStop(0, 'rgba(168, 85, 247, 0.05)'); // Purple theme!
      radialGlow.addColorStop(0.6, 'rgba(20, 184, 166, 0.02)'); // Teal mix
      radialGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, R * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Thin elegant outer ring
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, R, 0, Math.PI * 2);
      ctx.stroke();

      // Orbital paths
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.06)';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, R * 1.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Satellite in orbit
      const satAngle = (angle * 0.4) % (Math.PI * 2);
      const satX = centerX + Math.cos(satAngle) * R * 1.25;
      const satY = centerY + Math.sin(satAngle) * R * 1.25;
      ctx.fillStyle = '#a855f7'; // Purple satellite!
      ctx.beginPath();
      ctx.arc(satX, satY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.beginPath();
      ctx.arc(satX, satY, 10, 0, Math.PI * 2);
      ctx.stroke();

      const projectedHotspots: Record<string, { x: number; y: number; z: number; color: string }> = {};

      // 2. Rotate dotted continents
      const points = worldPointsRef.current;
      for (let i = 0; i < points.length; i++) {
        const pt = points[i];
        
        const radLat = pt.lat * Math.PI / 180;
        const radLon = (pt.lon + angle) * Math.PI / 180;

        const x = R * Math.cos(radLat) * Math.sin(radLon);
        const y = -R * Math.sin(radLat);
        const z = R * Math.cos(radLat) * Math.cos(radLon);

        const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
        const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);

        if (rotZ > 0) {
          const depthScale = rotZ / R;
          const edgeFade = Math.sin((rotZ / R) * Math.PI / 2);
          const opacity = 0.15 + 0.75 * edgeFade;
          
          ctx.fillStyle = `rgba(16, 185, 129, ${opacity})`; // Elegant emerald/green land points!
          
          const dotRadius = 0.6 + 1.2 * depthScale;
          
          ctx.beginPath();
          ctx.arc(centerX + x, centerY + rotY, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2.5 Country bounds
      ctx.lineWidth = 1.0;
      ctx.setLineDash([3, 3]);
      CANVAS_COUNTRY_BOUNDS.forEach(country => {
        ctx.strokeStyle = country.color;
        ctx.beginPath();
        let first = true;
        
        country.points.forEach(pt => {
          const radLat = pt.lat * Math.PI / 180;
          const radLon = (pt.lon + angle) * Math.PI / 180;

          const x = R * Math.cos(radLat) * Math.sin(radLon);
          const y = -R * Math.sin(radLat);
          const z = R * Math.cos(radLat) * Math.cos(radLon);

          const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
          const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);

          if (rotZ > 0) {
            const screenX = centerX + x;
            const screenY = centerY + rotY;
            if (first) {
              ctx.moveTo(screenX, screenY);
              first = false;
            } else {
              ctx.lineTo(screenX, screenY);
            }
          } else {
            first = true;
          }
        });
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // 2.6 Key cities
      CANVAS_CITIES.forEach(city => {
        const radLat = city.lat * Math.PI / 180;
        const radLon = (city.lon + angle) * Math.PI / 180;

        const x = R * Math.cos(radLat) * Math.sin(radLon);
        const y = -R * Math.sin(radLat);
        const z = R * Math.cos(radLat) * Math.cos(radLon);

        const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
        const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);

        if (rotZ > 0) {
          const screenX = centerX + x;
          const screenY = centerY + rotY;
          const depthScale = rotZ / R;
          const opacity = Math.max(0.2, depthScale);

          ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * opacity})`;
          ctx.beginPath();
          ctx.arc(screenX, screenY, 1.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * opacity})`;
          ctx.font = '7px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(city.name, screenX + 4, screenY + 2.5);
        }
      });

      // 3. Project Hotspots
      const pulseFactor = 1 + 0.3 * Math.sin(Date.now() * 0.0065);
      
      GLOBAL_HOTSPOTS.forEach(hs => {
        const radLat = hs.lat * Math.PI / 180;
        const radLon = (hs.lon + angle) * Math.PI / 180;

        const x = R * Math.cos(radLat) * Math.sin(radLon);
        const y = -R * Math.sin(radLat);
        const z = R * Math.cos(radLat) * Math.cos(radLon);

        const rotY = y * Math.cos(tilt) - z * Math.sin(tilt);
        const rotZ = y * Math.sin(tilt) + z * Math.cos(tilt);

        if (rotZ > 0) {
          const screenX = centerX + x;
          const screenY = centerY + rotY;
          projectedHotspots[hs.name] = { x: screenX, y: screenY, z: rotZ, color: hs.color };

          ctx.fillStyle = hs.color;
          ctx.beginPath();
          ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = hs.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(screenX, screenY, 7 * pulseFactor, 0, Math.PI * 2);
          ctx.stroke();

          const depthScale = rotZ / R;
          const tagOpacity = Math.max(0.2, depthScale);
          ctx.strokeStyle = `rgba(255,255,255, ${0.15 * tagOpacity})`;
          ctx.lineWidth = 0.5;

          const labelOffsetX = x > 0 ? 12 : -12;
          const labelOffsetY = rotY > 0 ? 10 : -10;

          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + labelOffsetX, screenY + labelOffsetY);
          ctx.lineTo(screenX + labelOffsetX + (x > 0 ? 10 : -10), screenY + labelOffsetY);
          ctx.stroke();

          ctx.fillStyle = `rgba(224, 224, 242, ${tagOpacity})`;
          ctx.font = 'bold 7.5px "JetBrains Mono", Courier, monospace';
          ctx.textAlign = x > 0 ? 'left' : 'right';
          ctx.fillText(hs.name, screenX + labelOffsetX + (x > 0 ? 13 : -13), screenY + labelOffsetY + 2.5);
        }
      });

      // 4. Beams
      CONNECTIVITY_LINKS.forEach(link => {
        const fromNode = projectedHotspots[link.from];
        const toNode = projectedHotspots[link.to];

        if (fromNode && toNode) {
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'; // Purple beam!
          ctx.lineWidth = 1.2;
          
          const midX = (fromNode.x + toNode.x) / 2;
          const midY = (fromNode.y + toNode.y) / 2 - R * 0.25;

          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.quadraticCurveTo(midX, midY, toNode.x, toNode.y);
          ctx.stroke();

          const runnerRatio = (Date.now() * 0.0003) % 1.0;
          const rx = (1 - runnerRatio) * (1 - runnerRatio) * fromNode.x + 2 * (1 - runnerRatio) * runnerRatio * midX + runnerRatio * runnerRatio * toNode.x;
          const ry = (1 - runnerRatio) * (1 - runnerRatio) * fromNode.y + 2 * (1 - runnerRatio) * runnerRatio * midY + runnerRatio * runnerRatio * toNode.y;

          ctx.fillStyle = '#d8b4fe';
          ctx.shadowColor = '#a855f7';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      angleRef.current += 0.25;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      ob.disconnect();
    };
  }, []);

  const getStatusColor = (status: LogLine['status']) => {
    switch (status) {
      case 'SUCCESS': return 'text-emerald-400 font-bold';
      case 'CRAWL': return 'text-teal-400';
      case 'SECURE': return 'text-purple-400 font-bold';
      default: return 'text-amber-400';
    }
  };

  return (
    <div className="bg-black/90 border border-white/10 rounded-xl p-4 space-y-4 overflow-hidden relative shadow-2xl">
      
      {/* Top Banner with military grid stats */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-300 uppercase">
            GEOLOCATION INFRA RADAR
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-[9px] font-mono text-emerald-400 tracking-wider">LIVE FEED</span>
        </div>
      </div>

      {/* Earth Map Canvas Visual Screen */}
      <div className="relative h-56 bg-zinc-950/80 rounded-lg flex items-center justify-center border border-white/5 overflow-hidden">
        
        {/* Radar grids of coordinates background */}
        <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10 pointer-events-none">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="border-t border-l border-white/40 text-[6px] text-white/20 p-0.5 font-mono">
              {i % 2 === 0 ? `L-${i * 3}` : ''}
            </div>
          ))}
        </div>

        {/* Global sweep radar scanning light lines */}
        <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/[0.04] to-teal-500/0 w-1/3 h-full animate-sweep pointer-events-none"></div>

        {/* High-Fidelity 3D Canvas Globe */}
        <canvas 
          ref={canvasRef} 
          className="w-full h-full block cursor-pointer transition-all duration-300 hover:brightness-110" 
        />

        {/* Compass grid marker text */}
        <div className="absolute top-1 left-2 text-[8px] font-mono text-zinc-500">TRK-3000</div>
        <div className="absolute bottom-1 right-2 text-[8px] font-mono text-zinc-500">SYS_OK</div>
      </div>

      {/* CLI terminal effect below mapping rolling scraper stream activity */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] font-mono font-bold text-zinc-400 tracking-wider">
            RAW OSINT INGESTION CLI LOGS
          </span>
        </div>

        <div className="bg-black/95 border border-white/5 rounded-lg p-2.5 font-mono text-[9px] sm:text-[10px] leading-relaxed select-all text-zinc-300 space-y-1 shadow-inner max-h-[140px] overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 opacity-90 border-b border-white/[0.02] last:border-b-0 pb-1 last:pb-0">
              <span className="text-zinc-500 shrink-0 select-none">[{log.time}]</span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="bg-white/5 px-1 py-0.5 rounded text-[8px] font-semibold text-zinc-400 border border-white/5">
                  {log.source}
                </span>
                <span className={`text-[8px] ${getStatusColor(log.status)}`}>
                  {log.status === 'SUCCESS' ? '✔ OK' : log.status === 'CRAWL' ? '⬇ CRAWL' : 'ℹ SECURE'}
                </span>
              </div>
              <span className="text-zinc-300 flex-1 truncate">{log.action}</span>
            </div>
          ))}
          
          {/* Animated cursor line */}
          <div className="flex items-center gap-1.5 pt-0.5 opacity-80">
            <Loader2 className="h-2.5 w-2.5 text-purple-400 animate-spin" />
            <span className="text-zinc-500 select-none">Awaiting incoming intelligence packets...</span>
            <span className="h-3.5 w-1.5 bg-purple-500 animate-pulse inline-block"></span>
          </div>
        </div>
      </div>

    </div>
  );
}