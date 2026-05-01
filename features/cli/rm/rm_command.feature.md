# Feature: rm コマンドでゲートを削除

qni-cli のユーザとして、試行錯誤しながら回路を編集するために、
指定した step と qubit のゲートを `qni rm` で削除したい。

## Scenario: 単一 qubit gate を削除する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni rm --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      [1]
    ]
  }
  ```

## Scenario: 削除成功時の標準出力は空

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni rm --qubit 0 --step 0" を実行
- Then 標準出力は空

## Scenario: 削除後に先頭 step は auto-shrink される

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --qubit 0 --step 1" を実行
- When "qni rm --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["X"]
    ]
  }
  ```

## Scenario: 削除後に先頭 qubit は auto-shrink される

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --qubit 1 --step 0" を実行
- When "qni rm --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["X"]
    ]
  }
  ```

## Scenario: CNOT の control を指定すると operation 全体を削除する

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni rm --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      [1]
    ]
  }
  ```

## Scenario: CNOT の target を指定すると operation 全体を削除する

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni rm --qubit 1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      [1]
    ]
  }
  ```

## Scenario: SWAP の片方を指定すると operation 全体を削除する

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni rm --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      [1]
    ]
  }
  ```

## Scenario: 同じ step の独立 gate は指定 qubit だけ削除する

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --qubit 1 --step 0" を実行
- When "qni rm --qubit 1 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["H"]
    ]
  }
  ```

## Scenario: 空 slot の削除は失敗する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 2,
    "cols": [
      ["H", 1]
    ]
  }
  ```

- When "qni rm --qubit 1 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  slot is empty: cols[0][1]
  ```

## Scenario: 存在しない slot の削除は失敗する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni rm --qubit 0 --step 1" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  slot does not exist: cols[1][0]
  ```

## Scenario: circuit.json が存在しない場合は失敗する

- When "qni rm --qubit 0 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  circuit.json does not exist
  ```

## Scenario: qni rm --help は rm コマンドの使い方を表示

- When "qni rm --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni rm --qubit=N --step=N

  Overview:
    Remove the gate operation at one slot from ./circuit.json.
    step and qubit are 0-based indices.
    Controlled gates are removed as one operation from either control or target.
    SWAP is removed as one operation from either Swap slot.

  Options:
    --step=N   # 0-based step index
    --qubit=N  # 0-based qubit index

  Examples:
    qni rm --qubit 0 --step 0
  ```
