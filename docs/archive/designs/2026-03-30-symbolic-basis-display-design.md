# 記号的な基底表示の設計

## 課題

現在の `qni run --symbolic` は、状態ベクトルを常に計算基底 `|0>`, `|1>` で表示する。

そのため [basis_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/basis_change.feature) のように Hadamard ゲートで基底変換を学ぶ場面では、

- `0.6|0> + 0.8|1>` に `H` を適用した結果が `0.7√2|0> - 0.1√2|1>` のように展開形で表示される
- 学習者が見たい `0.6|+> + 0.8|->` という形で読めない
- `X 基底` という言葉だけでは、`|+>`, `|->` とどう結びつくのかが直感的に伝わりにくい

という読みづらさがある。

## 目標

- `qni run --symbolic` の表示基底を切り替えられるようにする
- 第 1 段では 1 量子ビットの記号表示に限って `X` 基底を追加する
- 機能仕様では `|+>`, `|->` をそのまま書けるステップを用意し、BasisChange の意図がまっすぐ読めるようにする

## 対象外

- 数値実行 `qni run` の出力形式を変えること
- 最初から 2 量子ビット以上の任意の基底展開をサポートすること
- `Y` 基底や一般のユニタリ基底まで一気に広げること
- 内部の状態ベクトル表現そのものを `|+>`, `|->` 基底へ持ち替えること

## 検討した方針

### 1. 期待値文字列だけ機能仕様側で展開して吸収する

- 例: `0.6|+> + 0.8|->` をステップ定義側で `0.7√2|0> - 0.1√2|1>` へ直して比較する
- 実装は軽い
- ただし CLI 本体の表現力は増えず、学習者が実験で `qni run --symbolic` を叩いたときの読みやすさも改善しない

### 2. CLI に `--basis x` を追加し、機能仕様は `|+>, |-> 基底` のステップを使う

- CLI では短く `x` を指定できる
- 機能仕様では `X 基底` より直感的な `|+>, |-> 基底` と書ける
- `basis_change.feature` だけでなく対話的な CLI 実験でも恩恵がある

### 3. 基底専用の別コマンドを作る

- 例: `qni run --symbolic-x-basis` や `qni basis x`
- 意図は明確
- ただし既存の `qni run --symbolic` と機能が分かれ、拡張点も増える

## 決定

方針 2 を採用する。

- CLI は `qni run --symbolic --basis x` を追加する
- 既定値は従来どおり計算基底なので、既存の機能仕様や既存ユーザーは壊さない
- 機能仕様用 DSL は `Then |+>, |-> 基底での状態ベクトルは:` を追加する

これにより、

- CLI の機能追加は最小限で済む
- `basis_change.feature` は教材として読みやすくなる
- 将来 `--basis y` や `--basis z` を足す余地も残る

## 利用者向け API

### CLI

新しい基底オプションを追加する。

```text
qni run --symbolic --basis x
```

期待する振る舞い:

- `--basis` 未指定時は従来どおり計算基底 `|0>`, `|1>` で出す
- `--basis x` 指定時は 1 量子ビットの記号出力を `|+>`, `|->` で返す
- 第 1 段では `x` 以外を指定したらエラーとする

### 機能仕様用 DSL

新しい読みやすい比較ステップを追加する。

```gherkin
Then |+>, |-> 基底での状態ベクトルは:
  """
  0.6|+> + 0.8|->
  """
```

このステップは内部で `qni run --symbolic --basis x` を実行し、その出力と比較する。

`Then X 基底での状態ベクトルは:` は数学的には正しいが、学習者にとっては `|+>`, `|->` を明示したほうが読みやすいので、第 1 段では採用しない。

## 出力モデル

1 量子ビットの計算基底表示

```text
a|0> + b|1>
```

を `X` 基底へ変換した出力は

```text
((a + b)/sqrt(2))|+> + ((a - b)/sqrt(2))|->
```

に相当する。

たとえば:

- `H|0> = |+>`
- `H|1> = |->`
- `H(0.6|0> + 0.8|1>) = 0.6|+> + 0.8|->`
- `H(alpha|0> + beta|1>) = alpha|+> + beta|->`

特に BasisChange の機能仕様では、Hadamard を適用したあとに `|+>`, `|->` で読むこと自体が学習目標に合っている。

## 内部設計

### 1. CLI オプション解析

[lib/qni/cli.rb](/home/yasuhito/Work/qni-cli/lib/qni/cli.rb) の `run` サブコマンドへ `--basis BASIS` を追加する。

- `--symbolic` を指定した実行時だけ意味を持つ
- `x` のみ許可する
- `qni run --basis x` のように `--symbolic` なしで使ったらエラーにしてよい

### 2. 記号表示レンダラー

[lib/qni/symbolic_state_renderer.rb](/home/yasuhito/Work/qni-cli/lib/qni/symbolic_state_renderer.rb) と [libexec/qni_symbolic_run.py](/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py) に基底指定を渡せるようにする。

第 1 段では、

- まず従来どおり計算基底の記号状態を得る
- 1 量子ビットのときだけ `x` 基底の係数へ変換する
- その係数を `|+>`, `|->` のケット和として整形する

という二段階で実装する。

内部の状態ベクトルを全面的に持ち替える必要はない。

### 3. ステップ定義

[features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) に

- `Then |+>, |-> 基底での状態ベクトルは:`

を追加する。

正規化ルールも少し広げて、

- `|+>`, `|->`
- `α`, `β`
- `θ`
- `π`
- `√2`

を期待値に自然に書ける状態を保つ。

## 検証ルール

- `--basis x` は `--symbolic` と一緒のときだけ受け付ける
- 第 1 段では 1 量子ビット以外に `--basis x` を使ったらエラーにする
- 未対応の基底名は明示的にエラーにする
- 出力では係数 1 は省略し、既存の記号表示ルールに寄せる

## テスト

先に機能仕様を追加・更新する。

### 新規・更新する機能仕様

- `features/qni_run.feature`
  - `qni run --symbolic --basis x` の受け入れを追加する
- `features/katas/basic_gates/basis_change.feature`
  - `0.6|+> + 0.8|->`
  - `alpha|+> + beta|->`
  のような抽象度の高い期待値へ置き換える

### 単体・結合チェック

- レンダラーの基底変換処理を単体テストで押さえる
- `bundle exec cucumber features/qni_run.feature features/katas/basic_gates/basis_change.feature`
- 最後に `bundle exec rake check`

## 期待する結果

BasisChange の機能仕様は、

- 「H をかけたら何が起きるか」
- 「どの基底で読むと分かりやすいか」

をそのまま書けるようになる。

たとえば次のシナリオが自然に読める。

```gherkin
Scenario: H ゲートは 0.6|0> + 0.8|1> を |+>, |-> 基底で表すと 0.6|+> + 0.8|-> になる
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ H ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    0.6|+> + 0.8|->
    """
```
