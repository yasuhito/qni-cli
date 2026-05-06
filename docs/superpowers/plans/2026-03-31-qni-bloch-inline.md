# qni bloch インライン端末実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、利用できる場合は superpowers:subagent-driven-development を、そうでない場合は superpowers:executing-plans を使う。手順の進捗管理にはチェックボックス (`- [ ]`) 構文を使う。

**目標:** `qni bloch --inline` を追加し、Ghostty やその他の Kitty graphics 互換端末で、1 量子ビットのブロッホ球を端末内で直接プレビューできるようにする。任意でインラインアニメーションにも対応する。

**構成:** 既存の `qni bloch` の数値サンプリング処理を維持する。Ruby は CLI の公開インターフェース、`--inline` と `--animate` の検証、現在の端末が Kitty graphics に適しているかどうかの検出、実際の Kitty graphics protocol エスケープシーケンスの整形を担当する。Python は引き続き `matplotlib` による画像生成を担当するが、Ruby がファイルを書き出す場合も、GIF/APNG/WebP を経由せずにフレームをインライン出力する場合も扱えるように、メモリ上の PNG 出力モードを追加する。

**技術構成:** Ruby, Thor, Cucumber, Minitest, Python, matplotlib, Pillow, Kitty graphics protocol, 既存の `Qni::BlochSampler` / `Qni::BlochRenderer`

---

## ファイル構成

- 変更: `features/qni_bloch.feature`
  - `--inline`、`--inline --animate`、無効なオプション組み合わせ、未対応端末での失敗について受け入れ確認を追加する。
- 変更: `features/qni_cli.feature`
  - 最上位ヘルプと `qni bloch --help` の期待値にインライン用オプションを追加する。
- 変更: `features/step_definitions/cli_steps.rb`
  - インラインのエスケープシーケンスを捕捉し、端末機能を差し替えるテスト用の継ぎ目を追加する補助処理を用意する。
- 変更: `lib/qni/cli.rb`
  - `bloch` コマンドに `--inline` と `--animate` を公開する。
- 変更: `lib/qni/cli/bloch_command.rb`
  - 新しいオプションの組み合わせを検証し、ファイル描画またはインライン描画へ振り分ける。
- 変更: `lib/qni/cli/bloch_help.rb`
  - 新しいインライン利用方法と制約を説明する。
- 変更: `lib/qni/bloch_renderer.rb`
  - Python 連携をリファクタリングし、ファイル出力またはメモリ上の PNG フレームペイロードのどちらでも要求できるようにする。
- 作成: `lib/qni/bloch_inline_renderer.rb`
  - Ruby 側のインライン処理を担当する。描画済みフレームの要求、端末対応状況の確認、Kitty graphics protocol シーケンスの端末送信を行う。
- 作成: `lib/qni/kitty_graphics_emitter.rb`
  - 静止画像とフレーム単位アニメーション向けに Kitty graphics protocol のエスケープシーケンスを整形して出力する。
- 変更: `libexec/qni_bloch_render.py`
  - 常にファイルへ書き出すのではなく、1 フレームまたは複数フレームの PNG バイト列を返すモードを追加する。
- テスト: `test/qni/kitty_graphics_emitter_test.rb`
  - CLI から独立してプロトコルの整形を単体テストする。
- テスト: `test/qni/bloch_renderer_test.rb`
  - 新しいインラインモードの Ruby/Python 間のペイロード境界を単体テストする。

### タスク 1: インライン Bloch 出力の失敗する受け入れ確認を追加する

**ファイル:**
- 変更: `features/qni_bloch.feature`
- 変更: `features/qni_cli.feature`
- 変更: `features/step_definitions/cli_steps.rb`

- [ ] **ステップ 1: CLI ヘルプの期待値を拡張する**

`features/qni_cli.feature` にヘルプ確認を追加し、`qni bloch --help` が次のような行を含むようにする。

```text
Usage:
  qni bloch --inline
  qni bloch --inline --animate
```

次のようなオプションも含める。

```text
--inline        # render a Bloch sphere inline in a Kitty-compatible terminal
--animate       # animate inline Bloch output; valid only with --inline
```

- [ ] **ステップ 2: `features/qni_bloch.feature` に振る舞いシナリオを追加する**

次のシナリオを追加する。
- `qni bloch --inline` が 1 量子ビット回路で成功し、Kitty graphics のエスケープシーケンスを出力する
- `qni bloch --inline --animate` が 1 量子ビット回転回路で成功し、複数のインラインフレームを出力する
- `qni bloch --inline --output bloch.png` が明確な `--output is not supported with --inline` メッセージで失敗する
- `qni bloch --gif --animate --output bloch.gif` が明確な `--animate is supported only with --inline` メッセージで失敗する
- `qni bloch --inline` が未対応端末では `inline bloch rendering requires a Kitty-compatible terminal; use --png or --gif instead` のような明確な代替手段の案内で失敗する

既存の PNG/GIF シナリオは変更しない。

- [ ] **ステップ 3: `cli_steps.rb` にインライン捕捉の補助処理を追加する**

`features/step_definitions/cli_steps.rb` を拡張し、次を実行できる補助処理を追加する。
- `QNI_TEST_FORCE_INLINE=1` のような制御された環境で `qni` を実行する
- stdout を通常のテキスト出力ではなくバイナリとして捕捉する
- インライン出力に `ESC _ G` のような Kitty APC フレーミングが含まれることを検証する

次のようなステップを追加する。

```ruby
Then('標準出力は Kitty graphics のエスケープシーケンスを含む') do
  expect(@stdout).to include("\e_G")
end
```

さらに、エスケープシーケンスの出現回数を数えて複数インラインフレームを検証するステップも追加する。

- [ ] **ステップ 4: 対象を絞った cucumber を実行し、失敗を確認する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature
```

期待結果: 新しいヘルプ文、オプション、インライン描画経路がまだ存在しないため失敗する。

### タスク 2: インラインモードの CLI 公開インターフェースと検証を追加する

**ファイル:**
- 変更: `lib/qni/cli.rb`
- 変更: `lib/qni/cli/bloch_command.rb`
- 変更: `lib/qni/cli/bloch_help.rb`

- [ ] **ステップ 1: Thor コマンドに `--inline` と `--animate` を追加する**

`lib/qni/cli.rb` を更新し、`qni bloch` に次を宣言する。

```ruby
method_option :inline, type: :boolean, default: false, desc: 'Render inline in a Kitty-compatible terminal'
method_option :animate, type: :boolean, default: false, desc: 'Animate inline Bloch output'
```

既存の `--png`、`--gif`、`--dark`、`--light`、`--output` は変えない。

- [ ] **ステップ 2: 共通ヘルプ文を更新する**

`lib/qni/cli/bloch_help.rb` を拡張し、次を説明する。
- インライン利用例
- `--output` はファイルモード専用であること
- `--animate` は `--inline` と組み合わせる場合だけ意味があること
- Ghostty / Kitty 互換端末が必要であること

- [ ] **ステップ 3: `BlochCommand` のオプション検証を拡張する**

`lib/qni/cli/bloch_command.rb` の検証ロジックをリファクタリングし、次を強制する。
- `--png`、`--gif`、`--inline` のうちちょうど 1 つだけを指定する
- `--png` / `--gif` では `--output` が必須
- `--inline` では `--output` を禁止
- `--animate` は `--inline` と組み合わせる場合のみ許可
- `--dark` / `--light` はこれまでどおり最大 1 つだけ

feature ファイル内のテキストに一致する正確なエラー文字列を使う。

- [ ] **ステップ 4: 一時的なインライン仮実装を置く**

実際の描画器を接続する前に、`--inline` 分岐では次のような一時的で明示的なメッセージで失敗させる。

```ruby
raise Thor::Error, 'inline bloch rendering is not implemented yet'
```

これにより、ヘルプと検証シナリオは通過し、描画シナリオは制御された形で失敗したままになる。

- [ ] **ステップ 5: 対象を絞った cucumber を再実行する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature
```

期待結果: ヘルプと検証シナリオは通過し、インライン描画シナリオは仮実装でまだ失敗する。

### タスク 3: Kitty graphics 出力の小さな Ruby 単体テストを追加する

**ファイル:**
- 作成: `test/qni/kitty_graphics_emitter_test.rb`
- 作成: `lib/qni/kitty_graphics_emitter.rb`

- [ ] **ステップ 1: 失敗する出力器テストを書く**

`test/qni/kitty_graphics_emitter_test.rb` を作成し、次のようなプロトコルに焦点を絞った小さなテストを書く。

```ruby
def test_static_image_emits_single_kitty_graphics_payload
  io = StringIO.new
  emitter = Qni::KittyGraphicsEmitter.new(io: io)
  emitter.emit_png_frame("png-bytes")

  output = io.string
  assert_includes output, "\e_G"
  assert_includes output, "\e\\"
end
```

さらに次も追加する。

```ruby
def test_animation_emits_multiple_frames
  io = StringIO.new
  emitter = Qni::KittyGraphicsEmitter.new(io: io)
  emitter.emit_animation(["frame-1", "frame-2"])

  assert_operator io.string.scan("\e_G").length, :>=, 2
end
```

テストは文字列とプロトコルの水準に留め、実際の端末には依存させない。

- [ ] **ステップ 2: 新しい単体テストを実行し、失敗を確認する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/kitty_graphics_emitter_test.rb
```

期待結果: 出力器クラスがまだ存在しないため失敗する。

- [ ] **ステップ 3: `Qni::KittyGraphicsEmitter` を実装する**

狭い API を持つ `lib/qni/kitty_graphics_emitter.rb` を作成する。
- 書き込み可能な `io:` で初期化する
- `emit_png_frame(png_bytes)`
- `emit_animation(png_frames)`

実装メモ:
- PNG バイト列を base64 エンコードする
- ペイロードを Kitty APC フレーミング (`\e_G ... \e\\`) で囲む
- 長い base64 文字列を 1 つの巨大なエスケープシーケンスとして書かないように分割する
- プロトコルの詳細はこのファイルに閉じ込め、CLI コードがエスケープ文字列を直接組み立てないようにする

- [ ] **ステップ 4: 単体テストを実行し、通過させる**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/kitty_graphics_emitter_test.rb
```

期待結果: 成功する

- [ ] **ステップ 5: 出力器の作業単位をコミットする**

```bash
git add test/qni/kitty_graphics_emitter_test.rb lib/qni/kitty_graphics_emitter.rb
git commit -m "feat: add kitty graphics emitter"
```

### タスク 4: メモリ上のフレーム出力に向けて Bloch の Python 連携をリファクタリングする

**ファイル:**
- テスト: `test/qni/bloch_renderer_test.rb`
- 変更: `lib/qni/bloch_renderer.rb`
- 変更: `libexec/qni_bloch_render.py`

- [ ] **ステップ 1: Ruby 側の描画器契約を固定する失敗テストを追加する**

`test/qni/bloch_renderer_test.rb` を作成し、次のように新しいモードを固定するテストを書く。

```ruby
def test_png_bytes_mode_returns_binary_png_data
  renderer = Qni::BlochRenderer.new(format: 'inline_png', output_path: nil, frames: sample_frames, theme: :dark)
  png_bytes = renderer.render
  assert_equal "\x89PNG".b, png_bytes.byteslice(0, 4)
end
```

さらに次も追加する。

```ruby
def test_inline_animation_mode_returns_multiple_png_frames
  renderer = Qni::BlochRenderer.new(format: 'inline_frames', output_path: nil, frames: sample_frames, theme: :dark)
  frames = renderer.render
  assert_operator frames.length, :>=, 2
end
```

単体テストから補助スクリプトを直接呼ぶのが扱いづらい場合は、Ruby API を固定しつつ補助スクリプトの結果を差し替える継ぎ目を追加する。

- [ ] **ステップ 2: 新しい単体テストを実行し、失敗を確認する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_renderer_test.rb
```

期待結果: `BlochRenderer` が現時点ではファイル書き出ししかできないため失敗する。

- [ ] **ステップ 3: `libexec/qni_bloch_render.py` を拡張する**

次の補助モードを追加する。
- 既存の `png` と `gif` のファイル書き出し動作はそのまま維持する
- 1 枚の PNG 画像を stdout に書き出すモードを追加する
- 複数 PNG フレームを base64 エンコードし、フレーム化した JSON ペイロードとして書き出すモードを追加する

Python 補助スクリプトに Kitty graphics protocol の詳細は持たせない。

- [ ] **ステップ 4: `Qni::BlochRenderer` をリファクタリングする**

`lib/qni/bloch_renderer.rb` を変更し、次ができるようにする。
- `png` と `gif` の既存ファイル出力 API を維持する
- 静的インラインモードでは PNG バイト列を返す
- アニメーションのインラインモードでは PNG バイト列の配列を返す

Python 呼び出し、JSON ペイロード構築、補助スクリプトのエラー処理はこのクラス内に保ち、他のコードからは Bloch 画像生成用の 1 つの Ruby 抽象として見える状態を維持する。

- [ ] **ステップ 5: 補助スクリプトとの境界を検証する**

実行する。

```bash
python3 -m py_compile libexec/qni_bloch_render.py
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_renderer_test.rb
```

期待結果: どちらも成功する。

- [ ] **ステップ 6: 描画器リファクタリングをコミットする**

```bash
git add test/qni/bloch_renderer_test.rb lib/qni/bloch_renderer.rb libexec/qni_bloch_render.py
git commit -m "feat: add in-memory bloch frame rendering"
```

### タスク 5: `qni bloch --inline` を一気通貫で接続する

**ファイル:**
- 作成: `lib/qni/bloch_inline_renderer.rb`
- 変更: `lib/qni/cli/bloch_command.rb`
- 変更: `features/step_definitions/cli_steps.rb`

- [ ] **ステップ 1: 狭いインライン描画器クラスを追加する**

`lib/qni/bloch_inline_renderer.rb` を作成し、次を担当させる。
- インライン出力を使おうとしている端末が利用可能かを確認する
- 静的インラインモードとアニメーションインラインモードを選ぶ
- `Qni::BlochRenderer` に PNG バイト列またはフレーム配列を要求する
- それらのバイト列を `Qni::KittyGraphicsEmitter` に渡す

CLI コマンドを薄く保つため、インライン固有の調整はすべてここへ移す。

- [ ] **ステップ 2: 端末機能の方針を追加する**

`Qni::BlochInlineRenderer` に、初回リリース向けの意図的に厳しい対応確認を実装する。
- テスト用の継ぎ目で明示的にインラインモードを強制している場合を除き、stdout は TTY でなければならない
- 環境変数が Kitty 互換端末を示している必要があり、Ghostty は対応端末として扱う
- それ以外では次を raise する。

```text
inline bloch rendering requires a Kitty-compatible terminal; use --png or --gif instead
```

あとで単体テストや調整ができるよう、小さな補助メソッドにする。

- [ ] **ステップ 3: `BlochCommand` の仮実装を置き換える**

`lib/qni/cli/bloch_command.rb` で次のように経路を振り分ける。
- `--png` / `--gif` は既存のファイル出力経路へ送る
- `--inline` は `Qni::BlochInlineRenderer` へ送る
- `--inline --animate` はアニメーション分岐へ送る

`frames = BlochSampler.new(...).frames` で組み立て済みの frames を再利用し、サンプリングは 1 か所に保つ。

- [ ] **ステップ 4: 対象を絞った cucumber を実行し、インラインシナリオを通過させる**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature
```

期待結果: 成功する

- [ ] **ステップ 5: 一気通貫のインライン経路をコミットする**

```bash
git add lib/qni/bloch_inline_renderer.rb lib/qni/cli/bloch_command.rb features/qni_bloch.feature features/qni_cli.feature features/step_definitions/cli_steps.rb
git commit -m "feat: add inline bloch rendering"
```

### タスク 6: 回帰確認を実行し、ヘルプ文を整える

**ファイル:**
- 変更: `lib/qni/cli/bloch_help.rb`
- 変更: `features/qni_cli.feature`
- 変更: `features/qni_bloch.feature`

- [ ] **ステップ 1: 最終的なユーザー向けヘルプを読み直す**

`lib/qni/cli/bloch_help.rb` と `features/qni_cli.feature` を一緒に確認し、次が明確に伝わることを確かめる。
- `--inline` は端末内プレビュー用であること
- `--animate` は `--inline` と一緒に使う場合だけ有効であること
- `--png` / `--gif` ではこれまでどおり `--output` が必要であること

表現は短くし、既存 CLI の語調と並べる。

- [ ] **ステップ 2: 対象を絞った Bloch 回帰確認を実行する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature features/qni_run.feature features/qni_export.feature
```

期待結果: 成功する

- [ ] **ステップ 3: 対象を絞った Ruby 品質チェックを実行する**

実行する。

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rubocop lib/qni/cli/bloch_command.rb lib/qni/cli/bloch_help.rb lib/qni/bloch_renderer.rb lib/qni/bloch_inline_renderer.rb lib/qni/kitty_graphics_emitter.rb test/qni/kitty_graphics_emitter_test.rb test/qni/bloch_renderer_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec reek lib/qni/cli/bloch_command.rb lib/qni/bloch_renderer.rb lib/qni/bloch_inline_renderer.rb lib/qni/kitty_graphics_emitter.rb
```

期待結果: 成功する

- [ ] **ステップ 4: プロジェクト全体の確認を実行する**

実行する。

```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果: 成功する

- [ ] **ステップ 5: 検証作業をコミットする**

```bash
git add features/qni_bloch.feature features/qni_cli.feature lib/qni/cli/bloch_help.rb
git commit -m "test: verify inline bloch terminal flow"
```
