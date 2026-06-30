# Tasks — Search Module

## Task 1: Create core types and infrastructure
- [ ] 1.1 Create `src/lib/search/types.ts` with SearchKind, SearchResult, SearchOptions, SearchProvider interface, ProviderStatus, AggregateResult
- [ ] 1.2 Create `src/lib/search/registry.ts` with registerProvider, getEnabledProviders, getAllProviders
- [ ] 1.3 Create `src/lib/search/cache.ts` with getCached, setCache (5-min TTL, keyed by query+kinds)
- [ ] 1.4 Create `src/lib/search/aggregator.ts` with searchAggregate (parallel execution, circuit breaker, URL dedupe)
- [ ] 1.5 Create `src/lib/search/index.ts` barrel re-exporting types + searchAggregate

## Task 2: Wrap existing adapters as providers
- [ ] 2.1 Create `src/lib/search/providers/knows.ts` wrapping knows-client (academic/guideline/trial, anonymous-capable)
- [ ] 2.2 Create `src/lib/search/providers/pubmed.ts` wrapping europepmc-adapter (academic, no key needed)
- [ ] 2.3 Create `src/lib/search/providers/clinicaltrials.ts` wrapping ctgov-adapter (trial, no key needed)
- [ ] 2.4 Create `src/lib/search/providers/anysearch.ts` wrapping anysearch-adapter (web/news, anonymous-capable)

## Task 3: Implement new providers — Tavily, Serper, Metaso
- [ ] 3.1 Create `src/lib/search/providers/tavily.ts` (POST api.tavily.com/search, requires TAVILY_API_KEY, kind: news)
- [ ] 3.2 Create `src/lib/search/providers/serper.ts` (POST google.serper.dev/search, requires SERPER_API_KEY, kind: web)
- [ ] 3.3 Create `src/lib/search/providers/metaso.ts` (秘塔 API, requires METASO_API_KEY, kind: web/news)
- [ ] 3.4 Create `src/lib/search/providers/google-cse.ts` (GET googleapis.com/customsearch, requires GOOGLE_API_KEY + GOOGLE_CSE_ID, kind: web)

## Task 4: Implement optional providers — Brave, Exa, Semantic Scholar, OpenAlex
- [ ] 4.1 Create `src/lib/search/providers/brave.ts` (GET api.search.brave.com/res/v1/web/search, requires BRAVE_API_KEY, kind: web)
- [ ] 4.2 Create `src/lib/search/providers/exa.ts` (POST api.exa.ai/search, requires EXA_API_KEY, kind: web/academic)
- [ ] 4.3 Create `src/lib/search/providers/semantic-scholar.ts` (GET api.semanticscholar.org/graph/v1/paper/search, no key needed, kind: academic)
- [ ] 4.4 Create `src/lib/search/providers/openalex.ts` (GET api.openalex.org/works, no key needed, kind: academic)

## Task 5: Provider barrel and registration
- [ ] 5.1 Create `src/lib/search/providers/index.ts` that imports all provider modules (triggering self-registration)

## Task 6: Integrate with news pipeline
- [ ] 6.1 Refactor `src/lib/news/refresh.ts` to call searchAggregate instead of the old aggregate.ts
- [ ] 6.2 Update server.ts feed routes to pass all search env vars and expose ProviderStatus[] in responses
- [ ] 6.3 Replace or deprecate `src/lib/news/aggregate.ts` (superseded by search module)

## Task 7: Integrate with personalized routes and chatbot
- [ ] 7.1 Update `/api/personal/feed` and `/api/personal/assistant` to use searchAggregate for grounding
- [ ] 7.2 Update `/api/osint/chat-custom` to use searchAggregate for response grounding

## Task 8: Update configuration and documentation
- [ ] 8.1 Update `.env.example` with all new provider keys (TAVILY_API_KEY, SERPER_API_KEY, GOOGLE_API_KEY, GOOGLE_CSE_ID, METASO_API_KEY, BRAVE_API_KEY, EXA_API_KEY, NEWS_DISABLE_* toggles)
- [ ] 8.2 Update README.md with the full search provider list, deployment notes, and the aggregator architecture
- [ ] 8.3 Update AGENTS.md to reference the new src/lib/search/ module

## Task 9: Verify and ship
- [ ] 9.1 Run `tsc --noEmit` and fix any type errors
- [ ] 9.2 Run `vite build` and confirm production build succeeds
- [ ] 9.3 Commit all changes and push to personalized-osintel branch
