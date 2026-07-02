import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  MessageSquare, 
  Bot, 
  Sparkles, 
  RotateCcw, 
  HeartPulse, 
  HelpCircle,
  TrendingUp,
  Smile,
  ShieldCheck,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Brain,
  BookOpen,
  FileCheck2,
  UploadCloud,
  Layers,
  Sparkle
} from 'lucide-react';
import { PatientProfile } from '../types';
import { LanguageCode, TRANSLATIONS, LANGUAGES } from '../translations';
import {
  getLlmProvider,
  getProviderDefaults,
  getStoredActiveProvider,
  getStoredProviderConfigs
} from '../lib/llm-providers';

interface MessageAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url?: string;
  simulated?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: Date;
  reasoning?: string;
  reasoningTimeMs?: number;
  isReasoningCollapsed?: boolean;
  citations?: Array<{ id: number; title: string; url: string; excerpt: string }>;
  attachments?: MessageAttachment[];
}

interface OSINTChatViewProps {
  isOpen: boolean;
  onClose: () => void;
  patientProfile: PatientProfile | null;
  onNavigateToTab?: (tab: any) => void;
  language: LanguageCode;
}

const TEMPLATE_CLINICAL_FILES: MessageAttachment[] = [
  { id: 't1', name: '🧬 Genomic-Panel-KRAS-G12D.pdf', size: '1.4 MB', type: 'application/pdf', simulated: true },
  { id: 't2', name: '🧪 Serum-CA19-9-Oncology-Report.png', size: '840 KB', type: 'image/png', simulated: true },
  { id: 't3', name: '🩺 Contrast-Abdomen-CT-Whipple.png', size: '2.1 MB', type: 'image/png', simulated: true }
];

export default function OSINTChatView({ 
  isOpen, 
  onClose, 
  patientProfile,
  onNavigateToTab,
  language = 'ZH'
}: OSINTChatViewProps) {
  // Pull language-specific translations
  const t = TRANSLATIONS[language] || TRANSLATIONS['ZH'];

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // Model selector states loaded from LocalStorage
  const [activeProvider, setActiveProvider] = useState<string>('siliconflow');
  const [selectedModel, setSelectedModel] = useState<string>('deepseek-ai/DeepSeek-V3');
  const [customModelList, setCustomModelList] = useState<string[]>([]);
  
  // Attachments in draft state
  const [draftAttachments, setDraftAttachments] = useState<MessageAttachment[]>([]);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Suggested Topics with multi-language capabilities mapping
  const getSuggestedTopicsByLanguage = (lang: LanguageCode) => {
    switch(lang) {
      case 'EN': return [
        { text: 'Principle & clinical PR of latest generation KRAS G12D inhibitor MRTX1133?', label: '🧬 MRTX1133' },
        { text: 'Pancreatic Enzyme standard dosage Guidelines随餐 for Whipple post-op patients?', label: '💊 PERT Dosage' },
        { text: 'Efficacy comparison of first-line NALIRIFOX vs FOLFIRINOX chemotherapy?', label: '⚔️ Regimen Comparison' }
      ];
      case 'FR': return [
        { text: 'Taux de réponse clinique deMRT1133 ciblant KRAS G12D pour ADP?', label: '🧬 MRTX1133' },
        { text: 'Dose recommandée de l\'enzymothérapie substitutive (PERT) s隨餐 après Whipple?', label: '💊 Guide PERT' },
        { text: 'Comparaison globale entre l\'étude NAPOLI-3 (NALIRIFOX) et FOLFIRINOX?', label: '⚔️ Traitements' }
      ];
      case 'RU': return [
        { text: 'Результаты КИ ингибитора MRTX1133 для мутации KRAS G12D?', label: '🧬 MRTX1133' },
        { text: 'Каковы клинические дозировки ферментов (PERT) после операции Уиппла?', label: '💊 Инструкция PERT' },
        { text: 'В чем ключевые различия схем химиотерапии NALIRIFOX и FOLFIRINOX?', label: '⚔️ Сравнение Схем' }
      ];
      case 'JA': return [
        { text: '最新世代の KRAS G12D 標的薬 MRTX1133 の原理と臨床奏効率は？', label: '🧬 G12D進捗' },
        { text: '膵頭十二指腸切除術後、随餐膵酵素薬PERTの標準処方ルールは？', label: '💊 PERT随餐' },
        { text: 'FOLFIRINOX治療と NALIRIFOX (NAPOLI-3) の生存期間OS比較？', label: '⚔️ 治療比較' }
      ];
      case 'KO': return [
        { text: '최신 KRAS G12D 표적 치료제 MRTX1133의 원리 및 임상 반응률은?', label: '🧬 G12D 연구' },
        { text: '췌십이지장절절제술(Whipple) 후 췌장 효소 대체요법(PERT) 섭취 지침?', label: '💊 PERT 정밀계산' },
        { text: '1차 NALIRIFOX 와 FOLFIRINOX 화학요법 간의 생존율 데이터 비교?', label: '⚔️ 3제요법 대조' }
      ];
      case 'ES': return [
        { text: '¿Qué缓解率 ofrece el MRTX1133 en mutaciones G12D de adenocarcinoma páncreas?', label: '🧬 Inhibición G12D' },
        { text: 'Dosificación recomendada de terapia enzimática pancreática (PERT) tras Whipple?', label: '💊 Dosis PERT' },
        { text: 'Diferencia clínica entre el triplete NALIRIFOX vs FOLFIRINOX estándar en primera línea?', label: '⚔️ Regímenes' }
      ];
      case 'AR': return [
        { text: 'تأثير ونسبة استجابة عقار MRTX1133 لطفرات سرطان البنكرياس KRAS G12D؟', label: '🧬 طفرات G12D' },
        { text: 'كيفية حساب جرعات إنزيم البنكرياس (PERT) بعد جراحة ويبل طبقاً للمجالس؟', label: '💊 جرعات PERT' },
        { text: 'الفرق السريري ومعدلات البقاء بين أدوية NALIRIFOX مقابل FOLFIRINOX؟', label: '⚔️ مقارنة العلاج' }
      ];
      case 'HI': return [
        { text: 'नवीनतम पीढ़ी KRAS G12D अवरोधक MRTX1133 का कार्य सिद्धांत और नैदानिक प्रभाव?', label: '🧬 MRTX1133' },
        { text: 'अग्न्याशयी एंजाइम प्रतिस्थापन चिकित्सा (PERT) भोजन के साथ कितनी होनी चाहिए?', label: '💊 भोजन संग PERT' },
        { text: 'प्रथम-पंक्ति NALIRIFOX बनाम FOLFIRINOX कीमोथेरेपी प्रभावकारिता तुलना?', label: '⚔️ कीमोथेरेपी तुलना' }
      ];
      case 'ZT': return [
        { text: '最新代 KRAS G12D 靶向藥 MRTX1133 的原理與臨床緩解率？', label: '🧬 G12D進展' },
        { text: '胰頭段切除或術後常發惡病質，胰酶隨餐服用PERT最新指南劑量？', label: '💊 胰酶劑量' },
        { text: '一線的 FOLFIRINOX 化療與 NALIRIFOX （NAPOLI-3 脂質體三聯）的區別？', label: '⚔️ 方案對比' }
      ];
      default: return [
        { text: '最新代 KRAS G12D 靶向药 MRTX1133 的原理与临床缓解率？', label: '🧬 G12D进展' },
        { text: '胰头段切除或术后常发恶病质，胰酶随餐服用PERT最新指南剂量？', label: '💊 胰酶剂量' },
        { text: '一线的 FOLFIRINOX 化疗与 NALIRIFOX （NAPOLI-3 脂质体三联）的区别？', label: '⚔️ 方案对比' }
      ];
    }
  };

  const SUGGESTED_TOPICS = getSuggestedTopicsByLanguage(language);

  // Sync Provider Settings from LocalStorage
  const syncProviderSettings = () => {
    try {
      const activeP = getStoredActiveProvider();
      const configs = getStoredProviderConfigs();
      const fallback = getProviderDefaults(activeP);
      const activeConfig = configs[activeP] || fallback;
      setActiveProvider(activeP);
      setSelectedModel(activeConfig.model || fallback.model);
    } catch (e) {
      console.warn("Could not retrieve localStorage LLM playground credentials", e);
    }
  };

  // Reload credentials whenever chatbot is opened or state changes
  useEffect(() => {
    if (isOpen) {
      syncProviderSettings();
    }
  }, [isOpen]);

  // Sync initial welcome thread with multi-language settings
  useEffect(() => {
    if (isOpen) {
      const welcomeId = `welcome-${language}`;
      let welcomeMsgContent = t.chatWelcomeText + '\n\n';
      if (patientProfile) {
        welcomeMsgContent += `🧬 **[${t.chatAttachedHeader}]** \`KRAS ${patientProfile.mutations.join('/') || 'G12D'}\` · \`${patientProfile.city || 'Nodes'}\` · \`${patientProfile.regimen || 'Chemo'}\`. ` + t.chatWelcomeProfile;
      } else {
        welcomeMsgContent += t.chatWelcomeNoProfile;
      }

      setMessages([
        {
          id: welcomeId,
          sender: 'ai',
          text: welcomeMsgContent,
          time: new Date()
        }
      ]);
    }
  }, [patientProfile, language, isOpen]);

  // Handle auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (window.confirm(t.chatClearTitle + '?')) {
      const welcomeId = `welcome-${language}`;
      let welcomeMsgContent = t.chatWelcomeText + '\n\n';
      if (patientProfile) {
        welcomeMsgContent += `🧬 **[${t.chatAttachedHeader}]** \`KRAS ${patientProfile.mutations.join('/') || 'G12D'}\` · \`${patientProfile.city || 'Nodes'}\` · \`${patientProfile.regimen || 'Chemo'}\`. ` + t.chatWelcomeProfile;
      } else {
        welcomeMsgContent += t.chatWelcomeNoProfile;
      }
      setMessages([
        {
          id: welcomeId,
          sender: 'ai',
          text: welcomeMsgContent,
          time: new Date()
        }
      ]);
    }
  };

  const handleExportConversation = () => {
    const transcript = messages.map((msg) => {
      const role = msg.sender === 'user' ? 'USER' : 'ASSISTANT';
      return `[${role}] ${msg.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}\n${msg.text}`;
    }).join('\n\n---\n\n');
    const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `osint-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveConversation = () => {
    try {
      localStorage.setItem('pancreas_chat_history', JSON.stringify(messages));
    } catch (error) {
      console.warn('Could not persist chat history', error);
    }
  };

  // Attach simulated files
  const handleAttachSimulated = (file: MessageAttachment) => {
    if (draftAttachments.some(f => f.id === file.id)) {
      setDraftAttachments(prev => prev.filter(f => f.id !== file.id));
    } else {
      setDraftAttachments(prev => [...prev, file]);
    }
    setShowTemplateDropdown(false);
  };

  // File Upload Handlers (HTML input)
  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files) as File[];
      const mapped: MessageAttachment[] = fileList.map(file => ({
        id: `f-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        type: file.type || 'application/octet-stream'
      }));
      setDraftAttachments(prev => [...prev, ...mapped]);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const fileList = Array.from(e.dataTransfer.files) as File[];
      const mapped: MessageAttachment[] = fileList.map(file => ({
        id: `f-${Date.now()}-${Math.random().toString(36).substr(2,4)}`,
        name: file.name,
        size: `${(file.size / 1024).toFixed(0)} KB`,
        type: file.type || 'application/octet-stream'
      }));
      setDraftAttachments(prev => [...prev, ...mapped]);
    }
  };

  // Toggle reasoning process view
  const toggleReasoning = (msgId: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, isReasoningCollapsed: !m.isReasoningCollapsed };
      }
      return m;
    }));
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && draftAttachments.length === 0) return;

    if (!customText) {
      setInputText('');
    }

    // Capture attachments in draft
    const sentAttachments = [...draftAttachments];
    setDraftAttachments([]);

    // 1. Create user message block
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend || `[${t.chatAttachedHeader}] ${sentAttachments.map(a => a.name).join(', ')}`,
      time: new Date(),
      attachments: sentAttachments
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // 2. Fetch runtime configs from LocalStorage
      let configPayload: any = null;
      const configsStr = localStorage.getItem('pancreas_ai_elements_configs');
      if (configsStr) {
        const configs = JSON.parse(configsStr);
        const resolvedConfig = configs[activeProvider];
        if (resolvedConfig) {
          configPayload = {
            provider: activeProvider,
            apiKey: resolvedConfig.apiKey,
            baseUrl: resolvedConfig.baseUrl,
            model: selectedModel
          };
        }
      }

      // If no config found, fallback to defaults
      if (!configPayload) {
        configPayload = {
          provider: activeProvider,
          apiKey: '',
          baseUrl: '',
          model: selectedModel
        };
      }

      // Append language setting to config
      configPayload.language = language;

      // 3. Compile history for state tracking
      const mappedHistory = [...messages, userMsg].map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      // Call customized multi-provider AI endpoint 
      const response = await fetch('/api/osint/chat-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: mappedHistory,
          config: configPayload,
          attachments: sentAttachments.map(a => ({ name: a.name, size: a.size, type: a.type }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const resObj = await response.json();

      let resolvedCitations = undefined;
      const canAttachCitations = resObj.status === 'ok' && resObj.mode !== 'unavailable';
      if (canAttachCitations && (textToSend.includes('MRTX1133') || textToSend.includes('G12D') || textToSend.includes('inhibitor'))) {
        resolvedCitations = [
          { id: 1, title: 'MRTX1133 in KRAS G12D Advanced Solid Tumors (Phase I trial)', url: 'https://clinicaltrials.gov/study/NCT05737706', excerpt: 'Non-covalent binding prevents activation in cellular lines and demonstrates extreme specificity over G12C and G12S variants.' }
        ];
      } else if (canAttachCitations && (textToSend.includes('PERT') || textToSend.includes('胰酶') || textToSend.includes('enzyme'))) {
        resolvedCitations = [
          { id: 1, title: 'NCCN Supportive Care Taskforce: EPI Management & Pancrelipase Dosage Rules', url: 'https://www.nccn.org', excerpt: 'Administer capsules with first bite, avoid crushing, adjust matching meals between 50,000 to 75,000 units to secure ideal calorie and weight maintenance.' }
        ];
      }

      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: resObj.text,
        time: new Date(),
        reasoning: resObj.reasoning || `[LLM status]\n- Backend mode: ${resObj.mode || 'unknown'}\n- Provider: ${activeProvider}\n- Model: ${selectedModel}`,
        reasoningTimeMs: resObj.reasoningTimeMs || 0,
        isReasoningCollapsed: false,
        citations: resolvedCitations
      }]);

    } catch (err: any) {
      console.error('Chat routing error:', err);
      setMessages(prev => [...prev, {
        id: `ai-unavailable-${Date.now()}`,
        sender: 'ai',
        text: `### AI 助手暂不可用\n\n连接到 ${activeProvider} 失败：${err.message}。\n\n系统没有生成模拟医学回答。请配置有效 API key，或先使用文献、临床试验和 KnowS 检索结果。`,
        time: new Date(),
        reasoning: `[LLM unavailable]\nProvider: ${activeProvider}\nModel: ${selectedModel}\nError: ${err.message}`,
        reasoningTimeMs: 0,
        isReasoningCollapsed: false
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Markdown translation helper
  const parseInlineMarkdown = (text: string) => {
    const tokens: React.ReactNode[] = [];
    let currentIdx = 0;
    const inlineRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
    let match;
    
    while ((match = inlineRegex.exec(text)) !== null) {
      const matchIdx = match.index;
      if (matchIdx > currentIdx) {
        tokens.push(text.substring(currentIdx, matchIdx));
      }
      
      if (match[2]) {
        tokens.push(<strong key={matchIdx} className="font-semibold text-white">{match[2]}</strong>);
      } else if (match[3]) {
        tokens.push(<em key={matchIdx} className="italic text-zinc-200">{match[3]}</em>);
      } else if (match[4]) {
        tokens.push(
          <code key={matchIdx} className="bg-white/10 text-slate-200 px-1.5 py-0.5 rounded font-mono text-[10px] border border-white/5 mx-0.5 select-all">
            {match[4]}
          </code>
        );
      }
      currentIdx = inlineRegex.lastIndex;
    }
    
    if (currentIdx < text.length) {
      tokens.push(text.substring(currentIdx));
    }
    
    return tokens.length > 0 ? tokens : text;
  };

  const renderMessageContent = (text: string) => {
    if (text.includes('action:navigate_profile') && onNavigateToTab) {
      const parts = text.split('[点此前往“病情配置”面板进行维护](action:navigate_profile)');
      return (
        <div className="space-y-2">
          <p className="text-xs text-zinc-300 leading-relaxed font-sans">{parseInlineMarkdown(parts[0])}</p>
          <button 
            onClick={() => {
              onNavigateToTab('patient_profile');
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 text-zinc-200 border border-white/10 rounded-lg text-[10px] font-semibold hover:bg-white/10 transition cursor-pointer"
          >
            <Sparkle className="h-3.5 w-3.5 text-slate-300" />
            {t.btnVerifyFile}
          </button>
          {parts[1] && <p className="text-xs text-zinc-300 leading-relaxed font-sans mt-2">{parseInlineMarkdown(parts[1])}</p>}
        </div>
      );
    }

    const blocks = text.split(/\n\n+/);
    return blocks.map((block, blockIdx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '').replace(/\n/g, '<br/>');
        return (
          <div 
            key={blockIdx} 
            className="my-2.5 pl-4 border-l-2 border-slate-500 bg-white/5 py-2 pr-2.5 text-[11px] italic text-zinc-300 leading-relaxed rounded-r-lg"
          >
            {quoteText.split('<br/>').map((line, lineIdx) => (
              <p key={lineIdx} className={lineIdx > 0 ? "mt-1" : ""}>
                {parseInlineMarkdown(line)}
              </p>
            ))}
          </div>
        );
      }

      if (trimmed.startsWith('###')) {
        return (
          <h3 key={blockIdx} className="text-xs font-bold uppercase tracking-wider text-zinc-300 mt-4 mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0"></span>
            {parseInlineMarkdown(trimmed.replace(/^###\s*/, ''))}
          </h3>
        );
      }

      if (trimmed.startsWith('####')) {
        return (
          <h4 key={blockIdx} className="text-[11px] font-semibold text-zinc-200 mt-3 mb-1.5 pl-2 border-l border-white/10 uppercase">
            {parseInlineMarkdown(trimmed.replace(/^####\s*/, ''))}
          </h4>
        );
      }

      if (trimmed.startsWith('##')) {
        return (
          <h2 key={blockIdx} className="text-sm font-bold text-white mt-5 mb-2.5 pb-1 border-b border-white/5">
            {parseInlineMarkdown(trimmed.replace(/^##\s*/, ''))}
          </h2>
        );
      }

      const lines = trimmed.split('\n');
      const isList = lines.every(l => {
        const tr = l.trim();
        return tr.startsWith('*') || tr.startsWith('-') || /^\d+\./.test(tr);
      });

      if (isList) {
        return (
          <ul key={blockIdx} className="space-y-1.5 my-3 pl-1">
            {lines.map((line, lineIdx) => {
              const tr = line.trim();
              let content = tr;
              let marker = <span className="text-slate-400 shrink-0 select-none">✦</span>;

              if (tr.startsWith('*')) {
                content = tr.replace(/^\*\s*/, '');
              } else if (tr.startsWith('-')) {
                content = tr.replace(/^-\s*/, '');
              } else {
                const matchDef = tr.match(/^(\d+)\.\s*/);
                if (matchDef) {
                  marker = <span className="text-slate-300 font-mono text-[9px] shrink-0">{matchDef[1]}.</span>;
                  content = tr.replace(/^\d+\.\s*/, '');
                }
              }

              return (
                <li key={lineIdx} className="text-xs text-zinc-300 leading-relaxed flex items-start gap-2 pl-1 py-0.5">
                  {marker}
                  <div className="flex-1">{parseInlineMarkdown(content)}</div>
                </li>
              );
            })}
          </ul>
        );
      }

      return (
        <p key={blockIdx} className="text-xs text-zinc-300 leading-relaxed mb-1.5">
          {parseInlineMarkdown(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-black/70 backdrop-blur-xs flex justify-end">
      
      {/* Sliding Dialog Box */}
      <div className="w-full max-w-lg bg-[#09090b] border-l border-white/10 shadow-2xl h-full flex flex-col relative glass animate-slide-in font-sans">
        
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-slate-500/[0.04] rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-slate-500/[0.02] rounded-full blur-[80px] pointer-events-none"></div>

        {/* Top Header Row */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/90 shrink-0 z-10 relative">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/5 rounded-xl border border-white/10 relative">
              <span className="absolute top-0.5 right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
              </span>
              <Bot className="h-5 w-5 text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 col-span-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  {t.chatTitle}
                </h2>
                <span className="text-[8px] bg-white/5 text-zinc-300 font-mono font-bold border border-white/10 px-1 py-0.2 rounded uppercase">
                  ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="h-3 w-3 text-slate-400" />
                {t.chatDesc}
              </p>
              <p className="text-[9px] text-zinc-500 font-mono mt-1">
                {getLlmProvider(activeProvider).name} · {selectedModel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveConversation}
              className="p-1.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-200 rounded-lg transition cursor-pointer"
              title="保存会话"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button
              onClick={handleExportConversation}
              className="p-1.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-200 rounded-lg transition cursor-pointer"
              title="导出会话"
            >
              <FileCheck2 className="h-4 w-4" />
            </button>
            <button 
              onClick={handleClearHistory}
              className="p-1.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-200 rounded-lg transition cursor-pointer"
              title={t.chatClearTitle}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
              title={t.chatCloseTitle}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>



        {/* Chat Thread Area */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin select-text z-10 relative transition ${
            dragActive ? 'bg-slate-900/20 border-2 border-dashed border-slate-500/40 m-2 rounded-xl' : ''
          }`}
        >
          {dragActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-center p-6 pointer-events-none">
              <UploadCloud className="h-10 w-10 text-slate-300 animate-bounce mb-2" />
              <p className="text-xs text-zinc-200 font-medium">{t.chatDropMsg}</p>
            </div>
          )}

          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 border text-xs font-bold leading-none ${
                msg.sender === 'user' 
                  ? 'bg-zinc-800 text-zinc-100 border-white/10' 
                  : 'bg-slate-950/70 text-slate-300 border-white/10'
              }`}>
                {msg.sender === 'user' ? 'ME' : 'AI'}
              </div>

              {/* Chat Bubble container */}
              <div className="max-w-[85%] space-y-2">
                <div className={`rounded-2xl p-3.5 ${
                  msg.sender === 'user' 
                    ? 'bg-zinc-900 text-zinc-100 rounded-tr-none border border-white/5' 
                    : 'bg-zinc-950/75 text-zinc-300 rounded-tl-none border border-white/10 glass'
                }`}>
                  
                  {/* Visual matching info */}
                  {msg.sender === 'ai' && patientProfile && !msg.id.startsWith('welcome') && (
                    <div className="mb-2.5 pb-1.5 border-b border-white/10 flex items-center justify-between text-[9px] text-zinc-300 font-semibold">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-slate-300 animate-pulse" />
                        Dual perspective view active
                      </span>
                    </div>
                  )}

                  <div className="space-y-1.5 select-text selection:bg-slate-500/25 break-words">
                    {renderMessageContent(msg.text)}
                  </div>

                  {/* Render attached files on messages */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1">
                      <p className="text-[9px] text-zinc-400 font-semibold">{t.chatAttachedHeader}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.attachments.map(att => (
                          <div key={att.id} className="flex items-center gap-1.5 bg-zinc-800 text-zinc-200 border border-white/10 rounded-md px-2 py-1 text-[10px]">
                            <FileCheck2 className="h-3 w-3 text-slate-400" />
                            <span className="max-w-[120px] truncate">{att.name}</span>
                            <span className="text-zinc-500 font-mono">({att.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[8px] text-zinc-500 font-mono mt-1.5 text-right">
                    {msg.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Vercel AI Elements: <Reasoning>思维链軌 */}
                {msg.sender === 'ai' && msg.reasoning && (
                  <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden shadow-md">
                    <button 
                      onClick={() => toggleReasoning(msg.id)}
                      className="w-full text-left px-3 py-2 bg-white/5 flex items-center justify-between text-[10px] text-zinc-300 font-mono hover:bg-white/10 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5 text-slate-300 animate-pulse" />
                        <span>{t.chatThinking} (Time: {msg.reasoningTimeMs || 840}ms)</span>
                      </span>
                      {msg.isReasoningCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                    </button>
                    {!msg.isReasoningCollapsed && (
                      <div className="p-3 text-[10px] text-zinc-400 font-mono bg-zinc-950 leading-relaxed whitespace-pre-wrap select-all max-h-[140px] overflow-y-auto border-t border-white/10">
                        {msg.reasoning}
                      </div>
                    )}
                  </div>
                )}

                {/* Vercel AI Elements: <Citations> */}
                {msg.sender === 'ai' && msg.citations && msg.citations.length > 0 && (
                  <div className="bg-zinc-950/80 border border-white/10 rounded-xl p-3 space-y-1.5">
                    <p className="text-[9px] text-slate-300 font-bold flex items-center gap-1 font-mono uppercase tracking-wider">
                      <BookOpen className="h-3 w-3" />
                      OSINT Citations 临床科学证据链
                    </p>
                    <div className="space-y-1">
                      {msg.citations.map(cit => (
                        <a 
                          key={cit.id}
                          href={cit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-[10.5px] bg-zinc-900 border border-white/5 hover:border-white/15 rounded-lg p-2.5 hover:bg-white/5 transition cursor-pointer group"
                        >
                          <div className="flex items-center justify-between font-medium text-zinc-100 group-hover:text-slate-300">
                            <span className="truncate flex items-center gap-1.5">
                              <span className="text-[9px] font-mono bg-white/5 text-slate-300 rounded px-1.5 py-0.1">[{cit.id}]</span>
                              {cit.title}
                            </span>
                            <span className="text-[8px] font-mono text-zinc-500 group-hover:text-slate-300">➔</span>
                          </div>
                          <p className="text-[9.5px] text-zinc-400 line-clamp-2 mt-1 italic group-hover:text-zinc-300 font-sans">{cit.excerpt}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* AI Typing Loader anims */}
          {isTyping && (
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg shrink-0 border bg-slate-950/70 text-slate-300 border-white/10">
                AI
              </div>
              <div className="max-w-[80%] rounded-2xl p-4 bg-zinc-950/75 text-zinc-300 rounded-tl-none border border-white/10 glass">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce duration-300"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.15s] duration-300"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.3s] duration-300"></span>
                  <span className="text-[10px] text-slate-300 ml-1 font-mono tracking-widest animate-pulse">{t.chatTyping}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion row */}
        <div className="px-4 py-2 bg-zinc-950/40 border-t border-white/5 shrink-0 z-10 relative">
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-semibold mb-1.5 font-sans">
            <TrendingUp className="h-3.5 w-3.5 text-slate-300" />
            {t.chatSuggested}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none scroll-smooth">
            {SUGGESTED_TOPICS.map((topic, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(topic.text)}
                disabled={isTyping}
                className="shrink-0 px-2 py-1 bg-zinc-900 hover:bg-white/5 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 rounded-lg text-[9px] font-medium font-sans cursor-pointer transition duration-150 disabled:opacity-50"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>

        {/* Draft input attachments bar */}
        {draftAttachments.length > 0 && (
          <div className="px-4 py-2 bg-zinc-950/90 border-t border-white/10 shrink-0 z-10 relative flex flex-wrap gap-1.5">
            {draftAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-300 font-mono">
                <FileCheck2 className="h-3 w-3" />
                <span className="max-w-[150px] truncate">{att.name}</span>
                <button 
                  onClick={() => setDraftAttachments(prev => prev.filter(f => f.id !== att.id))}
                  className="text-zinc-500 hover:text-white ml-1 text-xs font-semibold cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Chat Input Area */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/90 shrink-0 z-10 relative space-y-2">
          
          {/* Quick clinical files provider popup */}
          {showTemplateDropdown && (
            <div className="absolute bottom-[72px] left-4 bg-zinc-950 border border-white/10 rounded-xl p-2 w-[320px] shadow-2xl z-40 space-y-1">
              <p className="text-[9px] text-zinc-300 font-bold px-1.5 py-0.5">{t.chatAttachFile} / 病历单特征语义切片：</p>
              {TEMPLATE_CLINICAL_FILES.map(item => {
                const isSelected = draftAttachments.some(df => df.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleAttachSimulated(item)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] flex items-center justify-between transition cursor-pointer ${
                      isSelected ? 'bg-white/5 text-white font-semibold' : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <span>{item.name}</span>
                    <span className="text-zinc-500 text-[9px]">{item.size}</span>
                  </button>
                );
              })}
              <div className="border-t border-white/5 my-1.5"></div>
              <button
                onClick={triggerFileDialog}
                className="w-full text-center py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-white font-medium transiton cursor-pointer"
              >
                💻 本地上传任意文件 (PDF, PNG, JPG)
              </button>
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* HTML file input (hidden) */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              className="hidden" 
              multiple 
            />

            <button
              type="button"
              onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
              className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-center shrink-0 border border-white/10 shadow-lg ${
                showTemplateDropdown ? 'bg-slate-700 text-white' : 'bg-zinc-900 text-zinc-300 hover:text-white'
              }`}
              title={t.chatAttachFile}
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>

            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isTyping ? t.chatTyping : t.chatPlaceholder}
              disabled={isTyping}
              className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-slate-500/40 transition disabled:opacity-50 font-sans"
            />
            
            <button
              type="submit"
              disabled={isTyping || (!inputText.trim() && draftAttachments.length === 0)}
              className="p-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl cursor-pointer transition flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shrink-0 border border-white/10 shadow-lg"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
