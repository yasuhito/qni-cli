---
{
  "id": "qft/rotation-gate",
  "title": "RotationGate",
  "available_gates": ["Phase(angle, target)", "GlobalPhase(angle, target)"],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs": [{ "name": "k", "type": "int", "min": 0, "max": 12 }],
      "mode": "unitary",
      "tolerance": 1e-09,
      "up_to_global_phase": false,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "k": 2 },
            "qubits": 1,
            "reference_circuit":
              { "qubits": 1, "cols": [["P(1.570796326794897)"]] },
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "k": 3 },
            "qubits": 1,
            "reference_circuit":
              { "qubits": 1, "cols": [["P(0.785398163397448)"]] },
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "k": 0 },
            "qubits": 1,
            "reference_circuit":
              { "qubits": 1, "cols": [["P(6.283185307179586)"]] },
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "k": 1 },
            "qubits": 1,
            "reference_circuit":
              { "qubits": 1, "cols": [["P(3.141592653589793)"]] },
            "hidden": true,
          },
          {
            "id": "hidden_4",
            "inputs": { "k": 5 },
            "qubits": 1,
            "reference_circuit":
              { "qubits": 1, "cols": [["P(0.196349540849362)"]] },
            "hidden": true,
          },
          {
            "id": "hidden_5",
            "inputs": { "k": 9 },
            "qubits": 1,
            "reference_circuit":
              { "qubits": 1, "cols": [["P(0.012271846303085)"]] },
            "hidden": true,
          },
        ],
    },
}
---

k≥0、|1> の位相を exp(2πi/2^k) 倍する。幅は1だが整数 k のため有限個の数値採点を使う。全体位相も厳密。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
