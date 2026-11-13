import { readFileSync } from 'node:fs';

export function renderClickChecklist() {
  const rows = readFileSync('docs/readable/CLICK_MATRIX.md', 'utf8')
    .split('\n')
    .filter((line) => /^\| CLICK-\d{3} \|/.test(line))
    .map((line) =>
      line
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const ids = new Set<string>();
  for (const [id] of rows) {
    if (ids.has(id)) throw Error(`Duplicate manual-checklist ID: ${id}`);
    ids.add(id);
  }
  if (!rows.length) throw Error('Click matrix contains no interactions.');
  return (
    '# Click tree — manual checklist\n\n<!-- GENERATED from docs/readable/CLICK_MATRIX.md by scripts/click-checklist.ts. Do not hand-edit. Run npm run docs:generate. -->\n\n' +
    `${rows.length} interaction groups from the maintained [click matrix](../readable/CLICK_MATRIX.md). This is a scenario inventory, not a scan of every DOM control or evidence that a scenario passed. See the [manual workflow](../readable/MANUAL_TESTING_WORKFLOW.md) for exact click sequences and the [dated run record](../readable/MANUAL_TEST_RESULTS.md) for executed scope.\n\n` +
    'Copy this checklist into a run record; use PASS, FAIL, BLOCKED, NOT RUN, or NOT IMPLEMENTED. A checked group requires all named actions and applicable acceptance states; partial execution must list the substeps actually checked. Provider/paid/send scenarios require separate fixtures and authorization. CLI rows are not browser clicks.\n\n' +
    rows
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((cells) => {
        if (![5, 6].includes(cells.length)) throw Error(`Invalid click row: ${cells[0]}`);
        const [id, control, expected] = cells;
        const [states, feature, evidence] =
          cells.length === 6
            ? cells.slice(3)
            : ['See acceptance in the expected result and linked workflow.', ...cells.slice(3)];
        return `- [ ] **${id} — ${control}**\n  - Expected: ${expected}\n  - Acceptance states / existing evidence: ${states}\n  - Links: ${feature}; baseline: ${evidence}\n`;
      })
      .join('\n')
  );
}
