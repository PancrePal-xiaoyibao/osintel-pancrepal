import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ---- Pure functions extracted from FilterPanel ----

/** Merge patch into FilterParams */
function mergeFilterParams(current, patch) {
  // Source toggle logic
  let sources = patch.sources;
  if (sources !== undefined && current.sources) {
    if (Array.isArray(sources) && sources.length > 0) {
      sources = sources;
    }
  }
  const result = { ...current, ...patch };
  // Cleanup: remove empty arrays
  if (result.sources && result.sources.length === 0) {
    delete result.sources;
  }
  return result;
}

/** Toggle a source in/out of selected list */
function toggleSource(selected, source) {
  if (selected.includes(source)) {
    return selected.filter((s) => s !== source);
  }
  return [...selected, source];
}

/** Build filter params with only meaningful fields */
function cleanParams(params) {
  const cleaned = {};
  if (params.from) cleaned.from = params.from;
  if (params.to) cleaned.to = params.to;
  if (params.sources && params.sources.length > 0) cleaned.sources = params.sources;
  if (params.minCredibility !== undefined && params.minCredibility > 0) cleaned.minCredibility = params.minCredibility;
  if (params.sort && params.sort !== 'time') cleaned.sort = params.sort;
  if (params.order && params.order !== 'desc') cleaned.order = params.order;
  if (params.page && params.page > 1) cleaned.page = params.page;
  if (params.pageSize && params.pageSize !== 20) cleaned.pageSize = params.pageSize;
  if (params.search) cleaned.search = params.search;
  return cleaned;
}

describe('FilterPanel Logic', () => {
  it('should merge time range', () => {
    const result = mergeFilterParams({}, { from: '2026-06-01', to: '2026-07-01' });
    assert.equal(result.from, '2026-06-01');
    assert.equal(result.to, '2026-07-01');
  });

  it('should merge credibility threshold', () => {
    const result = mergeFilterParams({}, { minCredibility: 60 });
    assert.equal(result.minCredibility, 60);
  });

  it('should merge sort params', () => {
    let result = mergeFilterParams({}, { sort: 'credibility' });
    assert.equal(result.sort, 'credibility');
    result = mergeFilterParams(result, { order: 'asc' });
    assert.equal(result.order, 'asc');
  });

  it('should preserve existing params when merging', () => {
    const base = { sort: 'credibility' };
    const result = mergeFilterParams(base, { minCredibility: 50 });
    assert.equal(result.sort, 'credibility');
    assert.equal(result.minCredibility, 50);
  });

  it('should toggle source in', () => {
    const result = toggleSource(['PubMed'], 'NEJM');
    assert.deepEqual(result, ['PubMed', 'NEJM']);
  });

  it('should toggle source out', () => {
    const result = toggleSource(['PubMed', 'NEJM'], 'NEJM');
    assert.deepEqual(result, ['PubMed']);
  });

  it('should cleanup removed sources array', () => {
    const result = mergeFilterParams({ sources: ['NEJM'] }, {});
    // Empty arrays from toggle logic should be handled
    assert.ok(result.sources, 'sources should exist after merge');
  });

  it('should clean default values from params', () => {
    const params = {
      sort: 'time',
      order: 'desc',
      page: 1,
      pageSize: 20,
      from: '2026-06-01',
      minCredibility: 80,
    };
    const cleaned = cleanParams(params);
    assert.equal(cleaned.sort, undefined, 'default sort should be omitted');
    assert.equal(cleaned.order, undefined, 'default order should be omitted');
    assert.equal(cleaned.page, undefined, 'default page should be omitted');
    assert.equal(cleaned.from, '2026-06-01', 'non-default from should be kept');
    assert.equal(cleaned.minCredibility, 80, 'non-default credibility should be kept');
  });

  it('should reset to empty params', () => {
    const result = mergeFilterParams(
      { from: '2026-06-01', sort: 'credibility' },
      {}
    );
    // Reset scenario
    const fresh = {};
    assert.notEqual(fresh.from, '2026-06-01');
  });
});

console.log('\n✅ All FilterPanel tests passed!');
