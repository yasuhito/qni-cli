# Bell State Change 1 高レベル DSL 実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目的:** Bell 基底の短縮表記と `qni run --symbolic --basis bell` を追加し、`bell_state_change_1.feature` を Bell 基底のまま読める高レベル DSL に書き換える。

**構成:** 既存の `|+>` / `|+i>` と同じ考え方で、Bell 状態を `InitialState` と記号表示処理の利用者向け短縮表記にする。実装は 3 段に分ける: まず 2 量子ビット初期状態と Bell 短縮表記の解析/保存、次に Bell 基底表示、最後にタスク 1.8 の feature ファイルを高レベル化する。各段で受け入れテストを先に失敗させてから最小実装で通す。

**技術構成:** Ruby (`Qni::InitialState`, Cucumber, Minitest), Python (`libexec/qni_symbolic_run.py`, SymPy), 既存の qni CLI と feature ファイル用 DSL

---

## ファイル構成

### 状態解析と保存の中核

- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/initial_state.rb`
  - 1 量子ビット専用だった `InitialState` を 2 量子ビット Bell 短縮表記と 2 量子ビット ket の和まで広げる
- 変更: `/home/yasuhito/Work/qni-cli/test/qni/initial_state_test.rb`
  - Bell 短縮表記と 2 量子ビットの数値化の単体テストを追加する

### 記号表示と CLI 受け入れテスト

- 変更: `/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py`
  - `--basis bell` の記号表示を追加する
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/cli/run_help.rb`
  - `--basis bell` をヘルプに反映する
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_run.feature`
  - `qni run --symbolic --basis bell` の受け入れテストを追加する
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_cli.feature`
  - `qni run --help` に Bell 基底を反映する受け入れテストを追加する
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_state.feature`
  - Bell 短縮表記の保存・表示の受け入れテストを追加する

### Feature ファイル用 DSL と Kata の書き換え

- 変更: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb`
  - `Then Bell 基底での状態ベクトルは:` を追加する
  - `Given 初期状態ベクトルは:` が 2 量子ビット `InitialState` をそのまま書けることを確認する
- 変更: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature`
  - 低レベルシナリオを高レベル DSL に書き換える

## タスク 1: Bell 短縮表記の受け入れテストを先に失敗させる

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_state.feature`
- 変更: `/home/yasuhito/Work/qni-cli/test/qni/initial_state_test.rb`

- [ ] **手順 1: `features/qni_state.feature` に Bell 短縮表記の失敗する受け入れテストを追加する**

```gherkin
Scenario: qni state set は |Φ+> を短縮表記のまま表示できる初期状態として保存する
  When "qni state set \"|Φ+>\"" を実行
  Then コマンドは成功
  And "qni state show" を実行
  And 標準出力:
    """
    |Φ+>
    """
```

同様に `|Φ->`, `|Ψ+>`, `|Ψ->` と、少なくとも 1 本の線形結合 `alpha|Φ+> + beta|Φ->` も追加する。

- [ ] **手順 2: `test/qni/initial_state_test.rb` に Bell 短縮表記の失敗する単体テストを追加する**

```ruby
def test_parse_phi_plus_state_shorthand
  initial_state = InitialState.parse('|Φ+>')

  assert_equal '|Φ+>', initial_state.to_s
  assert_equal [Math.sqrt(0.5), 0.0, 0.0, Math.sqrt(0.5)], initial_state.resolve_numeric({})
end
```

`|Φ->`, `|Ψ+>`, `|Ψ->` のうち少なくとも 1〜2 本を対で追加し、2 量子ビットの形が見えるようにする。

- [ ] **手順 3: 失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature
```

期待結果:
- `InitialState` が 1 量子ビット専用前提のため失敗する
- Bell 短縮表記未対応で失敗する

- [ ] **手順 4: `lib/qni/initial_state.rb` を最小実装で広げる**

実装方針:
- `Term` の `basis` を `0/1` 固定から `0`, `1`, `00`, `01`, `10`, `11` を受ける形へ広げる
- 状態の次元を `terms` の `basis` の長さから求める
- Bell 短縮表記を `special_state_for` へ追加する
- `to_s` は既存の 1 量子ビット短縮表記を壊さず、Bell 短縮表記にも戻せるようにする
- `resolve_numeric` は 2 量子ビットなら 4 要素配列を返す

最小の実装イメージ:

```ruby
when '|Φ+>' then bell_state('00' => PLUS_MINUS_COEFFICIENT_TEXT, '11' => PLUS_MINUS_COEFFICIENT_TEXT)
```

- [ ] **手順 5: 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature
```

期待結果: 成功する

- [ ] **手順 6: コミット**

```bash
git add test/qni/initial_state_test.rb features/qni_state.feature lib/qni/initial_state.rb
git commit -m "feat: add Bell initial state shorthand"
```

## タスク 2: `qni run --symbolic --basis bell` を追加する

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_run.feature`
- 変更: `/home/yasuhito/Work/qni-cli/features/qni_cli.feature`
- 変更: `/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py`
- 変更: `/home/yasuhito/Work/qni-cli/lib/qni/cli/run_help.rb`

- [ ] **手順 1: `features/qni_run.feature` に Bell 基底の失敗する受け入れテストを追加する**

少なくとも次の 3 本を追加する。

```gherkin
Scenario: qni run --symbolic --basis bell は |Φ+> を |Φ+> と表示
  Given "qni state set \"|Φ+>\"" を実行
  When "qni run --symbolic --basis bell" を実行
  Then 標準出力:
    """
    |Φ+>
    """
```

```gherkin
Scenario: qni run --symbolic --basis bell は Z を適用した |Φ+> を |Φ-> と表示
  Given "qni state set \"|Φ+>\"" を実行
  And "qni add Z --qubit 0 --step 0" を実行
  When "qni run --symbolic --basis bell" を実行
  Then 標準出力:
    """
    |Φ->
    """
```

```gherkin
Scenario: qni run --symbolic --basis bell は α|Φ+> + β|Φ-> を表示
  Given "qni state set \"alpha|Φ+> + beta|Φ->\"" を実行
  When "qni run --symbolic --basis bell" を実行
  Then 標準出力:
    """
    alpha|Φ+> + beta|Φ->
    """
```

必要なら 1 量子ビットで失敗するシナリオも追加する。

- [ ] **手順 2: `features/qni_cli.feature` にヘルプの失敗する受け入れテストを追加する**

```gherkin
And 標準出力に次を含む:
  """
  Show a symbolic state in a named basis such as x, y, or bell
  """
```

- [ ] **手順 3: 失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature features/qni_cli.feature
```

期待結果:
- `unsupported symbolic basis: bell` で失敗する
- ヘルプ文言不一致で失敗する

- [ ] **手順 4: `libexec/qni_symbolic_run.py` に Bell 基底表示を追加する**

実装方針:
- `render_symbolic_state_bell_basis(state)` を新設する
- 2 量子ビット状態 `(a, b, c, d)` を
  - `(a + d)/sqrt(2)` → `|Φ+>`
  - `(a - d)/sqrt(2)` → `|Φ->`
  - `(b + c)/sqrt(2)` → `|Ψ+>`
  - `(b - c)/sqrt(2)` → `|Ψ->`
  へ変換する
- `render_named_basis_term` は 2 量子ビットの名前付き基底ラベルにも再利用できるようにする
- `run(..., basis="bell")` を 2 量子ビットのテキスト表示だけに限定して追加する

最小の関数イメージ:

```python
def render_symbolic_state_bell_basis(state):
    a, b, c, d = [simplify(term) for term in state]
    bell_terms = (
        (simplify((a + d) / sqrt(2)), "|Φ+>"),
        (simplify((a - d) / sqrt(2)), "|Φ->"),
        (simplify((b + c) / sqrt(2)), "|Ψ+>"),
        (simplify((b - c) / sqrt(2)), "|Ψ->"),
    )
```

- [ ] **手順 5: `lib/qni/cli/run_help.rb` を更新する**

`x or y` を `x, y, or bell` に更新し、2 量子ビット Bell 基底をサポートすることがヘルプから読めるようにする。

- [ ] **手順 6: 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature features/qni_cli.feature
```

期待結果: 成功する

- [ ] **手順 7: コミット**

```bash
git add features/qni_run.feature features/qni_cli.feature libexec/qni_symbolic_run.py lib/qni/cli/run_help.rb
git commit -m "feat: add Bell basis symbolic output"
```

## タスク 3: Bell 基底ステップを追加してタスク 1.8 を高レベル化する

**ファイル:**
- 変更: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb`
- 変更: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **手順 1: `bell_state_change_1.feature` を先に高レベル DSL へ書き換える**

目標の形:

```gherkin
Scenario: Z ゲートは |Φ+> を |Φ-> に変える
  Given 初期状態ベクトルは:
    """
    |Φ+>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    q1: ─────
    """
  Then Bell 基底での状態ベクトルは:
    """
    |Φ->
    """
```

加えて
- `|Φ-> -> |Φ+>`
- `0.6|Φ+> + 0.8|Φ-> -> 0.6|Φ-> + 0.8|Φ+>`
- `α|Φ+> + β|Φ-> -> α|Φ-> + β|Φ+>`

の 4 本へそろえる。

- [ ] **手順 2: `features/step_definitions/cli_steps.rb` に失敗するステップを追加する**

```ruby
Then('Bell 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis bell')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_named_basis_state_matches!(@stdout, doc_string)
end
```

必要なら `canonical_named_basis_notation` を `Φ`, `Ψ` でも使えるように最小調整する。

- [ ] **手順 3: 失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

期待結果:
- ステップ未定義、または比較不一致で失敗する

- [ ] **手順 4: 最小実装で成功させる**

実装内容:
- `Then Bell 基底での状態ベクトルは:` を追加する
- 必要なら `normalize_symbolic_aliases` へ `Φ`, `Ψ` の別名を足さずに済む形で `assert_named_basis_state_matches!` を使う
- `Given 初期状態ベクトルは:` が 2 量子ビット `InitialState` をそのまま扱えることを確認し、もし量子ビット数を `1` 固定している箇所があれば最小修正する

- [ ] **手順 5: 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

期待結果: 成功する

- [ ] **手順 6: コミット**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/bell_state_change_1.feature
git commit -m "test: rewrite BellStateChange1 scenarios"
```

## タスク 4: 近い Bell タスクと全体チェックを回す

**ファイル:**
- 新しいファイルは想定しない

- [ ] **手順 1: Bell 系 feature ファイルをまとめて回す**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_run.feature \
  features/katas/basic_gates/bell_state_change_1.feature \
  features/katas/basic_gates/bell_state_change_2.feature \
  features/katas/basic_gates/bell_state_change_3.feature
```

期待結果: 成功する

タスク 1.9/1.10 がまだ旧 DSL でも、Bell 短縮表記と `--basis bell` を壊していないことだけはここで押さえる。

- [ ] **手順 2: 新しい記号計算環境を準備する**

実行:

```bash
bash scripts/setup_symbolic_python.sh
```

期待結果: `1.14.0`

- [ ] **手順 3: 全体チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:
- RuboCop 成功
- cucumber 成功
- reek 成功

- [ ] **手順 4: 仕上げコミット**

作業ブランチの最後がクリーンなら不要。追加の微修正があればここでまとめる。

## 実装者向けメモ

- `lib/qni/initial_state.rb` はいま `basis` を `0` / `1` 固定で扱っているので、まずここが最大の境界変更になる
- `libexec/qni_symbolic_run.py` の X/Y 基底は 1 量子ビットのテキスト表示だけという分岐で実装されている。Bell 基底も同じ分岐に足すと見通しがよい
- `features/step_definitions/cli_steps.rb` の `Given 初期状態ベクトルは:` は直接 `InitialState.parse` が成功したら量子ビット数を `1` 固定で書くので、2 量子ビット対応時はここを忘れず直す
- `bell_state_change_1.feature` の ASCII 回路は構文解析器を使わず追加経路を通るので、2 量子ビット 1 列の簡単な回路図で十分
