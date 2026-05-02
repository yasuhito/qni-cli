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

`run --symbolic` should remain Ruby/Python-backed until there is a dedicated
plan for replacing or retaining `libexec/qni_symbolic_run.py`.

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

Create implementation issues in this order:

1. TypeScript tooling and Ruby-delegating dispatcher
   - Linear title candidate: TypeScript tooling と Ruby 委譲 dispatcher を追加する
   - Acceptance: npm bin can delegate all current commands to Ruby and existing
     cucumber-js features still pass. The cucumber-js step definitions and CI
     lane can select the Ruby entrypoint, TypeScript npm entrypoint, or
     comparison mode through an explicit selector such as `QNI_COMMAND` or
     `QNI_IMPL`.
   - Estimate: M, milestone: M1, precision: rough.
   - Risk/dependency: npm bin delegation must preserve process behavior.
2. Shared TypeScript process compatibility helpers
   - Linear title candidate: TypeScript process compatibility helper を整備する
   - Acceptance: subprocess exit status, stdout, stderr, working directory, and
     env passthrough match Ruby delegation behavior. TTY and non-TTY execution
     use the same selector semantics as the cucumber-js harness so local CLI
     runs and CI lanes exercise equivalent entrypoints.
   - Estimate: S, milestone: M1, precision: rough.
   - Risk/dependency: required by every command-level migration and CI lane.
3. TypeScript `circuit.json` loader/writer and variable store
   - Linear title candidate: TypeScript 版 `circuit.json` loader/writer と variable store を追加する
   - Acceptance: `variable list/set/unset/clear` can run through TypeScript
     with Ruby fallback still available.
   - Estimate: M, milestone: M2, precision: rough.
   - Risk/dependency: JSON formatting and variable validation must match Ruby.
4. Migrate `state show` and `state clear`
   - Linear title candidate: `state show` と `state clear` を TypeScript に移行する
   - Acceptance: default state display and state removal match existing
     features; `state set` remains Ruby-backed.
   - Estimate: S, milestone: M2, precision: rough.
   - Risk/dependency: shared loader/writer must already be stable.
5. Migrate `gate`
   - Linear title candidate: `gate` を TypeScript に移行する
   - Acceptance: slot reads and slot error messages match existing features.
   - Estimate: S, milestone: M2, precision: rough.
   - Risk/dependency: slot error text must remain compatible.
6. Migrate `rm`
   - Linear title candidate: `rm` を TypeScript に移行する
   - Acceptance: operation removal, controlled removal, SWAP removal, and
     auto-shrink behavior match existing features.
   - Estimate: M, milestone: M3, precision: rough.
   - Risk/dependency: layout normalization and operation removal parity.
7. Migrate fixed-gate `add`
   - Linear title candidate: 固定 gate の `add` を TypeScript に移行する
   - Acceptance: fixed single-qubit gate addition matches existing features;
     angled, controlled, and SWAP variants still delegate to Ruby.
   - Estimate: M, milestone: M3, precision: rough.
   - Risk/dependency: mixed routing must not split one command's help behavior.
8. Complete TypeScript circuit model for controlled, SWAP, and angled gates
   - Linear title candidate: controlled / SWAP / angled gate の circuit model を TypeScript 化する
   - Acceptance: all `add` features pass through TypeScript.
   - Estimate: L, milestone: M4, precision: rough.
   - Risk/dependency: angle parsing, controlled placement, and SWAP semantics.
9. Migrate numeric `run` and `expect`
   - Linear title candidate: numeric `run` と `expect` を TypeScript に移行する
   - Acceptance: state-vector CSV and expectation values match Ruby oracle
     samples and cucumber-js features.
   - Estimate: L, milestone: M5, precision: rough.
   - Risk/dependency: state-vector math and complex formatting parity.
10. Decide symbolic helper strategy
    - Linear title candidate: symbolic helper の移行または維持方針を決める
    - Acceptance: `run --symbolic` is either TypeScript-owned with a retained
      Python helper boundary or replaced by a new TypeScript symbolic plan.
    - Estimate: M, milestone: M5, precision: rough.
    - Risk/dependency: SymPy behavior and named-basis formatting.
11. Migrate `view`
    - Linear title candidate: `view` を TypeScript に移行する
    - Acceptance: ASCII output, color behavior, and parser-supported scenarios
      match current features.
    - Estimate: M, milestone: M6, precision: rough.
    - Risk/dependency: terminal style detection and parser compatibility.
12. Migrate export and Bloch workflows
    - Linear title candidate: export と Bloch workflows を TypeScript に移行する
    - Acceptance: LaTeX, PNG/APNG, inline output, and helper error behavior
      match current features or are intentionally split into narrower issues.
    - Estimate: L, milestone: M7, precision: rough.
    - Risk/dependency: external tools, Python helpers, images, and terminal IO.
13. Update operational documentation for `QNI_USE_RUBY`
    - Linear title candidate: `QNI_USE_RUBY` の運用ドキュメントを追加する
    - Acceptance: README or troubleshooting guide includes purpose, usage,
      expected effect, risks, and cleanup condition for the override.
    - Owner: migration implementer for the dispatcher issue.
    - Estimate: S, milestone: M1, precision: rough.
    - Risk/dependency: must land with the dispatcher to be useful.
14. Add ESM migration decision issue
    - Linear title candidate: ESM 移行判断 issue を追加する
    - Acceptance: triggers, compatibility strategy, and test approach are
      recorded before switching `package.json` away from CommonJS.
    - Estimate: S, milestone: after M2, precision: rough.
    - Risk/dependency: npm package consumption patterns must be known.
15. Add performance comparison harness
    - Linear title candidate: Ruby / TypeScript performance comparison harness を追加する
    - Acceptance: representative large circuits can be run against Ruby and
      TypeScript, with wall-clock and peak-memory results stored as artifacts.
    - Estimate: M, milestone: before M5, precision: rough.
    - Risk/dependency: needs stable TypeScript execution for core commands.
16. Remove Ruby fallback and Ruby runtime dependency
    - Linear title candidate: Ruby fallback と Ruby runtime dependency を削除する
    - Acceptance: Ruby removal criteria above are met and npm entrypoint is the
      default documented user path.
    - Estimate: M, milestone: final, precision: rough.
    - Risk/dependency: blocked by every command migration and one npm release
      cycle without fallback usage.

Milestones are relative migration slices, not calendar commitments. Re-estimate
each issue when opening it in Linear; this document records sequencing and
relative size only.

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
