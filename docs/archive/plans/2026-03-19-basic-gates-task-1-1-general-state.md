# BasicGates Task 1.1 の一般状態検証実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目的:** `BasicGates Task 1.1 StateFlip` の検証を基底状態 2 例から一般状態 1 例まで広げ、`0.6|0⟩ + 0.8|1⟩` が `X` によって `0.8|0⟩ + 0.6|1⟩` へ反転することを `qni run` で確認できるようにする。

**構成方針:** 既存の [basic_gates.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates.feature) に非自明な振幅の例を 1 本追加する。`qni-cli` 本体には手を入れず、`features/step_definitions/cli_steps.rb` の既存 1 qubit 初期状態ステップ定義を最小限だけ拡張して、Kata が使う具体的な振幅パターンを準備できるようにする。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 変更: `features/katas/basic_gates.feature`
  - `Task 1.1` の一般状態シナリオを追加する。
- 変更: `features/step_definitions/cli_steps.rb`
  - `0.6|0> + 0.8|1>` を準備できるよう既存ステップ定義の `case` を拡張する。
- 検証: `features/qni_run.feature`
  - `qni run` の既存振る舞いが回帰していないことを確認する。
- 検証: `features/cli/add/add_x_gate.feature.md`
  - `X` ゲート追加が回帰していないことを確認する。

### タスク 1: 失敗する一般状態シナリオを追加する

**対象ファイル:**
- 変更: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 失敗するシナリオを書く**

`features/katas/basic_gates.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.1 は 0.6|0> + 0.8|1> を 0.8|0> + 0.6|1> に反転する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.8,0.6
      """
```

- [ ] **手順 2: 機能を実行し、正しい理由で失敗することを確認する**

実行コマンド:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 新規シナリオだけが失敗する
- 失敗理由は未定義ステップではなく `unsupported 1-qubit initial state: 0.6|0> + 0.8|1>` である

- [ ] **手順 3: 失敗するテストをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add general-state Task 1.1 scenario"
```

### タスク 2: 1 qubit 状態準備ステップ定義を最小限拡張する

**対象ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 対象の失敗シナリオを再実行する**

実行コマンド:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:29
```

期待結果:

- `unsupported 1-qubit initial state: 0.6|0> + 0.8|1>` が再現する

- [ ] **手順 2: 最小限の `case` 分岐を追加する**

`features/step_definitions/cli_steps.rb` の既存 `前提('1 qubit の初期状態が {string} である')` に次の `when` を追加する。

```ruby
        when '0.6|0> + 0.8|1>'
          ['Ry(1.8545904360032246)']
```

この角度 `1.8545904360032246` は `2 * Math.acos(0.6)` に対応し、`qni run` では `0.6,0.8` を生成する。

- [ ] **手順 3: Kata の機能を実行し、成功することを確認する**

実行コマンド:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 3 scenarios
- 0 failures

- [ ] **手順 4: 対応変更をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates.feature
git commit -m "test: support general-state Task 1.1 setup"
```

### タスク 3: 関連する回帰がないことを検証する

**対象ファイル:**
- 検証: `features/katas/basic_gates.feature`
- 検証: `features/qni_run.feature`
- 検証: `features/cli/add/add_x_gate.feature.md`

- [ ] **手順 1: 対象を絞った回帰検証を実行する**

実行コマンド:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/cli/add/add_x_gate.feature.md features/qni_run.feature features/katas/basic_gates.feature
```

期待結果:

- PASS
- `features/katas/basic_gates.feature` の 3 シナリオがすべて成功する

- [ ] **手順 2: 製品コードが変更されていないことを確認する**

確認内容:

- 変更が `features/katas/basic_gates.feature` と `features/step_definitions/cli_steps.rb` に限られている
- `lib/` 配下に変更がない

- [ ] **手順 3: 検証時点をコミットする**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify Task 1.1 on a general state"
```

## メモ

- 今回は正しさの強化だけを行う。制御付き等価性の補助検証は別の次段に切る。
- `qni run` の記号表示オプションはさらに後段で扱う。今回の変更に混ぜない。
- 状態準備ステップ定義は汎用パーサーにしない。Kata が要求する `0.6|0> + 0.8|1>` だけを最小追加する。
