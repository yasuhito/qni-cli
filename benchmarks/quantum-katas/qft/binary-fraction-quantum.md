---
{
  "id": "qft/binary-fraction-quantum",
  "title": "QFTBinaryFractionQuantum",
  "source": "Microsoft Quantum Katas / qft__binary_fraction_quantum",
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
                "qubits": 4,
                "cols":
                  [
                    ["P(pi/1)", "•", 1, 1],
                    ["P(pi/2)", 1, "•", 1],
                    ["P(pi/4)", 1, 1, "•"],
                  ],
              },
          },
        ],
    },
}
---

固定値: 桁数 n=3、全体4量子ビット、対象 q0、j=[q1,q2,q3]。

対象 q0 の |1> 成分に exp(2πi·0.j1j2j3) を掛け、桁レジスタ q1,q2,q3 を保存してください。桁レジスタが重ね合わせのときも同じ線形変換を適用します。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。行列全体を厳密比較し、全体位相の違いも不合格とします。
