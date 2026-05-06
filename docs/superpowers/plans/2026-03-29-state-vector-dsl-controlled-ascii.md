# 状態ベクトル DSL 制御付き ASCII 実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、利用可能なら superpowers:subagent-driven-development を使う。利用できない場合は superpowers:executing-plans を使う。進捗管理にはチェックボックス（`- [ ]`）記法を使う。

**目的:** `state_flip.feature` の制御付き検証シナリオを状態ベクトル DSL にそろえ、2 量子ビットと制御を含む ASCII 回路と `Ry(π/2)` のような角度付き ASCII 拡張を読めるようにする。

**構成:** まず機能仕様を先に書く方針で、制御付きシナリオとパーサーの受け入れ仕様を赤くし、`初期状態ベクトルは:` の 2 量子ビット対応を最小実装する。その後、`AsciiCircuitParser` を「複数ワイヤーをステップごとに読む」形へ広げて 2 量子ビットの制御付きゲート / swap を通し、最後に角度付きゲートの ASCII 拡張を 1 量子ビットから追加する。`qni view` 自体は変更せず、角度付き表記はパーサー拡張 DSL として扱う。

**技術構成:** Ruby, Cucumber, Minitest, Bundler, `qni-cli`

---

## ファイル構成

- 変更: `features/katas/basic_gates/state_flip.feature`
  - 制御付き検証シナリオを `初期状態ベクトルは:` / `次の回路を適用:` / `状態ベクトルは:` の形へそろえる。
- 変更: `features/ascii_circuit_parser.feature`
  - 2 量子ビット制御付き ASCII と角度付きゲート ASCII の受け入れシナリオを追加する。
- 変更: `features/step_definitions/cli_steps.rb`
  - `初期状態ベクトルは:` の 2 量子ビット対応と、必要なら 2 量子ビットの記号的な比較補助を追加する。
- 変更: `test/qni/view/ascii_circuit_parser_test.rb`
  - 2 量子ビット制御付きゲート、2 量子ビット swap、角度付きゲート ASCII のパーサー単体テストを追加する。
- 変更: `lib/qni/view/ascii_circuit_parser.rb`
  - 1 量子ビット固定幅専用パーサーから、2 量子ビットの固定幅ゲート / 制御 / swap と角度付きゲート拡張を読めるパーサーへ広げる。
- 必要なら変更: `lib/qni/view/ascii_step_cell.rb`
  - 固定幅ゲートセル判定と角度付きゲートラベル判定の責務を整理する。
- 必要なら変更: `lib/qni/view/ascii_step_rows.rb`
  - 1 ワイヤー専用の固定幅分割責務を、複数ワイヤー / 可変幅ステップ分割へ適応させる。
- 必要なら作成: `lib/qni/view/ascii_step_parser.rb`
  - 1 ステップ分の複数量子ビット配置を判定する責務を切り出す場合に追加する。

## タスク 1: 制御付きシナリオを理想形で先に赤くする

**対象ファイル:**
- 変更: `features/katas/basic_gates/state_flip.feature`
- 変更: `features/ascii_circuit_parser.feature`
- テスト: `features/katas/basic_gates/state_flip.feature`
- テスト: `features/ascii_circuit_parser.feature`

- [ ] **ステップ 1: `state_flip.feature` の制御付きシナリオを理想形へ書き換える**

`features/katas/basic_gates/state_flip.feature` の最後のシナリオを、次の形へ置き換える。

```gherkin
Scenario: 制御付き X 検証回路は制御量子ビットを |0> に戻す
  Given 初期状態ベクトルは:
    """
    0.6|00> + 0.8|01>
    """
  When 次の回路を適用:
    """
        ┌───┐           ┌───┐
    q0: ┤ H ├──■────■──┤ H ├
        └───┘┌─┴─┐┌─┴─┐└───┘
    q1: ─────┤ X ├┤ X ├─────
             └───┘└───┘
    """
  Then 状態ベクトルは:
    """
    0.6|00> + 0.8|01>
    """
```

- [ ] **ステップ 2: ASCII パーサーの受け入れ仕様を追加する**

`features/ascii_circuit_parser.feature` に、少なくとも次の 2 シナリオを追加する。

```gherkin
Scenario: 2 量子ビットの制御付き X 回路を ASCII アートから作る
  Given 次の回路がある:
    """
        ┌───┐
    q0: ──■──
        ┌─┴─┐
    q1: ┤ X ├
        └───┘
    """
  Given 2 qubit の初期状態が "|10>" である
  When "qni run" を実行
  Then 標準出力:
    """
    0.0,0.0,0.0,1.0
    """

Scenario: 1 量子ビットの Ry(π/2) 回路を拡張 ASCII から作る
  Given 次の回路がある:
    """
        ┌─────────┐
    q0: ┤ Ry(π/2) ├
        └─────────┘
    """
  Then 状態ベクトルは:
    """
    0.7071067811865476|0> + 0.7071067811865475|1>
    """
```

最初のシナリオは `qni view` 互換寄り、2 本目はパーサー拡張 DSL 用の受け入れ仕様とする。

- [ ] **ステップ 3: 赤になることを確認する**

実行:

```bash
bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/ascii_circuit_parser.feature
```

期待結果:

- 制御付きシナリオが未定義か失敗で赤くなる
- ASCII パーサーの受け入れ仕様がパーサー非対応で赤くなる

- [ ] **ステップ 4: 機能仕様を先に書いた赤の状態をコミットする**

```bash
git add features/katas/basic_gates/state_flip.feature features/ascii_circuit_parser.feature
git commit -m "test: add controlled ASCII DSL scenarios"
```

## タスク 2: `初期状態ベクトルは:` を 2 量子ビットへ広げる

**対象ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- 必要なら変更: `features/katas/basic_gates/state_flip.feature`
- テスト: `features/katas/basic_gates/state_flip.feature`

- [ ] **ステップ 1: 2 量子ビット初期状態の失敗期待を明確にする**

`features/katas/basic_gates/state_flip.feature` の制御付きシナリオだけを実行し、`0.6|00> + 0.8|01>` が未対応で落ちることを確認する。

実行:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature:78
```

期待結果:

- `unsupported ... initial state` か、それに準ずる失敗が出る

- [ ] **ステップ 2: `cli_steps.rb` に 2 量子ビットの状態ベクトル準備を足す**

`features/step_definitions/cli_steps.rb` に、少なくとも次の対応を追加する。

```ruby
TWO_QUBIT_INITIAL_STATE_COLS = {
  '|00>' => [[1, 1]],
  '|01>' => [[1, 'X']],
  '|10>' => [['X', 1]],
  '|11>' => [['X', 'X']],
  '0.6|00> + 0.8|01>' => [[1, 'Ry(1.8545904360032246)']]
}.freeze
```

`Given('初期状態ベクトルは:')` は、`|...>` の桁数や登録済みリテラルを見て 1 量子ビット / 2 量子ビットを切り替える。

- [ ] **ステップ 3: 制御付きシナリオの状態準備だけを緑にする**

実行:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

期待結果:

- 初期状態の失敗は消える
- ただし `次の回路を適用:` 側がまだ赤でもよい

- [ ] **ステップ 4: 状態ベクトル準備の拡張をコミットする**

```bash
git add features/step_definitions/cli_steps.rb
git commit -m "feat: support 2-qubit state-vector DSL setup"
```

## タスク 3: 2 量子ビットの制御付きゲート / swap を読むパーサー基盤を作る

**対象ファイル:**
- 変更: `lib/qni/view/ascii_circuit_parser.rb`
- 必要なら変更: `lib/qni/view/ascii_step_cell.rb`
- 必要なら変更: `lib/qni/view/ascii_step_rows.rb`
- 必要なら作成: `lib/qni/view/ascii_step_parser.rb`
- 変更: `test/qni/view/ascii_circuit_parser_test.rb`
- テスト: `test/qni/view/ascii_circuit_parser_test.rb`
- テスト: `features/ascii_circuit_parser.feature`

- [ ] **ステップ 1: 単体テストで 2 量子ビットの制御付き X を赤くする**

`test/qni/view/ascii_circuit_parser_test.rb` に、少なくとも次のフィクスチャと期待値を追加する。

```ruby
CONTROLLED_X_GATE = <<~CIRCUIT
      ┌───┐
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
CIRCUIT

def test_parse_two_qubit_controlled_x_circuit
  circuit = AsciiCircuitParser.new(CONTROLLED_X_GATE).parse

  assert_equal(
    {
      'qubits' => 2,
      'cols' => [['•', 'X']]
    },
    circuit.to_h
  )
end
```

必要なら `SWAP` の最小ケースも同時に赤くする。

- [ ] **ステップ 2: パーサーを「複数ワイヤーのステップ配置」中心へ最小リファクタリングする**

実装方針:

- 各 `qN:` 行を抽出する
- ワイヤー全体をステップごとに分割する
- 各ステップについて、量子ビットごとのセル集合から配置を判定する
- 配置が
  - 単一ゲートなら `Circuit#add_gate`
  - 制御付きゲートなら `Circuit#add_controlled_gate`
  - swap なら `Circuit#add_swap_gate`
  へ落とす

最初に緑にする対象は 2 量子ビットの制御付き X 固定幅回路のみでよい。

- [ ] **ステップ 3: 2 量子ビットパーサーの単体テスト / 受け入れ仕様を緑にする**

実行:

```bash
bundle exec ruby -Itest test/qni/view/ascii_circuit_parser_test.rb
bundle exec cucumber features/ascii_circuit_parser.feature
```

期待結果:

- 制御付き X の単体テストが成功する
- 2 量子ビット制御付き ASCII の機能仕様が成功する

- [ ] **ステップ 4: パーサー基盤変更をコミットする**

```bash
git add \
  lib/qni/view/ascii_circuit_parser.rb \
  lib/qni/view/ascii_step_cell.rb \
  lib/qni/view/ascii_step_rows.rb \
  test/qni/view/ascii_circuit_parser_test.rb \
  features/ascii_circuit_parser.feature
git commit -m "feat: parse 2-qubit controlled ASCII circuits"
```

実際に作成 / 変更したファイルだけ `git add` する。

## タスク 4: 制御付きシナリオを緑にする

**対象ファイル:**
- 変更: `features/katas/basic_gates/state_flip.feature`
- 変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates/state_flip.feature`

- [ ] **ステップ 1: 制御付きシナリオだけを再実行する**

実行:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

期待結果:

- 制御付きシナリオだけが残っていれば、その失敗が局所化される

- [ ] **ステップ 2: 記号的な比較やリテラル表記の差分を最小修正で吸収する**

必要なら `features/step_definitions/cli_steps.rb` の `assert_symbolic_state_matches!` にだけ最小修正を入れる。ここでは 2 量子ビット ket 表記や係数 1 の省略で余計な一般化をしない。

- [ ] **ステップ 3: `state_flip.feature` を緑にする**

実行:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

期待結果:

- `state_flip.feature` の全シナリオが成功する

- [ ] **ステップ 4: 制御付きシナリオの緑をコミットする**

```bash
git add features/katas/basic_gates/state_flip.feature features/step_definitions/cli_steps.rb
git commit -m "feat: rewrite controlled StateFlip scenario"
```

## タスク 5: 角度付きゲートの ASCII 拡張を追加する

**対象ファイル:**
- 変更: `lib/qni/view/ascii_circuit_parser.rb`
- 必要なら変更: `lib/qni/view/ascii_step_cell.rb`
- 変更: `test/qni/view/ascii_circuit_parser_test.rb`
- 変更: `features/ascii_circuit_parser.feature`
- テスト: `test/qni/view/ascii_circuit_parser_test.rb`
- テスト: `features/ascii_circuit_parser.feature`

- [ ] **ステップ 1: `Ry(π/2)` の単体テスト / 受け入れ仕様を赤くする**

`test/qni/view/ascii_circuit_parser_test.rb` に次を追加する。

```ruby
ANGLED_RY_GATE = <<~CIRCUIT
      ┌─────────┐
  q0: ┤ Ry(π/2) ├
      └─────────┘
CIRCUIT

def test_parse_angled_ry_gate_circuit
  circuit = AsciiCircuitParser.new(ANGLED_RY_GATE).parse

  assert_equal(
    {
      'qubits' => 1,
      'cols' => [['Ry(π/2)']]
    },
    circuit.to_h
  )
end
```

`features/ascii_circuit_parser.feature` の `Ry(π/2)` シナリオもこの時点で赤を確認する。

- [ ] **ステップ 2: 角度付きゲートラベル判定を追加する**

実装方針:

- 固定幅ゲートのラベル探索と角度付きゲートのラベル探索を分ける
- 角度付きゲートは `Name(angle)` の形をそのままシリアライズ済みゲートとして返す
- `Name` は `P`, `Rx`, `Ry`, `Rz` に限定する
- `angle` は既存 `AngleExpression` が読める文字列だけ通す

ここでは 1 量子ビット / 単一ゲート / 単一ステップから始め、2 量子ビット制御付きゲートの対象への角度付きゲートは将来拡張に回してよい。

- [ ] **ステップ 3: 角度付きゲートパーサーの対象を絞った緑を確認する**

実行:

```bash
bundle exec ruby -Itest test/qni/view/ascii_circuit_parser_test.rb
bundle exec cucumber features/ascii_circuit_parser.feature
```

期待結果:

- `Ry(π/2)` の単体テスト / 受け入れ仕様が成功する
- 既存の 1 量子ビット / 2 量子ビット制御付きパーサーが回帰していない

- [ ] **ステップ 4: 角度付きゲート ASCII 拡張をコミットする**

```bash
git add \
  lib/qni/view/ascii_circuit_parser.rb \
  lib/qni/view/ascii_step_cell.rb \
  test/qni/view/ascii_circuit_parser_test.rb \
  features/ascii_circuit_parser.feature
git commit -m "feat: support angled gate ASCII syntax"
```

## タスク 6: 対象を絞った回帰確認と全量確認をする

**対象ファイル:**
- テスト: `features/katas/basic_gates/state_flip.feature`
- テスト: `features/ascii_circuit_parser.feature`
- テスト: `test/qni/view/ascii_circuit_parser_test.rb`
- テスト: リポジトリ全体の確認

- [ ] **ステップ 1: 対象を絞ったパーサー / DSL 回帰確認を実行する**

実行:

```bash
bundle exec ruby -Itest test/qni/view/ascii_circuit_parser_test.rb
bundle exec cucumber \
  features/ascii_circuit_parser.feature \
  features/katas/basic_gates/state_flip.feature
bundle exec rubocop \
  lib/qni/view/ascii_circuit_parser.rb \
  lib/qni/view/ascii_step_cell.rb \
  lib/qni/view/ascii_step_rows.rb \
  features/step_definitions/cli_steps.rb \
  test/qni/view/ascii_circuit_parser_test.rb
```

期待結果:

- 対象を絞ったテストと RuboCop が成功する

- [ ] **ステップ 2: リポジトリ全体の確認を実行する**

実行:

```bash
bundle exec rake check
```

期待結果:

- RuboCop, Cucumber, Reek, Flog, Flay を含む既存チェックがすべて成功する

- [ ] **ステップ 3: 最終確認コミットを作る**

```bash
git commit --allow-empty -m "test: verify controlled ASCII DSL support"
```

このコミットは検証済みの区切りとして使う。不要ならスキップしてよいが、計画実行時は検証の終了点を明確に残す。
