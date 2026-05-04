# Feature: qni add SWAP コマンド

qni-cli のユーザとして、2 つの qubit を入れ替える回路を作るために、
qni add SWAP を実行したい。

## Scenario: qni add SWAP コマンドは成功

- When "qni add SWAP --qubit 0,1 --step 0" を実行
- Then コマンドは成功

## Scenario: qni add SWAP の標準出力は空

- When "qni add SWAP --qubit 0,1 --step 0" を実行
- Then 標準出力は空

## Scenario: qni add SWAP は指定位置から Swap を取得

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni gate --qubit 0 --step 0" を実行
- Then 標準出力:

  ```text
  Swap
  ```

## Scenario: qni add SWAP は回路を表示

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ─X─
       │
  q1: ─X─
  ```

## Scenario: qni add SWAP は circuit.json に Swap を 2 つ追加

- When "qni add SWAP --qubit 0,1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["Swap", "Swap"]
    ]
  }
  ```

## Scenario: qni add SWAP は decimal step でも circuit.json に Swap を 2 つ追加

- When "qni add SWAP --qubit 0,1 --step 0.0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["Swap", "Swap"]
    ]
  }
  ```

## Scenario: qni add SWAP は target qubit が 1 つだと失敗

- When "qni add SWAP --qubit 0 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  SWAP requires exactly 2 target qubits
  ```

## Scenario: qni add SWAP は target qubit が 3 つだと失敗

- When "qni add SWAP --qubit 0,1,2 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  SWAP requires exactly 2 target qubits
  ```

## Scenario: qni add SWAP は --qubit がないと失敗

- When "qni add SWAP --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  No value provided for required options '--qubit'
  ```
