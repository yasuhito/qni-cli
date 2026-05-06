# グローバル位相変化を高レベル DSL にする実装計画

> **エージェント作業者向け:** 必須: サブエージェントが利用可能なら superpowers:subagent-driven-development、利用できない場合は superpowers:executing-plans を使ってこの計画を実装する。手順は進捗管理用にチェックボックス (`- [ ]`) 形式で書いている。

**目的:** `global_phase_change.feature` をタスク 1.1〜1.6 と同じ高レベル DSL に書き換え、タスク 1.7 の本質である「状態全体に -1 を掛ける」をシナリオからそのまま読めるようにする。

**構成方針:** 先に [global_phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/global_phase_change.feature) を高レベルのシナリオへ失敗する形で書き換え、制御付き検証を削る。次に既存の `Given 初期状態ベクトルは:`、`When 次の回路を適用:`、`Then 状態ベクトルは:` だけで成功させられるかを確認し、追加実装が本当に不要かを対象を絞った Cucumber で証明する。

**技術構成:** Ruby, Cucumber, Bundler, 既存の高レベル kata DSL, `qni run --symbolic`, `Rz(2π)`

---

## ファイル構成

- 変更: `features/katas/basic_gates/global_phase_change.feature`
  - 低レベルな制御付き検証回路と `qni expect ZI` を、高レベル DSL の 1 量子ビットのシナリオへ置き換える。
- 確認: `features/step_definitions/cli_steps.rb`
  - 既存の `Then 状態ベクトルは:` 比較ヘルパーだけで `-|0>`, `-α|0> - β|1>` が通ることを確認する。
- 確認: `features/katas/basic_gates/phase_change.feature`
  - タスク 1.6 の一般位相回転とタスク 1.7 のグローバル位相変化が連続した教材として読めることを確認する。
- 確認: `features/katas/basic_gates/phase_flip.feature`
  - タスク 1.5 の固定角位相変化が回帰していないことを確認する。

## タスク 1: `global_phase_change.feature` を高レベル DSL に先に書き換えて失敗する状態にする

**ファイル:**
- 変更: `features/katas/basic_gates/global_phase_change.feature`
- テスト: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **手順 1: 機能ファイルの導入文をタスク 1.7 の数学に合わせて整理する**

`features/katas/basic_gates/global_phase_change.feature` の導入文を、少なくとも次の内容へ寄せる。

- 入力状態は `|ψ⟩ = α|0⟩ + β|1⟩`
- 目標は `-α|0⟩ - β|1⟩`
- 単独量子ビットでは観測できないが、`qni` の記号式表示では読める

- [ ] **手順 2: 低レベルのシナリオを高レベルのシナリオに置き換える**

機能ファイルを次の方向へ更新する。

```gherkin
Scenario: グローバル位相変化は |0> を -|0> に変える
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 次の回路を適用:
    """
           2π
          ┌───┐
      q0: ┤ Rz├
          └───┘
    """
  Then 状態ベクトルは:
    """
    -|0>
    """

Scenario: グローバル位相変化は 0.6|0> + 0.8|1> を -0.6|0> - 0.8|1> に変える
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 次の回路を適用:
    """
           2π
          ┌───┐
      q0: ┤ Rz├
          └───┘
    """
  Then 状態ベクトルは:
    """
    -0.6|0> - 0.8|1>
    """

Scenario: グローバル位相変化は α|0> + β|1> を -α|0> - β|1> に変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
           2π
          ┌───┐
      q0: ┤ Rz├
          └───┘
    """
  Then 状態ベクトルは:
    """
    -α|0> - β|1>
    """
```

このタスクで制御付き検証シナリオは削除する。

- [ ] **手順 3: 対象を絞った Cucumber で失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/global_phase_change.feature
```

期待結果:

- もし既存ヘルパーだけで通るなら、その場で成功でもよい
- 失敗する場合は `-|0>` や `-α|0> - β|1>` の比較差だけに理由が絞れている

- [ ] **手順 4: 失敗する機能ファイルをコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: rewrite global phase change scenarios"
```

## タスク 2: 追加実装が必要かを見極めて最小で成功させる

**ファイル:**
- 必要な場合のみ変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **手順 1: 対象を絞った機能ファイルの失敗理由を確認する**

タスク 1 の結果を見て、次のどちらかに分岐する。

- 成功した場合:
  既存 DSL と比較ヘルパーがそのままタスク 1.7 を支えられているので、このタスクは「追加実装不要」を確認するだけでよい。
- 失敗した場合:
  失敗理由を 1 つの比較差へ絞る。

- [ ] **手順 2: 必要なら比較ヘルパーを最小修正する**

もし失敗するなら、`features/step_definitions/cli_steps.rb` に最小限の正規化を追加して、

- `-|0>`
- `-0.6|0> - 0.8|1>`
- `-α|0> - β|1>`

を既存の記号式出力と同値に扱えるようにする。

このタスクでは YAGNI でよい。タスク 1.7 で使う形だけを通せれば十分。

- [ ] **手順 3: 対象を絞った機能ファイルを成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/global_phase_change.feature
```

期待結果:

- 3 シナリオが成功する
- `Rz(2π)` による全体 `-1` が高レベル DSL で読める

- [ ] **手順 4: 実装結果をコミットする**

追加実装があった場合:

```bash
git add features/katas/basic_gates/global_phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "feat: support high-level global phase change DSL"
```

追加実装が不要だった場合:

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: support high-level global phase change DSL"
```

## タスク 3: 近接 kata の読み口と回帰を確認する

**ファイル:**
- 確認: `features/katas/basic_gates/phase_flip.feature`
- 確認: `features/katas/basic_gates/phase_change.feature`
- 確認: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **手順 1: 位相系 kata をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/phase_flip.feature \
  features/katas/basic_gates/phase_change.feature \
  features/katas/basic_gates/global_phase_change.feature
```

期待結果:

- 成功する
- タスク 1.5 の固定角位相
- タスク 1.6 の一般角位相
- タスク 1.7 のグローバル位相

が連続した教材として読める

- [ ] **手順 2: シナリオ名とステップの視点が揃っていることを目視確認する**

確認:

- `phase_flip.feature` は `S` ゲートの固定角位相変化を確認する
- `phase_change.feature` は「位相回転」
- `global_phase_change.feature` は「グローバル位相変化」
- どれも `When 次の回路を適用:` を使っている

- [ ] **手順 3: 回帰確認をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: verify global phase kata progression"
```

## タスク 4: 全体チェックを最新状態で通す

**ファイル:**
- 確認: リポジトリ全体のチェック

- [ ] **手順 1: 記号式実行環境を先に整える**

実行:

```bash
bash scripts/setup_symbolic_python.sh
```

期待結果:

- SymPy version が表示される

- [ ] **手順 2: リポジトリ全体の品質チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:

- cucumber が成功する
- RuboCop が成功する
- reek が成功する
- flog / flay が成功する

- [ ] **手順 3: 最終差分を確認する**

確認:

- 変更が `global_phase_change.feature` 中心に収まっている
- ヘルパーを触った場合も、その変更がタスク 1.7 に必要な最小範囲に収まっている

- [ ] **手順 4: 最終コミットを追加する**

```bash
git add features/katas/basic_gates/global_phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: complete global phase change high-level DSL"
```

- [ ] **手順 5: 統合へ引き渡す**

ブランチに未コミットの変更がなく `rake check` が成功している場合は、リポジトリの通常の完了手順に従ってマージまたは PR 準備を行う。
