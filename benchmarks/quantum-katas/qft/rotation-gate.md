---
{
  "id": "qft/rotation-gate",
  "title": "QFTRotationGate",
  "source": "Microsoft Quantum Katas / qft__rotation_gate",
  "difficulty": "fixed",
  "available_gates":
    [
      "H(target)",
      "X(target)",
      "Z(target)",
      "P(angle, target)",
      "ControlledPhase(angle, control, target)",
      "SWAP(target1, target2)",
    ],
  "allowed_commands": ["qni add"],
  "checks":
    {
      "tolerance": 1e-09,
      "items":
        [
          {
            "type": "unitary",
            "reference_circuit": { "qubits": 1, "cols": [["P(pi/4)"]] },
          },
        ],
    },
}
---

固定値: n=1、k=3（角度 π/4）。

任意の入力 α|0>+β|1> を α|0>+β exp(iπ/4)|1> に変換してください。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。行列全体を厳密比較し、全体位相の違いも不合格とします。
