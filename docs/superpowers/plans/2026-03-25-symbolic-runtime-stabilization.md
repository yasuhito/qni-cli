# Symbolic Runtime Stabilization Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `qni run --symbolic` が setup 完了後のローカル環境でネットワーク不要に安定動作するように、SymPy を repo 内の固定 Python 仮想環境から実行する。

**Architecture:** SymPy を捨てず、repo 内に symbolic 専用の Python 仮想環境を置いて正式依存として固定する。Ruby 側の `SymbolicStateRenderer` は helper 解決順を `repo 内 venv -> system python3 -> uv` に変更し、通常経路ではネットワーク不要で helper を呼び出す。既存の symbolic feature はこの固定 runtime を前提に green へ戻す。

**Tech Stack:** Ruby, Python 3, SymPy, Bundler, Cucumber, Open3, shell script

---

## File Structure

- Modify: `features/qni_run.feature`
  - symbolic 実行の失敗原因が runtime 導入不足であることを切り分ける最小回帰を追加する場合のみ触る。
- Modify: `lib/qni/symbolic_state_renderer.rb`
  - helper 解決順を repo 内 venv 優先へ変更し、runtime 不足時のエラーメッセージを整理する。
- Modify: `libexec/qni_symbolic_run.py`
  - SymPy 本体への依存は維持しつつ、起動方法の前提を repo 内 runtime に合わせる。
- Create: `scripts/setup_symbolic_python.sh`
  - repo 内 symbolic runtime を作成し、SymPy をインストールする。
- Optionally modify: `.gitignore`
  - repo 内 runtime を追跡しない設定が未整備なら追加する。
- Optionally modify: `README` または関連ドキュメント
  - symbolic runtime のセットアップ手順を短く追記する。

## Task 1: failing symbolic 実行を固定して切り分ける

**Files:**
- Verify: `features/qni_run.feature`
- Verify: `features/katas/basic_gates/amplitude_change.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`
- Verify: `features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **Step 1: symbolic の失敗シナリオを focused 実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature
```

Expected:

- `qni run --symbolic` を使うシナリオが失敗する
- 失敗の共通点が helper runtime にあることを確認できる

- [ ] **Step 2: direct 実行で root cause を再確認する**

Run:

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

Expected:

- `python3` に SymPy がなく、`uv` フォールバックがネットワーク制限で失敗することを確認できる

- [ ] **Step 3: この失敗状態をコミットしない**

この task では、root cause の確認だけを行い、失敗状態のための commit は作らない。

## Task 2: repo 内 symbolic runtime を追加する

**Files:**
- Create: `scripts/setup_symbolic_python.sh`
- Optionally modify: `.gitignore`

- [ ] **Step 1: runtime 配置先を決める**

配置先は repo 内の隠し directory とし、候補は次を優先する。

- `.python-symbolic/`

ここには仮想環境本体を置き、git 追跡対象からは除外する。

- [ ] **Step 2: runtime setup script を追加する**

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

必要なら idempotent にし、既存環境があれば再利用できるようにする。
setup 時の dependency install はネットワークを使ってよい。ここで重要なのは、setup 完了後の symbolic 実行がネットワーク不要になることである。

- [ ] **Step 3: runtime directory を ignore する**

`.gitignore` に次を追加する。

```gitignore
.python-symbolic/
```

すでに ignore 済みなら変更しない。

- [ ] **Step 4: setup script を実行して runtime を作る**

Run:

```bash
bash scripts/setup_symbolic_python.sh
```

Expected:

- `./.python-symbolic/bin/python` が作成される
- その Python で `import sympy` が成功する

- [ ] **Step 5: runtime 追加をコミットする**

```bash
git add scripts/setup_symbolic_python.sh .gitignore
git commit -m "build: add symbolic runtime setup"
```

## Task 3: Ruby 側の helper 解決順を更新する

**Files:**
- Modify: `lib/qni/symbolic_state_renderer.rb`

- [ ] **Step 1: failing symbolic scenario を 1 本再実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

Expected:

- runtime 解決順未更新のため、まだ失敗する

- [ ] **Step 2: repo 内 runtime 優先の helper command を実装する**

`lib/qni/symbolic_state_renderer.rb` の helper 解決順を次に変える。

- 1. `./.python-symbolic/bin/python`
- 2. `python3`
- 3. `uv run --quiet --with sympy python3`

repo 内 runtime が存在しない場合だけ次候補へ進む。
現在の実装は `ENOENT` で即座に abort するため、repo 内 runtime 不在時に明示的に retry して次候補へ進むロジックを追加する。

- [ ] **Step 3: runtime 不足時のエラーメッセージを更新する**

現状の

```text
symbolic run requires Python with SymPy or uv
```

を、repo 内 runtime を前提にした表現へ更新する。例:

```text
symbolic run requires SymPy runtime; run scripts/setup_symbolic_python.sh
```

- [ ] **Step 4: focused symbolic scenario を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature
```

Expected:

- 4 scenario とも PASS

- [ ] **Step 5: helper 解決順の更新をコミットする**

```bash
git add lib/qni/symbolic_state_renderer.rb
git commit -m "feat: prefer repo symbolic runtime"
```

## Task 4: full verification を main 相当で通す

**Files:**
- Verify: repository-wide checks

- [ ] **Step 1: full cucumber を fresh に実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

Expected:

- 全 scenario が PASS

- [ ] **Step 2: Ruby 品質チェックを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

Expected:

- すべて PASS

- [ ] **Step 3: regression verification をコミットする**

```bash
git commit --allow-empty -m "test: verify symbolic runtime stabilization"
```

## Task 5: review と統合準備

**Files:**
- Verify: git diff and review feedback

- [ ] **Step 1: code review を依頼する**

`superpowers:requesting-code-review` を使い、runtime stabilization の diff に対して review を取る。

- [ ] **Step 2: 指摘があれば修正して再検証する**

重要な指摘は統合前に解消し、必要な verification を再実行する。

- [ ] **Step 3: 統合方法を決める**

fast-forward merge か追加修正かを判断し、`main` に戻す準備を整える。
