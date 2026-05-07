# Feature: qni view の複数量子ビット配置表示

qni-cli のユーザとして、複数量子ビットの回路を確認するために、
qni view で量子ビット間の接続や同一ステップのゲート配置が分かる表示を見たい。

## Scenario: qni view は SWAP ゲートを表示

- Given "qni add SWAP --qubit 0,1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ─X─
       │
  q1: ─X─
  ```

## Scenario: 同じステップの 2 量子ビットに H がある回路を表示

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
