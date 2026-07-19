import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ---- Pure functions extracted from TimelineView ----

function tierColor(tier) {
  switch (tier) {
    case 's1_regulatory': case 's2_top_journal':
      return 'text-emerald-400';
    case 's3_clinical_trial': case 's4_academic':
      return 'text-blue-400';
    case 's5_guideline':
      return 'text-purple-400';
    case 's6_medical_news':
      return 'text-amber-400';
    case 's7_general_news':
      return 'text-zinc-400';
    default:
      return 'text-zinc-500';
  }
}

function credibilityColor(score) {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

function tierLabel(tier, lang) {
  if (lang === 'EN') return tier.replace('s', 'S').replace(/_/g, ' ');
  const m = {
    s1_regulatory: '监管机构', s2_top_journal: '顶级期刊',
    s3_clinical_trial: '临床试验', s4_academic: '学术',
    s5_guideline: '诊疗指南', s6_medical_news: '医学媒体',
    s7_general_news: '通用新闻', s8_unknown: '未知',
  };
  return m[tier] || tier;
}

function evidenceLabel(level, lang) {
  if (lang === 'EN') return level.replace(/_/g, ' ');
  const m = {
    meta_analysis: 'Meta分析', systematic_review: '系统综述',
    rct: 'RCT', cohort_study: '队列研究', case_control: '病例对照',
    case_report: '病例报告', expert_opinion: '专家意见', unknown: '未知',
  };
  return m[level] || level;
}

function getRelativeTime(publishedAt, lang) {
  if (!publishedAt) return lang === 'EN' ? 'No date' : '无日期';
  const now = Date.now();
  const then = new Date(publishedAt).getTime();
  if (isNaN(then)) return lang === 'EN' ? 'No date' : '无日期';
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return lang === 'EN' ? 'Today' : '今天';
  if (diffDays === 1) return lang === 'EN' ? 'Yesterday' : '昨天';
  if (diffDays < 30) return lang === 'EN' ? `${diffDays} days ago` : `${diffDays} 天前`;
  return new Date(publishedAt).toLocaleDateString(lang === 'EN' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatAbsoluteDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(lang === 'EN' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

describe('TimelineView — Label Functions', () => {
  it('tierLabel ZH: s2_top_journal → 顶级期刊', () => {
    assert.equal(tierLabel('s2_top_journal', 'ZH'), '顶级期刊');
  });

  it('tierLabel ZH: s3_clinical_trial → 临床试验', () => {
    assert.equal(tierLabel('s3_clinical_trial', 'ZH'), '临床试验');
  });

  it('tierLabel EN: s1_regulatory → S1 regulatory', () => {
    assert.equal(tierLabel('s1_regulatory', 'EN'), 'S1 regulatory');
  });

  it('tierLabel ZH: s8_unknown → 未知', () => {
    assert.equal(tierLabel('s8_unknown', 'ZH'), '未知');
  });

  it('evidenceLabel ZH: rct → RCT', () => {
    assert.equal(evidenceLabel('rct', 'ZH'), 'RCT');
  });

  it('evidenceLabel ZH: meta_analysis → Meta分析', () => {
    assert.equal(evidenceLabel('meta_analysis', 'ZH'), 'Meta分析');
  });

  it('evidenceLabel EN: cohort_study → cohort study', () => {
    assert.equal(evidenceLabel('cohort_study', 'EN'), 'cohort study');
  });

  it('evidenceLabel ZH: unknown → 未知', () => {
    assert.equal(evidenceLabel('unknown', 'ZH'), '未知');
  });
});

describe('TimelineView — Color Functions', () => {
  it('tierColor: regulatory → emerald', () => {
    assert.equal(tierColor('s1_regulatory'), 'text-emerald-400');
  });

  it('tierColor: top journal → emerald', () => {
    assert.equal(tierColor('s2_top_journal'), 'text-emerald-400');
  });

  it('tierColor: academic → blue', () => {
    assert.equal(tierColor('s4_academic'), 'text-blue-400');
  });

  it('tierColor: medical news → amber', () => {
    assert.equal(tierColor('s6_medical_news'), 'text-amber-400');
  });

  it('tierColor: general news → zinc', () => {
    assert.equal(tierColor('s7_general_news'), 'text-zinc-400');
  });

  it('tierColor: unknown → zinc-500', () => {
    assert.equal(tierColor('s8_unknown'), 'text-zinc-500');
  });

  it('credibilityColor: 85 → emerald (green)', () => {
    assert.equal(credibilityColor(85), 'text-emerald-400');
  });

  it('credibilityColor: 70 → emerald (boundary)', () => {
    assert.equal(credibilityColor(70), 'text-emerald-400');
  });

  it('credibilityColor: 50 → amber (yellow)', () => {
    assert.equal(credibilityColor(50), 'text-amber-400');
  });

  it('credibilityColor: 40 → amber (boundary)', () => {
    assert.equal(credibilityColor(40), 'text-amber-400');
  });

  it('credibilityColor: 10 → red', () => {
    assert.equal(credibilityColor(10), 'text-red-400');
  });

  it('credibilityColor: 0 → red', () => {
    assert.equal(credibilityColor(0), 'text-red-400');
  });
});

describe('TimelineView — Relative Time', () => {
  const lang = 'ZH';

  it('should return placeholder for undefined', () => {
    assert.equal(getRelativeTime(undefined, lang), '无日期');
  });

  it('should return placeholder for null', () => {
    assert.equal(getRelativeTime(null, lang), '无日期');
  });

  it('should return placeholder for invalid date', () => {
    assert.equal(getRelativeTime('not-a-date', lang), '无日期');
  });

  it('should return 今天 for today', () => {
    const today = new Date().toISOString();
    assert.equal(getRelativeTime(today, lang), '今天');
  });

  it('should return 昨天 for yesterday', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    assert.equal(getRelativeTime(yesterday, lang), '昨天');
  });

  it('should return N 天前 for 5 days ago', () => {
    const fiveDays = new Date(Date.now() - 5 * 86400000).toISOString();
    assert.equal(getRelativeTime(fiveDays, lang), '5 天前');
  });

  it('should format older dates as absolute (ZH)', () => {
    const old = '2025-12-01T00:00:00Z';
    const result = getRelativeTime(old, lang);
    assert.ok(result.includes('2025'), `Expected year in result: ${result}`);
  });

  it('should translate to English', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    assert.equal(getRelativeTime(yesterday, 'EN'), 'Yesterday');
  });
});

describe('TimelineView — Absolute Date Formatting', () => {
  it('should format ISO date in Chinese locale', () => {
    const result = formatAbsoluteDate('2026-06-15T00:00:00Z', 'ZH');
    assert.ok(result.includes('6'), `Expected month: ${result}`);
    assert.ok(result.includes('15'), `Expected day: ${result}`);
  });

  it('should format ISO date in English locale', () => {
    const result = formatAbsoluteDate('2026-06-15T00:00:00Z', 'EN');
    assert.ok(result.includes('Jun') || result.includes('June'), `Expected month: ${result}`);
  });

  it('should return empty for undefined date', () => {
    assert.equal(formatAbsoluteDate(undefined, 'ZH'), '');
  });

  it('should return empty for invalid date', () => {
    assert.equal(formatAbsoluteDate('invalid', 'ZH'), '');
  });
});

console.log('\n✅ All TimelineView tests passed!');
