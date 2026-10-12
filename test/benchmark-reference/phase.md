---
id: test/reference-identity-phase
title: ReferenceIdentity
available_gates: [X, Z]
allowed_commands: [qni add, qni state set]
checks:
  tolerance: 1e-9
  items:
    - type: unitary
      up_to_global_phase: true
      reference_circuit:
        qubits: 1
        cols: []
---

恒等変換を実装する。行列全体の共通位相だけは許容する。
