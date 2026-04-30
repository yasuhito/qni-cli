# Feature: qni run symbolic output

qni-cli のユーザとして
ket 形式や named basis で状態を読めるように
qni run --symbolic と --basis の表示を確認したい。


## Scenario: qni run --symbolic は初期状態ベクトル alpha|0> + beta|1> に X を適用する

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- And "qni add X --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  beta|0> + alpha|1>
  ```

## Scenario: qni run --symbolic は Bell 状態の |Φ⁻⟩ を表示

- Given 空の 2 qubit 回路がある
- And "qni add H --qubit 0 --step 0" を実行
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- And "qni add Z --qubit 0 --step 2" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  sqrt(2)/2|00> - sqrt(2)/2|11>
  ```

## Scenario: qni run --symbolic は H ゲートの状態を ket 形式で表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  sqrt(2)/2|0> + sqrt(2)/2|1>
  ```

## Scenario: qni run --symbolic --basis x は H ゲートの状態を |+>, |-> で表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni run --symbolic --basis x" を実行
- Then 標準出力:

  ```text
  |+>
  ```

## Scenario: qni run --symbolic --basis x は alpha|0> + beta|1> に H を適用した結果を |+>, |-> で表示

- Given "qni state set \"alpha|0> + beta|1>\"" を実行
- And "qni add H --qubit 0 --step 0" を実行
- When "qni run --symbolic --basis x" を実行
- Then 標準出力:

  ```text
  alpha|+> + beta|->
  ```

## Scenario: qni run --symbolic --basis y は S を適用した |+> を |+i> で表示

- Given "qni state set \"|+>\"" を実行
- And "qni add S --qubit 0 --step 0" を実行
- When "qni run --symbolic --basis y" を実行
- Then 標準出力:

  ```text
  |+i>
  ```

## Scenario: qni run --symbolic --basis bell は |Φ+> を |Φ+> と表示

- Given "qni state set \"|Φ+>\"" を実行
- When "qni run --symbolic --basis bell" を実行
- Then 標準出力:

  ```text
  |Φ+>
  ```

## Scenario: qni run --symbolic --basis bell は Z を適用した |Φ+> を |Φ-> と表示

- Given "qni state set \"|Φ+>\"" を実行
- And "qni add Z --qubit 0 --step 0" を実行
- When "qni run --symbolic --basis bell" を実行
- Then 標準出力:

  ```text
  |Φ->
  ```

## Scenario: qni run --symbolic --basis bell は alpha|Φ+> + beta|Φ-> を表示

- Given "qni state set \"alpha|Φ+> + beta|Φ->\"" を実行
- When "qni run --symbolic --basis bell" を実行
- Then 標準出力:

  ```text
  alpha|Φ+> + beta|Φ->
  ```

## Scenario: qni run --symbolic は Y ゲートの純虚数係数を表示

- Given "qni add Y --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  1.0i|1>
  ```

## Scenario: qni run --symbolic は未束縛の角度変数を記号のまま表示

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  cos(theta/2)|0> + sin(theta/2)|1>
  ```

## Scenario: qni run --symbolic は単純な角度式を簡約して表示

- Given "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  cos(alpha)|0> + sin(alpha)|1>
  ```

## Scenario: qni run --symbolic は具体的な π 角度も exact に表示

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  sqrt(2)/2|0> + sqrt(2)/2|1>
  ```

## Scenario: qni run --symbolic は 2 qubit の空回路を ket 形式で表示

- Given 空の 2 qubit 回路がある
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  |00>
  ```

## Scenario: qni run --symbolic は同じ step に 2 qubit の独立した H がある回路を ket 形式で表示

- Given 次の回路図がある:

  ```text
      ┌───┐
  q0: ┤ H ├
      ├───┤
  q1: ┤ H ├
      └───┘
  ```
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  1/2|00> + 1/2|01> + 1/2|10> + 1/2|11>
  ```

## Scenario: qni run --symbolic は 3 qubit 回路を計算基底で表示 は成功

- Given 空の 3 qubit 回路がある
- When "qni run --symbolic" を実行
- Then コマンドは成功

## Scenario: qni run --symbolic は 3 qubit 回路を計算基底で表示

- Given 空の 3 qubit 回路がある
- When "qni run --symbolic" を実行
- Then 標準出力:

  ```text
  |000>
  ```
