# Feature: Rx ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定した step と qubit に Rx ゲートを追加したい。

## Scenario: Rx ゲート追加コマンドは成功

- When "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: Rx ゲートを指定位置から取得

- Given "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  Rx(π/2)
  ```

## Scenario: Rx ゲートを追加した回路を表示

- Given "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/2
      ┌───┐
  q0: ┤ Rx├
      └───┘
  ```

## Scenario: Rx ゲート追加で circuit.json を作成

- When "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Rx(π/2)"]
    ]
  }
  ```

## Scenario: Rx ゲートは angle がないと追加できない

- When "qni add Rx --qubit 0 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  angle is required for Rx
  ```
