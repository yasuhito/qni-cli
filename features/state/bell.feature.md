# Feature: qni state Bell

qni-cli のユーザとして
Bell 基底の初期状態を保存・確認するために
qni state set の Bell shorthand を使いたい

## Scenario: qni state set は |Φ+> の保存に成功する

- When "qni state set \"|Φ+>\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |Φ+> を shorthand のまま表示する

- Given "qni state set \"|Φ+>\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |Φ+>
  ```

## Scenario: qni state set は |Φ+> を qubits 2 の circuit.json として保存する

- When "qni state set \"|Φ+>\"" を実行
- Then "circuit.json" の内容:

  ```text
  {
    "qubits": 2,
    "initial_state": {
      "format": "ket_sum_v1",
      "terms": [
        {
          "basis": "Φ+",
          "coefficient": "1"
        }
      ]
    },
    "cols": [
      [
        1,
        1
      ]
    ]
  }
  ```

## Scenario: qni state set は |Φ-> の保存に成功する

- When "qni state set \"|Φ->\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |Φ-> を shorthand のまま表示する

- Given "qni state set \"|Φ->\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |Φ->
  ```

## Scenario: qni state set は |Ψ+> の保存に成功する

- When "qni state set \"|Ψ+>\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |Ψ+> を shorthand のまま表示する

- Given "qni state set \"|Ψ+>\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |Ψ+>
  ```

## Scenario: qni state set は |Ψ-> の保存に成功する

- When "qni state set \"|Ψ->\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |Ψ-> を shorthand のまま表示する

- Given "qni state set \"|Ψ->\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |Ψ->
  ```

## Scenario: qni state set は Bell 基底上の線形結合の保存に成功する

- When "qni state set \"α|Φ+> + β|Φ->\"" を実行
- Then コマンドは成功

## Scenario: qni state show は Bell 基底上の線形結合を表示する

- Given "qni state set \"α|Φ+> + β|Φ->\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  alpha|Φ+> + beta|Φ->
  ```
