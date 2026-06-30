import React, { Suspense, lazy, useEffect, useState } from 'react';
import { OSINTItem, WatchdogStatus, ResourceCenter, SystemReport15Day, PatientProfile } from './types';
import OSINTFeedView from './components/OSINTFeedView';
import UserAuth from './components/UserAuth';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { loadPatientProfileFromCloud, savePatientProfileToCloud, deletePatientProfileFromCloud } from './lib/firestore-sync';
import { getLlmProvider, LLM_PROVIDER_IDS } from './lib/llm-providers';
import { MOCK_15DAY_REPORT, INITIAL_OSINT_FEED, INITIAL_RESOURCE_CENTERS } from './seed-data';
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

const ResourceMapView = lazy(() => import('./components/ResourceMapView'));
const WatchdogConsoleView = lazy(() => import('./components/WatchdogConsoleView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const GuidelinesView = lazy(() => import('./components/GuidelinesView'));
const ManualSubmissionView = lazy(() => import('./components/ManualSubmissionView'));
const TargetInsightView = lazy(() => import('./components/TargetInsightView'));
const PatientProfileView = lazy(() => import('./components/PatientProfileView'));
const OSINTChatView = lazy(() => import('./components/OSINTChatView'));
const AIElementsPlayground = lazy(() => import('./components/AIElementsPlayground'));
const HelpView = lazy(() => import('./components/HelpView'));
const HotspotDrugsView = lazy(() => import('./components/HotspotDrugsView'));
const MyPersonalView = lazy(() => import('./components/MyPersonalView'));
const FloatingChatbot = lazy(() => import('./components/FloatingChatbot'));

const PROVIDER_PRESET_MODELS: Record<string, string[]> = Object.fromEntries(
  LLM_PROVIDER_IDS.map((id) => [id, getLlmProvider(id).defaultModels])
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'feed' | 'map' | 'watchdog' | 'report' | 'guidelines' | 'target_insight' | 'patient_profile' | 'ai_elements' | 'hotspot_drugs' | 'help' | 'my'>('feed');
  const [expandedOpsSection, setExpandedOpsSection] = useState<'watchdog' | 'report' | null>(null);
  const [items, setItems] = useState<OSINTItem[]>([]);
  const [newsRefreshMode, setNewsRefreshMode] = useState<'aggregate' | 'knows' | 'fallback'>('fallback');
  const [newsSources, setNewsSources] = useState<Array<{ source: string; ok: boolean; count: number }>>([]);
  const [searchLog, setSearchLog] = useState<string[]>([]);
  const [newsWindowLabel, setNewsWindowLabel] = useState<'24h' | '7d' | '30d'>('30d');
  const [centers, setCenters] = useState<ResourceCenter[]>([]);
  const [watchdog, setWatchdog] = useState<WatchdogStatus | null>(null);
  const [runtimeHealth, setRuntimeHealth] = useState<{ ok: boolean; issues: { code: string; message: string }[] } | null>(null);
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
        // Safely guard demo and local-auth logins from being reset by Firebase initial null ticks
        setCurrentUser((current: any) => {
          if (current && (current.uid === 'demo-pancreas-osint-101' || String(current.uid || '').startsWith('local-'))) {
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
      // 0. Restore a local username/password session if present
      const localAuthRaw = localStorage.getItem('pancreas_local_auth');
      if (localAuthRaw) {
        const parsed = JSON.parse(localAuthRaw);
        if (parsed?.user?.uid) {
          handleUserChanged(parsed.user, true);
        }
      }

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

  const handleNewsRefresh = async () => {
    const query = feedSearchTerm || 'pancreatic cancer';
    setIsFetching(true);
    setSearchLog([]);
    setConsoleMsg(`检索调度启动: "${query}"`);

    // Stream live log lines from the server via SSE; update the feed on 'done'.
    return new Promise<void>((resolve) => {
      let settled = false;
      let es: EventSource | null = null;
      try {
        es = new EventSource(`/api/osint/feed/refresh-stream?query=${encodeURIComponent(query)}`);
      } catch {
        // EventSource unavailable — fall back to POST below.
      }

      const finish = () => {
        if (settled) return;
        settled = true;
        es?.close();
        setIsFetching(false);
        resolve();
      };

      // Safety timeout: if the stream stalls, fall back gracefully.
      const timeout = setTimeout(() => {
        setConsoleMsg('检索超时，保留现有情报快照。');
        finish();
      }, 90000);

      if (!es) {
        clearTimeout(timeout);
        // Fallback: plain POST without streaming.
        fetch('/api/osint/feed/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        })
          .then((r) => r.json())
          .then((resObj) => {
            if (resObj.status === 'ok') {
              setItems(resObj.data || []);
              setNewsRefreshMode(resObj.mode || 'fallback');
              setNewsSources(resObj.sources || []);
            }
          })
          .finally(() => { setIsFetching(false); resolve(); });
        return;
      }

      es.addEventListener('log', (ev: MessageEvent) => {
        try {
          const { line } = JSON.parse(ev.data);
          if (typeof line === 'string') {
            setSearchLog((prev) => [...prev.slice(-200), line]);
          }
        } catch { /* ignore malformed */ }
      });

      es.addEventListener('done', (ev: MessageEvent) => {
        clearTimeout(timeout);
        try {
          const resObj = JSON.parse(ev.data);
          if (resObj.status === 'ok') {
            setItems(resObj.data || []);
            setNewsRefreshMode(resObj.mode || 'fallback');
            setNewsSources(resObj.sources || []);
            setNewsWindowLabel((resObj.windows?.[0]?.label || '30d') as '24h' | '7d' | '30d');
            const okSources = (resObj.sources || []).filter((s: { ok: boolean; count: number }) => s.ok && s.count > 0).length;
            setConsoleMsg(`检索完成: ${resObj.mode} 模式, ${okSources} 个实时信源, ${(resObj.data || []).length} 条情报。`);
          }
        } catch { /* ignore */ }
        finish();
      });

      es.addEventListener('error', () => {
        clearTimeout(timeout);
        setConsoleMsg('检索连接中断，保留现有情报快照。');
        finish();
      });
    });
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
        const [feedRes, coordRes, dogRes, healthRes] = await Promise.all([
          fetch('/api/osint/feed/cached'),  // Try cached file first (instant)
          fetch('/api/osint/resources'),
          fetch('/api/osint/watchdog'),
          fetch('/api/health')
        ]);
        
        const feedObj = await feedRes.json();
        const coordObj = await coordRes.json();
        const dogObj = await dogRes.json();
        const healthObj = await healthRes.json();

        // If cached file has data, use it; otherwise fall back to live feed or seed
        const feedItems = feedObj.data?.length ? feedObj.data : INITIAL_OSINT_FEED;
        setItems(feedItems);
        setNewsRefreshMode(feedObj.mode || 'fallback');
        setNewsSources(feedObj.sources || []);
        setNewsWindowLabel((feedObj.selectedWindow || feedObj.windows?.[0]?.label || '30d') as '24h' | '7d' | '30d');
        setCenters(coordObj.data?.length ? coordObj.data : INITIAL_RESOURCE_CENTERS);
        setWatchdog(dogObj.data || null);
        setRuntimeHealth(healthObj.data || null);
      } catch (err) {
        console.error('Failed to sync state from full-stack server endpoints, utilizing offline fallback:', err);
        // Frontend-only / static deploy fallback: render the bundled seed data
        // so news, hospitals and treatments still appear without the API server.
        setItems(INITIAL_OSINT_FEED);
        setNewsRefreshMode('fallback');
        setNewsWindowLabel('30d');
        setCenters(INITIAL_RESOURCE_CENTERS);
        setConsoleMsg('API Server unreachable. Loaded bundled offline dataset (news + centers).');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Auto-refresh the feed every 5 minutes by reading the persisted cache file.
  // The backend auto-refreshes the file in the background, so the frontend just
  // polls the cached endpoint (instant, no re-search latency).
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/osint/feed/cached')
        .then((res) => res.json())
        .then((obj) => {
          if (obj.status === 'ok' && obj.data?.length > 0) {
            setItems(obj.data);
            setNewsRefreshMode(obj.mode || 'fallback');
            setNewsSources(obj.sources || []);
          }
        })
        .catch(() => {
          // Silent in offline/static mode.
        });
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Set up periodic polling for Watchdog telemetry metrics (e.g., CPU, API counts) to keep dashboard responsive
  useEffect(() => {
    const timer = setInterval(() => {
      Promise.all([fetch('/api/osint/watchdog'), fetch('/api/health')])
        .then(async ([watchdogRes, healthRes]) => {
          const [watchdogObj, healthObj] = await Promise.all([watchdogRes.json(), healthRes.json()]);
          if (watchdogObj.status === 'ok') {
            setWatchdog(watchdogObj.data);
          }
          if (healthObj.status === 'ok') {
            setRuntimeHealth(healthObj.data);
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
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-slate-500/5 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/5 rounded-full blur-[80px]"></div>
        </div>
        <Activity className="h-10 w-10 text-slate-300 animate-spin mb-4 relative z-10" />
        <p className="text-base font-sans italic text-white relative z-10">Pancreas OSINT.</p>
        <p className="text-xs text-white/45 mt-2 relative z-10 font-mono uppercase tracking-widest">Node active: synchronizing global core registry...</p>
      </div>
    );
  }

  const t = TRANSLATIONS[activeLanguage] || TRANSLATIONS['ZH'];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col justify-center items-center relative py-8 px-4 overflow-y-auto">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-slate-500/[0.03] rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-zinc-500/[0.02] rounded-full blur-[100px]"></div>
        </div>
        
        {/* Welcome branding header */}
        <div className="text-center mb-6 max-w-sm space-y-2 relative z-10 animate-fade-in shrink-0">
          <div className="inline-flex p-3 bg-slate-950/40 border border-slate-500/20 rounded-2xl text-slate-300 mb-1">
            <HeartPulse className="h-6 w-6 text-slate-300 animate-pulse" />
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
      <div className="bg-slate-950/40 text-slate-300 text-[11px] sm:text-xs py-2 px-6 border-b border-white/10 text-center flex justify-center items-center gap-2 select-none leading-normal shrink-0 glass">
        <ShieldAlert className="h-4 w-4 shrink-0 text-slate-400" />
        <span className="font-sans">
          {t.bannerTitle}
        </span>
      </div>

      {/* Main Header Wrapper */}
      <header className="border-b border-white/10 px-4 sm:px-8 py-4 flex flex-col md:flex-row justify-between md:items-center gap-4 glass z-40 sticky top-0 backdrop-blur-md">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-4">
            <div className="p-1.5 bg-slate-500/10 border border-slate-500/30 rounded-xl shrink-0 flex items-center justify-center shadow-lg shadow-black/20 animate-pulse" title="小胰宝 AI 助手 Mascot">
              <svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                <defs>
                  <linearGradient id="slate-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#334155" />
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
                <rect x="47" y="14" width="6" height="12" rx="3" fill="#64748b" />
                <circle cx="50" cy="11" r="7.5" fill="url(#antenna-grad)" stroke="#d97706" strokeWidth="0.5" />
                <circle cx="48" cy="9" r="2" fill="#ffffff" opacity="0.8" />

                {/* Ears */}
                <rect x="13" y="38" width="8" height="18" rx="4" fill="#475569" />
                <rect x="79" y="38" width="8" height="18" rx="4" fill="#475569" />

                {/* Head */}
                <rect x="18" y="24" width="64" height="48" rx="24" fill="url(#slate-body-grad)" filter="url(#soft-shadow)" />

                {/* Visor/Face Shield */}
                <path d="M26 48 C26 36, 40 34, 50 34 C60 34, 74 36, 74 48 C74 60, 60 60, 50 60 C40 60, 26 60, 26 48 Z" fill="url(#visor-grad)" />

                {/* Smiling Eyes */}
                <path d="M35 48 C37 44, 43 44, 45 48" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />
                <path d="M55 48 C57 44, 63 44, 65 48" stroke="#334155" strokeWidth="3" strokeLinecap="round" fill="none" />

                {/* Neck */}
                <rect x="43" y="68" width="14" height="8" fill="#475569" />

                {/* Body Peeking */}
                <path d="M32 76 C32 88, 68 88, 68 76 Z" fill="url(#slate-body-grad)" />

                {/* Heart on Chest */}
                <path d="M50 84 C50 84 45 79.5 45 76.5 C45 74.2 46.8 72.8 48.8 72.8 C50 72.8 50 74 50 74 C50 74 51 72.8 52.2 72.8 C54.2 72.8 56 74.2 56 76.5 C56 79.5 50 84 50 84 Z" fill="url(#heart-grad)" />
              </svg>
            </div>
            <div>
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-sans font-extrabold text-white tracking-tight leading-none flex items-center gap-1.5">
                  小胰宝 <span className="font-extrabold text-slate-300 font-mono tracking-wide uppercase">OSINT</span>
                </h1>
                <p className="text-[11px] sm:text-xs text-white/90 font-sans font-medium mt-1.5 leading-snug">
                  全球胰腺肿瘤开源情报中心
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] bg-slate-500/15 border border-slate-500/30 text-slate-300 px-1.5 py-0.25 rounded font-mono uppercase tracking-wide opacity-90">
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
                    expandedOpsSection === 'watchdog' ? 'border-slate-500/50 bg-slate-950/20' : 'border-white/10 hover:border-slate-500/30'
                  }`}
                  title="点击打开智能控制台浮窗"
                >
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider cursor-pointer">{t.statusTitle}</span>
                  <span className="text-slate-300 font-bold flex items-center gap-1 mt-0.5 cursor-pointer">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
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
                    expandedOpsSection === 'report' ? 'border-slate-500/50 bg-slate-950/20' : 'border-white/10 hover:border-slate-500/30'
                  }`}
                  title="点击打开15天运行运维报告浮窗"
                >
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider cursor-pointer">{t.uptimeTitle}</span>
                  <span className="text-white font-medium block mt-0.5 cursor-pointer">{watchdog.uptime}</span>
                </button>

                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">{t.quotaTitle}</span>
                  <span className="text-slate-300 font-bold block mt-0.5">{watchdog.apiQuotaUsed}</span>
                </div>

                <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg min-w-[150px]">
                  <span className="text-white/40 block text-[9px] uppercase tracking-wider">Runtime Health</span>
                  <span className={`font-bold block mt-0.5 ${runtimeHealth?.ok ? 'text-slate-300' : 'text-amber-400'}`}>
                    {runtimeHealth?.ok ? 'OK' : 'CHECK'}
                  </span>
                  <span className="text-[10px] text-white/45 block mt-0.5">
                    {runtimeHealth?.issues?.length ? `${runtimeHealth.issues.length} issue(s)` : 'all probes pass'}
                  </span>
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900 border border-white/10 hover:border-slate-500/40 rounded-xl text-xs font-semibold text-zinc-300 transition cursor-pointer"
                  title="Select Language / 选择语言"
                >
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
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
                          activeLanguage === lang.code ? 'text-slate-300 font-bold bg-slate-950/10' : 'text-zinc-400'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                        {activeLanguage === lang.code && <Check className="h-3.5 w-3.5 text-slate-400 font-bold" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Help Guide Logo & Entrance Button */}
              <button
                onClick={() => setActiveTab('help')}
                className={`p-2 bg-gradient-to-tr from-zinc-900 to-zinc-950 hover:from-slate-950/20 hover:to-slate-900/20 text-zinc-300 hover:text-slate-200 border rounded-xl transition cursor-pointer relative group shrink-0 ${
                  activeTab === 'help' 
                    ? 'border-slate-500 text-slate-200 bg-slate-950/20' 
                    : 'border-white/10 hover:border-slate-500/30'
                }`}
                title="帮助中心 & 新手指引 / Help Guide"
              >
                <HelpCircle className="h-4.5 w-4.5 animate-pulse" />
              </button>

              {/* Config Gear Button */}
              <button
                onClick={() => setIsConfigOpen(true)}
                className="p-2 bg-gradient-to-tr from-zinc-900 to-zinc-950 hover:from-slate-950/20 hover:to-slate-900/20 text-zinc-300 hover:text-slate-200 border border-white/10 hover:border-slate-500/30 rounded-xl transition cursor-pointer relative group shrink-0"
                title={t.configBtnTooltip}
              >
                <Settings className="h-4.5 w-4.5" />
                <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
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
              onClick={() => setActiveTab('my')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'my'
                  ? 'bg-teal-600/15 text-teal-200 font-medium border border-teal-500/30'
                  : 'text-teal-300/60 hover:text-teal-200 hover:bg-teal-900/10'
              }`}
            >
              <HeartPulse className="h-4 w-4 shrink-0 text-teal-400" />
              {t.tabMy || '我的专属'}
              {profile ? (
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse"></span>
              ) : (
                <span className="text-[9px] bg-zinc-800 border border-white/5 text-zinc-500 px-1 rounded">SET</span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('target_insight')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'target_insight' 
                  ? 'bg-white/10 text-white font-medium border border-white/15 active-glow' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Target className="h-4 w-4 shrink-0 text-slate-400/90" />
              {t.tabTargetInsight}
            </button>

            <button
              onClick={() => setActiveTab('hotspot_drugs')}
              className={`py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'hotspot_drugs' 
                  ? 'bg-slate-600/15 text-slate-200 font-medium border border-slate-500/30' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-slate-400/90" />
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
                  ? 'bg-slate-600/15 text-slate-200 font-medium border border-slate-500/30' 
                  : 'text-slate-300/60 hover:text-slate-200 hover:bg-slate-900/10'
              }`}
            >
              <User className="h-4 w-4 shrink-0 text-zinc-400" />
              {t.tabPatientProfile}
              {profile ? (
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
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
          <div className="absolute top-1/4 -right-32 w-[400px] h-[400px] bg-slate-500/[0.01] rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 -left-32 w-[350px] h-[350px] bg-white/[0.01] rounded-full blur-[100px]"></div>
        </div>
        
        <div className="relative z-10 space-y-6">
          
          {/* Dual-Perspective / Matchmaker Status Bar & Control Row */}
          {activeTab !== 'watchdog' && activeTab !== 'report' && activeTab !== 'guidelines' && activeTab !== 'patient_profile' && activeTab !== 'ai_elements' && activeTab !== 'my' && (
            <div className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 glass shadow-xl shadow-black/40">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border transition ${
                  perspective === 'personalized'
                    ? 'bg-slate-500/10 border-slate-500/30 text-slate-300'
                    : 'bg-zinc-900 border-white/5 text-zinc-400'
                }`}>
                  {perspective === 'personalized' ? (
                    <Sparkles className="h-5 w-5 text-slate-300 animate-pulse" />
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
                        ? 'bg-slate-500/15 text-slate-300 border border-slate-500/30' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}>
                      {perspective === 'personalized' ? 'PERSONALIZED MODE / 个性化匹配视角' : 'GENERIC MODE / 全面通用视角'}
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
                      ? 'bg-slate-500/10 border-slate-500/40 text-slate-300 font-medium'
                      : 'bg-black/40 border-white/5 text-zinc-500 hover:text-slate-300 hover:border-slate-500/20'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  开启病情个性化拟合视角
                </button>
                
                {!profile && (
                  <button
                    onClick={() => setActiveTab('patient_profile')}
                    className="text-[11px] text-slate-300 hover:text-slate-200 underline font-semibold font-sans shrink-0 pl-1"
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
                    <span className="text-[10px] uppercase tracking-widest text-slate-300 font-bold font-mono">
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
                onFetchNew={handleNewsRefresh}
                onGenerateSummary={handleGenerateSummary}
                isFetching={isFetching}
                statusMessage={consoleMsg}
                newsRefreshMode={newsRefreshMode}
                newsWindowLabel={newsWindowLabel}
                newsSources={newsSources}
                searchLog={searchLog}
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
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading target insight...</div>}>
              <TargetInsightView 
                items={items}
                onSelectFeedFilter={setFeedSearchTerm}
                onNavigateToTab={setActiveTab}
                onItemsChange={setItems}
                patientProfile={profile}
                perspective={perspective}
              />
            </Suspense>
          )}

          {activeTab === 'map' && (
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading resource map...</div>}>
              <ResourceMapView 
                centers={centers} 
                patientProfile={profile}
                perspective={perspective}
              />
            </Suspense>
          )}

          {false && watchdog && (
            <Suspense fallback={null}>
              <WatchdogConsoleView 
                status={watchdog}
                isRepairing={isRepairing}
                onTriggerRepair={handleTriggerRepair}
                onTriggerRollback={handleTriggerRollback}
              />
            </Suspense>
          )}

          {false && (
            <Suspense fallback={null}>
              <ReportsView report={MOCK_15DAY_REPORT} />
            </Suspense>
          )}

          {activeTab === 'guidelines' && (
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading guidelines...</div>}>
              <GuidelinesView language={activeLanguage} />
            </Suspense>
          )}

          {activeTab === 'hotspot_drugs' && (
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading drug view...</div>}>
              <HotspotDrugsView />
            </Suspense>
          )}

          {activeTab === 'help' && (
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading help...</div>}>
              <HelpView 
                language={activeLanguage}
                onNavigateToTab={setActiveTab}
              />
            </Suspense>
          )}

          {activeTab === 'patient_profile' && (
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading profile...</div>}>
              <PatientProfileView 
                profile={profile}
                onSaveProfile={handleSaveProfile}
                onClearProfile={handleClearProfile}
                language={activeLanguage}
              />
            </Suspense>
          )}

          {activeTab === 'my' && (
            <Suspense fallback={<div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-6 text-sm text-zinc-400">Loading personalized hub...</div>}>
              <MyPersonalView
                profile={profile}
                language={activeLanguage}
                llmConfig={{
                  provider: configProvider,
                  apiKey: configApiKey,
                  baseUrl: configBaseUrl,
                  model: configModel
                }}
                onConfigureProfile={() => setActiveTab('patient_profile')}
              />
            </Suspense>
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
                  className="p-1.5 px-3 bg-zinc-900 border border-white/10 hover:border-slate-500/25 text-zinc-400 hover:text-slate-300 transition rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-sans"
                >
                  <X className="h-4 w-4" />
                  <span>关闭面板</span>
                </button>
              </div>

              {expandedOpsSection === 'watchdog' && watchdog && (
                <Suspense fallback={null}>
                  <WatchdogConsoleView 
                    status={watchdog}
                    isRepairing={isRepairing}
                    onTriggerRepair={handleTriggerRepair}
                    onTriggerRollback={handleTriggerRollback}
                  />
                </Suspense>
              )}

              {expandedOpsSection === 'report' && (
                <Suspense fallback={null}>
                  <ReportsView report={MOCK_15DAY_REPORT} />
                </Suspense>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Section */}
      <footer className="bg-zinc-950 border-t border-white/10 shrink-0 text-xs text-white/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-sans italic font-light text-white text-sm">
              Pancreas OSINT.
            </p>
            <p className="text-white/40">
              全球去中心化多语对端抗干扰爬取网络 · 100% 独立生命周期评估完成
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end font-mono text-[10px] space-y-1">
            <span>Server Local Time: 2026-06-22 UTC+8</span>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              <span className="text-white/50 tracking-wider">ENGINE: ONLINE</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Global advanced AI assistant (floating, bottom-left) */}
      <Suspense fallback={null}>
        <FloatingChatbot />
      </Suspense>

      {/* Persistent Shimmering Floating Action Button / Logo for Manual Submission */}
      <div className="fixed bottom-6 right-6 z-40 select-none">
        <button
          onClick={() => setIsSubmissionOpen(true)}
          className="bg-slate-700 hover:bg-slate-600 text-white font-bold p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition duration-300 scale-100 hover:scale-105 active:scale-95 group active-glow relative border border-white/20"
          title="学术协同：投递开源医学新信源 (Manual Suggest Ingest)"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 h-full w-full rounded-full bg-slate-500 animate-ping opacity-25 group-hover:opacity-35"></span>
          
          <div className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide">
            <Sparkles className="h-4.5 w-4.5 text-slate-200 animate-pulse" />
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
          className="bg-slate-700 hover:bg-slate-600 text-white font-bold p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition duration-300 scale-100 hover:scale-105 active:scale-95 group active-glow relative border border-white/20"
          title="医学探索：科幻智慧大脑研究助手 (MDT AI Chatbot)"
        >
          {/* Pulsing ring */}
          <span className="absolute inset-0 h-full w-full rounded-full bg-slate-500 animate-ping opacity-25 group-hover:opacity-35"></span>
          
          <div className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide font-sans">
            <MessageSquare className="h-4.5 w-4.5 text-slate-200 animate-pulse" />
            <span className="max-w-px overflow-hidden group-hover:max-w-[120px] transition-all duration-300 ease-out whitespace-nowrap opacity-0 group-hover:opacity-100 text-white pr-1">
              {t.btnAssistant}
            </span>
          </div>
        </button>
      </div>

      {/* Manual Ingestion Popup Dialog Portal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Interactive Medical OSINT Chatbot Portal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* AI Elements Sandbox Modal (Full-Screen Immersive) */}
      {isAiElementsOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/95 backdrop-blur-xl p-4 sm:p-8 flex items-center justify-center animate-fade-in">
          <div className="w-full max-w-6xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col font-sans max-h-[95vh] overflow-y-auto">
            <Suspense fallback={null}>
              <AIElementsPlayground onClose={() => setIsAiElementsOpen(false)} />
            </Suspense>
          </div>
        </div>
      )}

      {/* Global Unified Configuration Settings Center Modal (2 Lanes / Columns) */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#09090b] border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden flex flex-col font-sans animate-fade-in animate-slide-in">
            {/* Ambient visual background glow details */}
            <div className="absolute top-0 right-0 w-[160px] h-[160px] bg-slate-500/[0.02] rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[160px] h-[160px] bg-slate-500/[0.01] rounded-full blur-[80px] pointer-events-none"></div>

            {/* Header row */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/90 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-tr from-slate-600/20 to-slate-800/20 rounded-xl border border-slate-500/30">
                  <Settings className="h-4.5 w-4.5 text-slate-300" />
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
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
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
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-sans outline-none focus:border-slate-500/50 transition cursor-pointer text-xs"
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
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-2.5 pr-8 py-1.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-slate-500/50 transition focus:outline-none"
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
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-700 focus:border-slate-500/50 transition focus:outline-none"
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
                          className="w-full bg-[#141418] border border-white/10 rounded-lg px-2.5 py-1.5 font-sans outline-none focus:border-slate-500/50 transition cursor-pointer text-xs text-white"
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
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-700 focus:border-slate-500/50 transition focus:outline-none animate-fade-in"
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={configModel}
                        onChange={(e) => setConfigModel(e.target.value)}
                        placeholder="e.g. deepseek-ai/DeepSeek-V3"
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white placeholder-zinc-650 focus:border-slate-500/50 transition focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Lane Column 2: Other medical, simulation, watchdog parameters */}
              <div className="space-y-4">
                <div className="flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
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
                        configSimulateOnNoKey ? 'bg-slate-600' : 'bg-zinc-800'
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
                        configWatchdogAutoRepair ? 'bg-slate-600' : 'bg-zinc-800'
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
                              ? 'bg-slate-600/20 border-slate-500/40 text-slate-300 font-semibold'
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
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-slate-950/20 via-[#0a0a0d] to-slate-950/[0.15] border border-slate-500/20 rounded-xl relative overflow-hidden">
                <div className="space-y-1 pr-4 max-w-md">
                  <div className="flex items-center gap-1.5 font-bold text-slate-300 uppercase text-[10px] tracking-widest font-mono">
                    <Cpu className="h-3.5 w-3.5 text-slate-300 animate-pulse" />
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
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold font-sans cursor-pointer flex items-center justify-center gap-1.5 active-glow shrink-0 transition"
                >
                  <Sparkles className="h-4 w-4 text-slate-200" />
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
                  className="px-4 py-1.5 bg-slate-700 text-white hover:bg-slate-600 border border-slate-500/30 rounded-lg text-xs font-bold font-sans cursor-pointer flex items-center gap-1.5 active-glow font-sans"
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
