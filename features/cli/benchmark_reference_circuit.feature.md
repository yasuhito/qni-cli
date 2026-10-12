# Feature: 参照回路とのユニタリ等価性による採点

## Scenario: 同じ変換を別のゲート列で実装しても合格になる

- When "qni benchmark run test/benchmark-reference/strict.md test/benchmark-reference/equivalent.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS ReferenceIdentity
  ```

## Scenario: 既定ではグローバル位相も厳密に比較する

- When "qni benchmark run test/benchmark-reference/strict.md test/benchmark-reference/minus.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL ReferenceIdentity
  ```

## Scenario: 明示指定すると行列全体の共通位相を許容する

- When "qni benchmark run test/benchmark-reference/phase.md test/benchmark-reference/minus.qni" を実行
- Then 標準出力に次を含む:
  ```text
  PASS ReferenceIdentity
  ```

## Scenario: 基底入力によって異なる位相は許容しない

- When "qni benchmark run test/benchmark-reference/phase.md test/benchmark-reference/relative.qni" を実行
- Then 標準出力に次を含む:
  ```text
  FAIL ReferenceIdentity
  ```

## Scenario: 量子ビット数の不一致を説明する

- When "qni benchmark run test/benchmark-reference/strict.md test/benchmark-reference/wider.qni" を実行
- Then 標準出力に次を含む:
  ```text
  qubit count mismatch: submitted 2, reference 1
  ```
