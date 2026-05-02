# Feature: qni variable errors

qni-cli のユーザとして
variable コマンドの入力エラーを理解するために
qni variable のエラーを確認したい

## Scenario: qni variable set は circuit.json がないと失敗する

- Given "circuit.json" は存在しない
- When "qni variable set theta π/4" を実行
- Then コマンドは失敗

## Scenario: qni variable set は circuit.json がないとエラー内容を表示する

- Given "circuit.json" は存在しない
- When "qni variable set theta π/4" を実行
- Then 標準エラー:

  ```text
  circuit.json does not exist
  ```

## Scenario: qni variable clear は余分な引数があると失敗する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ],
    "variables": {
      "theta": "π/4"
    }
  }
  ```

- When "qni variable clear extra" を実行
- Then コマンドは失敗

## Scenario: qni variable clear は余分な引数があると circuit.json を変更しない

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ],
    "variables": {
      "theta": "π/4"
    }
  }
  ```

- When "qni variable clear extra" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["Ry(theta)"]
    ],
    "variables": {
      "theta": "π/4"
    }
  }
  ```

## Scenario: qni variable set は cols が配列でない circuit.json では失敗する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```

- When "qni variable set theta π/4" を実行
- Then コマンドは失敗

## Scenario: qni variable set は cols が配列でない circuit.json のエラー内容を表示する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```

- When "qni variable set theta π/4" を実行
- Then 標準エラー:

  ```text
  cols must be an array
  ```

## Scenario: qni variable set は cols が配列でない circuit.json を変更しない

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```

- When "qni variable set theta π/4" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": "bad"
  }
  ```
