# Feature: qni-cli の LaTeX 出力

qni-cli の利用者として
状態ベクトルと期待値を論文と同じ記法で読めるように
計算結果を LaTeX で出力したい。

## Scenario: qni run --latex は Bell 状態を ket 記法で表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- When "qni run --latex" を実行
- Then 標準出力:

  ```text
  0.7071067811865475\ket{00} + 0.7071067811865475\ket{11}
  ```

## Scenario: qni run --symbolic --latex は記号的な初期状態を ket 記法で表示

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- When "qni run --symbolic --latex" を実行
- Then 標準出力:

  ```text
  \alpha\ket{0} + \beta\ket{1}
  ```

## Scenario: qni run --symbolic --basis x --latex は名前付き基底を ket 記法で表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni run --symbolic --basis x --latex" を実行
- Then 標準出力:

  ```text
  \ket{+}
  ```

## Scenario: qni expect --latex は複数の期待値を LaTeX で行ごとに表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- When "qni expect ZZ XX --latex" を実行
- Then 標準出力:

  ```text
  \langle ZZ \rangle = 1.0
  \langle XX \rangle = 1.0
  ```

## Scenario: 測定回路の qni run --latex --shots は失敗

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add Measure --qubit 0 --step 1" を実行
- When "qni run --latex --shots 10" を実行
- Then コマンドは失敗

## Scenario: 測定回路の qni run --latex --shots は併用エラーを表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add Measure --qubit 0 --step 1" を実行
- When "qni run --latex --shots 10" を実行
- Then 標準エラー:

  ```text
  --latex cannot be used with --shots, --seed, or --json
  ```
