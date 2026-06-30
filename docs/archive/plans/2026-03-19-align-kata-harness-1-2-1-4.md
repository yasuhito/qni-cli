# BasicGates Task 1.2 と 1.4 のハーネス整合実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目的:** `Task 1.2` と `Task 1.4` の kata 機能ファイルを Quantum Katas のテストハーネス構成に揃え、`DumpDiffOnOneQubit` 相当と `AssertOperationsEqualReferenced` 相当の両方が機能ファイルから読める状態にする。

**構成方針:** `Task 1.2` には非自明入力状態の数値シナリオを 1 本追加する。`Task 1.4` は「1 本のダンプ相当の数値シナリオ」と「制御付き操作の全角度走査」に分け直し、必要なら `features/step_definitions/cli_steps.rb` に近似比較のステップ定義を追加して、人間に読める機能ファイルの形で Katas テスト構成へ寄せる。

**使用技術:** Cucumber, Gherkin, qni-cli

---

## ファイル構成

- 変更: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` に `0.6|0> + 0.8|1>` 入力の数値シナリオを追加する。
- 変更: `features/katas/basic_gates/amplitude_change.feature`
  - 代表角度 4 本の数値表を、Katas に近い「ダンプ相当 1 本 + 制御付き操作の全角度走査」へ置き換える。
- 変更: `features/step_definitions/cli_steps.rb`
  - `Task 1.4` の制御付き操作の全角度走査を人間に読める形で書くため、必要なら期待値の近似比較のステップ定義を追加する。
- 確認: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` が引き続き Katas 再現型の基準として通ることを確認する。
- 確認: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` が引き続き Katas 再現型の基準として通ることを確認する。
- 確認: `features/qni_run.feature`
  - `Task 1.2` と `Task 1.4` の機能ファイル補正で `run` / `run --symbolic` が回帰していないことを確認する。
- 確認: `features/qni_expect.feature`
  - `Task 1.4` の制御付き操作の検証が回帰していないことを確認する。

## 作業 1: `Task 1.2` を `DumpDiffOnOneQubit` 相当に揃える

**対象ファイル:**
- 変更: `features/katas/basic_gates/basis_change.feature`

- [ ] **ステップ 1: 非自明入力で失敗するシナリオを追加する**

`features/katas/basic_gates/basis_change.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.2 は 0.6|0> + 0.8|1> を X 基底へ変換する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.9899494936611665,-0.14142135623730948
      """
```

- [ ] **ステップ 2: `Task 1.2` の機能ファイルを実行して、失敗または既存機能での成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/basis_change.feature
```

期待結果:

- 追加直後は失敗するか、既存機能でそのまま成功する
- 失敗した場合も製品コードには触らず、期待値やステップ定義の書き方だけを見直す

- [ ] **ステップ 3: `Task 1.2` の補正をコミットする**

```bash
git add features/katas/basic_gates/basis_change.feature
git commit -m "test: align Task 1.2 with kata harness"
```

## 作業 2: `Task 1.4` を読みやすい Katas 再現型へ揃える

**対象ファイル:**
- 変更: `features/katas/basic_gates/amplitude_change.feature`
- 変更: `features/step_definitions/cli_steps.rb`

- [ ] **ステップ 1: 失敗する機能ファイルを Katas に近い形へ書き換える**

`features/katas/basic_gates/amplitude_change.feature` を次の方針で更新する。

- 数値シナリオは 1 本にする
  - 入力は Katas の `DumpDiffOnOneQubit` に合わせて `0.6|0> + 0.8|1>`
  - 角度は `dumpAlpha = π/3`
  - `Ry(2*alpha)` 適用後の数値出力を固定する
- 制御付き操作の検証は `Scenario Outline` にする
  - `alpha = 0 .. 36` を例表で持つ
  - 各行は `qni variable set alpha <alpha>` と `qni expect ZI` を実行する
  - 期待は厳密な `"ZI=1.0"` 比較ではなく、近似比較のステップ定義で `1.0 ± 1e-12` を確認する
- シンボリック出力のシナリオは残す

- [ ] **ステップ 2: 近似比較のステップ定義を先に書いて失敗を確認する**

`features/step_definitions/cli_steps.rb` に、次のようなステップ定義を追加する前提で、まず機能ファイルを実行して未定義ステップまたは失敗を確認する。

```gherkin
ならば 期待値 "ZI" は 1.0 ± 1e-12
```

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 新しい近似比較のステップ定義が未定義か、追加したシナリオが失敗する
- [ ] **ステップ 3: 近似比較のステップ定義を最小実装する**

`features/step_definitions/cli_steps.rb` に、期待値名・期待値・許容誤差を受け取り、`@stdout` から該当行を取り出して数値比較するステップ定義を追加する。

実装要件:

- 行形式は `ZI=0.9999999999999996` のような既存 `qni expect` 出力を前提にする
- 指定した観測量名の行がなければ失敗する
- `|actual - expected| <= tolerance` を満たせば成功する

- [ ] **ステップ 4: `Task 1.4` の機能ファイルを実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 成功
- `Task 1.4` のダンプ相当、制御付き操作の全角度走査、シンボリック出力の補助が共存して成功する

- [ ] **ステップ 5: `Task 1.4` の補正をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: align Task 1.4 with kata harness"
```

## 作業 3: 近接回帰を確認する

**対象ファイル:**
- 確認: `features/katas/basic_gates/state_flip.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`
- 確認: `features/katas/basic_gates/sign_flip.feature`
- 確認: `features/katas/basic_gates/amplitude_change.feature`
- 確認: `features/qni_run.feature`
- 確認: `features/qni_expect.feature`

- [ ] **ステップ 1: kata と関連機能ファイルをまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/sign_flip.feature \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 成功
- `Task 1.1` から `Task 1.4` までが Katas 再現型で共存して成功する

- [ ] **ステップ 2: 最終差分を確認する**

確認:

- 製品コードを変更していない
- 変更が `basis_change.feature`、`amplitude_change.feature`、必要なら `features/step_definitions/cli_steps.rb` に限られている
- `Task 1.2` と `Task 1.4` の機能ファイルが、Katas テストコードの意図を機能ファイルから読める形になっている

- [ ] **ステップ 3: 最終確認コミットを作る**

```bash
git add features/katas/basic_gates/basis_change.feature features/katas/basic_gates/amplitude_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: align kata regression coverage"
```

## 補足

- 今回の目的は新機能追加ではなく、既存機能ファイルの再現度を Quantum Katas のテストハーネスに揃えること。
- `Task 1.4` は「1 本のダンプ相当」と「制御付き操作の全角度走査」に分けることで、人間向けの可読性と Katas 相当の網羅性を両立する。
- `Task 1.5` はこの補正が済んでから、最初から同じ基準で追加する。
