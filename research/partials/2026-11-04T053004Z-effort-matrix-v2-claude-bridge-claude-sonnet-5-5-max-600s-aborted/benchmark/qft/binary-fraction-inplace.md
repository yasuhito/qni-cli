---
{
  "id": "qft/binary-fraction-inplace",
  "title": "QFTBinaryFractionInplace",
  "source": "Microsoft Quantum Katas / qft__binary_fraction_inplace",
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
              {
                "qubits": 3,
                "cols": [["H", 1, 1], ["P(pi/2)", "•", 1], ["P(pi/4)", 1, "•"]],
              },
          },
        ],
    },
}
---

固定値: n=3、j=[q0,q1,q2]。

|j1j2j3> を (|0>+exp(2πi·0.j1j2j3)|1>)/sqrt(2) ⊗ |j2j3> に変換してください。重ね合わせにも線形に作用させます。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。行列全体を厳密比較し、全体位相の違いも不合格とします。
