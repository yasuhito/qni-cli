# Feature: 計算基底の名前なし測定

qni-cli の利用者として、量子回路を計算基底で1回測定し、
量子ビットごとの測定値と測定を含む回路図を確認したい。

## Scenario: qni add Measure は名前なし測定を Qni 互換形式で保存する

- When "qni add Measure --qubit 0 --step 0" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [["Measure"]]
  }
  ```

## Scenario: qni run は名前なし測定の値を表示する

- Given "qni add X --qubit 0 --step 0" を実行
- Given "qni add Measure --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  q0=1
  ```

## Scenario: qni run は既存の Qni 互換回路にある名前なし測定を実行する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": [["X"], ["Measure"]]
  }
  ```

- When "qni run" を実行
- Then 標準出力:

  ```text
  q0=1
  ```

## Scenario: qni run は同じステップの SWAP と名前なし測定を実行する

- Given "qni state set \"|100>\"" を実行
- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- Given "qni add Measure --qubit 2 --step 0" を実行
- Given "qni add Measure --qubit 1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  q2=0
  q1=1
  ```

## Scenario: 測定後のゲートは確率に従って収縮した状態へ適用される

- Given "qni add H --qubit 0 --step 0" を実行
- Given "qni add Measure --qubit 0 --step 1" を実行
- Given "qni add X --qubit 0 --step 2" を実行
- Given "qni add Measure --qubit 0 --step 3" を実行
- When "qni run" を実行
- Then 量子ビット 0 の2回の測定値は異なる

## Scenario: 測定のない qni run は従来の状態ベクトルを表示する

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0
  ```

## Scenario: qni run --symbolic は測定を含む回路では失敗する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then コマンドは失敗

## Scenario: qni run --symbolic は測定を含む回路で明確なエラーを表示する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni run --symbolic" を実行
- Then 標準エラー:

  ```text
  --symbolic cannot be used with a circuit containing measurements
  ```

## Scenario: qni view は名前なし測定を表示する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 標準出力に次を含む:

  ```text
  Measure
  ```

## Scenario: qni export は名前なし測定を LaTeX の測定記号として出力する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \meter
  ```

## Scenario: qni export は名前なし測定を含む PNG 回路図を生成する

- Given "qni add Measure --qubit 0 --step 0" を実行
- When "qni export --png --light --output measurement.png" を実行
- Then "measurement.png" は PNG 画像である

## Scenario: qni add ヘルプは名前なし測定の追加方法を説明する

- When "qni add --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni add Measure --qubit 0 --step 0
  ```

## Scenario: qni run ヘルプは測定回路を1回実行することを説明する

- When "qni run --help" を実行
- Then 標準出力に次を含む:

  ```text
  A circuit containing Measure is run once and prints qN=0 or qN=1 for each measured qubit.
  ```
