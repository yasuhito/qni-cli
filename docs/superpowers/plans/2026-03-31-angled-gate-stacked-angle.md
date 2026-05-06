# 角度付きゲートの上段角度表示 実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、サブエージェントを利用できる場合は superpowers:subagent-driven-development を使い、利用できない場合は superpowers:executing-plans を使うこと。進捗管理のため、手順はチェックボックス（`- [ ]`）記法を使う。

**目的:** 回転ゲートを「角度を箱の上に中央揃えで表示する」4 行の正規 ASCII 表記に統一し、`qni view` と ASCII パーサーの両方でその表記を正式にサポートする。

**構成:** `TextRenderer` にステップごとの高さを導入し、回転ゲートを含むステップだけ 4 行で描画する。ASCII パーサー側も同じ 4 行構造を前提にステップを切り出し、角度行とゲート箱を結びつけて内部の `Ry(2*theta)` などへ正規化する。旧式の横長箱表記は削除し、新しい表記だけを正規入力とする。

**技術構成:** Ruby, Cucumber, Minitest, 箱描画文字を使う ASCII レンダラー/パーサー

---

## ファイル構成

**変更:**
- `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- `/home/yasuhito/Work/qni-cli/features/ascii_circuit_parser.feature`
- `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/text_renderer.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/cell.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_wire_layout.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_step_parser.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_circuit_parser.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/angle_expression.rb`
- `/home/yasuhito/Work/qni-cli/test/qni/view/ascii_circuit_parser_test.rb`

**必要なら作成:**
- `/home/yasuhito/Work/qni-cli/test/qni/view/text_renderer_test.rb`

**既存の作業中メモ:**
- 実装開始前に未コミット差分がない作業ツリーからブランチを切ること
- `/home/yasuhito/Work/qni-cli` の未コミット差分には依存しないこと

### タスク 1: 新しい ASCII 表記を機能仕様に固定する

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- 変更: `/home/yasuhito/Work/qni-cli/features/ascii_circuit_parser.feature`
- 変更: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: 角度付きゲートの表示期待値を書き換える**

回転ゲートの表示期待値をすべて新しい正規表記に書き換える。

```gherkin
Scenario: qni view は Ry ゲートを表示
  Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
  When "qni view" を実行
  Then 回路図:
    """
         π/2
      ┌───┐
    q0: ┤ Ry├
      └───┘
    """
```

- [ ] **手順 2: 振幅変更の課題を新しい表記へ書き換える**

`/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature` の `Ry(2θ)` / `Ry(2π/3)` を、箱の上に角度を置く 4 行形式へ書き換える。

- [ ] **手順 3: ASCII パーサーの機能仕様を書き換え、拒否ケースを追加する**

新しい 4 行形式を受け入れるシナリオを書き、旧横長箱を拒否するシナリオを追加する。

```gherkin
Scenario: 旧式の横長な Ry 箱は受け付けない
  Given 次の回路がある:
    """
        ┌────────┐
    q0: ┤ Ry(2θ) ├
        └────────┘
    """
  Then エラー:
    """
    ...
    """
```

- [ ] **手順 4: 対象機能仕様を実行し、想定どおりの理由で失敗することを確認する**

実行:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_view.feature \
  features/ascii_circuit_parser.feature \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:
- `qni view` の角度付きゲート表示が一致せず失敗する
- ASCII パーサーが新しい 4 行形式をまだ読めず失敗する

- [ ] **手順 5: 失敗状態の機能仕様をコミットする**

```bash
git add features/qni_view.feature features/ascii_circuit_parser.feature features/katas/basic_gates/amplitude_change.feature
git commit -m "test: lock stacked angle gate ascii form"
```

### タスク 2: 新しいステップ形状をパーサー単体テストに固定する

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/test/qni/view/ascii_circuit_parser_test.rb`

- [ ] **手順 1: 新しい 4 行の角度付きゲート用単体テストデータを追加する**

```ruby
STACKED_RY_GATE = <<~CIRCUIT
      2θ
    ┌───┐
q0: ┤ Ry├
    └───┘
CIRCUIT
```

- [ ] **手順 2: 正規化後のパース期待値を追加する**

```ruby
assert_equal(
  {
    'qubits' => 1,
    'cols' => [['Ry(2*theta)']]
  },
  AsciiCircuitParser.new(STACKED_RY_GATE).parse.to_h
)
```

- [ ] **手順 3: 旧式の横長箱表記を拒否するテストを追加する**

旧式 `┤ Ry(2θ) ├` が `AsciiCircuitParser::Error` になることを固定する。

- [ ] **手順 4: 単体テストを実行し、正しく失敗することを確認する**

実行:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest \
  test/qni/view/ascii_circuit_parser_test.rb
```

期待結果:
- 新しい 4 行形式が未対応のため失敗する
- 旧式表記の拒否がまだ通らず失敗する

- [ ] **手順 5: 失敗状態の単体テストをコミットする**

```bash
git add test/qni/view/ascii_circuit_parser_test.rb
git commit -m "test: cover stacked angled gate parsing"
```

### タスク 3: 上段角度表示の描画を実装する

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/view/text_renderer.rb`
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/view/cell.rb`
- テスト: `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- テスト: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature`
- 必要なら作成: `/home/yasuhito/Work/qni-cli/test/qni/view/text_renderer_test.rb`

- [ ] **手順 1: 角度付きゲート専用の描画要素を追加する**

`cell.rb` に `AngledBoxOnQuWire` を追加し、次の 4 行を返せるようにする。

```ruby
angle
top
mid
bot
```

角度行は角度文字列をゲート箱に対して中央揃えで返す。

- [ ] **手順 2: ステップ層に高さを持たせる**

`TextRenderer` に「そのステップが 3 行か 4 行か」を判断する処理を入れ、回転ゲートを含むステップでは他の qubit 側にも空の角度行を足す。

- [ ] **手順 3: 角度付きゲートを記号だけの箱で描画する**

`Ry(π/2)` は `Ry` だけ箱に入れ、角度 `π/2` は上行へ分離する。

- [ ] **手順 4: 最小の表示確認を実行する**

実行:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_view.feature:113 \
  features/qni_view.feature:123 \
  features/qni_view.feature:133 \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:
- 角度付きゲートの `qni view` 表示が成功する
- 振幅変更の 4 行 ASCII が成功する

- [ ] **手順 5: 描画変更をコミットする**

```bash
git add lib/qni/view/text_renderer.rb lib/qni/view/cell.rb features/qni_view.feature features/katas/basic_gates/amplitude_change.feature
git commit -m "feat: render angled gates with stacked angles"
```

### タスク 4: 4 行 ASCII のパースを実装する

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_wire_layout.rb`
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_step_parser.rb`
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_circuit_parser.rb`
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/angle_expression.rb`
- テスト: `/home/yasuhito/Work/qni-cli/features/ascii_circuit_parser.feature`
- テスト: `/home/yasuhito/Work/qni-cli/test/qni/view/ascii_circuit_parser_test.rb`

- [ ] **手順 1: ワイヤーレイアウトに 4 行の角度付きステップを切り出させる**

`AsciiWireLayout` が `angle/top/mid/bottom` を 1 ステップとして切り出せるようにする。固定ゲートのステップは従来どおり 3 行で扱う。

- [ ] **手順 2: 角度行の情報をステップパーサーへ渡す**

`AsciiStepParser` の入力を広げ、角度付きゲートでは
- 角度行
- 箱のラベル
を組み合わせてゲート記号を作る。

- [ ] **手順 3: 旧式の横長箱ラベル表記のサポートを削除する**

`┤ Ry(2θ) ├` のようにラベル内へ角度が埋まっている形を受理しないようにする。

- [ ] **手順 4: 内部の正規化を保つ**

`AngleExpression` は引き続き
- `θ -> theta`
- `2θ -> 2*theta`
を正規化し、パーサー保存値は `Ry(2*theta)` に統一する。

- [ ] **手順 5: パーサー単体テストと機能仕様確認を実行する**

実行:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest \
  test/qni/view/ascii_circuit_parser_test.rb

BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/ascii_circuit_parser.feature \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:
- 新形式の受け入れが成功する
- 旧形式の拒否が成功する
- `Ry(2θ)` が `Ry(2*theta)` に正規化される

- [ ] **手順 6: パーサー変更をコミットする**

```bash
git add lib/qni/view/ascii_wire_layout.rb lib/qni/view/ascii_step_parser.rb lib/qni/view/ascii_circuit_parser.rb lib/qni/angle_expression.rb features/ascii_circuit_parser.feature test/qni/view/ascii_circuit_parser_test.rb
git commit -m "feat: parse stacked angled gate ascii"
```

### タスク 5: 全体回帰確認と整理

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb`（古い振幅ヘルパーがまだ残っている場合のみ）
- 変更: `/home/yasuhito/Work/qni-cli/test/qni/angle_expression_test.rb`（追加の短縮表記カバレッジが必要な場合）

- [ ] **手順 1: 廃止された振幅回転ステップ DSL がまだあれば削除する**

`When 振幅を ... だけ回転:` が残っていれば削除し、`amplitude_change.feature` は `When 次の回路を適用:` だけに統一する。

- [ ] **手順 2: 不足している短縮表記の正規化テストを追加する**

必要なら `test/qni/angle_expression_test.rb` を追加または更新して、`2θ -> 2*theta` の正規化を固定する。

- [ ] **手順 3: 新しい環境準備から全体チェックを実行する**

実行:
```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:
- 終了コード 0
- すべての Cucumber シナリオが成功する
- RuboCop / Reek / Flog / Flay がすべて成功する

- [ ] **手順 4: 整理と最終成功状態をコミットする**

```bash
git add features/step_definitions/cli_steps.rb test/qni/angle_expression_test.rb
git commit -m "test: finalize stacked angle gate ascii form"
```

## 実装者向けメモ

- 旧式の横長箱との両対応はやらない
- `qni view` の正規出力をそのままパーサーが読めることを優先する
- 固定ゲート / 制御ゲート / swap ゲートの既存の見た目は変えない
- レンダラーとパーサーの両方を一度に成功させようとせず、必ず赤テストを確認してから最小実装で進める
