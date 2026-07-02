# qni-cli quantum-katas submissions

Approach: read each benchmark task and built direct gate sequences using only the allowed `qni add` command (or `qni add GlobalPhase` for the global-phase task). Standard single-qubit gates, CNOT constructions, SWAP, and exact H/T/T† decompositions were used for Toffoli and Fredkin to avoid relying on multi-control gate syntax.

Uncertainty: `qni` was not available on PATH in this workspace, so I could not run the benchmark runner here. The submissions were checked manually against the task specifications and for command-format constraints.

Created files:

- out/submissions/quantum-katas/basic-gates/basis-change.qni
- out/submissions/quantum-katas/basic-gates/bell-state-change-1.qni
- out/submissions/quantum-katas/basic-gates/bell-state-change-2.qni
- out/submissions/quantum-katas/basic-gates/bell-state-change-3.qni
- out/submissions/quantum-katas/basic-gates/fredkin-gate.qni
- out/submissions/quantum-katas/basic-gates/global-phase-change.qni
- out/submissions/quantum-katas/basic-gates/phase-change-pi-over-3.qni
- out/submissions/quantum-katas/basic-gates/phase-flip.qni
- out/submissions/quantum-katas/basic-gates/sign-flip.qni
- out/submissions/quantum-katas/basic-gates/state-flip.qni
- out/submissions/quantum-katas/basic-gates/toffoli-gate.qni
- out/submissions/quantum-katas/basic-gates/two-qubit-gate-1.qni
- out/submissions/quantum-katas/basic-gates/two-qubit-gate-2.qni
- out/submissions/quantum-katas/basic-gates/two-qubit-gate-3.qni
- out/submissions/quantum-katas/basic-gates/two-qubit-gate-4.qni
- out/submissions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni
- out/submissions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni
- out/submissions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni
- out/submissions/quantum-katas/superposition/bell-state.qni
- out/submissions/quantum-katas/superposition/ghz-state.qni
- out/submissions/quantum-katas/superposition/minus-state.qni
- out/submissions/quantum-katas/superposition/plus-state.qni
