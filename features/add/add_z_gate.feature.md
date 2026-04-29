# Feature: Z ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定した step と qubit に Z ゲートを追加したい。

## Scenario: Z ゲートを指定位置から取得

- Given "qni add Z --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  Z
  ```

## Scenario: Z ゲートを追加した回路を表示

- Given "qni add Z --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ Z ├
      └───┘
  ```

## Scenario: Z ゲート追加で circuit.json を作成

- When "qni add Z --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Z"]
    ]
  }
  ```
