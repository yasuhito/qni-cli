# Feature: 旧版の数値係数付き π 式を読み込む

qni-cli の利用者として
旧版で保存した回路を引き続き実行するために
積の途中の数値係数に続く π と、その保存表記を読み込みたい。

## Scenario: 保存済みの旧表記を持つ回路を実行できる

- Given 作業ディレクトリに "circuit.json" を作る:

  ```json
  { "qubits": 1, "cols": [["Ry(2*2π)"]] }
  ```

- When "qni run" を実行
- Then コマンドは成功

## Scenario: 積の途中の係数と pi の暗黙積を使える

- When "qni add Ry --angle '2*2pi' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: Unicode の π と分母を持つ旧式を使える

- When "qni add Ry --angle '2*3π/4' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: 負の係数と pi の別名を持つ旧式を使える

- When "qni add Ry --angle '-2*3pi_4' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: 小数係数に続く暗黙積を使える

- When "qni add Ry --angle '0.5*2pi' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: 積の右の負の係数に続く pi を使える

- When "qni add Ry --angle '1.5*-2pi' --qubit 0 --step 0" を実行
- Then コマンドは成功

## Scenario: 除算の分母に続く曖昧な暗黙積は拒否する

- When "qni add Ry --angle '1/2pi' --qubit 0 --step 0" を実行
- Then 終了コードは 1
