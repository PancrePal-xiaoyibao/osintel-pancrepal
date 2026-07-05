import type { FeedSource } from './types';

let registry: FeedSource[] = [];
let initialized = false;

const now = () => new Date().toISOString();

const BUILTIN_SOURCES: Omit<FeedSource, 'createdAt' | 'updatedAt' | 'lastFetchedAt' | 'lastErrorAt' | 'lastErrorMessage' | 'consecutiveFailures' | 'itemCount'>[] = [
  // --- Academic / Biomedical ---
  {
    id: 'pubmed-rss',
    name: 'PubMed Cancer Research',
    url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1gu_bgVpDNaAfBkclQquFppfQ5HpRIdUEQhzb7fGIh5GqgfUfU/',
    kind: 'academic',
    credibilityBase: 90,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 30,
  },
  {
    id: 'pubmed-pancreatic',
    name: 'PubMed Pancreatic Cancer',
    url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1gEkC2LRsMThCCFp4R7JzQFV3WnTGF0Rx2EJG9AQ8_TY0A3UZt/',
    kind: 'academic',
    credibilityBase: 90,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 30,
  },
  {
    id: 'pubmed-oncology',
    name: 'PubMed Oncology',
    url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/13eBAQq5Crt0gXnMhpWlyefBlbr-ysXrFpC0dFY9W1Vl9ATavb/',
    kind: 'academic',
    credibilityBase: 90,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 30,
  },
  {
    id: 'europepmc',
    name: 'Europe PMC',
    url: 'https://europepmc.org/rss/search/cancer',
    kind: 'academic',
    credibilityBase: 85,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 20,
  },
  {
    id: 'semantic-scholar',
    name: 'Semantic Scholar',
    url: 'https://api.semanticscholar.org/rss/latest',
    kind: 'academic',
    credibilityBase: 80,
    enabled: false, // may require API
    refreshIntervalMinutes: 120,
    maxItems: 20,
  },

  // --- Clinical Trials ---
  {
    id: 'clinicaltrials-rss',
    name: 'ClinicalTrials.gov - Pancreatic Cancer',
    url: 'https://clinicaltrials.gov/ct2/results/rss.xml?cond=Pancreatic+Cancer&rcv_d=&lup_d=&sel_rss=new14',
    kind: 'trial',
    credibilityBase: 95,
    enabled: true,
    refreshIntervalMinutes: 120,
    maxItems: 30,
  },
  {
    id: 'who-ictrp',
    name: 'WHO ICTRP',
    url: 'https://www.who.int/rss-feeds/news-english.xml',
    kind: 'trial',
    credibilityBase: 85,
    enabled: false, // WHO RSS general, not specific
    refreshIntervalMinutes: 180,
    maxItems: 10,
  },

  // --- Government Health Agencies ---
  {
    id: 'fda-rss',
    name: 'FDA News & Events',
    url: 'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml',
    kind: 'guideline',
    credibilityBase: 95,
    enabled: true,
    refreshIntervalMinutes: 120,
    maxItems: 20,
  },
  {
    id: 'nci-rss',
    name: 'NCI Cancer Currents',
    url: 'https://www.cancer.gov/rss/syndication/ncicancerbulletin.xml',
    kind: 'guideline',
    credibilityBase: 90,
    enabled: true,
    refreshIntervalMinutes: 120,
    maxItems: 20,
  },
  {
    id: 'cdc-rss',
    name: 'CDC Cancer',
    url: 'https://tools.cdc.gov/api/v2/resources/media/403372.rss',
    kind: 'guideline',
    credibilityBase: 85,
    enabled: false,
    refreshIntervalMinutes: 180,
    maxItems: 15,
  },
  {
    id: 'who-cancer-rss',
    name: 'WHO Cancer',
    url: 'https://www.who.int/rss-feeds/cancer-news.xml',
    kind: 'guideline',
    credibilityBase: 95,
    enabled: true,
    refreshIntervalMinutes: 180,
    maxItems: 15,
  },

  // --- News / Medical Media ---
  {
    id: 'medical-news-today',
    name: 'Medical News Today - Pancreatic Cancer',
    url: 'https://www.medicalnewstoday.com/taxonomy/term/253326/feed',
    kind: 'news',
    credibilityBase: 60,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 20,
  },
  {
    id: 'sciencedaily-cancer',
    name: 'ScienceDaily - Cancer',
    url: 'https://www.sciencedaily.com/rss/health_medicine/cancer.xml',
    kind: 'news',
    credibilityBase: 65,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 15,
  },
  {
    id: 'medscape-oncology',
    name: 'Medscape Oncology',
    url: 'https://www.medscape.com/rss/news/medscape/oncology',
    kind: 'news',
    credibilityBase: 70,
    enabled: false,
    refreshIntervalMinutes: 60,
    maxItems: 15,
  },

  // --- Chinese Sources ---
  {
    id: 'chictr-rss',
    name: '中国临床试验注册中心',
    url: 'http://www.chictr.org.cn/rss.xml',
    kind: 'trial',
    credibilityBase: 85,
    enabled: false, // may be unstable
    refreshIntervalMinutes: 180,
    maxItems: 20,
  },
  {
    id: 'cma-cancer',
    name: '中华医学会肿瘤学分会',
    url: 'https://www.cma.org.cn/rss/',
    kind: 'guideline',
    credibilityBase: 80,
    enabled: false,
    refreshIntervalMinutes: 180,
    maxItems: 10,
  },

  // --- Oncology Journals ---
  {
    id: 'lancet-oncology',
    name: 'The Lancet Oncology',
    url: 'https://www.thelancet.com/rssfeed/lanonc/current.xml',
    kind: 'academic',
    credibilityBase: 95,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 20,
  },
  {
    id: 'jco-rss',
    name: 'Journal of Clinical Oncology',
    url: 'https://ascopubs.org/action/showFeed?mi=3bf10s&ai=t9&jc=jco&type=etoc&feed=rss',
    kind: 'academic',
    credibilityBase: 95,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 15,
  },
  {
    id: 'nejm-oncology',
    name: 'NEJM Oncology',
    url: 'https://www.nejm.org/action/showFeed?jc=nejm/oncology&type=etoc&feed=rss',
    kind: 'academic',
    credibilityBase: 95,
    enabled: false,
    refreshIntervalMinutes: 60,
    maxItems: 15,
  },
  {
    id: 'nature-cancer',
    name: 'Nature Cancer',
    url: 'https://www.nature.com/natcancer.rss',
    kind: 'academic',
    credibilityBase: 95,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 15,
  },
  {
    id: 'bmc-cancer',
    name: 'BMC Cancer',
    url: 'https://bmccancer.biomedcentral.com/articles/most-recent/rss.xml',
    kind: 'academic',
    credibilityBase: 85,
    enabled: true,
    refreshIntervalMinutes: 120,
    maxItems: 15,
  },
  {
    id: 'cancer-research-aacr',
    name: 'Cancer Research (AACR)',
    url: 'https://aacrjournals.org/rss/site_100000225/100000270.xml',
    kind: 'academic',
    credibilityBase: 90,
    enabled: true,
    refreshIntervalMinutes: 60,
    maxItems: 15,
  },

  // --- Patient Support / Advocacy ---
  {
    id: 'pancan-news',
    name: 'PanCAN News',
    url: 'https://pancan.org/feed/',
    kind: 'news',
    credibilityBase: 70,
    enabled: true,
    refreshIntervalMinutes: 180,
    maxItems: 10,
  },
];

export function initSources(overrides?: Partial<FeedSource>[]): FeedSource[] {
  if (initialized) return registry;

  const ts = now();
  registry = BUILTIN_SOURCES.map((s) => ({
    ...s,
    createdAt: ts,
    updatedAt: ts,
    lastFetchedAt: undefined,
    lastErrorAt: undefined,
    lastErrorMessage: undefined,
    consecutiveFailures: 0,
    itemCount: 0,
  }));

  if (overrides) {
    for (const override of overrides) {
      if (override.id) {
        const idx = registry.findIndex((s) => s.id === override.id);
        if (idx >= 0) {
          registry[idx] = { ...registry[idx], ...override, updatedAt: now() };
        }
      }
    }
  }

  initialized = true;
  return registry;
}

export function listSources(): FeedSource[] {
  return registry;
}

export function getSource(id: string): FeedSource | undefined {
  return registry.find((s) => s.id === id);
}

export function addSource(source: Omit<FeedSource, 'createdAt' | 'updatedAt' | 'itemCount' | 'consecutiveFailures' | 'lastFetchedAt' | 'lastErrorAt' | 'lastErrorMessage'>): FeedSource {
  const ts = now();
  const entry: FeedSource = {
    ...source,
    createdAt: ts,
    updatedAt: ts,
    lastFetchedAt: undefined,
    lastErrorAt: undefined,
    lastErrorMessage: undefined,
    consecutiveFailures: 0,
    itemCount: 0,
  };
  registry.push(entry);
  return entry;
}

export function updateSource(id: string, updates: Partial<FeedSource>): FeedSource | undefined {
  const idx = registry.findIndex((s) => s.id === id);
  if (idx < 0) return undefined;
  registry[idx] = { ...registry[idx], ...updates, id, updatedAt: now() };
  return registry[idx];
}

export function removeSource(id: string): boolean {
  const idx = registry.findIndex((s) => s.id === id);
  if (idx < 0) return false;
  registry.splice(idx, 1);
  return true;
}

export function recordFetch(id: string, itemCount: number, error?: string): void {
  const source = registry.find((s) => s.id === id);
  if (!source) return;
  const ts = now();
  source.lastFetchedAt = ts;
  source.itemCount = itemCount;
  source.updatedAt = ts;
  if (error) {
    source.lastErrorAt = ts;
    source.lastErrorMessage = error;
    source.consecutiveFailures++;
    if (source.consecutiveFailures >= 5) {
      source.enabled = false;
    }
  } else {
    source.consecutiveFailures = 0;
  }
}
