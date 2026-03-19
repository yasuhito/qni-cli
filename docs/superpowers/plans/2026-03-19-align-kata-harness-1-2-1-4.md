# BasicGates Task 1.2 and 1.4 Harness Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Task 1.2` と `Task 1.4` の kata feature を Quantum Katas のテストハーネス構成に揃え、`DumpDiffOnOneQubit` 相当と `AssertOperationsEqualReferenced` 相当の両方が feature から読める状態にする。

**Architecture:** product code は変更せず、`features/katas/basic_gates/basis_change.feature` と `features/katas/basic_gates/amplitude_change.feature` だけを修正する。`Task 1.2` には非自明入力状態の数値シナリオを 1 本追加し、`Task 1.4` には全角度走査を表す `Scenario Outline` を追加して、既存の controlled 検証と symbolic 補助を残したまま Katas テストに近い形へ寄せる。

**Tech Stack:** Cucumber, Gherkin, qni-cli

---

## File Structure

- Modify: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` に `0.6|0> + 0.8|1>` 入力の数値シナリオを追加する。
- Modify: `features/katas/basic_gates/amplitude_change.feature`
  - 代表角度 4 本の例表を、Katas の `0 .. 36` 走査に対応する全角度例表へ置き換える。
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

## Task 2: `Task 1.4` を全角度走査に揃える

**Files:**
- Modify: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: 37 角度分の期待値を生成する**

一時的にローカルで期待値表を生成する。生成物はコミットしない。

Run:

```bash
python3 - <<'PY'
import math
for i in range(37):
    alpha = 2 * math.pi * i / 36
    ry_angle = 2 * alpha
    a0 = math.cos(alpha)
    a1 = math.sin(alpha)
    print(f"| {i:2d} | {ry_angle!r} | {a0!r},{a1!r} |")
PY
```

Expected:

- `i = 0 .. 36` の 37 行が出る
- `ry_angle` と `state_vector` を例表へ転記できる

- [ ] **Step 2: `Scenario Outline` の例表を全角度走査へ置き換える**

`features/katas/basic_gates/amplitude_change.feature` の数値シナリオを次の方針で更新する。

- シナリオ名は維持する
- 例表列名を `double_alpha` から `ry_angle` に変更する
- 例表を `i = 0 .. 36` の 37 行へ広げる
- 既存の controlled 検証シナリオと symbolic シナリオは残す

- [ ] **Step 3: `Task 1.4` feature を実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- `Task 1.4` の数値走査、controlled 検証、symbolic 補助が共存して green

- [ ] **Step 4: `Task 1.4` の補正をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
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
- 変更が `basis_change.feature` と `amplitude_change.feature` に限られている
- `Task 1.2` と `Task 1.4` の feature が、Katas テストコードの意図を feature から読める形になっている

- [ ] **Step 3: 最終確認コミットを作る**

```bash
git add features/katas/basic_gates/basis_change.feature features/katas/basic_gates/amplitude_change.feature
git commit -m "test: align kata regression coverage"
```

## Notes

- 今回の目的は新機能追加ではなく、既存 feature の再現度を Quantum Katas のテストハーネスに揃えること。
- `Task 1.4` の 37 行例表は長くなるが、「Katas の `0 .. 36` 走査が見えること」を優先して feature 側へ展開する。
- `Task 1.5` はこの補正が済んでから、最初から同じ基準で追加する。
