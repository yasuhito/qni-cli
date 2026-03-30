# Amplitude Change High-Level DSL Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `amplitude_change.feature` を Task 1.1 / 1.2 / 1.3 と同じ高レベル DSL に書き換え、`When 振幅を θ だけ回転:` で Task 1.4 の意図をストレートに表せるようにする。

**Architecture:** 先に [amplitude_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature) を高レベル形へ赤く書き換え、失敗理由を `振幅を ... だけ回転` step の未実装に限定する。実装は [features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) に最小の 1 step を追加し、内部では既存の `Ry` と symbolic / numeric run を再利用して green にする。

**Tech Stack:** Ruby, Cucumber, Bundler, `cli_steps.rb`, `qni-cli`

---

## File Structure

- Modify: `features/katas/basic_gates/amplitude_change.feature`
  - low-level な `qni add Ry ...` / CSV 比較 / controlled 検証を、高レベル DSL の 1-qubit scenario へ置き換える。
- Modify: `features/step_definitions/cli_steps.rb`
  - `When 振幅を {angle} だけ回転:` を追加し、角度文字列を最小限正規化して `Ry(2*angle)` を append する。
- Verify: `features/katas/basic_gates/state_flip.feature`
  - 既存の高レベル DSL が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/basis_change.feature`
  - `|+>, |->` 基底 DSL への影響がないことを確認する。
- Verify: `features/katas/basic_gates/sign_flip.feature`
  - `状態ベクトルは:` ベースの高レベル DSL が回帰していないことを確認する。

## Task 1: `amplitude_change.feature` を高レベル DSL へ先に書き換えて赤くする

**Files:**
- Modify: `features/katas/basic_gates/amplitude_change.feature`
- Test: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: Task 1.4 を高レベル scenario へ書き換える**

`features/katas/basic_gates/amplitude_change.feature` を次の方向へ更新する。

```gherkin
Scenario: 振幅回転は |0> を cos(θ)|0> + sin(θ)|1> に変える
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    cos(θ)|0> + sin(θ)|1>
    """

Scenario: 振幅回転は |1> を -sin(θ)|0> + cos(θ)|1> に変える
  Given 初期状態ベクトルは:
    """
    |1>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    -sin(θ)|0> + cos(θ)|1>
    """

Scenario: θ = π/3 の振幅回転は 0.6|0> + 0.8|1> を -0.3928203230275509|0> + 0.9196152422706633|1> に変える
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 振幅を π/3 だけ回転:
  Then 状態ベクトルは:
    """
    -0.3928203230275509|0> + 0.9196152422706633|1>
    """

Scenario: 振幅回転は α|0> + β|1> を一般式どおりに変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    (αcos(θ) - βsin(θ))|0> + (αsin(θ) + βcos(θ))|1>
    """
```

この task で controlled 検証 scenario は削除する。

- [ ] **Step 2: focused 実行で red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:

- `Undefined step` で `When 振幅を θ だけ回転:` が未実装として落ちる
- または angle 正規化不足で `qni add` 相当の失敗になる
- 失敗理由が typo ではなく DSL 未実装である

- [ ] **Step 3: failing feature をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
git commit -m "test: rewrite amplitude change scenarios"
```

## Task 2: `振幅を ... だけ回転` step を最小実装する

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Test: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: step definition を追加する**

`features/step_definitions/cli_steps.rb` に次を追加する。

```ruby
When('振幅を {string} だけ回転:') do |angle|
  normalized_angle = angle.tr('θ', 'theta').delete(' ')
  append_circuit_json(
    @scenario_dir,
    {
      'qubits' => 1,
      'cols' => [["Ry(2*#{normalized_angle})"]]
    }
  )
end
```

必要なら helper を追加して、

- `θ` -> `theta`
- 空白除去

だけを責務に切り出す。

- [ ] **Step 2: 1 qubit 専用であることをコード上で明確にする**

上の step は初期版では 1 qubit 専用とする。
必要ならコメントか小さな helper 名で意図を明示する。

例:

```ruby
def amplitude_rotation_column(angle)
  [["Ry(2*#{normalize_angle_text(angle)})"]]
end
```

- [ ] **Step 3: focused feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:

- 4 scenario が PASS
- symbolic 一般式が `(αcos(θ) - βsin(θ))|0> + (αsin(θ) + βcos(θ))|1>` と一致する

- [ ] **Step 4: step 実装をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/amplitude_change.feature
git commit -m "feat: add amplitude rotation DSL step"
```

## Task 3: 近接 kata の回帰を確認する

**Files:**
- Verify: `features/katas/basic_gates/state_flip.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`
- Verify: `features/katas/basic_gates/sign_flip.feature`
- Verify: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: high-level kata セットを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/sign_flip.feature \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- Task 1.1 から 1.4 までが同じ DSL の流れで green

- [ ] **Step 2: step wording が崩れていないことを確認する**

Check:

- `Then 状態ベクトルは:` を使う feature が回帰していない
- `Then |+>, |-> 基底での状態ベクトルは:` の scenario に影響がない

- [ ] **Step 3: 回帰確認をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify high-level gate kata DSL"
```

## Task 4: full check を fresh に通す

**Files:**
- Verify: `features/step_definitions/cli_steps.rb`
- Verify: `features/katas/basic_gates/amplitude_change.feature`
- Verify: repo-wide checks

- [ ] **Step 1: symbolic runtime を先に整える**

Run:

```bash
bash scripts/setup_symbolic_python.sh
```

Expected:

- SymPy version が表示される

- [ ] **Step 2: repo 全体の品質チェックを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:

- RuboCop PASS
- reek PASS
- cucumber PASS
- flog / flay PASS

- [ ] **Step 3: 最終差分を確認する**

Check:

- 変更が `amplitude_change.feature` と `cli_steps.rb` 中心に収まっている
- unrelated な DSL 拡張が入っていない

- [ ] **Step 4: 最終 commit を追加する**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: complete amplitude change high-level DSL"
```

- [ ] **Step 5: integration handoff**

If the branch is clean and `rake check` passed, merge or prepare PR using the repo’s usual completion flow.
