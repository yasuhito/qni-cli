---
id: basic-gates/state-flip-missing-allowed-commands
title: StateFlipMissingAllowedCommands
source: test fixture
difficulty: smoke
checks:
  tolerance: 1e-9
  items:
    - type: run
      expected:
        - basis: "|1>"
          amplitude:
            real: 1
            imaginary: 0
---

`allowed_commands` が欠けている不正な課題ファイルです。
