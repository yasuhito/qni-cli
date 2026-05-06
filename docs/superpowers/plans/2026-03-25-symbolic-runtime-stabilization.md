# 記号実行環境安定化の実装計画

> **エージェント作業者向け:** 必須: この計画の実装には superpowers:subagent-driven-development（サブエージェントが利用可能な場合）または superpowers:executing-plans を使う。手順の進捗管理にはチェックボックス（`- [ ]`）構文を使う。

**目的:** `qni run --symbolic` がセットアップ完了後のローカル環境でネットワーク不要に安定動作するように、SymPy をリポジトリ内の固定 Python 仮想環境から実行する。

**設計:** SymPy を捨てず、リポジトリ内に記号実行専用の Python 仮想環境を置いて正式依存として固定する。Ruby 側の `SymbolicStateRenderer` は補助プログラムの解決順を `リポジトリ内仮想環境 -> システムの python3 -> uv` に変更し、通常経路ではネットワーク不要で補助プログラムを呼び出す。既存の記号実行機能はこの固定実行環境を前提に成功状態へ戻す。

**技術構成:** Ruby, Python 3, SymPy, Bundler, Cucumber, Open3, シェルスクリプト

---

## ファイル構成

- 変更: `features/qni_run.feature`
  - 記号実行の失敗原因が実行環境の導入不足であることを切り分ける最小回帰を追加する場合のみ触る。
- 変更: `lib/qni/symbolic_state_renderer.rb`
  - 補助プログラムの解決順をリポジトリ内仮想環境優先へ変更し、実行環境不足時のエラーメッセージを整理する。
- 変更: `libexec/qni_symbolic_run.py`
  - SymPy 本体への依存は維持しつつ、起動方法の前提をリポジトリ内実行環境に合わせる。
- 作成: `scripts/setup_symbolic_python.sh`
  - リポジトリ内に記号実行環境を作成し、SymPy をインストールする。
- 必要に応じて変更: `.gitignore`
  - リポジトリ内実行環境を追跡しない設定が未整備なら追加する。
- 必要に応じて変更: `README` または関連ドキュメント
  - 記号実行環境のセットアップ手順を短く追記する。

## タスク 1: 失敗する記号実行を固定して切り分ける

**ファイル:**
- 確認: `features/qni_run.feature`
- 確認: `features/katas/basic_gates/amplitude_change.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`
- 確認: `features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **手順 1: 記号実行の失敗シナリオを絞り込んで実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature
```

期待結果:

- `qni run --symbolic` を使うシナリオが失敗する
- 失敗の共通点が補助プログラムの実行環境にあることを確認できる

- [ ] **手順 2: 直接実行で根本原因を再確認する**

実行:

```bash
tmpdir=$(mktemp -d /tmp/qni-symbolic-XXXXXX)
cat > "$tmpdir/circuit.json" <<'EOF'
{
  "qubits": 1,
  "cols": [["Ry(2*alpha)"]]
}
EOF
cd "$tmpdir"
BUNDLE_GEMFILE=/home/yasuhito/Work/qni-cli/Gemfile \
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor \
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec \
/home/yasuhito/Work/qni-cli/bin/qni run --symbolic
```

期待結果:

- `python3` に SymPy がなく、`uv` 代替経路がネットワーク制限で失敗することを確認できる

- [ ] **手順 3: この失敗状態をコミットしない**

このタスクでは、根本原因の確認だけを行い、失敗状態のためのコミットは作らない。

## タスク 2: リポジトリ内の記号実行環境を追加する

**ファイル:**
- 作成: `scripts/setup_symbolic_python.sh`
- 必要に応じて変更: `.gitignore`

- [ ] **手順 1: 実行環境の配置先を決める**

配置先はリポジトリ内の隠しディレクトリとし、候補は次を優先する。

- `.python-symbolic/`

ここには仮想環境本体を置き、git 追跡対象からは除外する。

- [ ] **手順 2: 実行環境のセットアップスクリプトを追加する**

`scripts/setup_symbolic_python.sh` を新規作成し、少なくとも次を行う。

```bash
#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.python-symbolic"

python3 -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip
"$VENV/bin/python" -m pip install sympy
```

必要なら冪等にし、既存環境があれば再利用できるようにする。
セットアップ時の依存関係インストールはネットワークを使ってよい。ここで重要なのは、セットアップ完了後の記号実行がネットワーク不要になることである。

- [ ] **手順 3: 実行環境ディレクトリを追跡対象から除外する**

`.gitignore` に次を追加する。

```gitignore
.python-symbolic/
```

すでに除外済みなら変更しない。

- [ ] **手順 4: セットアップスクリプトを実行して実行環境を作る**

実行:

```bash
bash scripts/setup_symbolic_python.sh
```

期待結果:

- `./.python-symbolic/bin/python` が作成される
- その Python で `import sympy` が成功する

- [ ] **手順 5: 実行環境追加をコミットする**

```bash
git add scripts/setup_symbolic_python.sh .gitignore
git commit -m "build: add symbolic runtime setup"
```

## タスク 3: Ruby 側の補助プログラム解決順を更新する

**ファイル:**
- 変更: `lib/qni/symbolic_state_renderer.rb`

- [ ] **手順 1: 失敗する記号実行シナリオを 1 本再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

期待結果:

- 実行環境の解決順が未更新のため、まだ失敗する

- [ ] **手順 2: リポジトリ内実行環境優先の補助プログラムを実装する**

`lib/qni/symbolic_state_renderer.rb` の補助プログラム解決順を次に変える。

- 1. `./.python-symbolic/bin/python`
- 2. `python3`
- 3. `uv run --quiet --with sympy python3`

リポジトリ内実行環境が存在しない場合だけ次候補へ進む。
現在の実装は `ENOENT` で即座に中断するため、リポジトリ内実行環境不在時に明示的に再試行して次候補へ進むロジックを追加する。

- [ ] **手順 3: 実行環境不足時のエラーメッセージを更新する**

現状の

```text
symbolic run requires Python with SymPy or uv
```

を、リポジトリ内実行環境を前提にした表現へ更新する。例:

```text
symbolic run requires SymPy runtime; run scripts/setup_symbolic_python.sh
```

- [ ] **手順 4: 絞り込んだ記号実行シナリオを成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature
```

期待結果:

- 4 シナリオとも PASS

- [ ] **手順 5: 補助プログラム解決順の更新をコミットする**

```bash
git add lib/qni/symbolic_state_renderer.rb
git commit -m "feat: prefer repo symbolic runtime"
```

## タスク 4: 全体検証を main 相当で通す

**ファイル:**
- 確認: リポジトリ全体のチェック

- [ ] **手順 1: 全 Cucumber を新規に実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待結果:

- 全シナリオが PASS

- [ ] **手順 2: Ruby 品質チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

期待結果:

- すべて PASS

- [ ] **手順 3: 回帰検証をコミットする**

```bash
git commit --allow-empty -m "test: verify symbolic runtime stabilization"
```

## タスク 5: レビューと統合準備

**ファイル:**
- 確認: Git 差分とレビュー指摘

- [ ] **手順 1: コードレビューを依頼する**

`superpowers:requesting-code-review` を使い、実行環境安定化の差分に対してレビューを取る。

- [ ] **手順 2: 指摘があれば修正して再検証する**

重要な指摘は統合前に解消し、必要な検証を再実行する。

- [ ] **手順 3: 統合方法を決める**

fast-forward マージか追加修正かを判断し、`main` に戻す準備を整える。
