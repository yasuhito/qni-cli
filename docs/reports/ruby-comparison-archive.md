# Ruby 比較アーカイブ

生成日時: 2026-06-29T21:40:13.132Z

source commit: 0e7990c25a1a3538ea6d3f9cc33fd4b1a5818e38

status: passed

## Summary

- total: 14
- passed: 14
- failed: 0

## Runtimes

- Node.js: v26.2.0
- Ruby: ruby 3.4.8 (2025-12-17 revision 995b59f666) +PRISM [x86_64-linux]
- TypeScript: Version 6.0.3

## Cases

| name | mode | status | command |
| --- | --- | --- | --- |
| top-level-help | ruby-vs-typescript | passed | `qni --help` |
| add-h | ruby-vs-typescript | passed | `qni add H --qubit 0 --step 0` |
| gate-h | ruby-vs-typescript | passed | `qni gate --qubit 0 --step 0` |
| rm-controlled | ruby-vs-typescript | passed | `qni rm --qubit 1 --step 0` |
| state-set | ruby-vs-typescript | passed | `qni state set alpha\|0> + beta\|1>` |
| run-numeric-bell | ruby-vs-typescript | passed | `qni run` |
| run-symbolic-h | ruby-vs-typescript | passed | `qni run --symbolic` |
| expect-bell | ruby-vs-typescript | passed | `qni expect ZZ XX` |
| view-mixed | ruby-vs-typescript | passed | `qni view` |
| export-latex-source | ruby-vs-typescript | passed | `qni export --latex-source --light` |
| export-png | ruby-vs-typescript | passed | `qni export --png --light --output circuit.png` |
| bloch-png | ruby-vs-typescript | passed | `qni bloch --png --light --output bloch.png` |
| clear-circuit | ruby-vs-typescript | passed | `qni clear` |
| benchmark-run-state-flip | typescript-only | passed | `qni benchmark run <repo>/benchmarks/quantum-katas/basic-gates/state-flip.md <repo>/benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni` |

詳細は `docs/reports/ruby-comparison-archive.json` を参照してください。
