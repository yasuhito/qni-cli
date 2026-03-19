# Ruby Quality Checks Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 現在の `reek` と `flog` の失敗を解消し、`rubocop`、`flay`、`reek`、`flog`、`cucumber` をすべて通る状態にする。

**Architecture:** 振る舞いは変えずに、`lib/qni/angle_expression.rb`、`lib/qni/symbolic_state_renderer.rb`、`lib/qni/cli.rb` の責務を小さく分割して複雑度を下げる。新機能は追加せず、既存の `Task 1.4` と simple angle expression 対応を保ったまま品質チェックだけを通す。

**Tech Stack:** Ruby, Rake, RuboCop, Reek, Flog, Flay, Cucumber

---

## File Structure

- Modify: `lib/qni/angle_expression.rb`
  - `RepeatedConditional` と `TooManyMethods` を解消するため、最小限の内部表現へ整理する。
- Modify: `lib/qni/symbolic_state_renderer.rb`
  - `render` の複雑度を下げ、utility 判定されるメソッドをクラスメソッドまたは別責務へ移す。
- Modify: `lib/qni/cli.rb`
  - `simulate` の statement 数を下げるため、小さな helper へ抽出する。
- Verify: `features/add_ry_gate.feature`
  - simple angle expression 対応が回帰していないことを確認する。
- Verify: `features/qni_run.feature`
  - `run` / `run --symbolic` の挙動が変わっていないことを確認する。
- Verify: `features/qni_expect.feature`
  - `expect` の angle expression 解決が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` が回帰していないことを確認する。

## Task 1: `AngleExpression` の条件分岐を整理する

**Files:**
- Modify: `lib/qni/angle_expression.rb`

- [ ] **Step 1: 失敗している smell を再確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
```

Expected:

- `lib/qni/angle_expression.rb` で `RepeatedConditional`
- `lib/qni/angle_expression.rb` で `TooManyMethods`

- [ ] **Step 2: 内部表現を 1 回だけ決める helper を導入する**

`normalized` ごとに 1 回だけ種別を決める private helper を追加し、少なくとも次のどれかを返す形にする。

- `[:numeric, value]`
- `[:variable, name]`
- `[:pi_term, object]`
- `[:product, coefficient_text, inner_expression]`

`radians`、`to_s`、`concrete?` はこの内部表現だけを見るようにして、`multiplied_term` を何度も判定しない。

- [ ] **Step 3: `AngleExpression` 周辺の回帰を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- `2*alpha` / `-2*alpha` の挙動が変わっていない

- [ ] **Step 4: `AngleExpression` の整理をコミットする**

```bash
git add lib/qni/angle_expression.rb
git commit -m "refactor: simplify angle expression branching"
```

## Task 2: `SymbolicStateRenderer` の複雑度を下げる

**Files:**
- Modify: `lib/qni/symbolic_state_renderer.rb`

- [ ] **Step 1: `flog` / `reek` の失敗を再確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
```

Expected:

- `Qni::SymbolicStateRenderer#render` が `TooManyStatements`
- `Qni::SymbolicStateRenderer#render` の flog score が `20` を超える
- utility method 指摘が 2 件ある

- [ ] **Step 2: `render` を小さい helper に分割する**

少なくとも次を抽出する。

- command 実行を担当する helper
- retry / fail 判定を担当する helper
- fallback 失敗時の最終エラーを返す helper

`retryable_with_next_command?` と `render_error_message` は、instance state に依存しないなら class method または module function に寄せる。

- [ ] **Step 3: `SymbolicStateRenderer` 周辺の回帰を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/sign_flip.feature features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- `run --symbolic` の既存出力が回帰していない

- [ ] **Step 4: `SymbolicStateRenderer` の整理をコミットする**

```bash
git add lib/qni/symbolic_state_renderer.rb
git commit -m "refactor: reduce symbolic renderer complexity"
```

## Task 3: `CLI#simulate` の statement 数を下げる

**Files:**
- Modify: `lib/qni/cli.rb`

- [ ] **Step 1: `CLI#simulate` の smell を再確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
```

Expected:

- `lib/qni/cli.rb` の `simulate` に `TooManyStatements`

- [ ] **Step 2: simulator 構築と出力分岐を helper へ抽出する**

`simulate` から次を private helper に分ける。

- circuit から simulator を作る処理
- `options[:symbolic]` を見て render method を選ぶ処理

この task では CLI API や help 文言は変えない。

- [ ] **Step 3: CLI 周辺の回帰を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature
```

Expected:

- PASS
- `run` / `expect` のエラー経路と出力が回帰していない

- [ ] **Step 4: `CLI#simulate` の整理をコミットする**

```bash
git add lib/qni/cli.rb
git commit -m "refactor: simplify simulate command"
```

## Task 4: 品質チェックと回帰をまとめて確認する

**Files:**
- Verify: `lib/qni/angle_expression.rb`
- Verify: `lib/qni/symbolic_state_renderer.rb`
- Verify: `lib/qni/cli.rb`
- Verify: `features/add_ry_gate.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/qni_expect.feature`
- Verify: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: Ruby 品質チェックをまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

Expected:

- すべて PASS

- [ ] **Step 2: full cucumber を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

Expected:

- PASS
- `Task 1.4` と simple angle expression 対応を含めて回帰なし

- [ ] **Step 3: 最終差分を確認する**

Check:

- 振る舞い変更がない
- 変更が 3 file の責務分割に限られている

- [ ] **Step 4: 品質改善をコミットする**

```bash
git add lib/qni/angle_expression.rb lib/qni/symbolic_state_renderer.rb lib/qni/cli.rb
git commit -m "refactor: pass ruby quality checks"
```

## Notes

- 今回の目的は品質チェック通過であり、新しい機能や CLI 仕様変更ではない。
- `reek` と `flog` を通すための抽出は、責務分割に留める。一般化や大規模整理には広げない。
- `Task 1.4` と angle expression の機能回帰を最優先し、品質改善のために挙動を変えない。
