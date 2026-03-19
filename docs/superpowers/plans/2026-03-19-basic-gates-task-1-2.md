# BasicGates Task 1.2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.2 BasisChange` を `features/katas/basic_gates.feature` に追加し、`H` による基底変換を数値、controlled 検証、symbolic 表示の 3 つの観点で回帰テスト化する。

**Architecture:** `Task 1.1` と同じ粒度を維持するため、`features/katas/basic_gates.feature` に `Task 1.2` の 5 シナリオを順に追加する。既存の `qni run`、`qni run --symbolic`、`qni expect`、初期状態 step だけで表現できる前提で進め、product code は触らない。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Modify: `features/katas/basic_gates.feature`
  - `Task 1.2` の数値 2 シナリオ、controlled 検証 1 シナリオ、symbolic 説明 1 シナリオ、問題文ヘッダを追加する。
- Verify: `features/qni_run.feature`
  - `H` と `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- Verify: `features/qni_expect.feature`
  - controlled-`H` を含む `qni expect` の経路が問題なく動くことを確認する。
- Verify: `features/katas/basic_gates.feature`
  - `Task 1.1` と `Task 1.2` が同じ feature 内で共存して green であることを確認する。

## Task 1: Add the failing Task 1.2 scenarios first

**Files:**
- Modify: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Write the new Task 1.2 section and scenarios**

`features/katas/basic_gates.feature` に `Task 1.2 BasisChange` の説明行と次の 4 シナリオを追加する。

```gherkin
  シナリオ: Task 1.2 は |0> を |+> に変える
    前提 空の 1 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: Task 1.2 は |1> を |-> に変える
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: Task 1.2 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add H --control 0 --qubit 1 --step 2" を実行
    かつ "qni add H --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """

  シナリオ: Task 1.2 は symbolic 表示で一般状態への基底変換を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      0.7071067811865475*cos(theta/2) + 0.7071067811865475*sin(theta/2)|0> + 0.7071067811865475*cos(theta/2) - 0.7071067811865475*sin(theta/2)|1>
      """
```

`Task 1.2` の問題文要約も `Task 1.1` と同じ形式で feature 上に追加する。

- [ ] **Step 2: Run the focused kata feature and verify red**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- 新規 `Task 1.2` シナリオのうち少なくとも 1 本が失敗する
- failure は期待文字列か、controlled-`H` の CLI 表現差にある
- `Task 1.1` シナリオ群は引き続き green

- [ ] **Step 3: Commit the failing feature**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add Task 1.2 kata scenarios"
```

## Task 2: Adjust only the feature expectations to match actual CLI output

**Files:**
- Modify: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Re-run one failing Task 1.2 scenario**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:60
```

Expected:

- actual の `qni run` / `qni run --symbolic` / `qni expect` 出力が 1 シナリオ単位で確認できる

- [ ] **Step 2: Make the smallest possible correction in the feature**

変更は次に限定する。

- 数値の丸め差があれば expected stdout を現実の CLI 出力に合わせる
- symbolic の項順や係数表記が既存 `qni_run.feature` と整合しているなら、その表記に feature を合わせる
- controlled-`H` が既存 CLI で書けない場合はここで止め、新しい spec / plan に戻る

このタスクでは product code を変更しない。

- [ ] **Step 3: Re-run the kata feature and verify it turns green**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- `Task 1.1` と `Task 1.2` を含む kata feature が green

- [ ] **Step 4: Commit the corrected feature**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: document Task 1.2 basis change"
```

## Task 3: Verify nearby regressions

**Files:**
- Verify: `features/katas/basic_gates.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/qni_expect.feature`

- [ ] **Step 1: Run the targeted regression set**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature features/katas/basic_gates.feature
```

Expected:

- PASS
- `Task 1.2` の数値・controlled・symbolic の 3 系統が green
- `Task 1.1` の既存ケースが回帰していない

- [ ] **Step 2: Inspect the final diff**

Check:

- 変更が `features/katas/basic_gates.feature` だけに収まっている
- product code に変更がない

- [ ] **Step 3: Commit the verification checkpoint**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: verify Task 1.2 kata coverage"
```

## Notes

- 今回は `Task 1.2` を `Task 1.1` と同じ深さに揃えることが目的であり、product code 追加は前提にしない。
- symbolic シナリオの式は、説明の分かりやすさよりも既存 `qni run --symbolic` の実出力との一致を優先する。
- controlled-`H` が `qni add H --control 0 --qubit 1` でそのまま書けることが前提であり、ここで不足が見つかった場合は新しい spec / plan に切り出す。
