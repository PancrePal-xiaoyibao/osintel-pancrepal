# Search Module — Requirements

## Introduction

The Pancreatic Cancer OSINT Hub currently aggregates news from four sources via
ad-hoc functions in `src/lib/news/aggregate.ts` (KnowS, Europe PMC/PubMed,
ClinicalTrials.gov v2, AnySearch). This works but does not scale: each new
provider (Tavily, Google, Metaso, Brave, Exa, etc.) requires bespoke wiring, and
the same search capability is needed in several places (homepage news feed, the
personalized "My" hub, AI-assistant grounding, the floating chatbot).

This spec defines a **unified, pluggable search module**: a single provider
abstraction plus a registry and aggregator that any feature can call. The goals
are completeness (easy to add providers), efficiency (parallel execution,
caching, circuit breaking), and reusability (one search surface across the app).
All AI-facing results must remain citation-resolvable (real source URLs, no
fabricated content), consistent with the project's zero-hallucination stance.

### Scope

- In scope: provider interface, registry, configuration, aggregation/normalization,
  dedupe/ranking, caching, graceful degradation, query routing, reuse surfaces,
  and observability.
- Out of scope: changing the news ranking/window math itself (reused as-is),
  redesigning the UI beyond surfacing provider status, and any paid-tier billing.

### Terminology

- **Provider**: an adapter for one external search capability (e.g. Tavily).
- **Kind**: a provider category — `web`, `news`, `academic`, `trial`, `guideline`.
- **Aggregator**: orchestrates enabled providers and merges their results.
- **SearchResult**: the common normalized shape every provider returns.

---

## Requirements

### Requirement 1 — Pluggable provider interface

**User Story:** As a developer, I want every search source to implement one
common interface, so that I can add or remove providers without touching the
aggregator or downstream consumers.

#### Acceptance Criteria

1. THE SYSTEM SHALL define a `SearchProvider` interface with at least: a stable
   `id`, a `kind`, an `isConfigured(env)` check, and an async
   `search(query, options)` method returning a common `SearchResult[]`.
2. WHEN a new provider module is added to the registry THE SYSTEM SHALL include
   it in aggregation without changes to the aggregator or consumer code.
3. THE SYSTEM SHALL define a single `SearchResult` shape that includes at minimum
   title, url, snippet/summary, source name, provider id, kind, and optional
   publishedAt, plus optional identifiers (DOI, PMID, NCT).
4. WHEN a provider cannot map a raw result to the common shape THE SYSTEM SHALL
   drop that result rather than emit a malformed item.

### Requirement 2 — Provider registry and enablement

**User Story:** As an operator, I want a central registry that knows which
providers exist and which are enabled, so that configuration is explicit and
discoverable.

#### Acceptance Criteria

1. THE SYSTEM SHALL maintain a registry of all known providers keyed by `id`.
2. WHEN a provider has no required credentials configured AND it cannot run
   anonymously THE SYSTEM SHALL mark it disabled and exclude it from aggregation.
3. WHEN an operator sets a provider's disable flag (e.g. `NEWS_DISABLE_<ID>=1`)
   THE SYSTEM SHALL exclude that provider even if it is configured.
4. THE SYSTEM SHALL expose the current enabled/disabled status and last-run
   result count for each provider via the existing feed/source-status surface.

### Requirement 3 — Web/general search providers

**User Story:** As a user, I want recent web and news results from strong general
engines, so that the feed surfaces breaking developments beyond academic indexes.

#### Acceptance Criteria

1. THE SYSTEM SHALL support **Tavily** (`api.tavily.com/search`) with news topic
   and recency window, when `TAVILY_API_KEY` is configured.
2. THE SYSTEM SHALL support **Google** web search via Serper.dev
   (`google.serper.dev/search`) when `SERPER_API_KEY` is configured, and SHALL
   support the official Programmable Search (CSE) as an alternative when
   `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` are configured.
3. THE SYSTEM SHALL continue to support **AnySearch** (already integrated),
   including anonymous access.
4. THE SYSTEM SHOULD support **Metaso (秘塔)** for Chinese-language results when a
   key is configured, treated as optional/best-effort given gated API access.
5. THE SYSTEM MAY support additional web providers (Brave, Exa) behind the same
   interface when their keys are configured.
6. WHEN multiple web providers return the same URL THE SYSTEM SHALL deduplicate
   to a single result.

### Requirement 4 — Academic and clinical providers

**User Story:** As a patient/clinician, I want authoritative literature, trials,
and guidelines, so that the feed is evidence-grounded and citation-resolvable.

#### Acceptance Criteria

1. THE SYSTEM SHALL retain **KnowS** (papers/guidelines/trials), **Europe
   PMC/PubMed**, and **ClinicalTrials.gov v2** as providers under the new
   interface.
2. THE SYSTEM SHALL keep only academic/clinical results that resolve to a real
   citation (PMID, NCT, DOI, or a valid source URL).
3. THE SYSTEM MAY add **Semantic Scholar** and/or **OpenAlex** for related-paper
   and citation expansion when enabled.

### Requirement 5 — Configuration and secrets

**User Story:** As an operator, I want all provider keys and toggles in `.env`,
so that configuration is simple, optional, and never leaks to the client.

#### Acceptance Criteria

1. THE SYSTEM SHALL read all provider API keys and endpoints from server-side
   environment variables only, and SHALL NOT expose any key to the browser.
2. THE SYSTEM SHALL treat every provider key as optional; absence disables only
   that provider, never the whole module.
3. THE SYSTEM SHALL document each new variable in `.env.example` with a comment
   describing purpose and whether anonymous access is possible.
4. WHEN a provider supports anonymous access (e.g. AnySearch, KnowS) THE SYSTEM
   SHALL run it without a key at reduced limits.

### Requirement 6 — Parallel execution and graceful degradation

**User Story:** As a user, I want the feed to stay fast and resilient, so that one
slow or failing source never blocks results.

#### Acceptance Criteria

1. THE SYSTEM SHALL run all enabled providers concurrently and SHALL NOT let a
   single provider failure reject the aggregate (use settled semantics).
2. WHEN a provider exceeds its per-call timeout THE SYSTEM SHALL abort that call
   and record it as failed without affecting other providers.
3. WHEN a provider fails repeatedly THE SYSTEM SHALL temporarily skip it (circuit
   breaker) and resume after a cool-down.
4. WHEN providers that must respect gateway rate limits run (e.g. KnowS
   multi-source) THE SYSTEM SHALL serialize their internal calls as required.

### Requirement 7 — Normalization, dedupe, and ranking

**User Story:** As a user, I want one clean, de-duplicated, ranked feed, so that
results from many engines read as a single coherent stream.

#### Acceptance Criteria

1. THE SYSTEM SHALL normalize every provider's `SearchResult` into the existing
   news pipeline item shape (`NewsNormalizedItem`).
2. THE SYSTEM SHALL deduplicate across providers by URL, and by DOI/PMID/NCT when
   present.
3. THE SYSTEM SHALL reuse the existing ranking and 24h/7d/30d window logic,
   preserving center-first prioritization.
4. WHEN no enabled provider returns any item THE SYSTEM SHALL fall back to the
   bundled seed dataset and label the mode accordingly.

### Requirement 8 — Caching and 5-minute refresh

**User Story:** As an operator, I want results cached briefly, so that the
5-minute auto-refresh does not hammer upstream APIs or exhaust quotas.

#### Acceptance Criteria

1. THE SYSTEM SHALL cache aggregated results with a configurable TTL (default 5
   minutes) keyed by query and window.
2. WHEN a cached entry is still valid THE SYSTEM SHALL serve it without calling
   providers, unless a force-refresh is requested.
3. THE SYSTEM SHALL preserve the existing 5-minute client auto-refresh behavior.

### Requirement 9 — Query routing by intent

**User Story:** As a user, I want the right engines used for the right query, so
that gene/drug/trial/guideline queries return higher-quality results.

#### Acceptance Criteria

1. THE SYSTEM SHALL infer query intent (e.g. gene, drug, trial, guideline,
   general) from the query and/or the patient profile.
2. WHEN intent maps to a provider kind THE SYSTEM SHOULD prioritize or weight
   those providers (e.g. trial intent → ClinicalTrials.gov + KnowS trial).
3. THE SYSTEM SHALL still query general web providers for breadth unless an
   operator restricts kinds for a given call.

### Requirement 10 — Reusability across features

**User Story:** As a developer, I want one search entry point reused everywhere,
so that the news feed, the "My" hub, the assistant, and the chatbot share the
same capability and configuration.

#### Acceptance Criteria

1. THE SYSTEM SHALL expose a single `searchAggregate(query, options)` entry point
   consumed by the homepage news feed, the personalized routes, AI-assistant
   grounding, and the floating chatbot.
2. WHEN a consumer needs a subset (e.g. only academic, or only web) THE SYSTEM
   SHALL accept a `kinds`/`providers` filter in options.
3. THE SYSTEM SHALL keep the existing `/api/osint/feed` and
   `/api/osint/feed/refresh` response contracts backward-compatible.

### Requirement 11 — Observability and source status

**User Story:** As a user, I want to see which sources contributed, so that I can
judge coverage and trust the feed.

#### Acceptance Criteria

1. THE SYSTEM SHALL return a per-provider status report (id, ok, count, reason)
   with each aggregation.
2. THE SYSTEM SHALL surface provider status chips in the feed sidebar (extending
   the current display).
3. WHEN a provider is disabled or unconfigured THE SYSTEM SHALL indicate that
   distinctly from a runtime failure.

### Requirement 12 — Citation integrity and safety

**User Story:** As a patient/clinician, I want every result to be a real,
clickable source, so that nothing in the feed is fabricated.

#### Acceptance Criteria

1. THE SYSTEM SHALL require a valid source URL (or resolvable PMID/NCT/DOI) for
   every emitted item.
2. THE SYSTEM SHALL NOT use an LLM to invent results; any LLM use is limited to
   summarizing/translating real retrieved content and SHALL preserve citations.
3. THE SYSTEM SHALL treat all external responses as untrusted input and parse
   them defensively (no crash on malformed provider payloads).

---

## Open Questions

1. For Google, do you prefer **Serper.dev** (one key, simplest) as the default,
   with official CSE as an alternative — or the reverse?
2. Is **Metaso** access available to you now, or should it be a documented but
   inactive provider until a key is obtained?
3. Beyond Tavily/Google/Metaso, which optional providers (Brave, Exa, Semantic
   Scholar, OpenAlex) are worth enabling in v1 vs. deferring?
4. Should query-intent routing (Requirement 9) ship in v1, or start with "query
   all enabled providers" and add routing later?