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

## Scenario: 固定 seed は有限ショット出力を再現

- When "qni expect ZX --shots 1000 --seed 42" を2回実行
- Then 2回の標準出力は一致する

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

## Scenario: seed だけの指定は失敗

- When "qni expect ZZ --seed 42" を実行
- Then 標準エラー:

  ```text
  --seed requires --shots
  ```

## Scenario: shots は正の整数を要求

- When "qni expect ZZ --shots 0" を実行
- Then 標準エラー:

  ```text
  --shots must be a positive integer
  ```

## Scenario: threshold は 0 以上 1 以下を要求

- When "qni expect ZZ --threshold 1.1" を実行
- Then 標準エラー:

  ```text
  --threshold must be a number between 0 and 1
  ```

## Scenario: latex と有限ショット指定は併用できない

- When "qni expect ZZ --latex --shots 10" を実行
- Then 標準エラー:

  ```text
  --latex cannot be used with --shots, --seed, --threshold, or --json
  ```
