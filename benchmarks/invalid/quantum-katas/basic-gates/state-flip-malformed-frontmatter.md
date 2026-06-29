---
id: basic-gates/state-flip-malformed-frontmatter
title: "StateFlipMalformedFrontmatter
source: test fixture
difficulty: smoke
allowed_commands:
  - qni add
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

YAML として壊れている不正な課題ファイルです。
