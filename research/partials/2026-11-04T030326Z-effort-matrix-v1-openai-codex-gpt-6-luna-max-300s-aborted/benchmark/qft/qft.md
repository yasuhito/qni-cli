---
{
  "id": "qft/qft",
  "title": "QFTQft",
  "source": "Microsoft Quantum Katas / qft__qft",
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
                "cols":
                  [
                    ["H", 1, 1],
                    ["P(pi/2)", "•", 1],
                    ["P(pi/4)", 1, "•"],
                    [1, "H", 1],
                    [1, "P(pi/2)", "•"],
                    [1, 1, "H"],
                    ["Swap", 1, "Swap"],
                  ],
              },
          },
        ],
    },
}
---

固定値: n=3。

|j> を Σ(k=0..7) exp(2πi·jk/8)|k>/sqrt(8) に変換してください。指数の符号は正、出力のビット順反転は含めず、整数の通常の順序に戻します。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。行列全体を厳密比較し、全体位相の違いも不合格とします。
