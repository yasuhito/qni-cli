---
{
  "id": "preparing-states/zero-and-bitstring",
  "title": "ZeroAndBitstring",
  "available_gates":
    ["H(target)", "CNOT(control, target)", "GlobalPhase(angle, target)"],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs": [{ "name": "bits", "type": "bits", "min": 1, "max": 8 }],
      "mode": "state",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "bits": [true, false] },
            "qubits": 2,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "bits": [true, false, true] },
            "qubits": 3,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "bits": [true] },
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
            "inputs": { "bits": [true, true, false, true, true] },
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
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": true,
          },
        ],
    },
}
---

先頭が true の bits を受け取り、ゼロ列と bits の等重ね合わせにする。幅は bits の長さ。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
