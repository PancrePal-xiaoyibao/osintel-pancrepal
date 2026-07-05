import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// ---- Pure functions extracted from ExportButton ----

class ExportStateMachine {
  constructor() {
    this.state = 'idle';    // 'idle' | 'exporting' | 'done'
    this.timer = null;
  }

  triggerExport() {
    if (this.state === 'exporting') return false; // blocked
    this.state = 'exporting';
    return true;
  }

  markDone() {
    if (this.state !== 'exporting') return false;
    this.state = 'done';
    return true;
  }

  resetDone() {
    if (this.state !== 'done') return false;
    this.state = 'idle';
    return true;
  }

  canToggle() {
    return this.state === 'idle' || this.state === 'done';
  }
}

function getCSVFormatLabel(lang) {
  return lang === 'EN' ? 'CSV (spreadsheet)' : 'CSV（表格格式）';
}

function getJSONFormatLabel(lang) {
  return lang === 'EN' ? 'JSON (with scores)' : 'JSON（含评分详情）';
}

function exportFilename(format) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `osintel-export-${ts}.${format}`;
}

function validateExportFormat(format) {
  return format === 'json' || format === 'csv';
}

// ---- Tests ----

describe('ExportButton — State Machine', () => {
  let sm;

  beforeEach(() => {
    sm = new ExportStateMachine();
  });

  it('should start in idle state', () => {
    assert.equal(sm.state, 'idle');
  });

  it('should transition idle → exporting', () => {
    assert.equal(sm.triggerExport(), true);
    assert.equal(sm.state, 'exporting');
  });

  it('should block re-trigger while exporting', () => {
    sm.triggerExport();
    assert.equal(sm.triggerExport(), false);
    assert.equal(sm.state, 'exporting');
  });

  it('should transition exporting → done', () => {
    sm.triggerExport();
    assert.equal(sm.markDone(), true);
    assert.equal(sm.state, 'done');
  });

  it('should not mark done from idle', () => {
    assert.equal(sm.markDone(), false);
    assert.equal(sm.state, 'idle');
  });

  it('should transition done → idle (reset)', () => {
    sm.triggerExport();
    sm.markDone();
    assert.equal(sm.resetDone(), true);
    assert.equal(sm.state, 'idle');
  });

  it('should not reset from idle', () => {
    assert.equal(sm.resetDone(), false);
  });

  it('should not reset from exporting', () => {
    sm.triggerExport();
    assert.equal(sm.resetDone(), false);
  });

  it('should allow toggle in idle state', () => {
    assert.equal(sm.canToggle(), true);
  });

  it('should disallow toggle while exporting', () => {
    sm.triggerExport();
    assert.equal(sm.canToggle(), false);
  });

  it('should allow toggle after done', () => {
    sm.triggerExport();
    sm.markDone();
    assert.equal(sm.canToggle(), true);
  });
});

describe('ExportButton — Format Labels', () => {
  it('should return Chinese CSV label', () => {
    assert.equal(getCSVFormatLabel('ZH'), 'CSV（表格格式）');
  });

  it('should return English CSV label', () => {
    assert.equal(getCSVFormatLabel('EN'), 'CSV (spreadsheet)');
  });

  it('should return Chinese JSON label', () => {
    assert.equal(getJSONFormatLabel('ZH'), 'JSON（含评分详情）');
  });

  it('should return English JSON label', () => {
    assert.equal(getJSONFormatLabel('EN'), 'JSON (with scores)');
  });
});

describe('ExportButton — Filename Generation', () => {
  it('should generate JSON filename', () => {
    const name = exportFilename('json');
    assert.ok(name.startsWith('osintel-export-'), `Starts with prefix: ${name}`);
    assert.ok(name.endsWith('.json'), `Ends with .json: ${name}`);
  });

  it('should generate CSV filename', () => {
    const name = exportFilename('csv');
    assert.ok(name.endsWith('.csv'), `Ends with .csv: ${name}`);
  });

  it('should contain timestamp', () => {
    const name = exportFilename('json');
    const parts = name.replace('osintel-export-', '').replace('.json', '');
    assert.equal(parts.length, 19, `Timestamp length: ${parts.length}`);
    // Format: YYYY-MM-DDTHH-mm-ss
    assert.ok(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/.test(parts));
  });
});

describe('ExportButton — Format Validation', () => {
  it('should accept json', () => {
    assert.equal(validateExportFormat('json'), true);
  });

  it('should accept csv', () => {
    assert.equal(validateExportFormat('csv'), true);
  });

  it('should reject invalid formats', () => {
    assert.equal(validateExportFormat('pdf'), false);
    assert.equal(validateExportFormat(''), false);
    assert.equal(validateExportFormat('xml'), false);
    assert.equal(validateExportFormat(undefined), false);
  });
});

console.log('\n✅ All ExportButton tests passed!');
