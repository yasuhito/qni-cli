# Feature: H ゲートを追加

qni-cli のユーザとして、コマンドラインから量子回路を組み立てるために、
指定した step と qubit に H ゲートを追加したい。

## Scenario: H ゲート追加コマンドは成功

- When "qni add H --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: H ゲート追加コマンドの標準出力は空

- When "qni add H --qubit 0 --step 0" を実行
- Then 標準出力は空

## Scenario: H ゲートを指定位置から取得

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  H
  ```

## Scenario: H ゲートを追加した回路を表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ H ├
      └───┘
  ```

## Scenario: H ゲート追加で circuit.json を作成

- When "qni add H --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```

## Scenario: QNI_USE_RUBY=1 の H ゲート追加コマンドは成功

- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- When "qni add H --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: QNI_USE_RUBY=1 の H ゲート追加は Ruby fallback で circuit.json を作成

- Given 環境変数 "QNI_USE_RUBY" を "1" に設定する
- When "qni add H --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```
