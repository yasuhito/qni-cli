# Feature: 制御付き位相ゲートのシンボリック実行

qni-cli の利用者として
QFT などの位相を使う量子アルゴリズムを ket 記法で説明できるように
制御付き位相ゲートを含む回路をシンボリック実行したい。


## Scenario: 3 量子ビット QFT 回路をシンボリック実行する

- Given 空の 3 量子ビット回路がある
- And "qni add H --qubit 0 --step 0" を実行
- And "qni add P --angle π/2 --control 1 --qubit 0 --step 1" を実行
- And "qni add P --angle π/4 --control 2 --qubit 0 --step 2" を実行
- And "qni add H --qubit 1 --step 3" を実行
- And "qni add P --angle π/2 --control 2 --qubit 1 --step 4" を実行
- And "qni add H --qubit 2 --step 5" を実行
- And "qni add SWAP --qubit 0,2 --step 6" を実行
- And "qni state set '1|000>'" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  sqrt(2)/4|000> + sqrt(2)/4|001> + sqrt(2)/4|010> + sqrt(2)/4|011> + sqrt(2)/4|100> + sqrt(2)/4|101> + sqrt(2)/4|110> + sqrt(2)/4|111>
  ```

## Scenario: 制御付き P、Rz、S、T をシンボリック実行する

- Given 2 量子ビットの初期状態が "|11>" である
- And "qni add P --angle π/2 --control 0 --qubit 1 --step 1" を実行
- And "qni add Rz --angle π/2 --control 0 --qubit 1 --step 2" を実行
- And "qni add S --control 0 --qubit 1 --step 3" を実行
- And "qni add T --control 0 --qubit 1 --step 4" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  -I|11>
  ```

## Scenario: 複数制御の P をシンボリック実行する

- Given 空の 3 量子ビット回路がある
- And "qni state set '|111>'" を実行
- And "qni add P --angle π/2 --control 0,1 --qubit 2 --step 1" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  I|111>
  ```

## Scenario: 制御付き SWAP をシンボリック実行する

- Given 空の 3 量子ビット回路がある
- And "qni state set '|110>'" を実行
- And "qni add SWAP --control 0 --qubit 1,2 --step 1" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  |101>
  ```

## Scenario: 制御 X と制御 Z のシンボリック実行結果は変わらない

- Given 2 量子ビットの初期状態が "|10>" である
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- And "qni add Z --control 0 --qubit 1 --step 2" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  -|11>
  ```

## Scenario: 未対応ゲートの制御版は失敗する

- Given 次の circuit.json がある:

  ```json
  {
    "cols": [["•", "Unknown"]],
    "qubits": 2
  }
  ```
- When "qni run --symbolic" を実行
- Then コマンドは失敗

## Scenario: 未対応ゲートの制御版は明確なエラーを表示する

- Given 次の circuit.json がある:

  ```json
  {
    "cols": [["•", "Unknown"]],
    "qubits": 2
  }
  ```
- When "qni run --symbolic" を実行
- Then 標準エラー:

  ```text
  unsupported gate for symbolic run: 'Unknown'
  ```
