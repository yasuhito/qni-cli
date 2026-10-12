---
{
  "id": "qft/binary-fraction-classical",
  "title": "QFTBinaryFractionClassical",
  "source": "Microsoft Quantum Katas / qft__binary_fraction_classical",
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
            "reference_circuit":
              { "qubits": 1, "cols": [["P(pi/1)"], ["P(pi/4)"]] },
          },
        ],
    },
}
---

固定値: n=1、j=[1,0,1]（0.101₂=5/8、角度 5π/4）。

古典ビット列 j=[1,0,1] を固定し、任意の入力 α|0>+β|1> を α|0>+β exp(2πi·5/8)|1> に変換してください。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。行列全体を厳密比較し、全体位相の違いも不合格とします。
