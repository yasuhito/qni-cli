---
{
  "id": "qft/periodic-state",
  "title": "QFTPeriodicState",
  "source": "Microsoft Quantum Katas / qft__periodic_state",
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
                  "amplitude":
                    { "real": 0.35355339059327373, "imaginary": 0.0 },
                },
                {
                  "basis": "|001>",
                  "amplitude":
                    {
                      "real": -0.25000000000000006,
                      "imaginary": -0.24999999999999997,
                    },
                },
                {
                  "basis": "|010>",
                  "amplitude":
                    {
                      "real": 1.0824450702943665e-16,
                      "imaginary": 0.35355339059327373,
                    },
                },
                {
                  "basis": "|011>",
                  "amplitude":
                    {
                      "real": 0.24999999999999964,
                      "imaginary": -0.25000000000000033,
                    },
                },
                {
                  "basis": "|100>",
                  "amplitude":
                    {
                      "real": -0.35355339059327373,
                      "imaginary": 2.164890140588733e-16,
                    },
                },
                {
                  "basis": "|101>",
                  "amplitude":
                    { "real": 0.24999999999999997, "imaginary": 0.25 },
                },
                {
                  "basis": "|110>",
                  "amplitude":
                    {
                      "real": -9.5277050456182e-16,
                      "imaginary": -0.35355339059327373,
                    },
                },
                {
                  "basis": "|111>",
                  "amplitude":
                    {
                      "real": -0.2499999999999995,
                      "imaginary": 0.25000000000000044,
                    },
                },
              ],
            "up_to_global_phase": true,
          },
        ],
    },
}
---

固定値: n=3、F=5。

|000> から Σ(k=0..7) exp(2πi·5k/8)|k>/sqrt(8) を準備してください。

q0 は基底表記の左端（最上位ビット）です。補助量子ビットを使わず指定した幅で実装してください。全体位相は問いません。
