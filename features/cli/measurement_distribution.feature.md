# Feature: 複数回測定の共同分布

qni-cli の利用者として、測定回路を独立に複数回実行し、
すべての古典ビットの共同分布を再現可能な表または JSON で確認したい。

## Scenario: シード値を省略した通常出力コマンドは成功する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 3" を実行
- Then コマンドは成功

## Scenario: 通常出力は指定した測定ショット数を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 3" を実行
- Then 標準出力の shots は 3

## Scenario: 通常出力は生成したシード値を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 3" を実行
- Then 標準出力の seed は符号なし32ビット整数

## Scenario: 通常出力は共同分布を表で表示する

- Given "qni add X --qubit 0 --step 0" を実行
- Given "qni add Measure --name prepared --qubit 0 --step 1" を実行
- Given "qni add Measure --qubit 1 --step 2" を実行
- When "qni run --shots 3" を実行
- Then 標準出力の表:

  ```text
  prepared | q1 | count
  1        | 0  | 3
  ```

## Scenario: 通常出力はシード値とともに指定した測定ショット数を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 8 --seed 42" を実行
- Then 標準出力の shots は 8

## Scenario: 通常出力は指定したシード値を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 8 --seed 42" を実行
- Then 標準出力の seed は 42

## Scenario: 指定したシード値の共同分布を表で表示する

- Given "qni add H --qubit 0 --step 0" を実行
- Given "qni add Measure --name result --qubit 0 --step 1" を実行
- When "qni run --shots 8 --seed 42" を実行
- Then 標準出力の表:

  ```text
  result | count
  0      | 3
  1      | 5
  ```

## Scenario: 生成したシード値を指定すると通常出力全体を再現する

- Given "qni add H --qubit 0 --step 0" を実行
- Given "qni add Measure --name result --qubit 0 --step 1" を実行
- When "qni run --shots 8" を実行
- Then 生成したシード値を指定すると通常の標準出力が一致する

## Scenario: シード値を省略した JSON 出力コマンドは成功する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --json" を実行
- Then コマンドは成功

## Scenario: JSON 出力は測定ショット数を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --json" を実行
- Then JSON 出力の shots は 1

## Scenario: JSON 出力は生成したシード値を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --json" を実行
- Then JSON 出力の seed は符号なし32ビット整数

## Scenario: JSON 出力は指定した測定ショット数を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 3 --seed 42 --json" を実行
- Then JSON 出力の shots は 3

## Scenario: JSON 出力は古典ビット名から値を参照できる

- Given "qni add X --qubit 0 --step 0" を実行
- Given "qni add Measure --name prepared --qubit 0 --step 1" を実行
- Given "qni add Measure --qubit 1 --step 2" を実行
- When "qni run --shots 3 --seed 42 --json" を実行
- Then JSON 出力の測定分布:

  ```json
  {
    "classicalBits": ["prepared", "q1"],
    "results": [
      {
        "values": {"prepared": 1, "q1": 0},
        "count": 3
      }
    ]
  }
  ```

## Scenario: JSON 出力は指定したシード値を報告する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 3 --seed 42 --json" を実行
- Then JSON 出力の seed は 42

## Scenario: 生成したシード値を指定すると JSON 出力全体を再現する

- Given "qni add H --qubit 0 --step 0" を実行
- Given "qni add Measure --name result --qubit 0 --step 1" を実行
- When "qni run --shots 8 --json" を実行
- Then 生成したシード値を指定すると JSON の標準出力が一致する

## Scenario: 測定ショット数は正の整数でなければならない

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --shots 0" を実行
- Then 標準エラー:

  ```text
  --shots must be a positive integer
  ```

## Scenario: シード値は符号なし32ビット整数でなければならない

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --seed -1" を実行
- Then 標準エラー:

  ```text
  --seed must be an integer between 0 and 4294967295
  ```

## Scenario: qni run ヘルプは複数回実行を最初に説明する

- When "qni run --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni run --shots 100
  ```

## Scenario: qni run ヘルプはシード値による再現を次に説明する

- When "qni run --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni run --shots 100 --seed 42
  ```

## Scenario: qni run ヘルプは JSON 出力を最後に説明する

- When "qni run --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni run --shots 100 --seed 42 --json
  ```
