---
{
  "id": "preparing-states/parity-bitstrings",
  "title": "ParityBitstrings",
  "available_gates":
    [
      "H(target)",
      "CNOT(control, target)",
      "X(target)",
      "GlobalPhase(angle, target)",
    ],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs":
        [
          { "name": "n", "type": "int", "min": 1, "max": 8 },
          { "name": "parity", "type": "int", "min": 0, "max": 1 },
        ],
      "mode": "state",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "n": 3, "parity": 0 },
            "qubits": 3,
            "expected":
              [
                { "real": 0.5, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "n": 4, "parity": 1 },
            "qubits": 4,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0.3535533905932738, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "n": 1, "parity": 0 },
            "qubits": 1,
            "expected":
              [{ "real": 1.0, "imaginary": 0 }, { "real": 0, "imaginary": 0 }],
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "n": 1, "parity": 1 },
            "qubits": 1,
            "expected":
              [{ "real": 0, "imaginary": 0 }, { "real": 1.0, "imaginary": 0 }],
            "hidden": true,
          },
          {
            "id": "hidden_4",
            "inputs": { "n": 5, "parity": 0 },
            "qubits": 5,
            "expected":
              [
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": true,
          },
        ],
    },
}
---

1の個数の偶奇が parity (0または1) と一致するビット列を等重ね合わせにする。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
