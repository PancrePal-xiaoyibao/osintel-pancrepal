import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  Globe, 
  Target, 
  HeartPulse, 
  MessageSquare, 
  ChevronRight, 
  CheckCircle, 
  ArrowRight,
  Shield,
  Search,
  BookMarked
} from 'lucide-react';

interface HelpViewProps {
  language: 'EN' | 'ZH';
  onNavigateToTab?: (tab: any) => void;
}

export default function HelpView({ language, onNavigateToTab }: HelpViewProps) {
  const [activeSegment, setActiveSegment] = useState<string>('intro');
  const [searchQuery, setSearchQuery] = useState('');
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    login: true,
    setup_profile: false,
    explore_globe: false,
    view_medicine: false,
    chat_agent: false,
  });

  const zhSegments = [
    {
      id: 'intro',
      title: '🧭 系统定位与开箱指南',
      icon: <BookOpen className="h-4 w-4" />,
      description: '了解小胰宝 OSINT 胰腺开源情报安全中心的整体设计定位、临床定位与核心价值架构。',
    },
    {
      id: 'globe',
      title: '🌐 3D数字化态势地球使用规范',
      icon: <Globe className="h-4 w-4" />,
      description: '掌握 3D 态势地球的旋转、缩放、多层雷达扫描与全球医疗中枢（上海、海德堡、巴尔的摩）的联动。',
    },
    {
      id: 'target',
      title: '🧬 靶标洞察与特异基因匹配',
      icon: <Target className="h-4 w-4" />,
      description: '解析胰腺癌热点靶点（KRAS, BRCA1/2, PALB2) 的精准匹配引擎、耐药分析与临床药物交叉检索。',
    },
    {
      id: 'nursing',
      title: '🏥 术后引流与高负压冲洗要点',
      icon: <HeartPulse className="h-4 w-4" />,
      description: '资深胰腺外科中心首推的居家引流防漏双套管抗感染、负压值调节与大出血紧急回避抢救规范。',
    },
    {
      id: 'chatbot',
      title: '👾 智能小胰宝助理交互策略',
      icon: <MessageSquare className="h-4 w-4" />,
      description: '掌握通过 AI Scientist 大模型与小胰宝进行高效病理咨询、科研证据抽取、FDA新药速递的语境提示法。',
    }
  ];

  const enSegments = [
    {
      id: 'intro',
      title: '🧭 Platform Scope & Getting Started',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Understand the clinical positioning, architectural layout, and open-source intelligence mission of Pancreas OSINT.',
    },
    {
      id: 'globe',
      title: '🌐 3D Tactical Globe Navigation',
      icon: <Globe className="h-4 w-4" />,
      description: 'Master dragging, panning, multi-layer HUD radars, and shifting focal points between major medical hubs.',
    },
    {
      id: 'target',
      title: '🧬 Target Insights & Mutational Matches',
      icon: <Target className="h-4 w-4" />,
      description: 'A deep-dive into the mutation-matching engine for key pancreatic targets (KRAS, BRCA, PALB2, RMC compounds).',
    },
    {
      id: 'nursing',
      title: '🏥 Post-Op Flushing & Drainage Safety',
      icon: <HeartPulse className="h-4 w-4" />,
      description: 'Essential post-pancreatectomy home drainage cuidados, double-cannula flushing protocols, and emergency bleeding alerts.',
    },
    {
      id: 'chatbot',
      title: '👾 Deciphering Xiao Yi Bao AI Agent',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'Harness the power of server-side Gemini science models to extract trials, verify paper claims, and auto-analyze reports.',
    }
  ];

  const segments = language === 'ZH' ? zhSegments : enSegments;

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredSegments = segments.filter(seg => 
    seg.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    seg.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    activeSegment === seg.id
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-fade-in font-sans">
      
      {/* 🚀 Top Premium Brand Banner (Xiao Yi Bao Mascot Greet) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-950/20 via-purple-950/25 to-zinc-950 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-[90px] pointer-events-none" />
        
        {/* Mascot Mascot Floating Logo Wrapper */}
        <div className="relative shrink-0 p-1.5 bg-gradient-to-tr from-teal-500/20 to-purple-500/20 rounded-full border border-teal-500/30 shadow-inner group">
          <svg viewBox="0 0 100 100" className="h-24 w-24 md:h-28 md:w-28 drop-shadow-[0_0_12px_rgba(20,184,166,0.3)]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="50" cy="50" rx="45" ry="45" fill="rgba(20, 184, 166, 0.1)" />
            <rect x="25" y="16" width="50" height="42" rx="21" fill="#14b8a6" stroke="#0d9488" strokeWidth="2" />
            <rect x="21" y="29" width="5" height="16" rx="2.5" fill="#0f766e" />
            <rect x="74" y="29" width="5" height="16" rx="2.5" fill="#0f766e" />
            <rect x="31" y="22" width="38" height="28" rx="14" fill="#ffffff" />
            <path d="M 37 36 Q 42 31 47 36" stroke="#0d9488" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <path d="M 53 36 Q 58 31 63 36" stroke="#0d9488" strokeWidth="3.5" strokeLinecap="round" fill="none" />
            <line x1="50" y1="16" x2="50" y2="8" stroke="#14b8a6" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="6" r="4" fill="#f97316" />
            <rect x="33" y="55" width="34" height="34" rx="13" fill="#14b8a6" stroke="#0d9488" strokeWidth="2" />
            <path d="M 33 63 Q 23 57 19 46" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="19" cy="46" r="3" fill="#14b8a6" />
            <path d="M 67 63 Q 75 68 78 74" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 50 67 C 46 62, 40 62, 40 67 C 40 73, 50 78, 50 78 C 50 78, 60 73, 60 67 C 60 62, 54 62, 50 67 Z" fill="#ef4444" />
            <rect x="37" y="87" width="8" height="7" rx="3.5" fill="#0f766e" />
            <rect x="55" y="87" width="8" height="7" rx="3.5" fill="#0f766e" />
          </svg>
        </div>

        {/* Greet Text */}
        <div className="space-y-2 text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2.5">
            <span className="text-[10px] bg-teal-500/10 border border-teal-500/30 text-teal-400 px-2 py-0.5 rounded font-mono font-semibold uppercase tracking-wider">
              {language === 'ZH' ? '智能客服中心' : 'SMART SUPPORT DESK'}
            </span>
            <span className="text-xs text-zinc-500 font-mono">ID: xiao_yi_bao_hub</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-white tracking-tight">
            {language === 'ZH' ? '你好！我是小胰宝 👾' : 'Hello! I am Xiao Yi Bao 👾'}
          </h2>
          <p className="text-sm text-zinc-400 leading-relaxed font-sans max-w-2xl">
            {language === 'ZH' 
              ? '欢迎开启您的胰腺腺泡细胞癌与导管腺癌学术哨所之旅。我为您整理了系统完整的使用规格与居家康复要点，助您实现全场景下的极稳自治操作。'
              : 'Welcome to your expert-level Pancreatic Oncology outpost. I have cataloged comprehensive guidelines and homecare standards to empower your data lookup and health navigation.'}
          </p>
        </div>
      </div>

      {/* 🧭 Main Two-column Interactive Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side Navigation & Search (Col span 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder={language === 'ZH' ? '搜索帮助条目/高频词...' : 'Search guidelines...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-300 placeholder-zinc-500 font-sans focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20"
            />
          </div>

          {/* Quick Chapters Rail */}
          <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 space-y-1">
            <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold block pb-3 border-b border-white/5 mb-3 px-1">
              {language === 'ZH' ? '指南章节概览' : 'GUIDELINE SECTIONS'}
            </span>
            {filteredSegments.map((seg) => (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(seg.id)}
                className={`w-full text-left p-3.5 rounded-xl transition flex gap-3.5 items-start cursor-pointer group ${
                  activeSegment === seg.id 
                    ? 'bg-purple-950/15 border border-purple-500/30 text-white' 
                    : 'border border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${
                  activeSegment === seg.id ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-900 group-hover:bg-zinc-850 text-zinc-500'
                }`}>
                  {seg.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold tracking-tight leading-none mb-1 group-hover:text-purple-300 transition">
                    {seg.title}
                  </h4>
                  <p className="text-[10.5px] text-zinc-500 leading-normal line-clamp-2">
                    {seg.description}
                  </p>
                </div>
                <ChevronRight className={`h-3 w-3 shrink-0 self-center transition-transform ${
                  activeSegment === seg.id ? 'translate-x-0.5 text-purple-400' : 'text-zinc-600'
                }`} />
              </button>
            ))}
          </div>

          {/* Checklist widgets */}
          <div className="p-4 bg-zinc-950 border border-white/10 rounded-2xl space-y-3.5">
            <span className="text-[10px] uppercase font-mono tracking-widest text-teal-400 font-bold block border-b border-white/5 pb-2.5">
              🚀 {language === 'ZH' ? '您的临床自治探索度' : 'CLINICAL READINESS TRACK'}
            </span>
            <div className="space-y-2.5 text-[11px] font-sans">
              <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300">
                <input 
                  type="checkbox" 
                  checked={checklist.login} 
                  onChange={() => toggleCheck('login')}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 checked:bg-teal-500 shrink-0"
                />
                <span className={checklist.login ? 'line-through text-zinc-600' : ''}>
                  {language === 'ZH' ? '点击“一键模拟登录”体验完整多端联动' : 'Complete quick simulation login / Sync credentials'}
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300">
                <input 
                  type="checkbox" 
                  checked={checklist.setup_profile} 
                  onChange={() => toggleCheck('setup_profile')}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 checked:bg-teal-500 shrink-0"
                />
                <span className={checklist.setup_profile ? 'line-through text-zinc-600' : ''}>
                  {language === 'ZH' ? '在“精准病历”页面设定突变基因、住址、用药' : 'Configure mutations & regimen on Patient Profile'}
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300">
                <input 
                  type="checkbox" 
                  checked={checklist.explore_globe} 
                  onChange={() => toggleCheck('explore_globe')}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 checked:bg-teal-500 shrink-0"
                />
                <span className={checklist.explore_globe ? 'line-through text-zinc-600' : ''}>
                  {language === 'ZH' ? '旋转3D地球并激活特定医疗中枢报告' : 'Spin the 3D tactical globe & trigger a hub report'}
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300">
                <input 
                  type="checkbox" 
                  checked={checklist.view_medicine} 
                  onChange={() => toggleCheck('view_medicine')}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 checked:bg-teal-500 shrink-0"
                />
                <span className={checklist.view_medicine ? 'line-through text-zinc-600' : ''}>
                  {language === 'ZH' ? '在“热点新药”查看 RMC-6236 / 分子式说明书' : 'Visit hotspot medications to inspect molecule details'}
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer text-zinc-400 hover:text-zinc-300">
                <input 
                  type="checkbox" 
                  checked={checklist.chat_agent} 
                  onChange={() => toggleCheck('chat_agent')}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-teal-500 focus:ring-0 checked:bg-teal-500 shrink-0"
                />
                <span className={checklist.chat_agent ? 'line-through text-zinc-600' : ''}>
                  {language === 'ZH' ? '呼叫小胰宝人工智能进行英文论文提取' : 'Input medical query & utilize Gemini paper search'}
                </span>
              </label>
            </div>
            {onNavigateToTab && (
              <button 
                onClick={() => onNavigateToTab('feed')}
                className="w-full mt-2.5 bg-gradient-to-r from-teal-500/10 to-teal-400/20 text-teal-300 border border-teal-550/20 py-2 rounded-xl text-xs font-semibold hover:from-teal-500/20 hover:to-teal-400/30 transition text-center flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>{language === 'ZH' ? '前往控制中心' : 'Go to Control Center'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Right Side Content Display Container (Col span 8) */}
        <div className="lg:col-span-8 bg-zinc-950/60 border border-white/10 rounded-2xl p-6 md:p-8 space-y-8 backdrop-blur-xl">
          
          {/* Chapter 1: Platform Scope intro */}
          {activeSegment === 'intro' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <span className="text-[10px] text-purple-400 font-mono tracking-widest block uppercase font-bold">CHAPTER 01</span>
                <h3 className="text-xl md:text-2xl font-serif text-white mt-1">🧭 系统定位与业务自转理念</h3>
              </div>
              
              <p className="text-xs leading-relaxed text-zinc-400">
                {language === 'ZH' 
                  ? '本系统根本原则在于构建独立于单点人工常驻维护的“业务长期自研平台”。底座通过大语言模型、自动化爬虫与 OSINT 开源要素对全球范围内的胰腺重大医学动态（主要针对胰腺癌 KRAS 抑制剂、术后抗漏引流规范等）进行昼夜监测与雷达定位。'
                  : 'Pancreas OSINT is an autonomous clinical intelligence aggregator centering around persistent self-healing watchdogs, mutational analytics databases, and server-side model routing guidelines. It tracks global clinical milestones, clinical trial recruitment thresholds, and post-surgery pancreas leakage nursing standards without human maintainer lock-in.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-bold">
                    <Shield className="h-4 w-4 shrink-0" />
                    <span>{language === 'ZH' ? '多模型沙盒路由' : 'Multi-Model Routing'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    {language === 'ZH' 
                      ? '本系统不锁定供应商，配置选项内包含 SiliconFlow 提供之 DeepSeek 等极简大模型以及谷歌 Gemini。可在侧边栏灵活调用，保障极致高可用。'
                      : 'Never vendor-locked: supports DeepSeek, SiliconFlow, and Gemini engines proxy-routed on the backend to avoid API quota depletion.'}
                  </p>
                </div>
                <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                    <BookMarked className="h-4 w-4 shrink-0" />
                    <span>{language === 'ZH' ? '情报三层结构' : 'Triple Intelligence Grid'}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    {language === 'ZH' 
                      ? '包含 OSINT 收集、3D 雷达地图对齐和精准病历（患者特征匹配）的交汇融合，使前沿数据能立刻响应个性化临床需求。'
                      : 'Synchronizes global academic RSS feeds, 3D spatial hospital map projections, and target mutational filters into a unified reactive screen.'}
                  </p>
                </div>
              </div>

              <div className="bg-purple-950/10 border border-purple-500/20 p-4 rounded-xl mt-6">
                <span className="text-[10px] font-mono uppercase text-purple-300 font-bold block mb-1">🚨 极限红线警示 / HIGH-CONTRAST DISCLAIMER</span>
                <p className="text-[10.5px] leading-relaxed text-zinc-400">
                  {language === 'ZH' 
                    ? '系统学术内容来自 PubMed 摘要、美国 FDA 与 ClinicalTrials.gov。开源医学情报仅供医疗专业人士研讨及学术追踪，不构成直接床前处方和医疗诊治，更不应替代床前主刀医师的实际引流负压值指令。'
                    : 'All intelligence is synthesized dynamically from PubMed abstracts, clinical trial registries, and authorized medical bulletins. Any target insights and regimen suggestions are strictly academic references and do not override professional bedside oncological prescription.'}
                </p>
              </div>
            </div>
          )}

          {/* Chapter 2: Globe Navigation */}
          {activeSegment === 'globe' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <span className="text-[10px] text-purple-400 font-mono tracking-widest block uppercase font-bold">CHAPTER 02</span>
                <h3 className="text-xl md:text-2xl font-serif text-white mt-1">🌐 3D数字化战术地球操作规范</h3>
              </div>

              <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                <p>
                  {language === 'ZH'
                    ? '我们的全球资源地图运用了 D3-Orthographic 极流畅三维正交立体投影/3D WebGL（根据硬件条件自适应）。它将世界重点医疗枢纽（包括国内顶级肝胆外科三甲，海德堡大学医院、约翰霍普金斯等）映射至球面三维坐标中。'
                    : 'The spatial locator maps international pancreas reference spaces into the globe coordinate system, focusing on major epicenters of pancreatic clinical science.'}
                </p>

                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-3">
                  <span className="text-zinc-300 font-semibold block text-xs">🕹️ {language === 'ZH' ? '多维互动动作指南' : 'Interaction Protocols'}</span>
                  <ul className="list-disc pl-4 space-y-2 text-[11px]">
                    <li>
                      <strong>{language === 'ZH' ? '地表旋转拖拽' : 'Rotational Sweep'}</strong>: {language === 'ZH' ? '按住地球表面任意空白区域并左右滑动，可改变三维地球的 Yaw 轴旋转度，将视野朝向欧美或亚太枢纽。' : 'Click and drag horizontally on any ocean sector to sweep Yaw coordinates and spin the planet smoothly.'}
                    </li>
                    <li>
                      <strong>{language === 'ZH' ? '俯仰角修正 (Pitch)' : 'Altitude Tilt'}</strong>: {language === 'ZH' ? '按住地球表面上下滑动可改变 Pitch 仰角。视角最高极限为 90°(直视北极), 最低极限为 -45°。' : 'Drag vertically to tilt altitude angles. Fixed cap preserves realistic horizons.'}
                    </li>
                    <li>
                      <strong>{language === 'ZH' ? '视野微距缩放 (Zoom)' : 'Zoom Pinch'}</strong>: {language === 'ZH' ? '在地球框内滚动鼠标滚轮或在双指缩合，可微调地球物理放大幅度 (120 到 300px)，提供大局观或局域高精细节。' : 'Scroll inside the frame or pinch to zoom between 1.2x and 4.0x scales.'}
                    </li>
                    <li>
                      <strong>{language === 'ZH' ? '浮空3D信标点击' : 'Interactive 3D Floating Beacons'}</strong>: {language === 'ZH' ? '每个医疗中枢点由一个“底座同心椭圆 + 垂直拉高信标”构成，呈现立体悬索结构。点击高耸绿色或蓝色圆点，即可顺滑激活该中枢的常驻引流方案与床位空余报告。' : 'Each medical hub features an elevated 3D anchor and core dot. Tap any elevated colored pinpoint to draw focus to its specialized protocols.'}
                    </li>
                  </ul>
                </div>

                <div className="p-4.5 bg-blue-950/10 border border-blue-500/20 rounded-xl space-y-2">
                  <span className="font-semibold text-blue-300 block text-xs">🎯 {language === 'ZH' ? '全球三大胰腺外科中枢对焦坐标' : 'Focus Coordinates for Core Hubs'}</span>
                  <p className="text-[11px] text-zinc-400">
                    {language === 'ZH' 
                      ? '在左侧医院列表中，点击“上海中心”, “海德堡(Germany)” 或者 “约翰霍普金斯(USA)”，地球仪将执行顺长路径 Lerp 插值运镜，在 1.5s 内顺滑旋转该医疗中枢至屏幕中心。'
                      : 'Selecting "Shanghai Hub", "Heidelberg (Germany)", or "Johns Hopkins (USA)" activates an automated linear camera interpolation (LERP) sweeping the globe directly under our focus.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chapter 3: Targets and mutations */}
          {activeSegment === 'target' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <span className="text-[10px] text-purple-400 font-mono tracking-widest block uppercase font-bold">CHAPTER 03</span>
                <h3 className="text-xl md:text-2xl font-serif text-white mt-1">🧬 靶标洞察与特异基因匹配</h3>
              </div>

              <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                <p>
                  {language === 'ZH'
                    ? '胰腺导管腺癌（PDAC）常被称为“癌中之王”，主因是其具备极度密集的微环境以及高比例的 KRAS 基因常态突变。系统为此定制了“靶标矩阵”，提供全链路靶点关联数据。'
                    : 'Pancreatic Adenocarcinoma (PDAC) remains difficult due to intensive stromal reactions and near-ubiquitous KRAS driver mutations. Our Target Matrix correlates targeted therapies directly to genomic indicators.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-2">
                    <span className="text-zinc-200 font-semibold block text-xs">🧪 {language === 'ZH' ? '基因交叉自动契合' : 'Genomic Auto-Matching'}</span>
                    <p className="text-[11px] leading-relaxed">
                      {language === 'ZH'
                        ? '当在“精准病历”中包含突变（如 KRAS G12D、BRCA2），OSINT 学术主源将自动过滤所有不相干资讯，在头条显著展现专属匹配标记🧬并生成分析理由。'
                        : 'Entering KRAS G12D, BRCA1/2, or PALB2 in patient profile cues the global stream to auto-tag matching literature and clinical trials with specific affinity metrics.'}
                    </p>
                  </div>
                  <div className="p-4 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-2">
                    <span className="text-zinc-200 font-semibold block text-xs">💊 {language === 'ZH' ? '耐药与用药分期评估' : 'Resistance & Progression Analysis'}</span>
                    <p className="text-[11px] leading-relaxed">
                      {language === 'ZH'
                        ? '针对所输临床化疗用药方案（AG-白紫+吉西他滨或FOLFIRINOX五氟尿嘧啶联合方案），提供精准用药周期、敏感度折损评估和临床终止指标。'
                        : 'Assesses first-line clinical combinations (FOLFIRINOX or Gem/Nab-Paclitaxel) against therapeutic degradation milestones and secondary target progression.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-teal-950/10 border border-teal-555/20 rounded-xl space-y-1.5">
                  <span className="text-teal-400 font-semibold block">⚠️ {language === 'ZH' ? '临床匹配建议' : 'Clinical Suggestions'}</span>
                  <p className="text-[11px]">
                    {language === 'ZH'
                      ? '如果病历中提示 BRCA 突变，请重点研判 PARP 抑制剂（如奥拉帕利）相关的维持治疗数据，这在 OSINT 列表中有独立的高加权匹配度。'
                      : 'For verified BRCA-mutated or PALB2-deficient pancreatic lineages, prioritize investigating maintainer PARP inhibitors (such as Olaparib) detailed inside our localized stream.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chapter 4: Post-Op Drainage Care */}
          {activeSegment === 'nursing' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <span className="text-[10px] text-purple-400 font-mono tracking-widest block uppercase font-bold">CHAPTER 04</span>
                <h3 className="text-xl md:text-2xl font-serif text-white mt-1">🏥 居家引流冲洗与大出血回避抢救</h3>
              </div>

              <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                <p className="font-semibold text-rose-300">
                  {language === 'ZH'
                    ? '特别警告：胰腺术后吻合口瘘是致命危急重症，腐蚀性极富消化酶的胰液一旦漏出，将逐步蚕食临近的胃十二指肠动脉或脾动脉，引发致命性的喷射大出血！'
                    : 'CRITICAL ALERT: Post-operative pancreatic leaking is a severe condition. Amylase-rich digestive pancreatic fluid can erode adjacent gastroduodenal or splenic arteries, leading to sudden arterial hemorrhage!'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900 border border-white/10 rounded-xl space-y-1.5">
                    <span className="text-teal-400 font-bold block text-xs">🌀 {language === 'ZH' ? '高负压/双管冲洗流程' : 'Double-Cannula Flushing'}</span>
                    <p className="text-[11px] leading-relaxed">
                      {language === 'ZH'
                        ? '1. 双套管引流应接高负压吸引器，负压维持在 -0.02MPa 至 -0.04MPa。\n2. 每日用灭菌生理盐水 1000-2050ml 经冲洗管不间断缓慢滴入，维持入出量平衡。\n3. 密切监测流出液淀粉酶（高负压可使局部空腔形成稳定负压隔离，避免周围组织侵蚀）。'
                        : '1. Maintain negative pressure suction strictly between -0.02MPa and -0.04MPa.\n2. Infuse sterile saline continuous drip daily: 1000ml to 2000ml to maintain absolute fluid balance.\n3. Track effluent amylase values closely to verify localized fistula collapse.'}
                    </p>
                  </div>

                  <div className="p-4 bg-rose-950/20 border border-rose-900/30 rounded-xl space-y-1.5">
                    <span className="text-rose-400 font-bold block text-xs">🚨 {language === 'ZH' ? '大出血十五分钟生死时速' : 'Hemostatic 15-Minute Rule'}</span>
                    <p className="text-[11px] leading-relaxed">
                      {language === 'ZH'
                        ? '1. 哨兵出血：如引流管突然流出少量鲜红色血性液体（哨兵出血），表示大血管已经开始被胰液局部腐蚀，24h内随时发生喷射性破裂！\n2. 紧急体位：一旦发生管道内大量鲜血外流或呕血，让患者平躺，一人用手指大呼吸用力按压剑突下偏右（压迫腹腔干主干），另一人立刻拨打120。\n3. 一定要在15分钟内送达有急诊介入（GDA栓塞栓塞术）的中心！不要到没有介入条件的小医院。'
                        : '1. Sentinel Warning: Minor fresh-red leakage (sentinel bleed) signals early arterial wall degradation. Critical rupture risks peak within 24 hours.\n2. Emergency Posture: Lay patient fully flat, apply steady deep manual compression under the xiphoid process (abdominal trunk compression), and call paramedics immediately.\n3. Transport directly within 15 minutes to an interventional angiography-ready center for emergency coil embolization.'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
                  <span className="text-zinc-200 font-semibold block text-xs mb-1">{language === 'ZH' ? '引流液日常对齐参考表' : 'Effluent Color Cheat Sheet'}</span>
                  <table className="w-full text-[10.5px] border-collapse mt-2 text-zinc-400">
                    <thead>
                      <tr className="border-b border-white/10 text-zinc-300 font-medium">
                        <th className="text-left py-1.5">{language === 'ZH' ? '流出液色调' : 'Effluent Status'}</th>
                        <th className="text-left py-1.5">{language === 'ZH' ? '临床指代判定' : 'Clinical Diagnosis'}</th>
                        <th className="text-left py-1.5">{language === 'ZH' ? '处置策略规范' : 'Action Target'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="py-1.5 text-zinc-300 font-mono">1. Dry Straw (干稻草淡黄)</td>
                        <td className="py-1.5">{language === 'ZH' ? '术后正常腹腔生理淋巴液' : 'Normal lymphatic fluid'}</td>
                        <td className="py-1.5 text-emerald-400">{language === 'ZH' ? '安全观察' : 'Maintain suction'}</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-1.5 text-zinc-350 font-mono">2. Milky White (乳白/粉糜样)</td>
                        <td className="py-1.5">{language === 'ZH' ? '肠道淋巴管破损乳糜漏' : 'Chylous leak (dietary lipid)'}</td>
                        <td className="py-1.5 text-blue-400">{language === 'ZH' ? '无脂高蛋白膳食，密切关注' : 'Zero-fat diet'}</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="py-1.5 text-yellow-500 font-mono">3. Gold/Green (胆汁金黄/墨绿)</td>
                        <td className="py-1.5">{language === 'ZH' ? '胆肠吻合口发生胆漏' : 'Biliary leakage'}</td>
                        <td className="py-1.5 text-orange-400">{language === 'ZH' ? '负压引流充分，抗感染' : 'Local flushing'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 text-rose-500 font-mono">4. Bright Red (大量鲜红/洗肉水)</td>
                        <td className="py-1.5 font-bold text-rose-300">{language === 'ZH' ? '活动性胰周渗血/大血管破损' : 'Active major bleeding'}</td>
                        <td className="py-1.5 text-red-500 font-bold">{language === 'ZH' ? '15分钟立刻介入抢救！' : 'EMERGENCY ER CALL'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Chapter 5: Chatbot Assistant */}
          {activeSegment === 'chatbot' && (
            <div className="space-y-6">
              <div className="border-b border-white/5 pb-4">
                <span className="text-[10px] text-purple-400 font-mono tracking-widest block uppercase font-bold">CHAPTER 05</span>
                <h3 className="text-xl md:text-2xl font-serif text-white mt-1">👾 智能小胰宝助理交互策略</h3>
              </div>

              <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                <p>
                  {language === 'ZH'
                    ? '首页右下角的“小胰宝学术助手”并非简单的智能闲聊客服。它搭载了后端安全隔离的学术模型逻辑，具备检索全球胰腺尖端临床、理解病理分期指标、分析生存曲线与推算联合靶点用药敏感性的功能。'
                    : 'The floating AI chat icon activates are server-side scholarly proxy tool. This agent handles complex PubMed digest extraction and molecular resistance inquiries.'}
                </p>

                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-3">
                  <span className="font-semibold text-zinc-200 block text-xs">💡 {language === 'ZH' ? '推荐咒语/提示词对齐模板' : 'Affinity Prompt Templates'}</span>
                  
                  <div className="space-y-3 text-[11px] font-mono">
                    <div className="p-2.5 bg-[#070708] border border-white/5 rounded-lg space-y-1">
                      <span className="text-purple-400 font-bold block">{language === 'ZH' ? '场景 A: 英语文献速递' : 'A: Literature Digests'}</span>
                      <p className="text-zinc-500 select-all italic">
                        "{language === 'ZH' ? '请提取 2025-2026年针对胰腺导管腺癌 KRAS G12D 在 ClinicalTrials 登记的三期临床新药，并以 Markdown 表格对比。' : 'Extract 2025-2026 Phase III clinical programs for Pancreatic Adenocarcinoma focusing on KRAS inhibition and list in markdown table.'}"
                      </p>
                    </div>

                    <div className="p-2.5 bg-[#070708] border border-white/5 rounded-lg space-y-1">
                      <span className="text-purple-400 font-bold block">{language === 'ZH' ? '场景 B: 耐药演进分析' : 'B: Resistance Scenarios'}</span>
                      <p className="text-zinc-500 select-all italic">
                        "{language === 'ZH' ? '患者术后使用吉西他滨+白蛋白紫杉醇化疗出现进展，如果存在 BRCA2 突变，后续有哪些针对性序贯疗法推荐？' : 'Patient shows progression under Nab-Paclitaxel + Gemcitabine. If BRCA2-positive, outline targeted sequential treatments with citations.'}"
                      </p>
                    </div>

                    <div className="p-2.5 bg-[#070708] border border-white/5 rounded-lg space-y-1">
                      <span className="text-purple-400 font-bold block">{language === 'ZH' ? '场景 C: 引流淀粉酶异常分析' : 'C: Drainage Abnormality'}</span>
                      <p className="text-zinc-500 select-all italic">
                        "{language === 'ZH' ? '患者胰腺部分切除术后第5天，每日引流约 150ml straw 液偏浑浊，淀粉酶测得 5400 U/L。目前负压 -0.03MPa。这提示胰瘘级别是多少？怎么调整冲洗液？' : 'Patient post-op day 5 drainage 150ml cloudy, amylase 5400 U/L. Assure fistula grading and negative pressure suction guidelines.'}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-teal-950/10 border border-teal-500/20 p-4 rounded-xl">
                  <span className="text-teal-400 font-bold block text-xs flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 shrink-0 text-teal-400" />
                    {language === 'ZH' ? '一键匹配病历优势' : 'Integration Advantage'}
                  </span>
                  <p className="text-[11.5px] leading-relaxed text-zinc-400 mt-1">
                    {language === 'ZH'
                      ? '在对话开始前，如果先在“精准病历”菜单中录入诊断分期，对话助手会自动携带这些基础病史上下文。无需每次重复输入相同的病史，小胰宝将进行全自动化病理贴合诊疗。'
                      : 'Setting a patient profile allows the AI Scientist Chat to proactively carry mutational schemas as an implicit system instruction, saving you repetitive message construction.'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
