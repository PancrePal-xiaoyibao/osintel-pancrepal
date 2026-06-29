# Personalized OSINTel Design (个性化 OSINTel 分支设计)

> Status: DESIGN / PROPOSED · Author: agent · Date: 2026-06-28
> Depends on: existing `PatientProfile`, news pipeline (`src/lib/news/*`),
> multi-provider LLM proxy (`/api/osint/chat-custom`).
> Source of inspiration: `skills-kebab-reference` (lifescience-research-copilot).

## 1. Background

The general OSINTel hub serves a global, non-personalized intelligence feed. The
`lifescience-research-copilot` skill closes a different loop: given
`gene/mutation × cancer × research question`, it retrieves real PubMed papers
(Europe PMC) and recruiting trials (ClinicalTrials.gov), builds a citation
registry, and produces a **zero-hallucination** review where every PMID/NCT is
verified against the registry.

The OSINTel project already stores exactly the inputs this loop needs: the
`PatientProfile` (`city`, `mutations[]`, `ihcResults`, `regimen`, `efficacy`,
`summary`). Combining the two yields a **personalized OSINTel**: a patient enters
their condition once, and a dedicated "我的 / My" tab assembles personalized
streaming news, recent (90-day) related articles, condition-matched papers, a
clinical-trial list, and a context-grounded AI assistant.

## 2. Goal

Add a personalized OSINTel experience as a **separate branch and a separate
in-app surface**, without changing the general feed or its routes.

- New "我的 / My" tab gated on an existing `PatientProfile`.
- Five sections: personalized streaming news, 90-day related articles,
  condition-related papers (PubMed), clinical-trial list (CT.gov), AI assistant.
- Reuse the existing LLM proxy and news pipeline; port the skill's retrieval and
  zero-hallucination verification to TypeScript inside `server.ts`.

## 3. Non-Goals

- No Python runtime or `review.py` subprocess (keeps the single-Node-process
  deployment model intact).
- No change to the general `/api/osint/*` routes or the general feed UI.
- No PDF/HTML report export in v1 (Markdown render in-app is enough; export can
  follow later).
- No new LLM provider; the personalized assistant and review synthesis reuse
  `/api/osint/chat-custom`.
- No storage of personally identifiable information; profile stays local/
  de-identified as today.

## 4. Decision Record

- **Port to TypeScript, do not shell out to Python.** The skill is ~400 lines of
  stdlib Python; its two API contracts (Europe PMC, CT.gov v2) and its
  deterministic citation/verification logic port cleanly to TS and then reuse the
  existing types and LLM proxy. `AGENTS.md` fixes the stack to Three.js /
  ai-elements / Supabase with no Python.
- **Preserve zero-hallucination as the trust contract.** The citation registry is
  the fact base; the synthesis LLM never invents ids, and any id not in the
  registry is dropped before render. This logic is ported verbatim in behavior.
- **Two-layer isolation.** A git branch `personalized-osintel` for development,
  plus an in-app namespace: a dedicated "My" tab and `/api/personal/*` routes.

## 5. Architecture

```
PatientProfile (local, de-identified)
   │  derive query tokens (gene/mutation × "pancreatic cancer" × question)
   ▼
/api/personal/*  (new Express namespace)
   ├─ literature  ── Europe PMC client ───► papers (PMID/title/abstract/meta)
   ├─ trials      ── ClinicalTrials.gov v2 ─► trials (NCT/phase/sponsor/locations)
   ├─ feed        ── refreshNewsWindows(query=profile-derived) ─► personalized news
   ├─ review      ── registry → LLM(/chat-custom) → verify(drop fake ids) → md
   └─ assistant   ── /chat-custom + injected profile + retrieved papers/trials
   ▼
"我的 / My" tab (React)
   ├─ Personalized Streaming News (windowed)
   ├─ 90-day Related Articles
   ├─ Related Papers (PubMed)
   ├─ Clinical Trials (CT.gov)
   └─ AI Assistant (grounded)
```

### 5.1 New shared library: `src/lib/research/`

Mirror the news module's thin-adapter style.

- `europepmc-adapter.ts` — `searchPapers({ query, yearFrom, limit })`; GET
  `https://www.ebi.ac.uk/europepmc/webservices/rest/search`, sorted by
  `P_PDATE_D desc`, `resultType=core`. Keep only results with a PMID. Strip HTML
  from title/abstract. Retry with backoff; return `{ ok, items }`.
- `ctgov-adapter.ts` — `searchTrials({ term, status, limit, location? })`; GET
  `https://clinicaltrials.gov/api/v2/studies`,
  `filter.overallStatus=RECRUITING`, optional location filter from
  `profile.city`. Return `{ ok, items }`.
- `citation-registry.ts` — `buildRegistry(papers, trials)` →
  `Map<id, { url, title }>` where ids are `PMID:<id>` and `<NCT...>`.
- `hallucination-verify.ts` — port of `verify()`: keep only claims whose
  citations exist in the registry; compute `integrity`
  (`citations_valid/invalid`, `claims_dropped/uncited`, `hallucination_rate`,
  `verified`). Include a `selftest()` that injects a fake PMID and asserts it is
  dropped (mirrors the skill's `--selftest`).
- `profile-query.ts` — `deriveQuery(profile)`: normalize CN mutation labels to
  English gene tokens (e.g. "KRAS G12D 抑制剂" → "KRAS G12D"), pick a default
  research question, and produce `{ gene, cancer: 'pancreatic cancer', question }`
  plus the news query string. Keep a small CN→EN token map; fall back to the raw
  token when unmapped.

### 5.2 Data model additions (`src/types.ts`)

```ts
export interface LiteratureItem {
  pmid: string;
  title: string;
  abstract: string;
  journal?: string;
  year?: string;
  doi?: string;
  url: string;            // https://pubmed.ncbi.nlm.nih.gov/<pmid>/
  citedByCount?: number;
  isOpenAccess?: boolean;
}

export interface ClinicalTrialItem {
  nct: string;
  title: string;
  status: string;         // e.g. RECRUITING
  phase: string[];
  sponsor?: string;
  url: string;            // https://clinicaltrials.gov/study/<nct>
  conditions?: string[];
  locations?: string[];
}

export interface ReviewClaim { text: string; citations: string[]; links?: string[]; }
export interface ReviewTheme { name: string; claims: ReviewClaim[]; }
export interface ReviewIntegrity {
  citations_valid: number; citations_invalid: number;
  claims_dropped: number; claims_uncited: number;
  hallucination_rate: number; verified: boolean;
}
export interface PersonalReview {
  overview?: string;
  themes: ReviewTheme[];
  integrity: ReviewIntegrity;
  engine: 'llm' | 'extractive';
}
```

### 5.3 New API namespace (`server.ts`)

| Route | Method | Body | Returns |
|---|---|---|---|
| `/api/personal/literature` | POST | `{ gene, cancer?, question?, yearFrom?, limit? }` | `{ status, items: LiteratureItem[], mode }` |
| `/api/personal/trials` | POST | `{ gene, cancer?, location?, limit? }` | `{ status, items: ClinicalTrialItem[] }` |
| `/api/personal/feed` | POST | `{ profileQuery, window? }` | `{ status, data, windows, mode }` (reuses `refreshNewsWindows`) |
| `/api/personal/review` | POST | `{ gene, cancer?, question?, config? }` | `{ status, review: PersonalReview }` |
| `/api/personal/assistant` | POST | `{ messages, profile, config?, context? }` | `{ status, text, reasoning }` (reuses chat-custom path) |

Rules:
- Routes accept a profile-derived query in the body; the server never persists
  PII and only forwards gene/cancer tokens to external APIs.
- `/api/personal/review` builds the registry from the literature+trials results,
  calls the LLM via the existing proxy logic for synthesis, then runs the
  verifier and returns the integrity badge data. If no LLM is reachable, fall
  back to extractive synthesis (abstract first sentences cited by real PMID).
- All external calls have retry/backoff and a clean fallback when the network or
  API is unavailable, matching the existing news adapter behavior.

### 5.4 UI: "我的 / My" tab

- Extend the `activeTab` union in `App.tsx` with `'my'` and add a nav entry.
- Empty-profile state: a prompt/CTA routing to `PatientProfileView` to fill the
  profile first (the tab is gated on `profile != null`).
- New component `src/components/MyPersonalView.tsx` with five sub-sections (tabs
  or stacked cards):
  1. **个性化 Streaming News** — windowed (24h/7d/30d) via `/api/personal/feed`.
  2. **90 天相关文章** — recent window emphasis from the same feed source.
  3. **相关论文 (PubMed)** — `LiteratureItem` cards with PMID link, journal, year,
     open-access badge.
  4. **临床试验 (CT.gov)** — `ClinicalTrialItem` cards with phase chip, sponsor,
     NCT link, optional location match to `profile.city`.
  5. **AI 助手** — grounded chat that injects the profile and the retrieved
     papers/trials as context; renders the zero-hallucination badge for reviews.
- Reuse existing card/badge visual language (slate/zinc) and the i18n
  `TRANSLATIONS` table.

## 6. Privacy & Safety

- Profile remains in LocalStorage / optional Firestore as today; the personalized
  routes receive only derived tokens, never name/contact/record ids.
- External requests carry gene/cancer keywords only.
- Keep the standard medical disclaimer on every personalized surface: research
  reference only, not a clinical diagnosis.
- Preserve the zero-hallucination badge wording so the trust signal is explicit.

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Europe PMC / CT.gov are overseas; CN/Studio egress may be blocked | Retry+backoff; clean fallback; document a proxy/base-URL override env like the KNOWS adapter |
| CN mutation labels not PubMed-searchable | `profile-query.ts` CN→EN token map with raw-token fallback |
| LLM invents PMIDs/NCTs | Deterministic registry verify drops any unknown id; `selftest()` guards regressions |
| Token budget truncates review JSON | Cap corpus size and abstract length (mirror skill: 12 papers, 900-char abstracts); extractive fallback |
| Scope creep into general feed | All new code under `/api/personal/*`, `src/lib/research/*`, `MyPersonalView.tsx` |

## 8. Phased Tasks (implementation plans to follow)

1. **P1 — Research adapters + types.** Add `src/lib/research/*` (Europe PMC,
   CT.gov, registry, verifier, profile-query) and `LiteratureItem`/
   `ClinicalTrialItem`/review types. Contract tests for dedupe/verify/selftest.
2. **P1 — Personal API namespace.** Add `/api/personal/literature`,
   `/trials`, `/feed`, `/review`, `/assistant` in `server.ts`, reusing the
   chat-custom proxy and `refreshNewsWindows`. Network fallback paths.
3. **P1 — "My" tab shell + profile gating.** Extend `activeTab`, add nav entry
   and `MyPersonalView.tsx` with empty-profile CTA.
4. **P2 — Five sections wired.** News window, 90-day articles, papers, trials,
   assistant with grounded context and zero-hallucination badge.
5. **P2 — Polish + i18n + disclaimer.** Visual density pass, translations, and
   disclaimer placement; verify `npm run lint` and `npm run build`.

## 9. Acceptance Criteria

- A patient with a saved `PatientProfile` sees a "My" tab with five working
  sections; an empty profile shows a CTA to fill it.
- Papers and trials come from real Europe PMC / CT.gov responses (PMID/NCT links
  resolve), with graceful fallback when offline.
- The review surface shows the integrity badge and drops any unverified citation;
  `selftest()` passes.
- General feed, routes, and UI are unchanged.
- `npm run lint` and `npm run build` exit 0.

## 10. Verification Strategy

- `npm run lint` on every plan touching TS.
- Node contract tests for the research adapters and the verifier (`selftest`).
- `npm run build` after API/routing changes.
- Browser smoke for the "My" tab and the grounded assistant.
