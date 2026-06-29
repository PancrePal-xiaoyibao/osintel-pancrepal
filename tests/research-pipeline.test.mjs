import assert from 'node:assert/strict';
import {
  searchPapers,
  stripHtml
} from '../src/lib/research/europepmc-adapter.ts';
import { searchTrials } from '../src/lib/research/ctgov-adapter.ts';
import { buildRegistry } from '../src/lib/research/citation-registry.ts';
import {
  verifyReview,
  buildExtractiveReview,
  selftest
} from '../src/lib/research/hallucination-verify.ts';
import {
  deriveQuery,
  normalizeMutationToken,
  buildSearchTerm
} from '../src/lib/research/profile-query.ts';

// --- stripHtml ---
assert.equal(stripHtml('<i>KRAS</i> &amp; <b>NSCLC</b>'), 'KRAS & NSCLC');

// --- profile-query: CN -> EN normalization ---
assert.equal(normalizeMutationToken('KRAS G12D 抑制剂'), 'KRAS G12D');
assert.equal(normalizeMutationToken('KRAS WT (Wild-type)'), 'KRAS WT');
assert.equal(normalizeMutationToken('微卫星不稳定'), 'MSI-H');
assert.equal(normalizeMutationToken('纯中文无基因'), '');

const query = deriveQuery({
  city: '上海市',
  mutations: ['KRAS G12D 抑制剂', 'KRAS G12D 突变', 'TP53'],
  ihcResults: '',
  regimen: '',
  efficacy: '',
  summary: '寻找新辅助治疗方案',
  lastUpdated: new Date().toISOString()
});
assert.equal(query.gene, 'KRAS G12D');
assert.deepEqual(query.genes, ['KRAS G12D', 'TP53']); // deduped after normalization
assert.equal(query.cancer, 'pancreatic cancer');
assert.equal(query.question, '寻找新辅助治疗方案');
assert.equal(query.city, '上海市');
assert.equal(buildSearchTerm(query), 'KRAS G12D pancreatic cancer');

// empty profile falls back cleanly
const emptyQuery = deriveQuery(null);
assert.equal(emptyQuery.gene, '');
assert.equal(emptyQuery.newsQuery, 'pancreatic cancer');
assert.equal(buildSearchTerm(emptyQuery), 'pancreatic cancer');

// --- Europe PMC adapter: mocked fetch, only PMID-bearing kept ---
globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return {
      resultList: {
        result: [
          {
            pmid: '40000001',
            title: 'KRAS <i>G12D</i> in PDAC',
            abstractText: 'A study. Second sentence.',
            journalTitle: 'J Clin Oncol',
            pubYear: '2026',
            isOpenAccess: 'Y',
            citedByCount: 5
          },
          { title: 'No PMID record', abstractText: 'dropped' }
        ]
      }
    };
  }
});

const papersResult = await searchPapers({ query: 'KRAS pancreatic cancer' });
assert.equal(papersResult.ok, true);
assert.equal(papersResult.items.length, 1);
assert.equal(papersResult.items[0].pmid, '40000001');
assert.equal(papersResult.items[0].title, 'KRAS G12D in PDAC');
assert.equal(papersResult.items[0].url, 'https://pubmed.ncbi.nlm.nih.gov/40000001/');
assert.equal(papersResult.items[0].isOpenAccess, true);

// --- CT.gov adapter: mocked fetch, only NCT-bearing kept ---
globalThis.fetch = async () => ({
  ok: true,
  async json() {
    return {
      studies: [
        {
          protocolSection: {
            identificationModule: { nctId: 'NCT05000001', briefTitle: 'Trial A' },
            statusModule: { overallStatus: 'RECRUITING' },
            designModule: { phases: ['PHASE1', 'PHASE2'] },
            sponsorCollaboratorsModule: { leadSponsor: { name: 'Sponsor X' } },
            conditionsModule: { conditions: ['Pancreatic Cancer'] }
          }
        },
        { protocolSection: { identificationModule: { briefTitle: 'No NCT' } } }
      ]
    };
  }
});

const trialsResult = await searchTrials({ term: 'KRAS pancreatic cancer' });
assert.equal(trialsResult.ok, true);
assert.equal(trialsResult.items.length, 1);
assert.equal(trialsResult.items[0].nct, 'NCT05000001');
assert.deepEqual(trialsResult.items[0].phase, ['PHASE1', 'PHASE2']);
assert.equal(trialsResult.items[0].url, 'https://clinicaltrials.gov/study/NCT05000001');

// --- adapter network failure -> clean fallback ---
globalThis.fetch = async () => {
  throw new Error('network down');
};
const failPapers = await searchPapers({ query: 'x', retries: 1 });
assert.equal(failPapers.ok, false);
assert.equal(failPapers.items.length, 0);

// --- registry + zero-hallucination verify ---
const registry = buildRegistry(papersResult.items, trialsResult.items);
assert.equal(registry.has('PMID:40000001'), true);
assert.equal(registry.has('NCT05000001'), true);

const verified = verifyReview(
  {
    overview: 'ov',
    themes: [
      {
        name: 'Theme 1',
        claims: [
          { text: 'real claim', citations: ['PMID:40000001', 'NCT05000001'] },
          { text: 'fake claim', citations: ['PMID:99999999'] },
          { text: 'uncited claim', citations: [] }
        ]
      }
    ]
  },
  registry,
  'llm'
);
assert.equal(verified.integrity.citations_valid, 2);
assert.equal(verified.integrity.citations_invalid, 1);
assert.equal(verified.integrity.claims_dropped, 1);
assert.equal(verified.integrity.claims_uncited, 1);
assert.equal(verified.integrity.verified, false);
assert.equal(verified.themes.length, 1);
assert.equal(verified.themes[0].claims.length, 1);
assert.equal(verified.themes[0].claims[0].links.length, 2);

// --- extractive fallback is verification-clean ---
const extractive = buildExtractiveReview(papersResult.items);
const extractiveVerified = verifyReview(extractive, registry, 'extractive');
assert.equal(extractiveVerified.integrity.verified, true);
assert.equal(extractiveVerified.themes[0].claims.length, 1);

// --- selftest mirrors the skill's --selftest ---
assert.equal(selftest(), true);

console.log('research-pipeline.test.mjs: PASS');
