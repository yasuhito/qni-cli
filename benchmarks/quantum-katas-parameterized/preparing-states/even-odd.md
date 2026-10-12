---
{
  "id": "preparing-states/even-odd",
  "title": "EvenOdd",
  "available_gates": ["H(target)", "X(target)", "GlobalPhase(angle, target)"],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs":
        [
          { "name": "n", "type": "int", "min": 1, "max": 8 },
          { "name": "is_even", "type": "bool" },
        ],
      "mode": "state",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "n": 3, "is_even": false },
            "qubits": 3,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.5, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "n": 2, "is_even": true },
            "qubits": 2,
            "expected":
              [
                { "real": 0.7071067811865476, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865476, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "n": 1, "is_even": true },
            "qubits": 1,
            "expected":
              [{ "real": 1.0, "imaginary": 0 }, { "real": 0, "imaginary": 0 }],
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "n": 1, "is_even": false },
            "qubits": 1,
            "expected":
              [{ "real": 0, "imaginary": 0 }, { "real": 1.0, "imaginary": 0 }],
            "hidden": true,
          },
          {
            "id": "hidden_4",
            "inputs": { "n": 5, "is_even": true },
            "qubits": 5,
            "expected":
              [
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0.25, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": true,
          },
        ],
    },
}
---

整数として偶数または奇数の基底を等重ね合わせにする。最下位ビットで偶奇を判定する。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
