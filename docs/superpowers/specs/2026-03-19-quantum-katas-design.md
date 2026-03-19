# Quantum Katas Validation Design

## Summary

Use the archived `QuantumKatas` repository as a read-only source of exercises and expected behavior, and use those exercises to harden `qni-cli` into a practical tool.

The workflow is:

1. Pick the first numbered task from the first kata.
2. Express the task's solution as `qni-cli` commands.
3. Reproduce the original task's intent as `qni-cli`-side tests without using Q#.
4. If the task cannot be expressed naturally or verified rigorously enough, add the missing `qni-cli` capability.
5. Keep the reproduced task as a regression test.

The primary goal is not kata completion by itself. The primary goal is to use the katas as a disciplined stream of realistic requirements that improve `qni-cli`.

## Context

- Repository under development: `qni-cli`
- External read-only source: `../oss/QuantumKatas`
- `QuantumKatas` is archived and should be treated as a fixed input, not as an actively evolving dependency.
- `qni-cli` development is feature-driven.
  New behavior must be specified in `features/*.feature` before implementation.

## Goals

- Validate, task by task, whether `qni-cli` can express solutions to Quantum Katas problems.
- Reproduce the intent of the original kata tests on the `qni-cli` side without using Q#.
- Add missing `qni-cli` functionality only when real kata-driven gaps are found.
- Accumulate kata-derived regression coverage that protects practical workflows.

## Non-Goals

- Running the original Q# test harness.
- Keeping compatibility with Q# or reviving Q#-specific tooling.
- Solving all katas up front before building validation infrastructure.
- Adding heavy symbolic or external simulator dependencies before a concrete gap justifies them.

## Source of Truth

- Task descriptions come from `../oss/QuantumKatas/<Kata>/Tasks.qs`.
- Original validation intent comes from `../oss/QuantumKatas/<Kata>/Tests.qs`.
- `qni-cli` behavior remains specified by this repository's feature files.

When there is a difference between a kata's original implementation language and the desired `qni-cli` workflow, preserve the task's behavioral intent rather than its Q# surface syntax.

## Validation Strategy

Validation is split into two layers.

### Layer 1: CLI Expression Tests

These tests answer: "Can this task be expressed naturally with `qni-cli`?"

- Add kata-oriented feature files under `features/`.
- Each scenario specifies:
  - task identifier such as `Task 1.1`
  - input state preparation
  - the `qni` command sequence used to express the solution
  - the expected observable result
- These scenarios protect the user-facing workflow of the CLI.

### Layer 2: Behavioral Equivalence Tests

These tests answer: "Does the `qni-cli` expression reproduce the kata's intended quantum behavior?"

- Start with the lightest sufficient approach.
- Prefer `qni run` and `qni expect` outputs when they are enough.
- Add helper test code when a single state-vector snapshot is not rigorous enough.
- Introduce external tooling such as Python or Qiskit only when simpler verification is insufficient.
- Introduce symbolic math support only when concrete tasks require symbolic comparison that numeric checks cannot cover well.

This keeps the default path simple while still allowing deeper verification for harder tasks.

## Verification Levels

Each task should use the smallest verification level that is technically sufficient.

### Level A: Direct output comparison

Use `qni run` or `qni expect` when:

- one or a few representative input states are enough
- the task does not hinge on subtle phase distinctions
- a direct final-state comparison is strong enough

### Level B: Parameter or input sweep

Use helper tests around `qni-cli` when:

- the task depends on a parameter such as an angle
- the task must hold across multiple input states
- one example would be too weak to catch incorrect implementations

### Level C: Relative-phase or stronger equivalence checks

Use stronger helper verification when:

- the original kata test uses controlled application to expose global phase issues
- simple final-state comparison can miss a wrong but observationally similar implementation
- the practical correctness bar requires more than one snapshot

## Kata Execution Order

Run the katas incrementally, starting from the earliest numbered tasks in the earliest kata.

The first implementation cycle targets `BasicGates`, starting with:

- `Task 1.1`
- `Task 1.2`
- `Task 1.3`

These tasks are a good first slice because they map cleanly onto the current gate set and can likely be verified with direct state-vector checks.

After that:

- extend to `Task 1.4` and `Task 1.6` with angle sweeps
- handle `Task 1.7` with stronger phase-sensitive verification
- continue into Bell-state tasks and Part II
- add CLI features only when the next task exposes a real gap

## First Implementation Slice

The first slice should produce one kata-oriented regression path end to end.

### Step 1: Add kata feature coverage

Add a new feature file for the first kata, likely:

- `features/katas_basic_gates.feature`

Initial scenarios cover `Task 1.1` through `Task 1.3`.

Each scenario should specify:

- how the starting state is prepared
- which `qni add ...` commands represent the solution
- which `qni run` or `qni expect` output demonstrates correctness

### Step 2: Add any missing test step definitions

Extend Cucumber support only as needed for kata-style scenarios.

Examples:

- state preparation helpers for named basis and superposition states
- numeric comparison helpers for state vectors
- repeated command execution helpers for task scripts

### Step 3: Run against the current CLI

Try the initial task set without changing `qni-cli` behavior first.

If the tasks pass with the existing CLI, keep the implementation unchanged and just retain the new regression coverage.

### Step 4: Add missing capabilities only when blocked

If a task cannot be represented or verified well enough:

- add a feature that describes the missing behavior
- implement the minimum necessary capability
- rerun the kata-derived scenarios

## Capability-Gap Decision Rule

Classify a failure before changing the product.

### Product gap

Treat it as a `qni-cli` feature gap if:

- the task cannot be expressed naturally as CLI commands
- the circuit model lacks an operation needed by the task
- the current interface makes realistic task expression too awkward or error-prone

### Verification gap

Treat it as a validation gap if:

- the task can be expressed, but correctness cannot be established confidently enough
- stronger comparisons or broader sweeps are needed
- the missing piece belongs in tests rather than in the CLI surface area

### No gap

If the task is already expressible and verifiable, add only the regression coverage.

## Dependency Policy

Default to existing `qni-cli` outputs and lightweight local test code.

Dependency escalation order:

1. `qni run`
2. `qni expect`
3. Lightweight helper test code in this repository
4. Python-based helpers if necessary
5. Qiskit or symbolic libraries only when a specific task justifies them

This order prevents premature infrastructure growth.

## Repository Integration Rules

- Do not edit `../oss/QuantumKatas`; treat it as read-only reference data.
- New `qni-cli` behavior must start with a new or updated `features/*.feature` file.
- Kata-derived coverage should live in this repository and run as part of this repository's test workflow.
- Existing unrelated worktree changes must not be reverted as part of kata integration.

## Success Criteria

The approach is working if:

- each accepted kata task becomes a stable regression case in `qni-cli`
- new CLI capabilities are added only in response to demonstrated task pressure
- harder tasks increase validation strength only when needed
- the resulting CLI becomes more useful for realistic circuit-authoring and verification work

## Immediate Next Step

Create the first kata-oriented feature file for `BasicGates` `Task 1.1` through `Task 1.3`, then evaluate whether the current CLI and existing step definitions are already sufficient.
