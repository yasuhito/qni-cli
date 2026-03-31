# Angled Gate Stacked Angle Design

Date: 2026-03-31

## Goal

`Rx`, `Ry`, `Rz`, `P` のような回転ゲートを、横長の箱ではなく「角度を箱の上に中央揃えで載せる」正規形で表示し、その形を ASCII parser でもそのまま受けられるようにする。

これにより、固定ゲートと回転ゲートの箱サイズをそろえ、`qni view` と feature の ASCII 回路記述を読みやすくする。

## Non-Goals

- 旧式の横長箱表記との後方互換
- 量子回路以外の注釈行の導入
- fixed gate の見た目変更
- LaTeX / PNG export の見た目変更

## Canonical ASCII Form

回転ゲートの canonical form は次の 4 行とする。

```text
          2θ
      ┌───┐
q0: ──┤ Ry├──
      └───┘
```

ポイント:

- 角度は箱の真上に中央揃えで置く
- 箱の幅は固定ゲートと同じ小箱とする
- 箱の中には gate 名だけを書く
- wire は箱の左右で通常どおり伸ばす
- `Rx`, `Ry`, `Rz`, `P` はすべてこの形式に統一する

## Behavioral Changes

### qni view

- 回転ゲートを含む step は 4 行で描画する
- 同じ step の他 qubit 側には空の angle 行を挿入して高さをそろえる
- 回転ゲートを含まない step は従来どおり 3 行のまま

### ASCII parser

- 新しい 4 行形式だけを正規入力として受ける
- 旧式の横長箱:
  - `┤ Ry(2θ) ├`
  - `┤ Rx(π/2) ├`
  - などは受けない
- parser は angle 行と gate 名行を結びつけて `Ry(2*theta)` のような内部表現へ正規化する

### Feature DSL

- `When 次の回路を適用:` では、新しい 4 行形式の回転ゲートを書く
- `amplitude_change.feature` など回転ゲートを含む feature は canonical form に更新する

## Design

### Renderer

`TextRenderer` に「step の高さ」を持ち込み、回転ゲートを含む step では 4 行の layer を生成する。

方針:

- `BoxOnQuWire` は fixed gate 用として維持する
- 新しく `AngledBoxOnQuWire` を追加する
- `AngledBoxOnQuWire` は次の 4 つの文字列を返す:
  - angle line
  - top line
  - mid line
  - bottom line
- step 内に 1 つでも angled gate があれば、その step の各 qubit は 4 行で描画する
- angled gate のない qubit には空の angle line を返す空セルを使う

### Parser

ASCII parser は「wire ごとに 3 行」という前提をやめ、step ごとに 3 行または 4 行を扱えるようにする。

方針:

- `AsciiWireLayout` が step 幅だけでなく step 高さも判断する
- 回転ゲートを含む step では:
  - angle line
  - top wire
  - mid wire
  - bottom wire
  を 1 step として切り出す
- `AsciiStepParser` は boxed gate の label に加えて、対応する angle line を受け取る
- angle 行があり gate 名が `Rx/Ry/Rz/P` のときだけ angled gate を組み立てる
- gate 名だけで angle 行がない場合は angled gate とみなさない

## Internal Representation

表示と parser 入力は Unicode を含むが、内部保存は今までどおり ASCII ベースの canonical string に正規化する。

例:

- `Ry(2θ)` -> `Ry(2*theta)`
- `Rx(π/2)` -> `Rx(π/2)`
- `P(-θ)` -> `P(-theta)`

## Test Plan

最初に feature を赤くする。

1. `features/qni_view.feature`
   - 回転ゲートの表示が angle-on-top になることを追加
2. `features/ascii_circuit_parser.feature`
   - 新しい 4 行形式を受け入れる scenario を追加
   - 旧横長箱を reject する scenario を追加
3. `features/katas/basic_gates/amplitude_change.feature`
   - 新しい canonical form に書き換える
4. `test/qni/view/ascii_circuit_parser_test.rb`
   - 4 行形式の parser unit test を追加
5. renderer 側の unit test が足りなければ追加する

最後に `bundle exec rake check` を fresh に通す。

## Risks

### Step Height Complexity

`TextRenderer` と `AsciiWireLayout` はこれまで 3 行前提が強い。step 高さの導入で merge ロジックが複雑になる可能性がある。

対策:

- angled gate 専用の行だけを明示的に分離する
- fixed gate の既存 merge ロジックはできるだけそのまま残す

### Controlled Gate Interaction

回転ゲートと control が同じ step に来たとき、angle 行だけが増えて縦位置が崩れる可能性がある。

対策:

- step 単位で高さを決める
- control や empty wire 側にも空の angle 行を足してそろえる

## Recommendation

後方互換を捨てる前提なので、回転ゲートの ASCII 表現はこの 4 行形式へ一気に統一する。表示と parser を同時に切り替え、feature も canonical form にそろえるのが最もシンプルでわかりやすい。
