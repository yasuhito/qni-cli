# Feature: qni-cli の LaTeX 出力

qni-cli の利用者として
状態ベクトルと期待値を論文と同じ記法で読めるように
計算結果を LaTeX で出力したい。

## Scenario: qni run --latex は Bell 状態を厳密な ket 記法で表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- When "qni run --latex" を実行
- Then 標準出力:

  ```text
  \frac{\sqrt{2}}{2}\ket{00} + \frac{\sqrt{2}}{2}\ket{11}
  ```

## Scenario: qni run --latex は複素振幅を厳密な数式で表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add T --qubit 0 --step 1" を実行
- When "qni run --latex" を実行
- Then 標準出力:

  ```text
  \frac{\sqrt{2}}{2}\ket{0} + \frac{1 + i}{2}\ket{1}
  ```

## Scenario: qni run --latex は加算式の複素振幅全体を ket の係数にする

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add P --angle 1 --qubit 0 --step 1" を実行
- When "qni run --latex" を実行
- Then 標準出力:

  ```text
  \left(\cos{\left(1 \right)} + i \sin{\left(1 \right)}\right)\ket{1}
  ```

## Scenario: qni run --latex は大きな対応回路も厳密値で表示

- Given 空の 9 量子ビット回路がある
- And "qni add H --qubit 0 --step 0" を実行
- When "qni run --latex" を実行
- Then 標準出力:

  ```text
  \frac{\sqrt{2}}{2}\ket{000000000} + \frac{\sqrt{2}}{2}\ket{100000000}
  ```

## Scenario: qni run --latex は記号実行環境がなくても数値で表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni run --latex" を記号実行環境なしで実行
- Then 標準出力:

  ```text
  0.707106781186547\ket{0} + 0.707106781186547\ket{1}
  ```

## Scenario: qni run --latex はシンボリック実行が未対応のゲートを数値で表示

- Given "qni add √X --qubit 0 --step 0" を実行
- When "qni run --latex" を実行
- Then 標準出力:

  ```text
  (0.5+0.5i)\ket{0} + (0.5-0.5i)\ket{1}
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
