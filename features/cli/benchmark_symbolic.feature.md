# Feature: 記号引数を持つ固定幅回路の主採点

固定幅で連続引数だけが変わる課題は、全定義域での記号証明だけを合格条件とする。

## Scenario: 記号JSONを記録する方法を案内する

- When "qni research record --help" を実行
- Then 標準出力に次を含む:

  ```text
  neutral-symbolic-circuit-json-v1
  ```

## Scenario: すべての角度に対応する標準解

- When 記号採点の標準解スイートを実行する
- Then 記号採点の全6課題が証明済みになる

## Scenario: 固定値だけの解を拒否する

- When 記号採点へ固定角度の解を提出する
- Then 記号採点の結果は未証明の不合格になる

## Scenario: 全体位相だけが異なる状態準備

- When 記号採点へ全体位相だけが異なる状態準備を提出する
- Then 記号採点の結果は証明済みになる

## Scenario: 入力依存の位相はユニタリの全体位相ではない

- When 記号採点へ入力依存の位相を持つ制御回転を提出する
- Then 記号採点の結果は未証明の不合格になる

## Scenario: 記号提出物の研究試行を旧結果から分離する

- When 記号採点の研究試行を記録する
- Then 記号研究試行の提出プロトコルは neutral-symbolic-circuit-json-v1 になる

## Scenario: 文字列を実行しない

- When 記号採点へ数式文字列を提出する
- Then 記号採点の結果は未証明の不合格になる
