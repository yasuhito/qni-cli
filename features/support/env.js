const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { After, Before, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30_000);

Before(function () {
  this.scenarioDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-'));
});

After(function () {
  for (const tempDir of this.tempDirs || []) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  if (this.scenarioDir) {
    fs.rmSync(this.scenarioDir, { recursive: true, force: true });
  }
});
