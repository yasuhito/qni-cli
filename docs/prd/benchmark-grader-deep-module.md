# 評価ランナーを深いモジュールにする PRD

## Problem Statement

qni-cli の評価ランナーは、量子回路AIエージェントや人間が作った `.qni` 提出物を決定論的に採点する中核機能である。現在は `qni benchmark run` と `qni benchmark run-all` の外部挙動に加えて、ベンチマーク課題の読み込み、YAML frontmatter の検証、提出物の解析、許可コマンド判定、検証条件の評価、スイート集計、JSON 出力、人間向け出力が同じ command module に集まっている。

この形は、MVP の実装速度には向いていたが、評価ランナーが Qni の中核になった今は浅い module になりつつある。採点の意味を変えたいのか、CLI 表示を変えたいのか、研究ログ保存のために結果を再利用したいのかが同じ場所に混ざるため、変更の locality が弱い。今後、外部ベンチマーク移植、研究試行の比較、採点結果の拡張、研究ログの追加観測項目へ進むと、AI エージェントが読むべき場所もレビューすべき範囲も広がりすぎる。

## Solution

評価ランナーを、CLI command から独立した深い module として整理する。最初の目的は、外部挙動を変えずに、採点処理の公開 interface を小さくすることである。

公開 interface は、単一のベンチマーク課題を採点する入口と、ベンチマークスイートを採点する入口を中心にする。呼び出し側は、Markdown frontmatter の読み込み、`.qni` 提出物の解析、許可コマンド判定、検証条件の評価、スイート集計の細部を知らずに採点できる。

`benchmark` command は薄い CLI adapter として、引数を読み、評価ランナー module を呼び、既存と同じ JSON 出力または人間向け出力を書く役割に寄せる。`research record` は、CLI 標準出力を再解析せず、同じ評価ランナー module の採点結果を使って `result.json` を保存する。

この PRD では、`qni benchmark run`、`qni benchmark run-all`、`--json` の形、終了コード、`qni research record` の `result.json` の意味を変えない。benchmark JSON と研究ログ JSON の schema 分離は、後続の別テーマとして扱う。

## User Stories

1. As a qni-cli maintainer, I want the evaluation runner logic to live behind a small module interface, so that I can change grading internals without reading a giant command module.
2. As a qni-cli maintainer, I want `qni benchmark run` behavior to remain unchanged, so that existing users and tests keep working during the refactor.
3. As a qni-cli maintainer, I want `qni benchmark run-all` behavior to remain unchanged, so that suite grading remains stable while internals move.
4. As a qni-cli maintainer, I want benchmark JSON output to remain compatible, so that research logs and automation do not need schema changes.
5. As a qni-cli maintainer, I want benchmark exit codes to remain compatible, so that scripts can continue to distinguish `passed`, `failed`, `disallowed`, and `error`.
6. As a Qni research-log user, I want `qni research record` to use the same evaluation runner module as benchmark commands, so that saved research trial results match CLI grading.
7. As a Qni research-log user, I want `result.json` to keep the same meaning during this refactor, so that existing research trial directories stay understandable.
8. As a benchmark task author, I want task loading and frontmatter validation to be localized, so that adding benchmark task fields later has one obvious place to start.
9. As a benchmark task author, I want `.qni` submission parsing and allowed-command checks to be localized, so that submission-format changes do not spread through CLI output code.
10. As a qni-cli maintainer, I want run-check and expect-check evaluation to be part of the evaluation runner module, so that grading behavior can be tested without coupling to CLI formatting.
11. As a qni-cli maintainer, I want suite discovery and summary aggregation to be part of the evaluation runner module, so that `benchmark run-all` and `research record` share one source of truth.
12. As a qni-cli maintainer, I want human-readable and JSON formatting to sit at the CLI adapter seam, so that output formatting is separate from grading meaning.
13. As an AI implementation agent, I want module names and interfaces to match the domain language, so that I can navigate from ベンチマーク課題, 提出物, 評価ランナー, 採点結果, and 研究試行 to the right code quickly.
14. As an AI implementation agent, I want each refactor slice to be externally verifiable, so that I can safely work in a fresh context without accidentally changing grading behavior.
15. As a reviewer, I want each slice to preserve the existing feature and TypeScript tests, so that review can focus on movement and module depth rather than behavior drift.
16. As a qni-cli maintainer, I want the command module to become thinner over time, so that future CLI help or output changes do not risk changing grading behavior.
17. As a qni-cli maintainer, I want the evaluation runner module to expose only high-leverage operations, so that callers do not depend on YAML parsing or check-evaluation implementation details.
18. As a future external benchmark migration implementer, I want a clear seam for grading benchmark suites, so that QuanBench, QCircuitBench, or Qiskit HumanEval-derived tasks can reuse the same evaluation runner.
19. As a future reporting implementer, I want suite grading results to be produced by a stable module interface, so that reports can consume grading results without invoking CLI text output.
20. As a qni-cli maintainer, I want this refactor to avoid research schema redesign, so that the change stays reviewable and does not mix architecture cleanup with product behavior changes.

## Implementation Decisions

- This is a behavior-preserving refactor. The first implementation pass must not change user-visible output, JSON payloads, exit codes, or research trial result semantics.
- The evaluation runner module will have a small public interface centered on grading one benchmark task and grading one benchmark suite.
- Callers should not need to know how Markdown frontmatter, `.qni` submissions, allowed commands, run checks, expect checks, or suite summaries are implemented.
- The existing benchmark result shape should be preserved initially. A separate internal domain shape can be introduced only if it is adapted back to the current external shape without changing behavior.
- `benchmark` remains the CLI responsibility for grading commands and formatting output.
- `research` remains the research-log responsibility for saving a research trial and should call the evaluation runner module directly.
- The initial refactor should not split benchmark JSON and research `result.json` schemas.
- The command adapter should become thinner incrementally, not through one large risky rewrite.
- Any newly introduced module names should use project domain language: evaluation runner, benchmark task, submission, grading result, benchmark suite, and research trial.
- If an internal helper is extracted but still has an interface as complex as its implementation, that extraction should be reconsidered. The goal is depth, not file count.

## Testing Decisions

- The highest-value regression tests are the existing CLI behavior tests for `qni benchmark run`, `qni benchmark run-all`, `--json`, and `qni research record`.
- Each slice should keep the full `npm run check` passing before merge.
- TypeScript tests should verify the public evaluation runner interface directly once it is available.
- Cucumber scenarios should continue to protect user-visible behavior, not internal file placement.
- JSON compatibility should be checked by existing tests that parse benchmark output and research `result.json`.
- Exit code compatibility should remain covered for `passed`, `failed`, `disallowed`, and `error`.
- Refactor tests should avoid asserting private helper file names or implementation details.
- New tests should be added only where they protect the new module seam or catch behavior that was previously implicit.

## Out of Scope

- Changing `.qni` submission format.
- Changing benchmark task Markdown or YAML frontmatter schema.
- Changing `qni benchmark run` human output.
- Changing `qni benchmark run-all` human output.
- Changing benchmark JSON output shape.
- Changing `qni research record` directory layout.
- Splitting benchmark JSON and research `result.json` schemas.
- Adding new benchmark tasks or external benchmark datasets.
- Adding AI model calls.
- Adding reporting, comparison, or GitHub Pages output.
- Introducing a full command I/O adapter seam across every CLI command.
- Rewriting all command modules.

## Further Notes

- This PRD came from the codebase-health review after completing the research trial logging MVP.
- The refactor should preserve the existing `npm run check` lane: TypeScript tests, Cucumber features, and npm package smoke.
- The deepest long-term target is not merely shorter files. The target is a small evaluation runner interface with grading behavior hidden behind it, improving leverage for benchmark, research, and future reporting callers.
