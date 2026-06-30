import type { SearchKind, SearchProvider } from './types';

const providers: SearchProvider[] = [];

export function registerProvider(provider: SearchProvider): void {
  providers.push(provider);
}

export function getEnabledProviders(
  env: Record<string, string | undefined>,
  kindsFilter?: SearchKind[]
): SearchProvider[] {
  return providers.filter((p) => {
    if (env[`NEWS_DISABLE_${p.id.toUpperCase()}`] === '1') return false;
    if (!p.isConfigured(env)) return false;
    if (kindsFilter && !kindsFilter.includes(p.kind)) return false;
    return true;
  });
}

export function getAllProviders(): SearchProvider[] {
  return [...providers];
}
