# Feature: 名前付き測定と古典条件付きゲート

qni-cli の利用者として、測定結果を名前付き古典ビットへ保存し、
その値が 1 のときだけ後続の量子ゲートを実行したい。

## Scenario: qni add Measure は名前付き測定を Qni 互換形式で保存する

- When "qni add Measure --name input --qubit 0 --step 0" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [["Measure>input"]]
  }
  ```

## Scenario: qni add は古典条件付きゲートを Qni 互換形式で保存する

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- When "qni add X --if input --qubit 0 --step 1" を実行
- Then "circuit.json" の JSON 内容:

  ```json
  {
    "qubits": 1,
    "cols": [["Measure>input"], ["X<input"]]
  }
  ```

## Scenario: 古典ビットが1なら条件付きゲートを実行する

- Given "qni add X --qubit 0 --step 0" を実行
- Given "qni add Measure --name input --qubit 0 --step 1" を実行
- Given "qni add X --if input --qubit 0 --step 2" を実行
- Given "qni add Measure --qubit 0 --step 3" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  input=1
  q0=0
  ```

## Scenario: 古典ビットが0なら条件付きゲートを実行しない

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- Given "qni add X --if input --qubit 0 --step 1" を実行
- Given "qni add Measure --qubit 0 --step 2" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  input=0
  q0=0
  ```

## Scenario: 既存の Qni 互換回路にある名前付き測定と古典条件を実行する

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": [["X"], ["Measure>input"], ["X<input"], ["Measure"]]
  }
  ```

- When "qni run" を実行
- Then 標準出力:

  ```text
  input=1
  q0=0
  ```

## Scenario: 未定義の古典ビットを参照すると実行に失敗する

- Given "qni add X --if missing --qubit 0 --step 0" を実行
- When "qni run" を実行
- Then コマンドは失敗

## Scenario: 未定義の古典ビットのエラーは名前と参照ステップを示す

- Given 次の circuit.json がある:

  ```json
  {
    "qubits": 1,
    "cols": [[1], [1], ["X<missing"]]
  }
  ```

- When "qni run" を実行
- Then 標準エラー:

  ```text
  undefined classical bit "missing" referenced at step 2
  ```

## Scenario: 同じ名前へ複数回測定すると実行に失敗する

- Given "qni add Measure --name result --qubit 0 --step 0" を実行
- Given "qni add Measure --name result --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then コマンドは失敗

## Scenario: 同じ名前への複数測定のエラーは名前とステップを示す

- Given "qni add Measure --name result --qubit 0 --step 0" を実行
- Given "qni add Measure --name result --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準エラー:

  ```text
  classical bit "result" is measured more than once at step 1
  ```

## Scenario: 名前なし測定は古典条件から参照できない

- Given "qni add Measure --qubit 0 --step 0" を実行
- Given "qni add X --if q0 --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準エラー:

  ```text
  undefined classical bit "q0" referenced at step 1
  ```

## Scenario: qni view は測定名を表示する

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- Given "qni add X --if input --qubit 0 --step 1" を実行
- When "qni view" を実行
- Then 標準出力に次を含む:

  ```text
  Measure>input
  ```

## Scenario: qni view は古典条件を表示する

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- Given "qni add X --if input --qubit 0 --step 1" を実行
- When "qni view" を実行
- Then 標準出力に次を含む:

  ```text
  X<input
  ```

## Scenario: qni export は測定名を LaTeX に出力する

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- Given "qni add X --if input --qubit 0 --step 1" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  $>\mathrm{input}$
  ```

## Scenario: qni export は古典条件を LaTeX に出力する

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- Given "qni add X --if input --qubit 0 --step 1" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \mathrm{X}<\mathrm{input}
  ```

## Scenario: qni export は測定名と古典条件を含む PNG 回路図を生成する

- Given "qni add Measure --name input --qubit 0 --step 0" を実行
- Given "qni add X --if input --qubit 0 --step 1" を実行
- When "qni export --png --light --output conditional.png" を実行
- Then "conditional.png" は PNG 画像である

## Scenario: qni add ヘルプは古典ビット名と古典条件を例示する

- When "qni add --help" を実行
- Then 標準出力に次を含む:

  ```text
  qni add X --if input --qubit 0 --step 2
  ```
