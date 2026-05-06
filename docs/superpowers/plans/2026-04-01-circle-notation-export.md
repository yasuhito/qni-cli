# 円表示書き出し実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは superpowers:subagent-driven-development (サブエージェントが利用可能な場合) または superpowers:executing-plans を使う。進捗管理にはチェックボックス (`- [ ]`) 構文を使う。

**目標:** `qni export --circle-notation --png` を追加し、1 qubit / 2 qubit の計算基底の状態ベクトルを円表示の PNG として書き出せるようにする。

**構成:** 既存の `ExportCommand` に `--circle-notation` 分岐を追加し、描画元はシミュレーターの最終状態ベクトルから直接作る。最初は 1 qubit / 2 qubit・PNG のみに絞り、Qni 本家の円表示の概念を保ちながら `qni-cli` 側で最小再実装する。

**技術構成:** Ruby、既存の `qni export` 処理系、Cucumber、シミュレーター/状態ベクトル内部処理、PNG 書き出しヘルパー

---

## ファイル構成

- 変更: `features/qni_export.feature`
  - `--circle-notation` の受け入れ仕様を先に追加する
- 変更: `lib/qni/cli.rb`
  - CLI オプションのヘルプを追加する
- 変更: `lib/qni/cli/export_options.rb`
  - `--circle-notation` の検証を追加する
- 変更: `lib/qni/cli/export_command.rb`
  - 書き出し分岐を追加する
- 作成: `lib/qni/export/circle_notation_png.rb`
  - 状態ベクトルを円表示 PNG に変換する
- 変更: `lib/qni/cli/export_help.rb`
  - ヘルプ文を追加する
- 確認: `features/step_definitions/cli_steps.rb`
  - 既存ステップで PNG の存在確認 / サイズ確認が足りるか確認する

### 作業 1: 機能仕様を先に追加して失敗状態を作る

**ファイル:**
- 変更: `features/qni_export.feature`

- [ ] **手順 1: ヘルプ / 使い方のセクションに `--circle-notation` を追記**

- [ ] **手順 2: 1 qubit PNG 書き出しシナリオを追加**

期待:
- `qni export --circle-notation --png --output state.png` が成功
- `state.png` が存在する

- [ ] **手順 3: 2 qubit Bell 状態 PNG 書き出しシナリオを追加**

期待:
- `|Φ+>` 初期状態で PNG が書き出せる

- [ ] **手順 4: 不正な使い方のシナリオを追加**

期待:
- `--state-vector` との併用は失敗
- 3 qubit 回路は失敗
- `--png` なしは失敗

- [ ] **手順 5: 対象を絞って Cucumber を実行し、失敗状態を確認**

実行:

```bash
bundle exec cucumber features/qni_export.feature
```

### 作業 2: CLI オプションと検証を追加する

**ファイル:**
- 変更: `lib/qni/cli.rb`
- 変更: `lib/qni/cli/export_options.rb`
- 変更: `lib/qni/cli/export_help.rb`

- [ ] **手順 1: `--circle-notation` オプションを CLI に追加**

- [ ] **手順 2: 書き出しオプションの検証を追加**

制約:
- `--circle-notation` は `--png` 必須
- `--circle-notation` と `--state-vector` は排他的

- [ ] **手順 3: ヘルプ文を更新**

- [ ] **手順 4: 対象を絞った機能仕様を再実行し、検証失敗が期待どおりか確認**

### 作業 3: 円表示の描画処理を実装する

**ファイル:**
- 作成: `lib/qni/export/circle_notation_png.rb`
- 変更: `lib/qni/cli/export_command.rb`

- [ ] **手順 1: 最終状態ベクトルを描画処理に渡す書き出し分岐を追加**

- [ ] **手順 2: 1 qubit / 2 qubit の基底一覧と配置を実装**

- [ ] **手順 3: 各基底状態について大きさ / 位相から円表示を描く**

- [ ] **手順 4: PNG を出力パスへ保存する**

- [ ] **手順 5: 未対応の qubit 数で明示的に失敗させる**

### 作業 4: 検証と簡易確認を通す

**ファイル:**
- 確認: `features/qni_export.feature`

- [ ] **手順 1: 書き出し機能仕様を再実行**

実行:

```bash
bundle exec cucumber features/qni_export.feature
```

- [ ] **手順 2: Bell 状態のサンプル PNG を手元で 1 枚生成**

実行:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
export BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile
bundle exec /home/yasuhito/Work/qni-cli/bin/qni clear
bundle exec /home/yasuhito/Work/qni-cli/bin/qni state set '|Φ+>'
bundle exec /home/yasuhito/Work/qni-cli/bin/qni export --circle-notation --png --output bell.png
```

期待結果:
- `bell.png` が存在する

- [ ] **手順 3: 1 qubit のサンプルも 1 枚生成**

実行:

```bash
tmpdir=$(mktemp -d)
cd "$tmpdir"
export BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile
bundle exec /home/yasuhito/Work/qni-cli/bin/qni clear
bundle exec /home/yasuhito/Work/qni-cli/bin/qni state set '|+>'
bundle exec /home/yasuhito/Work/qni-cli/bin/qni export --circle-notation --png --output plus.png
```

期待結果:
- `plus.png` が存在する
