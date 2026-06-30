# BasicGates Task 1.1 制御付き検証の実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目標:** `BasicGates Task 1.1 StateFlip` の制御付き検証回路を `qni-cli` だけで記述し、Kata の確認フェーズに相当する検証を `features/katas/basic_gates.feature` で回帰テストとして固定する。

**構成:** 新しい検証専用コマンドは追加せず、既存の `qni add H`、`qni add Ry`、`qni add X --control`、`qni expect` を使って検証回路そのものを組む。まず機能ファイルを追加して現行 CLI でそのまま通るかを確認し、不足が出た場合に限って `features/step_definitions/cli_steps.rb` のテスト支援コードを最小限だけ広げる。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 変更: `features/katas/basic_gates.feature`
  - `Task 1.1` の制御付き検証シナリオを追加する。
- 必要な場合のみ変更: `features/step_definitions/cli_steps.rb`
  - 既存のステップだけで書けない場合に限り、2 量子ビット準備の補助ステップを最小追加する。
- 検証: `features/qni_expect.feature`
  - 制御付きゲートと `qni expect` の既存振る舞いが回帰していないことを確認する。
- 検証: `features/cli/add/add_x_gate.feature.md`
  - 制御付き `X` の基本的な追加手順が回帰していないことを確認する。
- 参照のみ: `../oss/QuantumKatas/BasicGates/Tests.qs`
  - `T101_StateFlip` の意図と `DumpDiffOnOneQubit` / `AssertOperationsEqualReferenced` の確認元として読む。

## 検証回路

`Task 1.1` の制御付き検証は次の 2 量子ビット回路として表現する。

1. 量子ビット 0 を制御側とし、`H` で `|+⟩` を作る
2. 量子ビット 1 を対象側とし、`Ry(1.8545904360032246)` で `0.6|0⟩ + 0.8|1⟩` を作る
3. 候補の制御付き `X` を適用する
4. 参照実装の随伴に相当する制御付き `X` を適用する
5. 量子ビット 0 に再び `H` をかける
6. `qni expect ZI` を実行し、制御側が `|0⟩` に戻ったことを `ZI=1.0` で確認する

現行 CLI で確認した期待出力は次のとおり。

```text
ZI=1.0
```

## タスク 1: 制御付き検証の機能ファイルを先に追加する

**ファイル:**
- 変更: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 新しい制御付き検証シナリオを書く**

`features/katas/basic_gates.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.1 の制御付き検証回路は制御量子ビットを |0> に戻す
    前提 空の 2 量子ビット回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add X --control 0 --qubit 1 --step 2" を実行
    かつ "qni add X --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """
```

- [ ] **手順 2: 対象の Kata 機能ファイルを実行する**

実行:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 新規の制御付きシナリオを含めて実行される
- 既存 CLI / ステップだけで通るならそのまま成功
- 失敗する場合は、不足が製品コードではなくテスト支援コードまたは機能ファイルの記述にあることを特定する

- [ ] **手順 3: 機能追加をコミットする**

もし手順 2 が成功したら、その場でコミットする。

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add controlled Task 1.1 verification"
```

## タスク 2: 機能ファイルが実行できない場合だけ最小限の支援コードを追加する

**ファイル:**
- 必要な場合のみ変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 対象を絞った失敗を再現する**

実行:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:31
```

期待結果:

- 失敗位置が制御付きシナリオだけに絞られる
- 不足がステップ定義、初期状態準備、または出力比較のどれかに切り分けられる

- [ ] **手順 2: 必要最小限の支援コードを実装する**

追加できる変更は次の範囲に限定する。

- `空の 2 量子ビット回路がある` が不足ならそのステップを補う
- 既存の `"qni add ..."` 実行ステップで足りない場合にのみテスト支援コードを直す
- 製品コードの変更は、CLI で検証回路が本当に表現できないと確定した場合に限る

このタスクでは新しい検証専用コマンドは追加しない。

- [ ] **手順 3: Kata 機能ファイルを再実行する**

実行:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 制御付きシナリオを含む `features/katas/basic_gates.feature` が成功する

- [ ] **手順 4: 最小限の支援コード変更をコミットする**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: support controlled Task 1.1 verification"
```

## タスク 3: 制御付き経路と周辺の回帰を検証する

**ファイル:**
- 検証: `features/katas/basic_gates.feature`
- 検証: `features/qni_expect.feature`
- 検証: `features/cli/add/add_x_gate.feature.md`

- [ ] **手順 1: 対象を絞った回帰テスト一式を実行する**

実行:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/cli/add/add_x_gate.feature.md features/qni_expect.feature features/katas/basic_gates.feature
```

期待結果:

- 成功
- `features/katas/basic_gates.feature` の制御付きシナリオが成功する
- `features/qni_expect.feature` の制御付き `X` と期待値表示が回帰していない

- [ ] **手順 2: 最終差分を確認する**

確認:

- 変更が機能ファイルとステップ定義の最小範囲に留まっている
- 新しい CLI コマンドが増えていない
- `Task 1.1` の検証回路を `qni-cli` の既存表現で記述できている

- [ ] **手順 3: 検証の節目をコミットする**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify controlled Task 1.1 circuit"
```

## 補足

- 今回の範囲は正しさ強化の第 2 段だけであり、`qni run` の記号表示は含めない。
- 制御付き検証では、Kata の確認フェーズの意図を「検証回路を `qni-cli` で書けること」として保存する。
- `Task 1.1` は候補と参照実装がどちらも `X` なので、機能ファイル上では同じ制御付き `X` が 2 回並ぶ。それでも「検証回路を CLI で記述できる」こと自体がこの段階の目的である。
- 実装途中で製品コードの不足が見つかった場合は、新しい計画書を切る前提で一度止め、必要な `features/*.feature` を先に追加する。
