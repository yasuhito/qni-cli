---
{
  "id": "qft/single-qubit",
  "title": "QFTSingleQubit",
  "source": "Microsoft Quantum Katas / qft__single_qubit",
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
            "reference_circuit": { "qubits": 1, "cols": [["H"]] },
          },
        ],
    },
}
---

固定値: n=1。

任意の入力 x0|0>+x1|1> を ((x0+x1)|0>+(x0-x1)|1>)/sqrt(2) に変換してください。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。行列全体を厳密比較し、全体位相の違いも不合格とします。
