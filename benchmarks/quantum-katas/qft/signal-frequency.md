---
{
  "id": "qft/signal-frequency",
  "title": "QFTSignalFrequency",
  "source": "Microsoft Quantum Katas / qft__signal_frequency",
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
                    ["Swap", 1, "Swap"],
                    [1, 1, "H"],
                    [1, "P(-pi/2)", "•"],
                    [1, "H", 1],
                    ["P(-pi/4)", 1, "•"],
                    ["P(-pi/2)", "•", 1],
                    ["H", 1, 1],
                  ],
              },
            "up_to_global_phase": true,
          },
        ],
    },
}
---

固定値: n=3、F=5（説明例。採点は全入力の逆QFT）。

逆QFTを実装してください。Σ(k=0..7) exp(2πi·Fk/8)|k>/sqrt(8) を |F> に変換します。固定説明例 F=5 では |101> が出力です。上流の測定による整数返却は移植せず、測定前の逆QFTを全入力で採点します。これは整数返却課題の部分移植であり、任意の入力にも逆QFTとして作用する、より強い条件です。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。全体位相は問いません。
