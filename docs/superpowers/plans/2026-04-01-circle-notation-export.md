# Circle Notation Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `qni export --circle-notation --png` を追加し、1 qubit / 2 qubit の計算基底 state vector を circle notation の PNG として書き出せるようにする。

**Architecture:** 既存の `ExportCommand` に `--circle-notation` 分岐を追加し、render source は simulator の最終 state vector から直接作る。最初は 1 qubit / 2 qubit・PNG のみに絞り、Qni 本家の円表示の概念を保ちながら `qni-cli` 側で最小再実装する。

**Tech Stack:** Ruby, existing `qni export` pipeline, Cucumber, simulator/state vector internals, PNG export helpers

---

## File Structure

- Modify: `features/qni_export.feature`
  - `--circle-notation` の受け入れ仕様を先に追加する
- Modify: `lib/qni/cli.rb`
  - CLI option help を追加する
- Modify: `lib/qni/cli/export_options.rb`
  - `--circle-notation` の validation を追加する
- Modify: `lib/qni/cli/export_command.rb`
  - export 分岐を追加する
- Create: `lib/qni/export/circle_notation_png.rb`
  - state vector を円表示 PNG に変換する
- Modify: `lib/qni/cli/export_help.rb`
  - help text を追加する
- Verify: `features/step_definitions/cli_steps.rb`
  - 既存 step で PNG existence / size check が足りるか確認する

### Task 1: feature を先に追加して red を作る

**Files:**
- Modify: `features/qni_export.feature`

- [ ] **Step 1: help / usage section に `--circle-notation` を追記**

- [ ] **Step 2: 1 qubit PNG 書き出し scenario を追加**

期待:
- `qni export --circle-notation --png --output state.png` が成功
- `state.png` が存在する

- [ ] **Step 3: 2 qubit Bell 状態 PNG 書き出し scenario を追加**

期待:
- `|Φ+>` 初期状態で PNG が書き出せる

- [ ] **Step 4: invalid usage scenario を追加**

期待:
- `--state-vector` との併用は失敗
- 3 qubit 回路は失敗
- `--png` なしは失敗

- [ ] **Step 5: focused cucumber を実行して red を確認**

Run:

```bash
bundle exec cucumber features/qni_export.feature
```

### Task 2: CLI option と validation を追加する

**Files:**
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/cli/export_options.rb`
- Modify: `lib/qni/cli/export_help.rb`

- [ ] **Step 1: `--circle-notation` option を CLI に追加**

- [ ] **Step 2: export option validation を追加**

制約:
- `--circle-notation` は `--png` 必須
- `--circle-notation` と `--state-vector` は排他的

- [ ] **Step 3: help text を更新**

- [ ] **Step 4: focused feature を再実行し、validation failure が期待どおりか確認**

### Task 3: circle notation renderer を実装する

**Files:**
- Create: `lib/qni/export/circle_notation_png.rb`
- Modify: `lib/qni/cli/export_command.rb`

- [ ] **Step 1: final state vector を renderer に渡す export 分岐を追加**

- [ ] **Step 2: 1 qubit / 2 qubit の basis list と layout を実装**

- [ ] **Step 3: 各 basis state について magnitude / phase から円表示を描く**

- [ ] **Step 4: PNG を output path へ保存する**

- [ ] **Step 5: unsupported qubit count で明示的に失敗させる**

### Task 4: verify と smoke test を通す

**Files:**
- Verify: `features/qni_export.feature`

- [ ] **Step 1: export feature を再実行**

Run:

```bash
bundle exec cucumber features/qni_export.feature
```

- [ ] **Step 2: sample Bell state PNG を手元で 1 枚生成**

Run:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
export BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile
bundle exec /home/yasuhito/Work/qni-cli/bin/qni clear
bundle exec /home/yasuhito/Work/qni-cli/bin/qni state set '|Φ+>'
bundle exec /home/yasuhito/Work/qni-cli/bin/qni export --circle-notation --png --output bell.png
```

Expected:
- `bell.png` が存在

- [ ] **Step 3: 1 qubit sample も 1 枚生成**

Run:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
export BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile
bundle exec /home/yasuhito/Work/qni-cli/bin/qni clear
bundle exec /home/yasuhito/Work/qni-cli/bin/qni state set '|+>'
bundle exec /home/yasuhito/Work/qni-cli/bin/qni export --circle-notation --png --output plus.png
```

Expected:
- `plus.png` が存在
