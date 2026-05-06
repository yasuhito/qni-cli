# Feature: 位相ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定したステップと量子ビットに位相ゲートを追加したい。

## Scenario: 位相ゲート追加コマンドは成功

- When "qni add P --angle π/3 --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: 位相ゲート追加コマンドの標準出力は空

- When "qni add P --angle π/3 --qubit 0 --step 0" を実行
- Then 標準出力は空

## Scenario: 位相ゲートを指定位置から取得

- Given "qni add P --angle π/3 --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  P(π/3)
  ```

## Scenario: 位相ゲートを追加した回路を表示

- Given "qni add P --angle π/3 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/3
      ┌───┐
  q0: ┤ P ├
      └───┘
  ```

## Scenario: 位相ゲート追加で circuit.json を作成

- When "qni add P --angle π/3 --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["P(π/3)"]
    ]
  }
  ```

## Scenario: 位相ゲート追加で負の変数を angle として保存できる

- When "qni add P --angle=-alpha --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["P(-alpha)"]
    ]
  }
  ```

## Scenario: 位相ゲートは angle がないと追加できない

- When "qni add P --qubit 0 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  angle is required for P
  ```
