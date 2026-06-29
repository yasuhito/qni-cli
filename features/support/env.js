const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { After, Before, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30_000);

Before(function ({ pickle }) {
  if (skipRubyFallbackScenario(pickle.name)) {
    return 'skipped';
  }

  this.scenarioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-'));
});

function skipRubyFallbackScenario(name) {
  return process.env.QNI_SKIP_RUBY_FALLBACK_SCENARIOS === '1' && rubyFallbackScenario(name);
}

function rubyFallbackScenario(name) {
  return name.includes('QNI_USE_RUBY=1') || name.includes('QNI_USE_RUBY の強制指定') || name.includes('Node dispatcher は Ruby 実装');
}

After(function () {
  for (const tempDir of this.tempDirs || []) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (this.scenarioDir) {
    fs.rmSync(this.scenarioDir, { recursive: true, force: true });
  }
});
