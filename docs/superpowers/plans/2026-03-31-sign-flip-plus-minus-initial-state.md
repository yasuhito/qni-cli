# Sign Flip のプラス/マイナス初期状態実装計画

> **エージェント作業者へ:** 必須: この計画を実装するときは、サブエージェントが利用可能なら superpowers:subagent-driven-development、そうでなければ superpowers:executing-plans を使う。進捗管理にはチェックボックス (`- [ ]`) 構文を使う。

**目標:** `|+>` / `|->` を初期状態の省略記法として正式サポートし、`sign_flip.feature` をタスク 1.1 / 1.2 と同じ高レベル DSL に書き換える。

**設計:** 先に `qni state` と `sign_flip.feature` の受け入れテストを赤くし、`|+>` / `|->` の省略記法を `InitialState` の解析 / 表示の責務として追加する。内部表現は第 1 段では具体的な 2 項状態に展開し、CLI・機能仕様 DSL・記号 / 数値実行の既存経路をできるだけ再利用する。

**技術構成:** Ruby, Cucumber, Minitest, Bundler, `InitialState`, `qni-cli`

---

## ファイル構成

- 変更: `features/qni_state.feature`
  - `qni state set "|+>"` / `qni state show` の受け入れテストを追加する。
- 変更: `features/katas/basic_gates/sign_flip.feature`
  - 低レベルな `qni add` / CSV 比較を高レベル DSL へ置き換える。
- 変更: `features/step_definitions/cli_steps.rb`
  - 既存の `Given 初期状態ベクトルは:` が `|+>` / `|->` を自然に通せることを押さえる。
- 変更: `test/qni/initial_state_test.rb`
  - `|+>` / `|->` の解析 / `to_s` / 数値解決を単体テストする。
- 変更: `lib/qni/initial_state.rb`
  - `|+>` / `|->` の省略記法解析と省略記法対応の `to_s` を追加する。
- 必要なら変更: `lib/qni/state_file.rb`
  - `state show` が省略記法を返せるか確認し、必要なら整形責務を追加する。

## タスク 1: 機能仕様を先に書いて `|+>` / `|->` 省略記法の受け入れを赤くする

**ファイル:**
- 変更: `features/qni_state.feature`
- 変更: `features/katas/basic_gates/sign_flip.feature`
- テスト: `features/qni_state.feature`
- テスト: `features/katas/basic_gates/sign_flip.feature`

- [ ] **ステップ 1: `qni state` の省略記法受け入れテストを追加する**

`features/qni_state.feature` に少なくとも次を追加する。

```gherkin
Scenario: qni state set は |+> を省略記法のまま表示できる初期状態として保存する
  When "qni state set \"|+>\"" を実行
  Then コマンドは成功
  And "qni state show" を実行
  And 標準出力:
    """
    |+>
    """

Scenario: qni state set は |-> を省略記法のまま表示できる初期状態として保存する
  When "qni state set \"|->\"" を実行
  Then コマンドは成功
  And "qni state show" を実行
  And 標準出力:
    """
    |->
    """
```

必要なら `circuit.json:` 比較も追加して、内部保存が `initial_state` 経由で行われることを固定する。

- [ ] **ステップ 2: `sign_flip.feature` を高レベル DSL に書き換える**

`features/katas/basic_gates/sign_flip.feature` を次の方向へ更新する。

```gherkin
Scenario: Z ゲートは |+> を |-> に変える
  Given 初期状態ベクトルは:
    """
    |+>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    |->
    """

Scenario: Z ゲートは |-> を |+> に変える
  Given 初期状態ベクトルは:
    """
    |->
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    |+>
    """
```

加えて、

- `0.6|0> + 0.8|1> -> 0.6|0> - 0.8|1>`
- `cos(θ/2)|0> + sin(θ/2)|1> -> cos(θ/2)|0> - sin(θ/2)|1>`
- `α|0> + β|1> -> α|0> - β|1>`

の 3 本も `Given 初期状態ベクトルは:` / `When 次の回路を適用:` / `Then 計算基底での状態ベクトルは:` に揃える。

制御付き検証シナリオはここで削除する。

- [ ] **ステップ 3: 赤いことを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/katas/basic_gates/sign_flip.feature
```

期待結果:

- `|+>` / `|->` が解析できず赤くなる
- または `qni state show` が省略記法を返せず赤くなる
- 失敗理由が入力ミスではなく機能不足である

- [ ] **ステップ 4: 赤い状態をコミットする**

```bash
git add features/qni_state.feature features/katas/basic_gates/sign_flip.feature
git commit -m "test: add sign flip plus-minus shorthand acceptance"
```

## タスク 2: `InitialState` に `|+>` / `|->` 省略記法を追加する

**ファイル:**
- 変更: `test/qni/initial_state_test.rb`
- 変更: `lib/qni/initial_state.rb`
- テスト: `test/qni/initial_state_test.rb`

- [ ] **ステップ 1: 単体テストを赤く追加する**

`test/qni/initial_state_test.rb` に少なくとも次を追加する。

```ruby
def test_parse_plus_state_shorthand
  initial_state = InitialState.parse('|+>')

  assert_equal '|+>', initial_state.to_s
  assert_in_delta Math.sqrt(0.5), initial_state.resolve_numeric({})[0], 1e-12
  assert_in_delta Math.sqrt(0.5), initial_state.resolve_numeric({})[1], 1e-12
end

def test_parse_minus_state_shorthand
  initial_state = InitialState.parse('|->')

  assert_equal '|->', initial_state.to_s
  assert_in_delta Math.sqrt(0.5), initial_state.resolve_numeric({})[0], 1e-12
  assert_in_delta(-Math.sqrt(0.5), initial_state.resolve_numeric({})[1], 1e-12)
end
```

必要なら `to_h` の期待値も追加して、内部表現の安定性を固定する。

- [ ] **ステップ 2: 単体テストが赤いことを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

期待結果:

- `invalid initial state term`
- または `unsupported basis state`

- [ ] **ステップ 3: `InitialState.parse` に省略記法を実装する**

`lib/qni/initial_state.rb` に `|+>` / `|->` の特別扱いの解析を追加する。

方針:

- `|+>` は `1/sqrt(2)` 相当の具体的な数値を係数に持つ 2 項へ展開
- `|->` は 2 項目だけ負符号を持たせる

第 1 段では係数を具体的な文字列として直接埋めてよい。

```ruby
PLUS_MINUS_COEFFICIENT = Math.sqrt(0.5).to_s
NEGATED_PLUS_MINUS_COEFFICIENT = (-Math.sqrt(0.5)).to_s
```

のような形でもよいが、定数の数が増えすぎないように注意する。

- [ ] **ステップ 4: `InitialState#to_s` の省略記法表示を実装する**

`to_s` は、terms が `|+>` / `|->` と許容誤差内で一致する場合に省略記法を返す。

最小案:

- `plus_state?`
- `minus_state?`

の述語メソッドを追加し、該当するときだけ `|+>` / `|->` を返す。

それ以外は既存の ket の和の表示を維持する。

- [ ] **ステップ 5: 単体テストを緑にする**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

期待結果: PASS

- [ ] **ステップ 6: `InitialState` 実装をコミットする**

```bash
git add test/qni/initial_state_test.rb lib/qni/initial_state.rb
git commit -m "feat: add plus-minus initial state shorthand"
```

## タスク 3: CLI と機能仕様 DSL の挙動を緑にする

**ファイル:**
- 変更: `features/qni_state.feature`
- 変更: `features/katas/basic_gates/sign_flip.feature`
- 変更: `features/step_definitions/cli_steps.rb`
- 必要なら変更: `lib/qni/state_file.rb`
- テスト: `features/qni_state.feature`
- テスト: `features/katas/basic_gates/sign_flip.feature`

- [ ] **ステップ 1: `qni state show` の省略記法表示を通す**

`features/qni_state.feature` の新しいシナリオを緑にする。

`lib/qni/state_file.rb` に手を入れる必要があるなら、責務は最小に留める。理想は `InitialState#to_s` をそのまま使って `state show` を通すこと。

- [ ] **ステップ 2: `sign_flip.feature` の高レベル DSL を整える**

最終形では次の 5 本に揃える。

- `Z ゲートは |+> を |-> に変える`
- `Z ゲートは |-> を |+> に変える`
- `Z ゲートは 0.6|0> + 0.8|1> を 0.6|0> - 0.8|1> に変える`
- `Z ゲートは実数係数の一般状態で |1> の振幅の符号を反転する`
- `Z ゲートは α|0> + β|1> を α|0> - β|1> に変える`

必要ならシナリオ名を、タスク 1.1 / 1.2 と同じ語感に揃えて調整する。

- [ ] **ステップ 3: 対象機能仕様を緑にする**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/katas/basic_gates/sign_flip.feature
```

期待結果: PASS

- [ ] **ステップ 4: 互換性を局所確認する**

`|+>, |->` 省略記法が既存の機能仕様を壊していないことを確認するため、次も流す。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature
```

期待結果: PASS

- [ ] **ステップ 5: 高レベル SignFlip をコミットする**

```bash
git add features/qni_state.feature features/katas/basic_gates/sign_flip.feature features/step_definitions/cli_steps.rb lib/qni/state_file.rb
git commit -m "test: rewrite sign flip as high-level DSL"
```

`features/step_definitions/cli_steps.rb` や `lib/qni/state_file.rb` に変更がなければ `git add` から外す。

## タスク 4: 全体確認をして仕上げる

**ファイル:**
- 検証のみ

- [ ] **ステップ 1: 最新状態で全体確認する**

実行:

```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:

- RuboCop / Reek / Cucumber / Flog / Flay を含む `check` が PASS
- シナリオ数は最新件数で増えていてよい

- [ ] **ステップ 2: 変更内容を要約してコミット列を確認する**

実行:

```bash
git log --oneline --decorate -5
git status --short
```

期待結果:

- 機能仕様先行の赤いコミット
- 省略記法の実装コミット
- 高レベル SignFlip コミット
- 作業木は clean

- [ ] **ステップ 3: 完了報告**

完了時には少なくとも次を伝える。

- `|+>` / `|->` 初期状態省略記法が入ったこと
- `sign_flip.feature` が高レベル DSL へ揃ったこと
- 実行した検証コマンドと結果

## 実装者向けメモ

- `AGENTS.md` に従い、機能仕様を先に変える。
- `sign_flip.feature` の制御付きシナリオは戻さない。
- 第 1 段では `|+>` / `|->` のみ。`|+i>` などへは広げない。
- 省略記法の内部表現は具体的な数値への展開で十分。一般の数式パーサーを増やさない。
- この計画を実行する前に、作業中の [sign_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/sign_flip.feature) の未コミット差分が何かを確認し、誤って消さないこと。
