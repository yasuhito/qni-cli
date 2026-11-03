# Feature: 角度式の ASCII 表記 pi を円周率として扱う

qni-cli の利用者として
π を入力しにくい環境でも円周率の角度を使うために
角度式の pi と -pi が π と -π と同じ意味になることを確認したい。

## Scenario: qni run は角度 pi を π として P ゲートの状態ベクトルを表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add P --angle pi --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865475,-0.7071067811865475
  ```

## Scenario: qni run は角度 -pi を -π として P ゲートの状態ベクトルを表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add P --angle=-pi --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865475,-0.7071067811865475
  ```

## Scenario: qni add は角度 pi を π として circuit.json に保存する

- When "qni add P --angle pi --qubit 0 --step 0" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [["P(π)"]]
  }
  ```

## Scenario: qni variable set は円周率と同じ名前の変数を作らない

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni variable set pi π/2" を実行
- Then 標準エラー:

  ```text
  invalid variable name: pi
  ```
