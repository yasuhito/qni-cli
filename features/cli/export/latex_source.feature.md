# Feature: qni export の LaTeX ソース出力

qni-cli のユーザーとして
外部の LaTeX ツールで回路図を利用できるように
qni export --latex-source で qcircuit 形式の LaTeX を出力したい。

## Scenario: qni export --latex-source は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then コマンドは成功

## Scenario: qni export --latex-source は qcircuit パッケージを出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \usepackage[braket, qm]{qcircuit}
  ```

## Scenario: qni export --latex-source は xcolor パッケージを出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \usepackage{xcolor}
  ```

## Scenario: qni export --latex-source は Qcircuit 本体を出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \Qcircuit
  ```

## Scenario: qni export --latex-source は H ゲートを LaTeX として出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \gate{\mathrm{H}}
  ```

## Scenario: qni export --latex-source はデフォルトでダークテーマの色を出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \color{white}
  ```

## Scenario: qni export --latex-source --light は成功する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --light" を実行
- Then コマンドは成功

## Scenario: qni export --latex-source --light はライトテーマの色を出力する

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --light" を実行
- Then 標準出力に次を含む:

  ```text
  \color{black}
  ```

## Scenario: qni export --latex-source --light はダークテーマの色を出力しない

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --latex-source --light" を実行
- Then 標準出力に次を含まない:

  ```text
  \color{white}
  ```

## Scenario: qni export --latex-source は CNOT の制御点を出力する

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \ctrl{1}
  ```

## Scenario: qni export --latex-source は CNOT の標的を出力する

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \targ
  ```

## Scenario: qni export --latex-source は SWAP の qswap を出力する

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \qswap
  ```

## Scenario: qni export --latex-source は SWAP の qwx を出力する

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni export --latex-source" を実行
- Then 標準出力に次を含む:

  ```text
  \qwx[-1]
  ```
