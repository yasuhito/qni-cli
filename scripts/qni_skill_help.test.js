const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { parseHelpEntries } = require('./qni_skill_help');

const HELP_WITH_SHORT_AND_LONG_NAMES = `Usage:
  qni state set VALUE
  qni state show

Overview:
  Supported gates: S, S†, P, P2.

Options:
  [--caption=TEXT]
  [--caption-tex]
`;

const HELP_WITH_LONG_NAMES_ONLY = `Usage:
  qni state show

Overview:
  Supported gates: S†, P2.

Options:
  [--caption-tex]
`;

describe('qni skill help entry parser', () => {
  it('keeps coexisting short and long names as separate entries', () => {
    const entries = parseHelpEntries(HELP_WITH_SHORT_AND_LONG_NAMES);

    assert.ok(entries.commands.has('qni state set'));
    assert.ok(entries.commands.has('qni state show'));
    assert.ok(entries.gates.has('S'));
    assert.ok(entries.gates.has('S†'));
    assert.ok(entries.gates.has('P'));
    assert.ok(entries.gates.has('P2'));
    assert.ok(entries.options.has('--caption'));
    assert.ok(entries.options.has('--caption-tex'));
  });

  it('rejects removed short names when longer names remain', () => {
    const entries = parseHelpEntries(HELP_WITH_LONG_NAMES_ONLY);

    assert.ok(!entries.commands.has('qni state'));
    assert.ok(!entries.commands.has('qni state set'));
    assert.ok(!entries.gates.has('S'));
    assert.ok(!entries.gates.has('P'));
    assert.ok(!entries.options.has('--caption'));
  });
});
