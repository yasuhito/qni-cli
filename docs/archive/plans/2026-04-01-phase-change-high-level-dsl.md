# 位相回転高レベル DSL 実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目的:** `phase_change.feature` をタスク 1.1〜1.5 と同じ高レベル DSL に書き換え、タスク 1.6 の本質である「一般角の位相回転」をシナリオからそのまま読めるようにする。

**構成:** 先に [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_change.feature) を概念中心の高レベルシナリオへ書き換えて失敗を確認する。次に [features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/step_definitions/cli_steps.rb) の記号表現比較ヘルパーだけを最小限拡張し、`exp(iθ)` や `exp(iθ)β` の人間向け表記を既存の `qni run --symbolic` 出力と同値に扱えるようにして成功させる。

**技術構成:** Ruby, Cucumber, Bundler, 既存の高レベル kata DSL, `cli_steps.rb`, `qni run --symbolic`

---

## ファイル構成

- 変更: `features/katas/basic_gates/phase_change.feature`
  - 低レベルな `qni add P ...` / 数値 CSV 比較 / 制御付き検証を、高レベル DSL の 1量子ビットシナリオへ置き換える。
- 変更: `features/step_definitions/cli_steps.rb`
  - `Then 状態ベクトルは:` の記号表現比較ヘルパーを拡張し、`exp(iθ)` 形式と乗算順の差を最小限正規化する。
- 確認: `features/katas/basic_gates/phase_flip.feature`
  - タスク 1.5 の `|+i>` / `|-i>` DSL がタスク 1.6 の書き換えで回帰していないことを確認する。
- 確認: `features/katas/basic_gates/state_flip.feature`
  - 既存の `Then 状態ベクトルは:` 比較が壊れていないことを確認する。
- 確認: `features/qni_run.feature`
  - `qni run --symbolic` の既存受け入れ条件が比較ヘルパーの変更で影響を受けていないことを全体チェックで確認する。

## タスク 1: `phase_change.feature` を高レベル DSL に先に書き換えて失敗させる

**ファイル:**
- 変更: `features/katas/basic_gates/phase_change.feature`
- テスト: `features/katas/basic_gates/phase_change.feature`

- [ ] **手順 1: 機能ファイルの見出しをタスク 1.6 の数学に合わせて整理する**

`features/katas/basic_gates/phase_change.feature` の導入文を、少なくとも次の内容へ寄せる。

- 角度は `θ`
- 入力状態は `α|0⟩ + β|1⟩`
- 目標は `α|0⟩ + exp(iθ)β|1⟩`

- [ ] **手順 2: 低レベルシナリオを 4 本の高レベルシナリオに置き換える**

機能ファイルを次の方向へ更新する。

```gherkin
Scenario: 位相回転は |0> を変えない
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 次の回路を適用:
    """
         θ
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then 状態ベクトルは:
    """
    |0>
    """

Scenario: 位相回転は |1> に exp(iθ) を掛ける
  Given 初期状態ベクトルは:
    """
    |1>
    """
  When 次の回路を適用:
    """
         θ
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then 状態ベクトルは:
    """
    exp(iθ)|1>
    """

Scenario: θ = π/2 の位相回転は |+> を |+i> に変える
  Given 初期状態ベクトルは:
    """
    |+>
    """
  When 次の回路を適用:
    """
        π/2
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then |+i>, |-i> 基底での状態ベクトルは:
    """
    |+i>
    """

Scenario: 位相回転は α|0> + β|1> を α|0> + exp(iθ)β|1> に変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
         θ
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then 状態ベクトルは:
    """
    α|0> + exp(iθ)β|1>
    """
```

このタスクで制御付き検証シナリオは削除する。

- [ ] **手順 3: 対象 Cucumber で失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/phase_change.feature
```

期待結果:

- `exp(iθ)` と現在の記号表現出力 `exp(I*theta)` の差
- `exp(iθ)β` と現在の記号表現出力 `beta*exp(I*theta)` の差

で失敗する。

- [ ] **手順 4: 失敗する機能ファイルをコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature
git commit -m "test: rewrite phase change scenarios"
```

## タスク 2: 記号表現比較ヘルパーを位相回転の記法に合わせて最小拡張する

**ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates/phase_change.feature`

- [ ] **手順 1: 比較の失敗テストをヘルパー観点で固定する**

タスク 1 の失敗を再実行して、失敗理由が次の 2 種に限定されていることを確認する。

- `exp(iθ)` と `exp(I*theta)` の表記差
- `exp(iθ)β` と `beta*exp(I*theta)` の乗算順差

- [ ] **手順 2: `exp(iθ)` 形式を正規化するヘルパーを追加する**

`features/step_definitions/cli_steps.rb` に、少なくとも次を吸収する最小ヘルパーを追加する。

- `exp(iθ)` -> `exp(i*theta)`
- `exp(iπ/2)` -> `exp(i*pi/2)`
- `exp(iθ)β` -> 比較用の正規形

実装方針は次のどちらかに絞る。

- 期待値側を `beta*exp(i*theta)` に寄せる
- 実際値 / 期待値の両方を同じ位相積の正規形に寄せる

このタスクでは YAGNI でよい。タスク 1.6 で使う形だけを通せれば十分。

- [ ] **手順 3: `Then 状態ベクトルは:` が既存シナリオを壊さないことを意識して実装する**

比較ヘルパーの変更は、既存の

- `|0>`
- `α|0> + β|1>`
- `i|1>`
- `sqrt(2)/2|0> + sqrt(2)/2|1>`

などの正規化を壊さない最小変更にとどめる。

- [ ] **手順 4: 対象の機能ファイルを成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/phase_change.feature
```

期待結果:

- 4 シナリオが成功する
- `θ = π/2` のシナリオが `|+i>` で成功する
- 一般式シナリオが `α|0> + exp(iθ)β|1>` で成功する

- [ ] **手順 5: ヘルパー実装をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/phase_change.feature
git commit -m "feat: support high-level phase change DSL"
```

## タスク 3: 近接 kata の読み口と回帰を確認する

**ファイル:**
- 確認: `features/katas/basic_gates/phase_change.feature`
- 確認: `features/katas/basic_gates/phase_flip.feature`
- 確認: `features/katas/basic_gates/state_flip.feature`

- [ ] **手順 1: 位相系 kata をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/phase_flip.feature \
  features/katas/basic_gates/phase_change.feature
```

期待結果:

- 成功する
- タスク 1.5 の `S` とタスク 1.6 の一般位相回転が、連続した教材として読める

- [ ] **手順 2: シナリオ名とステップの視点が揃っていることを目視確認する**

確認:

- `phase_flip.feature` は固定角 `i`
- `phase_change.feature` は一般角 `exp(iθ)`
- どちらも `When 次の回路を適用:` を使っている

- [ ] **手順 3: 回帰確認をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify phase kata DSL progression"
```

## タスク 4: 全体チェックを最新状態で通す

**ファイル:**
- 確認: リポジトリ全体のチェック

- [ ] **手順 1: 記号表現の実行環境を先に整える**

実行:

```bash
bash scripts/setup_symbolic_python.sh
```

期待結果:

- SymPy のバージョンが表示される

- [ ] **手順 2: リポジトリ全体の品質チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:

- Cucumber が成功する
- RuboCop が成功する
- reek が成功する
- flog / flay が成功する

- [ ] **手順 3: 最終差分を確認する**

確認:

- 変更が `phase_change.feature` と `cli_steps.rb` 中心に収まっている
- 無関係な CLI / 描画処理 / 基底 API の変更が入っていない

- [ ] **手順 4: 最終コミットを追加する**

```bash
git add features/katas/basic_gates/phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: complete phase change high-level DSL"
```

- [ ] **手順 5: 統合引き継ぎ**

ブランチがクリーンで `rake check` が成功している場合、リポジトリの通常の完了手順に従ってマージするか PR を準備する。
