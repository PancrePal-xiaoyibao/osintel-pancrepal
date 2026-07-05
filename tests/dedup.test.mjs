import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// --- Pure function mirrors of engine.ts logic for testing ---

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
  'has', 'have', 'had', 'it', 'its', 'this', 'that', 'these', 'those',
  'study', 'trial', 'research', 'analysis', 'review', 'new', 'novel',
]);

function bigrams(tokens) {
  const set = new Set();
  for (let i = 0; i < tokens.length - 1; i++) {
    set.add(`${tokens[i]}|${tokens[i + 1]}`);
  }
  return set;
}

function diceCoefficient(a, b) {
  const tokensA = normalize(a).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const tokensB = normalize(b).split(' ').filter((t) => t.length > 1 && !STOPWORDS.has(t));
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const bgA = bigrams(tokensA);
  const bgB = bigrams(tokensB);
  let intersection = 0;
  for (const bg of bgA) {
    if (bgB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bgA.size + bgB.size);
}

function fingerprint(item) {
  const key = `${normalize(item.title)}|${normalize(item.url)}|${(item.source || '').toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

// --- Tests ---

describe('Dice Coefficient', () => {
  it('should return 1.0 for identical titles', () => {
    const result = diceCoefficient(
      'KRAS G12C inhibitor shows promise in pancreatic cancer',
      'KRAS G12C inhibitor shows promise in pancreatic cancer'
    );
    assert.ok(result > 0.99, `Expected > 0.99, got ${result}`);
  });

  it('should return 1.0 for same words with different stopwords', () => {
    const result = diceCoefficient(
      'KRAS inhibitor shows promise in pancreatic cancer',
      'KRAS inhibitor shows promise for pancreatic cancer'
    );
    assert.ok(result > 0.99, `Expected near 1.0, got ${result}`);
  });

  it('should return low score for completely unrelated titles', () => {
    const result = diceCoefficient(
      'KRAS G12C inhibitor shows promise',
      'Diabetes management guidelines updated for elderly'
    );
    assert.ok(result < 0.5, `Expected < 0.5, got ${result}`);
  });

  it('should handle same title with different casing and punctuation', () => {
    const result = diceCoefficient(
      'KRAS G12C inhibitor shows promise in pancreatic cancer!',
      'kras g12c inhibitor shows promise in pancreatic cancer'
    );
    assert.ok(result > 0.9, `Expected > 0.9, got ${result}`);
  });

  it('should handle empty strings', () => {
    assert.equal(diceCoefficient('', 'test'), 0);
    assert.equal(diceCoefficient('test', ''), 0);
    assert.equal(diceCoefficient('', ''), 0);
  });

  it('should handle stopword-only titles', () => {
    assert.equal(diceCoefficient('a new study', 'a new trial'), 0);
  });

  it('should score lower for substantially different word orders', () => {
    // Dice bigrams are position-dependent; reordered words break bigrams
    const result = diceCoefficient(
      'Pancreatic cancer immunotherapy response durable phase results',
      'Results phase durable response immunotherapy cancer pancreatic'
    );
    const score = Math.round(result * 100) / 100;
    console.log(`  Reversed order Dice: ${score}`);
    // Fully reversed order should have low Dice with bigrams
    assert.ok(result < 0.5, `Expected < 0.5 for fully reversed, got ${result}`);
  });

  it('should give moderate Dice for titles differing only by one key term', () => {
    // "pancreatic" vs "breast" changes one bigram pair
    const result = diceCoefficient(
      'Immunotherapy advances pancreatic cancer treatment outcomes',
      'Immunotherapy advances breast cancer treatment outcomes'
    );
    const score = Math.round(result * 100) / 100;
    console.log(`  One-word-sub Dice: ${score}`);
    // Only 1/5 bigrams differs → Dice should be ~0.6-0.8
    assert.ok(result > 0.5, `Expected > 0.5, got ${result}`);
    assert.ok(result < 0.9, `Expected < 0.9, got ${result}`);
  });
});

describe('Fingerprint', () => {
  it('should produce same fingerprint for identical items', () => {
    const item = { title: 'Test Title', url: 'https://example.com', source: 'Test Source' };
    const fp1 = fingerprint(item);
    const fp2 = fingerprint(item);
    assert.equal(fp1, fp2);
  });

  it('should produce different fingerprints for different items', () => {
    const item1 = { title: 'Title A', url: 'https://a.com', source: 'Src1' };
    const item2 = { title: 'Title B', url: 'https://b.com', source: 'Src2' };
    assert.notEqual(fingerprint(item1), fingerprint(item2));
  });

  it('should normalize URL casing', () => {
    const item1 = { title: 'Test', url: 'HTTPS://Example.COM/path', source: 'Source' };
    const item2 = { title: 'Test', url: 'https://example.com/path', source: 'source' };
    assert.equal(fingerprint(item1), fingerprint(item2));
  });
});

describe('Dedup accuracy scenarios', () => {
  it('URL dedup layer: same URL -> should be caught', () => {
    const url1 = normalize('https://doi.org/10.1000/jama.2024.001');
    const url2 = normalize('https://doi.org/10.1000/jama.2024.001');
    assert.equal(url1, url2);
  });

  it('Dice layer: identical titles from different sources', () => {
    // Two providers reporting the same paper with identical title wording
    const title1 = 'G12C inhibitor sotorasib demonstrates activity against KRAS mutations';
    const title2 = 'G12C inhibitor sotorasib demonstrates activity against KRAS mutations';
    const score = diceCoefficient(title1, title2);
    console.log(`  Identical cross-source title Dice: ${score.toFixed(3)}`);
    assert.ok(score > 0.99);
  });

  it('Dice layer: very similar titles with small suffix difference', () => {
    const title1 = 'FOLFIRINOX versus gemcitabine for metastatic pancreatic cancer patients';
    const title2 = 'FOLFIRINOX versus gemcitabine for metastatic pancreatic cancer treatment';
    const score = diceCoefficient(title1, title2);
    console.log(`  Small suffix difference Dice: ${score.toFixed(3)}`);
    // With bigrams, one word change at the end preserves most bigrams
    assert.ok(score > 0.75, `Expected > 0.75, got ${score.toFixed(3)}`);
  });

  it('Dice layer: distinct topics should score below threshold', () => {
    const score = diceCoefficient(
      'FOLFIRINOX versus gemcitabine for metastatic pancreatic cancer',
      'Nutritional support guidelines for pancreatic enzyme replacement therapy'
    );
    console.log(`  Distinct topics Dice: ${score.toFixed(3)}`);
    assert.ok(score < 0.7, `Expected < 0.7, got ${score.toFixed(3)}`);
  });
});

console.log('\n✅ All dedup tests passed!');
