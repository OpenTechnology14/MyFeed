import { describe, expect, it, vi, beforeEach } from 'vitest';

const { readFileSyncMock } = vi.hoisted(() => ({ readFileSyncMock: vi.fn() }));
vi.mock('node:fs', () => ({ readFileSync: readFileSyncMock }));

import { renderClickChecklist } from '../scripts/click-checklist';

describe('renderClickChecklist', () => {
  beforeEach(() => {
    readFileSyncMock.mockReset();
  });

  it('renders the real CLICK_MATRIX.md into a checklist with one entry per row', async () => {
    // Smoke test against the real, maintained matrix file (not mocked here)
    // to catch drift between the matrix table shape and the renderer.
    const realFs = await vi.importActual<typeof import('node:fs')>('node:fs');
    readFileSyncMock.mockImplementation((path: string, encoding: string) => {
      expect(encoding).toBe('utf8');
      return realFs.readFileSync(path, encoding as BufferEncoding);
    });
    const output = renderClickChecklist();
    expect(output).toContain('# Click tree — manual checklist');
    expect(output).toContain('GENERATED from docs/readable/CLICK_MATRIX.md');
    expect(output).toContain('- [ ] **CLICK-001');
  });

  it('builds one checklist item per matrix row, sorted by ID, with expected/acceptance/links', () => {
    readFileSyncMock.mockReturnValue(
      [
        '| ID | Control | Expected | Acceptance | Feature | Evidence |',
        '| --- | --- | --- | --- | --- | --- |',
        '| CLICK-002 | Second control | Does second thing | State B | FEAT-002 | B2 |',
        '| CLICK-001 | First control | Does first thing | State A | FEAT-001 | B1 |',
        'not a row',
      ].join('\n'),
    );
    const output = renderClickChecklist();
    const firstIdx = output.indexOf('CLICK-001');
    const secondIdx = output.indexOf('CLICK-002');
    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(firstIdx);
    expect(output).toContain('**CLICK-001 — First control**');
    expect(output).toContain('Expected: Does first thing');
    expect(output).toContain('Acceptance states / existing evidence: State A');
    expect(output).toContain('Links: FEAT-001; baseline: B1');
  });

  it('accepts the 5-column row shape with a default acceptance-states note', () => {
    readFileSyncMock.mockReturnValue(
      [
        '| ID | Control | Expected | Feature | Evidence |',
        '| --- | --- | --- | --- | --- |',
        '| CLICK-010 | Some control | Does a thing | FEAT-010 | B3 |',
      ].join('\n'),
    );
    const output = renderClickChecklist();
    expect(output).toContain(
      'Acceptance states / existing evidence: See acceptance in the expected result and linked workflow.',
    );
    expect(output).toContain('Links: FEAT-010; baseline: B3');
  });

  it('throws on a duplicate CLICK id so the generated checklist never silently drops a row', () => {
    readFileSyncMock.mockReturnValue(
      [
        '| ID | Control | Expected | Feature | Evidence |',
        '| --- | --- | --- | --- | --- |',
        '| CLICK-001 | A | A | FEAT-001 | B1 |',
        '| CLICK-001 | B | B | FEAT-002 | B2 |',
      ].join('\n'),
    );
    expect(() => renderClickChecklist()).toThrow('Duplicate manual-checklist ID: CLICK-001');
  });

  it('throws when the matrix has no interaction rows', () => {
    readFileSyncMock.mockReturnValue('| ID | Control |\n| --- | --- |\n');
    expect(() => renderClickChecklist()).toThrow('Click matrix contains no interactions.');
  });

  it('throws on a malformed row with an unexpected column count', () => {
    readFileSyncMock.mockReturnValue(
      ['| ID | Control | Expected |', '| --- | --- | --- |', '| CLICK-001 | A | B |'].join('\n'),
    );
    expect(() => renderClickChecklist()).toThrow('Invalid click row: CLICK-001');
  });
});
