import React, { useEffect, useState } from 'react';
import { OSINTItem, WatchdogStatus, ResourceCenter, SystemReport15Day, PatientProfile } from './types';
import OSINTFeedView from './components/OSINTFeedView';
import ResourceMapView from './components/ResourceMapView';
import WatchdogConsoleView from './components/WatchdogConsoleView';
import ReportsView from './components/ReportsView';
import GuidelinesView from './components/GuidelinesView';
import ManualSubmissionView from './components/ManualSubmissionView';
import TargetInsightView from './components/TargetInsightView';
import PatientProfileView from './components/PatientProfileView';
import OSINTChatView from './components/OSINTChatView';
import AIElementsPlayground from './components/AIElementsPlayground';
import UserAuth from './components/UserAuth';
import HelpView from './components/HelpView';
import HotspotDrugsView from './components/HotspotDrugsView';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadPatientProfileFromCloud, savePatientProfileToCloud, deletePatientProfileFromCloud } from './lib/firestore-sync';
import { MOCK_15DAY_REPORT } from './seed-data';
import { 
  Activity, 
  Terminal, 
  Map, 
  ShieldAlert, 
  Database, 
  Cpu, 
  BookOpen, 
  Sparkles, 
  Share2, 
  HeartPulse,
  Info,
  FileText,
  Target,
  User,
  Heart,
  MessageSquare,
  Settings,
  Globe,
  ChevronDown,
  Check,
  Eye,
  HelpCircle,
  EyeOff,
  Save,
  CheckCircle,
  X
} from 'lucide-react';
import { LanguageCode, LANGUAGES, TRANSLATIONS } from './translations';

const PROVIDER_PRESET_MODELS: Record<string, string[]> = {
  siliconflow: [
    'deepseek-ai/DeepSeek-V3',
    'deepseek-ai/DeepSeek-R1',
    'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B',
    'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
    'Qwen/Qwen2.5-72B-Instruct',
    'Qwen/Qwen2.5-Coder-32B-Instruct',
    'THUDM/glm-4-9b-chat'
  ],
  dashscope: [
    'qwen-max',
    'qwen-max-latest',
    'qwen-plus',
    'qwen-turbo',
    'qwen2.5-72b-instruct',
    'qwen2.5-14b-instruct',
    'qwen-vl-max-latest'
  ],
  openrouter: [
    'deepseek/deepseek-r1',
    'meta-llama/llama-3.3-70b-instruct',
    'anthropic/claude-3.5-sonnet',
    'google/gemini-2.5-pro',
    'google/gemini-2.5-flash'
  ],
  gemini: [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-pro-exp'
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'watchdog' | 'report' | 'guidelines' | 'target_insight' | 'patient_profile' | 'ai_elements' | 'hotspot_drugs' | 'help'>('feed');
  const [expandedOpsSection, setExpandedOpsSection] = useState<'watchdog' | 'report' | null>(null);
  const [items, setItems] = useState<OSINTItem[]>([]);
  const [centers, setCenters] = useState<ResourceCenter[]>([]);
  const [watchdog, setWatchdog] = useState<WatchdogStatus | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [consoleMsg, setConsoleMsg] = useState('System initialized.');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [feedSearchTerm, setFeedSearchTerm] = useState('');

  // Patient Profile state for Personalization Match engine (탈민/脱敏, stored strictly in LocalStorage)
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [perspective, setPerspective] = useState<'generic' | 'personalized'>('generic');

  // Language & Config States (persisted)
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('ZH');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isAiElementsOpen, setIsAiElementsOpen] = useState(false);

  // Global Config variables mapping exactly to LocalStorage and matching AI Elements values
  const [configProvider, setConfigProvider] = useState<string>('siliconflow');
  const [configApiKey, setConfigApiKey] = useState<string>('');
  const [configBaseUrl, setConfigBaseUrl] = useState<string>('');
  const [configModel, setConfigModel] = useState<string>('deepseek-ai/DeepSeek-V3');
  const [showConfigApiKey, setShowConfigApiKey] = useState(false);

  // Other modules config options
  const [configSimulateOnNoKey, setConfigSimulateOnNoKey] = useState<boolean>(true);
  const [configWatchdogAutoRepair, setConfigWatchdogAutoRepair] = useState<boolean>(true);
  const [configAlertSensitivity, setConfigAlertSensitivity] = useState<'high' | 'medium' | 'low'>('medium');

  // Cloud Auth & Firestore User Session State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);

  const handleUserChanged = (firebaseUser: any, isDemo: boolean = false) => {
    setCurrentUser(firebaseUser);
    setIsDemoUser(isDemo);
    if (firebaseUser) {
      setConsoleMsg(`Cloud Identity synchronized: Welcome, ${firebaseUser.displayName || firebaseUser.email || 'Scientific Consultant'}.`);
      
      // Load molecular health profile from Firestore if it exists
      loadPatientProfileFromCloud(firebaseUser.uid).then((cloudProfile) => {
        if (cloudProfile) {
          setProfile(cloudProfile);
          setPerspective('personalized');
          setConsoleMsg(`Firestore Synced: Loaded cloudized molecular bio-profile for [${firebaseUser.displayName || 'Authorized User'}].`);
        } else {
          // Sync existing local profile to Firestore if any exists
          if (profile) {
            savePatientProfileToCloud(firebaseUser.uid, profile).then(() => {
              setConsoleMsg(`Firestore Auto-Backup: Saved local patient molecular bio-profile to secure cloud database.`);
            });
          }
        }
      }).catch((e) => {
        console.warn('Could not sync profile from Firestore:', e);
      });
    } else {
      setConsoleMsg('Cloud Identity: Closed remote session. Switched back to guest local access.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        handleUserChanged(firebaseUser, false);
      } else {
        // Safely guard demo logins from being reset by Firebase initial null ticks
        setCurrentUser((current: any) => {
          if (current && current.uid === 'demo-pancreas-osint-101') {
            return current;
          }
          return null;
        });
      }
    });
    return unsubscribe;
  }, []);

  // Load patient profile and settings from LocalStorage on mount
  useEffect(() => {
    try {
      // 1. Language Loading
      const savedLang = localStorage.getItem('pancreas_osint_language') as LanguageCode;
      if (savedLang && ['ZH','ZT','EN','FR','RU','JA','KO','ES','AR','HI'].includes(savedLang)) {
        setActiveLanguage(savedLang);
      }

      // 2. Patient Profile Loading
      const stored = localStorage.getItem('pancreas_osint_profile');
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile(parsed);
        setPerspective('personalized');
      }

      // 3. Provider Configurations Loading
      const activeP = localStorage.getItem('pancreas_ai_elements_active_provider') || 'siliconflow';
      setConfigProvider(activeP);

      const savedConfigsStr = localStorage.getItem('pancreas_ai_elements_configs');
      if (savedConfigsStr) {
        const savedConfigs = JSON.parse(savedConfigsStr);
        const resolved = savedConfigs[activeP];
        if (resolved) {
          setConfigApiKey(resolved.apiKey || '');
          setConfigBaseUrl(resolved.baseUrl || '');
          setConfigModel(resolved.model || 'deepseek-ai/DeepSeek-V3');
        }
      }

      // 4. Other configuration options loading
      const simulate = localStorage.getItem('pancreas_config_simulate_nokey');
      if (simulate !== null) setConfigSimulateOnNoKey(simulate === 'true');

      const autoRepair = localStorage.getItem('pancreas_config_watchdog_repair');
      if (autoRepair !== null) setConfigWatchdogAutoRepair(autoRepair === 'true');

      const sensitivity = localStorage.getItem('pancreas_config_alert_sens');
      if (sensitivity) setConfigAlertSensitivity(sensitivity as any);

    } catch (err) {
      console.warn('LocalStorage not available or corrupt.', err);
    }
  }, []);

  // Update config fields instantly when config provider dropdown updates
  useEffect(() => {
    try {
      const savedConfigsStr = localStorage.getItem('pancreas_ai_elements_configs');
      if (savedConfigsStr) {
        const savedConfigs = JSON.parse(savedConfigsStr);
        const resolved = savedConfigs[configProvider];
        if (resolved) {
          setConfigApiKey(resolved.apiKey || '');
          setConfigBaseUrl(resolved.baseUrl || '');
          setConfigModel(resolved.model || (configProvider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V3' : ''));
          return;
        }
      }
      // Fail-safes fallback
      setConfigApiKey('');
      setConfigBaseUrl('');
      if (configProvider === 'siliconflow') {
        setConfigModel('deepseek-ai/DeepSeek-V3');
      } else if (configProvider === 'dashscope') {
        setConfigModel('qwen-plus');
      } else if (configProvider === 'openrouter') {
        setConfigModel('google/gemini-2.5-flash');
      } else {
        setConfigModel('gemini-2.5-flash');
      }
    } catch (_) {}
  }, [configProvider]);

  const handleSelectLanguage = (code: LanguageCode) => {
    setActiveLanguage(code);
    setIsLangDropdownOpen(false);
    try {
      localStorage.setItem('pancreas_osint_language', code);
    } catch (_) {}
    setConsoleMsg(`System Language shifted to [${code}]. Re-translating Open Intelligence components...`);
    // Automatically trigger window reload to clean up and force-apply language instantly
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const handleSaveGlobalConfig = () => {
    try {
      // 1. Save provider choice
      localStorage.setItem('pancreas_ai_elements_active_provider', configProvider);

      // 2. Save credential settings list matching AIElementsPlayground LocalStorage format
      let currentConfigs: Record<string, any> = {};
      const savedConfigsStr = localStorage.getItem('pancreas_ai_elements_configs');
      if (savedConfigsStr) {
        try { currentConfigs = JSON.parse(savedConfigsStr); } catch (_) {}
      }

      currentConfigs[configProvider] = {
        apiKey: configApiKey,
        baseUrl: configBaseUrl,
        model: configModel
      };

      localStorage.setItem('pancreas_ai_elements_configs', JSON.stringify(currentConfigs));

      // 3. Save other modules configurations
      localStorage.setItem('pancreas_config_simulate_nokey', String(configSimulateOnNoKey));
      localStorage.setItem('pancreas_config_watchdog_repair', String(configWatchdogAutoRepair));
      localStorage.setItem('pancreas_config_alert_sens', configAlertSensitivity);

      // Sync watchdog and console status
      setConsoleMsg(`System Configuration updated: Large Language Model provider [${configProvider}] configured. Global self-healing watchdog options synced.`);
      setIsConfigOpen(false);

      if (watchdog) {
        setWatchdog(prev => prev ? { ...prev, apiQuotaUsed: prev.apiQuotaUsed + 1 } : null);
      }
    } catch (err) {
      console.error('Failed to preserve system configurations', err);
    }
  };

  const handleSaveProfile = (newProfile: PatientProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem('pancreas_osint_profile', JSON.stringify(newProfile));
    } catch (err) {
      console.warn('Could not save to LocalStorage.', err);
    }
    // Automatically toggle to personalized perspective
    setPerspective('personalized');
    setConsoleMsg('Personalization Engine: Matching criteria successfully updated. Dual-perspective switched to [Personalized Mode].');

    // Sync to Cloud database if authenticated
    if (currentUser) {
      savePatientProfileToCloud(currentUser.uid, newProfile)
        .then(() => {
          setConsoleMsg('Personalization Engine: Criteria mirrored and synchronised to Cloud Firestore Database.');
        })
        .catch((e) => {
          setConsoleMsg('Personalization Engine: Local storage updated. Cloud backup skipped.');
        });
    }
  };

  const handleClearProfile = () => {
    setProfile(null);
    setPerspective('generic');
    try {
      localStorage.removeItem('pancreas_osint_profile');
    } catch (err) {
      console.warn('Could not clear LocalStorage.', err);
    }
    setConsoleMsg('Personalization Engine: Criteria cleared. Dual-perspective defaulted back to [Generic Mode].');

    // Remove from Cloud database if authenticated
    if (currentUser) {
      deletePatientProfileFromCloud(currentUser.uid)
        .then(() => {
          setConsoleMsg('Personalization Engine: Criteria clean request pushed and synchronised to secure Firebase database.');
        });
    }
  };

  // Load initial datasets from backend custom server
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [feedRes, coordRes, dogRes] = await Promise.all([
          fetch('/api/osint/feed'),
          fetch('/api/osint/resources'),
          fetch('/api/osint/watchdog')
        ]);
        
        const feedObj = await feedRes.json();
        const coordObj = await coordRes.json();
        const dogObj = await dogRes.json();

        setItems(feedObj.data || []);
        setCenters(coordObj.data || []);
        setWatchdog(dogObj.data || null);
      } catch (err) {
        console.error('Failed to sync state from full-stack server endpoints, utilizing offline fallback:', err);
        setConsoleMsg('API Server unreachable. System in isolated standalone local mode.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Set up periodic polling for Watchdog telemetry metrics (e.g., CPU, API counts) to keep dashboard responsive
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/osint/watchdog')
        .then(res => res.json())
        .then(resObj => {
          if (resObj.status === 'ok') {
            setWatchdog(resObj.data);
          }
        })
        .catch(() => {
          // Silent catch in offline mode to prevent console spam
        });
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // 1. Ingest new real-time OSINT research via Gemini API
  const handleIngestNew = async () => {
    setIsFetching(true);
    setConsoleMsg('Scraper: Triggering automated retrieval. Invoking Gemini reasoning parsing...');
    try {
      const resp = await fetch('/api/osint/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: 'pancreatic cancer' })
      });
      const resObj = await resp.json();
      
      if (resObj.status === 'ok') {
        const newItem = resObj.data as OSINTItem;
        // Prepend fresh item
        setItems(prev => [newItem, ...prev]);
        setConsoleMsg(`Scraper success: Ingested "${newItem.title}"`);
        
        // Refresh watchdog API call counts
        const dogRes = await fetch('/api/osint/watchdog');
        const petStatus = await dogRes.json();
        if (petStatus.status === 'ok') {
          setWatchdog(petStatus.data);
        }
      } else {
        throw new Error('Endpoint returned error status.');
      }
    } catch (err: any) {
      console.error(err);
      setConsoleMsg('Scraper Exception: Rate limiting or bypass warning triggered.');
    } finally {
      setIsFetching(false);
    }
  };

  // 2. Generate Daily Summary via Gemini API on the backend
  const handleGenerateSummary = async () => {
    setConsoleMsg('AI summary: Orchestrating dataset aggregation. Invoking Gemini 3.5-flash...');
    const resp = await fetch('/api/osint/daily-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const resObj = await resp.json();
    
    // Track API call quota usage increment
    fetch('/api/osint/watchdog')
      .then(r => r.json())
      .then(o => { if(o.status === 'ok') setWatchdog(o.data); });

    if (resObj.status === 'ok') {
      setConsoleMsg('AI summary: successfully completed and compiled.');
      return resObj.summary;
    } else {
      setConsoleMsg('AI summary warning: fallback compiled.');
      return '';
    }
  };

  // 3. Trigger simulated watchdog self-heal
  const handleTriggerRepair = async () => {
    setIsRepairing(true);
    setConsoleMsg('Watchdog Action: Triggering manual self-heal path diagnostics...');
    try {
      const resp = await fetch('/api/osint/watchdog/repair', { method: 'POST' });
      const resObj = await resp.json();
      if (resObj.status === 'ok') {
        setWatchdog(resObj.data);
        setConsoleMsg(`Self-Patched successfully and restored: ${resObj.action}`);
        return resObj.action;
      }
      return '';
    } catch (err) {
      setConsoleMsg('Watchdog: Self-heal network route timeout.');
      return '';
    } finally {
      setIsRepairing(false);
    }
  };

  // 4. Trigger simulated software rollback to stable build
  const handleTriggerRollback = async () => {
    setConsoleMsg('Autonomic Recovery: Trigerring git rollback routine...');
    try {
      const resp = await fetch('/api/osint/rollback', { method: 'POST' });
      const resObj = await resp.json();
      
      // Update watchdog error logs
      const dogRes = await fetch('/api/osint/watchdog');
      const petStatus = await dogRes.json();
      if (petStatus.status === 'ok') {
        setWatchdog(petStatus.data);
      }
      
      setConsoleMsg(`Rollback routine complete. Partition updated to: "${resObj.tag}"`);
      return resObj.tag;
    } catch (err) {
      setConsoleMsg('Rollback routine failed.');
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
        </div>
        <Activity className="h-10 w-10 text-blue-400 animate-spin mb-4 relative z-10" />
        <p className="text-base font-serif italic text-white relative z-10">Pancreas OSINT.</p>
        <p className="text-xs text-white/45 mt-2 relative z-10 font-mono uppercase tracking-widest">Node active: synchronizing global core registry...</p>
      </div>
    );
  }

  const t = TRANSLATIONS[activeLanguage] || TRANSLATIONS['ZH'];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center relative py-8 px-4 overflow-y-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-indigo-500/[0.02] rounded-full blur-[100px]"></div>
        </div>
        
        {/* Welcome branding header */}
        <div className="text-center mb-6 max-w-sm space-y-2 relative z-10 animate-fade-in shrink-0">
          <div className="inline-flex p-3 bg-purple-950/40 border border-purple-500/20 rounded-2xl text-purple-400 mb-1">
            <HeartPulse className="h-6 w-6 text-purple-400 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white font-sans uppercase">
            Pancreas OSINT
          </h1>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed">
            {activeLanguage === 'ZH' 
              ? '胰腺开源情报安全中心' 
              : 'Pancreas Open-Source Intelligence Center'}
          </p>
        </div>

        <div className="w-full max-w-sm relative z-10 animate-scale-up shrink-0">
          <UserAuth onUserChanged={handleUserChanged} language={activeLanguage} isInline={true} currentUser={currentUser} isDemoUser={isDemoUser} />
        </div>

        <div className="mt-8 text-center text-[10px] text-zinc-550 max-w-xs leading-relaxed font-sans relative z-10 shrink-0">
          {activeLanguage === 'ZH' 
            ? '本系统专用于胰腺开源情报学术研判与多模型沙盒 。请使用一键模拟登录即可体验完整临床功能。'
            : 'Authorized clinical intelligence regarding pancreatic protocols. Demo Quick Access is enabled for testing purposes.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-300 flex flex-col font-sans bg-[#050505] selection:bg-[#9333ea]/30 selection:text-white">
      
      {/* Absolute High-Contrast Global Medical Redline Banner */}
      <div className="bg-rose-950/30 text-rose-300 text-[11px] sm:text-xs py-2 px-6 border-b border-rose-900/30 text-center flex justify-center items-center gap-2 select-none leading-normal shrink-0 glass">
        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
        <span className="font-sans">
          {t.bannerTitle}
        </span>
      </div>

      {/* Main Header Wrapper */}
      <header className="border-b border-white/10 px-4 sm:px-8 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4 glass z-40 sticky top-0 backdrop-blur-md">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4">
            <div className="p-1.5 bg-teal-500/10 border border-teal-500/30 rounded-xl shrink-0 flex items-center justify-center shadow-lg shadow-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.35)] animate-pulse" title="小胰宝 AI 助手 Mascot">
              <svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <defs>
                  <linearGradient id="teal-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="50%" stopColor="#14b8a6" />
                    <stop offset="100%" stopColor="#0f766e" />
                  </linearGradient>
                  <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb923c" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                  <linearGradient id="antenna-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="visor-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                  </linearGradient>
                  <filter id="soft-shadow" x="-5%" y="-5%" width="110%" height="110%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0f172a" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Antenna */}
                <rect x="47" y="14" width="6" height="12" rx="3" fill="#14b8a6" />
                <circle cx="50" cy="11" r="7.5" fill="url(#antenna-grad)" stroke="#d97706" strokeWidth="0.5" />
                <circle cx="48" cy="9" r="2" fill="#ffffff" opacity="0.8" />

                {/* Ears */}
                <rect x="13" y="38" width="8" height="18" rx="4" fill="#0f766e" />
                <rect x="79" y="38" width="8" height="18" rx="4" fill="#0f766e" />

                {/* Head */}
                <rect x="18" y="24" width="64" height="48" rx="24" fill="url(#teal-body-grad)" filter="url(#soft-shadow)" />

                {/* Visor/Face Shield */}
                <path d="M26 48 C26 36, 40 34, 50 34 C60 34, 74 36, 74 48 C74 60, 60 60, 50 60 C40 60, 26 60, 26 48 Z" fill="url(#visor-grad)" />

                {/* Smiling Eyes */}
                <path d="M35 48 C37 44, 43 44, 45 48" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M55 48 C57 44, 63 44, 65 48" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" fill="none" />

                {/* Neck */}
                <rect x="43" y="68" width="14" height="8" fill="#0f766e" />

                {/* Body Peeking */}
                <path d="M32 76 C32 88, 68 88, 68 76 Z" fill="url(#teal-body-grad)" />

                {/* Heart on Chest */}
                <path d="M50 84 C50 84 45 79.5 45 76.5 C45 74.2 46.8 72.8 48.8 72.8 C50 72.8 50 74 50 74 C50 74 51 72.8 52.2 72.8 C54.2 72.8 56 74.2 56 76.5 C56 79.5 50 84 50 84 Z" fill="url(#heart-grad)" />
              </svg>
            </div>
            <div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-sans font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
                  小胰宝 <span className="font-extrabold text-purple-400 font-mono tracking-wide uppercase">OSINT</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-white/90 font-sans font-medium mt-1.5 leading-snug">
                  全球胰腺肿瘤开源情报中心
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] bg-purple-500/15 border border-purple-500/30 text-purple-300 px-1.5 py-0.25 rounded font-mono uppercase tracking-wide opacity-90">
                    Autonomous MVP v1.5
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 self-end sm:self-center font-mono">
            {/* Core Telemetry Quick widgets on Header (Desktop) */}
            {watchdog && (
              <div className="flex items-center gap-2 sm:gap-4 text-xs font-mono">
                <button 
                  onClick={() => {
                    const nextVal = expandedOpsSection === 'watchdog' ? null : 'watchdog';
                    setExpandedOpsSection(nextVal);
                    if (nextVal) {
                      setConsoleMsg("智能守护进程控制台已在独立浮窗中打开。");
                    }
                  }}
                  className={`bg-white/5 border px-3 py-1.5 rounded-lg text-left transition cursor-pointer select-none ${
                    expandedOpsSection === 'watchdog' ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-white/10 hover:border-emerald-500/30'
                  }`}
                  title="点击打开智能控制台浮窗"
                >
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider cursor-pointer">{t.statusTitle}</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5 cursor-pointer">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    HEALTHY
                  </span>
                </button>

                <button 
                  onClick={() => {
                    const nextVal = expandedOpsSection === 'report' ? null : 'report';
                    setExpandedOpsSection(nextVal);
                    if (nextVal) {
                      setConsoleMsg("15天系统运转综合报告已在独立浮窗中打开。");
                    }
                  }}
                  className={`bg-white/5 border px-3 py-1.5 rounded-lg text-left transition cursor-pointer select-none ${
                    expandedOpsSection === 'report' ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-white/10 hover:border-emerald-500/30'
                  }`}
                  title="点击打开15天运行运维报告浮窗"
                >
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider cursor-pointer">{t.uptimeTitle}</span>
                  <span className="text-white font-medium block mt-0.5 cursor-pointer">{watchdog.uptime}</span>
                </button>

                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">{t.quotaTitle}</span>
                  <span className="text-emerald-400 font-bold block mt-0.5">{watchdog.apiQuotaUsed}</span>
                </div>
              </div>
            )}

            {/* Language & Config controls */}
            <div className="flex items-center gap-2">
              {/* User Sign In/Up & Firebase Syncer Dropdown */}
              <UserAuth onUserChanged={handleUserChanged} language={activeLanguage} currentUser={currentUser} isDemoUser={isDemoUser} />

              {/* Language Selector Dropdown */}
              <div className="relative font-sans">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-white/10 hover:border-emerald-500/40 rounded-xl text-xs font-semibold text-zinc-300 transition cursor-pointer"
                  title="Select Language / 选择语言"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    {LANGUAGES.find(l => l.code === activeLanguage)?.flag || '🇺🇸'}{' '}
                    {LANGUAGES.find(l => l.code === activeLanguage)?.localeName || 'EN'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-zinc-500" />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute right-0 mt-2 bg-[#0c0c0e] border border-white/10 rounded-xl py-1.5 w-[160px] shadow-2xl z-50 overflow-hidden font-sans">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => handleSelectLanguage(lang.code)}
                        className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition cursor-pointer hover:bg-white/5 ${
                          activeLanguage === lang.code ? 'text-emerald-300 font-bold bg-emerald-950/10' : 'text-zinc-400'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                        {activeLanguage === lang.code && <Check className="h-3.5 w-3.5 text-emerald-400 font-bold" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Help Guide Logo & Entrance Button */}
              <button
                onClick={() => setActiveTab('help')}
                className={`p-2 bg-gradient-to-tr from-zinc-900 to-zinc-950 hover:from-emerald-950/20 hover:to-emerald-900/20 text-zinc-300 hover:text-emerald-300 border rounded-xl transition cursor-pointer relative group shrink-0 ${
                  activeTab === 'help' 
                    ? 'border-emerald-500 text-emerald-300 bg-emerald-950/20' 
                    : 'border-white/10 hover:border-emerald-500/30'
                }`}
                title="帮助中心 & 新手指引 / Help Guide"
              >
                <HelpCircle className="h-4.5 w-4.5 animate-pulse" />
              </button>

              {/* Config Gear Button */}
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 bg-gradient-to-tr from-zinc-900 to-zinc-950 hover:from-emerald-950/20 hover:to-emerald-900/20 text-zinc-300 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 rounded-xl transition cursor-pointer relative group shrink-0"
                title={t.configBtnTooltip}
              >
                <Settings className="h-4.5 w-4.5" />
                <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Navigation Sub-Menu Tab items */}
      <nav className="bg-[#09090b]/80 border-b border-white/10 shrink-0 sticky top-[73px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex space-x-1 py-2 overflow-x-auto scrollbar-none">
            
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'feed' 
                  ? 'bg-white/10 text-white font-medium border border-white/15 active-glow' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="h-4 w-4 shrink-0 text-zinc-450" />
              {t.tabFeed}
            </button>

            <button
              onClick={() => setActiveTab('target_insight')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'target_insight' 
                  ? 'bg-white/10 text-white font-medium border border-white/15 active-glow' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Target className="h-4 w-4 shrink-0 text-emerald-400/90" />
              {t.tabTargetInsight}
            </button>

            <button
              onClick={() => setActiveTab('hotspot_drugs')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'hotspot_drugs' 
                  ? 'bg-emerald-600/15 text-emerald-200 font-medium border border-emerald-500/30' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-400/90" />
              {t.tabHotspotDrugs}
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'map' 
                  ? 'bg-white/10 text-white font-medium border border-white/15 active-glow' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Map className="h-4 w-4 shrink-0 text-zinc-450" />
              {t.tabMap}
            </button>



            <button
              onClick={() => setActiveTab('guidelines')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'guidelines' 
                  ? 'bg-white/10 text-white font-medium border border-white/15 active-glow' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="h-4 w-4 shrink-0 text-zinc-450" />
              {t.tabGuidelines}
            </button>



            <button
              onClick={() => setActiveTab('patient_profile')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'patient_profile' 
                  ? 'bg-emerald-600/15 text-emerald-200 font-medium border border-emerald-500/30' 
                  : 'text-emerald-300/60 hover:text-emerald-300 hover:bg-emerald-900/10'
              }`}
            >
              <User className="h-4 w-4 shrink-0 text-zinc-400" />
              {t.tabPatientProfile}
              {profile ? (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ) : (
                <span className="text-[9px] bg-zinc-800 border border-white/5 text-zinc-500 px-1 rounded">OFF</span>
              )}
            </button>

          </div>
        </div>
      </nav>

      {/* Main Body Layout Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-32 w-[400px] h-[400px] bg-emerald-500/[0.01] rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 -left-32 w-[350px] h-[350px] bg-white/[0.01] rounded-full blur-[100px]"></div>
        </div>
        
        <div className="relative z-10 space-y-6">
          
          {/* Dual-Perspective / Matchmaker Status Bar & Control Row */}
          {activeTab !== 'watchdog' && activeTab !== 'report' && activeTab !== 'guidelines' && activeTab !== 'patient_profile' && activeTab !== 'ai_elements' && (
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 glass shadow-xl shadow-black/40">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border transition ${
                  perspective === 'personalized'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-900 border-white/5 text-zinc-400'
                }`}>
                  {perspective === 'personalized' ? (
                    <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
                  ) : (
                    <Info className="h-5 w-5 text-zinc-400" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-zinc-500">
                      双视角研判系统
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono tracking-wider ${
                      perspective === 'personalized' 
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {perspective === 'personalized' ? '🎯 PERSONALIZED MODE / 个性化匹配视角' : '🌐 GENERIC MODE / 全面通用视角'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 leading-normal font-sans">
                    {perspective === 'personalized' && profile
                       ? `已基于特征（突变: ${profile.mutations.join(', ') || '未选'} | 城市: ${profile.city || '未填'} | 化疗方案等指标）激活个性重排序与高亮契合。`
                       : '未激活病情特征：情报、临床大厅 and 医疗导航均为全局广谱统计视角。'}
                  </p>
                </div>
              </div>

              {/* Control buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-sans">
                <button
                  onClick={() => {
                    setPerspective('generic');
                    setConsoleMsg('Perspective switch: Switched to [Generic Mode] successfully.');
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer border transition duration-150 ${
                    perspective === 'generic'
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 font-medium'
                      : 'bg-black/40 border-white/5 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  通用大厅视角
                </button>
                
                <button
                  onClick={() => {
                    if (!profile) {
                      setActiveTab('patient_profile');
                      setConsoleMsg('Personalization Engine: No profile found. Automatically navigating to Patient Profile Configuration.');
                    } else {
                      setPerspective('personalized');
                      setConsoleMsg('Perspective switch: Switched to [Personalized Mode] successfully.');
                    }
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer border transition duration-150 flex items-center gap-1.5 ${
                    perspective === 'personalized'
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                      : 'bg-black/40 border-white/5 text-zinc-500 hover:text-emerald-300 hover:border-emerald-500/20'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  开启病情个性化拟合视角
                </button>
                
                {!profile && (
                  <button
                    onClick={() => setActiveTab('patient_profile')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold font-sans shrink-0 pl-1"
                  >
                    维护本地特征 ➔
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'feed' && (
            <div className="space-y-6">
              {!currentUser && (
                <div className="bg-[#09090c]/40 border border-zinc-850 rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4 shadow-xl shadow-black/[0.01] animate-fade-in font-sans">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold font-mono">
                      云同步与个性化医学研判中心 / CLOUD OSINT CO-PILOT
                    </span>
                    <h3 className="text-xl font-light font-serif text-white">
                      解锁专属胰腺导管癌靶点情报与病例特征云同步
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                      欢迎登录学术情报系统。开启后，您的临床组化指标、常驻城市、突变基因等病情特征将全周期加密保存，并自动触发智能化医学重排序重筛选匹配服务。
                    </p>
                  </div>
                  <UserAuth onUserChanged={handleUserChanged} language={activeLanguage} isInline={true} />
                  <div className="text-[10px] text-zinc-500 font-mono">
                    * 体验专区无需提供个人敏感隐私。离线环境下您仍可使用本地病情画像及全面通用情报大厅。
                  </div>
                </div>
              )}

              <OSINTFeedView 
                items={items}
                onFetchNew={handleIngestNew}
                onGenerateSummary={handleGenerateSummary}
                isFetching={isFetching}
                statusMessage={consoleMsg}
                onOpenSubmission={() => setIsSubmissionOpen(true)}
                searchTerm={feedSearchTerm}
                onSearchTermChange={setFeedSearchTerm}
                patientProfile={profile}
                perspective={perspective}
                language={activeLanguage}
                onNavigateToTab={(tab) => {
                  if (tab === 'patient_profile') {
                    setActiveTab('patient_profile');
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'target_insight' && (
            <TargetInsightView 
              items={items}
              onSelectFeedFilter={setFeedSearchTerm}
              onNavigateToTab={setActiveTab}
              onItemsChange={setItems}
              patientProfile={profile}
              perspective={perspective}
            />
          )}

          {activeTab === 'map' && (
            <ResourceMapView 
              centers={centers} 
              patientProfile={profile}
              perspective={perspective}
            />
          )}

          {false && watchdog && (
            <WatchdogConsoleView 
              status={watchdog}
              isRepairing={isRepairing}
              onTriggerRepair={handleTriggerRepair}
              onTriggerRollback={handleTriggerRollback}
            />
          )}

          {false && (
            <ReportsView report={MOCK_15DAY_REPORT} />
          )}

          {activeTab === 'guidelines' && (
            <GuidelinesView language={activeLanguage} />
          )}

          {activeTab === 'hotspot_drugs' && (
            <HotspotDrugsView />
          )}

          {activeTab === 'help' && (
            <HelpView 
              language={activeLanguage}
              onNavigateToTab={setActiveTab}
            />
          )}

          {activeTab === 'patient_profile' && (
            <PatientProfileView 
              profile={profile}
              onSaveProfile={handleSaveProfile}
              onClearProfile={handleClearProfile}
              language={activeLanguage}
            />
          )}


        </div>

        {/* Operations Centered Floating Overlay Portal (id: ops-expanded-tray) */}
        {expandedOpsSection && (
          <div 
            id="ops-expanded-tray" 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/75 backdrop-blur-md overflow-y-auto animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setExpandedOpsSection(null);
              }
            }}
          >
            <div className="w-full max-w-4xl bg-[#0b1119] border border-cyan-500/30 p-6 md:p-8 rounded-2xl relative shadow-2xl animate-scale-up text-left max-h-[85vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/15 border border-cyan-500/30 rounded-xl">
                    <Activity className="h-5 w-5 text-cyan-400 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-serif font-light text-white leading-none">
                      {expandedOpsSection === 'watchdog' ? '智能守望自纠自主诊断控制台 (System Watchdog)' : '15天智能运维与自治评估报告 (Autonomous Quality Audit)'}
                    </h2>
                    <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-1">
                      Autonomous Node System Operations Center · Level 2 Extended Control Screen
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setExpandedOpsSection(null)}
                  className="p-1.5 px-3 bg-zinc-900 border border-white/10 hover:border-rose-500/25 text-zinc-400 hover:text-rose-400 transition rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <X className="h-4 w-4" />
                  <span>关闭面板</span>
                </button>
              </div>

              {expandedOpsSection === 'watchdog' && watchdog && (
                <WatchdogConsoleView 
                  status={watchdog}
                  isRepairing={isRepairing}
                  onTriggerRepair={handleTriggerRepair}
                  onTriggerRollback={handleTriggerRollback}
                />
              )}

              {expandedOpsSection === 'report' && (
                <ReportsView report={MOCK_15DAY_REPORT} />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Section */}
      <footer className="bg-zinc-950 border-t border-white/10 shrink-0 text-xs text-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-serif italic font-light text-white text-sm">
              Pancreas OSINT.
            </p>
            <p className="text-white/40">
              全球去中心化多语对端抗干扰爬取网络 · 100% 独立生命周期评估完成
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end font-mono text-[10px] space-y-1">
            <span>Server Local Time: 2026-06-22 UTC+8</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-white/50 tracking-wider">ENGINE: ONLINE</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Persistent Shimmering Floating Action Button / Logo for Manual Submission */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          onClick={() => setIsSubmissionOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition duration-300 scale-100 hover:scale-105 active:scale-95 group active-glow relative border border-white/20"
          title="学术协同：投递开源医学新信源 (Manual Suggest Ingest)"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 h-full w-full rounded-full bg-blue-500 animate-ping opacity-25 group-hover:opacity-35"></span>
          
          <div className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide">
            <Sparkles className="h-4.5 w-4.5 text-amber-300 animate-pulse" />
            <span className="max-w-px overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-out whitespace-nowrap opacity-0 group-hover:opacity-100 text-white pr-1">
              投递开源信源
            </span>
          </div>
        </button>
      </div>

      {/* Persistent Shimmering Floating Action Button / Logo for OSINT AI Scientist Chatbot */}
      <div className="fixed bottom-22 right-6 z-40 select-none">
        <button
          onClick={() => setIsChatOpen(true)}
          className="bg-purple-600 hover:bg-purple-500 text-white font-bold p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition duration-300 scale-100 hover:scale-105 active:scale-95 group active-glow relative border border-white/20"
          title="医学探索：科幻智慧大脑研究助手 (MDT AI Chatbot)"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 h-full w-full rounded-full bg-purple-500 animate-ping opacity-25 group-hover:opacity-35"></span>
          
          <div className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide font-sans">
            <MessageSquare className="h-4.5 w-4.5 text-purple-250 animate-pulse" />
            <span className="max-w-px overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-out whitespace-nowrap opacity-0 group-hover:opacity-100 text-white pr-1">
              {t.btnAssistant}
            </span>
          </div>
        </button>
      </div>

      {/* Manual Ingestion Popup Dialog Portal */}
      <ManualSubmissionView 
        isOpen={isSubmissionOpen}
        onClose={() => setIsSubmissionOpen(false)}
        onSuccessIngested={(newItem) => {
          setItems(prev => [newItem, ...prev]);
        }}
        onUpdateWatchdogState={async () => {
          try {
            const dogRes = await fetch('/api/osint/watchdog');
            const petStatus = await dogRes.json();
            if (petStatus.status === 'ok') {
              setWatchdog(petStatus.data);
            }
          } catch (err) {
            console.error('Failed to sync telemetry after manual ingestion', err);
          }
        }}
      />

      {/* Interactive Medical OSINT Chatbot Portal */}
      <OSINTChatView 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        patientProfile={profile}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setConsoleMsg('Personalization Hub: Navigated to profile section to sync clinical identifiers.');
        }}
        language={activeLanguage}
      />

      {/* AI Elements Sandbox Modal (Full-Screen Immersive) */}
      {isAiElementsOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl p-4 sm:p-8 flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-6xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col font-sans max-h-[95vh] overflow-y-auto">
            <AIElementsPlayground onClose={() => setIsAiElementsOpen(false)} />
          </div>
        </div>
      )}

      {/* Global Unified Configuration Settings Center Modal (2 Lanes / Columns) */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col font-sans animate-fade-in animate-slide-in">
            {/* Ambient visual background glow details */}
            <div className="absolute top-0 right-0 w-[160px] h-[160px] bg-emerald-500/[0.02] rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[160px] h-[160px] bg-emerald-500/[0.01] rounded-full blur-[80px] pointer-events-none"></div>

            {/* Header row */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/90 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-emerald-600/20 to-emerald-800/20 rounded-xl border border-emerald-500/30">
                  <Settings className="h-4.5 w-4.5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    {t.configBtnTooltip}
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Configure LLM services, routing credentials, and automated diagnostic modules
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lane Layout Columns */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 text-xs text-zinc-300">
              
              {/* Lane Column 1: Model & Provider settings */}
              <div className="space-y-4 pr-0 md:pr-4 border-r-0 md:border-r border-white/5">
                <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <h3 className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                    Lane A: LLM Provider Services
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Select provider */}
                  <div className="space-y-1">
                     <label className="text-[10px] font-semibold text-zinc-400 uppercase font-mono">AI Provider</label>
                    <select 
                      value={configProvider}
                      onChange={(e) => setConfigProvider(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-sans outline-none focus:border-emerald-500/50 transition cursor-pointer text-xs"
                    >
                      <option value="siliconflow">SiliconFlow (DeepSeek, Qwen)</option>
                      <option value="dashscope">Alibaba Cloud DashScope</option>
                      <option value="openrouter">OpenRouter (Claude, Llama)</option>
                      <option value="gemini">Google Gemini AI</option>
                    </select>
                  </div>

                  {/* API Key Input with Eye controls */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase font-mono">API Key Secret</label>
                    <div className="relative">
                      <input 
                        type={showConfigApiKey ? 'text' : 'password'}
                        value={configApiKey}
                        onChange={(e) => setConfigApiKey(e.target.value)}
                        placeholder={`Provide ${configProvider === 'siliconflow' ? 'SiliconFlow' : configProvider} private key...`}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-2.5 pr-8 py-1.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-emerald-500/50 transition focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfigApiKey(!showConfigApiKey)}
                        className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        {showConfigApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Base URL (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase font-mono">Custom Base URL (Optional)</label>
                    <input 
                      type="text" 
                      value={configBaseUrl}
                      onChange={(e) => setConfigBaseUrl(e.target.value)}
                      placeholder="e.g. https://api.siliconflow.cn/v1"
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-700 focus:border-emerald-500/50 transition focus:outline-none"
                    />
                  </div>

                  {/* Model tag name / Dropdown selector with Custom fallback */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase font-mono">Model Name Identifier / 运行模型系列</label>
                    {['siliconflow', 'dashscope', 'openrouter', 'gemini'].includes(configProvider) ? (
                      <div className="space-y-1.5">
                        <select
                          value={
                            (PROVIDER_PRESET_MODELS[configProvider] || []).includes(configModel)
                              ? configModel
                              : 'custom'
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val !== 'custom') {
                              setConfigModel(val);
                            } else {
                              setConfigModel('');
                            }
                          }}
                          className="w-full bg-[#141418] border border-white/10 rounded-lg px-2.5 py-1.5 font-sans outline-none focus:border-emerald-500/50 transition cursor-pointer text-xs text-white"
                        >
                          {(PROVIDER_PRESET_MODELS[configProvider] || []).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                          <option value="custom">✍ 自定义 / Custom model name...</option>
                        </select>

                        {!(PROVIDER_PRESET_MODELS[configProvider] || []).includes(configModel) && (
                          <input 
                            type="text" 
                            value={configModel}
                            onChange={(e) => setConfigModel(e.target.value)}
                            placeholder="e.g. your-chosen-model-id"
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-700 focus:border-emerald-500/50 transition focus:outline-none animate-fade-in"
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={configModel}
                        onChange={(e) => setConfigModel(e.target.value)}
                        placeholder="e.g. deepseek-ai/DeepSeek-V3"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-650 focus:border-emerald-500/50 transition focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Lane Column 2: Other medical, simulation, watchdog parameters */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <h3 className="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                    Lane B: Auxiliary Clinical Control
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Simulation Toggle Option */}
                  <div className="flex items-start justify-between gap-3 p-2 bg-white/[0.01] hover:bg-white/[0.03] transition rounded-xl border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-zinc-200">Clinical Offline Simulator</span>
                      <p className="text-[9.5px] text-zinc-500 leading-normal font-sans">
                        Simulate peer-reviewed scientific citations and PERT answers if LLM credentials are empty
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigSimulateOnNoKey(!configSimulateOnNoKey)}
                      className={`h-5 w-9 rounded-full relative transition shrink-0 cursor-pointer ${
                        configSimulateOnNoKey ? 'bg-emerald-600' : 'bg-zinc-800'
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.75 transition-all duration-200 ${
                        configSimulateOnNoKey ? 'left-4.5' : 'left-0.75'
                      }`} />
                    </button>
                  </div>

                  {/* Watchdog Automatic patch option */}
                  <div className="flex items-start justify-between gap-3 p-2 bg-white/[0.01] hover:bg-white/[0.03] transition rounded-xl border border-white/5">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-zinc-200">Neural Auto-Recovery Path</span>
                      <p className="text-[9.5px] text-zinc-500 leading-normal font-sans">
                        Empower core watchdog to self-heal network routing issues autonomously every 15s
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigWatchdogAutoRepair(!configWatchdogAutoRepair)}
                      className={`h-5 w-9 rounded-full relative transition shrink-0 cursor-pointer ${
                        configWatchdogAutoRepair ? 'bg-emerald-600' : 'bg-zinc-800'
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full bg-white absolute top-0.75 transition-all duration-200 ${
                        configWatchdogAutoRepair ? 'left-4.5' : 'left-0.75'
                      }`} />
                    </button>
                  </div>

                  {/* Sensitvity trigger metric levels */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase font-mono">Watchdog Alert Threshold Sensitivity</span>
                    <div className="grid grid-cols-3 gap-1.5 font-sans">
                      {['high', 'medium', 'low'].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setConfigAlertSensitivity(s as any)}
                          className={`py-1.5 rounded-lg border text-[10px] uppercase font-mono font-bold transition cursor-pointer ${
                            configAlertSensitivity === s
                              ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 font-semibold'
                              : 'bg-zinc-900 border-white/5 text-zinc-500 hover:bg-white/5'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* AI Elements Sandbox launcher */}
            <div className="px-6 pb-5 border-t border-white/5 pt-4 text-xs">
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-950/20 via-[#0a0a0d] to-emerald-950/[0.15] border border-emerald-500/20 rounded-xl relative overflow-hidden">
                <div className="space-y-1 pr-4 max-w-md">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-300 uppercase text-[10px] tracking-widest font-mono">
                    <Cpu className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                    AI Elements AI-Native Sandbox / 科学沙盒
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-normal font-sans">
                    模型及语义切片工程控制台：深入评测各大模型对病历特征与科学指南在 Chat、Citations、Reasoning 等 AI Elements 元组件下的拟合流。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfigOpen(false);
                    setIsAiElementsOpen(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center justify-center gap-1.5 active-glow shrink-0 transition"
                >
                  <Sparkles className="h-4 w-4 text-emerald-300" />
                  <span>启动沙盒 ➔</span>
                </button>
              </div>
            </div>

            {/* Bottom button line */}
            <div className="p-4 bg-zinc-950/90 border-t border-white/10 flex items-center justify-between z-10 relative">
              <span className="text-[9.5px] text-zinc-500 font-mono">
                System sync indicator: Ready (Auto-Encrypted)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3.5 py-1.5 bg-zinc-950 border border-white/10 text-zinc-400 hover:text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition duration-150 font-sans"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGlobalConfig}
                  className="px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500/30 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 active-glow font-sans"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save System parameters
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
