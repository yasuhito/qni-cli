# Feature: Ry ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定した step と qubit に Ry ゲートを追加したい。

## Scenario: Ry ゲート追加コマンドは成功

- When "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: Ry ゲートを指定位置から取得

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  Ry(π/2)
  ```

## Scenario: Ry ゲートを追加した回路を表示

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/2
      ┌───┐
  q0: ┤ Ry├
      └───┘
  ```

## Scenario: Ry ゲート追加で circuit.json を作成

- When "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(π/2)"]
    ]
  }
  ```

## Scenario: Ry ゲートは変数 angle をそのまま保存できる

- When "qni add Ry --angle theta --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ]
  }
  ```

## Scenario: Ry ゲートは単純な角度式をそのまま保存できる

- When "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(2*alpha)"]
    ]
  }
  ```
