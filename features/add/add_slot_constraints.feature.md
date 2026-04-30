# Feature: add コマンドのスロット制約

qni-cli のユーザとして、既存のゲートを誤って上書きしないために、
すでに埋まっているスロットへの add は失敗してほしい。

## Scenario: 既存スロットへの qni add は失敗

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni add H --qubit 0 --step 0" を実行
- Then コマンドは失敗して標準エラー:

  ```text
  target slot is occupied: cols[0][0] = "H"
  ```
