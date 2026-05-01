# Feature: qni view の multi qubit layout 表示

qni-cli のユーザとして、複数 qubit の回路を確認するために、
qni view で qubit 間の接続や同一 step の gate 配置が分かる表示を見たい。

## Scenario: qni view は SWAP ゲートを表示

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ─X─
       │
  q1: ─X─
  ```

## Scenario: 同じ step の 2 qubit に H がある回路を表示

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add H --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ H ├
      ├───┤
  q1: ┤ H ├
      └───┘
  ```

