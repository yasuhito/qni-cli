# BellStateChange3 High-Level DSL Design

## Goal

Rewrite `features/katas/basic_gates/bell_state_change_3.feature` so it reads at the same high level as Task 1.8 and Task 1.9.

The feature should describe Bell-basis state changes directly instead of low-level `qni add ...` sequences and raw numeric state-vector output.

## Scope

- Reuse the existing Bell-basis DSL already introduced for BellStateChange1/2:
  - `Given 初期状態ベクトルは:`
  - `When 次の回路を適用:`
  - `Then Bell 基底での状態ベクトルは:`
- Do not add new CLI commands or new step definitions unless the existing Bell-basis support proves insufficient.
- Remove the controlled verification scenario from this feature, following the current high-level kata style.

## Representation

Task 1.10 changes `|Φ+>` into `|Ψ->`.

The most readable high-level phrasing is to describe the implemented circuit, not a hidden low-level kata trick:

- "X と Z を順に適用した回路は |Φ+> を |Ψ-> に変える"
- "X と Z を順に適用した回路は |Ψ-> を |Φ+> に変える"

This keeps the feature honest about the actual circuit while still reading at the level of Bell-state behavior.

## Scenarios

Use four scenarios, mirroring BellStateChange1/2:

1. `|Φ+> -> |Ψ->`
2. `|Ψ-> -> |Φ+>`
3. `0.6|Φ+> + 0.8|Ψ->` coefficient swap
4. `α|Φ+> + β|Ψ->` symbolic coefficient swap

## Circuit Form

Each scenario should show the same 2-qubit circuit:

```text
    ┌───┐┌───┐
q0: ┤ X ├┤ Z ├
    └───┘└───┘
q1: ───────────
```

This keeps the feature aligned with the actual implementation and consistent with the visual DSL used in the earlier tasks.

## Verification

- First, run the rewritten `bell_state_change_3.feature` alone.
- Then run BellStateChange1/2/3 together.
- Finally run full `bundle exec rake check`.

