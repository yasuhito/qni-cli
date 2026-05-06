# TypeScript Migration Design

## Status

Accepted for planning. This document defines the migration policy before any
TypeScript runtime implementation starts.

## Context

`qni-cli` is currently a Ruby CLI that edits, views, simulates, and exports
quantum circuits stored in `./circuit.json`. The public behavior is already
covered mainly by cucumber-js Markdown features under `features/**/*.feature.md`.
Those features run the repository CLI as a black-box command through
`bundle exec bin/qni`, which makes them suitable golden tests while the runtime
implementation changes behind the same command surface.

The migration must not be a big-bang rewrite. The codebase has several distinct
responsibilities:

- `bin/qni` is a thin Ruby entrypoint that loads `Qni::CLI.start(ARGV)`.
- `lib/qni/cli.rb` registers Thor commands and wires top-level command behavior.
- `lib/qni/cli/routing.rb` and `lib/qni/cli/bootstrap.rb` own help routing and
  startup behavior that must stay byte-for-byte compatible where features assert
  stdout, stderr, or exit status.
- `lib/qni/cli/*_command.rb` files execute command-specific workflows such as
  `add`, `rm`, `gate`, `state`, `variable`, `export`, and `bloch`.
- `lib/qni/circuit.rb` and `lib/qni/circuit/**` own the mutable circuit model,
  layout normalization, controlled gate placement, operation removal, and
  variable storage.
- `lib/qni/circuit_file.rb` and `lib/qni/state_file.rb` own `circuit.json`
  loading, writing, and domain-error translation.
- `lib/qni/simulator.rb`, `lib/qni/state_vector.rb`, gate classes, and
  `lib/qni/simulator/**` own numeric simulation and expectation values.
- `lib/qni/initial_state.rb` and `lib/qni/initial_state/**` own initial-state
  parsing, formatting, validation, and numeric resolution.
- `lib/qni/view/**` owns ASCII rendering and ASCII circuit parsing.
- `lib/qni/export/**`, `lib/qni/cli/export_command.rb`, and
  `lib/qni/cli/png_export_writer.rb` own LaTeX and PNG export workflows.
- `lib/qni/bloch_*.rb` and `lib/qni/cli/bloch_command.rb` own Bloch sampling,
  renderer invocation, and inline output.
- `lib/qni/symbolic_state_renderer.rb` owns the Ruby-to-Python boundary for
  symbolic rendering.
- `libexec/qni_symbolic_run.py`, `libexec/qni_bloch_render.py`, and
  `libexec/qni_circle_notation_render.py` are Python helpers that remain runtime
  dependencies until each caller is replaced or explicitly retained.

## Goals

- Make end-user installation easier by moving toward an npm-distributed CLI
  that fits environments where Node.js is more likely to be present than Ruby.
- Align implementation and BDD tooling around Node.js, TypeScript, and
  cucumber-js.
- Keep the public `qni` command surface stable during migration.
- Preserve stdout, stderr, exit status, `circuit.json` shape, and file output
  compatibility for every migrated command.
- Keep the Ruby implementation available as an oracle until the TypeScript path
  has equivalent coverage and release confidence.
- Leave room for a future standalone binary, without making it a first-phase
  requirement.

## Non-Goals

- Rewriting simulator, renderer, symbolic, export, and Bloch behavior in one
  change.
- Weakening or deleting existing cucumber-js features to make migration easier.
- Changing the `circuit.json` schema as part of the runtime-language migration.
- Removing Python helper dependencies before their callers have a separate
  migration plan.
- Publishing the first npm package in the same change as this design memo.

## Decision

Migrate by command and module, behind a stable `qni` entrypoint, using the Ruby
implementation as the oracle and the existing cucumber-js Markdown features as
black-box compatibility tests.

The first TypeScript implementation should introduce a Node-based dispatcher and
move only low-risk JSON-editing and read-only commands. Higher-risk commands
that depend on numerical simulation, symbolic math, rendering, LaTeX, PNG/APNG,
or terminal graphics should remain Ruby-backed until the lower layers have been
ported and cross-checked.

## Compatibility Contract

Every migrated command must preserve:

- command name, option names, option parsing behavior, and help output;
- stdout text, stderr text, trailing newlines, and exit status;
- `circuit.json` formatting, schema, auto-expand, auto-shrink, and persistence
  behavior;
- output file paths, parent-directory creation behavior, and file bytes where
  features assert image or LaTeX properties;
- unsupported-input error messages already covered by features.

The compatibility gate for a command migration is the existing cucumber-js
feature set for that command plus any missing regression feature added before
implementation. Feature files must not be weakened; if a feature is ambiguous,
split scenarios or add narrower coverage while preserving the one-`Then` rule.

The one-`Then` rule means a Cucumber scenario should assert one observable
outcome. A validation `And` after `Then` counts as another `Then`, so a case
that needs both exit-status and stdout coverage should be split into two
scenarios. This keeps failure output focused on the broken contract.

## Migration Strategy

### Phase 0: Harness and Packaging Skeleton

Introduce TypeScript tooling without changing the default behavior:

- add a TypeScript source tree such as `src/`;
- add `tsconfig.json` and a minimal build command;
- keep `bin/qni` behavior unchanged until the Node dispatcher is explicitly
  selected;
- add a Node executable entrypoint that can delegate all commands to Ruby;
- keep `bundle exec rake check` as the full validation gate.

Recommended tooling:

- TypeScript compiler: `tsc` for the first phase, because it is stable and
  enough for a CLI library build;
- package manager: npm, matching the existing `package.json` and cucumber-js
  setup;
- module format: CommonJS initially, matching the current `package.json`;
- ESM migration path: keep CommonJS in Phase 0, but document a later switch to
  ESM once the npm bin is stable, Node LTS support is explicit, and subprocess
  delegation tests cover both direct `node` execution and installed-package
  execution;
- npm bin name: `qni`;
- runtime target: current maintained Node LTS;
- test harness: existing cucumber-js Markdown features, with TypeScript unit
  tests added only for migrated modules where they reduce debugging cost.

The ESM switch should be its own migration issue. Its trigger is evidence that
the package is consumed as an npm CLI rather than as a CommonJS library. Its
compatibility strategy is to keep the `qni` bin contract stable and test the
same cucumber-js feature set against the installed package before changing the
module format in `package.json`.

Standalone binary packaging should be evaluated after npm distribution works.
Tools such as `pkg`, `nexe`, or a Node single executable application can be
considered later, but binary packaging must not block the staged runtime
migration.

### Phase 1: Ruby Oracle Dispatcher

Add a TypeScript dispatcher that owns command selection but delegates
non-migrated commands to Ruby. This gives the project one place to switch
commands from Ruby to TypeScript while retaining rollback.

The dispatcher must support per-command routing:

- TypeScript command implementation when marked migrated;
- Ruby subprocess fallback for all other commands;
- an environment override, for example `QNI_USE_RUBY=1`, to force Ruby for
  emergency rollback and release comparison.

During this phase, `bin/qni` may remain Ruby-first. The npm `bin` can point to
the TypeScript dispatcher once the dispatcher can delegate every command to Ruby
with compatible process behavior.

### Operational Documentation

Document `QNI_USE_RUBY=1` in the README or a troubleshooting guide when the
dispatcher lands. The guide must explain:

- purpose: force Ruby during emergency rollback or release-difference analysis;
- expected effect: every command bypasses TypeScript routing and executes the
  Ruby fallback path;
- usage: prefix a command such as `QNI_USE_RUBY=1 qni run` or set the variable
  in the shell before a comparison run;
- risk: the override can hide TypeScript regressions, so CI should fail if it is
  accidentally set in the TypeScript compatibility lane;
- removal: delete the guide only in the final Ruby fallback removal issue.

### Phase 2: Low-Risk Command Migration

Migrate commands that mostly manipulate or inspect `circuit.json`, with minimal
math and no external rendering:

1. `variable`
   - Reads and writes the `variables` object.
   - Has contained validation through angle-expression parsing.
   - Does not require simulator, renderer, or Python helper behavior.
2. `state show` and `state clear`
   - `show` has simple default behavior and formatting.
   - `clear` removes only the `initial_state` portion.
   - Keep `state set` Ruby-backed until initial-state parsing is ported.
3. `gate`
   - Reads one serialized cell and reports slot errors.
   - Good read-only compatibility check for the shared circuit loader.
4. `rm`
   - Exercises operation removal and layout normalization.
   - Move after the TypeScript circuit model has enough parity for removal.
5. `add` for fixed single-qubit gates
   - Move only `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, and `√X` first.
   - Keep angled gates, controlled gates, and `SWAP` Ruby-backed until their
     parser and placement rules are ported.

This order starts with the smallest blast radius and grows into shared model
behavior only after the loader, writer, and error formatting are proven.

### Phase 3: Circuit Model Completion

Port the shared circuit modules needed by all mutating commands:

- `CircuitFile` / JSON persistence;
- `Circuit` / `Step` / layout normalization;
- controlled gate representation;
- operation removal;
- symbolic variable storage;
- angle-expression parsing sufficient for `P`, `Rx`, `Ry`, and `Rz`;
- initial-state parsing and numeric resolution only when `state set`, `run`, or
  Bloch migration needs it.

Once these modules are TypeScript-backed, expand `add` to controlled gates,
`SWAP`, and angled gates. Keep Ruby oracle comparison for sample circuits that
exercise auto-expand, auto-shrink, controlled removal, and variable resolution.

### Phase 4: Numeric Runtime Migration

Move simulation after the circuit model is stable:

- port gate operators and `StateVector`;
- port `Simulator::StepOperation`;
- port `run` numeric output;
- port `expect`;
- then port `bloch` sampling, but keep image rendering delegated until the
  renderer boundary is decided.

`run --symbolic` should remain Python-helper-backed through the retained
symbolic boundary described below while numeric `run` moves to TypeScript.

### Symbolic Helper Strategy

Retain `libexec/qni_symbolic_run.py` as the symbolic math owner during the
TypeScript migration. TypeScript should own command routing, option validation
parity, `circuit.json` loading, process execution, and error translation for
`run --symbolic`, but it should invoke the Python/SymPy helper for symbolic
state construction, simplification, named-basis conversion, and text/LaTeX
rendering.

The current symbolic behavior covered by features includes:

- computational-basis ket output for 1-, 2-, and 3-qubit circuits;
- symbolic initial-state coefficients such as `alpha|0> + beta|1>`;
- exact SymPy simplification for angle expressions such as `Ry(2*alpha)` and
  concrete pi terms such as `Ry(π/2)`;
- pure-imaginary coefficient rendering, including the current `1.0i` form for
  the `Y` gate path;
- named-basis text output for `--basis x` and `--basis y` on 1-qubit circuits;
- Bell-basis text output for `--basis bell` on 2-qubit circuits;
- basis-specific unsupported-qubit error messages.

The TypeScript subprocess boundary should mirror the current Ruby boundary:

- read the normalized circuit object and pass it to the helper as JSON on
  `stdin`;
- pass `--format text` or `--format latex`;
- pass `--basis x`, `--basis y`, or `--basis bell` only when the user supplied a
  symbolic basis;
- match the current exposed CLI stdout contract: strip the helper's stdout
  payload before the command layer writes the final line to the terminal;
- surface helper stderr as the command error message when the helper exits
  non-zero;
- keep option and basis validation in the TypeScript layer where Ruby validates
  it today, including `--basis requires --symbolic` and the `x`/`y`/`bell`
  qubit-count checks;
- retry only for dependency/bootstrap failures that are equivalent to current
  Ruby behavior: skip a missing repository-local symbolic Python executable,
  retry with `uv` when system `python3` lacks SymPy, and do not mask a
  non-zero helper exit from an otherwise found repository-local runtime.

Replacing the helper with TypeScript should be a separate decision after the
numeric runtime is stable. A replacement would need a SymPy-equivalent story for
symbolic matrices, trigonometric simplification, exact square roots, pi parsing,
complex coefficients, LaTeX output, and deterministic string formatting. The
named-basis renderers are not just basis labels: `x`, `y`, and `bell` each
perform exact symbolic basis transforms before formatting. Reimplementing those
transforms in TypeScript risks subtle output drift, especially term ordering,
coefficient normalization, Unicode basis labels, and simplification choices such
as `sqrt(2)/2` vs equivalent algebraic forms.

Therefore existing symbolic features should continue through the retained Python
helper path while `run` numeric behavior moves to TypeScript. Add a follow-up
implementation issue for the TypeScript symbolic helper subprocess boundary
that covers every TypeScript caller that needs helper output, including
`run --symbolic` and symbolic state-vector export. Keep a later optional
replacement issue out of scope until packaging and symbolic-algebra library
constraints are known.

### Phase 5: Rendering and Export Migration

Move rendering only after core state behavior is TypeScript-backed:

- port `view` ASCII rendering and parser behavior;
- port `export --latex-source`;
- port PNG-writing wrappers only after LaTeX invocation and file behavior are
  covered by features;
- port `export --state-vector --png`, `export --circle-notation --png`, and
  `bloch` file/inline output last, because they combine simulation, helper
  invocation, image output, and environment-sensitive terminal behavior.

The Python helpers may either remain stable helper dependencies invoked from
TypeScript or be replaced by TypeScript/native implementations in separate
issues. That choice should be made per helper after npm packaging constraints
are clearer.

## Rollback Policy

Rollback must be available at three levels:

- per command: route the command back to Ruby in the dispatcher;
- per release: set an environment override to force Ruby execution;
- per branch: revert the command-migration commit without touching unrelated
  migrated commands.

A TypeScript command is not considered migrated until:

- its existing cucumber-js features pass through the TypeScript path;
- Ruby oracle comparison has been run for representative success and error
  cases;
- the command has a documented rollback switch in the dispatcher;
- `bundle exec rake check` passes fresh on the latest worktree.

If compatibility breaks after release, prefer routing only the affected command
back to Ruby instead of reverting the whole TypeScript scaffold.

## Ruby Oracle Policy

Ruby remains the reference implementation while either condition is true:

- any public command still delegates to Ruby;
- the latest released npm package has not passed one full release cycle with all
  commands TypeScript-backed and no Ruby fallback usage needed.

The oracle comparison should use temporary scenario directories and compare:

- process exit status;
- stdout and stderr;
- resulting `circuit.json`;
- output files when applicable.

For image outputs, compare stable properties already used by features, such as
PNG/APNG signatures, dimensions, transparency, frame metadata, or color presence,
instead of fragile byte equality unless byte equality is already guaranteed.

### CI/CD During Oracle Period

While Ruby remains the reference implementation, CI should run cucumber-js
features against both implementations for migrated commands:

- Ruby lane: current `bundle exec bin/qni` behavior remains the reference.
- TypeScript lane: npm `qni` entrypoint runs the migrated command and delegates
  non-migrated commands to Ruby.
- Comparison lane: selected oracle cases compare process exit status, stdout,
  stderr, resulting `circuit.json`, and stable output-file properties.

Run both lanes until Ruby no longer meets the oracle conditions above and the
npm package has completed one full release cycle without `Ruby fallback` usage.
Track CI ownership in the follow-up issues for the dispatcher and process
compatibility helpers.

### Ruby Bug Handling During Migration

If a bug is found in the Ruby implementation while it is the oracle:

- Triage whether the bug affects the compatibility contract. Bugs that change
  documented stdout, stderr, exit status, file output, or `circuit.json` shape
  are release-blocking for the affected command.
- Patch Ruby immediately when the bug affects current users or oracle accuracy.
  Port the same corrected behavior to TypeScript when that command is already
  TypeScript-backed or add it to the command's migration issue when it is not.
- For npm and Ruby-backed releases, publish or backport in lockstep when the bug
  affects both paths. If only TypeScript is affected, keep Ruby fallback
  available until the TypeScript fix ships.
- Add a regression feature before changing behavior, then run it through Ruby
  and TypeScript lanes so the fix is inherited by future migrations.
- Notify users in release notes when a user-visible result changes, especially
  if Ruby oracle output and TypeScript output are intentionally corrected
  together.

## Ruby Removal Criteria

Ruby runtime dependencies may be removed only after all of these are true:

- every public command has a TypeScript implementation or an explicit retained
  non-Ruby helper boundary;
- no shipped command path shells out to `bundle exec bin/qni`;
- cucumber-js Markdown features pass through the npm `qni` entrypoint;
- Ruby oracle comparison has been archived for the final migration issue;
- `bundle exec rake check` has either been replaced by an equivalent Node-based
  full check or intentionally retained only for historical tests during one
  final cleanup issue;
- README installation and development instructions no longer require Ruby for
  normal CLI use;
- at least one npm-distributed release has completed without requiring the Ruby
  fallback.

Do not delete Ruby files in the same issue that migrates the last high-risk
command. Use a separate cleanup issue so rollback remains simple.

## Follow-Up Issue Breakdown

実装課題は次の順序で作成する:

1. TypeScript ツール環境と Ruby 委譲の振り分け器
   - Linear タイトル候補: TypeScript ツール環境と Ruby 委譲の振り分け器を追加する
   - 受け入れ条件: npm bin が現行の全コマンドを Ruby へ委譲でき、既存の
     cucumber-js feature ファイルが通る。cucumber-js のステップ定義と CI レーンは
     `QNI_COMMAND` や `QNI_IMPL` のような明示的なセレクターで、Ruby
     エントリーポイント、TypeScript npm エントリーポイント、比較モードを選べる。
   - 見積もり: M, マイルストーン: M1, 精度: 概算。
   - リスク/依存関係: npm bin の委譲はプロセス動作を維持する必要がある。
2. 共有 TypeScript プロセス互換性補助機能
   - Linear タイトル候補: TypeScript のプロセス互換性補助機能を整備する
   - 受け入れ条件: サブプロセスの終了状態、stdout、stderr、作業ディレクトリ、
     環境変数の引き継ぎが Ruby 委譲の動作と一致する。TTY と非 TTY の実行は
     cucumber-js ハーネスと同じセレクターの意味を使い、ローカル CLI 実行と
     CI レーンで同等のエントリーポイントを通せる。
   - 見積もり: S, マイルストーン: M1, 精度: 概算。
   - リスク/依存関係: コマンド単位の各移行と CI レーンに必要。
3. TypeScript `circuit.json` 読み込み・書き込み処理と変数保存領域
   - Linear タイトル候補: TypeScript 版 `circuit.json` の読み込み・書き込み処理と変数保存領域を追加する
   - 受け入れ条件: Ruby fallback を残したまま
     `variable list/set/unset/clear` を TypeScript 経由で実行できる。
   - 見積もり: M, マイルストーン: M2, 精度: 概算。
   - リスク/依存関係: JSON 整形と変数検証は Ruby と一致する必要がある。
4. `state show` と `state clear` の移行
   - Linear タイトル候補: `state show` と `state clear` を TypeScript に移行する
   - 受け入れ条件: 既定状態の表示と状態削除が既存 feature ファイルと一致する。
     `state set` は Ruby 経由のままにする。
   - 見積もり: S, マイルストーン: M2, 精度: 概算。
   - リスク/依存関係: 共有読み込み・書き込み処理が先に安定している必要がある。
5. `gate` の移行
   - Linear タイトル候補: `gate` を TypeScript に移行する
   - 受け入れ条件: スロット読み取りとスロットエラーメッセージが既存 feature ファイルと一致する。
   - 見積もり: S, マイルストーン: M2, 精度: 概算。
   - リスク/依存関係: スロットエラー文言は互換性を保つ必要がある。
6. `rm` の移行
   - Linear タイトル候補: `rm` を TypeScript に移行する
   - 受け入れ条件: 操作削除、制御付き操作削除、`SWAP` 削除、自動縮小の動作が
     既存 feature ファイルと一致する。
   - 見積もり: M, マイルストーン: M3, 精度: 概算。
   - リスク/依存関係: レイアウト正規化と操作削除の同等性。
7. 固定ゲートの `add` 移行
   - Linear タイトル候補: 固定ゲートの `add` を TypeScript に移行する
   - 受け入れ条件: 固定の 1 量子ビットゲート追加が既存 feature ファイルと一致する。
     角度付き、制御付き、`SWAP` の各種別は Ruby への委譲を続ける。
   - 見積もり: M, マイルストーン: M3, 精度: 概算。
   - リスク/依存関係: 混在ルーティングで 1 つのコマンドのヘルプ動作を分割しない。
8. 制御ゲート、`SWAP`、角度付きゲートの TypeScript 回路モデル完成
   - Linear タイトル候補: 制御ゲート / `SWAP` / 角度付きゲートの回路モデルを TypeScript 化する
   - 受け入れ条件: すべての `add` feature ファイルが TypeScript 経由で通る。
   - 見積もり: L, マイルストーン: M4, 精度: 概算。
   - リスク/依存関係: 角度解析、制御ゲート配置、`SWAP` の意味。
9. 数値 `run` と `expect` の移行
   - Linear タイトル候補: 数値 `run` と `expect` を TypeScript に移行する
   - 受け入れ条件: 状態ベクトル CSV と期待値が Ruby oracle サンプルおよび
     cucumber-js feature ファイルと一致する。
   - 見積もり: L, マイルストーン: M5, 精度: 概算。
   - リスク/依存関係: 状態ベクトル計算と複素数整形の同等性。
10. 維持する記号計算補助プログラムのサブプロセス境界実装
    - Linear タイトル候補: TypeScript から記号計算補助プログラムを呼び出す境界を実装する
    - 受け入れ条件: `run --symbolic`, `--basis x`, `--basis y`, `--basis bell`,
      記号角度の簡約、LaTeX 状態ベクトル出力、検証/エラー動作が TypeScript
      コマンド経路で Ruby/Python oracle と一致する。Ruby が現在補助プログラム呼び出し前に
      検証している場合は、TypeScript 側の検証も呼び出し前に行う。
    - 見積もり: M, マイルストーン: M5, 精度: 概算。
    - リスク/依存関係: SymPy 実行環境の発見、サブプロセス stderr の対応付け、
      名前付き基底の整形、厳密な文字列互換性。
11. `view` の移行
    - Linear タイトル候補: `view` を TypeScript に移行する
    - 受け入れ条件: ASCII 出力、色の動作、パーサー対応シナリオが現行 feature ファイルと一致する。
    - 見積もり: M, マイルストーン: M6, 精度: 概算。
    - リスク/依存関係: 端末スタイル検出とパーサー互換性。
12. `export` と Bloch 処理の移行
    - Linear タイトル候補: `export` と Bloch 処理を TypeScript に移行する
    - 受け入れ条件: LaTeX、PNG/APNG、インライン出力、補助プログラムのエラー動作が
      現行 feature ファイルと一致する。または意図的に、より狭い課題へ分割されている。
    - 見積もり: L, マイルストーン: M7, 精度: 概算。
    - リスク/依存関係: 外部ツール、Python 補助プログラム、画像、端末入出力。
13. `QNI_USE_RUBY` 運用ドキュメントの更新
    - Linear タイトル候補: `QNI_USE_RUBY` の運用ドキュメントを追加する
    - 受け入れ条件: README またはトラブルシューティングガイドに、目的、使い方、
      期待される効果、リスク、上書き設定の整理条件が含まれている。
    - 担当: 振り分け器課題の移行実装者。
    - 見積もり: S, マイルストーン: M1, 精度: 概算。
    - リスク/依存関係: 役に立つためには振り分け器と同時に取り込む必要がある。
14. ESM 移行判断課題の追加
    - Linear タイトル候補: ESM 移行判断課題を追加する
    - 受け入れ条件: `package.json` を CommonJS から切り替える前に、発動条件、
      互換性戦略、テスト方針が記録されている。
    - 見積もり: S, マイルストーン: M2 後, 精度: 概算。
    - リスク/依存関係: npm パッケージの利用傾向が分かっている必要がある。
15. 性能比較の仕組み追加
    - Linear タイトル候補: Ruby / TypeScript 性能比較の仕組みを追加する
    - 受け入れ条件: 代表的な大規模回路を Ruby と TypeScript の両方で実行でき、
      経過時間と最大メモリー使用量の結果が成果物として保存される。
    - 見積もり: M, マイルストーン: M5 前, 精度: 概算。
    - リスク/依存関係: 中核コマンドで安定した TypeScript 実行が必要。
16. Ruby fallback と Ruby 実行時依存の削除
    - Linear タイトル候補: Ruby fallback と Ruby 実行時依存を削除する
    - 受け入れ条件: 上記の Ruby 削除条件を満たし、npm エントリーポイントが
      文書化された既定のユーザー経路になっている。
    - 見積もり: M, マイルストーン: 最終, 精度: 概算。
    - リスク/依存関係: すべてのコマンド移行と、fallback 利用なしの npm リリース
      1 サイクルが完了するまで着手できない。

マイルストーンは相対的な移行区分であり、日付の約束ではない。Linear で各課題を
開くときに再見積もりする。この文書は順序と相対的な大きさだけを記録する。

## Validation Plan

For each migration issue:

- start by adding or tightening a feature only when existing coverage does not
  pin the command behavior;
- run the affected cucumber-js feature files through both Ruby and TypeScript
  paths while Ruby is still available;
- run `git diff --check`;
- run `bundle exec rake check` fresh before commit, push, or handoff;
- run the PR feedback sweep before moving the Linear issue to human review.

### Performance Regression Testing

For command migrations that can process large circuits, add a performance check
next to the Ruby/TypeScript compatibility run:

- use representative large-circuit workloads from existing cucumber-js feature
  patterns or a dedicated harness when feature runtime would become too slow;
- run Ruby and TypeScript implementations on the same input, repeating each case
  at least five times after one warm-up run;
- record wall-clock time, peak memory, command, input size, commit SHA, and
  runtime versions in CSV or CI artifacts;
- treat TypeScript as requiring investigation if median wall-clock time or peak
  memory exceeds Ruby by more than 20% for a migrated command;
- do not block migration on a single noisy run, but file a follow-up issue when
  repeated measurements exceed the threshold.

For this design-only issue:

- verify the new document exists and covers the acceptance criteria;
- run `git diff --check`;
- run `bundle exec rake check` fresh before publishing.
