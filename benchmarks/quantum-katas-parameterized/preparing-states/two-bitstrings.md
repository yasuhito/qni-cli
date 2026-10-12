---
{
  "id": "preparing-states/two-bitstrings",
  "title": "TwoBitstrings",
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
          { "name": "a", "type": "bits", "min": 1, "max": 8 },
          { "name": "b", "type": "bits", "min": 1, "max": 8 },
        ],
      "mode": "state",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "a": [false], "b": [true] },
            "qubits": 1,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "a": [false, true, false], "b": [true, true, true] },
            "qubits": 3,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
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
            "inputs": { "a": [true, false, true], "b": [true, true, true] },
            "qubits": 3,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs":
              {
                "a": [false, false, false, true, true],
                "b": [false, false, false, false, true],
              },
            "qubits": 5,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
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
              ],
            "hidden": true,
          },
          {
            "id": "hidden_4",
            "inputs":
              {
                "a": [true, false, true, false, false],
                "b": [true, true, false, true, false],
              },
            "qubits": 5,
            "expected":
              [
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
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
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

a と b は同じ長さで少なくとも1ビット異なる。二列の等重ね合わせを準備する。識別ビットが先頭でない場合も扱う。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
