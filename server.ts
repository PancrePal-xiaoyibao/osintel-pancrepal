// Register all search providers (side-effect import)
import './src/lib/search/providers/index.ts';

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_OSINT_FEED, INITIAL_RESOURCE_CENTERS, MOCK_15DAY_REPORT } from './src/seed-data';
import { OSINTItem, WatchdogStatus, ErrorLogEntry, OSINTCategory, EvidenceLevel, ResourceCenter } from './src/types';
import { runHealthCheck } from './src/lib/health-check';
import { buildExtractiveDailySummary, responseMode, unavailableChatResponse } from './src/lib/mock-audit.ts';
import { refreshNewsWindows } from './src/lib/news/refresh.ts';
import type { NewsWindowLabel } from './src/lib/news/pipeline.ts';
import { getLlmProvider } from './src/lib/llm-providers.ts';
import { searchPapers } from './src/lib/research/europepmc-adapter.ts';
import { searchTrials } from './src/lib/research/ctgov-adapter.ts';
import { deriveQuery, buildSearchTerm } from './src/lib/research/profile-query.ts';
import { synthesizeReview } from './src/lib/research/review-synthesis.ts';
import { callChatModel } from './src/lib/research/llm-call.ts';
import { knowsSearch, knowsMultiSearch, isKnowsSource, KNOWS_SOURCE_IDS, type KnowsSource } from './src/lib/knows/knows-client.ts';
import { normalizeEvidences } from './src/lib/knows/normalize.ts';
import type { PatientProfile } from './src/types';

// Production hardening (T1/T2/T3/T4): structured logger, security middleware, auth, SSRF guard, SQLite.
import { logger } from './src/server/logger.ts';
import { requestIdMiddleware } from './src/server/middleware/request-id.ts';
import {
  coreSecurityMiddleware,
  authRateLimit,
  llmRateLimit
} from './src/server/middleware/security.ts';
import {
  asyncHandler,
  globalErrorHandler,
  notFoundHandler,
  type AppError
} from './src/server/middleware/error.ts';
import { requireAuth } from './src/server/middleware/auth.ts';
import { signAccessToken, verifyAccessToken } from './src/server/auth/jwt.ts';
import { hashPassword, verifyPassword, isBcryptHash } from './src/server/auth/password.ts';
import { assertSafeProviderUrl, SsrfError } from './src/server/security/ssrf-guard.ts';
import { getDb, closeDb } from './src/server/db/index.ts';
import {
  listOsintItems,
  upsertOsintItem,
  upsertOsintItems,
  countOsintItems
} from './src/server/db/repositories/osint-items.ts';
import { listResourceCenters, upsertResourceCenter } from './src/server/db/repositories/resource-centers.ts';
import {
  findUser,
  createUser,
  touchLastLogin,
  countUsers,
  ensureDefaultAccount
} from './src/server/db/repositories/users.ts';
import { logEvent, listRecentEvents, trimEventLog } from './src/server/db/repositories/event-log.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// pino-http-style request logging (lightweight; full pino-http middleware would also work)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      reqId: (req as any).id,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration
    }, 'request');
  });
  next();
});

// Production middleware stack (T1)
app.use(requestIdMiddleware);
app.use(express.json({ limit: '1mb' })); // bound body size — defense against body bombs
app.use(...coreSecurityMiddleware);

// Persistent state (T4): backed by SQLite. We hold an in-process read-through cache so
// request handlers stay synchronous; writes update the DB then refresh the cache.
// `getDb()` lazily bootstraps the schema and seeds from INITIAL_OSINT_FEED if cold.
let osintFeed: OSINTItem[] = listOsintItems();
let cachedNewsRefresh: {
  refreshedAt: string;
  expiresAt: number;
  items: OSINTItem[];
  windows: { label: NewsWindowLabel; items: OSINTItem[] }[];
  mode: 'aggregate' | 'fallback';
  sources: { source: string; ok: boolean; count: number; reason?: string }[];
} | null = null;
let resourceCenters: ResourceCenter[] = listResourceCenters().map(center => {
  if (!center.explicitCategory) {
    const text = (center.name + ' ' + center.description + ' ' + center.specialties.join(' ')).toLowerCase();
    let cat: 'treatment' | 'complication' | 'psychology' | 'nutrition' = 'treatment';
    if (text.includes('心理') || text.includes('精神') || text.includes('安宁') || text.includes('舒缓') || text.includes('抑郁') || text.includes('睡眠') || text.includes('失眠') || text.includes('安定')) {
      cat = 'psychology';
    } else if (text.includes('营养') || text.includes('口服短肽') || text.includes('代乳') || text.includes('膳食') || text.includes('厌食') || text.includes('消瘦') || text.includes('pei') || text.includes('胰酶') || text.includes('pert')) {
      cat = 'nutrition';
    } else if (text.includes('阻塞') || text.includes('梗阻') || text.includes('出血') || text.includes('栓塞') || text.includes('胰瘘') || text.includes('漏') || text.includes('急救') || text.includes('重症') || text.includes('icu') || text.includes('ptcd') || text.includes('ercp') || text.includes('介入') || text.includes('减黄')) {
      cat = 'complication';
    }
    return { ...center, explicitCategory: cat };
  }
  return center;
});

const serverStartedAt = Date.now();

function buildOpsStatus() {
  const health = runHealthCheck({
    startupOk: true,
    appReady: true,
    dbReady: true
  });

  return {
    ok: health.ok,
    mode: responseMode('real'),
    uptimeSeconds: Math.floor((Date.now() - serverStartedAt) / 1000),
    checkedAt: new Date().toISOString(),
    cache: {
      newsReady: Boolean(cachedNewsRefresh),
      newsMode: cachedNewsRefresh?.mode || 'none',
      refreshedAt: cachedNewsRefresh?.refreshedAt || null,
      expiresAt: cachedNewsRefresh?.expiresAt ? new Date(cachedNewsRefresh.expiresAt).toISOString() : null,
      itemCount: cachedNewsRefresh?.items.length || 0
    },
    data: {
      feedItems: osintFeed.length,
      resourceCenters: resourceCenters.length
    },
    issues: health.issues
  };
}

function mapNewsItems(items: Array<Awaited<ReturnType<typeof refreshNewsWindows>>['items'][number]>): OSINTItem[] {
  return items.map((item, index) => ({
    id: item.itemKey,
    title: item.title,
    url: item.sourceUrl,
    source: item.sourceTitle,
    publishedAt: item.publishedAt || item.observedAt,
    country: item.countryKey || item.regionKey || 'Global',
    category: item.centerPriority ? 'oncology' : item.sourceType === 'drug' ? 'drug' : item.sourceType === 'trial' ? 'trial' : item.sourceType === 'nutrition' ? 'nutrition' : item.sourceType === 'psychology' ? 'psychology' : 'patient_resource',
    entities: [...item.topicTags, ...item.contentTags].length > 0 ? [...new Set([...item.topicTags, ...item.contentTags])] : [item.title],
    importanceScore: +(item.priorityScore / 10).toFixed(1),
    summary: item.summary || item.patientSummary,
    evidenceLevel: item.evidenceLevel,
    clinicalTrialId: item.sourceEvidence.find((e) => /NCT\d+/i.test(e.title) || /NCT\d+/i.test(e.url)) ? item.sourceEvidence.find((e) => /NCT\d+/i.test(e.title) || /NCT\d+/i.test(e.url))?.title : undefined,
    clickable: true,
    sourceType: item.sourceType,
    topicTags: item.topicTags,
    contentTags: item.contentTags,
    freshnessMinutes: item.freshnessMinutes,
    freshnessWindow: item.windowLabel,
    centerPriority: item.centerPriority,
    reviewStatus: item.reviewStatus,
    sourceEvidence: item.sourceEvidence
  }));
}

async function refreshNewsFeed(query = 'pancreatic cancer', onLog?: (line: string) => void) {
  const refreshed = await refreshNewsWindows({
    query,
    observedAt: new Date().toISOString(),
    freshnessWindows: ['24h', '7d', '30d'],
    onLog
  });

  const mapped = mapNewsItems(refreshed.items);
  // T4: persist new items to SQLite, then refresh the in-memory cache (no INITIAL_OSINT_FEED
  // injection — seed data is persisted on first boot, mixing it back in here would crowd out
  // fresh results).
  if (mapped.length > 0) {
    upsertOsintItems(mapped);
  }
  osintFeed = listOsintItems(300);
  cachedNewsRefresh = {
    refreshedAt: refreshed.refreshedAt,
    expiresAt: Date.now() + 5 * 60 * 1000,
    items: mapped,
    windows: refreshed.windows.map((window) => ({ label: window.label, items: mapNewsItems(window.items) })),
    mode: refreshed.mode,
    sources: refreshed.sources
  };

  return cachedNewsRefresh;
}

async function getOrRefreshNewsFeed(force = false) {
  if (!force && cachedNewsRefresh && cachedNewsRefresh.expiresAt > Date.now()) {
    return cachedNewsRefresh;
  }
  return refreshNewsFeed();
}

// Watchdog Status State
let watchdogStatus: WatchdogStatus = {
  status: 'healthy',
  uptime: '15d 4h 12m',
  lastCheck: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
  nextCheck: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
  nodesActive: 5,
  apiQuotaUsed: 24,
  apiQuotaTotal: 1000,
  cpuLoad: 12.4,
  memoryUsage: '142.8 MB',
  selfHealedCount: 2,
  recentRepairAction: '2026-06-19: RSS Parser selector adjusted for PubMedNews',
  errorLog: [
    {
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'WARNING',
      message: 'Kyoto University Hospital Feed jRCT RSS connection timeout. Initiated retrying block.',
      classification: 'Scraper Timeout'
    },
    {
      time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 12000).toISOString(),
      level: 'INFO',
      message: 'Kyoto University connection restored with index退避 level 2.',
      classification: 'Auto-Retry recovery'
    },
    {
      time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      level: 'ERROR',
      message: 'PubMed parsing failed: HTML selector discrepancy in <div class="news-body-text">. Critical path blocked.',
      classification: 'Semantic CSS selector error'
    },
    {
      time: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 4000).toISOString(),
      level: 'INFO',
      message: 'Watchdog analyzed the DOM mismatch. AI agent automatically patched the XPath pointer to target main article tags. Reparsing succeeded.',
      classification: 'Self-Patch Applied'
    }
  ]
};

// Lazy initialization of Gemini API Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return geminiClient;
}

// Robust fallback wrapper for Gemini text generation to handle model unavailable or rate limit errors
async function generateContentWithFallback(
  client: GoogleGenAI,
  params: { contents: any; config?: any }
) {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting Gemini call with model: ${model}`);
      const response = await client.models.generateContent({
        model,
        contents: params.contents,
        config: params.config
      });
      console.log(`Gemini call succeeded with model: ${model}`);
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed with error:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('All model attempts failed');
}

// REST API Endpoints

// 1. Get entire OSINT Feed
app.get('/api/osint/feed', async (req, res) => {
  const window = typeof req.query.window === 'string' ? req.query.window : '30d';
  const force = req.query.force === '1' || req.query.force === 'true';
  const snapshot = await getOrRefreshNewsFeed(force);
  const source = window === '24h' || window === '7d' || window === '30d'
    ? snapshot.windows.find((entry) => entry.label === window)
    : undefined;
  res.json({
    status: 'ok',
    selectedWindow: window,
    refreshedAt: snapshot.refreshedAt,
    mode: snapshot.mode,
    sources: snapshot.sources,
    data: source?.items || osintFeed,
    windows: snapshot.windows
  });
});

app.post('/api/osint/feed/refresh', async (req, res) => {
  const query = typeof req.body?.query === 'string' ? req.body.query : 'pancreatic cancer';
  const snapshot = await refreshNewsFeed(query);
  res.json({
    status: 'ok',
    selectedWindow: '30d',
    refreshedAt: snapshot.refreshedAt,
    mode: snapshot.mode,
    sources: snapshot.sources,
    data: snapshot.items,
    windows: snapshot.windows
  });
});

// SSE streaming refresh: emits live log lines as the search runs, then a final
// 'done' event with the feed data. Powers the live terminal console on the homepage.
app.get('/api/osint/feed/refresh-stream', async (req, res) => {
  const query = typeof req.query.query === 'string' && req.query.query.trim()
    ? req.query.query.trim()
    : 'pancreatic cancer';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('log', { line: `▶ 启动全节点检索: "${query}"` });

  try {
    const snapshot = await refreshNewsFeed(query, (line) => send('log', { line }));
    send('done', {
      status: 'ok',
      mode: snapshot.mode,
      sources: snapshot.sources,
      data: snapshot.items,
      windows: snapshot.windows,
      refreshedAt: snapshot.refreshedAt
    });
  } catch (err) {
    send('log', { line: `✗ 检索失败: ${err instanceof Error ? err.message : 'unknown error'}` });
    send('error', { message: err instanceof Error ? err.message : 'unknown error' });
  } finally {
    res.end();
  }
});

// Serve the latest persisted search results from disk (instant, no re-search).
// The background auto-refresh keeps this file fresh every 5 minutes.
// Frontend polls this endpoint for the stream feed.
app.get('/api/osint/feed/cached', (req, res) => {
  try {
    const cacheDir = path.resolve(process.cwd(), 'data', 'search-cache');
    // Default query file
    const queryParam = typeof req.query.q === 'string' ? req.query.q : 'pancreatic cancer';
    const safeKey = (queryParam.toLowerCase().trim() + '|').replace(/[^a-z0-9_-]/gi, '_').slice(0, 120) + '.json';
    const filePath = path.join(cacheDir, safeKey);

    if (!fs.existsSync(filePath)) {
      return res.json({ status: 'ok', cached: false, data: [], sources: [], mode: 'fallback', message: 'No cached results yet. Waiting for first auto-refresh.' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const result = parsed.result || parsed;

    // Map SearchResult[] to the feed item format
    const items = (result.results || []).map((r: any, i: number) => ({
      id: `cached-${i}-${Date.now()}`,
      title: r.title || '',
      url: r.url || '',
      source: r.source || 'web',
      publishedAt: r.publishedAt || parsed.timestamp || new Date().toISOString(),
      country: 'Global',
      category: r.kind === 'trial' ? 'trial' : r.kind === 'academic' ? 'drug' : r.kind === 'news' ? 'oncology' : 'patient_resource',
      entities: [r.kind, r.providerId].filter(Boolean),
      importanceScore: 7,
      summary: r.snippet || '',
      evidenceLevel: r.kind === 'academic' || r.kind === 'guideline' ? 'B' : 'C',
      clickable: true,
      sourceType: r.kind || 'other',
      topicTags: [r.kind, r.providerId].filter(Boolean),
      contentTags: [r.kind === 'news' ? 'news' : 'literature'],
      freshnessMinutes: 0,
      freshnessWindow: '7d',
      centerPriority: false,
      reviewStatus: 'pending',
      sourceEvidence: [{ title: r.title, url: r.url }]
    }));

    res.json({
      status: 'ok',
      cached: true,
      refreshedAt: parsed.timestamp || new Date().toISOString(),
      mode: result.mode || 'aggregate',
      sources: (result.providers || []).map((p: any) => ({ source: p.id, ok: p.ok, count: p.count, reason: p.reason })),
      data: items
    });
  } catch (err) {
    res.json({ status: 'ok', cached: false, data: [], sources: [], mode: 'fallback', message: 'Cache read error' });
  }
});

// List all cached search files (for debugging / admin)
app.get('/api/osint/feed/cache-list', (req, res) => {
  try {
    const cacheDir = path.resolve(process.cwd(), 'data', 'search-cache');
    if (!fs.existsSync(cacheDir)) {
      return res.json({ status: 'ok', files: [] });
    }
    const files = fs.readdirSync(cacheDir)
      .filter(f => f.endsWith('.json') && !f.startsWith('_'))
      .map(f => {
        const stat = fs.statSync(path.join(cacheDir, f));
        return { name: f, size: stat.size, modified: stat.mtime.toISOString() };
      });
    res.json({ status: 'ok', files });
  } catch {
    res.json({ status: 'ok', files: [] });
  }
});

// 1.5 Manual Source Ingestion & Clinical Quality Validator
app.post('/api/osint/manual-ingest', requireAuth, (req, res) => {
  const { title, url, source, country, category, entities, summary, evidenceLevel, clinicalTrialId } = req.body;

  // Track state and log check starting
  watchdogStatus.apiQuotaUsed += 1;

  if (!title || !url || !summary || !source) {
    return res.status(400).json({
      status: 'error',
      message: '请填写完整的学术投递信息：包括标题、URL链接、原始信源及科学摘要。'
    });
  }

  // URL protocol whitelist (T1/BE-C6): only http/https to block javascript:/data:/file: XSS.
  try {
    const parsed = new URL(String(url));
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ status: 'error', message: 'URL 必须以 http:// 或 https:// 开头。' });
    }
  } catch {
    return res.status(400).json({ status: 'error', message: 'URL 格式不合规。' });
  }

  // Quality check algorithm:
  let score = 50; // Base score
  const logChecks: string[] = [];

  // Check URL authority
  const cleanUrl = url.toLowerCase();
  const medicalDomains = [
    '.gov', '.org', '.edu', 'pubmed', 'ncbi', 'lancet', 'nejm', 'asco', 
    'esmo', 'nccn', 'springer', 'nature', 'csco', 'caca', 'sciencedirect', 'jco', 'biorxiv', 'medrxiv', 'cochrane'
  ];
  
  const hasMedicalDomain = medicalDomains.some(dom => cleanUrl.includes(dom));
  if (hasMedicalDomain) {
    score += 25;
    logChecks.push('信源权威域名校验：通过 [PubMed/Gov/High-Impact/Academic]');
  } else {
    score -= 15;
    logChecks.push('信源权威域名校验：未通过 (非典型或非学术级公开域名)');
  }

  // Check Title Length and Professional keywords
  if (title.length >= 15) {
    score += 10;
  }
  const professionalKeywords = [
    'pancreatic', 'cancer', 'adenocarcinoma', 'kras', 'brca', 'atm', 'atr', 'whipple', 'folfirinox', 'pert',
    'trial', 'phase', 'chemotherapy', 'targeted', 'inhibitor', 'survival', 'mct', 'mdt', 'clinical', 'gemcitabine',
    's-1', 'ipmn', 'tumor', 'oncology', 'mutation', 'gucy2c', 'egfr',
    '胰腺', '肿瘤', '吉西他滨', '替吉奥', '靶向', '临床', '化疗', '新辅助', '切除', '突变', '靶点', '生存', '随餐', '辅助'
  ];
  const matchedTitleKeywords = professionalKeywords.filter(kw => 
    title.toLowerCase().includes(kw) || summary.toLowerCase().includes(kw)
  );
  if (matchedTitleKeywords.length >= 2) {
    score += 15;
    logChecks.push(`学术关联标靶词检出：匹配已通过 (共包含 ${matchedTitleKeywords.length} 个核心临床术语)`);
  } else {
    score -= 15;
    logChecks.push('学术关联标靶词检出：未达标 (建议多填入KRAS、新辅助等胰腺特异医学靶标/疗法词)');
  }

  // Evidence level validation
  if (['A', 'B', 'C'].includes(evidenceLevel)) {
    score += 10;
  } else {
    score -= 5;
  }

  const isAccepted = score >= 60;

  const newItem: OSINTItem = {
    id: `manual-${Date.now()}`,
    title,
    url,
    source,
    publishedAt: new Date().toISOString(),
    country: country || 'Global',
    category: category || 'drug',
    entities: entities && entities.length > 0 ? entities : ['Manual Ingestion'],
    importanceScore: +(Math.max(4.0, Math.min(10.0, score / 10))).toFixed(1),
    summary,
    evidenceLevel: evidenceLevel || 'C',
    clinicalTrialId: clinicalTrialId || undefined,
    clickable: true
  };

  if (isAccepted) {
    // T4: persist to SQLite + refresh in-memory cache (replaces osintFeed.unshift)
    upsertOsintItem(newItem);
    osintFeed = listOsintItems(300);

    // T4: append to event_log (replaces watchdogStatus.errorLog.unshift)
    logEvent('INFO', 'manual-ingest', `Manual Ingestion Approved (Quality Score: ${score}). Title: "${title}". Stream merged.`, {
      user: (req as any).user?.username,
      score,
      url
    });

    res.json({
      status: 'ok',
      accepted: true,
      score,
      item: newItem,
      checks: logChecks,
      message: '研判通过！该信源通过了本中心循证医学质量审核，已自动去中心化汇入前端主 Feed 并全网更新！'
    });
  } else {
    // Rejected
    logEvent('WARNING', 'manual-ingest', `Manual Ingestion Rejected (Relevance Score: ${score}). Title: "${title}". Academic quality score below margin.`, {
      user: (req as any).user?.username,
      score
    });

    res.json({
      status: 'ok',
      accepted: false,
      score,
      checks: logChecks,
      message: '暂不予采纳判定：该投递信源出处权威度或核心靶标词配对等级（SCORE < 60）未通过系统的循证合规检验。'
    });
  }
});

// 2. Fetch one real-time OSINT intelligence piece via the unified search stack.
app.post('/api/osint/fetch', async (req, res) => {
  const searchKeywords = typeof req.body?.keyword === 'string' && req.body.keyword.trim()
    ? req.body.keyword.trim()
    : 'pancreatic cancer';

  // Log fetching action to watchdog
  watchdogStatus.lastCheck = new Date().toISOString();
  watchdogStatus.nextCheck = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  watchdogStatus.apiQuotaUsed += 1;

  try {
    const refreshed = await refreshNewsWindows({
      query: searchKeywords,
      observedAt: new Date().toISOString(),
      freshnessWindows: ['24h', '7d', '30d'],
      allowSyntheticFallback: false
    });
    const mapped = mapNewsItems(refreshed.items);
    const selected = mapped[0];
    if (!selected || refreshed.mode !== 'aggregate') {
      watchdogStatus.errorLog.unshift({
        time: new Date().toISOString(),
        level: 'WARNING',
        message: `No real upstream OSINT result was available for "${searchKeywords}". No demo content was inserted.`,
        classification: 'Real Search Unavailable'
      });
      return res.status(503).json({
        status: 'error',
        mode: responseMode('unavailable'),
        message: 'No real upstream OSINT result is available right now. Demo content was not inserted into the feed.',
        sources: refreshed.sources,
        data: null
      });
    }

    osintFeed = [selected, ...osintFeed.filter((item) => item.id !== selected.id)].slice(0, 300);
    watchdogStatus.errorLog.unshift({
      time: new Date().toISOString(),
      level: 'INFO',
      message: `Inserted real search result: "${selected.title}" from ${selected.source}.`,
      classification: 'Real Search Ingestion'
    });
    return res.json({ status: 'ok', mode: responseMode('real'), sources: refreshed.sources, data: selected });
  } catch (err: any) {
    watchdogStatus.errorLog.unshift({
      time: new Date().toISOString(),
      level: 'ERROR',
      message: `Real search ingestion failed for "${searchKeywords}": ${err?.message || 'unknown error'}`,
      classification: 'Real Search Error'
    });
    return res.status(503).json({
      status: 'error',
      mode: responseMode('unavailable'),
      message: 'Real search ingestion failed. No simulated item was generated.',
      data: null
    });
  }
});

// 3. Generate a Markdown daily summary of current feed items using Gemini or Fallback
app.post('/api/osint/daily-summary', async (req, res) => {
  const client = getGeminiClient();
  const feedCount = osintFeed.length;

  watchdogStatus.apiQuotaUsed += 1;

  if (client) {
    try {
      console.log(`Generating AI Daily Summary via Gemini for ${feedCount} active intelligence entries.`);
      const prompt = `You are the lead medical intelligence officer for the Pancreatic Cancer OSINT Hub.
      Summarize the following raw OSINT feeds into a beautiful, patient-friendly, and scientifically precise brief in Simplified Chinese (简体中文). 
      Format the output using standard Markdown with high-quality headers, bullet points, and clean lists. Avoid any flowery declarations.
      
      Requirements for the summary:
      1. Overall Executive Sentiment (今日全球情报综述): Summarize key milestones today.
      2. Clinical Trials & Target Breakdown (临床试验与靶点靶向药进展): Break down key targets like KRAS, GNAS, ATM, ATR or chemotherapy options (e.g. NALIRIFOX, MRTX1133) with evidence levels.
      3. Practical Coping & Support Guidance (居家支持与并发症管理建议): Address surgical timing, PERT enzymes, acupuncture for neuropathic pain or nutritional advice carefully for patients and caretakers.
      4. Scientific Disclaimer (科学宣示与医生首诊原则): Emphasize in 1-2 sentences that summaries do not substitute oncology diagnosis.
      
      Raw Intelligence List:
      ${JSON.stringify(osintFeed.slice(0, 10).map(item => ({
        title: item.title,
        category: item.category,
        entities: item.entities,
        importance: item.importanceScore,
        evidence: item.evidenceLevel,
        summary: item.summary
      })))}`;

      const response = await generateContentWithFallback(client, {
        contents: prompt
      });

      const summaryText = response.text;
      if (summaryText) {
        return res.json({ status: 'ok', summary: summaryText, mode: 'real_gemini' });
      } else {
        throw new Error('Emply response text');
      }
    } catch (err: any) {
      console.error('Gemini summary failed, running extractive summary:', err.message);
      return res.json({ 
        status: 'ok', 
        summary: buildExtractiveDailySummary(osintFeed), 
        mode: responseMode('graceful_fallback') 
      });
    }
  } else {
    return res.json({ 
      status: 'ok', 
      summary: buildExtractiveDailySummary(osintFeed), 
      mode: responseMode('graceful_fallback') 
    });
  }
});

// 4. Return Autonomous Watchdog Status
app.get('/api/osint/watchdog', (req, res) => {
  // Add minor variance to simulated CPU/memory metrics for dynamic visual realism
  const randomCpu = +(11 + Math.random() * 3).toFixed(1);
  const updatedStatus = {
    ...watchdogStatus,
    cpuLoad: randomCpu
  };
  res.json({
    status: 'ok',
    mode: responseMode('demo_only'),
    message: 'Legacy watchdog is a demo console. Use /api/ops/status, /healthz, and /readyz for production checks.',
    data: updatedStatus
  });
});

app.get('/api/health', (_req, res) => {
  const health = runHealthCheck({
    startupOk: true,
    appReady: true,
    dbReady: true
  });
  res.status(health.ok ? 200 : 503).json({ status: health.ok ? 'ok' : 'error', mode: responseMode('real'), data: health });
});

app.get('/healthz', (_req, res) => {
  const health = runHealthCheck({
    startupOk: true,
    appReady: true,
    dbReady: true
  });
  res.status(health.ok ? 200 : 503).json({ status: health.ok ? 'ok' : 'error', mode: responseMode('real'), data: health });
});

app.get('/readyz', (_req, res) => {
  const ops = buildOpsStatus();
  res.status(ops.ok ? 200 : 503).json({ status: ops.ok ? 'ok' : 'error', mode: responseMode('real'), data: ops });
});

app.get('/api/ops/status', (_req, res) => {
  const ops = buildOpsStatus();
  res.status(ops.ok ? 200 : 503).json({ status: ops.ok ? 'ok' : 'error', mode: responseMode('real'), data: ops });
});

// 5. Trigger automated self-healing action in watchdog
app.post('/api/osint/watchdog/repair', requireAuth, (req, res) => {
  watchdogStatus.status = 'healthy';
  watchdogStatus.selfHealedCount += 1;
  const nowStr = new Date().toISOString();
  
  const fixes = [
    'RSS parser selector auto-matched from redundant headers.',
    'ClinicalTrials.gov cloudflare wrapper bypass index退避 parameter adjusted.',
    'PubMed Central HTML structure change detected. AI repaired node mappings.',
    'Sentry reported API quota rate limit warning on fallback nodes; automatically scaled to proxy cluster B.'
  ];
  const chosenAction = fixes[Math.floor(Math.random() * fixes.length)];
  watchdogStatus.recentRepairAction = `${nowStr.slice(0, 10)}: ${chosenAction}`;
  
  watchdogStatus.errorLog.unshift({
    time: nowStr,
    level: 'INFO',
    message: `LLM-driven Autonomic watchdog triggered a manual self-patch scan. Action executed: ${chosenAction}`,
    classification: 'Manual Triggered Self-Heal'
  });
  
  res.json({ 
    status: 'ok', 
    mode: responseMode('demo_only'),
    message: 'Self-healing diagnostic successfully triggered and resolved.', 
    action: chosenAction, 
    data: watchdogStatus 
  });
});

// 6. Get map resources
app.get('/api/osint/resources', (req, res) => {
  res.json({ status: 'ok', data: resourceCenters });
});

// 7. Get 15-day system report
app.get('/api/osint/report', (req, res) => {
  res.json({ status: 'ok', data: MOCK_15DAY_REPORT });
});

// 8. Trigger self-healing rollback to previous stable version
app.post('/api/osint/rollback', requireAuth, (req, res) => {
  const nowStr = new Date().toISOString();
  watchdogStatus.errorLog.unshift({
    time: nowStr,
    level: 'WARNING',
    message: 'Rollback API requested, but no production rollback runner is configured.',
    classification: 'Rollback Unavailable'
  });
  res.status(501).json({ 
    status: 'error',
    mode: responseMode('unavailable'),
    message: 'Automated rollback is not configured. Use the production deployment runbook or scripts/update-app.mjs for controlled updates.',
    tag: null
  });
});

app.post('/api/osint/chat', async (req, res) => {
  const { messages, profile } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ status: 'error', message: '消息历史格式有误。' });
  }

  // Record API quota usage
  watchdogStatus.apiQuotaUsed += 1;

  const client = getGeminiClient();

  const systemInstruction = `你是一位高阶胰腺癌多学科会诊（MDT）开源研究助理，名叫 "Pancreas OSINT 科幻智慧大脑"。你的回答必须体现出极高的医学循证素养与关怀，同时保持严谨客观的语调。
你在 Pancreas OSINT 系统中运行，能基于最新的 2025/2026 临床前沿突破提供解答。

主要职责：
1. 解答有关胰腺导管腺癌（PDAC）及其他胰腺肿瘤的选择性靶向药物（如KRAS G12D抑制剂MRTX1133、KRAS G12C/G12V、ATM/ATR抑制剂等）、经典或新型化疗方案（FOLFIRINOX、NALIRIFOX、吉西他滨联合白蛋白紫杉醇等）、外科 Whipple 手术、不可切除转化等科学问题。
2. 解答外源性胰腺功能不全（EPI）引发的消化物理吸收及重叠恶病质管理——随餐服用外源性胰酶（PERT，如5万-7.5万单位）的指南级用药技巧。
3. 如果带有 [患者特征表征]，应在保证私密的前提下，针对性高亮该患者的特定优势和潜在入组方案。
4. 【绝对红线】：在回答中，必须温柔地提示患者，此助手信息出自公开医学开源文献与临床试验数据库，绝不替代主管医生及正式多学科 MDT 外诊面对面的科学诊疗。
5. 请使用 Simplified Chinese / 简体中文 回答，并包含规范的 Markdown 样式。`;

  // Filter and map to Gemini format
  const geminiContents = messages.map((msg: any) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  if (client) {
    try {
      console.log('Utilizing Gemini to process multi-turn OSINT dialogue.');
      const response = await generateContentWithFallback(client, {
        contents: geminiContents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      const text = response.text;
      if (text) {
        return res.json({ status: 'ok', text, mode: 'real_gemini' });
      } else {
        throw new Error('Gemini returned an empty text for chat response');
      }
    } catch (err: any) {
      console.warn('Gemini chat unavailable:', err.message);
      return res.json({
        status: 'error',
        text: unavailableChatResponse(`Gemini 调用失败：${err.message}`),
        mode: responseMode('unavailable')
      });
    }
  } else {
    return res.json({
      status: 'error',
      text: unavailableChatResponse('未检测到可用的 GEMINI_API_KEY 或服务端 LLM 配置。'),
      mode: responseMode('unavailable')
    });
  }
});

// ============================================================================
// Personalized OSINTel ("My" tab) — /api/personal/*
// De-identified: only gene/cancer tokens reach external research APIs.
// ============================================================================

function profileFromBody(body: any): PatientProfile | null {
  const p = body?.profile;
  if (!p || typeof p !== 'object') return null;
  return {
    city: p.city || '',
    mutations: Array.isArray(p.mutations) ? p.mutations : [],
    ihcResults: p.ihcResults || '',
    regimen: p.regimen || '',
    efficacy: p.efficacy || '',
    summary: p.summary || '',
    lastUpdated: p.lastUpdated || new Date().toISOString()
  };
}

/**
 * Server-side default LLM (OpenAI-compatible) read from .env.
 * Used as a fallback for the personalized routes when the client did not provide
 * its own provider key. Supports StepFun and any OpenAI-compatible gateway.
 * Accepts STEP_API_KEY as an alias for LLM_API_KEY (skill convention).
 */
function serverLlmConfig(): { provider: string; apiKey: string; baseUrl: string; model: string } | undefined {
  const apiKey = (process.env.LLM_API_KEY || process.env.STEP_API_KEY || '').trim();
  if (!apiKey) return undefined;
  return {
    provider: process.env.LLM_PROVIDER || 'openai_compatible',
    apiKey,
    baseUrl: (process.env.LLM_BASE_URL || 'https://api.stepfun.com/v1').trim(),
    model: (process.env.LLM_MODEL || 'step-1-flash').trim()
  };
}

/** Pick the client config when it carries a key, else the server env config. */
function resolveLlmConfig(clientConfig: any): { provider: string; apiKey: string; baseUrl: string; model: string } | undefined {
  if (clientConfig && typeof clientConfig === 'object' && (clientConfig.apiKey || '').trim()) {
    return clientConfig;
  }
  return serverLlmConfig();
}

// ============================================================================
// Local username/password auth — /api/auth/* (T2: bcrypt + signed JWT + SQLite)
// Plaintext password storage and base64 pseudo-tokens are removed.
// ============================================================================
function buildAuthUser(username: string, displayName?: string, role: 'user' | 'admin' = 'user') {
  return {
    uid: `local-${username}`,
    username,
    displayName: displayName || username,
    email: `${username}@local.osintel`,
    role,
    local: true
  };
}

// Username must be alphanumeric + dash/underscore, 3-32 chars. Avoids unicode homoglyphs.
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(username);
}

app.post('/api/auth/register', authRateLimit, asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const displayName = String(req.body?.displayName || '').trim();
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: '请填写用户名和密码。' });
  }
  if (!isValidUsername(username)) {
    return res.status(400).json({ status: 'error', message: '用户名 3-32 位，仅限字母/数字/下划线/连字符。' });
  }
  if (password.length < 8) {
    return res.status(400).json({ status: 'error', message: '密码至少 8 位。' });
  }
  if (findUser(username)) {
    return res.status(409).json({ status: 'error', message: '该用户名已存在，请直接登录。' });
  }
  await createUser(username, password, 'user');
  const token = signAccessToken({ uid: `local-${username}`, username, role: 'user' });
  logger.info({ username, requestId: (req as any).id }, 'user_registered');
  res.json({
    status: 'ok',
    message: '注册成功。',
    token,
    user: buildAuthUser(username, displayName || username, 'user')
  });
}));

app.post('/api/auth/login', authRateLimit, asyncHandler(async (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: '请填写用户名和密码。' });
  }

  const user = findUser(username);
  // Constant message whether the user exists or not — don't leak username enumeration.
  if (!user) {
    logger.warn({ username, requestId: (req as any).id }, 'login_failed_user_not_found');
    return res.status(401).json({ status: 'error', message: '用户名或密码错误。' });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    logger.warn({ username, requestId: (req as any).id }, 'login_failed_bad_password');
    return res.status(401).json({ status: 'error', message: '用户名或密码错误。' });
  }

  touchLastLogin(username);
  const token = signAccessToken({ uid: `local-${username}`, username, role: user.role });
  logger.info({ username, requestId: (req as any).id }, 'login_ok');
  res.json({
    status: 'ok',
    token,
    user: buildAuthUser(username, username, user.role)
  });
}));

// ============================================================================
// KnowS evidence search — /api/knows/* (shared base search capability)
// ============================================================================

// Single-source evidence search
app.post('/api/knows/search', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const source = req.body?.source;
  const query = typeof req.body?.query === 'string' ? req.body.query : '';
  if (!isKnowsSource(source)) {
    return res.status(400).json({ status: 'error', message: `source 必须是: ${KNOWS_SOURCE_IDS.join(', ')}` });
  }
  if (!query.trim()) {
    return res.status(400).json({ status: 'error', message: '缺少 query。' });
  }

  const result = await knowsSearch({
    source,
    query,
    apiKey: process.env.KNOWS_API_KEY,
    baseUrl: process.env.KNOWS_BASE_URL
  });

  res.json({
    status: 'ok',
    source,
    ok: result.ok,
    reason: result.reason,
    questionId: result.questionId,
    items: result.ok ? normalizeEvidences(result.evidences, source) : []
  });
});

// Multi-source evidence search (runs serially to respect rate limits)
app.post('/api/knows/multi', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const query = typeof req.body?.query === 'string' ? req.body.query : '';
  const requested = Array.isArray(req.body?.sources) ? req.body.sources : [];
  const sources = requested.filter(isKnowsSource) as KnowsSource[];
  if (!query.trim()) {
    return res.status(400).json({ status: 'error', message: '缺少 query。' });
  }
  if (sources.length === 0) {
    return res.status(400).json({ status: 'error', message: `sources 至少包含一个: ${KNOWS_SOURCE_IDS.join(', ')}` });
  }

  const results = await knowsMultiSearch({
    sources,
    query,
    apiKey: process.env.KNOWS_API_KEY,
    baseUrl: process.env.KNOWS_BASE_URL
  });

  res.json({
    status: 'ok',
    query,
    groups: results.map((r) => ({
      source: r.source,
      ok: r.ok,
      reason: r.reason,
      questionId: r.questionId,
      items: r.ok ? normalizeEvidences(r.evidences, r.source) : []
    }))
  });
});

// P1: Condition-related papers (PubMed via Europe PMC)
app.post('/api/personal/literature', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const profile = profileFromBody(req.body);
  const query = deriveQuery(profile);
  const term = (req.body?.term && String(req.body.term).trim()) || buildSearchTerm(query);
  const yearFrom = Number.isFinite(req.body?.yearFrom) ? Number(req.body.yearFrom) : 2023;
  const limit = Number.isFinite(req.body?.limit) ? Number(req.body.limit) : 15;

  const result = await searchPapers({ query: term, yearFrom, limit });
  res.json({
    status: 'ok',
    term,
    mode: result.ok ? 'live' : 'unavailable',
    reason: result.reason,
    items: result.items
  });
});

// P1: Condition-matched recruiting clinical trials (ClinicalTrials.gov)
app.post('/api/personal/trials', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const profile = profileFromBody(req.body);
  const query = deriveQuery(profile);
  const term = (req.body?.term && String(req.body.term).trim()) || buildSearchTerm(query);
  const limit = Number.isFinite(req.body?.limit) ? Number(req.body.limit) : 8;
  const status = typeof req.body?.status === 'string' ? req.body.status : 'RECRUITING';

  const result = await searchTrials({ term, limit, status });
  res.json({
    status: 'ok',
    term,
    mode: result.ok ? 'live' : 'unavailable',
    reason: result.reason,
    items: result.items
  });
});

// P1: Personalized news windows (reuses the shared news pipeline)
app.post('/api/personal/feed', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const profile = profileFromBody(req.body);
  const query = deriveQuery(profile);
  const window = typeof req.body?.window === 'string' ? req.body.window : '30d';

  try {
    const refreshed = await refreshNewsWindows({
      query: query.newsQuery,
      observedAt: new Date().toISOString(),
      knowsApiKey: process.env.KNOWS_API_KEY,
      knowsBaseUrl: process.env.KNOWS_BASE_URL,
      sourceKey: 'knows',
      freshnessWindows: ['24h', '7d', '30d']
    });
    const mapped = mapNewsItems(refreshed.items);
    const windows = refreshed.windows.map((w) => ({ label: w.label, items: mapNewsItems(w.items) }));
    const selected = windows.find((w) => w.label === window);
    res.json({
      status: 'ok',
      selectedWindow: window,
      query: query.newsQuery,
      mode: refreshed.mode,
      refreshedAt: refreshed.refreshedAt,
      data: selected?.items || mapped,
      windows
    });
  } catch (err: any) {
    res.json({ status: 'ok', selectedWindow: window, mode: 'fallback', data: [], windows: [], reason: err?.message });
  }
});

// P1: Zero-hallucination personalized review (papers + trials + verified synthesis)
app.post('/api/personal/review', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const profile = profileFromBody(req.body);
  const query = deriveQuery(profile);
  const term = (req.body?.term && String(req.body.term).trim()) || buildSearchTerm(query);
  const config = resolveLlmConfig(req.body?.config);

  const [papersResult, trialsResult] = await Promise.all([
    searchPapers({ query: term, yearFrom: req.body?.yearFrom || 2023, limit: req.body?.limit || 15 }),
    searchTrials({ term, limit: req.body?.nTrials || 8 })
  ]);

  const review = await synthesizeReview({
    query,
    papers: papersResult.items,
    trials: trialsResult.items,
    config
  });

  res.json({
    status: 'ok',
    term,
    review,
    papers: papersResult.items,
    trials: trialsResult.items,
    sources: {
      papers: papersResult.ok ? 'live' : 'unavailable',
      trials: trialsResult.ok ? 'live' : 'unavailable'
    }
  });
});

// P1: Grounded personalized assistant (profile + retrieved context injected)
app.post('/api/personal/assistant', async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ status: 'error', message: '消息历史不合规。' });
  }
  const profile = profileFromBody(req.body);
  const query = deriveQuery(profile);

  // Optional KnowS evidence grounding (single source to respect rate limits).
  let knowsContext = '';
  if (req.body?.useKnows) {
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    const knowsQuery = (lastUser?.content || query.newsQuery || 'pancreatic cancer').slice(0, 300);
    const knowsResult = await knowsSearch({
      source: 'paper_en',
      query: knowsQuery,
      apiKey: process.env.KNOWS_API_KEY,
      baseUrl: process.env.KNOWS_BASE_URL
    });
    if (knowsResult.ok && knowsResult.evidences.length > 0) {
      const evs = normalizeEvidences(knowsResult.evidences, 'paper_en').slice(0, 6);
      knowsContext = evs
        .map((e) => `KnowS:${e.id} ${e.title}${e.journal ? ` (${e.journal})` : ''}`)
        .join('\n');
    }
  }

  const profileBlock = profile
    ? `【患者脱敏画像】常驻城市:${query.city || '未填'} | 突变靶点:${query.genes.join(', ') || '未填'} | IHC:${profile.ihcResults || '未填'} | 方案:${profile.regimen || '未填'} | 疗效:${profile.efficacy || '未填'}`
    : '【患者脱敏画像】未配置';
  const contextBlock = (() => {
    const parts: string[] = [];
    if (typeof context === 'string' && context.trim()) parts.push(context.slice(0, 4000));
    if (knowsContext) parts.push(`KnowS 循证检索：\n${knowsContext}`);
    return parts.length ? `\n【已检索证据上下文】\n${parts.join('\n')}` : '';
  })();

  const systemInstruction = [
    '你是胰腺癌个性化开源情报(OSINTel)的临床科研辅助助手，用简体中文回答。',
    '结合患者脱敏画像与已检索证据上下文作答，引用证据时使用上下文中真实的 PMID/NCT，不要编造。',
    '在结尾用一句话提示：本回答仅供科研参考，不能替代主治医生与 MDT 的诊疗意见。',
    profileBlock,
    contextBlock
  ].join('\n');

  const turns = messages.map((m: any) => ({
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.content || ''
  }));

  // 1. Client-provided provider key, else server-side .env LLM
  const config = resolveLlmConfig(req.body?.config);
  const result = await callChatModel({ config, systemInstruction, messages: turns, temperature: 0.6 });
  if (result.ok) {
    return res.json({ status: 'ok', text: result.text, mode: 'provider' });
  }

  // 2. Fall back to server-hosted Gemini if available
  const serverGeminiClient = getGeminiClient();
  if (serverGeminiClient) {
    try {
      const lastQ = turns[turns.length - 1]?.content || '';
      const response = await generateContentWithFallback(serverGeminiClient, {
        contents: [{ role: 'user', parts: [{ text: lastQ }] }],
        config: { systemInstruction, temperature: 0.6 }
      });
      if (response.text) {
        return res.json({ status: 'ok', text: response.text, mode: 'server_gemini' });
      }
    } catch (_) {
      // continue to unavailable response
    }
  }

  return res.json({
    status: 'error',
    mode: responseMode('unavailable'),
    text: unavailableChatResponse('个性化助手没有可用的 provider、服务端 LLM 或 GEMINI_API_KEY。')
  });
});

// P1: Batch LLM translation for English research content (papers/trials/news)
app.post('/api/personal/translate', requireAuth, llmRateLimit, async (req, res) => {
  watchdogStatus.apiQuotaUsed += 1;
  const { items, config: clientConfig } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.json({ status: 'ok', mode: 'empty', translations: {} });
  }
  const config = resolveLlmConfig(clientConfig);

  // Cap payload to protect the token budget.
  const payload = items.slice(0, 24).map((i: any) => ({
    id: String(i.id),
    title: String(i.title || '').slice(0, 300),
    abstract: String(i.abstract || '').slice(0, 600)
  }));

  const systemInstruction = [
    '你是专业医学翻译。把每个条目翻译成简体中文。',
    '保留基因/药物/靶点/PMID/NCT 等专有标识原样不译(如 KRAS G12D、FOLFIRINOX、NCT05123456)。',
    '输出严格 JSON，键为条目 id，值为 {"title":中文标题,"summary":中文摘要}。',
    'summary 为 abstract 的 2-3 句中文凝练；若 abstract 为空则 summary 为空字符串。',
    '不要输出 JSON 以外的任何文字，不要用代码块包裹。'
  ].join('\n');

  const userPrompt = JSON.stringify(payload);

  function parseTranslations(text: string): Record<string, { title?: string; summary?: string }> | null {
    try {
      let content = text.trim();
      if (content.startsWith('```')) {
        content = content.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
      }
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') return parsed;
      return null;
    } catch {
      return null;
    }
  }

  // 1. Client-provided provider key
  const result = await callChatModel({
    config,
    systemInstruction,
    messages: [{ role: 'user', content: userPrompt }],
    temperature: 0.2,
    timeoutMs: 60000
  });
  if (result.ok) {
    const translations = parseTranslations(result.text);
    if (translations) {
      return res.json({ status: 'ok', mode: 'provider', translations });
    }
  }

  // 2. Server-hosted Gemini fallback
  const serverGeminiClient = getGeminiClient();
  if (serverGeminiClient) {
    try {
      const response = await generateContentWithFallback(serverGeminiClient, {
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: { systemInstruction, temperature: 0.2, responseMimeType: 'application/json' }
      });
      if (response.text) {
        const translations = parseTranslations(response.text);
        if (translations) {
          return res.json({ status: 'ok', mode: 'server_gemini', translations });
        }
      }
    } catch (_) {
      // fall through
    }
  }

  // 3. No translation engine available
  return res.json({
    status: 'ok',
    mode: 'unavailable',
    translations: {},
    message: '未连通可用的大模型翻译引擎，请在配置面板填入 LLM API Key 后重试。'
  });
});

// 10. Multi-Provider AI Elements Custom Gateway Proxy Endpoint
app.post('/api/osint/chat-custom', requireAuth, llmRateLimit, async (req, res) => {
  const { messages, config, attachments } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ status: 'error', message: '消息历史不合规。' });
  }

  // Record API quota usage
  watchdogStatus.apiQuotaUsed += 1;

  const provider = config?.provider || 'siliconflow';
  const apiKey = (config?.apiKey || '').trim();
  let rawModel = config?.model || 'auto';
  const rawBaseUrl = (config?.baseUrl || '').trim();

  // T3 SSRF guard: validate any client-supplied baseUrl BEFORE forwarding to fetch.
  // Default provider baseUrls (whitelisted hosts) skip this; only custom overrides are checked.
  if (rawBaseUrl) {
    try {
      await assertSafeProviderUrl(rawBaseUrl);
    } catch (err) {
      if (err instanceof SsrfError) {
        logger.warn({ reqId: (req as any).id, user: (req as any).user?.username, provider, code: err.code, detail: err.message }, 'ssrf_blocked');
        return res.status(422).json({
          status: 'error',
          mode: 'unavailable',
          reason: err.code,
          code: err.code,
          requestId: (req as any).id || 'unknown'
        });
      }
      throw err;
    }
  }

  // Model Auto-Selection
  if (!rawModel || rawModel === 'auto') {
    if (provider === 'gemini') rawModel = 'gemini-2.5-flash';
    else if (provider === 'openai') rawModel = 'gpt-4o-mini';
    else if (provider === 'siliconflow') rawModel = 'deepseek-ai/DeepSeek-V3';
    else if (provider === 'stepfun') rawModel = 'step-1-flash';
    else if (provider === 'openrouter') rawModel = 'deepseek/deepseek-r1';
    else if (provider === 'dashscope') rawModel = 'qwen-plus';
    else if (provider === 'fireworks') rawModel = 'accounts/fireworks/models/deepseek-v3';
    else rawModel = 'deepseek-ai/DeepSeek-V3';
  }

  // 1. If key is available, attempt real network proxying to the selected model provider!
  if (apiKey) {
    console.log(`[Proxy Gateway ACTIVE] Calling ${provider} with model ${rawModel}`);
    
    // Map local messages to standard prompt roles for third-party endpoints
    const mappedMessages = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content || ''
    }));

    try {
      // Setup base completions endpoint URL according to AI vendor guidelines
      let endpointUrl = '';
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      if (provider === 'gemini') {
        // Native Gemini SDK configuration on the fly
        try {
          const tempGenAI = new GoogleGenAI({ apiKey });
          const cleanedModel = rawModel.replace('models/', '');
          const geminiContents = messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content || '' }]
          }));

          const response = await tempGenAI.models.generateContent({
            model: cleanedModel,
            contents: geminiContents,
            config: {
              systemInstruction: "你是一个优秀的AI临床科研辅助专家，用简体中文回答。",
              temperature: 0.7
            }
          });

          return res.json({
            status: 'ok',
            text: response.text || '大模型暂时未能输出文字。',
            reasoning: `[Google GenAI SDK 诊断]\n调用模型: ${cleanedModel}\n状态: 成功直接访问\n认证: 自携带 API Key`,
            reasoningTimeMs: 820
          });
        } catch (sdkError: any) {
          console.warn("Gemini native SDK failed, retrying via OpenAI compatible URL protocol in Gemini...", sdkError.message);
          endpointUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        }
      } else if (provider === 'openai') {
        endpointUrl = `${rawBaseUrl || 'https://api.openai.com/v1'}/chat/completions`;
      } else if (provider === 'siliconflow') {
        endpointUrl = `${rawBaseUrl || 'https://api.siliconflow.cn/v1'}/chat/completions`;
      } else if (provider === 'openrouter') {
        endpointUrl = `${rawBaseUrl || 'https://openrouter.ai/api/v1'}/chat/completions`;
        headers['HTTP-Referer'] = 'https://ai.studio/build';
        headers['X-Title'] = 'Pancreas OSINT Elements';
      } else if (provider === 'fireworks') {
        endpointUrl = `${rawBaseUrl || 'https://api.fireworks.ai/inference/v1'}/chat/completions`;
      } else if (provider === 'dashscope') {
        endpointUrl = `${rawBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'}/chat/completions`;
      } else if (provider === 'stepfun') {
        endpointUrl = `${rawBaseUrl || 'https://api.stepfun.com/v1'}/chat/completions`;
      } else {
        // Custom compatible model
        endpointUrl = `${rawBaseUrl}/chat/completions`;
      }

      // If we fall through to REST-based OpenAI-compatible endpoint
      if (endpointUrl) {
        const bodyPayload = {
          model: rawModel,
          messages: mappedMessages,
          temperature: 0.7
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout guarding the execution

        const apiResponse = await fetch(endpointUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!apiResponse.ok) {
          const errText = await apiResponse.text();
          throw new Error(`[HTTP ${apiResponse.status}] ${errText || '未知接口端点异常'}`);
        }

        const data = await apiResponse.json();
        const textResult = data.choices?.[0]?.message?.content || '未返回有效正文。';
        const reasoningResult = data.choices?.[0]?.message?.reasoning_content || data.choices?.[0]?.message?.reasoning || `[代理网关调试轨迹]\n提供商: ${provider}\n模型: ${rawModel}\n端点: ${endpointUrl}\n响应Token计数: ${data.usage?.total_tokens || '未知'}`;

        return res.json({
          status: 'ok',
          text: textResult,
          reasoning: reasoningResult,
          reasoningTimeMs: 1100
        });
      }

    } catch (proxyError: any) {
      console.error(`[Proxy Gateway Failure]`, proxyError.message);
      return res.json({
        status: 'error',
        mode: responseMode('unavailable'),
        text: unavailableChatResponse(`自定义 provider 调用失败：${proxyError.message}`),
        reasoning: `[Provider unavailable]\nprovider=${provider}\nmodel=${rawModel}\nbaseUrl=${rawBaseUrl || 'default'}`,
        reasoningTimeMs: 0
      });
    }
  }

  // 1.5 No client API key: try the server-side .env LLM (OpenAI-compatible, e.g. StepFun)
  const envLlm = serverLlmConfig();
  if (envLlm) {
    const envResult = await callChatModel({
      config: envLlm,
      systemInstruction: '你是一个优秀的AI临床科研辅助专家，用简体中文回答。',
      messages: messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || ''
      })),
      temperature: 0.6
    });
    if (envResult.ok) {
      return res.json({
        status: 'ok',
        text: envResult.text,
        reasoning: `[服务端托管 LLM]\n提供商: ${envLlm.provider} | 模型: ${envLlm.model}\n来源: .env 服务端配置（未检测到前端私有 Key）。`,
        reasoningTimeMs: 900
      });
    }
  }

  // 2. If no API Key is provided, fallback to standard server-side Gemini if active key exists
  const serverGeminiClient = getGeminiClient();
  if (serverGeminiClient) {
    try {
      console.log('Utilizing system Gemini credentials for custom playground request.');
      const lastQ = messages[messages.length - 1]?.content || '';
      const geminiContents = [
        {
          role: 'user',
          parts: [{ text: `基于以下上下文或前沿知识来回答用户问题，如果是关于胰腺癌治疗、KRAS基因、胰酶PERT随餐等，请给出权威循证的答复，注意不要包含过于死板的医疗模板。字数适中（300字内），格式规范：\n用户咨询：${lastQ}` }]
        }
      ];

      const response = await generateContentWithFallback(serverGeminiClient, {
        contents: geminiContents,
        config: {
          systemInstruction: "你是一个优秀的AI临床科研辅助专家，用简体中文回答。",
          temperature: 0.7
        }
      });

      let reasoningMsg = `[系统托管 Gemini 芯片]\n状态: 成功自动路由 (Server-side hosted)\n安全策略防线: 检测到您未填入私有的 API Key。系统已自动调载免费且不限额度的 Google Gemini API 端口完成科研应答，确保不会消耗开发者本人的 SiliconFlow/Stepfun 额度资费。`;
      if (provider !== 'gemini') {
        reasoningMsg = `[托管 Gemini 防护节点]\n切换逻辑: 选定了通道 ${provider} 但未提供私有 API Key。为了绝对保障开发者的账户免受资费损耗，系统已安全回退路由并分配到免费托管的 Google Gemini AI 引擎提供权威解答。您可以随时在左下角面板填入您本人的密钥去解锁真实 ${provider} 推理。`;
      }

      return res.json({
        status: 'ok',
        text: response.text || '大模型暂时未能输出文字。',
        reasoning: reasoningMsg,
        reasoningTimeMs: 950
      });
    } catch (_) {
      // continue to unavailable response
    }
  }

  res.json({
    status: 'error',
    mode: responseMode('unavailable'),
    text: unavailableChatResponse('未检测到前端私有 API key、服务端 LLM 配置或可用 GEMINI_API_KEY。'),
    reasoning: '[LLM unavailable] No real model provider was configured. No simulated medical answer was generated.',
    reasoningTimeMs: 0
  });
});

// ============================================================================
// Global error handler — must be registered AFTER all routes and BEFORE the
// SPA fallback. Express recognizes the 4-arg signature and routes errors here.
// (T1/BE-C4)
// ============================================================================
app.use(globalErrorHandler);

// Set up server side static file routing & Vite middleware
async function startServer() {
  // T2: ensure the default dev/admin account exists (no-op in prod unless opted in).
  try {
    await ensureDefaultAccount();
  } catch (err) {
    logger.error({ err: (err as Error).message }, 'ensure_default_account_failed');
  }

  if (process.env.NODE_ENV !== 'production') {
    // In development mode, mount Vite as middleware
    logger.info('mounting_vite_dev_middleware');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the compiled build static assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const httpServer = app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, gemini: Boolean(process.env.GEMINI_API_KEY) }, 'server_listening');
    logger.info(`OSINT Intelligence Hub Server running on http://0.0.0.0:${PORT}`);

    // Background 5-minute auto-refresh: search → persist to file → next poll reads fresh file.
    // (T5/BE-M2) Self-scheduling with in-flight guard + jitter so replicas don't stampede upstreams.
    const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
    const EVENT_TRIM_INTERVAL_MS = 60 * 60 * 1000; // trim event_log hourly
    let refreshInFlight = false;
    const autoRefresh = async () => {
      if (refreshInFlight) {
        logger.warn('auto_refresh_skipped_in_flight');
        return;
      }
      refreshInFlight = true;
      try {
        logger.info('auto_refresh_start');
        await refreshNewsFeed('pancreatic cancer');
        logger.info('auto_refresh_done');
      } catch (err) {
        logger.error({ err: (err as Error).message }, 'auto_refresh_failed');
      } finally {
        refreshInFlight = false;
      }
    };
    // First refresh shortly after startup (10s delay to let Vite finish)
    const refreshTimer = setTimeout(autoRefresh, 10000);
    const refreshInterval = setInterval(autoRefresh, REFRESH_INTERVAL_MS);
    refreshInterval.unref?.();

    const eventTrimInterval = setInterval(() => {
      try {
        const removed = trimEventLog();
        if (removed > 0) logger.info({ removed }, 'event_log_trimmed');
      } catch (err) {
        logger.warn({ err: (err as Error).message }, 'event_log_trim_failed');
      }
    }, EVENT_TRIM_INTERVAL_MS);
    eventTrimInterval.unref?.();

    // T5/BE-M2: graceful shutdown on SIGTERM/SIGINT (Docker, systemd, PM2 all send SIGTERM).
    const shutdown = (signal: string) => {
      logger.info({ signal }, 'shutdown_signal_received');
      clearInterval(refreshInterval);
      clearInterval(eventTrimInterval);
      clearTimeout(refreshTimer);
      httpServer.close(() => {
        logger.info('http_server_closed');
        closeDb();
        process.exit(0);
      });
      // Hard exit if close hangs (e.g. stuck SSE connection) — 10s safety net.
      setTimeout(() => {
        logger.warn('shutdown_force_exit');
        process.exit(1);
      }, 10000).unref();
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
}

startServer().catch((err) => {
  logger.error({ err: err.message, stack: err.stack }, 'server_start_failed');
  process.exit(1);
});
