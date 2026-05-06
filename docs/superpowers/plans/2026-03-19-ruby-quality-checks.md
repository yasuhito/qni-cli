# Ruby 品質チェック実装計画

> **エージェント作業者向け:** 必須: この計画の実装には superpowers:subagent-driven-development（サブエージェントが利用できる場合）または superpowers:executing-plans を使う。手順は追跡用にチェックボックス（`- [ ]`）構文を使う。

**目的:** 現在の `reek` と `flog` の失敗を解消し、`rubocop`、`flay`、`reek`、`flog`、`cucumber` をすべて通る状態にする。

**方針:** 振る舞いは変えずに、`lib/qni/angle_expression.rb`、`lib/qni/symbolic_state_renderer.rb`、`lib/qni/cli.rb` の責務を小さく分割して複雑度を下げる。新機能は追加せず、既存の `Task 1.4` と単純な角度式対応を保ったまま品質チェックだけを通す。

**技術構成:** Ruby, Rake, RuboCop, Reek, Flog, Flay, Cucumber

---

## 対象ファイル

- 変更: `lib/qni/angle_expression.rb`
  - `RepeatedConditional` と `TooManyMethods` を解消するため、最小限の内部表現へ整理する。
- 変更: `lib/qni/symbolic_state_renderer.rb`
  - `render` の複雑度を下げ、ユーティリティメソッドと判定されるメソッドをクラスメソッドまたは別責務へ移す。
- 変更: `lib/qni/cli.rb`
  - `simulate` の文数を下げるため、小さな補助メソッドへ抽出する。
- 確認: `features/add_ry_gate.feature`
  - 単純な角度式対応が回帰していないことを確認する。
- 確認: `features/qni_run.feature`
  - `run` / `run --symbolic` の挙動が変わっていないことを確認する。
- 確認: `features/qni_expect.feature`
  - `expect` の角度式解決が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` が回帰していないことを確認する。

## タスク 1: `AngleExpression` の条件分岐を整理する

**対象ファイル:**
- 変更: `lib/qni/angle_expression.rb`

- [ ] **手順 1: 失敗している指摘を再確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
```

期待結果:

- `lib/qni/angle_expression.rb` で `RepeatedConditional`
- `lib/qni/angle_expression.rb` で `TooManyMethods`

- [ ] **手順 2: 内部表現を 1 回だけ決める補助メソッドを導入する**

`normalized` ごとに 1 回だけ種別を決める `private` な補助メソッドを追加し、少なくとも次のどれかを返す形にする。

- `[:numeric, value]`
- `[:variable, name]`
- `[:pi_term, object]`
- `[:product, coefficient_text, inner_expression]`

`radians`、`to_s`、`concrete?` はこの内部表現だけを見るようにして、`multiplied_term` を何度も判定しない。

- [ ] **手順 3: `AngleExpression` 周辺の回帰確認を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- PASS
- `2*alpha` / `-2*alpha` の挙動が変わっていない

- [ ] **手順 4: `AngleExpression` の整理をコミットする**

```bash
git add lib/qni/angle_expression.rb
git commit -m "refactor: simplify angle expression branching"
```

## タスク 2: `SymbolicStateRenderer` の複雑度を下げる

**対象ファイル:**
- 変更: `lib/qni/symbolic_state_renderer.rb`

- [ ] **手順 1: `flog` / `reek` の失敗を再確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
```

期待結果:

- `Qni::SymbolicStateRenderer#render` が `TooManyStatements`
- `Qni::SymbolicStateRenderer#render` の `flog` スコアが `20` を超える
- ユーティリティメソッドの指摘が 2 件ある

- [ ] **手順 2: `render` を小さい補助メソッドに分割する**

少なくとも次を抽出する。

- コマンド実行を担当する補助メソッド
- 再試行/失敗判定を担当する補助メソッド
- フォールバック失敗時の最終エラーを返す補助メソッド

`retryable_with_next_command?` と `render_error_message` は、インスタンス状態に依存しないならクラスメソッドまたはモジュール関数に寄せる。

- [ ] **手順 3: `SymbolicStateRenderer` 周辺の回帰確認を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/sign_flip.feature features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- PASS
- `run --symbolic` の既存出力が回帰していない

- [ ] **手順 4: `SymbolicStateRenderer` の整理をコミットする**

```bash
git add lib/qni/symbolic_state_renderer.rb
git commit -m "refactor: reduce symbolic renderer complexity"
```

## タスク 3: `CLI#simulate` の文数を下げる

**対象ファイル:**
- 変更: `lib/qni/cli.rb`

- [ ] **手順 1: `CLI#simulate` の指摘を再確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
```

期待結果:

- `lib/qni/cli.rb` の `simulate` に `TooManyStatements`

- [ ] **手順 2: シミュレーター構築と出力分岐を補助メソッドへ抽出する**

`simulate` から次を `private` な補助メソッドに分ける。

- 回路からシミュレーターを作る処理
- `options[:symbolic]` を見て描画メソッドを選ぶ処理

このタスクでは CLI API やヘルプ文言は変えない。

- [ ] **手順 3: CLI 周辺の回帰確認を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature
```

期待結果:

- PASS
- `run` / `expect` のエラー経路と出力が回帰していない

- [ ] **手順 4: `CLI#simulate` の整理をコミットする**

```bash
git add lib/qni/cli.rb
git commit -m "refactor: simplify simulate command"
```

## タスク 4: 品質チェックと回帰をまとめて確認する

**対象ファイル:**
- 確認: `lib/qni/angle_expression.rb`
- 確認: `lib/qni/symbolic_state_renderer.rb`
- 確認: `lib/qni/cli.rb`
- 確認: `features/add_ry_gate.feature`
- 確認: `features/qni_run.feature`
- 確認: `features/qni_expect.feature`
- 確認: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: Ruby 品質チェックをまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

期待結果:

- すべて PASS

- [ ] **手順 2: Cucumber 全体を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待結果:

- PASS
- `Task 1.4` と単純な角度式対応を含めて回帰なし

- [ ] **手順 3: 最終差分を確認する**

確認:

- 振る舞い変更がない
- 変更が 3 ファイルの責務分割に限られている

- [ ] **手順 4: 品質改善をコミットする**

```bash
git add lib/qni/angle_expression.rb lib/qni/symbolic_state_renderer.rb lib/qni/cli.rb
git commit -m "refactor: pass ruby quality checks"
```

## メモ

- 今回の目的は品質チェック通過であり、新しい機能や CLI 仕様変更ではない。
- `reek` と `flog` を通すための抽出は、責務分割に留める。一般化や大規模整理には広げない。
- `Task 1.4` と角度式の機能回帰を最優先し、品質改善のために挙動を変えない。
