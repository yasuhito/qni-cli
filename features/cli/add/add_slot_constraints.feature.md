# Feature: add コマンドのスロット制約

qni-cli の利用者として、既存のゲートを誤って上書きしないために、
すでに埋まっているスロットに対する qni add は失敗してほしい。

## Scenario: 既存スロットに対する qni add は失敗

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni add H --qubit 0 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  target slot is occupied: cols[0][0] = "H"
  ```
