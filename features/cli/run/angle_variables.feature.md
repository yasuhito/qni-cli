# Feature: qni run の角度変数

qni-cli の利用者として
角度変数と単純な角度式を使った回路を数値実行するために
qni run が変数解決後の状態ベクトルを表示することを確認したい。


## Scenario: qni run は角度変数を解決して Ry ゲートの状態ベクトルを表示

- Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
- And "qni variable set theta π/2" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865476,0.7071067811865475
  ```

## Scenario: qni run は負の角度変数を解決して P ゲートの状態ベクトルを表示

- Given "qni add X --qubit 0 --step 0" を実行
- And "qni add P --angle=-alpha --qubit 0 --step 1" を実行
- And "qni variable set alpha π/3" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.5000000000000001-0.8660254037844386i
  ```

## Scenario: qni run は単純な角度式と変数を解決して Ry ゲートの状態ベクトルを表示

- Given "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
- And "qni variable set alpha π/4" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865476,0.7071067811865475
  ```

## Scenario: qni run は負の単純な角度式と変数を解決して Ry ゲートの状態ベクトルを表示

- Given "qni add Ry --angle -2*alpha --qubit 0 --step 0" を実行
- And "qni variable set alpha π/4" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865476,-0.7071067811865475
  ```
