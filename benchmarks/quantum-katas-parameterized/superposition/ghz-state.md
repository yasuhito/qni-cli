---
{
  "id": "superposition/ghz-state",
  "title": "GHZState",
  "available_gates":
    ["H(target)", "CNOT(control, target)", "GlobalPhase(angle, target)"],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs": [{ "name": "n", "type": "int", "min": 1, "max": 8 }],
      "mode": "state",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "n": 2 },
            "qubits": 2,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "n": 3 },
            "qubits": 3,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "n": 1 },
            "qubits": 1,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "n": 5 },
            "qubits": 5,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": true,
          },
        ],
    },
}
---

N 個のゼロ量子ビットを (|0…0>+|1…1>)/sqrt(2) にする。N=1 も含む。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
