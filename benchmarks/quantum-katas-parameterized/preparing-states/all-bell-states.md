---
{
  "id": "preparing-states/all-bell-states",
  "title": "AllBellStates",
  "available_gates":
    [
      "H(target)",
      "X(target)",
      "Z(target)",
      "CNOT(control, target)",
      "GlobalPhase(angle, target)",
    ],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs": [{ "name": "index", "type": "int", "min": 0, "max": 3 }],
      "mode": "state",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "index": 0 },
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
            "inputs": { "index": 1 },
            "qubits": 2,
            "expected":
              [
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
                { "real": -0.7071067811865475, "imaginary": 0 },
              ],
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "index": 2 },
            "qubits": 2,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "index": 3 },
            "qubits": 2,
            "expected":
              [
                { "real": 0, "imaginary": 0 },
                { "real": 0.7071067811865475, "imaginary": 0 },
                { "real": -0.7071067811865475, "imaginary": 0 },
                { "real": 0, "imaginary": 0 },
              ],
            "hidden": true,
          },
        ],
    },
}
---

index=0,1,2,3 に従って (|00>±|11>)/sqrt(2)、(|01>±|10>)/sqrt(2) の順に準備する。旧四ファイルを一つの離散引数課題に統合。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
