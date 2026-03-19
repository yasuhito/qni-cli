# BasicGates Feature Split Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `features/katas/basic_gates.feature` を task 名ごとの feature に分割し、`Task 1.1 StateFlip` と `Task 1.2 BasisChange` を独立して読める回帰テスト構成にする。

**Architecture:** 既存の `features/katas/basic_gates.feature` に入っている `Task 1.1` と `Task 1.2` のシナリオ群を、そのまま `features/katas/basic_gates/state_flip.feature` と `features/katas/basic_gates/basis_change.feature` に移す。product code や step 定義は変えず、feature ファイル構成と実行コマンドだけを更新する。古い path を含む過去の plan 文書は歴史的記録として残し、この分割作業では修正対象にしない。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1 StateFlip` の問題文、数値 3 シナリオ、controlled 検証 1 シナリオ、symbolic 説明 1 シナリオを移す。
- Create: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2 BasisChange` の問題文、数値 2 シナリオ、controlled 検証 1 シナリオ、symbolic 説明 1 シナリオを移す。
- Delete: `features/katas/basic_gates.feature`
  - 分割後は不要になる集約 feature を削除する。
- Verify: `features/qni_run.feature`
  - `qni run` と `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- Verify: `features/qni_expect.feature`
  - controlled 検証で使う `qni expect` 経路が回帰していないことを確認する。

## Task 1: 旧 feature を task 名 feature に分解する

**Files:**
- Create: `features/katas/basic_gates/state_flip.feature`
- Create: `features/katas/basic_gates/basis_change.feature`
- Delete: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates/state_flip.feature`
- Test: `features/katas/basic_gates/basis_change.feature`

- [ ] **Step 1: `Task 1.1` 用 feature を追加する**

`features/katas/basic_gates/state_flip.feature` を新規作成し、`features/katas/basic_gates.feature` にある `Task 1.1` の内容だけを移す。先頭の問題文もシナリオも、そのまま独立して読める形にする。

- [ ] **Step 2: `Task 1.2` 用 feature を追加する**

`features/katas/basic_gates/basis_change.feature` を新規作成し、`features/katas/basic_gates.feature` にある `Task 1.2` の内容だけを移す。`Task 1.2` はコメント行だった問題文を通常の feature 冒頭説明として読みやすく整える。

- [ ] **Step 3: 旧集約 feature を削除する**

`features/katas/basic_gates.feature` を削除し、task ごとに分かれた構成だけを残す。

- [ ] **Step 4: 分割した 2 feature だけを実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature
```

Expected:

- PASS
- `Task 1.1` の 5 シナリオが green
- `Task 1.2` の 4 シナリオが green

- [ ] **Step 5: 分割だけを 1 コミットにする**

```bash
git add features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates.feature
git commit -m "test: split basic gates kata features"
```

## Task 2: 実際に使う回帰コマンドを新パスへ切り替える

**Files:**
- Verify: `features/qni_run.feature`
- Verify: `features/qni_expect.feature`
- Verify: `features/katas/basic_gates/state_flip.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`

- [ ] **Step 1: 近接回帰セットを新しい feature パスで実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature
```

Expected:

- PASS
- `qni run`、`qni run --symbolic`、`qni expect` の既存 feature が回帰していない
- kata 側は `Task 1.1` と `Task 1.2` を別ファイルで実行しても green

- [ ] **Step 2: 変更差分を確認する**

Check:

- 変更が `features/katas/basic_gates/` 配下の feature 分割に限られている
- product code と step 定義に変更がない

- [ ] **Step 3: 回帰確認のチェックポイントをコミットする**

```bash
git add features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates.feature
git commit -m "test: verify split basic gates kata features"
```

## Task 3: 旧 path が実動線に残っていないことを確認する

**Files:**
- Verify: `features/katas/basic_gates/state_flip.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`
- Verify: `docs/superpowers/specs/2026-03-19-quantum-katas-design.md`
- Verify: `docs/superpowers/plans/*.md`

- [ ] **Step 1: `basic_gates.feature` の参照を検索する**

Run:

```bash
rg -n "features/katas/basic_gates\\.feature|basic_gates\\.feature" .
```

Expected:

- ヒットは過去の spec / plan 文書に限られる
- 現行の feature 実行対象や product code に旧 path が残っていない

- [ ] **Step 2: 歴史的文書は今回は触らないことを確認する**

この作業では、過去の plan や spec の本文に残る旧 path を一括修正しない。必要になったときに別作業で直す。

- [ ] **Step 3: 最終確認後にコミットする**

```bash
git status --short
```

Expected:

- 追加の未整理変更がない

## Notes

- この作業の目的は feature の可読性と運用性の改善であり、`qni-cli` 本体の機能追加ではない。
- `Task 1.3` 以降は最初から `features/katas/basic_gates/<task_name>.feature` 形式で追加する。
- `Task 1.1` と `Task 1.2` のシナリオ本文は、意味を変えずにファイルを分けることを優先する。
