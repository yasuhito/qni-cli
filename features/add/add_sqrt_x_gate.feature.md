# Feature: √X ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定した step と qubit に √X ゲートを追加したい。

## Scenario: √X ゲート追加コマンドは成功

- When "qni add √X --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: √X ゲート追加コマンドの標準出力は空

- When "qni add √X --qubit 0 --step 0" を実行
- Then 標準出力は空

## Scenario: √X ゲートを指定位置から取得

- Given "qni add √X --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  X^½
  ```

## Scenario: √X ゲートを追加した回路を表示

- Given "qni add √X --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤√X ├
      └───┘
  ```

## Scenario: √X ゲート追加で circuit.json を作成

- When "qni add √X --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["X^½"]
    ]
  }
  ```
