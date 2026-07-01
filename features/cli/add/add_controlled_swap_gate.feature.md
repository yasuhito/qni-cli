# Feature: qni add/run/view の controlled-SWAP

qni-cli の利用者として、Fredkin gate を含む回路を組み立てて確認するために、
qni add SWAP に制御量子ビットを指定したい。

## Scenario: qni add SWAP は --control 付きで成功

- When "qni add SWAP --control 0 --qubit 1,2 --step 0" を実行
- Then コマンドは成功

## Scenario: qni add SWAP は controlled-SWAP を circuit.json に保存

- When "qni add SWAP --control 0 --qubit 1,2 --step 0" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 3,
    "cols": [
      ["•", "Swap", "Swap"]
    ]
  }
  ```

## Scenario: qni view は controlled-SWAP を表示

- Given "qni add SWAP --control 0 --qubit 1,2 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ─■─
       │
  q1: ─X─
       │
  q2: ─X─
  ```

## Scenario: qni run は制御量子ビットが 1 の controlled-SWAP を適用

- Given "qni state set \"|101>\"" を実行
- And "qni add SWAP --control 0 --qubit 1,2 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.0,0.0,0.0,0.0,0.0,1.0,0.0
  ```

## Scenario: qni run は制御量子ビットが 0 の controlled-SWAP を適用しない

- Given "qni state set \"|001>\"" を実行
- And "qni add SWAP --control 0 --qubit 1,2 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0,0.0,0.0,0.0,0.0,0.0,0.0
  ```

## Scenario: qni export --latex-source は controlled-SWAP の制御点を出力

- Given "qni add SWAP --control 0 --qubit 1,2 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \ctrl{1}
  ```

## Scenario: qni add SWAP は制御量子ビットと対象量子ビットが同じだと失敗

- When "qni add SWAP --control 0 --qubit 0,1 --step 0" を実行
- Then コマンドは失敗

## Scenario: qni add SWAP は制御量子ビットと対象量子ビットが同じだと標準エラーを表示

- When "qni add SWAP --control 0 --qubit 0,1 --step 0" を実行
- Then 標準エラー:

  ```text
  control and target must be different
  ```
