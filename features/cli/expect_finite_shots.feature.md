# Feature: qni expect の有限ショット推定

qni-cli の利用者として、有限回の測定で Pauli 期待値を推定し、
ゼロ付近の符号が不安定かを再現可能な形で確認したい。

## Background:

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --control 0 --qubit 1 --step 1" を実行

## Scenario: Bell 状態の ZZ と XX を別々の測定設定で推定

- When "qni expect ZZ XX --shots 1000 --seed 42" を実行
- Then 標準出力:

  ```text
  shots=1000 seed=42 settings=2 criterion=2*stderr
  ZZ=1.0 estimate=1.0 stderr=0.0
  XX=1.0 estimate=1.0 stderr=0.0
  ```

## Scenario: qubit ごとに可換な Pauli 文字列を同じ測定設定にまとめる

- When "qni expect ZI IZ ZZ --shots 100 --seed 1" を実行
- Then 標準出力に次を含む:

  ```text
  settings=1
  ```

## Scenario: 期待値がゼロ付近の推定値を不安定と判定

- When "qni expect ZX --shots 1000 --seed 42" を実行
- Then 標準出力に次を含む:

  ```text
  unstable
  ```

## Scenario: 固定 seed の有限ショット実行は2回とも成功してから比較する

- When "qni expect ZX --shots 1000 --seed 42" を2回正常に実行
- Then 2回の標準出力は一致する

## Scenario: seed を省略すると再現用の seed を表示する

- When "qni expect ZX --shots 100" を実行
- Then expect の標準出力の seed は符号なし32ビット整数

## Scenario: 省略時に生成された seed で有限ショット出力全体を再現する

- When "qni expect ZX --shots 100" を実行
- Then 生成された seed で expect の標準出力全体を再現できる

## Scenario: threshold は既定の標準誤差判定を置き換える

- When "qni expect ZX --shots 100 --seed 42 --threshold 0.5" を実行
- Then 標準出力に次を含む:

  ```text
  criterion=threshold=0.5
  ```

## Scenario: shots なしの threshold は期待値を判定

- When "qni expect ZX --threshold 0.5" を実行
- Then 標準出力:

  ```text
  criterion=threshold=0.5
  ZX=0.0 unstable
  ```

## Scenario: 有限ショット推定を JSON で表示

- When "qni expect ZZ XX --shots 1000 --seed 42 --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "shots": 1000,
    "seed": 42,
    "criterion": { "kind": "stderr", "multiplier": 2 },
    "settings": [
      { "axes": "ZZ", "paulis": ["ZZ"] },
      { "axes": "XX", "paulis": ["XX"] }
    ],
    "expectations": [
      {
        "pauli": "ZZ",
        "value": 1,
        "sign": 1,
        "estimate": { "value": 1, "sign": 1, "stderr": 0, "unstable": false }
      },
      {
        "pauli": "XX",
        "value": 1,
        "sign": 1,
        "estimate": { "value": 1, "sign": 1, "stderr": 0, "unstable": false }
      }
    ]
  }
  ```

## Scenario Outline: 不正な有限ショットオプションは終了コード1で失敗する

- When "<command>" を実行
- Then 終了コードは 1

### Examples:

  | command                          |
  | qni expect ZZ --seed 42          |
  | qni expect ZZ --shots 0          |
  | qni expect ZZ --threshold 1.1    |
  | qni expect ZZ --latex --shots 10 |

## Scenario Outline: 不正な有限ショットオプションは標準出力を出さない

- When "<command>" を実行
- Then 標準出力は空

### Examples:

  | command                          |
  | qni expect ZZ --seed 42          |
  | qni expect ZZ --shots 0          |
  | qni expect ZZ --threshold 1.1    |
  | qni expect ZZ --latex --shots 10 |

## Scenario Outline: 不正な有限ショットオプションは標準エラー1行だけを出す

- When "<command>" を実行
- Then 標準エラーは "<error>" の1行だけ

### Examples:

  | command                          | error                                                               |
  | qni expect ZZ --seed 42          | --seed requires --shots                                              |
  | qni expect ZZ --shots 0          | --shots must be a positive integer                                  |
  | qni expect ZZ --threshold 1.1    | --threshold must be a number between 0 and 1                         |
  | qni expect ZZ --latex --shots 10 | --latex cannot be used with --shots, --seed, --threshold, or --json |

## Scenario: measure ゲートを含む回路の有限ショット期待値は失敗する

- Given "qni add Measure --qubit 0 --step 2" を実行
- When "qni expect ZZ --shots 10 --seed 42" を実行
- Then 終了コードは 1

## Scenario: measure ゲート拒否時は標準出力を出さない

- Given "qni add Measure --qubit 0 --step 2" を実行
- When "qni expect ZZ --shots 10 --seed 42" を実行
- Then 標準出力は空

## Scenario: measure ゲート拒否時は標準エラー1行だけを出す

- Given "qni add Measure --qubit 0 --step 2" を実行
- When "qni expect ZZ --shots 10 --seed 42" を実行
- Then 標準エラーは次の1行だけ:

  ```text
  unsupported gate for run: "Measure"
  ```

## Scenario: qni expect --help は成功する

- When "qni expect --help" を実行
- Then コマンドは成功
