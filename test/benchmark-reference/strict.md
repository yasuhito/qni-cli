---
id: test/reference-identity
title: ReferenceIdentity
available_gates: [X, Z]
allowed_commands: [qni add, qni state set]
checks:
  tolerance: 1e-9
  items:
    - type: unitary
      reference_circuit:
        qubits: 1
        cols: []
---

恒等変換を実装する。全基底入力を比較し、位相も厳密に検証する。
