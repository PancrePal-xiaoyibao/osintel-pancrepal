import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  HeartPulse,
  Newspaper,
  BookOpen,
  FlaskConical,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  Send,
  Loader2,
  User,
  RefreshCw,
  Dna,
  MapPin,
  AlertCircle,
  Languages,
  Library
} from 'lucide-react';
import { LanguageCode } from '../translations';
import {
  OSINTItem,
  PatientProfile,
  LiteratureItem,
  ClinicalTrialItem,
  PersonalReview
} from '../types';

interface LlmConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface MyPersonalViewProps {
  profile: PatientProfile | null;
  language?: LanguageCode;
  llmConfig: LlmConfig;
  onConfigureProfile: () => void;
}

type SectionKey = 'news' | 'articles' | 'papers' | 'trials' | 'evidence' | 'assistant';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

const DISCLAIMER =
  '本页内容来自公开 OSINT / PubMed / ClinicalTrials.gov，经 AI 编译整理，仅供科研参考，不能替代主治医生与 MDT 的诊疗意见。';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return resp.json();
}

export default function MyPersonalView({
  profile,
  llmConfig,
  onConfigureProfile
}: MyPersonalViewProps) {
  const [section, setSection] = useState<SectionKey>('news');

  // News + 90-day articles share the personalized feed source.
  const [news, setNews] = useState<OSINTItem[]>([]);
  const [newsWindows, setNewsWindows] = useState<{ label: string; items: OSINTItem[] }[]>([]);
  const [newsWindow, setNewsWindow] = useState<'24h' | '7d' | '30d'>('30d');
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsMode, setNewsMode] = useState<string>('');

  const [papers, setPapers] = useState<LiteratureItem[]>([]);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersMode, setPapersMode] = useState<string>('');

  const [trials, setTrials] = useState<ClinicalTrialItem[]>([]);
  const [trialsLoading, setTrialsLoading] = useState(false);
  const [trialsMode, setTrialsMode] = useState<string>('');

  const [review, setReview] = useState<PersonalReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // KnowS multi-source evidence search.
  const KNOWS_SOURCES: { id: string; label: string }[] = [
    { id: 'paper_en', label: '英文文献' },
    { id: 'paper_cn', label: '中文文献' },
    { id: 'guide', label: '指南' },
    { id: 'trial', label: '临床试验' },
    { id: 'meeting', label: '会议摘要' },
    { id: 'package_insert', label: '药品说明书' }
  ];
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const [evidenceSources, setEvidenceSources] = useState<string[]>(['paper_en', 'guide', 'trial']);
  const [evidenceGroups, setEvidenceGroups] = useState<{ source: string; ok: boolean; items: any[] }[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // AI Chinese translation of English research content.
  const [translateOn, setTranslateOn] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [zhMap, setZhMap] = useState<Record<string, { title?: string; summary?: string }>>({});
  const [translateNote, setTranslateNote] = useState('');

  const profilePayload = useMemo(() => (profile ? { profile } : {}), [profile]);

  const loadNews = async () => {
    setNewsLoading(true);
    try {
      const res = await postJson<any>('/api/personal/feed', { ...profilePayload, window: newsWindow });
      if (res.status === 'ok') {
        setNews(res.data || []);
        setNewsWindows(res.windows || []);
        setNewsMode(res.mode || '');
      }
    } catch (_) {
      // keep prior snapshot
    } finally {
      setNewsLoading(false);
    }
  };

  const loadPapers = async () => {
    setPapersLoading(true);
    try {
      const res = await postJson<any>('/api/personal/literature', { ...profilePayload, limit: 15 });
      if (res.status === 'ok') {
        setPapers(res.items || []);
        setPapersMode(res.mode || '');
      }
    } catch (_) {
      // ignore
    } finally {
      setPapersLoading(false);
    }
  };

  const loadTrials = async () => {
    setTrialsLoading(true);
    try {
      const res = await postJson<any>('/api/personal/trials', { ...profilePayload, limit: 10 });
      if (res.status === 'ok') {
        setTrials(res.items || []);
        setTrialsMode(res.mode || '');
      }
    } catch (_) {
      // ignore
    } finally {
      setTrialsLoading(false);
    }
  };

  const loadReview = async () => {
    setReviewLoading(true);
    try {
      const res = await postJson<any>('/api/personal/review', {
        ...profilePayload,
        limit: 12,
        nTrials: 6,
        config: llmConfig?.apiKey ? llmConfig : undefined
      });
      if (res.status === 'ok') {
        setReview(res.review || null);
        if (res.papers) setPapers(res.papers);
        if (res.trials) setTrials(res.trials);
      }
    } catch (_) {
      // ignore
    } finally {
      setReviewLoading(false);
    }
  };

  const runEvidenceSearch = async (q?: string) => {
    const query = (q ?? evidenceQuery).trim();
    if (!query || evidenceSources.length === 0) return;
    setEvidenceLoading(true);
    try {
      const res = await postJson<any>('/api/knows/multi', {
        query,
        sources: evidenceSources
      });
      if (res.status === 'ok') {
        setEvidenceGroups(res.groups || []);
      }
    } catch (_) {
      // ignore
    } finally {
      setEvidenceLoading(false);
    }
  };

  const toggleEvidenceSource = (id: string) => {
    setEvidenceSources((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  // Build the translation payload from currently loaded English content.
  const buildTranslatePayload = () => {
    const seen = new Set<string>();
    const out: { id: string; title: string; abstract?: string }[] = [];
    const push = (id: string, title: string, abstract?: string) => {
      if (!id || !title || seen.has(id)) return;
      seen.add(id);
      out.push({ id, title, abstract });
    };
    papers.forEach((p) => push(`PMID:${p.pmid}`, p.title, p.abstract));
    trials.forEach((t) => push(t.nct, t.title));
    news.forEach((n) => push(n.id, n.title));
    return out;
  };

  const runTranslation = async () => {
    const payload = buildTranslatePayload();
    if (payload.length === 0) return;
    setTranslating(true);
    setTranslateNote('');
    try {
      const res = await postJson<any>('/api/personal/translate', {
        items: payload,
        config: llmConfig?.apiKey ? llmConfig : undefined
      });
      if (res.status === 'ok' && res.mode !== 'unavailable') {
        setZhMap((prev) => ({ ...prev, ...(res.translations || {}) }));
      } else {
        setTranslateNote(res.message || '翻译引擎暂不可用。');
      }
    } catch (_) {
      setTranslateNote('翻译请求失败，请稍后重试。');
    } finally {
      setTranslating(false);
    }
  };

  const toggleTranslate = async () => {
    const next = !translateOn;
    setTranslateOn(next);
    if (next && Object.keys(zhMap).length === 0) {
      await runTranslation();
    }
  };

  const zhOf = (id: string) => (translateOn ? zhMap[id] : undefined);

  // Initial load once a profile exists.
  useEffect(() => {
    if (!profile) return;
    loadNews();
    loadPapers();
    loadTrials();
    if (!evidenceQuery) {
      const seed = [profile.mutations?.[0], 'pancreatic cancer'].filter(Boolean).join(' ');
      setEvidenceQuery(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.lastUpdated]);

  // When new data arrives while translation is on, translate the new items.
  useEffect(() => {
    if (translateOn && !translating) {
      runTranslation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [papers, trials, news]);
  useEffect(() => {
    if (!profile) return;
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsWindow]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const next: ChatTurn[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setChatInput('');
    setChatLoading(true);

    // Ground the assistant with the top retrieved papers/trials.
    const context = [
      ...papers.slice(0, 6).map((p) => `PMID:${p.pmid} ${p.title}`),
      ...trials.slice(0, 4).map((t) => `${t.nct} ${t.title} [${t.phase.join('/') || 'N/A'}]`)
    ].join('\n');

    try {
      const res = await postJson<any>('/api/personal/assistant', {
        ...profilePayload,
        messages: next,
        context,
        useKnows: true,
        config: llmConfig?.apiKey ? llmConfig : undefined
      });
      setMessages([...next, { role: 'assistant', content: res.text || '（无返回）' }]);
    } catch (_) {
      setMessages([...next, { role: 'assistant', content: '网络错误，请稍后重试。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- Empty profile gate ---
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900/60 border border-teal-500/20 rounded-2xl p-8 text-center glass relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <HeartPulse className="h-40 w-40 text-teal-400" />
          </div>
          <div className="inline-flex p-3 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-teal-300 mb-4 relative z-10">
            <HeartPulse className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 relative z-10">我的专属情报中心</h2>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6 relative z-10 max-w-md mx-auto">
            填写您的脱敏病情特征（突变靶点、常驻城市、治疗方案等），系统将为您聚合
            <span className="text-teal-300">个性化情报流、90 天相关文章、相关论文、在研临床试验</span>
            ，并提供接地气的 AI 助手。
          </p>
          <button
            onClick={onConfigureProfile}
            className="bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold py-2.5 px-6 rounded-xl inline-flex items-center gap-2 cursor-pointer transition relative z-10"
          >
            <User className="h-4 w-4" />
            去配置病情特征
          </button>
          <p className="text-[10px] text-zinc-600 mt-6 relative z-10">{DISCLAIMER}</p>
        </div>
      </div>
    );
  }

  const sections: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: 'news', label: '个性化情报流', icon: <Newspaper className="h-4 w-4" /> },
    { key: 'articles', label: '90 天相关文章', icon: <RefreshCw className="h-4 w-4" /> },
    { key: 'papers', label: '相关论文', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'trials', label: '临床试验', icon: <FlaskConical className="h-4 w-4" /> },
    { key: 'evidence', label: '证据检索', icon: <Library className="h-4 w-4" /> },
    { key: 'assistant', label: 'AI 助手', icon: <Sparkles className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Profile summary header */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 glass">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-teal-300 shrink-0">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">我的专属情报中心</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                  <Dna className="h-3 w-3" />
                  {profile.mutations.length ? profile.mutations.join(', ') : '未配置突变'}
                </span>
                {profile.city && (
                  <span className="inline-flex items-center gap-1 text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">
                    <MapPin className="h-3 w-3" />
                    {profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onConfigureProfile}
            className="text-xs text-zinc-400 hover:text-teal-300 border border-white/10 hover:border-teal-500/30 bg-white/5 py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition shrink-0"
          >
            <User className="h-3.5 w-3.5" />
            调整画像
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          <button
            onClick={toggleTranslate}
            disabled={translating}
            className={`text-[11px] py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition border disabled:opacity-50 ${
              translateOn
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-teal-300 hover:border-teal-500/30'
            }`}
          >
            {translating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
            {translateOn ? 'AI 中文翻译：开' : 'AI 中文翻译：关'}
          </button>
          {translateOn && !translating && (
            <button
              onClick={runTranslation}
              className="text-[10px] text-zinc-500 hover:text-teal-300 cursor-pointer underline-offset-2 hover:underline"
            >
              重新翻译
            </button>
          )}
          <span className="text-[10px] text-zinc-600">
            {translateNote || '英文论文/试验/情报标题与摘要按需译为简体中文（保留基因/药物/NCT 原文）。'}
          </span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`py-2 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              section === s.key
                ? 'bg-teal-600/15 text-teal-200 border border-teal-500/30'
                : 'text-white/50 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            {s.icon}
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="min-h-[300px]">
        {section === 'news' && (
          <NewsSection
            news={news}
            windows={newsWindows}
            window={newsWindow}
            setWindow={setNewsWindow}
            loading={newsLoading}
            mode={newsMode}
            onRefresh={loadNews}
            zhOf={zhOf}
          />
        )}

        {section === 'articles' && (
          <ArticlesSection
            windows={newsWindows}
            loading={newsLoading}
            onRefresh={loadNews}
            zhOf={zhOf}
          />
        )}

        {section === 'papers' && (
          <PapersSection papers={papers} loading={papersLoading} mode={papersMode} onRefresh={loadPapers} zhOf={zhOf} />
        )}

        {section === 'trials' && (
          <TrialsSection trials={trials} loading={trialsLoading} mode={trialsMode} onRefresh={loadTrials} zhOf={zhOf} />
        )}

        {section === 'evidence' && (
          <EvidenceSection
            query={evidenceQuery}
            setQuery={setEvidenceQuery}
            allSources={KNOWS_SOURCES}
            selectedSources={evidenceSources}
            toggleSource={toggleEvidenceSource}
            groups={evidenceGroups}
            loading={evidenceLoading}
            onSearch={() => runEvidenceSearch()}
          />
        )}

        {section === 'assistant' && (
          <AssistantSection
            messages={messages}
            input={chatInput}
            setInput={setChatInput}
            onSend={sendChat}
            loading={chatLoading}
            review={review}
            reviewLoading={reviewLoading}
            onGenerateReview={loadReview}
            hasKey={!!llmConfig?.apiKey}
            chatEndRef={chatEndRef}
          />
        )}
      </div>

      <p className="text-[10px] text-zinc-600 text-center pt-2 border-t border-white/5">{DISCLAIMER}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

function SectionShell({
  title,
  count,
  mode,
  loading,
  onRefresh,
  children
}: {
  title: string;
  count?: number;
  mode?: string;
  loading?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {typeof count === 'number' && (
            <span className="text-[10px] text-zinc-500 font-mono">({count})</span>
          )}
          {mode && (
            <span
              className={`text-[9px] px-1.5 py-0.25 rounded font-mono uppercase border ${
                mode === 'live' || mode === 'knows'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              {mode === 'live' || mode === 'knows' ? 'LIVE' : 'FALLBACK'}
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="text-[11px] text-zinc-400 hover:text-teal-300 border border-white/10 hover:border-teal-500/30 bg-white/5 py-1 px-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            刷新
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ loading, text }: { loading?: boolean; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60 p-8 text-center text-sm text-zinc-500">
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> 正在检索...
        </span>
      ) : (
        text
      )}
    </div>
  );
}

type ZhEntry = { title?: string; summary?: string } | undefined;
type ZhLookup = (id: string) => ZhEntry;

const NewsCard: React.FC<{ item: OSINTItem; zh?: ZhEntry }> = ({ item, zh }) => {
  const title = zh?.title || item.title;
  const showOriginal = !!zh?.title && zh.title !== item.title;
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="block rounded-xl border border-white/10 bg-zinc-900/40 hover:border-teal-500/30 p-4 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm text-white font-medium leading-snug group-hover:text-teal-200">
          {zh?.title && <span className="text-[9px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-1 py-0.25 rounded mr-1.5 align-middle">译</span>}
          {title}
        </h4>
        <ExternalLink className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
      </div>
      {showOriginal && <p className="text-[10px] text-zinc-600 mt-1 leading-snug line-clamp-1">{item.title}</p>}
      {item.summary && <p className="text-xs text-zinc-400 mt-2 leading-relaxed line-clamp-2">{item.summary}</p>}
      <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px]">
        <span className="text-zinc-500 font-mono">{item.source}</span>
        {item.evidenceLevel && (
          <span className="bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.25 rounded">证据 {item.evidenceLevel}</span>
        )}
        {item.freshnessWindow && (
          <span className="bg-teal-500/10 border border-teal-500/20 text-teal-300 px-1.5 py-0.25 rounded">{item.freshnessWindow}</span>
        )}
      </div>
    </a>
  );
}

function NewsSection({
  news,
  windows,
  window,
  setWindow,
  loading,
  mode,
  onRefresh,
  zhOf
}: {
  news: OSINTItem[];
  windows: { label: string; items: OSINTItem[] }[];
  window: '24h' | '7d' | '30d';
  setWindow: (w: '24h' | '7d' | '30d') => void;
  loading: boolean;
  mode: string;
  onRefresh: () => void;
  zhOf: ZhLookup;
}) {
  return (
    <SectionShell title="个性化情报流" count={news.length} mode={mode} loading={loading} onRefresh={onRefresh}>
      <div className="flex gap-1.5 mb-1">
        {(['24h', '7d', '30d'] as const).map((w) => {
          const wc = windows.find((x) => x.label === w);
          return (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition ${
                window === w
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {w}
              {wc ? ` · ${wc.items.length}` : ''}
            </button>
          );
        })}
      </div>
      {news.length === 0 ? (
        <EmptyHint loading={loading} text="暂无个性化情报，点击刷新重试。" />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {news.map((item) => (
            <NewsCard key={item.id} item={item} zh={zhOf(item.id)} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function ArticlesSection({
  windows,
  loading,
  onRefresh,
  zhOf
}: {
  windows: { label: string; items: OSINTItem[] }[];
  loading: boolean;
  onRefresh: () => void;
  zhOf: ZhLookup;
}) {
  // 90-day window approximates to the 30d window plus the recent 7d/24h items.
  const recent = windows.find((w) => w.label === '30d')?.items || [];
  return (
    <SectionShell title="90 天相关文章" count={recent.length} loading={loading} onRefresh={onRefresh}>
      {recent.length === 0 ? (
        <EmptyHint loading={loading} text="暂无近 90 天相关文章。" />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {recent.map((item) => (
            <NewsCard key={item.id} item={item} zh={zhOf(item.id)} />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function PapersSection({
  papers,
  loading,
  mode,
  onRefresh,
  zhOf
}: {
  papers: LiteratureItem[];
  loading: boolean;
  mode: string;
  onRefresh: () => void;
  zhOf: ZhLookup;
}) {
  return (
    <SectionShell title="相关论文 (PubMed / Europe PMC)" count={papers.length} mode={mode} loading={loading} onRefresh={onRefresh}>
      {papers.length === 0 ? (
        <EmptyHint loading={loading} text="未检索到相关论文，可调整画像中的突变靶点。" />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {papers.map((p) => {
            const zh = zhOf(`PMID:${p.pmid}`);
            return (
              <a
                key={p.pmid}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-zinc-900/40 hover:border-teal-500/30 p-4 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm text-white font-medium leading-snug group-hover:text-teal-200">
                    {zh?.title && <span className="text-[9px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-1 py-0.25 rounded mr-1.5 align-middle">译</span>}
                    {zh?.title || p.title}
                  </h4>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                </div>
                {zh?.title && <p className="text-[10px] text-zinc-600 mt-1 leading-snug line-clamp-1">{p.title}</p>}
                {zh?.summary ? (
                  <p className="text-xs text-zinc-300 mt-2 leading-relaxed line-clamp-3">{zh.summary}</p>
                ) : (
                  p.abstract && <p className="text-xs text-zinc-400 mt-2 leading-relaxed line-clamp-3">{p.abstract}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px]">
                  <span className="bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.25 rounded font-mono">PMID:{p.pmid}</span>
                  {p.journal && <span className="text-zinc-500">{p.journal}</span>}
                  {p.year && <span className="text-zinc-500">{p.year}</span>}
                  {p.isOpenAccess && (
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.25 rounded">Open Access</span>
                  )}
                  {typeof p.citedByCount === 'number' && p.citedByCount > 0 && (
                    <span className="text-zinc-500">被引 {p.citedByCount}</span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

function TrialsSection({
  trials,
  loading,
  mode,
  onRefresh,
  zhOf
}: {
  trials: ClinicalTrialItem[];
  loading: boolean;
  mode: string;
  onRefresh: () => void;
  zhOf: ZhLookup;
}) {
  return (
    <SectionShell title="在研临床试验 (ClinicalTrials.gov)" count={trials.length} mode={mode} loading={loading} onRefresh={onRefresh}>
      {trials.length === 0 ? (
        <EmptyHint loading={loading} text="未检索到在研临床试验。" />
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {trials.map((t) => {
            const zh = zhOf(t.nct);
            return (
              <a
                key={t.nct}
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-white/10 bg-zinc-900/40 hover:border-teal-500/30 p-4 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm text-white font-medium leading-snug group-hover:text-teal-200">
                    {zh?.title && <span className="text-[9px] bg-teal-500/15 text-teal-300 border border-teal-500/30 px-1 py-0.25 rounded mr-1.5 align-middle">译</span>}
                    {zh?.title || t.title}
                  </h4>
                  <ExternalLink className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />
                </div>
                {zh?.title && <p className="text-[10px] text-zinc-600 mt-1 leading-snug line-clamp-1">{t.title}</p>}
                <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[10px]">
                  <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-1.5 py-0.25 rounded font-mono">{t.nct}</span>
                  {t.phase.length > 0 && (
                    <span className="bg-white/5 border border-white/10 text-zinc-300 px-1.5 py-0.25 rounded">{t.phase.join('/')}</span>
                  )}
                  {t.status && (
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.25 rounded">{t.status}</span>
                  )}
                  {t.sponsor && <span className="text-zinc-500">{t.sponsor}</span>}
                </div>
                {t.locations && t.locations.length > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-1">{t.locations[0]}</p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

function EvidenceSection({
  query,
  setQuery,
  allSources,
  selectedSources,
  toggleSource,
  groups,
  loading,
  onSearch
}: {
  query: string;
  setQuery: (v: string) => void;
  allSources: { id: string; label: string }[];
  selectedSources: string[];
  toggleSource: (id: string) => void;
  groups: { source: string; ok: boolean; items: any[] }[];
  loading: boolean;
  onSearch: () => void;
}) {
  const sourceLabel = (id: string) => allSources.find((s) => s.id === id)?.label || id;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Library className="h-4 w-4 text-teal-400" />
          KnowS 多源循证检索
        </h3>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSearch();
            }}
            placeholder="输入检索问题，如 KRAS G12D pancreatic cancer treatment"
            className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={onSearch}
            disabled={loading || !query.trim() || selectedSources.length === 0}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-xl px-4 flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Library className="h-3.5 w-3.5" />}
            检索
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {allSources.map((s) => (
            <button
              key={s.id}
              onClick={() => toggleSource(s.id)}
              className={`text-[10px] px-2 py-1 rounded-lg border cursor-pointer transition ${
                selectedSources.includes(s.id)
                  ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                  : 'bg-white/5 border-white/10 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600">多源串行检索以规避限流；公开匿名层亦可用。</p>
      </div>

      {groups.length === 0 ? (
        <EmptyHint loading={loading} text="输入问题并选择来源后开始循证检索。" />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.source} className="space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-teal-200">{sourceLabel(g.source)}</h4>
                <span className="text-[10px] text-zinc-500 font-mono">({g.items.length})</span>
                {!g.ok && (
                  <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.25 rounded">不可用</span>
                )}
              </div>
              {g.items.length === 0 ? (
                <p className="text-[11px] text-zinc-600">无结果。</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {g.items.map((it: any) => (
                    <a
                      key={it.id}
                      href={it.url || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-white/10 bg-zinc-900/40 hover:border-teal-500/30 p-3.5 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h5 className="text-sm text-white font-medium leading-snug group-hover:text-teal-200">{it.title}</h5>
                        {it.url && <ExternalLink className="h-3.5 w-3.5 text-zinc-500 shrink-0 mt-0.5" />}
                      </div>
                      {it.abstract && <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">{it.abstract}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                        {it.journal && <span className="text-zinc-500">{it.journal}</span>}
                        {it.publishDate && <span className="text-zinc-500">{it.publishDate}</span>}
                        {it.studyType && (
                          <span className="bg-white/5 border border-white/10 text-zinc-400 px-1.5 py-0.25 rounded">{it.studyType}</span>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrityBadge({ review }: { review: PersonalReview }) {
  const ok = review.integrity.verified;
  return (
    <div
      className={`rounded-xl border px-3.5 py-2.5 text-xs flex items-start gap-2 ${
        ok
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
      }`}
    >
      {ok ? <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" /> : <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />}
      <span>
        {ok ? '全部经真实文献校验' : '存在未通过校验的引用'} · 有效引用 {review.integrity.citations_valid} · 引用幻觉率{' '}
        {(review.integrity.hallucination_rate * 100).toFixed(1)}%（剔除编造 {review.integrity.citations_invalid}，丢弃无效结论{' '}
        {review.integrity.claims_dropped}）· 引擎 {review.engine}
      </span>
    </div>
  );
}

function AssistantSection({
  messages,
  input,
  setInput,
  onSend,
  loading,
  review,
  reviewLoading,
  onGenerateReview,
  hasKey,
  chatEndRef
}: {
  messages: ChatTurn[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  review: PersonalReview | null;
  reviewLoading: boolean;
  onGenerateReview: () => void;
  hasKey: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="space-y-4">
      {/* Zero-hallucination review generator */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-teal-400" />
            零幻觉个性化文献综述
          </h3>
          <button
            onClick={onGenerateReview}
            disabled={reviewLoading}
            className="text-[11px] text-teal-300 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
          >
            {reviewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            生成综述
          </button>
        </div>
        {review ? (
          <div className="space-y-3">
            <IntegrityBadge review={review} />
            {review.overview && <p className="text-xs text-zinc-300 leading-relaxed">{review.overview}</p>}
            {review.themes.map((theme, ti) => (
              <div key={ti} className="space-y-1.5">
                <h4 className="text-xs font-semibold text-teal-200">{theme.name}</h4>
                <ul className="space-y-1.5">
                  {theme.claims.map((claim, ci) => (
                    <li key={ci} className="text-xs text-zinc-300 leading-relaxed">
                      {claim.text}{' '}
                      {claim.citations.map((cid, idx) => (
                        <a
                          key={cid}
                          href={claim.links?.[idx] || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="text-teal-400 hover:underline font-mono text-[10px]"
                        >
                          [{cid}]
                        </a>
                      ))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500">
            点击「生成综述」聚合您的相关论文与在研试验，输出每条结论可溯源、引用零幻觉的中文综述。
          </p>
        )}
      </div>

      {/* Grounded chat */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/40 flex flex-col h-[420px]">
        <div className="px-4 py-2.5 border-b border-white/10 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-400" />
          <span className="text-sm font-semibold text-white">个性化 AI 助手</span>
          {!hasKey && (
            <span className="text-[9px] text-zinc-500 ml-auto">未配置 API Key · 使用托管/仿真引擎</span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-xs text-zinc-500 flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              结合您的脱敏画像与已检索的论文/试验提问，例如「我的靶点有哪些在研试验值得关注」。
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-teal-600/20 border border-teal-500/30 text-white'
                    : 'bg-zinc-950/60 border border-white/10 text-zinc-200'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-950/60 border border-white/10 rounded-2xl px-3.5 py-2.5">
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t border-white/10 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSend();
            }}
            placeholder="向 AI 助手提问..."
            className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            className="bg-teal-600 hover:bg-teal-500 text-white rounded-xl px-3.5 flex items-center cursor-pointer transition disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
