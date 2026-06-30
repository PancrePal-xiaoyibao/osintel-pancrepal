// Register all providers (side-effect import)
import './providers/index';

// Core types
export type {
  SearchKind,
  SearchResult,
  SearchOptions,
  SearchProvider,
  ProviderStatus,
  AggregateResult,
} from './types';

// Aggregator
export { searchAggregate } from './aggregator';

// Registry
export { registerProvider, getEnabledProviders, getAllProviders } from './registry';

// Cache
export { getCached, setCache, loadFromFile } from './cache';
