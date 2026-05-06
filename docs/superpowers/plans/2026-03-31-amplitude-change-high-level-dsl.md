# 振幅変更の高レベル DSL 実装計画

> **エージェント作業者向け:** 必須: この計画の実装には superpowers:subagent-driven-development (サブエージェントが利用可能な場合) または superpowers:executing-plans を使う。進捗管理にはチェックボックス (`- [ ]`) 構文を使う。

**目的:** `amplitude_change.feature` を課題 1.1 / 1.2 / 1.3 と同じ高レベル DSL に書き換え、`When 振幅を θ だけ回転:` で課題 1.4 の意図を直接表せるようにする。

**構成方針:** 先に [amplitude_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature) を高レベル形へ失敗する形で書き換え、失敗理由を `振幅を ... だけ回転` ステップの未実装に限定する。実装は [features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) に最小の 1 ステップを追加し、内部では既存の `Ry` と記号実行 / 数値実行を再利用して成功させる。

**技術構成:** Ruby, Cucumber, Bundler, `cli_steps.rb`, `qni-cli`

---

## ファイル構成

- 変更: `features/katas/basic_gates/amplitude_change.feature`
  - 低レベルな `qni add Ry ...` / CSV 比較 / 制御付き操作の検証を、高レベル DSL の 1 量子ビットのシナリオへ置き換える。
- 変更: `features/step_definitions/cli_steps.rb`
  - `When 振幅を {angle} だけ回転:` を追加し、角度文字列を最小限正規化して `Ry(2*angle)` を追加する。
- 確認: `features/katas/basic_gates/state_flip.feature`
  - 既存の高レベル DSL が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/basis_change.feature`
  - `|+>, |->` 基底 DSL への影響がないことを確認する。
- 確認: `features/katas/basic_gates/sign_flip.feature`
  - `状態ベクトルは:` ベースの高レベル DSL が回帰していないことを確認する。

## タスク 1: `amplitude_change.feature` を高レベル DSL へ先に書き換えて失敗させる

**対象ファイル:**
- 変更: `features/katas/basic_gates/amplitude_change.feature`
- テスト: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: 課題 1.4 を高レベルシナリオへ書き換える**

`features/katas/basic_gates/amplitude_change.feature` を次の方向へ更新する。

```gherkin
Scenario: 振幅回転は |0> を cos(θ)|0> + sin(θ)|1> に変える
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    cos(θ)|0> + sin(θ)|1>
    """

Scenario: 振幅回転は |1> を -sin(θ)|0> + cos(θ)|1> に変える
  Given 初期状態ベクトルは:
    """
    |1>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    -sin(θ)|0> + cos(θ)|1>
    """

Scenario: θ = π/3 の振幅回転は 0.6|0> + 0.8|1> を -0.3928203230275509|0> + 0.9196152422706633|1> に変える
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 振幅を π/3 だけ回転:
  Then 状態ベクトルは:
    """
    -0.3928203230275509|0> + 0.9196152422706633|1>
    """

Scenario: 振幅回転は α|0> + β|1> を一般式どおりに変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    (αcos(θ) - βsin(θ))|0> + (αsin(θ) + βcos(θ))|1>
    """
```

このタスクで制御付き操作の検証シナリオは削除する。

- [ ] **手順 2: 対象を絞った実行で失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- `Undefined step` で `When 振幅を θ だけ回転:` が未実装として落ちる
- または角度正規化不足で `qni add` 相当の失敗になる
- 失敗理由が入力ミスではなく DSL 未実装である

- [ ] **手順 3: 失敗する機能ファイルをコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
git commit -m "test: rewrite amplitude change scenarios"
```

## タスク 2: `振幅を ... だけ回転` ステップを最小実装する

**対象ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: ステップ定義を追加する**

`features/step_definitions/cli_steps.rb` に次を追加する。

```ruby
When('振幅を {string} だけ回転:') do |angle|
  normalized_angle = angle.tr('θ', 'theta').delete(' ')
  append_circuit_json(
    @scenario_dir,
    {
      'qubits' => 1,
      'cols' => [["Ry(2*#{normalized_angle})"]]
    }
  )
end
```

必要ならヘルパーを追加して、

- `θ` -> `theta`
- 空白除去

だけを責務に切り出す。

- [ ] **手順 2: 1 量子ビット専用であることをコード上で明確にする**

上のステップは初期版では 1 量子ビット専用とする。
必要ならコメントか小さなヘルパー名で意図を明示する。

例:

```ruby
def amplitude_rotation_column(angle)
  [["Ry(2*#{normalize_angle_text(angle)})"]]
end
```

- [ ] **手順 3: 対象の機能ファイルを成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 4 シナリオが成功する
- 記号式の一般式が `(αcos(θ) - βsin(θ))|0> + (αsin(θ) + βcos(θ))|1>` と一致する

- [ ] **手順 4: ステップ実装をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/amplitude_change.feature
git commit -m "feat: add amplitude rotation DSL step"
```

## タスク 3: 近接する演習の回帰を確認する

**対象ファイル:**
- 確認: `features/katas/basic_gates/state_flip.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`
- 確認: `features/katas/basic_gates/sign_flip.feature`
- 確認: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: 高レベル演習一式を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/sign_flip.feature \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 成功する
- 課題 1.1 から 1.4 までが同じ DSL の流れで成功する

- [ ] **手順 2: ステップ文言が崩れていないことを確認する**

確認:

- `Then 状態ベクトルは:` を使う機能ファイルが回帰していない
- `Then |+>, |-> 基底での状態ベクトルは:` のシナリオに影響がない

- [ ] **手順 3: 回帰確認をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify high-level gate kata DSL"
```

## タスク 4: 全体チェックを最新状態で通す

**対象ファイル:**
- 確認: `features/step_definitions/cli_steps.rb`
- 確認: `features/katas/basic_gates/amplitude_change.feature`
- 確認: リポジトリ全体のチェック

- [ ] **手順 1: 記号実行環境を先に整える**

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

- RuboCop が成功する
- reek が成功する
- cucumber が成功する
- flog / flay が成功する

- [ ] **手順 3: 最終差分を確認する**

確認:

- 変更が `amplitude_change.feature` と `cli_steps.rb` 中心に収まっている
- 無関係な DSL 拡張が入っていない

- [ ] **手順 4: 最終コミットを追加する**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: complete amplitude change high-level DSL"
```

- [ ] **手順 5: 統合に引き渡す**

ブランチに未コミットの変更がなく `rake check` が成功していれば、リポジトリの通常の完了手順に従ってマージするか PR を準備する。
