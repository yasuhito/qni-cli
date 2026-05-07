# Feature: qni run の 2 量子ビットゲート

qni-cli の利用者として
2 量子ビットゲートの数値状態ベクトルを確認するために
qni run が SWAP と CNOT の結果を表示することを検証したい。


## Scenario: qni run は SWAP を |00> に適用した状態ベクトルを標準出力に表示

- Given 空の 2 量子ビット回路がある
- And "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0,0.0,0.0
  ```

## Scenario: qni run は SWAP を |01> に適用した状態ベクトルを標準出力に表示

- Given 2 量子ビットの初期状態が "|01>" である
- And "qni add SWAP --qubit 0,1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.0,1.0,0.0
  ```

## Scenario: qni run は SWAP を |10> に適用した状態ベクトルを標準出力に表示

- Given 2 量子ビットの初期状態が "|10>" である
- And "qni add SWAP --qubit 0,1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0,0.0,0.0
  ```

## Scenario: qni run は SWAP を |11> に適用した状態ベクトルを標準出力に表示

- Given 2 量子ビットの初期状態が "|11>" である
- And "qni add SWAP --qubit 0,1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.0,0.0,1.0
  ```

## Scenario: qni run は CNOT を |00> に適用した状態ベクトルを標準出力に表示

- Given 空の 2 量子ビット回路がある
- And "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  1.0,0.0,0.0,0.0
  ```

## Scenario: qni run は CNOT を |01> に適用した状態ベクトルを標準出力に表示

- Given 2 量子ビットの初期状態が "|01>" である
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,1.0,0.0,0.0
  ```

## Scenario: qni run は CNOT を |10> に適用した状態ベクトルを標準出力に表示

- Given 2 量子ビットの初期状態が "|10>" である
- And "qni add X --control 0 --qubit 1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.0,0.0,1.0
  ```

## Scenario: qni run は CNOT を |11> に適用した状態ベクトルを標準出力に表示

- Given 2 量子ビットの初期状態が "|11>" である
- And "qni add X --control 0 --qubit 1 --step 2" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.0,0.0,1.0,0.0
  ```
