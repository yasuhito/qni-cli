---
{
  "id": "multi-qubit-gates/arbitrary-controls",
  "title": "ArbitraryControls",
  "available_gates":
    ["X(target)", "MCX(controls, target)", "GlobalPhase(angle, target)"],
  "allowed_commands": ["qni add"],
  "parameterized":
    {
      "protocol": "neutral-parameterized-circuit-json-v1",
      "inputs": [{ "name": "bits", "type": "bits", "min": 1, "max": 7 }],
      "mode": "unitary",
      "tolerance": 1e-09,
      "up_to_global_phase": true,
      "cases":
        [
          {
            "id": "public_0",
            "inputs": { "bits": [true] },
            "qubits": 2,
            "reference_circuit": { "qubits": 2, "cols": [["•", "X"]] },
            "hidden": false,
          },
          {
            "id": "public_1",
            "inputs": { "bits": [true, false] },
            "qubits": 3,
            "reference_circuit":
              {
                "qubits": 3,
                "cols": [[1, "X", 1], ["•", "•", "X"], [1, "X", 1]],
              },
            "hidden": false,
          },
          {
            "id": "hidden_2",
            "inputs": { "bits": [false] },
            "qubits": 2,
            "reference_circuit":
              { "qubits": 2, "cols": [["X", 1], ["•", "X"], ["X", 1]] },
            "hidden": true,
          },
          {
            "id": "hidden_3",
            "inputs": { "bits": [false, false, false] },
            "qubits": 4,
            "reference_circuit":
              {
                "qubits": 4,
                "cols":
                  [
                    ["X", 1, 1, 1],
                    [1, "X", 1, 1],
                    [1, 1, "X", 1],
                    ["•", "•", "•", "X"],
                    ["X", 1, 1, 1],
                    [1, "X", 1, 1],
                    [1, 1, "X", 1],
                  ],
              },
            "hidden": true,
          },
          {
            "id": "hidden_4",
            "inputs": { "bits": [false, true, false, true] },
            "qubits": 5,
            "reference_circuit":
              {
                "qubits": 5,
                "cols":
                  [
                    ["X", 1, 1, 1, 1],
                    [1, 1, "X", 1, 1],
                    ["•", "•", "•", "•", "X"],
                    ["X", 1, 1, 1, 1],
                    [1, 1, "X", 1, 1],
                  ],
              },
            "hidden": true,
          },
          {
            "id": "hidden_5",
            "inputs": { "bits": [true, true, true] },
            "qubits": 4,
            "reference_circuit":
              { "qubits": 4, "cols": [["•", "•", "•", "X"]] },
            "hidden": true,
          },
        ],
    },
}
---

bits が指定する状態のときだけ末尾の対象を反転する。bits の長さ個の制御を先頭に置き、制御を元に戻す。全ユニタリを共通全体位相まで比較する。

補助量子ビットは禁止。q0 は基底表記の左端。入力宣言に一致する制限付きJSONで回路生成器を提出する。具体値を埋め込むだけでは別の長さの採点を通過しない。非公開ケースを含む有限個の入力で検証し、全定義域の証明とはしない。
