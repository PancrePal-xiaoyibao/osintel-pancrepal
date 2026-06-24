import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ResourceCenter, PatientProfile } from '../types';
import { 
  MapPin, 
  HeartPulse, 
  CheckCircle2, 
  Award, 
  Globe, 
  Mail, 
  Sparkles, 
  AlertCircle, 
  X, 
  Compass, 
  ChevronRight, 
  Search, 
  Brain, 
  Apple, 
  Stethoscope, 
  Flame, 
  ExternalLink,
  ChevronDown,
  Calculator,
  Compass as CompassIcon,
  Phone,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResourceMapProps {
  centers: ResourceCenter[];
  patientProfile: PatientProfile | null;
  perspective: 'generic' | 'personalized';
}

// Helper to determine center category
function getCenterCategory(center: ResourceCenter): 'treatment' | 'complication' | 'psychology' | 'nutrition' {
  if (center.explicitCategory) {
    return center.explicitCategory;
  }
  const text = (center.name + ' ' + center.description + ' ' + center.specialties.join(' ')).toLowerCase();
  
  if (text.includes('心理') || text.includes('精神') || text.includes('安宁') || text.includes('舒缓') || text.includes('抑郁') || text.includes('睡眠') || text.includes('失眠') || text.includes('安定')) {
    return 'psychology';
  }
  if (text.includes('营养') || text.includes('口服短肽') || text.includes('代乳') || text.includes('膳食') || text.includes('厌食') || text.includes('消瘦') || text.includes('pei') || text.includes('胰酶') || text.includes('pert')) {
    return 'nutrition';
  }
  if (text.includes('阻塞') || text.includes('梗阻') || text.includes('出血') || text.includes('栓塞') || text.includes('胰瘘') || text.includes('漏') || text.includes('急救') || text.includes('重症') || text.includes('icu') || text.includes('ptcd') || text.includes('ercp') || text.includes('介入') || text.includes('减黄')) {
    return 'complication';
  }
  return 'treatment';
}

// Helper to determine city under China
function getCenterCity(center: ResourceCenter): string {
  const text = (center.name + ' ' + center.country + ' ' + center.description).toLowerCase();
  if (text.includes('上海') || text.includes('shanghai')) return '上海';
  if (text.includes('北京') || text.includes('beijing')) return '北京';
  if (text.includes('南京') || text.includes('nanjing') || text.includes('鼓楼') || text.includes('苗毅')) return '南京';
  if (text.includes('杭州') || text.includes('hangzhou') || text.includes('浙二') || text.includes('邵逸夫') || text.includes('浙江省人民')) return '杭州';
  if (text.includes('成都') || text.includes('chengdu') || text.includes('华西')) return '成都';
  if (text.includes('广州') || text.includes('guangzhou') || text.includes('中肿') || text.includes('黄埔')) return '广州';
  if (text.includes('苏州') || text.includes('suzhou')) return '苏州';
  if (text.includes('重庆') || text.includes('chongqing') || text.includes('西南') || text.includes('新桥')) return '重庆';
  if (text.includes('武汉') || text.includes('wuhan') || text.includes('同济') || text.includes('协和')) return '武汉';
  if (text.includes('济南') || text.includes('jinan') || text.includes('山东') || text.includes('齐鲁')) return '济南';
  if (text.includes('天津') || text.includes('tianjin')) return '天津';
  if (text.includes('福建') || text.includes('厦门') || text.includes('福州')) return '福建';
  if (text.includes('河北') || text.includes('石家庄') || text.includes('保定')) return '河北';
  return '其他';
}

// Orthographic 3D projection formula
function projectOrthographic(
  lat: number,
  lng: number,
  width: number,
  height: number,
  rotateX: number,
  rotateY: number,
  scale: number
) {
  const phi = (lat * Math.PI) / 180;
  const lambda = (lng * Math.PI) / 180;
  const rX = (rotateX * Math.PI) / 180;
  const rY = (rotateY * Math.PI) / 180;

  // Spherical to 3D Cartesian coordinates (Z represents depth facing camera)
  const x = Math.cos(phi) * Math.sin(lambda);
  const y = Math.sin(phi);
  const z = Math.cos(phi) * Math.cos(lambda);

  // Rotate Y-axis (Yaw)
  const cosX = Math.cos(rX);
  const sinX = Math.sin(rX);
  const x1 = x * cosX + z * sinX;
  const z1 = -x * sinX + z * cosX;
  const y1 = y;

  // Rotate X-axis (Pitch)
  const cosY = Math.cos(rY);
  const sinY = Math.sin(rY);
  const x2 = x1;
  const y2 = y1 * cosY - z1 * sinY;
  const z2 = y1 * sinY + z1 * cosY;

  return {
    x: width / 2 + x2 * scale,
    y: height / 2 - y2 * scale,
    isFront: z2 > 0,
    depth: z2
  };
}

// Helper to estimate if a coordinate is on a main Earth landmass
function isLand(lat: number, lng: number): boolean {
  // Normalize longitude to -180 to 180
  let l = lng;
  while (l > 180) l -= 360;
  while (l < -180) l += 360;

  // 1. Greenland
  if (lat > 60 && lat < 84 && l > -75 && l < -15) {
    if (lat < 70) {
      const pct = (lat - 60) / 10;
      return l > -45 - pct * 30 && l < -30 + pct * 15;
    }
    return true;
  }

  // 2. Eurasia (Europe & Asia)
  if (lat > 8 && lat < 78 && l > -10 && l < 180) {
    if (lat < 25 && l > 55 && l < 95) {
      return lat > (25 - (l - 55) * 0.5) && lat > (12 + (l - 75) * 0.6);
    }
    if (lat < 30 && l > 34 && l < 55) {
      return lat > 12;
    }
    if (lat > 31 && lat < 45 && l > -5 && l < 35) {
      return false;
    }
    if (lat > 12 && lat < 30 && l > 32 && l < 44) return false;
    if (lat > 36 && lat < 48 && l > 48 && l < 55) return false;
    if (lat > 40 && lat < 47 && l > 27 && l < 42) return false;

    return true;
  }

  // 3. North America
  if (lat > 7 && lat < 78 && l > -168 && l < -52) {
    if (lat > 15 && lat < 30 && l > -98 && l < -81) {
      return false;
    }
    if (lat < 20) {
      return l > -105 && l < -80;
    }
    if (lat > 50 && lat < 66 && l > -95 && l < -75) return false;
    return true;
  }

  // 4. South America
  if (lat > -56 && lat < 12 && l > -82 && l < -34) {
    if (lat > -20) {
      return l > -80 && l < -38;
    }
    const pct = (-20 - lat) / 36;
    const leftBound = -74 + pct * 12;
    const rightBound = -45 - pct * 15;
    return l > leftBound && l < rightBound;
  }

  // 5. Africa
  if (lat > -35 && lat < 37 && l > -18 && l < 52) {
    if (lat > 10 && lat < 18 && l > 43) return false;
    if (lat > -15) {
      return l < 52;
    }
    const pct = (-15 - lat) / 20;
    const leftBound = -15 + pct * 15;
    const rightBound = 40 - pct * 22;
    return l > leftBound && l < rightBound;
  }

  // 6. Australia & Papua New Guinea
  if (lat > -44 && lat < -3 && l > 110 && l < 154) {
    if (lat < -10) {
      if (lat > -16 && lat < -10 && l > 135 && l < 143) return false;
      return true;
    }
    return l > 130 && l < 151;
  }

  // 7. Notable Archipelagos (Japan, UK, Madagascar, Iceland, New Zealand, Indonesia)
  if (lat > 49 && lat < 61 && l > -11 && l < 2) return true;
  if (lat > 30 && lat < 46 && l > 129 && l < 146) return true;
  if (lat > -26 && lat < -12 && l > 43 && l < 51) return true;
  if (lat > 63 && lat < 67 && l > -25 && l < -13) return true;
  if (lat > -47 && lat < -34 && l > 165 && l < 179) return true;
  if (lat > -10 && lat < 18 && l > 95 && l < 128) return true;

  return false;
}

// Approximate simplified borderlines of country/continent zones
const COUNTRY_BOUNDS = [
  // China (Approximate outline)
  {
    name: 'China',
    color: 'rgba(56, 189, 248, 0.55)', // Light blue dashed line
    points: [
      { lat: 18.2, lng: 109.5 }, { lat: 21.5, lng: 111.3 }, { lat: 22.5, lng: 114.1 }, { lat: 24.5, lng: 118.2 },
      { lat: 28.5, lng: 121.8 }, { lat: 31.5, lng: 122.0 }, { lat: 34.1, lng: 120.3 }, { lat: 37.5, lng: 122.5 },
      { lat: 39.8, lng: 119.5 }, { lat: 41.5, lng: 124.3 }, { lat: 43.1, lng: 124.2 }, { lat: 45.3, lng: 131.5 },
      { lat: 48.4, lng: 134.8 }, { lat: 53.5, lng: 123.5 }, { lat: 50.1, lng: 120.2 }, { lat: 42.1, lng: 111.2 },
      { lat: 49.3, lng: 87.5 }, { lat: 39.9, lng: 74.2 }, { lat: 31.1, lng: 78.5 }, { lat: 28.2, lng: 88.5 },
      { lat: 28.0, lng: 97.2 }, { lat: 21.3, lng: 101.2 }, { lat: 21.5, lng: 108.2 }, { lat: 18.2, lng: 109.5 }
    ]
  },
  // USA mainland simplified box
  {
    name: 'USA',
    color: 'rgba(99, 102, 241, 0.45)', // Indigo
    points: [
      { lat: 49.0, lng: -124.5 }, { lat: 49.0, lng: -95.2 }, { lat: 48.0, lng: -89.5 }, { lat: 45.2, lng: -71.1 },
      { lat: 44.5, lng: -67.0 }, { lat: 25.1, lng: -80.3 }, { lat: 29.5, lng: -90.2 }, { lat: 26.0, lng: -97.4 },
      { lat: 32.5, lng: -117.1 }, { lat: 48.1, lng: -124.7 }, { lat: 49.0, lng: -124.5 }
    ]
  },
  // Japan simplified islands path
  {
    name: 'Japan',
    color: 'rgba(236, 72, 153, 0.45)', // Pink
    points: [
      { lat: 45.4, lng: 141.7 }, { lat: 43.8, lng: 144.3 }, { lat: 41.3, lng: 143.2 }, { lat: 35.8, lng: 140.8 },
      { lat: 34.6, lng: 136.8 }, { lat: 33.1, lng: 135.5 }, { lat: 31.2, lng: 130.6 }, { lat: 34.2, lng: 129.5 },
      { lat: 36.1, lng: 132.8 }, { lat: 38.3, lng: 138.8 }, { lat: 41.1, lng: 140.4 }, { lat: 45.4, lng: 141.7 }
    ]
  },
  // Germany simplified border
  {
    name: 'Germany',
    color: 'rgba(16, 185, 129, 0.45)', // Emerald
    points: [
      { lat: 54.8, lng: 8.6 }, { lat: 54.1, lng: 11.2 }, { lat: 53.5, lng: 14.3 }, { lat: 50.8, lng: 15.0 },
      { lat: 48.5, lng: 13.0 }, { lat: 47.6, lng: 9.5 }, { lat: 49.0, lng: 8.0 }, { lat: 51.5, lng: 5.9 },
      { lat: 54.8, lng: 8.6 }
    ]
  }
];

const MAJOR_CITIES_ON_MAP = [
  { name: '北京 (BJ)', lat: 39.9, lng: 116.4 },
  { name: '上海 (SH)', lat: 31.2, lng: 121.5 },
  { name: '南京 (NJ)', lat: 32.0, lng: 118.8 },
  { name: '广州 (GZ)', lat: 23.1, lng: 113.3 },
  { name: '成都 (CD)', lat: 30.6, lng: 104.1 },
  { name: '杭州 (HZ)', lat: 30.2, lng: 120.2 },
  { name: '苏州 (SZ)', lat: 31.3, lng: 120.6 },
  { name: '东京 (TYO)', lat: 35.7, lng: 139.7 },
  { name: '海德堡 (HDB)', lat: 49.4, lng: 8.7 },
  { name: '纽约 (NYC)', lat: 40.7, lng: -74.0 },
  { name: '巴尔的摩 (BWI)', lat: 39.3, lng: -76.6 }
];

export default function ResourceMapView({ centers, patientProfile, perspective }: ResourceMapProps) {
  // Classification state variables
  const [activeTab, setActiveTab] = useState<'treatment' | 'complication' | 'psychology' | 'nutrition'>('treatment');
  const [selectedCountry, setSelectedCountry] = useState<string>('中国');
  const [selectedCity, setSelectedCity] = useState<string>('上海'); // Default Shanghai
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Floating Drawer Side Panels states (Level 2 & 3)
  const [activeCenter, setActiveCenter] = useState<ResourceCenter | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showLevel3, setShowLevel3] = useState<boolean>(false);
  const [copiedCenterId, setCopiedCenterId] = useState<string | null>(null);
  const [hoveredCenter, setHoveredCenter] = useState<ResourceCenter | null>(null);

  // 3D Globe interactions (Coordinates focused on Shanghai, China)
  const [rotateX, setRotateX] = useState<number>(-121.5);
  const [rotateY, setRotateY] = useState<number>(-31.2);
  const [scale, setScale] = useState<number>(180);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0, rX: 0, rY: 0 });
  const draggedDistance = useRef<number>(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const lastInteractTime = useRef<number>(Date.now());

  // PERT Supplement calculator inputs (Level 3 exclusive interactive)
  const [pertMealType, setPertMealType] = useState<'snack' | 'standard' | 'heavy'>('standard');
  const [pertOpStatus, setPertOpStatus] = useState<'unoperated' | 'distal' | 'whipple'>('whipple');
  const [patientWeightInput, setPatientWeightInput] = useState<number>(60);

  // Programmatic globe land particles to create Earth outline wireframe
  const landPoints = useMemo(() => {
    const pts: { lat: number; lng: number; size: number }[] = [];
    const numPoints = 2200; // Optimal density for amazing continent fidelity
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    for (let i = 0; i < numPoints; i++) {
      const latRad = Math.asin(-1 + (2 * i) / numPoints);
      const lngRad = (2 * Math.PI * i) / goldenRatio;
      
      const lat = (latRad * 180) / Math.PI;
      const lng = ((lngRad * 180) / Math.PI) % 360;
      
      // Normalize longitude to -180 to 180
      let normalizedLng = lng;
      if (normalizedLng > 180) normalizedLng -= 360;
      if (normalizedLng < -180) normalizedLng += 360;
      
      if (isLand(lat, normalizedLng)) {
        pts.push({
          lat,
          lng: normalizedLng,
          size: 0.85 + ((i % 4) === 0 ? 0.35 : 0)
        });
      }
    }
    return pts;
  }, []);

  // Programmatic starfield behind the globe
  const starsBg = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 185; i++) {
       arr.push({
         x: Math.random() * 500,
         y: Math.random() * 500,
         r: 0.35 + Math.random() * 1.1,
         opacity: 0.15 + Math.random() * 0.45
       });
    }
    return arr;
  }, []);

  // Update default states based on selection
  useEffect(() => {
    if (selectedCountry !== '中国') {
      setSelectedCity('全部');
    } else if (selectedCity === '全部') {
      setSelectedCity('上海'); // Default back to Shanghai
    }
  }, [selectedCountry]);

  // Adjust Globe viewing angles to center on selected location
  useEffect(() => {
    if (selectedCountry === '中国') {
      let lat = 31.2;
      let lng = 121.5; // Shanghai default
      if (selectedCity === '北京') { lat = 39.9; lng = 116.4; }
      else if (selectedCity === '南京') { lat = 32.0; lng = 118.8; }
      else if (selectedCity === '杭州') { lat = 30.2; lng = 120.2; }
      else if (selectedCity === '成都') { lat = 30.6; lng = 104.1; }
      else if (selectedCity === '广州') { lat = 23.1; lng = 113.3; }
      else if (selectedCity === '苏州') { lat = 31.3; lng = 120.6; }
      
      setRotateX(-lng);
      setRotateY(-lat);
    } else if (selectedCountry === '美国') {
      setRotateX(95);
      setRotateY(-38);
    } else if (selectedCountry === '日本') {
      setRotateX(-138);
      setRotateY(-36);
    } else if (selectedCountry === '德国') {
      setRotateX(-8.5);
      setRotateY(-49);
    }
  }, [selectedCountry, selectedCity]);

  // Drag listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastInteractTime.current = Date.now();
    draggedDistance.current = 0;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      rX: rotateX,
      rY: rotateY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    lastInteractTime.current = Date.now();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    draggedDistance.current += Math.abs(dx) + Math.abs(dy);
    
    const sensitivity = 0.4;
    setRotateX(dragStart.current.rX + dx * sensitivity);
    setRotateY(Math.max(-85, Math.min(85, dragStart.current.rY + dy * sensitivity)));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom support
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    lastInteractTime.current = Date.now();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setScale(prev => Math.max(80, Math.min(850, prev * factor)));
  };

  // Reset function
  const handleReset = () => {
    lastInteractTime.current = Date.now();
    setRotateX(-121.5);
    setRotateY(-31.2);
    setScale(180);
  };

  // Auto-rotation effect
  useEffect(() => {
    let animationFrameId: number;
    const speed = 0.05; // Degrees of rotation per frame - elegant and slow (3 degrees per second at 60fps)
    
    const animate = () => {
      // Resume slow rotation only after 6 seconds of no user active interaction
      if (!isDragging && (Date.now() - lastInteractTime.current > 6000)) {
        setRotateX(prev => {
          let next = prev - speed;
          if (next < -180) next += 360;
          if (next > 180) next -= 360;
          return next;
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDragging]);

  // Keep interaction time fresh when tabs, search, or filters are chosen
  useEffect(() => {
    lastInteractTime.current = Date.now();
  }, [activeTab, selectedCountry, selectedCity, searchQuery]);

  // Matchmaker badge verification
  const isCenterMatched = (center: ResourceCenter) => {
    if (!patientProfile || perspective !== 'personalized') return false;
    
    // Check if the city matches
    if (patientProfile.city) {
      const cityClean = patientProfile.city.replace('市', '').toLowerCase();
      if (center.name.toLowerCase().includes(cityClean) || center.description.toLowerCase().includes(cityClean)) {
        return true;
      }
    }
    
    // Specialties mutations targeting
    if (patientProfile.mutations && patientProfile.mutations.length > 0) {
      const matchMut = patientProfile.mutations.some(mut => {
        const mutUpper = mut.toUpperCase().split(' ')[0];
        return center.specialties.some(s => s.toUpperCase().includes(mutUpper)) ||
               center.name.toUpperCase().includes(mutUpper) ||
               center.description.toUpperCase().includes(mutUpper);
      });
      if (matchMut) return true;
    }
    return false;
  };

  // Directory filter mapping
  const filteredCenters = useMemo(() => {
    return centers.filter(center => {
      // 1. Category Filter
      const cat = getCenterCategory(center);
      if (cat !== activeTab) return false;

      // 2. Country filter
      const textCountry = center.country.toLowerCase();
      let matchCountry = false;
      if (selectedCountry === '中国') matchCountry = textCountry.includes('中国') || textCountry.includes('china');
      else if (selectedCountry === '美国') matchCountry = textCountry.includes('美国') || textCountry.includes('usa');
      else if (selectedCountry === '日本') matchCountry = textCountry.includes('日本') || textCountry.includes('japan');
      else if (selectedCountry === '德国') matchCountry = textCountry.includes('德国') || textCountry.includes('germany');

      if (!matchCountry) return false;

      // 3. City filter under China
      if (selectedCountry === '中国' && selectedCity !== '全部') {
        const city = getCenterCity(center);
        if (city !== selectedCity) return false;
      }

      // 4. Query search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const scoreMatch = (center.name + ' ' + center.description + ' ' + center.specialties.join(' ')).toLowerCase();
        if (!scoreMatch.includes(query)) return false;
      }

      return true;
    });
  }, [centers, activeTab, selectedCountry, selectedCity, searchQuery]);

  // Click handler to open summary model
  const handleSelectCenter = (center: ResourceCenter) => {
    setActiveCenter(center);
    setIsDrawerOpen(true);
    setShowLevel3(false); // Reset Level 3 view
  };

  // Programmatic enzyme dosage logic (PERT Calculator)
  const computedPERTUnits = useMemo(() => {
    let base = 25000; // Single capsule active lipase amount
    let mealFactor = 2; // Default standard meal
    if (pertMealType === 'snack') mealFactor = 1;
    if (pertMealType === 'heavy') mealFactor = 3;

    let opFactor = 1.0;
    if (pertOpStatus === 'unoperated') opFactor = 0.8;
    if (pertOpStatus === 'distal') opFactor = 1.0;
    if (pertOpStatus === 'whipple') opFactor = 1.4; // Whipple reconstruction needs high dose

    const weightFactor = Math.max(40, Math.min(100, patientWeightInput)) / 60;
    const units = Math.round(base * mealFactor * opFactor * weightFactor);
    const capsuleCountCreon25k = Math.max(1, Math.ceil(units / 25000));
    const capsuleCountCreon10k = Math.max(2, Math.ceil(units / 10000));

    return {
      units: units.toLocaleString(),
      capsule25k: capsuleCountCreon25k,
      capsule10k: capsuleCountCreon10k
    };
  }, [pertMealType, pertOpStatus, patientWeightInput]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Dynamic Header System */}
      <div className="p-5 bg-gradient-to-r from-zinc-950/80 to-zinc-900/40 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 glass">
        <div className="flex gap-3 items-start">
          <HeartPulse className="h-6 w-6 text-red-400 shrink-0 mt-1" />
          <div>
            <h1 className="font-serif text-lg md:text-xl font-medium text-white tracking-tight">
              全球胰腺病学实时情报中心
            </h1>
            <p className="text-xs text-zinc-400 max-w-3xl mt-1 leading-relaxed">
              三级递进检索模型支持！整合全球超百个著名外科会诊、并发症危急重诊抢救介入通道、心理安宁缓痛门诊以及特医 PERT 营养处方。联动患者遗传突变特质，智能提供精准诊疗对照评估。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
            MDT Database Node 2026
          </span>
        </div>
      </div>

      {/* Primary Category Tabs Navigation & Filters */}
      <div className="flex flex-col gap-4">
        
        {/* Tabs level 1 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2">
          
          {/* Main Category Tabs */}
          <div className="flex flex-wrap gap-1 bg-black/60 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => { setActiveTab('treatment'); handleReset(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                activeTab === 'treatment' 
                  ? 'bg-blue-600 text-white font-semibold' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              胰腺治疗中心
            </button>
            <button
              onClick={() => { setActiveTab('complication'); handleReset(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                activeTab === 'complication' 
                  ? 'bg-amber-600/90 text-white font-semibold' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              并发症综合中心
            </button>
            <button
              onClick={() => { setActiveTab('psychology'); handleReset(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                activeTab === 'psychology' 
                  ? 'bg-indigo-600 text-white font-semibold' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Brain className="h-3.5 w-3.5" />
              心理支持中心
            </button>
            <button
              onClick={() => { setActiveTab('nutrition'); handleReset(); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition ${
                activeTab === 'nutrition' 
                  ? 'bg-emerald-600 text-white font-semibold' 
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Apple className="h-3.5 w-3.5" />
              营养支持中心
            </button>
          </div>

          {/* National Geographic Filter Selector */}
          <div className="flex items-center gap-2 bg-zinc-900/50 p-1.5 border border-white/10 rounded-lg">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold px-1.5">NATION</span>
            {['中国', '美国', '日本', '德国'].map(country => (
              <button
                key={country}
                 onClick={() => setSelectedCountry(country)}
                className={`px-2.5 py-1 text-xs rounded transition cursor-pointer font-medium ${
                  selectedCountry === country 
                    ? 'bg-white/15 text-white font-semibold' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {country}
              </button>
            ))}
          </div>

        </div>

        {/* China Cities Quick tags shortcut secondary level */}
        {selectedCountry === '中国' && (
          <div className="flex flex-wrap items-center gap-2 bg-zinc-950/40 p-2.5 border border-white/5 rounded-xl text-xs animate-slide-in">
            <span className="text-zinc-500 font-medium px-1 flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-blue-400" />
              快速入口（城市）:
            </span>
            {['上海', '北京', '南京', '杭州', '成都', '广州', '苏州', '全部'].map(city => (
              <button
                key={city}
                onClick={() => setSelectedCity(city)}
                className={`px-3 py-1 rounded-full transition cursor-pointer text-[11px] ${
                  selectedCity === city
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/40 font-semibold shadow'
                    : 'bg-black/30 text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* Main Body Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Level 1: Left Hospital Directory Directory Index */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-950/60 border border-white/10 p-4 rounded-xl flex flex-col space-y-3 glass">
            
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="键入关键字模糊检索对应医院..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 text-sans"
              />
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* List results heading */}
            <div className="flex justify-between items-center text-[10px] font-mono pr-1 text-zinc-500">
              <span>检索结果数：{filteredCenters.length} 家节点</span>
              {selectedCountry === '中国' && <span>区域：{selectedCity === '全部' ? '中国境内' : selectedCity}</span>}
            </div>

            {/* Directory Cards Index wrapper */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 flex flex-col">
              {filteredCenters.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                  未发现匹配条件的医疗资源机构。<br/>
                  请尝试切换其他国家、城市分类或重置标签。
                </div>
              ) : (
                filteredCenters.map(center => {
                  const isMatched = isCenterMatched(center);
                  const isSelected = activeCenter?.id === center.id && isDrawerOpen;
                  const labelCity = getCenterCity(center);
                  
                  return (
                    <button
                      key={center.id}
                      onClick={() => handleSelectCenter(center)}
                      className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600/10 border-blue-500 shadow-md shadow-blue-500/10'
                          : isMatched
                            ? 'bg-purple-950/15 border-purple-500/35 hover:border-purple-500/60'
                            : 'bg-black/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div>
                        {/* Upper line */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[9px] bg-white/10 text-zinc-300 font-mono px-1.5 py-0.5 rounded uppercase">
                            {center.type === 'clinical_center' ? '🏦 临床外科' : center.type === 'research_hub' ? '🔬 基础科研' : '🎗️ 患者自治'}
                          </span>
                          <span className="text-[10px] font-sans text-zinc-400 font-medium">
                            {labelCity} · {center.country.split(' (')[0]}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-serif text-sm font-semibold text-white leading-snug w-full truncate mb-1">
                          {center.name}
                        </h4>

                        {/* Summary specialties */}
                        <p className="text-[11px] text-zinc-400 line-clamp-1 w-full text-sans mb-1">
                          📌 {center.specialties[0] || '综合医疗保障'} | {center.specialties[1] || 'MDT联盟管线'}
                        </p>
                      </div>

                      {/* Interactive detail link */}
                      <div className="flex items-center justify-between text-[10px] text-blue-400 mt-2 hover:text-blue-300 font-sans border-t border-white/5 pt-2">
                        <span className="flex items-center gap-1">
                          查看中脑深度报告与 3 级方案
                          <ChevronRight className="h-3 w-3" />
                        </span>
                        {isMatched && (
                          <span className="text-[9px] bg-purple-500/15 text-purple-300 border border-purple-500/35 px-1.5 py-0.5 rounded-md font-sans">
                            突变高分契合
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Quick guidance notice card */}
            <div className="p-3 bg-zinc-950 border border-white/5 rounded-lg text-[10px] text-zinc-400 space-y-1">
              <span className="font-semibold block text-zinc-300">💡 重度防漏与居家引流规范</span>
              <p className="leading-relaxed font-sans">
                我国大型胰腺外科病室（如海德堡、瑞金、同济）首推特设双套负压居家冲洗维护，避免吻合口漏腐蚀临近大血管引发爆发性出血。出院观察中，如流出液呈血红色，请15分钟内立刻到达最近急诊。
              </p>
            </div>

          </div>
        </div>

        {/* 3D Holo-radar Interactive Globe Visual Frame */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gradient-to-br from-zinc-950 to-black border border-white/10 rounded-2xl relative shadow-2xl p-4 overflow-hidden flex flex-col justify-between aspect-video md:aspect-[21/10] select-none cursor-grab active:cursor-grabbing">
            
            {/* Top Info overlay */}
            <div className="absolute top-4 left-4 z-10 bg-zinc-950/90 border border-white/10 rounded-xl p-3 backdrop-blur-md max-w-[280px] pointer-events-none gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-bold flex items-center gap-1 md:gap-1.5 mb-1">
                <Globe className="h-3.5 w-3.5 animate-spin" />
                D3-Orthographic 3D GUIDANCE GLOBE
              </span>
              <p className="text-[11px] text-zinc-400 leading-normal font-sans">
                点击球体绿道坐标点查收医疗节点深度报告。支持触控及按着拖拽旋转地球表面，滑动滚轮可缩放视野。
              </p>
            </div>

            {/* Simulated Radar Compass Markers */}
            <div className="absolute inset-0 pointer-events-none select-none text-[8px] font-mono text-zinc-700">
              <div className="absolute left-[3%] bottom-[15%] text-zinc-500 select-none flex flex-col space-y-0.5">
                <span>坐标系: Orthographic Projection</span>
                <span>方位: Yaw {rotateX.toFixed(1)}° / Pitch {rotateY.toFixed(1)}°</span>
                <span>聚焦: {selectedCountry} · {selectedCity}</span>
              </div>
            </div>

            {/* Interactive SVG projections container */}
            <svg
              id="holo-guidance-globe-svg"
              ref={svgRef}
              viewBox="0 0 500 500"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              className="w-full h-full"
            >
              <defs>
                <style>{`
                  @keyframes rotation {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  @keyframes rotation-rev {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                  }
                  .rotate-radar {
                    transform-origin: 250px 250px;
                    animation: rotation 35s linear infinite;
                  }
                  .rotate-radar-rev {
                    transform-origin: 250px 250px;
                    animation: rotation-rev 48s linear infinite;
                  }
                `}</style>
                <radialGradient id="globe-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgb(10, 30, 38)" stopOpacity="0.85" />
                  <stop offset="65%" stopColor="rgb(5, 15, 20)" stopOpacity="0.72" />
                  <stop offset="100%" stopColor="rgb(2, 6, 10)" stopOpacity="0.55" />
                </radialGradient>
                <radialGradient id="satellite-beam" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
                </radialGradient>
                <linearGradient id="arc-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="0.75" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.75" />
                </linearGradient>
              </defs>

              {/* Background Space Starfield layer representing infinite deep space */}
              <g className="pointer-events-none opacity-40" id="deepspace-nebula">
                {starsBg.map((star, idx) => (
                  <circle
                    key={`star-${idx}`}
                    cx={star.x}
                    cy={star.y}
                    r={star.r}
                    fill="#ffffff"
                    opacity={star.opacity}
                  />
                ))}
              </g>

              {/* Sphere Base Deep Ocean gradient */}
              <circle cx="250" cy="250" r={scale} fill="url(#globe-glow)" className="pointer-events-none" />

              {/* Parallels and Meridians lines - tactical grid layout */}
              {renderParallels(250, 250, rotateX, rotateY, scale)}
              {renderMeridians(250, 250, rotateX, rotateY, scale)}

              {/* Continent Land Point Cloud with sandy, multi-altitude natural color formulas */}
              {landPoints.map((landPt, idx) => {
                const { x, y, isFront } = projectOrthographic(landPt.lat, landPt.lng, 500, 500, rotateX, rotateY, scale);
                
                // Mix Low Land "rgb(55, 45, 33)" and High Land "rgb(115, 100, 80)"
                const isLow = (idx % 3) !== 0;
                const landColor = isLow ? 'rgb(55, 45, 33)' : 'rgb(115, 100, 80)';

                return (
                  <circle
                    key={`land-${idx}`}
                    cx={x}
                    cy={y}
                    r={landPt.size}
                    fill={isFront ? landColor : 'rgba(5, 15, 20, 0.4)'}
                    opacity={isFront ? (isLow ? 0.88 : 0.95) : 0.03}
                    className="pointer-events-none"
                  />
                );
              })}

              {/* National Borderlines Projection - dynamic active and passive states colors */}
              {COUNTRY_BOUNDS.map((country, cIdx) => {
                const isSelectedCol = selectedCountry === country.name;
                const projectedPoints = country.points.map(pt => 
                  projectOrthographic(pt.lat, pt.lng, 500, 500, rotateX, rotateY, scale)
                );

                let paths: string[] = [];
                let currentPath = '';
                
                for (let i = 0; i < projectedPoints.length; i++) {
                  const pt = projectedPoints[i];
                  if (pt.isFront) {
                    if (currentPath === '') {
                      currentPath = `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                    } else {
                      currentPath += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
                    }
                  } else {
                    if (currentPath !== '') {
                      paths.push(currentPath);
                      currentPath = '';
                    }
                  }
                }
                if (currentPath !== '') {
                  paths.push(currentPath);
                }

                const strokeColor = isSelectedCol ? '#a855f7' : '#E0E0E0';
                const strokeWidth = isSelectedCol ? 1.6 : 0.8;
                const strokeOpacity = isSelectedCol ? 0.95 : 0.14;
                const dashArray = isSelectedCol ? undefined : "3 3";

                return paths.map((d, pIdx) => (
                  <path
                    key={`bounds-${cIdx}-${pIdx}`}
                    d={d}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={strokeOpacity}
                    strokeDasharray={dashArray}
                    className="pointer-events-none transition-all duration-300"
                  />
                ));
              })}

              {/* Major Cities projection and labels on the globe cover */}
              {MAJOR_CITIES_ON_MAP.map((city, idx) => {
                const pt = projectOrthographic(city.lat, city.lng, 500, 500, rotateX, rotateY, scale);
                if (!pt.isFront) return null;
                return (
                  <g key={`city-lbl-${idx}`} className="pointer-events-none select-none">
                    <circle cx={pt.x} cy={pt.y} r="1.8" fill="#ffffff" opacity="0.8" />
                    <text
                      x={pt.x + 4}
                      y={pt.y + 2.5}
                      fill="rgba(255, 255, 255, 0.55)"
                      fontSize="6.5"
                      fontFamily="sans-serif"
                      fontWeight="bold"
                    >
                      {city.name}
                    </text>
                  </g>
                );
              })}

              {/* Day-Night Terminator atmospheric glow outer layer */}
              <circle cx="250" cy="250" r={scale + 2.5} fill="none" stroke="#E8F4FF" strokeWidth="2.5" opacity="0.18" className="pointer-events-none" />
              <circle cx="250" cy="250" r={scale + 6} fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.25" className="pointer-events-none" />
              
              {/* Cybernetic HUD Compass Radar Sweeper Outer Rings */}
              <circle cx="250" cy="250" r={scale + 16} fill="none" stroke="#a855f7" strokeWidth="0.8" strokeDasharray="8 26" opacity="0.32" className="pointer-events-none rotate-radar" />
              <circle cx="250" cy="250" r={scale + 22} fill="none" stroke="#10b981" strokeWidth="0.6" strokeDasharray="3 40" opacity="0.2" className="pointer-events-none rotate-radar-rev" />

              {/* Solid tactical perimeter ring */}
              <circle cx="250" cy="250" r={scale} fill="none" stroke="rgba(168, 85, 247, 0.35)" strokeWidth="1.0" className="pointer-events-none" />

              {/* Tactical Global MDT Consultation Link Lines (linking active center to other centers with animated tracer bullets) */}
              {activeCenter && centers.map(otherCenter => {
                if (otherCenter.id === activeCenter.id) return null;
                
                const startProj = projectOrthographic(activeCenter.latitude, activeCenter.longitude, 500, 500, rotateX, rotateY, scale);
                const endProj = projectOrthographic(otherCenter.latitude, otherCenter.longitude, 500, 500, rotateX, rotateY, scale);
                
                if (!startProj.isFront || !endProj.isFront) return null;
                
                // Draw a beautiful quadratic bezier curve representing communication bridges
                const midX = (startProj.x + endProj.x) / 2;
                const midY = (startProj.y + endProj.y) / 2 - 40; // Pull upwards to create distinct 3d arc elevation
                const dPath = `M ${startProj.x.toFixed(1)} ${startProj.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${endProj.x.toFixed(1)} ${endProj.y.toFixed(1)}`;
                
                return (
                  <g key={`link-path-${otherCenter.id}`}>
                    <path
                      d={dPath}
                      fill="none"
                      stroke="url(#arc-gradient)"
                      strokeWidth="1.2"
                      strokeDasharray="4 4"
                      className="pointer-events-none opacity-70"
                    />
                    {/* Pulsing high energy signal bullet */}
                    <circle r="2.8" fill="#c084fc" className="pointer-events-none">
                      <animateMotion path={dPath} dur="3s" repeatCount="indefinite" />
                    </circle>
                  </g>
                );
              })}

              {/* Active medical center pins with 3D anchors on globe */}
              {(() => {
                // Calculate satellite orbits
                const t = typeof window !== 'undefined' ? performance.now() / 1000 : 0;
                const satLngTarget = (t * 12) % 360;
                const satLatTarget = 24 * Math.sin((t * 0.08) * Math.PI * 2);
                const satProj = projectOrthographic(satLatTarget, satLngTarget, 500, 500, rotateX, rotateY, scale * 1.32);

                return (
                  <>
                    {centers.map(center => {
                      const isSelected = activeCenter?.id === center.id && isDrawerOpen;
                      const isMatched = isCenterMatched(center);
                      const isCurrentTab = getCenterCategory(center) === activeTab;
                      const category = getCenterCategory(center);

                      // 3D Anchor base point (on earth's surface)
                      const base = projectOrthographic(center.latitude, center.longitude, 500, 500, rotateX, rotateY, scale);
                      // 3D Anchor top beacon point (floating above earth's surface, creating 3D depth parallax)
                      const top = projectOrthographic(center.latitude, center.longitude, 500, 500, rotateX, rotateY, scale * 1.08);

                      // Bright premium category color scheme
                      const catColor = (() => {
                        switch (category) {
                          case 'treatment': return '#3b82f6'; // Bright blue
                          case 'complication': return '#f97316'; // Vibrant orange
                          case 'psychology': return '#a855f7'; // Bright purple-indigo
                          case 'nutrition': return '#10b981'; // Neon emerald green
                        }
                      })();

                      if (!base.isFront) {
                        // Draw faint back side coordinates
                        return (
                          <circle
                            key={`back-pin-${center.id}`}
                            cx={base.x}
                            cy={base.y}
                            r="1.5"
                            fill={catColor}
                            opacity="0.05"
                            className="pointer-events-none"
                          />
                        );
                      }

                      return (
                        <g 
                          key={`anchor-${center.id}`}
                          onClick={() => {
                            if (draggedDistance.current < 15) {
                              handleSelectCenter(center);
                            }
                          }}
                          onMouseEnter={() => setHoveredCenter(center)}
                          onMouseLeave={() => setHoveredCenter(null)}
                          className="cursor-pointer group"
                        >
                          {/* Footprint anchor ellipse ripple on Earth's surface */}
                          <ellipse
                            cx={base.x}
                            cy={base.y}
                            rx={isSelected ? 12 : isMatched ? 8 : 5}
                            ry={isSelected ? 6 : isMatched ? 4 : 2.5}
                            fill="none"
                            stroke={catColor}
                            strokeWidth={isSelected ? 1.5 : 0.8}
                            opacity={isCurrentTab ? 0.72 : 0.22}
                            className={isSelected ? "animate-ping" : ""}
                          />
                          
                          {/* Footprint pivot point on Earth's surface */}
                          <circle
                            cx={base.x}
                            cy={base.y}
                            r={0}
                            fill={catColor}
                            opacity={isCurrentTab ? 0.8 : 0.25}
                          />

                          {/* 3D Vertical stem column connecting surface footprint to floating beacon */}
                          <line
                            x1={base.x}
                            y1={base.y}
                            x2={top.x}
                            y2={top.y}
                            stroke={catColor}
                            strokeWidth={isSelected ? 1.8 : isMatched ? 1.2 : 0.8}
                            strokeDasharray={isSelected ? undefined : "3 2"}
                            opacity={isCurrentTab ? (isSelected ? 0.95 : 0.6) : 0.15}
                          />

                          {/* Outer floating pulsing ring */}
                          <circle
                            cx={top.x}
                            cy={top.y}
                            r={isSelected ? 16 : isMatched ? 12 : 9}
                            fill="none"
                            stroke={catColor}
                            strokeWidth={isSelected ? 1.8 : 1.0}
                            opacity={isCurrentTab ? (isSelected ? 0.9 : 0.55) : 0.15}
                            className={isCurrentTab ? "animate-pulse" : ""}
                          />

                          {/* Inner glowing core dot - removed buggy scale hover classes which generated duplicates */}
                          <circle
                            cx={top.x}
                            cy={top.y}
                            r={isSelected ? 6.5 : isMatched ? 5.5 : 4.2}
                            fill={isSelected ? '#ffffff' : catColor}
                            stroke={isSelected ? catColor : '#ffffff'}
                            strokeWidth={isSelected ? 2.8 : 1.0}
                            opacity={isCurrentTab ? 1.0 : 0.4}
                            className="transition-all duration-200"
                          />

                          {/* Transparent Hotspot overlay for exceptionally comfortable click/tap action */}
                          <circle
                            cx={top.x}
                            cy={top.y}
                            r="20"
                            fill="transparent"
                            className="cursor-pointer"
                          />
                        </g>
                      );
                    })}

                    {/* Orbiting Satellite (MDT-SAT-1) representing satellite-perspective tracker */}
                    {satProj.isFront && (
                      <g className="pointer-events-none select-none">
                        {/* Dynamic Orbit tracking path projection trail matching satellite formula exactly */}
                        {(() => {
                           const orbitPoints: {x: number, y: number}[] = [];
                           for (let offset = -15; offset <= 15; offset += 0.5) {
                             const tSample = t + offset;
                             const sampleLng = (tSample * 12) % 360;
                             const sampleLat = 24 * Math.sin((tSample * 0.08) * Math.PI * 2);
                             const pt = projectOrthographic(sampleLat, sampleLng, 500, 500, rotateX, rotateY, scale * 1.32);
                             if (pt.isFront) {
                               orbitPoints.push(pt);
                             }
                           }
                           if (orbitPoints.length > 2) {
                             return (
                               <path
                                 d={`M ${orbitPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')}`}
                                 fill="none"
                                 stroke="#0ea5e9"
                                 strokeWidth="1.2"
                                 strokeDasharray="5 4"
                                 opacity="0.35"
                                 className="pointer-events-none"
                               />
                             );
                           }
                           return null;
                        })()}
                        
                        {/* Satellite central body */}
                        <circle cx={satProj.x} cy={satProj.y} r={6.5} fill="#22d3ee" className="animate-pulse" />
                        
                        {/* Wing antennas */}
                        <line x1={satProj.x - 11} y1={satProj.y} x2={satProj.x + 11} y2={satProj.y} stroke="#22d3ee" strokeWidth="2.5" />
                        <line x1={satProj.x - 11} y1={satProj.y - 3} x2={satProj.x - 11} y2={satProj.y + 3} stroke="#0284c7" strokeWidth="2" />
                        <line x1={satProj.x + 11} y1={satProj.y - 3} x2={satProj.x + 11} y2={satProj.y + 3} stroke="#0284c7" strokeWidth="2" />
 
                        {/* Radar field scan radius circle */}
                        <circle cx={satProj.x} cy={satProj.y} r={18} fill="none" stroke="#22d3ee" strokeWidth="0.8" opacity="0.4" className="animate-ping" />
 
                        {/* Satellite Call Sign Label */}
                        <text x={satProj.x + 14} y={satProj.y + 3} fill="#0ea5e9" fontSize="7" fontFamily="monospace" fontWeight="bold" opacity="0.8">
                          MDT-SAT-1
                        </text>
 
                        {/* HIGH-tech laser transmission chain connecting satellite to active hospital center anchor! */}
                        {isDrawerOpen && activeCenter && (() => {
                          const activeTop = projectOrthographic(activeCenter.latitude, activeCenter.longitude, 500, 500, rotateX, rotateY, scale * 1.08);
                          if (activeTop.isFront) {
                            return (
                              <g>
                                {/* Outer thick dynamic fluorescent glowing orange beam */}
                                <line 
                                  x1={satProj.x} 
                                  y1={satProj.y} 
                                  x2={activeTop.x} 
                                  y2={activeTop.y} 
                                  stroke="#f59e0b" 
                                  strokeWidth="3.2" 
                                  opacity="0.4"
                                />
                                {/* Inner high-contrast bright white core line */}
                                <line 
                                  x1={satProj.x} 
                                  y1={satProj.y} 
                                  x2={activeTop.x} 
                                  y2={activeTop.y} 
                                  stroke="#ffffff" 
                                  strokeWidth="1.5" 
                                  strokeDasharray="8 6"
                                  opacity="0.95"
                                >
                                  <animate attributeName="stroke-dashoffset" values="30;0" dur="0.8s" repeatCount="indefinite" />
                                </line>
                                <circle cx={activeTop.x} cy={activeTop.y} r={16} fill="none" stroke="#f59e0b" strokeWidth="1.5" className="animate-ping" />
                              </g>
                            );
                          }
                          return null;
                        })()}
                      </g>
                    )}

                    {/* Floating HUD Tooltip for moving mouse hover of medical centers */}
                    {hoveredCenter && (() => {
                      const topPt = projectOrthographic(hoveredCenter.latitude, hoveredCenter.longitude, 500, 500, rotateX, rotateY, scale * 1.08);
                      if (!topPt.isFront) return null;
                      const category = getCenterCategory(hoveredCenter);
                      const catBorder = category === 'treatment' ? '#3b82f6' : category === 'complication' ? '#f97316' : category === 'psychology' ? '#a855f7' : '#10b981';
                      
                      return (
                        <g className="pointer-events-none select-none" style={{ transition: 'all 0.12s ease' }}>
                          {/* Tooltip Card border frame */}
                          <rect
                            x={topPt.x - 110}
                            y={topPt.y - 45}
                            width={220}
                            height={28}
                            rx={6}
                            fill="#09090b"
                            fillOpacity="0.96"
                            stroke={catBorder}
                            strokeWidth="1.2"
                          />
                          <polygon
                            points={`${topPt.x - 6},${topPt.y - 17} ${topPt.x + 6},${topPt.y - 17} ${topPt.x},${topPt.y - 11}`}
                            fill="#09090b"
                            stroke={catBorder}
                            strokeWidth="0"
                          />
                          <text
                            x={topPt.x}
                            y={topPt.y - 27}
                            fill="#ffffff"
                            fontSize="9.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="sans-serif"
                          >
                            {hoveredCenter.name}
                          </text>
                        </g>
                      );
                    })()}
                  </>
                );
              })()}
            </svg>

            {/* Earth Control Overlays */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 bg-zinc-950/95 border border-white/10 rounded-xl p-2 shadow-lg backdrop-blur-sm">
              <button
                onClick={() => setScale(prev => Math.min(850, prev * 1.15))}
                title="放大"
                className="p-1 px-2.5 bg-zinc-900 text-zinc-300 border border-white/5 hover:text-white hover:bg-zinc-800 rounded-lg text-xs font-mono font-bold cursor-pointer"
              >
                +
              </button>
              <button
                onClick={() => setScale(prev => Math.max(80, prev / 1.15))}
                title="缩小"
                className="p-1 px-2.5 bg-zinc-900 text-zinc-300 border border-white/5 hover:text-white hover:bg-zinc-800 rounded-lg text-xs font-mono font-bold cursor-pointer"
              >
                -
              </button>
              <button
                onClick={handleReset}
                className="p-1 px-2 text-zinc-400 hover:text-white text-[10px] font-mono border border-white/5 hover:bg-zinc-800 rounded-lg cursor-pointer"
              >
                复位
              </button>
            </div>

          </div>

          {/* Quick clinical survival guidelines package (Moved below map for neat layout) */}
          <div className="bg-zinc-950/40 border border-white/10 rounded-xl p-5 space-y-3 shadow-md">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2 font-serif">
              <Award className="h-4.5 w-4.5 text-blue-400" />
              胰腺外分泌功能不全 (PEI) 临床诊疗规范 & 指引
            </h4>
            <div className="text-xs text-zinc-400 leading-relaxed grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 p-3 bg-black/60 border border-white/5 rounded-lg">
                <strong className="text-blue-400 block font-serif">第一阶段：重塑胃肠道平衡</strong>
                <p className="text-[11px] leading-relaxed">
                  术后由于引流路径改变和消化液改道，胰漏（合并感染率达15-20%）为多发急危重症之要害，必须使用防漏双套负压居家冲洗维保，同时少食多餐以防止排空延迟导致的严重胃潴留。
                </p>
              </div>
              <div className="space-y-1 p-3 bg-black/60 border border-white/5 rounded-lg">
                <strong className="text-indigo-400 block font-serif">第二阶段：高负压冲洗与居家引流</strong>
                <p className="text-[11px] leading-relaxed">
                  居家带管患者，每日需记录引流液颜色与滴速。引流液变红多因胰酶腐蚀腹腔大血管壁引起突发出血。若引流液转为奶白色或混浊并伴高热，指向腹腔重度吻漏感染，务必一键直连原手术科室。
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Floating details Slide-Over Drawer panel (Level 2 & Level 3 details) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isDrawerOpen && activeCenter && (
            <>
              {/* Backdrop overlay */}
              <motion.div
                key="backdrop-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsDrawerOpen(false)}
                className="fixed inset-0 z-[9990] bg-black backdrop-blur-xs"
              />

              {/* Sliding Drawer Content */}
              <motion.div
                key="drawer-content"
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 24, stiffness: 180 }}
                className="fixed inset-y-0 right-0 z-[9999] w-full md:max-w-xl bg-zinc-950/98 border-l border-white/10 shadow-3xl p-6 overflow-y-auto backdrop-blur-xl flex flex-col justify-between scrollbar-thin scrollbar-thumb-zinc-600/80 scrollbar-track-zinc-900/50"
              >
                <div className="space-y-6 flex-1 pr-1">
                  
                  {/* 1. 医院名称 (Hospital Name) inside beautiful authoritative header */}
                  <div className="flex justify-between items-start border-b border-white/15 pb-4">
                    <div className="space-y-1 w-full">
                      <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold font-mono bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                        MDT 卓越推荐中心
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">ID: {activeCenter.id}</span>
                    </div>
                    {/* MASSIVE PROMINENT MAIN HOSPITAL TITLE */}
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white leading-snug mt-1 flex items-center gap-2">
                      🏥 {activeCenter.name}
                    </h1>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-sans mt-1">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span>{activeCenter.country}</span>
                      <span className="text-zinc-600">|</span>
                      <span>分层经纬度: {activeCenter.latitude.toFixed(2)}°, {activeCenter.longitude.toFixed(2)}°</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1.5 rounded-full border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer hover:border-white/20 transition-all shrink-0 ml-4"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* 2. 分类 (Classification) */}
                <div className="space-y-3 bg-zinc-900/40 p-4 border border-white/5 rounded-xl">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase">CLASSIFICATION / 类型划分</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-zinc-800 border border-white/10 text-white font-medium px-2.5 py-1 rounded">
                        {activeCenter.type === 'clinical_center' ? '🏦 卓越临床外科中心' : activeCenter.type === 'research_hub' ? '🔬 基础生命科研中枢' : '🎗️ 患者自治支持联盟'}
                      </span>
                      <span className="text-xs font-semibold text-blue-400 bg-blue-500/5 px-2 py-1 rounded border border-blue-500/10">
                        {(() => {
                          const cat = getCenterCategory(activeCenter);
                          if (cat === 'treatment') return '🎗️ 胰腺治疗方向';
                          if (cat === 'complication') return '🔥 并发症综合治法';
                          if (cat === 'psychology') return '🧠 心理舒缓支持';
                          return '🥦 特膳膳食营养';
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Specialty Tag Cloud */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">MDT 核心特色与诊疗管线特色：</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeCenter.specialties.map((spec, idx) => (
                        <span 
                          key={idx} 
                          className="text-[10px] bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 text-blue-300 px-2 py-0.5 rounded font-mono font-medium"
                        >
                          ✦ {spec}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. 多维度评分卡片 (Multi-dimensional Scores Card) */}
                <div className="space-y-2 mt-4 bg-gradient-to-b from-blue-950/20 to-zinc-900/10 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <strong className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase font-bold flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-blue-400" />
                      Multidimensional MDT Clinical Ratings / 多维度评估评分卡片
                    </strong>
                    <span className="text-[10px] text-zinc-500 font-mono">基准点 10.0</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Card A: Surgery excellence */}
                    <div className="bg-black/40 border border-white/5 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 block font-sans">胰腺外科团队手术卓越能级</span>
                      <div className="flex items-baseline justify-between">
                        <strong className="text-base text-zinc-100 font-serif font-bold">
                          {activeCenter.type === 'clinical_center' ? '9.8 / 10' : '9.1 / 10'}
                        </strong>
                        <span className="text-[9px] text-emerald-500 font-mono bg-emerald-500/10 px-1 rounded">GRADE A++</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: activeCenter.type === 'clinical_center' ? '98%' : '91%' }}></div>
                      </div>
                    </div>

                    {/* Card B: MDT diagnostic capability */}
                    <div className="bg-black/40 border border-white/5 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 block font-sans">MDT 诊断精准复合能级</span>
                      <div className="flex items-baseline justify-between">
                        <strong className="text-base text-zinc-100 font-serif font-bold">9.6 / 10</strong>
                        <span className="text-[9px] text-blue-400 font-mono bg-blue-500/10 px-1 rounded">EXCELLENT</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-blue-400 h-full rounded-full animate-pulse" style={{ width: '96%' }}></div>
                      </div>
                    </div>

                    {/* Card C: Post-op Leak prevention care */}
                    <div className="bg-black/40 border border-white/5 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 block font-sans">高负压冲洗与居家防漏支持</span>
                      <div className="flex items-baseline justify-between">
                        <strong className="text-base text-zinc-100 font-serif font-bold">9.5 / 10</strong>
                        <span className="text-[9px] text-amber-500 font-mono bg-amber-500/10 px-1 rounded">SAFEGUARD</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: '95%' }}></div>
                      </div>
                    </div>

                    {/* Card D: Genetic biomarker alignment */}
                    <div className="bg-black/40 border border-white/5 p-3 rounded-lg space-y-1">
                      <span className="text-[10px] text-zinc-500 block font-sans">突变检测与新药靶向契合度</span>
                      <div className="flex items-baseline justify-between">
                        <strong className="text-base text-zinc-100 font-serif font-bold">
                          {isCenterMatched(activeCenter) ? '100% 极高' : '9.2 / 10'}
                        </strong>
                        <span className={`text-[9px] font-mono px-1 rounded ${isCenterMatched(activeCenter) ? 'text-purple-400 bg-purple-500/20' : 'text-zinc-400 bg-zinc-800'}`}>
                          {isCenterMatched(activeCenter) ? 'HIGHLY FIT' : 'BASIC'}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${isCenterMatched(activeCenter) ? 'bg-purple-500' : 'bg-zinc-500'}`} style={{ width: isCenterMatched(activeCenter) ? '100%' : '92%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. 详情治疗 (Detailed Treatment) - Fully expanded, no more folding! */}
                <div className="space-y-4 pt-1">
                  <div className="space-y-1.5">
                    <strong className="text-xs text-zinc-300 font-semibold block uppercase tracking-wide font-sans">
                      📖 机构权威研判与临床学诊治综述
                    </strong>
                    <p className="text-xs text-zinc-400 leading-relaxed bg-black/60 p-4 rounded-xl border border-white/5 font-sans shadow-inner">
                      {activeCenter.description}
                    </p>
                  </div>

                  {/* Expert Doctors */}
                  {activeCenter.leadDoctors && activeCenter.leadDoctors.length > 0 && (
                    <div className="space-y-2">
                      <strong className="text-xs text-zinc-300 font-semibold block font-sans">👨‍⚕️ 出诊特聘名医专家骨干</strong>
                      <div className="bg-black/60 border border-white/5 p-4 rounded-xl space-y-2.5 text-xs font-sans">
                        {activeCenter.leadDoctors.map((doc, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <span className="h-2 w-2 bg-blue-500 rounded-full shrink-0"></span>
                            <span className="font-semibold text-zinc-200">{doc}</span>
                            <span className="text-[10px] text-zinc-500 bg-zinc-900 border border-white/5 px-1.5 py-0.5 rounded">会诊特邀名医</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Personal Genetic Match (Directly integrated and expanded!) */}
                  <div className="space-y-2">
                    <strong className="text-xs text-zinc-300 font-semibold block font-sans">🧬 本人病情特征契合研判</strong>
                    {patientProfile && perspective === 'personalized' ? (
                      <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl space-y-2">
                        <h5 className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                          <Brain className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                          遗传特征靶向契合报告 (Personalized Mutation Scan)
                        </h5>
                        <div className="text-[11px] text-zinc-300 leading-normal font-sans space-y-1">
                          <p>
                            当前锁定基因突变：<strong className="text-purple-300">[{patientProfile.mutations.join(', ')}]</strong> | Claudin免疫组化: <strong className="text-purple-300">[{patientProfile.ihcResults || '未测定'}]</strong>
                          </p>
                          <p className="text-zinc-400 text-[10px] leading-relaxed pt-1 border-t border-purple-500/10">
                            {activeCenter.specialties.some(s => s.toLowerCase().includes('cldn18.2') || s.toLowerCase().includes('claudin')) && patientProfile.ihcResults?.toLowerCase().includes('claudin') ? (
                              "🎯 靶点匹配极其优越！该卓越机构主力推进您的 Claudin 18.2 高灵敏表达研究。该院承揽对应的一期特异招募流程，推荐您尽快通过下方的快速预约渠道，邮件锁定MDT通道。"
                            ) : activeCenter.specialties.some(s => s.toLowerCase().includes('kras') || s.toLowerCase().includes('靶点')) && patientProfile.mutations.some(m => m.toUpperCase().includes('KRAS')) ? (
                              "🎯 基因突变完美契合！针对您体征内的 KRAS 变异，该团队拥有多款克服吉西他滨耐药的新一代在研联合疗法，高度推荐重点关注！"
                            ) : (
                              "⚡ 临床匹配契合畅通！该中心对您本阶段服用的方案具有强大的PEI防癌减毒、居家高负压冲洗等副反应支持，符合您的诊疗期待。"
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-blue-950/10 border border-blue-500/15 rounded-xl flex items-start gap-2.5 text-[11px] text-zinc-400 leading-normal font-sans">
                        <AlertCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          当前为默认视角。建议开启左上角的 <strong className="text-zinc-200">个性化临床契合视角</strong>，以在卡片中实时核算您本人的突变基因对应的靶向、免招募契合研判。
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PERT enzyme dosage calculator - Directly integrated and expanded! */}
                  <div className="p-4 bg-black/70 border border-white/5 rounded-xl space-y-3.5 font-sans">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300">
                      <Calculator className="h-4.5 w-4.5 text-emerald-400" />
                      外源性胰酶补充 (PERT) 量化处方测算工具
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      依据最新临床胰腺病指南：胰腺切除术后（尤其是胰十二指肠切除Whipple术）由于消化道改道与外分泌缺损，需重度补充脂肪酶，防范不全（PEI）引起的重度营养不良、厌食与消瘦脱水。
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block font-sans">餐食摄入类型</label>
                        <select 
                          value={pertMealType} 
                          onChange={(e) => setPertMealType(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-white/10 rounded p-1.5 focus:outline-none text-xs text-white"
                        >
                          <option value="snack">轻量加餐 / 水果奶制品 🍎</option>
                          <option value="standard">标准主餐 / 荤素混合主食 🍚</option>
                          <option value="heavy">高脂大餐 / 高油水多肉脂 🥩</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-zinc-400 block font-sans">吻合术式/外分泌障害</label>
                        <select 
                          value={pertOpStatus} 
                          onChange={(e) => setPertOpStatus(e.target.value as any)}
                          className="w-full bg-zinc-900 border border-white/10 rounded p-1.5 focus:outline-none text-xs text-white"
                        >
                          <option value="unoperated">未手术 / 保守（晚期肿瘤压迫）</option>
                          <option value="distal">胰体尾切除术 (保留十二指肠)</option>
                          <option value="whipple">胰十二指肠切除术 (Whipple/重建)</option>
                        </select>
                      </div>
                    </div>

                    {/* Weight Slider */}
                    <div className="space-y-1 pt-1 text-[11px]">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-zinc-400">患者当前体重参考:</span>
                        <span className="text-emerald-400 font-bold font-mono">{patientWeightInput} kg</span>
                      </div>
                      <input 
                        type="range"
                        min="35"
                        max="100"
                        value={patientWeightInput}
                        onChange={(e) => setPatientWeightInput(Number(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none"
                      />
                    </div>

                    {/* Result Card */}
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <span className="text-zinc-500 text-[10px] block font-sans">单餐测算所需脂肪酶活性：</span>
                        <strong className="text-emerald-400 font-bold font-mono text-sm">{computedPERTUnits.units} IU</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-zinc-500 text-[10px] block font-sans">得每通 (Creon) 25000粒：</span>
                        <strong className="text-white font-serif text-sm">{computedPERTUnits.capsule25k} 粒 / 餐</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. 其它 (Others) */}
                {/* Custom Survivor Resources Checklist */}
                {activeCenter.survivorResources && activeCenter.survivorResources.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <strong className="text-xs text-zinc-300 font-semibold block flex items-center gap-1 font-sans">
                      📂 本部定制生存指南与诊疗规范
                    </strong>
                    <div className="grid grid-cols-1 gap-2.5">
                      {activeCenter.survivorResources.map((resName, idx) => (
                        <div
                          key={idx} 
                          className="text-[11px] bg-blue-500/5 text-blue-300 px-3 py-2.5 border border-blue-500/10 rounded-xl flex items-center justify-between font-sans shadow-sm"
                        >
                          <span className="flex items-center gap-2 pr-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="truncate max-w-[280px]">{resName}</span>
                          </span>
                          <button
                            onClick={() => alert(`[智能诊疗辅助] 已定位并备份指南：\n"${resName}"\n临床要点与高脂餐后补充规则分析已启动...`)}
                            className="text-[10px] px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold rounded border border-blue-500/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
                          >
                            锁存副本
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Direct Access Footer Contact Channels under Others */}
              {activeCenter.contact && (
                <div className="border-t border-white/10 pt-4 mt-6 space-y-2.5 bg-zinc-900/60 p-4 rounded-xl border border-white/5 font-mono">
                  <span className="text-[10px] text-zinc-500 block font-bold uppercase tracking-wider font-sans">
                    ✉️ ACCESS CHANNELS / 线上预约与专家直通联络渠道:
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 text-blue-400 shrink-0" />
                      <a 
                        href={`mailto:${activeCenter.contact}`} 
                        className="text-blue-400 hover:text-blue-300 select-all font-semibold font-mono truncate"
                        title="点击直接书写邮件"
                      >
                        {activeCenter.contact}
                      </a>
                    </div>
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(activeCenter.contact || '');
                        } catch (e) {}
                        setCopiedCenterId(activeCenter.id);
                        setTimeout(() => setCopiedCenterId(null), 3000);
                      }}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 hover:border-purple-500/35 px-2.5 py-1.5 rounded text-zinc-300 hover:text-white cursor-pointer transition font-sans shrink-0 ml-2"
                    >
                      {copiedCenterId === activeCenter.id ? '✅ 已成功复制' : '复制直连邮箱'}
                    </button>
                  </div>
                  {copiedCenterId === activeCenter.id && (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      className="text-[10px] text-emerald-400 text-right font-sans mt-1"
                    >
                      复制成功！请通过邮箱联系获取特需多学科MDT服务或递交免疫组化诊断报告。
                    </motion.p>
                  )}
                </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
    )}

    </div>
  );
}

// Generate graticule parallels paths
function renderParallels(cx: number, cy: number, rotX: number, rotY: number, scale: number) {
  const latitudes = [-60, -30, 0, 30, 60];
  const paths: React.ReactNode[] = [];
  
  latitudes.forEach(lat => {
    let d = '';
    let lastFront = false;
    let points: { x: number; y: number; isFront: boolean }[] = [];

    for (let lng = 0; lng <= 360; lng += 10) {
      points.push(projectOrthographic(lat, lng, 500, 500, rotX, rotY, scale));
    }

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i === 0) {
        d = `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        lastFront = pt.isFront;
      } else {
        if (pt.isFront === lastFront) {
          d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        } else {
          paths.push(
            <path
              key={`parallel-${lat}-s-${i}`}
              d={d}
              fill="none"
              stroke={lastFront ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.05)'}
              strokeWidth="0.8"
              strokeDasharray={lastFront ? undefined : '3 3'}
            />
          );
          d = `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          lastFront = pt.isFront;
        }
      }
    }
    if (d) {
      paths.push(
        <path
          key={`parallel-${lat}-final`}
          d={d}
          fill="none"
          stroke={lastFront ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.05)'}
          strokeWidth="0.8"
          strokeDasharray={lastFront ? undefined : '3 3'}
        />
      );
    }
  });
  return paths;
}

// Generate graticule meridians paths
function renderMeridians(cx: number, cy: number, rotX: number, rotY: number, scale: number) {
  const longitudes = [0, 45, 90, 135, 180, 225, 270, 315];
  const paths: React.ReactNode[] = [];

  longitudes.forEach(lng => {
    let d = '';
    let lastFront = false;
    let points: { x: number; y: number; isFront: boolean }[] = [];

    for (let lat = -90; lat <= 90; lat += 10) {
      points.push(projectOrthographic(lat, lng, 500, 500, rotX, rotY, scale));
    }

    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (i === 0) {
        d = `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        lastFront = pt.isFront;
      } else {
        if (pt.isFront === lastFront) {
          d += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        } else {
          paths.push(
            <path
              key={`meridian-${lng}-s-${i}`}
              d={d}
              fill="none"
              stroke={lastFront ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.04)'}
              strokeWidth="0.8"
              strokeDasharray={lastFront ? undefined : '3 3'}
            />
          );
          d = `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
          lastFront = pt.isFront;
        }
      }
    }
    if (d) {
      paths.push(
        <path
          key={`meridian-${lng}-final`}
          d={d}
          fill="none"
          stroke={lastFront ? 'rgba(59, 130, 246, 0.22)' : 'rgba(59, 130, 246, 0.04)'}
          strokeWidth="0.8"
          strokeDasharray={lastFront ? undefined : '3 3'}
        />
      );
    }
  });
  return paths;
}
