# Phase Flip High-Level Y-Basis Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite Task 1.5 `phase_flip.feature` in the same high-level style as Tasks 1.1〜1.4, while adding Y-basis state display and `|+i>` / `|-i>` shorthand so the action of the `S` gate can be read naturally.

**Architecture:** Reuse the existing symbolic-state pipeline. Extend `InitialState` with Y-basis shorthand, extend the symbolic Python helper with a `y` basis renderer for 1-qubit circuits, add a dedicated feature step for Y-basis assertions, and then rewrite `phase_flip.feature` to use only high-level state/circuit DSL.

**Tech Stack:** Ruby, Thor, Cucumber, Minitest, Python, SymPy, existing `InitialState`, `SymbolicStateRenderer`, `qni_symbolic_run.py`, kata features

---

## File Structure

- Modify: `features/qni_state.feature`
  - Add acceptance for `qni state set "|+i>"` and `qni state set "|-i>"`.
- Modify: `features/qni_run.feature`
  - Add acceptance for `qni run --symbolic --basis y`.
- Modify: `features/qni_cli.feature`
  - Extend `qni run --help` expectations with `y` basis support.
- Modify: `features/katas/basic_gates/phase_flip.feature`
  - Rewrite Task 1.5 scenarios into the high-level DSL.
- Modify: `features/step_definitions/cli_steps.rb`
  - Add `Then |+i>, |-i> 基底での状態ベクトルは:` and any normalization helpers required.
- Modify: `lib/qni/initial_state.rb`
  - Parse and serialize `|+i>` / `|-i>`.
- Modify: `lib/qni/symbolic_state_renderer.rb`
  - Permit `basis: 'y'` under the same 1-qubit constraint as `x`.
- Modify: `lib/qni/cli/run_help.rb`
  - Document `--basis y`.
- Modify: `libexec/qni_symbolic_run.py`
  - Add Y-basis rendering and any helper normalization for `|+i>` / `|-i>`.
- Test: `test/qni/initial_state_test.rb`
  - Add unit coverage for `|+i>` / `|-i>`.
- Test: `test/qni/symbolic_state_renderer_test.rb`
  - Add unit coverage for `basis: 'y'` validation if needed.

### Task 1: Add failing acceptance coverage for Y-basis and shorthand

**Files:**
- Modify: `features/qni_state.feature`
- Modify: `features/qni_run.feature`
- Modify: `features/qni_cli.feature`

- [ ] **Step 1: Extend `qni state` acceptance with Y-basis shorthand**

Add scenarios to `features/qni_state.feature` for:
- `qni state set "|+i>"` stores a 1-qubit initial state and `qni state show` prints `|+i>`
- `qni state set "|-i>"` stores a 1-qubit initial state and `qni state show` prints `|-i>`

- [ ] **Step 2: Extend symbolic run acceptance with Y basis**

Add scenarios to `features/qni_run.feature` for:
- `qni run --symbolic --basis y` showing `|+i>` after applying `S` to `|+>`
- `qni run --symbolic --basis y` showing a general result such as `alpha|+i> + beta|-i>` if appropriate
- rejecting `--basis y` on 2-qubit circuits with a clear error, parallel to the existing X-basis restriction

- [ ] **Step 3: Extend CLI help expectations**

Update `features/qni_cli.feature` so `qni run --help` and related help text mention that `--basis` supports both `x` and `y` for symbolic 1-qubit output.

- [ ] **Step 4: Run focused cucumber and verify RED**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature features/qni_run.feature features/qni_cli.feature
```

Expected: FAIL because `|+i>`, `|-i>`, and `--basis y` are not implemented yet.

### Task 2: Add Y-basis shorthand to `InitialState`

**Files:**
- Modify: `lib/qni/initial_state.rb`
- Modify: `test/qni/initial_state_test.rb`

- [ ] **Step 1: Add failing unit tests**

Add tests for:
- parsing `|+i>`
- parsing `|-i>`
- serializing those states back to shorthand form if shorthand display is the chosen rule

- [ ] **Step 2: Run the unit test and confirm failure**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

Expected: FAIL because the new shorthand is not recognized.

- [ ] **Step 3: Implement shorthand parsing and display**

Extend `InitialState` so:
- `|+i>` means `(1/sqrt(2))|0> + (i/sqrt(2))|1>`
- `|-i>` means `(1/sqrt(2))|0> - (i/sqrt(2))|1>`
- `qni state show` prefers the shorthand when the stored state exactly matches one of these named states

- [ ] **Step 4: Re-run the unit test**

Make `test/qni/initial_state_test.rb` pass before moving on.

### Task 3: Add symbolic Y-basis rendering

**Files:**
- Modify: `libexec/qni_symbolic_run.py`
- Modify: `lib/qni/symbolic_state_renderer.rb`
- Modify: `test/qni/symbolic_state_renderer_test.rb`

- [ ] **Step 1: Add failing tests or focused acceptance**

Use `features/qni_run.feature` as the primary failing test. Add a unit test only if it clarifies Ruby-side validation.

- [ ] **Step 2: Implement Y-basis rendering in the Python helper**

Add a renderer analogous to the X-basis renderer.

Target definitions:

```text
|+i> = (|0> + i|1>) / sqrt(2)
|-i> = (|0> - i|1>) / sqrt(2)
```

For a computational-basis state `a|0> + b|1>`, derive Y-basis amplitudes and render them with the same symbolic simplification policy used for X basis.

- [ ] **Step 3: Permit `basis: 'y'` in Ruby**

Update `lib/qni/symbolic_state_renderer.rb` so `basis == 'y'` shares the same 1-qubit restriction and helper invocation path as `basis == 'x'`.

- [ ] **Step 4: Update help text**

Document `--basis y` in `lib/qni/cli/run_help.rb`.

- [ ] **Step 5: Run focused acceptance**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature features/qni_run.feature features/qni_cli.feature
```

Expected: GREEN for the new Y-basis behavior.

### Task 4: Add a high-level Y-basis feature step

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: Add the failing step usage in a kata feature**

Before implementing the step, rewrite one `phase_flip.feature` scenario to use:

```gherkin
Then |+i>, |-i> 基底での状態ベクトルは:
```

and confirm it fails as an undefined step or behavior mismatch.

- [ ] **Step 2: Implement the step**

Add a helper that runs:

```text
qni run --symbolic --basis y
```

and compares the output against normalized Y-basis notation. Reuse the current symbolic comparison helpers where possible; add only the minimum Y-basis normalization needed.

- [ ] **Step 3: Verify the new step**

Run the relevant kata feature slice and confirm the step behaves correctly.

### Task 5: Rewrite `phase_flip.feature` into the high-level DSL

**Files:**
- Modify: `features/katas/basic_gates/phase_flip.feature`

- [ ] **Step 1: Replace low-level scenarios with high-level ones**

Rewrite the feature around scenarios like:
- `S ゲートは |0> を変えない`
- `S ゲートは |1> に i を掛ける`
- `S ゲートは |+> を |+i> に変える`
- `S ゲートは α|0> + β|1> を α|0> + iβ|1> に変える`

Use:
- `Given 初期状態ベクトルは:`
- `When 次の回路を適用:`
- `Then 状態ベクトルは:`
- `Then |+i>, |-i> 基底での状態ベクトルは:`

- [ ] **Step 2: Remove the controlled verification scenario**

Delete the old low-level controlled scenario so the feature matches the educational, high-level style used by Tasks 1.1〜1.4.

- [ ] **Step 3: Run the kata feature in isolation**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/phase_flip.feature
```

Expected: GREEN with the new high-level wording and Y-basis step.

### Task 6: Full regression and cleanup

**Files:**
- Modify only as needed based on regressions

- [ ] **Step 1: Run full check**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected: all suites pass cleanly.

- [ ] **Step 2: Verify neighboring kata readability**

Spot-check:
- `features/katas/basic_gates/state_flip.feature`
- `features/katas/basic_gates/basis_change.feature`
- `features/katas/basic_gates/sign_flip.feature`
- `features/katas/basic_gates/phase_flip.feature`

Confirm Task 1.1〜1.5 now read as one consistent high-level progression.

- [ ] **Step 3: Commit with a focused message**

Commit once everything is green with a message such as:

```text
feat: add y-basis phase flip DSL
```
