# qni bloch APNG 実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目的:** ブロッホ球アニメーションの GIF 書き出しを APNG 形式そのものの書き出しに置き換え、`qni bloch` から `--gif` を削除する。

**設計:** 既存のブロッホ球サンプリングと Kitty インライン描画モデルは維持する。ただし、ファイル出力のアニメーションを APNG 形式そのものに変更する。Ruby 側では CLI の指定方法を `--gif` から `--apng` に切り替え、Python 側ではパレット削減済み GIF フレームではなく、RGBA フレーム画像からアニメーション PNG を直接書き出す。

**技術構成:** Ruby、Thor、Cucumber、Minitest、Python、matplotlib、Pillow、既存の `BlochSampler` / `BlochRenderer` 基盤

---

### タスク 1: 受け入れ仕様を GIF から APNG に書き換える

**ファイル:**
- 変更: `features/qni_bloch.feature`
- 変更: `features/qni_cli.feature`
- 変更: `features/step_definitions/cli_steps.rb`

- [ ] **手順 1: GIF シナリオを APNG シナリオに置き換える**

`features/qni_bloch.feature` で、アニメーション付きファイル出力の検証を次の形式に書き換える:

```text
qni bloch --apng --output bloch.png
```

次を対象にする:
- 回転回路で APNG 書き出しが成功する
- 出力ファイルがアニメーション PNG である
- アニメーション PNG が 2 フレーム以上を持つ
- `--png` と `--apng` を同時に指定すると失敗する
- `--animate` を `--inline` なしで使う場合、`--apng` と組み合わせても失敗する

- [ ] **手順 2: CLI ヘルプの期待値を更新する**

`features/qni_cli.feature` で、次を含むすべての `--gif` 記述を `--apng` に置き換える:
- `qni bloch --help`
- 必要であれば最上位コマンドの要約
- 使用法、例、オプションの文言

- [ ] **手順 3: APNG 検証ヘルパーを追加する**

`features/step_definitions/cli_steps.rb` に次のようなステップを追加する:

```ruby
Then('{string} は APNG 画像である') do |path|
  output = `file #{Shellwords.escape(actual_path)}`
  raise unless output.include?('animated')
end
```

さらに次も追加する:

```ruby
Then('{string} は {int} フレーム以上の APNG 画像である') do |path, minimum_frames|
  # Pillow または小さな Python ヘルパーで調べる
end
```

実装は既存の PNG/GIF ヘルパーと同じ流れにする。

- [ ] **手順 4: cucumber を実行して失敗を確認する**

実行: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

期待値: CLI がまだ `--gif` を扱っているため失敗する。

- [ ] **手順 5: 赤いテストをコミットする**

```bash
git add features/qni_bloch.feature features/qni_cli.feature features/step_definitions/cli_steps.rb
git commit -m "test: switch bloch acceptance from gif to apng"
```

### タスク 2: CLI とヘルプの表示を `--apng` に変更する

**ファイル:**
- 変更: `lib/qni/cli.rb`
- 変更: `lib/qni/cli/bloch_command.rb`
- 変更: `lib/qni/cli/bloch_help.rb`

- [ ] **手順 1: Thor オプションを置き換える**

`lib/qni/cli.rb` で、次を削除する:

```ruby
method_option :gif, ...
```

そして次を追加する:

```ruby
method_option :apng, type: :boolean, default: false, desc: 'Write a Bloch sphere APNG'
```

- [ ] **手順 2: 形式検証を更新する**

`lib/qni/cli/bloch_command.rb` で次を行う:
- `FILE_FORMATS` の `:gif` を `:apng` に置き換える
- 同時指定できない形式のエラー文を次に更新する:

```text
choose exactly one of --png, --apng, or --inline
```

- [ ] **手順 3: 形式選択を更新する**

ファイル出力の選択を次のようにする:

```ruby
option_enabled?(:apng) ? 'apng' : 'png'
```

GIF への後方互換は残さない。

- [ ] **手順 4: ヘルプ文を編集する**

`lib/qni/cli/bloch_help.rb` で、次にあるすべての GIF 記述を APNG に置き換える:
- 使用法
- 概要
- オプション
- 例

- [ ] **手順 5: 対象を絞った cucumber を実行し、CLI とヘルプが成功することを確認する**

実行: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature features/qni_cli.feature`

期待値: CLI とヘルプのシナリオは成功する。ただし、描画器の更新が終わるまでは APNG ファイル描画がまだ失敗する可能性がある。

- [ ] **手順 6: CLI 名称変更をコミットする**

```bash
git add lib/qni/cli.rb lib/qni/cli/bloch_command.rb lib/qni/cli/bloch_help.rb
git commit -m "feat: replace bloch gif option with apng"
```

### タスク 3: RGBA ブロッホ球フレームから APNG 形式そのものを書き出す

**ファイル:**
- 変更: `lib/qni/bloch_renderer.rb`
- 変更: `libexec/qni_bloch_render.py`
- 変更: `test/qni/bloch_renderer_test.rb`
- テスト: `features/qni_bloch.feature`

- [ ] **手順 1: APNG の失敗する描画器テストを追加する**

`test/qni/bloch_renderer_test.rb` に、次を確認する検証を追加する:
- `format: 'apng'` が受け入れられる
- 描画器がアニメーション PNG の内容またはファイルを書き出す

テストは小さく、入出力の約束に集中させる。

- [ ] **手順 2: Ruby 側の描画器形式処理を更新する**

`lib/qni/bloch_renderer.rb` で次を行う:
- `apng` をファイル描画形式として扱う
- `gif` への言及をやめる
- `inline_png` と `inline_frames` はそのまま維持する

- [ ] **手順 3: Python 側の GIF 書き出しを APNG 形式そのものの書き出しに置き換える**

`libexec/qni_bloch_render.py` で次を行う:
- `gif` 分岐を削除する
- `apng` 分岐を追加する
- `render_frame_image(...)` ですべての RGBA フレームを描画する
- `save_all=True` を指定して、Pillow でアニメーション PNG として直接保存する
- 静的 `png` とインライン経路は変更しない

目標の形は次のとおり:

```python
if format_name == "apng":
    images = [render_frame_image(...) ...]
    images[0].save(
        output_path,
        format="PNG",
        save_all=True,
        append_images=images[1:],
        duration=[90] * len(images),
        loop=0,
        default_image=False,
    )
```

RGBA フレームをそのまま使う。GIF やインデックスカラー変換を経由しない。

- [ ] **手順 4: 描画器テストを確認する**

実行: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/bloch_renderer_test.rb`

期待値: 成功する。

- [ ] **手順 5: ブロッホ球の受け入れテストを確認する**

実行: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_bloch.feature`

期待値: 成功する。

- [ ] **手順 6: 全体チェックを実行する**

実行: `BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check`

期待値:
- RuboCop が成功する
- Reek が成功する
- Cucumber 全体が成功する

- [ ] **手順 7: APNG 形式そのものを書き出す描画器をコミットする**

```bash
git add lib/qni/bloch_renderer.rb libexec/qni_bloch_render.py test/qni/bloch_renderer_test.rb
git commit -m "feat: export bloch animations as apng"
```
