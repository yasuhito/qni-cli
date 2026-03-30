# Sign Flip Plus/Minus Initial State Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `|+>` / `|->` を初期状態 shorthand として正式サポートし、`sign_flip.feature` を Task 1.1 / 1.2 と同じ高レベル DSL に書き換える。

**Architecture:** 先に `qni state` と `sign_flip.feature` の acceptance を赤くし、`|+>` / `|->` shorthand を `InitialState` の parse / render の責務として追加する。内部表現は第 1 段では concrete な 2 項 state に展開し、CLI・feature DSL・symbolic / numeric run の既存経路をできるだけ再利用する。

**Tech Stack:** Ruby, Cucumber, Minitest, Bundler, `InitialState`, `qni-cli`

---

## File Structure

- Modify: `features/qni_state.feature`
  - `qni state set "|+>"` / `qni state show` の acceptance を追加する。
- Modify: `features/katas/basic_gates/sign_flip.feature`
  - low-level な `qni add` / CSV 比較を高レベル DSL へ置き換える。
- Modify: `features/step_definitions/cli_steps.rb`
  - 既存の `Given 初期状態ベクトルは:` が `|+>` / `|->` を自然に通せることを押さえる。
- Modify: `test/qni/initial_state_test.rb`
  - `|+>` / `|->` の parse / `to_s` / numeric resolve を unit test する。
- Modify: `lib/qni/initial_state.rb`
  - `|+>` / `|->` shorthand parse と shorthand-aware `to_s` を追加する。
- Optional Modify: `lib/qni/state_file.rb`
  - `state show` が shorthand を返せるか確認し、必要なら整形責務を追加する。

## Task 1: feature-first で `|+>` / `|->` shorthand の受け入れを赤くする

**Files:**
- Modify: `features/qni_state.feature`
- Modify: `features/katas/basic_gates/sign_flip.feature`
- Test: `features/qni_state.feature`
- Test: `features/katas/basic_gates/sign_flip.feature`

- [ ] **Step 1: `qni state` の shorthand acceptance を追加する**

`features/qni_state.feature` に少なくとも次を追加する。

```gherkin
Scenario: qni state set は |+> を shorthand のまま表示できる初期状態として保存する
  When "qni state set \"|+>\"" を実行
  Then コマンドは成功
  And "qni state show" を実行
  And 標準出力:
    """
    |+>
    """

Scenario: qni state set は |-> を shorthand のまま表示できる初期状態として保存する
  When "qni state set \"|->\"" を実行
  Then コマンドは成功
  And "qni state show" を実行
  And 標準出力:
    """
    |->
    """
```

必要なら `circuit.json:` 比較も追加して、内部保存が `initial_state` 経由で行われることを固定する。

- [ ] **Step 2: `sign_flip.feature` を高レベル DSL に書き換える**

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

controlled 検証 scenario はここで削除する。

- [ ] **Step 3: red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/katas/basic_gates/sign_flip.feature
```

Expected:

- `|+>` / `|->` が parse できず赤くなる
- または `qni state show` が shorthand を返せず赤くなる
- 失敗理由が typo ではなく機能不足である

- [ ] **Step 4: red をコミットする**

```bash
git add features/qni_state.feature features/katas/basic_gates/sign_flip.feature
git commit -m "test: add sign flip plus-minus shorthand acceptance"
```

## Task 2: `InitialState` に `|+>` / `|->` shorthand を追加する

**Files:**
- Modify: `test/qni/initial_state_test.rb`
- Modify: `lib/qni/initial_state.rb`
- Test: `test/qni/initial_state_test.rb`

- [ ] **Step 1: unit test を赤く追加する**

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

- [ ] **Step 2: unit test が赤いことを確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

Expected:

- `invalid initial state term`
- または `unsupported basis state`

- [ ] **Step 3: `InitialState.parse` に shorthand を実装する**

`lib/qni/initial_state.rb` に `|+>` / `|->` の special-case parse を追加する。

方針:

- `|+>` は `1/sqrt(2)` 相当の concrete number を係数に持つ 2 項へ展開
- `|->` は 2 項目だけ負符号を持たせる

第 1 段では係数を concrete string として直接埋めてよい。

```ruby
PLUS_MINUS_COEFFICIENT = Math.sqrt(0.5).to_s
NEGATED_PLUS_MINUS_COEFFICIENT = (-Math.sqrt(0.5)).to_s
```

のような形でもよいが、constant 数が増えすぎないように注意する。

- [ ] **Step 4: `InitialState#to_s` の shorthand 表示を実装する**

`to_s` は、terms が `|+>` / `|->` と tolerance 内で一致する場合に shorthand を返す。

最小案:

- `plus_state?`
- `minus_state?`

の predicate を追加し、該当するときだけ `|+>` / `|->` を返す。

それ以外は既存の ket sum 表示を維持する。

- [ ] **Step 5: unit test を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

Expected: PASS

- [ ] **Step 6: `InitialState` 実装をコミットする**

```bash
git add test/qni/initial_state_test.rb lib/qni/initial_state.rb
git commit -m "feat: add plus-minus initial state shorthand"
```

## Task 3: CLI と feature DSL の挙動を green にする

**Files:**
- Modify: `features/qni_state.feature`
- Modify: `features/katas/basic_gates/sign_flip.feature`
- Modify: `features/step_definitions/cli_steps.rb`
- Optional Modify: `lib/qni/state_file.rb`
- Test: `features/qni_state.feature`
- Test: `features/katas/basic_gates/sign_flip.feature`

- [ ] **Step 1: `qni state show` の shorthand 表示を通す**

`features/qni_state.feature` の新しい scenario を green にする。

`lib/qni/state_file.rb` に手を入れる必要があるなら、責務は最小に留める。理想は `InitialState#to_s` をそのまま使って `state show` を通すこと。

- [ ] **Step 2: `sign_flip.feature` の高レベル DSL を整える**

最終形では次の 5 本に揃える。

- `Z ゲートは |+> を |-> に変える`
- `Z ゲートは |-> を |+> に変える`
- `Z ゲートは 0.6|0> + 0.8|1> を 0.6|0> - 0.8|1> に変える`
- `Z ゲートは実数係数の一般状態で |1> の振幅の符号を反転する`
- `Z ゲートは α|0> + β|1> を α|0> - β|1> に変える`

必要なら scenario 名を、Task 1.1 / 1.2 と同じ語感に揃えて調整する。

- [ ] **Step 3: targeted feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/katas/basic_gates/sign_flip.feature
```

Expected: PASS

- [ ] **Step 4: 互換性を spot check する**

`|+>, |->` shorthand が既存 feature を壊していないことを確認するため、次も流す。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature
```

Expected: PASS

- [ ] **Step 5: high-level SignFlip をコミットする**

```bash
git add features/qni_state.feature features/katas/basic_gates/sign_flip.feature features/step_definitions/cli_steps.rb lib/qni/state_file.rb
git commit -m "test: rewrite sign flip as high-level DSL"
```

`features/step_definitions/cli_steps.rb` や `lib/qni/state_file.rb` に変更がなければ `git add` から外す。

## Task 4: 全体確認をして仕上げる

**Files:**
- Verify only

- [ ] **Step 1: fresh な全体確認**

Run:

```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:

- RuboCop / Reek / Cucumber / Flog / Flay を含む `check` が PASS
- scenario 数は最新件数で増えていてよい

- [ ] **Step 2: 変更内容を要約してコミット列を確認する**

Run:

```bash
git log --oneline --decorate -5
git status --short
```

Expected:

- feature-first red commit
- shorthand implementation commit
- high-level SignFlip commit
- worktree は clean

- [ ] **Step 3: 完了報告**

完了時には少なくとも次を伝える。

- `|+>` / `|->` initial state shorthand が入ったこと
- `sign_flip.feature` が high-level DSL へ揃ったこと
- 実行した verification command と結果

## Notes for the Implementer

- `AGENTS.md` に従い、feature を先に変える。
- `sign_flip.feature` の controlled scenario は戻さない。
- 第 1 段では `|+>` / `|->` のみ。`|+i>` などへは広げない。
- shorthand の内部表現は concrete number 展開で十分。一般の数式 parser を増やさない。
- この plan 実行前に、作業中の [sign_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/sign_flip.feature) の未コミット差分が何かを確認し、誤って消さないこと。
