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

## Scenario: 下の量子ビットの注記は上の量子ビットのゲート箱を分断しない

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add P --angle π/2 --control 1 --qubit 0 --step 1" を実行
- And "qni add P --angle π/4 --control 2 --qubit 0 --step 2" を実行
- And "qni add H --qubit 1 --step 3" を実行
- And "qni add P --angle π/2 --control 2 --qubit 1 --step 4" を実行
- And "qni add H --qubit 2 --step 5" を実行
- And "qni add SWAP --qubit 0,2 --step 6" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
             π/2  π/4
      ┌───┐┌───┐┌───┐
  q0: ┤ H ├┤ P ├┤ P ├────────────────X─
      └───┘└─┬─┘└─┬─┘                │
             │    │         π/2      │
             │    │  ┌───┐┌───┐      │
  q1: ───────■────│──┤ H ├┤ P ├──────│─
                  │  └───┘└─┬─┘┌───┐ │
  q2: ────────────■─────────■──┤ H ├─X─
                               └───┘
  ```
