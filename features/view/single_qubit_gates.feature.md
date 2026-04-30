# Feature: qni view の単一 qubit gate 表示

qni-cli のユーザとして、1 qubit の量子回路を確認するために、
qni view で単一 qubit gate のアスキーアート表示を見たい。

## Scenario: qni view コマンドは成功

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then コマンドは成功

## Scenario: qni view は H ゲートを表示

- Given "qni add H --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ H ├
      └───┘
  ```

## Scenario: qni view は X ゲートを表示

- Given "qni add X --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ X ├
      └───┘
  ```

## Scenario: qni view は Y ゲートを表示

- Given "qni add Y --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ Y ├
      └───┘
  ```

## Scenario: qni view は Z ゲートを表示

- Given "qni add Z --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ Z ├
      └───┘
  ```

## Scenario: qni view は S ゲートを表示

- Given "qni add S --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ S ├
      └───┘
  ```

## Scenario: qni view は T ゲートを表示

- Given "qni add T --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ T ├
      └───┘
  ```

## Scenario: qni view は √X ゲートを表示

- Given "qni add √X --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤√X ├
      └───┘
  ```

## Scenario: qni view は S† ゲートを表示

- Given "qni add S† --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ S†├
      └───┘
  ```

## Scenario: qni view は T† ゲートを表示

- Given "qni add T† --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
      ┌───┐
  q0: ┤ T†├
      └───┘
  ```

## Scenario: qni view は Phase ゲートを表示

- Given "qni add P --angle π/3 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/3
      ┌───┐
  q0: ┤ P ├
      └───┘
  ```

## Scenario: qni view は Rx ゲートを表示

- Given "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/2
      ┌───┐
  q0: ┤ Rx├
      └───┘
  ```

## Scenario: qni view は Ry ゲートを表示

- Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/2
      ┌───┐
  q0: ┤ Ry├
      └───┘
  ```

## Scenario: qni view は Rz ゲートを表示

- Given "qni add Rz --angle π/2 --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 回路図:

  ```text
        π/2
      ┌───┐
  q0: ┤ Rz├
      └───┘
  ```

