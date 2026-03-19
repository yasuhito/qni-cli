# BasicGates Task 1.3 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.3 SignFlip` を `features/katas/basic_gates/sign_flip.feature` に追加し、`Z` による符号反転を数値、controlled 検証、symbolic 表示の 3 つの観点で回帰テスト化する。

**Architecture:** `Task 1.1` と `Task 1.2` と同じ粒度を維持するため、新しい `features/katas/basic_gates/sign_flip.feature` を作って `Task 1.3` の 5 シナリオを順に追加する。既存の `qni run`、`qni run --symbolic`、`qni expect`、初期状態 step だけで表現できる前提で進め、product code は触らない。不足が見つかった場合はその場で実装を足さず、新しい spec / plan に戻る。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` の問題文、数値 3 シナリオ、controlled 検証 1 シナリオ、symbolic 説明 1 シナリオを追加する。
- Verify: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` の既存ケースが回帰していないことを確認する。
- Verify: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` の既存ケースが回帰していないことを確認する。
- Verify: `features/qni_run.feature`
  - `qni run` と `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- Verify: `features/qni_expect.feature`
  - controlled-`Z` を含む `qni expect` の経路が問題なく動くことを確認する。

## Task 1: 失敗する `Task 1.3` feature を先に追加する

**Files:**
- Create: `features/katas/basic_gates/sign_flip.feature`
- Test: `features/katas/basic_gates/sign_flip.feature`

- [ ] **Step 1: `Task 1.3` の問題文と 5 シナリオを書く**

`features/katas/basic_gates/sign_flip.feature` を新規作成し、`Task 1.3 SignFlip` の問題文と次の 5 シナリオを追加する。

```gherkin
# language: ja
機能: Quantum Katas BasicGates Task 1.3 SignFlip
  Task 1.3 SignFlip: |+⟩ を |-⟩ に、|-⟩ を |+⟩ に変える
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  状態を α|0⟩ - β|1⟩ に変える

  シナリオ: Task 1.3 は |+> を |-> に変える
    前提 空の 1 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: Task 1.3 は |-> を |+> に変える
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    かつ "qni add Z --qubit 0 --step 2" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: Task 1.3 は 0.6|0> + 0.8|1> を 0.6|0> - 0.8|1> に変える
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.6,-0.8
      """

  シナリオ: Task 1.3 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add Z --control 0 --qubit 1 --step 2" を実行
    かつ "qni add Z --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """

  シナリオ: Task 1.3 は symbolic 表示で一般状態の符号反転を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(theta/2)|0> - sin(theta/2)|1>
      """
```

- [ ] **Step 2: `Task 1.3` feature を実行して red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/sign_flip.feature
```

Expected:

- 新規 `Task 1.3` シナリオのうち少なくとも 1 本が失敗する
- failure は expected stdout の差、または controlled-`Z` / symbolic の既存 CLI 表現差にある

- [ ] **Step 3: failing feature をコミットする**

```bash
git add features/katas/basic_gates/sign_flip.feature
git commit -m "test: add Task 1.3 kata scenarios"
```

## Task 2: 期待値だけを最小修正して green にする

**Files:**
- Modify: `features/katas/basic_gates/sign_flip.feature`
- Test: `features/katas/basic_gates/sign_flip.feature`

- [ ] **Step 1: 失敗した 1 シナリオを単独で再実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/sign_flip.feature:1
```

Expected:

- actual の `qni run` / `qni run --symbolic` / `qni expect` 出力を確認できる

- [ ] **Step 2: feature の期待値だけを最小修正する**

変更は次に限定する。

- 数値の丸め差があれば expected stdout を現実の CLI 出力に合わせる
- symbolic の符号、項順、係数表記が既存 `qni_run.feature` と整合しているなら、その表記に feature を合わせる
- controlled-`Z` が既存 CLI で書けない場合はここで止め、新しい spec / plan に戻る

このタスクでは product code を変更しない。

- [ ] **Step 3: `Task 1.3` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/sign_flip.feature
```

Expected:

- `Task 1.3` の 5 シナリオが green

- [ ] **Step 4: 修正済み feature をコミットする**

```bash
git add features/katas/basic_gates/sign_flip.feature
git commit -m "test: document Task 1.3 sign flip"
```

## Task 3: 近接回帰を確認する

**Files:**
- Verify: `features/katas/basic_gates/sign_flip.feature`
- Verify: `features/katas/basic_gates/state_flip.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/qni_expect.feature`

- [ ] **Step 1: 近接回帰セットを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/sign_flip.feature
```

Expected:

- PASS
- `Task 1.1`、`Task 1.2`、`Task 1.3` が共存して green
- `qni run`、`qni run --symbolic`、`qni expect` の既存 feature が回帰していない

- [ ] **Step 2: 最終差分を確認する**

Check:

- 変更が `features/katas/basic_gates/sign_flip.feature` だけに収まっている
- product code と step 定義に変更がない

- [ ] **Step 3: 回帰確認のチェックポイントをコミットする**

```bash
git add features/katas/basic_gates/sign_flip.feature
git commit -m "test: verify Task 1.3 kata coverage"
```

## Notes

- 今回は `Task 1.3` を `Task 1.1` と `Task 1.2` と同じ深さに揃えることが目的であり、product code 追加は前提にしない。
- `Task 1.3` は位相と符号を扱うため、symbolic 出力の整形を改善したくなる可能性はあるが、この plan ではまず既存出力に feature を合わせる。
- controlled-`Z` が `qni add Z --control 0 --qubit 1` でそのまま書けることが前提であり、ここで不足が見つかった場合は新しい spec / plan に切り出す。
