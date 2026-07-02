import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Settings, 
  Send, 
  Paperclip, 
  BookOpen, 
  Check, 
  AlertCircle, 
  Clock, 
  ChevronDown, 
  FileText, 
  X, 
  ShieldAlert, 
  Copy, 
  CornerDownRight, 
  Globe, 
  Terminal, 
  Code,
  Layers,
  CheckCircle,
  HelpCircle,
  Brain,
  Search,
  CloudLightning,
  Workflow
} from 'lucide-react';
import {
  LLM_PROVIDER_IDS,
  PROVIDER_STORAGE_KEYS,
  getLlmProvider,
  getProviderDefaults,
  getStoredActiveProvider,
  getStoredProviderConfigs,
  StoredProviderConfig
} from '../lib/llm-providers';

const PROVIDERS = Object.fromEntries(
  LLM_PROVIDER_IDS.map((id) => {
    const provider = getLlmProvider(id);
    return [id, provider];
  })
);

interface MessageAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
  reasoning?: string;
  reasoningTimeMs?: number;
  isReasoningCollapsed?: boolean;
  citations?: Array<{ id: number; title: string; url: string; excerpt: string }>;
  attachments?: MessageAttachment[];
}

export default function AIElementsPlayground({ onClose }: { onClose?: () => void }) {
  // Provider Config states
  const [activeProvider, setActiveProvider] = useState<string>('siliconflow');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Loaded Configurations per Provider (persisted in local state / localStorage)
  const [providerConfigs, setProviderConfigs] = useState<Record<string, StoredProviderConfig>>({});

  // Chat conversation states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [promptInput, setPromptInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [attachedFiles, setAttachedFiles] = useState<MessageAttachment[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Active runtime engine summary
  const [isActiveConfigSet, setIsActiveConfigSet] = useState<boolean>(false);

  // Active Documentation Tab
  const [docTab, setDocTab] = useState<'vercel_sdk' | 'ai_elements' | 'custom_router'>('vercel_sdk');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const endOfChatRef = useRef<HTMLDivElement | null>(null);

  // On mount, load configurations from LocalStorage
  useEffect(() => {
    try {
      const parsed = getStoredProviderConfigs();
      const activeP = getStoredActiveProvider();
      const fallback = getProviderDefaults(activeP);
      setProviderConfigs(parsed);
      setActiveProvider(activeP);
      setApiKey(parsed[activeP]?.apiKey || fallback.apiKey);
      setBaseUrl(parsed[activeP]?.baseUrl || fallback.baseUrl);
      setSelectedModel(parsed[activeP]?.model || fallback.model);
      setIsActiveConfigSet(!!parsed[activeP]?.apiKey);
    } catch (err) {
      console.warn("Could not read LocalStorage configs:", err);
    }

    // Load initial greeting message
    setMessages([
      {
        id: 'init',
        sender: 'ai',
        text: `### AI Elements Playground

这是一个更轻量的多提供商聊天沙盒。

#### 能力
1. 读取并保存同一套 provider 配置。
2. 预览聊天、reasoning、citations 和附件。
3. 在没有密钥时保持本地模拟输出。`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        reasoning: "加载 provider 配置与本地预览数据。",
        reasoningTimeMs: 450,
        isReasoningCollapsed: true,
        citations: [
          { id: 1, title: "NCCN Clinical Guidelines in Oncology - Pancreatic Adenocarcinoma (V2.2025)", url: "https://www.nccn.org", excerpt: "NCCN权威指南详述了一线三联NALIRIFOX与吉西他滨+白蛋白紫杉醇的临床路径与突变评估红线。" },
          { id: 2, title: "ESMO Open Research regarding PERT dosage optimization for EPI in pancreatic cancers", url: "https://www.esmo.org", excerpt: "ESMO指南强烈提示外源性胰腺功能不全（EPI）病患每日随正餐补充至少5-7.5万及加餐2.5万单位活性胰酶的重要性。" }
        ]
      }
    ]);
  }, []);

  // When active provider changes, load correct sub-config
  const handleProviderChange = (providerId: string) => {
    setActiveProvider(providerId);
    const provider = getLlmProvider(providerId);
    const existing = providerConfigs[providerId] || getProviderDefaults(providerId);
    
    setApiKey(existing.apiKey || '');
    setBaseUrl(existing.baseUrl || provider.defaultBaseUrl);
    setSelectedModel(existing.model || provider.defaultModels[0]);
    setIsActiveConfigSet(!!existing.apiKey);
    setStatusMessage('');
  };

  const handleSaveConfig = () => {
    setIsSaving(true);
    
    const finalModel = selectedModel === 'custom' ? customModelInput : selectedModel;
    const updated = {
      ...providerConfigs,
      [activeProvider]: {
        apiKey,
        baseUrl,
        model: finalModel
      }
    };

    setProviderConfigs(updated);
    
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEYS.configs, JSON.stringify(updated));
      localStorage.setItem(PROVIDER_STORAGE_KEYS.activeProvider, activeProvider);
      
      setTimeout(() => {
        setIsSaving(false);
        setIsActiveConfigSet(!!apiKey);
        setStatusMessage(`已激活 ${getLlmProvider(activeProvider).name}，当前模型 ${finalModel || 'auto'}。`);
      }, 500);
    } catch (err) {
      setIsSaving(false);
      setStatusMessage('配置保存到浏览器 LocalStorage 时遇到限制。');
    }
  };

  const handleClearConfig = () => {
    setApiKey('');
    const provider = getLlmProvider(activeProvider);
    setBaseUrl(provider.defaultBaseUrl);
    setSelectedModel(provider.defaultModels[0]);
    setCustomModelInput('');
    setIsActiveConfigSet(false);

    const updated = {
      ...providerConfigs,
      [activeProvider]: {
        apiKey: '',
        baseUrl: provider.defaultBaseUrl,
        model: provider.defaultModels[0]
      }
    };
    setProviderConfigs(updated);
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEYS.configs, JSON.stringify(updated));
      setStatusMessage(`已清空 ${provider.name} 的本地配置。`);
    } catch (_) {}
  };

  // Drag & drop file attachments
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files) as File[];
      addFilesToList(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files) as File[];
      addFilesToList(files);
    }
  };

  const addFilesToList = (files: File[]) => {
    const newAttachments: MessageAttachment[] = files.map(file => {
      const textType = file.type || 'text/plain';
      const sizeStr = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
        : `${(file.size / 1024).toFixed(1)} KB`;
      return {
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        size: sizeStr,
        type: textType
      };
    });
    setAttachedFiles(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Submit Prompt to AI Custom Proxy or Fallback Simulator
  const handleSendMessage = async (forcePrompt?: string) => {
    const text = (forcePrompt || promptInput).trim();
    if (!text && attachedFiles.length === 0) return;

    setPromptInput('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text || `已投递 ${attachedFiles.length} 份临床附件，请求分析。`,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setAttachedFiles([]);
    setIsTyping(true);

    try {
      // Create request payload
      const payload = {
        messages: [...messages, userMsg].map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        config: {
          provider: activeProvider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: selectedModel === 'custom' ? customModelInput.trim() : selectedModel,
          hasRealKey: !!apiKey.trim()
        },
        attachments: userMsg.attachments
      };

      // Call our secure backend API route
      const response = await fetch('/api/osint/chat-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      let citationsList = undefined;
      const rawText = resData.text || '';
      const canAttachCitations = resData.status === 'ok' && resData.mode !== 'unavailable';
      if (canAttachCitations && (rawText.toLowerCase().includes('kras') || text.toLowerCase().includes('kras'))) {
        citationsList = [
          { id: 1, title: "Amgen Trial NCT04625647 regarding sotorasib in advanced solid tumors", url: "https://clinicaltrials.gov", excerpt: "评估针对KRAS不同亚型共价和非共价阻断剂在结直肠和胰腺癌中的缓解率比对。" },
          { id: 2, title: "Mirati Therapeutics ESMO 2024 updates of MRTX1133 Phase I expansion cohorts", url: "https://www.esmo.org", excerpt: "首个全口服靶向KRAS G12D抑制剂MRTX1133在经治胰腺癌患者中录得31%客观缓解率(ORR)。" }
        ];
      } else if (canAttachCitations && (rawText.toLowerCase().includes('胰酶') || text.toLowerCase().includes('胰酶') || text.toLowerCase().includes('pert'))) {
        citationsList = [
          { id: 1, title: "Pancreatic Enzyme Replacement Therapy (PERT) Consensus Statement V4", url: "https://pubmed.ncbi.nlm.nih.gov", excerpt: "详述并设定胰腺段位切除术后及重度吸收障碍中，首口正餐需配足不少于50,000 U的高抗酸性胶囊微粒剂量。" }
        ];
      }

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: rawText,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        reasoning: resData.reasoning || undefined,
        reasoningTimeMs: resData.reasoningTimeMs || undefined,
        isReasoningCollapsed: false,
        citations: citationsList
      }]);

    } catch (err: any) {
      console.warn("Proxy connection failed:", err);
      setMessages(prev => [...prev, {
        id: `ai-unavailable-${Date.now()}`,
        sender: 'ai',
        text: `### AI Elements 后端暂不可用\n\n连接到所选 provider 失败：${err.message || 'unknown error'}。\n\n系统没有生成模拟医学回答。请配置有效 API key 后重试。`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        reasoning: `[LLM unavailable]\nProvider: ${activeProvider}\nModel: ${selectedModel}\nError: ${err.message || 'unknown error'}`,
        reasoningTimeMs: 0,
        isReasoningCollapsed: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Auto scroll to bottom
  useEffect(() => {
    endOfChatRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Status summary banner */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-950 to-slate-900 border border-white/10 rounded-2xl p-5 relative overflow-hidden glass shadow-xl shadow-black/30">
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-slate-500/[0.04] rounded-full blur-[50px] pointer-events-none"></div>
        {onClose && (
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 rounded-xl transition cursor-pointer z-50 flex items-center gap-1.5 text-[10px] font-sans font-bold"
          >
            <span>✕ 关闭沙盒 / Close Sandbox</span>
          </button>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 bg-white/5 border border-white/10 text-zinc-300 font-mono text-[9px] font-bold rounded">
                AI ELEMENTS PRimitives
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"></span>
              <span className="text-zinc-400 text-[10px] font-mono">WORKSPACE ID: QW-175611</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-tight font-sans flex items-center gap-2">
              <Cpu className="h-5.5 w-5.5 text-slate-300" />
              AI-Native 多供应商模型配置与沙盒
            </h1>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed font-sans">
              本控制中心用于统一 provider 配置、聊天预览、reasoning、citations 和附件流。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 bg-black/40 border border-white/5 px-4 py-2.5 rounded-xl font-mono text-[11px] self-start md:self-center">
            <Globe className="h-4 w-4 text-slate-300 shrink-0" />
            <div className="space-y-0.5">
              <div className="text-zinc-500">网关链路模式</div>
              <div className="text-white font-bold flex items-center gap-1">
                {isActiveConfigSet ? (
                  <>
                    <CloudLightning className="h-3 w-3 text-slate-300" />
                    已激活: {PROVIDERS[activeProvider].name}
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 text-amber-500" />
                    本地高保真模拟链路
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main split work area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Configuration module - 5 cols */}
        <div className="lg:col-span-5 bg-zinc-950/75 border border-white/10 rounded-2xl overflow-hidden glass shadow-xl shadow-black/40 flex flex-col font-sans">
          
          <div className="p-4 border-b border-white/10 bg-zinc-950/90 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4.5 w-4.5 text-slate-300" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                多通道服务提供商配置
              </h2>
            </div>
            <span className="text-[10px] bg-white/5 border border-white/10 text-zinc-400 px-2 py-0.5 rounded-md font-mono">
              SECURE LOGS
            </span>
          </div>

          <div className="p-5 space-y-4">
            
            {/* 1. Selector Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                1. 选择大模型云服务商 / 代理
              </label>
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={activeProvider}
                  onChange={(e) => handleProviderChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-slate-500/40 cursor-pointer"
                >
                  {Object.values(PROVIDERS).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Base Endpoint (show / editable) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  2. 接口端点 Base URL
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">HTTP/HTTPS</span>
              </div>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.yourprovider.com/v1"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 font-mono"
              />
            </div>

            {/* 3. API Key Secret input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between font-sans">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  3. 配置授权凭证 API Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-[10px] text-slate-300 hover:text-white underline font-semibold cursor-pointer"
                >
                  {showApiKey ? '隐藏秘钥' : '明文显示'}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`配置 ${PROVIDERS[activeProvider].name} 的 API Key (例: ${PROVIDERS[activeProvider].placeholderKey})`}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-3.5 pr-20 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 font-mono"
                />
                <span className="absolute right-2 top-2.5 text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 select-none font-mono">
                  AES-256
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 leading-normal">
                🔒 **隐私盾说明**：API 密钥经脱敏并单独加密存储于您的本机浏览器进程 LocalStorage 中。所有对话均通过后台反向代理调用，不进行中央服务器留存。
              </p>
            </div>

            {/* 4. Model Selection */}
            <div className="space-y-1.5 font-sans">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                4. 选择模型系列 Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-slate-500/40 cursor-pointer font-sans"
              >
                <option value="auto">🌐 Auto-Select (模型智能自动选择)</option>
                {PROVIDERS[activeProvider].defaultModels.map((m) => (
                  <option key={m} value={m} className="font-mono">
                    {m}
                  </option>
                ))}
                <option value="custom">✍️ 手动录入自定义模型...</option>
              </select>

              {selectedModel === 'custom' && (
                <div className="mt-2 text-sans">
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(e) => setCustomModelInput(e.target.value)}
                    placeholder="请输入大模型完整标识符 (e.g. gpt-4-turbo, deepseek-r1:70b)"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-slate-500/40 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Control buttons */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClearConfig}
                className="flex-1 py-2.5 bg-black/40 hover:bg-zinc-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-semibold cursor-pointer transition duration-150"
              >
                重置此供应商
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition duration-150 flex items-center justify-center gap-1 border border-white/10 shadow-lg"
              >
                {isSaving ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    激活调用此模型
                  </>
                )}
              </button>
            </div>

            {/* Status Feedback Log block */}
            {statusMessage && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-zinc-300 text-[10px] leading-relaxed flex items-start gap-1.5 font-mono">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <div className="flex-1 break-words">{statusMessage}</div>
              </div>
            )}

            {/* Quick action: Try instant preset prompt */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                💡 沙盒测试热点问题预设
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage("针对 KRAS G12D 突变靶点治疗，MRTX1133 的药理机制、临床试验缓解率如何？是否有联合用药方向？");
                    setStatusMessage("已向沙盒发送测试指令：探讨胰脏癌 KRAS G12D 靶点。");
                  }}
                    className="p-2.5 bg-zinc-900/60 hover:bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-[10px] text-zinc-400 hover:text-white transition text-left cursor-pointer"
                >
                  🧬 探讨 KRAS G12D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSendMessage("胰腺癌术后由于胰腺外分泌障碍出现严重营养不良与腹泻，如何随餐服用胰酶PERT？标准用量是多少？");
                    setStatusMessage("已向沙盒发送测试指令：探讨胰酶替代疗法 PERT 随餐实操。");
                  }}
                    className="p-2.5 bg-zinc-900/60 hover:bg-white/5 border border-white/5 hover:border-white/15 rounded-xl text-[10px] text-zinc-400 hover:text-white transition text-left cursor-pointer"
                >
                  💊 营养摄入 PERT 用量
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Virtual AI Elements Interactive Terminal Sandbox - 7 cols */}
        <div className="lg:col-span-7 bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden glass shadow-xl shadow-black/40 flex flex-col h-[650px] relative font-sans">
          
          {/* Active AI Elements Component Wrapper Badge */}
          <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-slate-500/[0.04] rounded-full blur-[50px] pointer-events-none"></div>

          {/* Top dynamic header containing ModelSelector mock */}
          <div className="p-4 border-b border-white/10 bg-zinc-950/95 flex items-center justify-between shrink-0 z-10 relative">
            <div className="flex items-center gap-2">
              <div className="p-1 px-1.5 bg-slate-500/10 border border-white/10 rounded-lg text-zinc-300 flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-slate-300 animate-pulse" />
                <span className="text-[10px] font-bold font-mono tracking-wide">
                  &lt;ModelSelector&gt;
                </span>
              </div>
              <span className="text-zinc-650 font-mono text-[9px] select-none">|</span>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-ping"></span>
                <span className="text-xs font-semibold text-white font-mono">
                  {selectedModel === 'custom' ? customModelInput || 'custom-model' : selectedModel || 'mock-clinical-engine'}
                </span>
                <span className="text-[9px] opacity-60 text-zinc-400 uppercase">
                  ({activeProvider})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
              <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded text-zinc-400">
                ACTIVE PIPELINE
              </span>
            </div>
          </div>

          {/* Message scroll viewport replicating Vercel AI Elements */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin select-text z-10 relative bg-black/15">
            {messages.map((m) => (
              <div key={m.id} className={`flex items-start gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar identifier */}
                <div className={`p-1.5 rounded-lg border text-[9px] font-bold tracking-wider shrink-0 font-mono select-none ${
                  m.sender === 'user'
                    ? 'bg-zinc-800 text-zinc-100 border-white/10'
                    : 'bg-slate-950/70 text-slate-300 border-white/10'
                }`}>
                  {m.sender === 'user' ? 'USER' : 'OSINT'}
                </div>

                {/* Message Bubble container */}
                <div className={`max-w-[85%] rounded-2xl p-4 relative ${
                  m.sender === 'user'
                    ? 'bg-zinc-900 border border-white/5 rounded-tr-none text-zinc-100'
                    : 'bg-zinc-950/80 border border-slate-500/10 rounded-tl-none text-zinc-300 glass shadow-md shadow-black/20'
                }`}>
                  
                  {/* Model & Token details for AI response */}
                  {m.sender === 'ai' && (
                    <div className="mb-2 pb-1.5 border-b border-white/5 flex items-center justify-between text-[8px] text-zinc-500 font-mono tracking-widest uppercase">
                      <span>&lt;Message&gt; viewport elements</span>
                      <span>citations output</span>
                    </div>
                  )}

                  {/* Attachment Box Renderer if user uploaded */}
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mb-2 p-2 bg-zinc-900/60 border border-white/5 rounded-xl space-y-1">
                      <div className="text-[8px] uppercase font-bold text-zinc-500 flex items-center gap-1">
                        <Paperclip className="h-3 w-3 text-slate-400" />
                        &lt;Attachment&gt; elements attached
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.attachments.map((file) => (
                          <div 
                            key={file.id}
                            className="bg-zinc-950 px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 text-[10px] font-mono text-zinc-300 select-all"
                          >
                            <FileText className="h-3 w-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <span className="text-[8px] text-zinc-500">({file.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thinking/Reasoning block replicating DeepSeek-R1 style Vercel AI Elements */}
                  {m.sender === 'ai' && m.reasoning && (
                    <div className="my-3 bg-zinc-950/90 border border-white/10 rounded-xl overflow-hidden text-[11px] font-mono select-text">
                      <div className="bg-white/5 px-3 py-2 border-b border-white/5 flex items-center justify-between text-zinc-300 text-[10px] font-bold">
                        <span className="flex items-center gap-1.5">
                          <Brain className="h-3.5 w-3.5 text-slate-300 animate-pulse shrink-0" />
                          &lt;Reasoning&gt; Thought Process
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] opacity-70">
                          <Clock className="h-3 w-3" />
                          用时 {m.reasoningTimeMs || 840} ms
                        </div>
                      </div>
                      <div className="p-3 text-zinc-400 leading-relaxed max-h-[140px] overflow-y-auto font-mono text-[10px] scrollbar-thin select-text">
                        {m.reasoning}
                      </div>
                    </div>
                  )}

                  {/* Core markdown styled text elements */}
                  <div className="space-y-2 selection:bg-slate-500/35 break-all">
                    {parseAIElementsMarkdown(m.text, m.citations)}
                  </div>

                  {/* Dynamic inline citations bottom list element (AI Elements Specific) */}
                  {m.sender === 'ai' && m.citations && m.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5 font-sans">
                      <div className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-slate-400" />
                        &lt;Citations&gt; 检索出处证明
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {m.citations.map((c) => (
                          <div 
                            key={c.id}
                            className="p-2 bg-zinc-950 rounded-lg border border-white/10 hover:border-white/20 text-[10px] transition cursor-pointer"
                          >
                            <div className="flex items-center justify-between text-[9px] text-zinc-300 font-semibold mb-0.5">
                              <span className="text-slate-300 font-mono">[{c.id}] {c.title}</span>
                              <a 
                                href={c.url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-slate-400 hover:text-slate-300 ml-1 font-mono text-[8.5px] uppercase flex items-center gap-0.5 underline shrink-0"
                              >
                                Source
                              </a>
                            </div>
                            <p className="text-zinc-500 text-[9.5px] italic font-sans leading-relaxed">
                              {c.excerpt}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message timestamp indicator element */}
                  <div className="text-[8px] text-zinc-500 font-mono mt-2 text-right">
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {/* AI Typing state block */}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg border text-[9px] font-bold tracking-wider shrink-0 font-mono bg-slate-950/70 text-slate-300 border-white/10">
                  OSINT
                </div>
                <div className="max-w-[80%] rounded-2xl p-4 bg-zinc-950/70 border border-white/10 rounded-tl-none text-zinc-300 glass flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce duration-300"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.15s] duration-300"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.3s] duration-300"></span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono tracking-widest animate-pulse font-semibold">
                      THINKING (R1 Pipeline Active)...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={endOfChatRef} />
          </div>

          {/* Sandbox Drag and Drop file overlay */}
          {dragActive && (
            <div 
              onDragEnter={handleDrag} 
              onDragOver={handleDrag} 
              onDragLeave={handleDrag} 
              onDrop={handleDrop}
              className="absolute inset-0 z-30 bg-slate-950/55 backdrop-blur-xs border-2 border-dashed border-slate-400 flex flex-col items-center justify-center p-6 text-center"
            >
              <Paperclip className="h-12 w-12 text-slate-300 animate-bounce mb-3" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">拖拽文件到此处</h3>
              <p className="text-xs text-zinc-300 mt-2 max-w-sm leading-normal">
                支持报告、PDF、图片和文本附件。
              </p>
            </div>
          )}

          {/* Attachment tray inside input */}
          {attachedFiles.length > 0 && (
            <div className="px-4 py-2 bg-zinc-950/90 border-t border-white/5 flex flex-wrap gap-1.5 shrink-0 z-10 relative">
              {attachedFiles.map((f) => (
                <div 
                  key={f.id}
                  className="bg-zinc-900 border border-white/10 hover:border-red-500/20 px-2 py-1 rounded-lg flex items-center gap-2 text-[10px] font-mono text-zinc-300 transition group select-none"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <span className="text-[8px] text-zinc-500">({f.size})</span>
                  <button 
                    onClick={() => handleRemoveAttachment(f.id)}
                    className="p-0.5 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
                    title="移除本文件"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Core Chat Input zone conforming to Vercel AI Elements */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            onDragEnter={handleDrag}
            className="p-4 border-t border-white/10 bg-zinc-950/95 shrink-0 z-10 relative flex items-center gap-2"
          >
            
            {/* Attachment paperclip trigger button */}
            <div className="relative shrink-0">
              <input 
                id="playground_file_input"
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden" 
              />
              <label 
                htmlFor="playground_file_input"
                className="p-3 bg-zinc-900 border border-white/10 hover:border-slate-500/30 text-zinc-400 hover:text-slate-300 rounded-xl flex items-center justify-center transition cursor-pointer"
                title="上传临床病理 PDF / 照片等附件特征"
              >
                <Paperclip className="h-4.5 w-4.5" />
              </label>
            </div>

            <input 
              type="text" 
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder={isTyping ? '提供商接口正在反馈中，请耐心等候...' : '输入提问或指令，AI Elements Primitives 进行解析...'}
              disabled={isTyping}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-500/40 transition disabled:opacity-50 font-sans"
            />

            <button
              type="submit"
              disabled={isTyping || (!promptInput.trim() && attachedFiles.length === 0)}
                  className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl cursor-pointer transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shrink-0 border border-white/10 shadow-lg"
              title="提交查询"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>

        </div>

      </div>

      {/* Section 3: Next.js & AI SDK Setup & Deployment Blueprint Recipe */}
      <div className="bg-zinc-950/80 border border-white/10 rounded-2xl overflow-hidden glass shadow-xl shadow-black/40 font-mono text-zinc-300">
        
        {/* Dynamic header tabs */}
        <div className="p-4 border-b border-white/10 bg-zinc-950/95 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <div className="flex items-center gap-2">
            <Code className="h-5 w-5 text-slate-300" />
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Next.js + AI SDK (AI Elements) 部署与集成方法指南
              </h2>
              <p className="text-[10px] text-zinc-500 mt-0.5">
                如何在本机以及云端部署使用最新 AI SDK，适配极简 Vercel AI Elements 前端规范
              </p>
            </div>
          </div>

          <div className="flex bg-zinc-900 border border-white/5 rounded-xl p-1 text-[11px] font-semibold shrink-0">
            <button
              type="button"
              onClick={() => setDocTab('vercel_sdk')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${docTab === 'vercel_sdk' ? 'bg-white/5 text-white border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              1. 安装依赖 & env
            </button>
            <button
              type="button"
              onClick={() => setDocTab('ai_elements')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${docTab === 'ai_elements' ? 'bg-white/5 text-white border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              2. 路由接口 (chat/route)
            </button>
            <button
              type="button"
              onClick={() => setDocTab('custom_router')}
              className={`px-3 py-1.5 rounded-lg cursor-pointer transition ${docTab === 'custom_router' ? 'bg-white/5 text-white border border-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              3. AI Elements 组件使用
            </button>
          </div>
        </div>

        {/* Recipe detail container */}
        <div className="p-5 overflow-x-auto selection:bg-slate-500/35 leading-relaxed text-xs">
          
          {docTab === 'vercel_sdk' && (
            <div className="space-y-4">
              <div className="space-y-1.5 font-sans">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase block">
                  Step 1. 初始化 Next.js 项目并安装核心 AI SDK 库
                </span>
                <p className="text-[11px] text-zinc-400">
                  执行以下命令，在您的 Next.js 根目录下引入核心 Vercel AI SDK 以及各家大模型官方驱动提供商包：
                </p>
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 relative">
                <button
                  onClick={() => handleCopyCode(`npm install ai @ai-sdk/openai @ai-sdk/google @ai-sdk/anthropic lucide-react`, 'd1')}
                  className="absolute right-3 top-3 text-[10px] text-slate-400 hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer bg-black/40 px-2 py-1 rounded"
                >
                  {copiedCode === 'd1' ? <Check className="h-3 w-3 text-slate-300" /> : <Copy className="h-3 w-3" />}
                  {copiedCode === 'd1' ? '已复制' : '复制代码'}
                </button>
                <div className="text-slate-300 select-all font-mono leading-normal">
                  # 安装 Vercel AI SDK 和主要的提供商包<br/>
                  <span className="text-white">npm install ai @ai-sdk/openai @ai-sdk/google @ai-sdk/anthropic lucide-react</span>
                </div>
              </div>

              <div className="space-y-1.5 font-sans pt-2">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase block">
                  Step 2. 注入多通道环境变量 (.env)
                </span>
                <p className="text-[11px] text-zinc-400">
                  根据您的目标模型，在 Next.js 的本地环境配置文件中写入如下密钥与基座地址：
                </p>
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 relative">
                <button
                  onClick={() => handleCopyCode(`# Google Gemini API Key\nGEMINI_API_KEY="AIzaSy..."\n\n# OpenAI Key & Base Endpoint\nOPENAI_API_KEY="sk-proj-..."\n\n# SiliconFlow Key\nSILICONFLOW_API_KEY="sk-sf-..."\nSILICONFLOW_BASE_URL="https://api.siliconflow.cn/v1"\n\n# OpenRouter API Key\nOPENROUTER_API_KEY="sk-or-..."`, 'd2')}
                  className="absolute right-3 top-3 text-[10px] text-slate-400 hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer bg-black/40 px-2 py-1 rounded"
                >
                  {copiedCode === 'd2' ? <Check className="h-3 w-3 text-slate-300" /> : <Copy className="h-3 w-3" />}
                  {copiedCode === 'd2' ? '已复制' : '复制代码'}
                </button>
                <pre className="text-zinc-400 select-all font-mono leading-relaxed">
{`# 谷歌 Gemini 系列原生密钥
GEMINI_API_KEY="AIzaSy..."

# OpenAI 官方主流密钥
OPENAI_API_KEY="sk-proj-..."

# 硅基流动 SiliconFlow 极速代理链路
SILICONFLOW_API_KEY="sk-sf-..."
SILICONFLOW_BASE_URL="https://api.siliconflow.cn/v1"

# OpenRouter 聚合服务密钥
OPENROUTER_API_KEY="sk-or-..."`}
                </pre>
              </div>

            </div>
          )}

          {docTab === 'ai_elements' && (
            <div className="space-y-4">
              <div className="space-y-1.5 font-sans font-sans">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase block">
                  Step 3. 开发 Next.js App Router 动态流式后端路由 (/app/api/chat/route.ts)
                </span>
                <p className="text-[11px] text-zinc-400">
                  支持自定义前端上传 API 密钥或缺省环境密钥的多架构集成流。支持流式返回，天然契合 AI Elements 渲染管道：
                </p>
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 relative max-h-[350px] overflow-y-auto scrollbar-thin">
                <button
                  onClick={() => handleCopyCode(NEXTJS_RAW_API, 'd3')}
                  className="absolute right-3 top-3 text-[10px] text-slate-400 hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer bg-black/40 px-2 py-1 rounded z-20"
                >
                  {copiedCode === 'd3' ? <Check className="h-3 w-3 text-slate-300" /> : <Copy className="h-3 w-3" />}
                  {copiedCode === 'd3' ? '已复制' : '复制代码'}
                </button>
                <pre className="text-slate-300 select-all font-mono leading-relaxed">
{NEXTJS_RAW_API}
                </pre>
              </div>
            </div>
          )}

          {docTab === 'custom_router' && (
            <div className="space-y-4">
              <div className="space-y-1.5 font-sans">
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase block">
                  Step 4. 在前端页绘制 Vercel AI Elements 标准拟合组件
                </span>
                <p className="text-[11px] text-zinc-400">
                  在 React/Next.js 客户端组件中，直接引用 `@ai-sdk/ui` 导出的 `useChat` 与 AI Elements 核心 Primitives。支持实时解析 Citation 引文与思维链 Reasoning：
                </p>
              </div>

              <div className="bg-zinc-900 p-4 rounded-xl border border-white/10 relative max-h-[350px] overflow-y-auto scrollbar-thin">
                <button
                  onClick={() => handleCopyCode(NEXTJS_RAW_FE, 'd4')}
                  className="absolute right-3 top-3 text-[10px] text-slate-400 hover:text-slate-300 font-semibold flex items-center gap-1 cursor-pointer bg-black/40 px-2 py-1 rounded z-20"
                >
                  {copiedCode === 'd4' ? <Check className="h-3 w-3 text-slate-300" /> : <Copy className="h-3 w-3" />}
                  {copiedCode === 'd4' ? '已复制' : '复制代码'}
                </button>
                <pre className="text-slate-300 select-all font-mono leading-relaxed">
{NEXTJS_RAW_FE}
                </pre>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

// Sub components helper: Parse citations dynamically and highlight inline citation numbers [1], [2] in text blocks
function parseAIElementsMarkdown(text: string, citations?: any[]) {
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, blockIdx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('###')) {
      return (
        <h3 key={blockIdx} className="text-xs font-bold text-slate-300 uppercase tracking-wider mt-4 mb-2 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span>
          {parseInlineCitations(trimmed.replace(/^###\s*/, ''), citations)}
        </h3>
      );
    }

    if (trimmed.startsWith('####')) {
      return (
        <h4 key={blockIdx} className="text-[11px] font-semibold text-zinc-200 mt-3 mb-1.5 pl-2 border-l-2 border-white/10 uppercase">
          {parseInlineCitations(trimmed.replace(/^####\s*/, ''), citations)}
        </h4>
      );
    }

    // List item check
    const lines = trimmed.split('\n');
    const isList = lines.every(l => {
      const t = l.trim();
      return t.startsWith('*') || t.startsWith('-') || /^\d+\./.test(t);
    });

    if (isList) {
      return (
        <ul key={blockIdx} className="space-y-1.5 my-3 pl-1">
          {lines.map((line, lineIdx) => {
            const t = line.trim();
            let content = t;
            let marker = <span className="text-slate-400 shrink-0 font-bold select-none">✦</span>;

            if (t.startsWith('*')) {
              content = t.replace(/^\*\s*/, '');
            } else if (t.startsWith('-')) {
              content = t.replace(/^-\s*/, '');
            } else {
              const match = t.match(/^(\d+)\.\s*/);
              if (match) {
                marker = <span className="text-slate-300 font-mono text-[9px] shrink-0 font-bold">{match[1]}.</span>;
                content = t.replace(/^\d+\.\s*/, '');
              }
            }

            return (
              <li key={lineIdx} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2 pl-1 py-0.5">
                {marker}
                <div className="flex-1">{parseInlineCitations(content, citations)}</div>
              </li>
            );
          })}
        </ul>
      );
    }

    return (
      <p key={blockIdx} className="text-xs text-zinc-300 leading-relaxed leading-normal select-text">
        {parseInlineCitations(trimmed, citations)}
      </p>
    );
  });
}

// Inline Citation parser wrapping [1] or [2] into elegant glowing interactive badges
function parseInlineCitations(text: string, citations?: any[]) {
  const parts: React.ReactNode[] = [];
  const regex = /(\[(\d+)\])/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const startIdx = match.index;
    if (startIdx > lastIdx) {
      parts.push(parseStrongTags(text.substring(lastIdx, startIdx)));
    }

    const citationId = parseInt(match[2], 10);
    const linkedCitation = citations?.find(c => c.id === citationId);

    parts.push(
      <span 
        key={startIdx}
        className="inline-flex items-center mx-0.5"
        title={linkedCitation?.title || `Citation [${citationId}]`}
      >
        <span className="cursor-help text-[9px] font-mono font-bold bg-slate-500/15 hover:bg-slate-500/25 text-slate-300 border border-slate-500/30 px-1 rounded transition">
          [{citationId}]
        </span>
      </span>
    );

    lastIdx = regex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(parseStrongTags(text.substring(lastIdx)));
  }

  return parts.length > 0 ? parts : parseStrongTags(text);
}

// Weak inline bold checker
function parseStrongTags(text: string) {
  const tokens: React.ReactNode[] = [];
  // simple strong and code block parse
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  parts.forEach((p, idx) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      tokens.push(<strong key={idx} className="font-semibold text-white">{p.substring(2, p.length - 2)}</strong>);
    } else if (p.startsWith('`') && p.endsWith('`')) {
      tokens.push(<code key={idx} className="bg-white/10 text-slate-200 px-1 py-0.2 rounded font-mono text-[9.5px] border border-white/5 mx-0.5">{p.substring(1, p.length - 1)}</code>);
    } else {
      tokens.push(p);
    }
  });
  return tokens.length > 0 ? tokens : text;
}


// Copyable code templates for Next.js Tab displays
const NEXTJS_RAW_API = `// /app/api/chat/route.ts
import { generateText, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenAI } from '@ai-sdk/google';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, config } = await req.json();

  // 1. 判断是否传入用户端定制密钥，否则取系统内置缺省密钥
  const userApiKey = config?.apiKey || '';
  const provider = config?.provider || 'gemini';
  const selectedModel = config?.model || 'gemini-1.5-flash';
  const customBaseUrl = config?.baseUrl || '';

  try {
    // 2. 选择具体的大模型提供商
    if (provider === 'gemini') {
      const google = createGoogleGenAI({
        apiKey: userApiKey || process.env.GEMINI_API_KEY
      });
      const result = await streamText({
        model: google(selectedModel),
        messages,
      });
      return result.toDataStreamResponse();
    }

    if (provider === 'openai') {
      const openai = createOpenAI({
        apiKey: userApiKey || process.env.OPENAI_API_KEY
      });
      const result = await streamText({
        model: openai(selectedModel),
        messages,
      });
      return result.toDataStreamResponse();
    }

    if (provider === 'siliconflow' || provider === 'openai_compatible') {
      const customClient = createOpenAI({
        apiKey: userApiKey || process.env.SILICONFLOW_API_KEY,
        baseURL: customBaseUrl || process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'
      });
      const result = await streamText({
        model: customClient(selectedModelConfigured),
        messages,
      });
      return result.toDataStreamResponse();
    }

    // 默认兜底
    return Response.json({ text: 'No viable provider configured' });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}`;

const NEXTJS_RAW_FE = `// /app/chat/page.tsx
'use client';

import { useChat } from 'ai/react';
import React, { useState } from 'react';
import { Brain, Paperclip, Send } from 'lucide-react';

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      config: {
        provider: 'siliconflow',
        model: 'deepseek-ai/DeepSeek-R1'
      }
    }
  });

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto border bg-zinc-950 p-4">
      {/* <ModelSelector> layout */}
      <div className="p-3 border-b border-zinc-800 text-xs text-white">
        &lt;ModelSelector&gt; deepseek-ai/DeepSeek-R1
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 my-4">
        {messages.map((m) => (
          <div key={m.id} className="p-3 bg-zinc-900 border rounded-xl">
            <div className="text-[10px] text-zinc-500 uppercase">{m.role}</div>
            
            {/* If model has reasoning, like DeepSeek-R1, custom parse reasoning block */}
            {m.reasoning && (
              <div className="bg-black/40 p-2 font-mono text-[10px] text-zinc-400 mt-2">
                &lt;Reasoning&gt; {m.reasoning}
              </div>
            )}
            
            <p className="text-xs text-white mt-1">{m.content}</p>
          </div>
        ))}
      </div>

      {/* Attachment & Input elements */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          value={input} 
          onChange={handleInputChange} 
          placeholder="Type elements prompt..." 
          className="flex-1 bg-zinc-900 border text-xs p-3 text-white focus:outline-none"
        />
        <button type="submit" className="bg-slate-700 px-4 text-xs font-bold">
          Send
        </button>
      </form>
    </div>
  );
}`;
