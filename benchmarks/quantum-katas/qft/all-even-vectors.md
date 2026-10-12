---
{
  "id": "qft/all-even-vectors",
  "title": "QFTAllEvenVectors",
  "source": "Microsoft Quantum Katas / qft__all_even_vectors",
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
            "type": "run",
            "expected":
              [
                {
                  "basis": "|000>",
                  "amplitude": { "real": 0.5, "imaginary": 0.0 },
                },
                {
                  "basis": "|010>",
                  "amplitude": { "real": 0.5, "imaginary": 0.0 },
                },
                {
                  "basis": "|100>",
                  "amplitude": { "real": 0.5, "imaginary": 0.0 },
                },
                {
                  "basis": "|110>",
                  "amplitude": { "real": 0.5, "imaginary": 0.0 },
                },
              ],
            "up_to_global_phase": true,
          },
        ],
    },
}
---

固定値: n=3。

|000> から (|000>+|010>+|100>+|110>)/2 を準備してください。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。全体位相は問いません。
