# Feature: qni run basic state vectors

qni-cli のユーザとして
空回路と固定 1 qubit gate の数値状態ベクトルを確認するために
qni run の標準出力を責務別に検証したい。


## Scenario: qni run コマンドは成功

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then コマンドは成功

## Scenario: qni run は状態ベクトルを標準出力に表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865475,0.7071067811865475
  ```

## Scenario: qni run は何もゲートを適用しない |0> の状態ベクトルを標準出力に表示

- Given 空の 1 qubit 回路がある
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は X ゲートの状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0
  ```

## Scenario: qni run は Y ゲートの状態ベクトルを標準出力に表示

- Given "qni add Y --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0i
  ```

## Scenario: qni run は Z ゲートの状態ベクトルを標準出力に表示

- Given "qni add Z --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は S ゲートの状態ベクトルを標準出力に表示

- Given "qni add S --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は S† ゲートの状態ベクトルを標準出力に表示

- Given "qni add S† --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は T ゲートの状態ベクトルを標準出力に表示

- Given "qni add T --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は T† ゲートの状態ベクトルを標準出力に表示

- Given "qni add T† --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は √X ゲートの状態ベクトルを標準出力に表示

- Given "qni add √X --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.5+0.5i,0.5-0.5i
  ```

## Scenario: qni run は Phase ゲートの状態ベクトルを標準出力に表示

- Given "qni add P --angle π/3 --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は Rx ゲートの状態ベクトルを標準出力に表示

- Given "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865476,-0.7071067811865475i
  ```

## Scenario: qni run は Ry ゲートの状態ベクトルを標準出力に表示

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865476,0.7071067811865475
  ```

## Scenario: qni run は Rz ゲートの状態ベクトルを標準出力に表示

- Given "qni add Rz --angle π/2 --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865476-0.7071067811865475i,0.0
  ```

## Scenario: qni run は |1> に H ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add H --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865475,-0.7071067811865475
  ```

## Scenario: qni run は |1> に X ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add X --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0
  ```

## Scenario: qni run は |1> に Y ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add Y --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  -1.0i,0.0
  ```

## Scenario: qni run は |1> に Z ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add Z --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,-1.0
  ```

## Scenario: qni run は |1> に S ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add S --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0i
  ```

## Scenario: qni run は |1> に S† ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add S† --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,-1.0i
  ```

## Scenario: qni run は |1> に T ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add T --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.7071067811865476+0.7071067811865475i
  ```

## Scenario: qni run は |1> に T† ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add T† --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.7071067811865476-0.7071067811865475i
  ```

## Scenario: qni run は |1> に √X ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add √X --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.5-0.5i,0.5+0.5i
  ```

## Scenario: qni run は |1> に Phase ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add P --angle π/3 --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.5000000000000001+0.8660254037844386i
  ```

## Scenario: qni run は |1> に Rx ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add Rx --angle π/2 --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  -0.7071067811865475i,0.7071067811865476
  ```

## Scenario: qni run は |1> に Ry ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add Ry --angle π/2 --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  -0.7071067811865475,0.7071067811865476
  ```

## Scenario: qni run は |1> に Rz ゲートを適用した状態ベクトルを標準出力に表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add Rz --angle π/2 --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.7071067811865476+0.7071067811865475i
  ```
