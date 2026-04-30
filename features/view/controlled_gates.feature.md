# Feature: qni view の controlled gate 表示

qni-cli のユーザとして、制御付き量子回路を確認するために、
qni view で control と target の接続が分かるアスキーアート表示を見たい。

## Scenario: qni view は CNOT ゲートを表示

- Given "qni add X --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
  ```

## Scenario: qni view は control 付き √X ゲートを表示

- Given "qni add √X --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤√X ├
      └───┘
  ```

## Scenario: qni view は control 付き T† ゲートを表示

- Given "qni add T† --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ T†├
      └───┘
  ```

## Scenario: qni view は control 付き Rz ゲートを表示

- Given "qni add Rz --angle π/2 --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
        π/2
      ┌─┴─┐
  q1: ┤ Rz├
      └───┘
  ```

