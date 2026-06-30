# 位相反転の高水準 Y 基底実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目的:** タスク 1.5 の `phase_flip.feature` をタスク 1.1〜1.4 と同じ高水準の文体で書き直す。あわせて、Y 基底での状態表示と `|+i>` / `|-i>` の短縮表記を追加し、`S` ゲートの作用を自然に読めるようにする。

**構成:** 既存の記号的状態表示の処理経路を再利用する。`InitialState` に Y 基底の短縮表記を追加し、記号計算用の Python 補助処理に 1 量子ビット回路向けの `y` 基底表示を追加する。さらに Y 基底の検証専用ステップを追加してから、`phase_flip.feature` を高水準の状態・回路 DSL だけで書き直す。

**技術要素:** Ruby、Thor、Cucumber、Minitest、Python、SymPy、既存の `InitialState`、`SymbolicStateRenderer`、`qni_symbolic_run.py`、kata の機能ファイル

---

## ファイル構成

- 変更: `features/qni_state.feature`
  - `qni state set "|+i>"` と `qni state set "|-i>"` の受け入れテストを追加する。
- 変更: `features/qni_run.feature`
  - `qni run --symbolic --basis y` の受け入れテストを追加する。
- 変更: `features/qni_cli.feature`
  - `qni run --help` の期待値に `y` 基底対応を追加する。
- 変更: `features/katas/basic_gates/phase_flip.feature`
  - タスク 1.5 のシナリオを高水準 DSL へ書き直す。
- 変更: `features/step_definitions/cli_steps.rb`
  - `Then |+i>, |-i> 基底での状態ベクトルは:` と、必要な正規化補助処理を追加する。
- 変更: `lib/qni/initial_state.rb`
  - `|+i>` / `|-i>` を読み込み、保存できるようにする。
- 変更: `lib/qni/symbolic_state_renderer.rb`
  - `x` と同じ 1 量子ビット制約の下で `basis: 'y'` を許可する。
- 変更: `lib/qni/cli/run_help.rb`
  - `--basis y` を説明する。
- 変更: `libexec/qni_symbolic_run.py`
  - Y 基底表示と、`|+i>` / `|-i>` に必要な正規化補助処理を追加する。
- テスト: `test/qni/initial_state_test.rb`
  - `|+i>` / `|-i>` の単体テストを追加する。
- テスト: `test/qni/symbolic_state_renderer_test.rb`
  - 必要であれば `basis: 'y'` の検証を単体テストに追加する。

### タスク 1: Y 基底と短縮表記の失敗する受け入れテストを追加する

**対象ファイル:**
- 変更: `features/qni_state.feature`
- 変更: `features/qni_run.feature`
- 変更: `features/qni_cli.feature`

- [ ] **手順 1: `qni state` の受け入れテストに Y 基底の短縮表記を追加する**

`features/qni_state.feature` に次のシナリオを追加する。
- `qni state set "|+i>"` が 1 量子ビットの初期状態を保存し、`qni state show` が `|+i>` を出力する
- `qni state set "|-i>"` が 1 量子ビットの初期状態を保存し、`qni state show` が `|-i>` を出力する

- [ ] **手順 2: 記号的な実行の受け入れテストに Y 基底を追加する**

`features/qni_run.feature` に次のシナリオを追加する。
- `qni run --symbolic --basis y` が、`S` を `|+>` に適用した後に `|+i>` を表示する
- 適切であれば、`qni run --symbolic --basis y` が `alpha|+i> + beta|-i>` のような一般的な結果を表示する
- 2 量子ビット回路で `--basis y` を指定した場合、既存の X 基底制約と同じように明確なエラーで拒否する

- [ ] **手順 3: CLI ヘルプの期待値を広げる**

`features/qni_cli.feature` を更新し、`qni run --help` と関連するヘルプ文で、`--basis` が記号的な 1 量子ビット出力として `x` と `y` の両方を扱えることを示す。

- [ ] **手順 4: 対象を絞った Cucumber を実行し、失敗を確認する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature features/qni_run.feature features/qni_cli.feature
```

期待値: `|+i>`、`|-i>`、`--basis y` はまだ実装されていないため失敗する。

### タスク 2: `InitialState` に Y 基底の短縮表記を追加する

**対象ファイル:**
- 変更: `lib/qni/initial_state.rb`
- 変更: `test/qni/initial_state_test.rb`

- [ ] **手順 1: 失敗する単体テストを追加する**

次のテストを追加する。
- `|+i>` の読み込み
- `|-i>` の読み込み
- 短縮表記で表示する方針を採る場合は、それらの状態を短縮表記へ戻す保存処理

- [ ] **手順 2: 単体テストを実行し、失敗を確認する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

期待値: 新しい短縮表記はまだ認識されていないため失敗する。

- [ ] **手順 3: 短縮表記の読み込みと表示を実装する**

`InitialState` を拡張し、次を満たすようにする。
- `|+i>` は `(1/sqrt(2))|0> + (i/sqrt(2))|1>` を意味する
- `|-i>` は `(1/sqrt(2))|0> - (i/sqrt(2))|1>` を意味する
- 保存された状態がこれらの名前付き状態のどちらかと完全に一致する場合、`qni state show` は短縮表記を優先する

- [ ] **手順 4: 単体テストを再実行する**

次へ進む前に、`test/qni/initial_state_test.rb` を成功させる。

### タスク 3: 記号的な Y 基底表示を追加する

**対象ファイル:**
- 変更: `libexec/qni_symbolic_run.py`
- 変更: `lib/qni/symbolic_state_renderer.rb`
- 変更: `test/qni/symbolic_state_renderer_test.rb`

- [ ] **手順 1: 失敗するテスト、または対象を絞った受け入れテストを追加する**

主な失敗テストとして `features/qni_run.feature` を使う。Ruby 側の検証を明確にする場合に限り、単体テストを追加する。

- [ ] **手順 2: Python 補助処理に Y 基底表示を実装する**

X 基底表示と同様の表示処理を追加する。

目標とする定義:

```text
|+i> = (|0> + i|1>) / sqrt(2)
|-i> = (|0> - i|1>) / sqrt(2)
```

計算基底の状態 `a|0> + b|1>` について Y 基底の振幅を導出し、X 基底で使っている記号的な簡約方針と同じ方針で表示する。

- [ ] **手順 3: Ruby で `basis: 'y'` を許可する**

`lib/qni/symbolic_state_renderer.rb` を更新し、`basis == 'y'` が `basis == 'x'` と同じ 1 量子ビット制約および補助処理の呼び出し経路を共有するようにする。

- [ ] **手順 4: ヘルプ文を更新する**

`lib/qni/cli/run_help.rb` で `--basis y` を説明する。

- [ ] **手順 5: 対象を絞った受け入れテストを実行する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature features/qni_run.feature features/qni_cli.feature
```

期待値: 新しい Y 基底の動作が成功する。

### タスク 4: 高水準の Y 基底ステップ定義を追加する

**対象ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`

- [ ] **手順 1: kata の機能ファイルに失敗するステップの使用例を追加する**

ステップ定義を実装する前に、`phase_flip.feature` のシナリオを 1 つ書き換え、次を使う。

```gherkin
Then |+i>, |-i> 基底での状態ベクトルは:
```

未定義ステップ、または動作不一致として失敗することを確認する。

- [ ] **手順 2: ステップ定義を実装する**

次を実行する補助処理を追加する。

```text
qni run --symbolic --basis y
```

そのうえで、出力を正規化した Y 基底表記と比較する。既存の記号的な比較補助処理をできるだけ再利用し、Y 基底に必要な最小限の正規化だけを追加する。

- [ ] **手順 3: 新しいステップ定義を検証する**

関連する kata の機能ファイルの範囲を実行し、ステップ定義が正しく動作することを確認する。

### タスク 5: `phase_flip.feature` を高水準 DSL へ書き直す

**対象ファイル:**
- 変更: `features/katas/basic_gates/phase_flip.feature`

- [ ] **手順 1: 低水準のシナリオを高水準のシナリオへ置き換える**

次のようなシナリオを中心に機能ファイルを書き直す。
- `S ゲートは |0> を変えない`
- `S ゲートは |1> に i を掛ける`
- `S ゲートは |+> を |+i> に変える`
- `S ゲートは α|0> + β|1> を α|0> + iβ|1> に変える`

使うステップ:
- `Given 初期状態ベクトルは:`
- `When 次の回路を適用:`
- `Then 状態ベクトルは:`
- `Then |+i>, |-i> 基底での状態ベクトルは:`

- [ ] **手順 2: 制御付きの検証シナリオを削除する**

古い低水準の制御付きシナリオを削除し、タスク 1.1〜1.4 で使っている教育向けの高水準文体に機能ファイルを合わせる。

- [ ] **手順 3: kata の機能ファイルを単独で実行する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/phase_flip.feature
```

期待値: 新しい高水準の文言と Y 基底ステップで成功する。

### タスク 6: 全体回帰確認と仕上げ

**対象ファイル:**
- 回帰に応じて必要な範囲だけ変更する

- [ ] **手順 1: 全体チェックを実行する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待値: すべてのテストが問題なく成功する。

- [ ] **手順 2: 近接する kata の読みやすさを確認する**

次を確認する。
- `features/katas/basic_gates/state_flip.feature`
- `features/katas/basic_gates/basis_change.feature`
- `features/katas/basic_gates/sign_flip.feature`
- `features/katas/basic_gates/phase_flip.feature`

タスク 1.1〜1.5 が、一貫した高水準の流れとして読めることを確認する。

- [ ] **手順 3: 範囲を絞ったコミットメッセージでコミットする**

すべて成功したら、次のようなメッセージでコミットする。

```text
feat: add y-basis phase flip DSL
```
