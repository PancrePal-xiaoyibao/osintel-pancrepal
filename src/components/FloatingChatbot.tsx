import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  X,
  Send,
  Loader2,
  Settings,
  Plus,
  MessageSquare,
  Trash2,
  Brain,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles
} from 'lucide-react';
import {
  LLM_PROVIDER_IDS,
  getLlmProvider,
  getProviderModelOptions,
  PROVIDER_STORAGE_KEYS
} from '../lib/llm-providers';

/**
 * Global floating AI chatbot.
 *
 * AI-Elements-style assistant (the real Vercel ai-elements requires Next.js;
 * this is a styled equivalent for the Vite SPA). Features: provider/model
 * selection incl. custom, credential config, conversation memory + multi-session
 * history persisted to localStorage, optional system context, and a collapsible
 * "thinking"/reasoning view. Backed by /api/osint/chat-custom.
 */

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  ts: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMsg[];
  createdAt: number;
  updatedAt: number;
}

const CHATS_KEY = 'pancreas_floating_chats';
const CONTEXT_KEY = 'pancreas_floating_context';

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversations(list: Conversation[]) {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    // ignore quota errors
  }
}

function newConversation(): Conversation {
  const now = Date.now();
  return { id: `chat-${now}`, title: '新对话', messages: [], createdAt: now, updatedAt: now };
}

function readStoredConfig(provider: string): { apiKey: string; baseUrl: string; model: string } {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEYS.configs);
    if (raw) {
      const configs = JSON.parse(raw);
      const c = configs[provider];
      if (c) return { apiKey: c.apiKey || '', baseUrl: c.baseUrl || '', model: c.model || '' };
    }
  } catch {
    // ignore
  }
  const defaults = getLlmProvider(provider);
  return { apiKey: '', baseUrl: defaults.defaultBaseUrl, model: defaults.defaultModels[0] || '' };
}

export default function FloatingChatbot() {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  // Provider configuration (shared with the app's global AI config).
  const [provider, setProvider] = useState<string>('siliconflow');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [context, setContext] = useState('');

  const endRef = useRef<HTMLDivElement | null>(null);

  // Load persisted state on mount.
  useEffect(() => {
    const list = loadConversations();
    if (list.length) {
      setConversations(list);
      setActiveId(list[0].id);
    } else {
      const fresh = newConversation();
      setConversations([fresh]);
      setActiveId(fresh.id);
    }

    let activeProvider = 'siliconflow';
    try {
      activeProvider = localStorage.getItem(PROVIDER_STORAGE_KEYS.activeProvider) || 'siliconflow';
    } catch {
      // ignore
    }
    setProvider(activeProvider);
    const cfg = readStoredConfig(activeProvider);
    setApiKey(cfg.apiKey);
    setBaseUrl(cfg.baseUrl);
    setModel(cfg.model);
    try {
      setContext(localStorage.getItem(CONTEXT_KEY) || '');
    } catch {
      // ignore
    }
  }, []);

  // Reload credentials when provider changes.
  useEffect(() => {
    const cfg = readStoredConfig(provider);
    setApiKey(cfg.apiKey);
    setBaseUrl(cfg.baseUrl);
    setModel(cfg.model || getProviderModelOptions(provider)[0] || '');
  }, [provider]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, loading]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const persist = (list: Conversation[]) => {
    setConversations(list);
    saveConversations(list);
  };

  const updateActive = (updater: (conv: Conversation) => Conversation) => {
    setConversations((prev) => {
      const next = prev.map((c) => (c.id === activeId ? updater(c) : c));
      saveConversations(next);
      return next;
    });
  };

  const handleNewChat = () => {
    const fresh = newConversation();
    const next = [fresh, ...conversations];
    persist(next);
    setActiveId(fresh.id);
    setShowHistory(false);
  };

  const handleDeleteChat = (id: string) => {
    const next = conversations.filter((c) => c.id !== id);
    const finalList = next.length ? next : [newConversation()];
    persist(finalList);
    if (id === activeId) setActiveId(finalList[0].id);
  };

  const saveConfig = () => {
    const resolvedModel = customModel.trim() || model;
    try {
      localStorage.setItem(PROVIDER_STORAGE_KEYS.activeProvider, provider);
      let configs: Record<string, any> = {};
      const raw = localStorage.getItem(PROVIDER_STORAGE_KEYS.configs);
      if (raw) configs = JSON.parse(raw);
      configs[provider] = { apiKey, baseUrl, model: resolvedModel };
      localStorage.setItem(PROVIDER_STORAGE_KEYS.configs, JSON.stringify(configs));
      localStorage.setItem(CONTEXT_KEY, context);
    } catch {
      // ignore
    }
    setModel(resolvedModel);
    setCustomModel('');
    setShowSettings(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !active) return;

    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', content: text, ts: Date.now() };
    const isFirst = active.messages.length === 0;
    updateActive((c) => ({
      ...c,
      title: isFirst ? text.slice(0, 18) : c.title,
      messages: [...c.messages, userMsg],
      updatedAt: Date.now()
    }));
    setInput('');
    setLoading(true);

    const history = [...active.messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
    if (context.trim()) {
      history.unshift({ role: 'user', content: `[系统设定/上下文]\n${context.trim()}` });
    }

    try {
      const resp = await fetch('/api/osint/chat-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          config: { provider, apiKey, baseUrl, model: customModel.trim() || model || 'auto' }
        })
      });
      const data = await resp.json();
      const aiMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.text || '（无返回内容）',
        reasoning: data.reasoning || undefined,
        ts: Date.now()
      };
      updateActive((c) => ({ ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() }));
    } catch (_) {
      const errMsg: ChatMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '网络错误，请稍后重试。',
        ts: Date.now()
      };
      updateActive((c) => ({ ...c, messages: [...c.messages, errMsg], updatedAt: Date.now() }));
    } finally {
      setLoading(false);
    }
  };

  const providerDef = getLlmProvider(provider);
  const modelOptions = getProviderModelOptions(provider);

  return (
    <>
      {/* Floating action button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-[60] h-14 w-14 rounded-2xl bg-gradient-to-tr from-teal-600 to-purple-600 text-white shadow-2xl shadow-black/40 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer group"
          title="AI 助手"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-teal-400 border-2 border-[#050505] animate-pulse" />
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 left-6 z-[60] w-[min(94vw,420px)] h-[min(82vh,640px)] flex flex-col rounded-2xl border border-white/15 bg-[#0b0f17] shadow-2xl shadow-black/60 overflow-hidden glass">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-500/15 border border-teal-500/30 rounded-lg text-teal-300">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-white">小胰宝 AI 助手</div>
                <div className="text-[10px] text-zinc-500 font-mono">{providerDef.name} · {customModel.trim() || model || 'auto'}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleNewChat} title="新对话" className="p-1.5 text-zinc-400 hover:text-teal-300 hover:bg-white/5 rounded-lg cursor-pointer">
                <Plus className="h-4 w-4" />
              </button>
              <button onClick={() => setShowHistory((v) => !v)} title="历史对话" className={`p-1.5 rounded-lg cursor-pointer ${showHistory ? 'text-teal-300 bg-white/5' : 'text-zinc-400 hover:text-teal-300 hover:bg-white/5'}`}>
                <MessageSquare className="h-4 w-4" />
              </button>
              <button onClick={() => setShowSettings((v) => !v)} title="配置" className={`p-1.5 rounded-lg cursor-pointer ${showSettings ? 'text-teal-300 bg-white/5' : 'text-zinc-400 hover:text-teal-300 hover:bg-white/5'}`}>
                <Settings className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} title="关闭" className="p-1.5 text-zinc-400 hover:text-rose-300 hover:bg-white/5 rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="absolute top-[57px] left-0 right-0 bottom-0 z-10 bg-[#0b0f17]/98 backdrop-blur p-3 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-zinc-300">历史对话 ({conversations.length})</span>
                <button onClick={handleNewChat} className="text-[11px] text-teal-300 flex items-center gap-1 cursor-pointer"><Plus className="h-3 w-3" />新建</button>
              </div>
              <div className="space-y-1.5">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer transition ${
                      c.id === activeId ? 'bg-teal-500/10 border-teal-500/30' : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                    onClick={() => {
                      setActiveId(c.id);
                      setShowHistory(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="text-xs text-white truncate">{c.title}</div>
                      <div className="text-[10px] text-zinc-500">{c.messages.length} 条 · {new Date(c.updatedAt).toLocaleDateString()}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(c.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings panel */}
          {showSettings && (
            <div className="absolute top-[57px] left-0 right-0 bottom-0 z-10 bg-[#0b0f17]/98 backdrop-blur p-4 overflow-y-auto space-y-3">
              <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" />模型与上下文配置</div>

              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">提供商 Provider</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full text-xs bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-teal-500/50">
                  {LLM_PROVIDER_IDS.map((id) => (
                    <option key={id} value={id}>{getLlmProvider(id).name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">模型 Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full text-xs bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-teal-500/50 mb-1.5">
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input value={customModel} onChange={(e) => setCustomModel(e.target.value)} placeholder="或自定义模型名 (覆盖上方)" className="w-full text-xs bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-teal-500/50" />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">API Key（留空则用服务端托管/仿真）</label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={providerDef.placeholderKey} className="w-full text-xs bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-2 pr-9 text-white focus:outline-none focus:border-teal-500/50" />
                  <button onClick={() => setShowKey((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer">
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">Base URL（可选）</label>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={providerDef.defaultBaseUrl} className="w-full text-xs bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-teal-500/50" />
              </div>

              <div>
                <label className="block text-[10px] text-zinc-500 mb-1 uppercase tracking-wider">系统上下文 / 记忆设定（可选）</label>
                <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="例如：你是胰腺癌科研助手，回答需附循证依据..." className="w-full text-xs bg-zinc-950 border border-white/10 rounded-lg px-2.5 py-2 text-white focus:outline-none focus:border-teal-500/50 resize-none leading-relaxed" />
              </div>

              <button onClick={saveConfig} className="w-full bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold py-2 rounded-lg cursor-pointer transition">保存配置</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {active && active.messages.length === 0 && (
              <div className="text-center text-zinc-500 text-xs mt-8 px-4">
                <Bot className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                我是小胰宝 AI 助手，支持多模型、思维链与历史记忆。<br />在下方输入你的问题开始对话。
              </div>
            )}
            {active?.messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-teal-600/20 border border-teal-500/30 text-white' : 'bg-zinc-900/70 border border-white/10 text-zinc-200'
                }`}>
                  {m.role === 'assistant' && m.reasoning && (
                    <div className="mb-2">
                      <button
                        onClick={() => setExpandedReasoning((p) => ({ ...p, [m.id]: !p[m.id] }))}
                        className="flex items-center gap-1 text-[10px] text-purple-300 hover:text-purple-200 cursor-pointer font-mono"
                      >
                        {expandedReasoning[m.id] ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        <Brain className="h-3 w-3" /> 思维链 Thinking
                      </button>
                      {expandedReasoning[m.id] && (
                        <div className="mt-1.5 bg-black/40 border-l-2 border-purple-500/50 pl-2.5 py-1.5 text-[11px] text-zinc-400 whitespace-pre-wrap rounded-r">
                          {m.reasoning}
                        </div>
                      )}
                    </div>
                  )}
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-900/70 border border-white/10 rounded-2xl px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10 bg-zinc-950/60 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="输入消息，Enter 发送..."
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-3.5 flex items-center cursor-pointer transition disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
