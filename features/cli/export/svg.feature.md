# Feature: qni export SVG

qni-cli の利用者として
LaTeX 処理系を導入せずに回路図を保存できるように
qni export --svg で回路図を SVG 形式に直接書き出したい。

## Scenario: qni export --svg は LaTeX 処理系がない環境でも成功する

- Given "qni add H --qubit 0 --step 0" を実行
- Given 環境変数 "PATH" を "" に設定する
- When "qni export --svg" を実行
- Then コマンドは成功

## Scenario: qni export --svg は SVG を標準出力へ書き出す

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --svg" を実行
- Then 標準出力に次を含む:

  ```text
  <svg
  ```

## Scenario: qni export --svg --output は SVG ファイルを書き出す

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- Given "qni add SWAP --qubit 0,1 --step 1" を実行
- Given "qni add Measure --name result --qubit 1 --step 2" を実行
- When "qni export --svg --light --output circuit.svg" を実行
- Then 作業ディレクトリのファイル "circuit.svg" は次を含む:

  ```text
  <svg
  ```

## Scenario: qni export --svg は長い上キャプションを表示領域に収める

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --svg --caption 'A caption wider than the circuit' --caption-position top --caption-size 48" を実行
- Then 標準出力に次を含む:

  ```text
  data-caption-position="top"
  ```

## Scenario: qni export --svg は長い下キャプションを表示領域に収める

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --svg --caption 'A caption wider than the circuit' --caption-position bottom --caption-size 48" を実行
- Then 標準出力に次を含む:

  ```text
  data-caption-position="bottom"
  ```

## Scenario: qni export --svg は既定でダークテーマを使う

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --svg" を実行
- Then 標準出力に次を含む:

  ```text
  color:#fff
  ```

## Scenario: qni export --svg --light はライトテーマを使う

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni export --svg --light" を実行
- Then 標準出力に次を含む:

  ```text
  color:#111
  ```
