# BasicGates Task 1.2 and 1.4 Harness Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Task 1.2` と `Task 1.4` の kata feature を Quantum Katas のテストハーネス構成に揃え、`DumpDiffOnOneQubit` 相当と `AssertOperationsEqualReferenced` 相当の両方が feature から読める状態にする。

**Architecture:** `Task 1.2` には非自明入力状態の数値シナリオを 1 本追加する。`Task 1.4` は「1 本の dump 相当の数値シナリオ」と「全角度の controlled 走査」に分け直し、必要なら `features/step_definitions/cli_steps.rb` に近似比較 step を追加して、人間に読める feature の形で Katas テスト構成へ寄せる。

**Tech Stack:** Cucumber, Gherkin, qni-cli

---

## File Structure

- Modify: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` に `0.6|0> + 0.8|1>` 入力の数値シナリオを追加する。
- Modify: `features/katas/basic_gates/amplitude_change.feature`
  - 代表角度 4 本の数値表を、Katas に近い「dump 相当 1 本 + controlled 全角度走査」へ置き換える。
- Modify: `features/step_definitions/cli_steps.rb`
  - `Task 1.4` の controlled 全角度走査を人間に読める形で書くため、必要なら期待値の近似比較 step を追加する。
- Verify: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` が引き続き Katas 再現型の基準として通ることを確認する。
- Verify: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` が引き続き Katas 再現型の基準として通ることを確認する。
- Verify: `features/qni_run.feature`
  - `Task 1.2` と `Task 1.4` の feature 補正で `run` / `run --symbolic` が回帰していないことを確認する。
- Verify: `features/qni_expect.feature`
  - `Task 1.4` の controlled 検証が回帰していないことを確認する。

## Task 1: `Task 1.2` を `DumpDiffOnOneQubit` 相当に揃える

**Files:**
- Modify: `features/katas/basic_gates/basis_change.feature`

- [ ] **Step 1: 非自明入力の failing scenario を追加する**

`features/katas/basic_gates/basis_change.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.2 は 0.6|0> + 0.8|1> を X basis へ変換する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.9899494936611665,-0.14142135623730948
      """
```

- [ ] **Step 2: `Task 1.2` feature を実行して失敗か既存 green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/basis_change.feature
```

Expected:

- 追加直後は red か、既存機能でそのまま green
- 失敗した場合も product code には触らず、期待値や step の書き方だけを見直す

- [ ] **Step 3: `Task 1.2` の補正をコミットする**

```bash
git add features/katas/basic_gates/basis_change.feature
git commit -m "test: align Task 1.2 with kata harness"
```

## Task 2: `Task 1.4` を読みやすい Katas 再現型へ揃える

**Files:**
- Modify: `features/katas/basic_gates/amplitude_change.feature`
- Modify: `features/step_definitions/cli_steps.rb`

- [ ] **Step 1: failing feature を Katas に近い形へ書き換える**

`features/katas/basic_gates/amplitude_change.feature` を次の方針で更新する。

- 数値シナリオは 1 本にする
  - 入力は Katas の `DumpDiffOnOneQubit` に合わせて `0.6|0> + 0.8|1>`
  - 角度は `dumpAlpha = π/3`
  - `Ry(2*alpha)` 適用後の数値出力を固定する
- controlled 検証は `Scenario Outline` にする
  - `alpha = 0 .. 36` を例表で持つ
  - 各行は `qni variable set alpha <alpha>` と `qni expect ZI` を実行する
  - 期待は exact な `"ZI=1.0"` 比較ではなく、近似比較 step で `1.0 ± 1e-12` を確認する
- symbolic シナリオは残す

- [ ] **Step 2: 近似比較 step を先に書いて red を確認する**

`features/step_definitions/cli_steps.rb` に、次のような step を追加する前提で、まず feature を実行して undefined step または失敗を確認する。

```gherkin
ならば 期待値 "ZI" は 1.0 ± 1e-12
```

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

Expected:

- 新しい近似比較 step が未定義か、追加したシナリオが失敗する
- [ ] **Step 3: 近似比較 step を最小実装する**

`features/step_definitions/cli_steps.rb` に、期待値名・期待値・許容誤差を受け取り、`@stdout` から該当行を取り出して数値比較する step を追加する。

実装要件:

- 行形式は `ZI=0.9999999999999996` のような既存 `qni expect` 出力を前提にする
- 指定した observable 名の行がなければ失敗する
- `|actual - expected| <= tolerance` を満たせば成功する

- [ ] **Step 4: `Task 1.4` feature を実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- `Task 1.4` の dump 相当、controlled 全角度走査、symbolic 補助が共存して green

- [ ] **Step 5: `Task 1.4` の補正をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: align Task 1.4 with kata harness"
```

## Task 3: 近接回帰を確認する

**Files:**
- Verify: `features/katas/basic_gates/state_flip.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`
- Verify: `features/katas/basic_gates/sign_flip.feature`
- Verify: `features/katas/basic_gates/amplitude_change.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/qni_expect.feature`

- [ ] **Step 1: kata と関連 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/sign_flip.feature \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- `Task 1.1` から `Task 1.4` までが Katas 再現型で共存して green

- [ ] **Step 2: 最終差分を確認する**

Check:

- product code を変更していない
- 変更が `basis_change.feature`、`amplitude_change.feature`、必要なら `features/step_definitions/cli_steps.rb` に限られている
- `Task 1.2` と `Task 1.4` の feature が、Katas テストコードの意図を feature から読める形になっている

- [ ] **Step 3: 最終確認コミットを作る**

```bash
git add features/katas/basic_gates/basis_change.feature features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: align kata regression coverage"
```

## Notes

- 今回の目的は新機能追加ではなく、既存 feature の再現度を Quantum Katas のテストハーネスに揃えること。
- `Task 1.4` は「1 本の dump 相当」と「全角度の controlled 走査」に分けることで、人間向けの可読性と Katas 相当の網羅性を両立する。
- `Task 1.5` はこの補正が済んでから、最初から同じ基準で追加する。
