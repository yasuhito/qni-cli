---
{
  "id": "basic-gates/two-qubit-gate-3",
  "title": "QubitSwap",
  "available_gates":
    [
      "CNOT(control, target)",
      "SWAP(target1, target2)",
      "GlobalPhase(angle, target)",
    ],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs":
        [
          { "name": "n", "type": "int", "min": 2, "max": 8 },
          { "name": "index1", "type": "int", "min": 0, "max": 7 },
          { "name": "index2", "type": "int", "min": 0, "max": 7 },
        ],
      "mode": "unitary",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "n": 2, "index1": 0, "index2": 1 },
            "qubits": 2,
            "reference_circuit": { "qubits": 2, "cols": [["Swap", "Swap"]] },
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "n": 3, "index1": 0, "index2": 2 },
            "qubits": 3,
            "reference_circuit": { "qubits": 3, "cols": [["Swap", 1, "Swap"]] },
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "n": 4, "index1": 1, "index2": 3 },
            "qubits": 4,
            "reference_circuit":
              { "qubits": 4, "cols": [[1, "Swap", 1, "Swap"]] },
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "n": 5, "index1": 2, "index2": 4 },
            "qubits": 5,
            "reference_circuit":
              { "qubits": 5, "cols": [[1, 1, "Swap", 1, "Swap"]] },
            "hidden": true,
          },
          {
            "id": "hidden_4",
            "inputs": { "n": 5, "index1": 1, "index2": 2 },
            "qubits": 5,
            "reference_circuit":
              { "qubits": 5, "cols": [[1, "Swap", "Swap", 1, 1]] },
            "hidden": true,
          },
        ],
    },
}
---

0≤index1<index2<N の二量子ビットを任意入力で交換する。全ユニタリを共通全体位相まで比較する。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
