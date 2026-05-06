# qni bloch PNG/GIF 実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、サブエージェントが利用できる場合は superpowers:subagent-driven-development を、利用できない場合は superpowers:executing-plans を使う。手順は進捗管理のためチェックボックス（`- [ ]`）形式にしている。

**目的:** 現在の 1 量子ビット状態を Bloch 球の PNG または GIF として出力できるように `qni bloch` を追加する。

**構成:** `qni export` を拡張するのではなく、専用の `qni bloch` コマンドを追加する。Ruby は CLI オプションを検証し、回路を読み込み、1 量子ビット状態の変化を数値的にサンプリングし、期待値から Bloch 座標へ変換して、コンパクトな JSON ペイロードを新しい Python レンダラーへ渡す。Python は `matplotlib` を使って、単一の PNG フレームまたはアニメーション GIF を描画する。

**技術構成:** Ruby, Thor, Cucumber, Minitest, Python, matplotlib, Pillow, 既存の `StateVector` / `Simulator` 基盤

---

### タスク 1: 新しいコマンドの失敗する受け入れテストを追加する

**対象ファイル:**
- 作成: `features/qni_bloch.feature`
- 変更: `features/qni_cli.feature`
- 変更: `features/step_definitions/cli_steps.rb`

- [ ] **手順 1: `qni bloch` のヘルプを検証する**

`features/qni_cli.feature` に新しいシナリオを追加し、最上位の `qni` ヘルプに次の行が表示されることを確認する。

```text
qni bloch    # Render the current 1-qubit state on the Bloch sphere
```

また、`qni bloch --help` について、次のような使用方法が表示されるシナリオを追加する。

```text
Usage:
  qni bloch --png --output bloch.png
  qni bloch --gif --output bloch.gif
```

- [ ] **手順 2: `features/qni_bloch.feature` に動作シナリオを追加する**

次のシナリオを追加する。
- `qni bloch --png --output bloch.png` が 1 量子ビット回路で成功し、PNG を書き出す
- `qni bloch --gif --output bloch.gif` が 1 量子ビットの回転回路で成功し、GIF を書き出す
- `qni bloch --light` でも画像の書き出しに成功する
- 2 量子ビット回路では、明確な `bloch currently supports only 1-qubit circuits` メッセージで失敗する
- 未解決の角度変数では、明確な数値解決エラーで失敗する
- `--png` と `--gif` を同時に指定すると失敗する

- [ ] **手順 3: GIF 検証ヘルパーを追加する**

`features/step_definitions/cli_steps.rb` を拡張し、次のようなステップを追加する。

```ruby
Then('{string} は GIF 画像である') do |path|
  signature = File.binread(actual_path, 6)
  expect(signature).to eq("GIF89a".b).or eq("GIF87a".b)
end
```

既存の PNG 検証と並ぶ形にする。

- [ ] **手順 4: 絞り込んだ cucumber を実行し、失敗を確認する**

実行するコマンド: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

期待結果: `qni bloch` コマンドと GIF 対応がまだ存在しないため失敗する。

### タスク 2: `qni bloch` の CLI 外部仕様を追加する

**対象ファイル:**
- 変更: `lib/qni/cli.rb`
- 作成: `lib/qni/cli/bloch_command.rb`
- 作成: `lib/qni/cli/bloch_help.rb`

- [ ] **手順 1: Thor のエントリーポイントを追加する**

`lib/qni/cli.rb` に次を追加する。

```ruby
desc 'bloch', 'Render the current 1-qubit state on the Bloch sphere'
method_option :png, type: :boolean, default: false, desc: 'Write a Bloch sphere PNG'
method_option :gif, type: :boolean, default: false, desc: 'Write a Bloch sphere GIF'
method_option :dark, type: :boolean, default: false, desc: 'Draw light content for dark backgrounds'
method_option :light, type: :boolean, default: false, desc: 'Draw dark content for light backgrounds'
method_option :output, type: :string, desc: 'Write to this path'
def bloch
  output = BlochCommand.new(circuit_file: current_circuit_file, bloch_options: options).execute
  write_output(output)
end
```

- [ ] **手順 2: 共通ヘルプ文を追加する**

`export_help.rb` / `state_help.rb` と同じ方針で `lib/qni/cli/bloch_help.rb` を作成し、次を含める。
- 使用方法
- 概要
- オプション
- PNG と GIF の例

- [ ] **手順 3: オプション検証を追加する**

`lib/qni/cli/bloch_command.rb` を作成し、次の検証ルールを実装する。
- `--png` / `--gif` はどちらか一方だけを指定する
- `--output` は必須
- `--dark` / `--light` は同時に指定できない

機能仕様の文面と完全に一致する `Thor::Error` メッセージを発生させる。

- [ ] **手順 4: 未実装の描画処理には明確な一時エラーを返す**

この時点では、`BlochCommand#execute` が次のような一時メッセージで失敗するようにする。

```ruby
raise Thor::Error, 'bloch rendering is not implemented yet'
```

これにより、次のタスクでレンダラーを埋めるまで CLI の形を安定させる。

- [ ] **手順 5: 絞り込んだ cucumber を再実行する**

実行するコマンド: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

期待結果: ヘルプのシナリオは成功し、描画のシナリオは一時エラーでまだ失敗する。

### タスク 3: Ruby 側に 1 量子ビット回路の Bloch サンプリングを追加する

**対象ファイル:**
- 作成: `lib/qni/bloch_sampler.rb`
- 変更: `lib/qni/simulator.rb`
- 変更: `lib/qni/state_vector.rb`
- テスト: `test/qni/bloch_sampler_test.rb`

- [ ] **手順 1: 静的サンプリングの失敗する単体テストを追加する**

`test/qni/bloch_sampler_test.rb` を作成し、次のようなテストを追加する。

```ruby
def test_zero_state_maps_to_positive_z
  sampler = Qni::BlochSampler.new(circuit_hash_for('|0>'))
  frames = sampler.frames
  assert_equal [0.0, 0.0, 1.0], frames.first.fetch('vector')
end
```

および次のようなテストを追加する。

```ruby
def test_h_gate_ends_at_positive_x
  sampler = Qni::BlochSampler.new(circuit_hash_for_h)
  assert_equal [1.0, 0.0, 0.0], sampler.frames.last.fetch('vector')
end
```

- [ ] **手順 2: 回転の補間に対する失敗する単体テストを追加する**

`Ry(theta)` または `Ry(pi/2)` が 2 フレームより多く生成し、最後のベクトルが期待される終点と一致することを確認するテストを追加する。

- [ ] **手順 3: Bloch 座標に必要な状態データを公開する**

`StateVector` のカプセル化を保てる最小の変更を選ぶ。生の振幅を広く公開するより、次のような限定的なヘルパーを追加することを優先する。

```ruby
def bloch_coordinates
  [
    expectation('X'),
    expectation('Y'),
    expectation('Z')
  ]
end
```

- [ ] **手順 4: `Qni::BlochSampler` を実装する**

`BlochSampler` は次を行う。
- 1 量子ビット以外の回路を拒否する
- 開始時点の数値 `StateVector` を構築する
- 初期状態をサンプリングする
- 各ステップの結果をサンプリングする
- 角度付きゲート `P`, `Rx`, `Ry`, `Rz` では、ゲート角度を 12 などの小さな固定数へ分割して中間状態を追加する

最初の版は単純に保つ。
- 固定ゲートはステップ境界のフレームだけを生成する
- 1 量子ビット回路だけに対応する
- `Simulator` と同じ数値角度解決ルールを使う

- [ ] **手順 5: 単体テストを実行し、成功させる**

実行するコマンド: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_sampler_test.rb`

期待結果: 成功する。

### タスク 4: Python レンダラーと依存関係の準備を追加する

**対象ファイル:**
- 作成: `libexec/qni_bloch_render.py`
- 変更: `scripts/setup_symbolic_python.sh`
- テスト: `test/qni/bloch_sampler_test.rb`

- [ ] **手順 1: Python 環境の準備処理を拡張する**

`scripts/setup_symbolic_python.sh` を変更し、venv で次が確実に用意されるようにする。

```text
sympy==1.14.0
matplotlib==<pinned version>
pillow==<pinned version>
```

既存と同じく、スクリプトは何度実行しても同じ結果になるように保つ。

- [ ] **手順 2: Ruby 側に小さなレンダラー契約テストを追加する**

`test/qni/bloch_sampler_test.rb` を拡張するか新しいテストファイルを追加し、Python へ送る JSON ペイロードの形を検証する。例:

```ruby
assert_equal 'png', payload.fetch('format')
assert_equal [0.0, 0.0, 1.0], payload.fetch('frames').first.fetch('vector')
```

これにより Ruby/Python 境界を明確にする。

- [ ] **手順 3: `libexec/qni_bloch_render.py` を実装する**

このスクリプトは次を行う。
- stdin から JSON ペイロードを読む
- `matplotlib` で Bloch 球を描画する
- 指定された出力先へ PNG または GIF を書き出す
- 背景を透明にする
- `dark` と `light` に応じてラベルと軸の色を変える

GIF では次を行う。
- 渡されたフレーム一覧を再利用する
- 状態ベクトルと必要に応じて軌跡をアニメーションにする
- Pillow ベースのアニメーション対応を使って保存する

- [ ] **手順 4: Python 構文を検証する**

実行するコマンド: `python3 -m py_compile libexec/qni_bloch_render.py`

期待結果: 終了コード 0。

### タスク 5: コマンドをレンダラーへつなぐ

**対象ファイル:**
- 変更: `lib/qni/cli/bloch_command.rb`
- 作成: `lib/qni/bloch_renderer.rb`
- 変更: `lib/qni/cli.rb`

- [ ] **手順 1: 専用の Ruby レンダラーラッパーを追加する**

`lib/qni/bloch_renderer.rb` を作成し、次だけを担当させる。
- `.python-symbolic` から Python 実行ファイルを選ぶ
- ペイロードを直列化する
- `libexec/qni_bloch_render.py` を呼び出す
- stdout/stderr の失敗を Ruby エラーとして表面化する

- [ ] **手順 2: `BlochCommand#execute` を完成させる**

一時実装を実際の動作に置き換える。
- `circuit.json` を読み込む
- `Qni::BlochSampler` でフレームを構築する
- テーマ、形式、出力先のパスを `Qni::BlochRenderer` へ渡す

- [ ] **手順 3: 未解決の変数が明確に失敗することを保証する**

数値解決が失敗した場合は、別の文言を作るのではなく、元の角度解決エラーをそのまま表面化する。実用上問題がなければ、機能仕様の文面を既存エラーに合わせる。

- [ ] **手順 4: 絞り込んだ cucumber を再実行する**

実行するコマンド: `bash scripts/setup_symbolic_python.sh`

次に実行するコマンド: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

期待結果: 成功する。

### タスク 6: 画像検証と回帰テストを強化する

**対象ファイル:**
- 変更: `features/qni_bloch.feature`
- 変更: `features/step_definitions/cli_steps.rb`
- 変更: 必要な整理がある場合は、触ったファイルのみ

- [ ] **手順 1: PNG 検証を少なくとも 1 つ強化する**

ファイル存在以外に、次のような受け入れ確認を 1 つ追加する。
- PNG サイズが `512x512` である
- 同じ回路から作った GIF ファイルが PNG ファイルと異なる

可能な場合は `identify` ベースの検証を再利用する。

- [ ] **手順 2: GIF 検証を少なくとも 1 つ強化する**

ImageMagick で複数フレーム GIF を確認する小さなヘルパーを追加する。例:

```ruby
output, status = Open3.capture2('identify', '-format', '%n', actual_path)
```

そして回転 GIF のフレーム数が 1 より大きいことを検証する。

- [ ] **手順 3: 絞り込んだ機能仕様群を再実行する**

実行するコマンド: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature`

期待結果: 成功する。

### タスク 7: 影響範囲全体を検証する

**対象ファイル:**
- 変更: 必要な整理がある場合は、触ったファイルのみ

- [ ] **手順 1: Ruby の絞り込んだ lint を実行する**

実行するコマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rubocop \
  lib/qni/cli.rb \
  lib/qni/cli/bloch_command.rb \
  lib/qni/cli/bloch_help.rb \
  lib/qni/bloch_sampler.rb \
  lib/qni/bloch_renderer.rb \
  lib/qni/state_vector.rb \
  lib/qni/simulator.rb \
  features/step_definitions/cli_steps.rb \
  test/qni/bloch_sampler_test.rb
```

期待結果: 違反なし。

- [ ] **手順 2: 絞り込んだテストを実行する**

実行するコマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_sampler_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_bloch.feature \
  features/qni_cli.feature \
  features/qni_export.feature \
  features/qni_run.feature \
  features/katas/basic_gates/amplitude_change.feature
```

期待結果: 成功する。

- [ ] **手順 3: プロジェクト全体のチェックを実行する**

実行するコマンド:

```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果: 成功する。

- [ ] **手順 4: コミットする**

```bash
git add features/qni_bloch.feature features/qni_cli.feature features/step_definitions/cli_steps.rb \
  lib/qni/cli.rb lib/qni/cli/bloch_command.rb lib/qni/cli/bloch_help.rb \
  lib/qni/bloch_sampler.rb lib/qni/bloch_renderer.rb lib/qni/state_vector.rb lib/qni/simulator.rb \
  libexec/qni_bloch_render.py scripts/setup_symbolic_python.sh test/qni/bloch_sampler_test.rb
git commit -m "feat: add qni bloch PNG and GIF export"
```
