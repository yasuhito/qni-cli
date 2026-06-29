# Feature: qni view の制御付きゲート表示

qni-cli のユーザとして、制御付き量子回路を確認するために、
qni view で制御点と対象ゲートの接続が分かるアスキーアート表示を見たい。

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

## Scenario: qni view は制御付き √X ゲートを表示

- Given "qni add √X --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤√X ├
      └───┘
  ```

## Scenario: qni view は制御付き T† ゲートを表示

- Given "qni add T† --control 0 --qubit 1 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
  q0: ──■──
      ┌─┴─┐
  q1: ┤ T†├
      └───┘
  ```

## Scenario: qni view は制御付き Rz ゲートを表示

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

