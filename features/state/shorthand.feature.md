# Feature: qni state shorthand

qni-cli のユーザとして
よく使う 1 qubit 初期状態を短い表記で保存するために
qni state set の shorthand を使いたい

## Scenario: qni state set は |+> の保存に成功する

- When "qni state set \"|+>\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |+> を shorthand のまま表示する

- Given "qni state set \"|+>\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |+>
  ```

## Scenario: qni state set は |-> の保存に成功する

- When "qni state set \"|->\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |-> を shorthand のまま表示する

- Given "qni state set \"|->\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |->
  ```

## Scenario: qni state set は |+i> の保存に成功する

- When "qni state set \"|+i>\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |+i> を shorthand のまま表示する

- Given "qni state set \"|+i>\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |+i>
  ```

## Scenario: qni state set は |-i> の保存に成功する

- When "qni state set \"|-i>\"" を実行
- Then コマンドは成功

## Scenario: qni state show は |-i> を shorthand のまま表示する

- Given "qni state set \"|-i>\"" を実行
- When "qni state show" を実行
- Then 標準出力:

  ```text
  |-i>
  ```
