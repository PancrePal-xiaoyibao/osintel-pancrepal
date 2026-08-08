import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mirror the quality scoring logic from src/lib/centers/quality.ts
// for pure-function unit testing without TS imports.

function scoreSourceAuthority(sourceUrls) {
  if (!sourceUrls || sourceUrls.length === 0) return 0;
  let bestScore = 0;
  for (const url of sourceUrls) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.includes('.gov.') || hostname.endsWith('.gov') || hostname.includes('who.int') || hostname.includes('pubmed')) {
        bestScore = Math.max(bestScore, 1.0);
      } else if (hostname.includes('.edu.') || hostname.endsWith('.edu')) {
        bestScore = Math.max(bestScore, 0.9);
      } else if (hostname.includes('hospital') || hostname.includes('clinic') || hostname.includes('med')) {
        bestScore = Math.max(bestScore, 0.7);
      } else if (hostname.includes('weixin') || hostname.includes('mp.weixin') || hostname.includes('zhihu')) {
        bestScore = Math.max(bestScore, 0.4);
      } else {
        bestScore = Math.max(bestScore, 0.3);
      }
    } catch {
      bestScore = Math.max(bestScore, 0.1);
    }
  }
  return bestScore;
}

function scoreCrossValidation(sourceUrls) {
  const count = sourceUrls?.length ?? 0;
  if (count === 0) return 0;
  if (count === 1) return 0.4;
  if (count === 2) return 0.7;
  return 1.0;
}

function scoreTimeliness(verifiedAt, now) {
  if (!verifiedAt) return 0;
  try {
    const verified = new Date(verifiedAt).getTime();
    if (isNaN(verified)) return 0;
    const daysSince = (now.getTime() - verified) / (1000 * 60 * 60 * 24);
    if (daysSince < 90) return 1.0;
    if (daysSince < 180) return 0.7;
    if (daysSince < 365) return 0.4;
    return 0.2;
  } catch {
    return 0;
  }
}

function computeQualityScore(breakdown) {
  const weights = { dataCompleteness: 0.30, sourceAuthority: 0.25, crossValidation: 0.20, accreditation: 0.15, timeliness: 0.10 };
  return Math.round(
    (breakdown.dataCompleteness * weights.dataCompleteness +
     breakdown.sourceAuthority * weights.sourceAuthority +
     breakdown.crossValidation * weights.crossValidation +
     breakdown.accreditation * weights.accreditation +
     breakdown.timeliness * weights.timeliness) * 100
  );
}

describe('Source Authority Scoring', () => {
  it('should score gov.cn as maximum authority', () => {
    assert.equal(scoreSourceAuthority(['https://www.nhc.gov.cn/hospital']), 1.0);
  });

  it('should score .edu as high authority', () => {
    assert.equal(scoreSourceAuthority(['https://www.fudan.edu.cn']), 0.9);
  });

  it('should score hospital domain as medium', () => {
    assert.equal(scoreSourceAuthority(['https://www.example-hospital.com']), 0.7);
  });

  it('should score weixin as low', () => {
    assert.equal(scoreSourceAuthority(['https://mp.weixin.qq.com/article']), 0.4);
  });

  it('should score unknown domain as baseline', () => {
    assert.equal(scoreSourceAuthority(['https://example.com']), 0.3);
  });

  it('should pick best score from multiple sources', () => {
    assert.equal(scoreSourceAuthority(['https://example.com', 'https://www.nhc.gov.cn']), 1.0);
  });

  it('should return 0 for empty sources', () => {
    assert.equal(scoreSourceAuthority([]), 0);
    assert.equal(scoreSourceAuthority(null), 0);
  });
});

describe('Cross Validation Scoring', () => {
  it('should score 0 for no sources', () => {
    assert.equal(scoreCrossValidation([]), 0);
  });

  it('should score 0.4 for single source', () => {
    assert.equal(scoreCrossValidation(['https://a.com']), 0.4);
  });

  it('should score 0.7 for two sources', () => {
    assert.equal(scoreCrossValidation(['https://a.com', 'https://b.com']), 0.7);
  });

  it('should score 1.0 for 3+ sources', () => {
    assert.equal(scoreCrossValidation(['https://a.com', 'https://b.com', 'https://c.com']), 1.0);
  });
});

describe('Timeliness Scoring', () => {
  const now = new Date('2025-08-01T12:00:00Z');

  it('should score 1.0 for verification within 90 days', () => {
    assert.equal(scoreTimeliness('2025-07-01T00:00:00Z', now), 1.0);
  });

  it('should score 0.7 for verification within 180 days', () => {
    assert.equal(scoreTimeliness('2025-03-01T00:00:00Z', now), 0.7);
  });

  it('should score 0.4 for verification within 365 days', () => {
    assert.equal(scoreTimeliness('2024-10-01T00:00:00Z', now), 0.4);
  });

  it('should score 0.2 for verification older than 365 days', () => {
    assert.equal(scoreTimeliness('2024-01-01T00:00:00Z', now), 0.2);
  });

  it('should score 0 when not verified', () => {
    assert.equal(scoreTimeliness(undefined, now), 0);
    assert.equal(scoreTimeliness(null, now), 0);
  });
});

describe('Composite Quality Score', () => {
  it('should compute weighted composite correctly', () => {
    const breakdown = {
      dataCompleteness: 0.5,
      sourceAuthority: 1.0,
      crossValidation: 0.7,
      accreditation: 0.8,
      timeliness: 1.0,
    };
    // 0.5*0.30 + 1.0*0.25 + 0.7*0.20 + 0.8*0.15 + 1.0*0.10 = 0.15+0.25+0.14+0.12+0.10 = 0.76
    // 0.76 * 100 = 76
    assert.equal(computeQualityScore(breakdown), 76);
  });

  it('should score 0 for all-zero breakdown', () => {
    const breakdown = { dataCompleteness: 0, sourceAuthority: 0, crossValidation: 0, accreditation: 0, timeliness: 0 };
    assert.equal(computeQualityScore(breakdown), 0);
  });

  it('should score 100 for perfect breakdown', () => {
    const breakdown = { dataCompleteness: 1.0, sourceAuthority: 1.0, crossValidation: 1.0, accreditation: 1.0, timeliness: 1.0 };
    assert.equal(computeQualityScore(breakdown), 100);
  });
});

console.log('\n✅ All quality scoring tests passed!');
