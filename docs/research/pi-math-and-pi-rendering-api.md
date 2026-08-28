# pi-math と Pi 0.84.3 の描画 API 調査メモ

この文書は、Pi の TUI 上で LaTeX を端末画像として描画する拡張 `@fadouse/pi-math` のソースと、Pi 0.84.3 が拡張に提供する描画 API（Markdown 変換、画像コンポーネント、ツール結果の描画差し替え）を一次資料から確認したメモです。qni-cli のツール結果や説明文を数式として描画するかどうかを判断するための事実確認が目的で、実装案は書きません。

調査日は 2026-08-28。推測にあたる箇所は「推測」と明記します。

## 参照元

- pi-math: https://github.com/Fadouse/pi-math を `git clone --depth 1` した作業木（コミット `733182b3863f2996889e2e4129d21c81a8bb2151`、2026-07-14 23:47 +0800、`docs: refresh README math showcase`）。以下 `pi-math/` はこの作業木のルートを指す。
- Pi 0.84.3 公式ドキュメント: `node_modules/@earendil-works/pi-coding-agent/docs/{extensions,tui,packages,settings,tmux}.md`（以下 `docs/` と略記）
- Pi 0.84.3 の配布物: `node_modules/@earendil-works/pi-coding-agent/dist/`（以下 `pi-coding-agent/dist/`）と、その内側の `node_modules/@earendil-works/pi-tui/dist/`（以下 `pi-tui/dist/`、バージョン 0.84.3）
- Pi の `CHANGELOG.md`（`node_modules/@earendil-works/pi-coding-agent/CHANGELOG.md`）
- npm レジストリ: `npm view` の出力（2026-08-28 時点）
- GitHub: `gh repo view Fadouse/pi-math`

## A. pi-math のソース

### A1. モジュール構成

`pi-math/src/` は 9 ファイル、合計 1,713 行（`wc -l` の値）。テストは `pi-math/test/` に 7 本の `*.test.ts` と視覚確認用の `visual-fixture.ts` があり、合計 829 行。

| ファイル | 行数 | 役割（コードから確認した内容） |
| --- | ---: | --- |
| `src/index.ts` | 75 | 拡張の入口。`createTerminalMathRenderer` を `await` で初期化し（17-24 行）、成功時に `installMarkdownMathPatch` を適用（26 行）。`session_start` で初期化失敗を通知（28-32 行）、`session_shutdown` でパッチを外す（34-36 行）。`/math-render on|off|status|clear` コマンドを登録（38-74 行）。 |
| `src/config.ts` | 49 | 環境変数 `PI_MATH_MACROS` / `PI_MATH_ENVIRONMENTS`（JSON）、`PI_MATH_FONT_FILES`（パス区切り）、`PI_MATH_SYSTEM_FONTS` を読む（40-49 行）。Pi の settings は参照しない（`src/` 内に `showImages` や `settings` への参照なし）。 |
| `src/markdown-patch.ts` | 167 | `Markdown.prototype.render` を差し替える可逆パッチ本体。A2 で詳述。 |
| `src/transform.ts` | 523 | Markdown 文字列から LaTeX 区間を走査し、コード領域を避けつつマーカーへ置換する。`$...$`、`$$...$$`、`\(...\)`、`\[...\]`、`\begin{...}` 環境（26-27 行の `BLOCK_ENVIRONMENT_PATTERN`）を認識。フェンス付き・字下げコード、インラインコード、HTML `<code>`/`<pre>`、HTML コメント、TeX `\verb` を読み飛ばす（48-164 行）。 |
| `src/renderer.ts` | 123 | `\label` の除去、`\tag` の `\qquad\mathrm{(...)}` への書き換え、`equation` などの外側環境の剥がし（85-98 行）を行ってから `svg-renderer` を呼ぶ薄い層。 |
| `src/svg-renderer.ts` | 466 | MathJax（`mathjax-full`）で TeX→SVG、`@resvg/resvg-js` で SVG→PNG。二段キャッシュと失敗の負キャッシュ（A4）、寸法計算、アルファ境界による切れ検出（169-192 行、410-423 行）。 |
| `src/lru-cache.ts` | 63 | 件数とバイト数の両方で上限を持つ LRU（`WeightedLruCache`）。`Map` の挿入順を利用し、`get` で再挿入して最近使用扱いにする（20-26 行）。 |
| `src/image-layout.ts` | 116 | 描画済み行のマーカーを端末画像シーケンスに置換。ディスプレイ数式は中央寄せ（46-48 行）、インライン数式は Kitty 専用（65-83 行）。 |
| `src/kitty-graphics.ts` | 131 | Kitty の Unicode placeholder（U+10EEEE）による仮想配置。対応端末判定（43-56 行）、4096 文字単位の分割送信（79-94 行）、行・列を結合ダイアクリティカルマークで符号化（117-123 行）。 |

`docs/ARCHITECTURE.md`（pi-math 同梱）の責務表とコードの実態は一致していた。

### A2. `Markdown.render()` を可逆パッチする仕組み

差し替え対象は `@earendil-works/pi-tui` の `Markdown` クラスの `prototype.render`。Pi の拡張 API ではなく、クラスのプロトタイプを直接書き換えている。

- 取り込み: `pi-math/src/markdown-patch.ts:1-6` で `Markdown`, `allocateImageId`, `getCapabilities`, `getCellDimensions` を `@earendil-works/pi-tui` から import。
- 差し替えと復元: 74 行で `const originalRender = Markdown.prototype.render;` を退避し、149 行で `Markdown.prototype.render = patchedRender;`。`uninstall()`（158-165 行）は、現在のプロトタイプがまだ自分のパッチであるときだけ元に戻す。`index.ts:34-36` の `session_shutdown` から呼ばれる。
- 早期脱出: 79-90 行で「無効化中」「`getCapabilities().images` が null」「`text` が文字列でない」「`containsPotentialMath(source)` が偽」のいずれかなら元の `render` をそのまま呼ぶ。`containsPotentialMath` は `$`、`\(`、`\[`、`\begin{` の有無だけを見る（`transform.ts:324-331`）。
- 原文の一時差し替えと `finally` での復元: 140-146 行。

  ```ts
  markdown.text = transformed;
  try {
    const textLines = stripGeneratedMathFenceLines(originalRender.call(this, width));
    return insertFormulaImages(textLines, placements, { renderWidth: width, paddingX });
  } finally {
    markdown.text = source;
  }
  ```

  `Markdown` の private フィールド `text` を `MarkdownInternals` 型（18-24 行）として読み書きしている。セッション履歴やモデル文脈は触らない、表示専用の差し替えである。
- 部品ごとのキャッシュ: 77 行の `WeakMap<Markdown, CachedTransform>` に、`source` と `layoutKey`（99 行: `${width}:${paddingX}:${color}:${protocol}:${cells.widthPx}:${cells.heightPx}`）が一致するときだけ再利用する変換結果を保持する。
- インライン数式のマーカー: 53-62 行 `imageMarker`。インラインは私用領域文字 `String.fromCodePoint(0xe000 + (index % 0x1900))` を数式の占有列数ぶん `repeat` したもの。ディスプレイは `__PI_MATH_IMAGE_${imageId}_${index}__`。私用領域文字を幅ぶん並べることで、元の `Markdown.render` が行折り返しを正しく計算できる（`docs/ARCHITECTURE.md` の「Markdown transformation」節にも同旨の記述）。
- ディスプレイ数式の専用フェンス言語: `transform.ts:1` の `GENERATED_MATH_LANGUAGE = "pi-math-4f9c"`。`displayCodeBlock`（292-295 行）が 4 個以上のバッククォートで囲んだコードブロックにし、描画後に `stripGeneratedMathFenceLines`（499-523 行）がそのフェンス行と前後の空行だけを取り除く。
- 数式の色: 42-51 行 `formulaColor` が `theme.codeBlock("x")` の出力から truecolor SGR（`38;2;r;g;b`）を正規表現で抜き出して `#rrggbb` にする。取れなければ `#b5bd68`。
- インラインは Kitty のみ: 111 行 `if (inline && protocol !== "kitty") return undefined;`。iTerm2 ではインライン数式は変換されず原文のまま残る。
- マーカーの置換: `image-layout.ts:86-116` `insertFormulaImages`。ブロックのマーカーを含む行は画像行群に置換（99-103 行）、インラインは `renderInlinePlacement` の結果か `fallbackText`（原文）で置換（106-112 行）。

pi-math の README「How it works」節は「Pi は通常のユーザー／アシスタントメッセージのレンダラー上書きを公開していない」ため `Markdown.render()` を包む、と説明している。pi-math の devDependencies は Pi 0.80.6 で、`pi.registerMarkdownTransformer` は Pi 0.84.0 で追加された（`CHANGELOG.md:263`）。pi-math は `registerMarkdownTransformer` を使っていない（`src/` に参照なし）。

### A3. 端末プロトコルの選択

pi-math 自身は端末を判定せず、`@earendil-works/pi-tui` の `getCapabilities().images`（`"kitty" | "iterm2" | null`）に従う（`markdown-patch.ts:82`, `image-layout.ts:38-39, 66`）。Pi 側の判定ロジックは B3 を参照。

- Kitty Unicode placeholder（仮想配置）: `image-layout.ts:65-76`。`images === "kitty"` かつ 1 行に収まる数式で、`kittyPlaceholderSupport()` が真のときだけ使う。判定は `kitty-graphics.ts:43-56`: 環境変数 `KITTY_WINDOW_ID`、`TERM_PROGRAM` が `kitty` / `ghostty`、`TERM` に `xterm-kitty` / `ghostty` を含む、`GHOSTTY_RESOURCES_DIR`。送信は `a=T,f=100,q=2,U=1,i=<id>,p=<id>,c=<cols>,r=<rows>`（62-78 行）、4096 文字ごとに `m=1` で分割（83-94 行）。placeholder は前景色に画像 ID、下線色に配置 ID を 24 ビットで載せる（114-116 行）。最大 297 列・297 行（3 行）。
- Kitty graphics（placeholder 非対応の Kitty 互換端末、pi-tui では WezTerm と Warp が該当）: インラインは `image-layout.ts:78-82` の互換経路。空白を列数ぶん出してカーソルを戻し、pi-tui の `renderImage` が返す通常の Kitty シーケンスを置き、カーソルを進める。ディスプレイ数式は 49-54 行で、先頭行にシーケンス、残りは空行。
- iTerm2: ディスプレイ数式のみ。`image-layout.ts:56-61` で先に空行を `rows-1` 行出し、最後の行で `CSI nA` で戻ってからシーケンスを出す。インライン数式は上記の通り変換しない。
- tmux / screen: pi-math 側の分岐は無い。pi-tui が `images: null` を返すので（B3）、早期脱出により原文がそのまま描画される。README「Requirements」節も「Pi は tmux と screen で端末画像を意図的に無効化する」と明記。
- 画像不可時のフォールバック: (1) プロトコル無し → 元の `render`（`markdown-patch.ts:83-90`）。(2) MathJax 失敗や寸法上限超過 → `renderer.render` が `undefined` を返し、`transform.ts:297-322` の `replacementFor` が `undefined` を返すので、その区間はバイト単位で原文のまま（`transform.ts:398-403` など）。(3) 描画後に配置できない場合（内容幅を超えるなど）→ `fallbackText`（原文の区間）に置換（`image-layout.ts:101, 109`）。Unicode 近似への切り替えは無い（README「Fallback behavior」節）。
- 参照する Pi 側の API: `getCapabilities`, `getCellDimensions`, `allocateImageId`, `renderImage`（いずれも pi-tui の export、`pi-tui/dist/index.js:36`）。Pi の `terminal.showImages` 設定は参照しない。

### A4. キャッシュ設計

`pi-math/src/svg-renderer.ts` に二段、`markdown-patch.ts` に一段。

| キャッシュ | 上限 | キー | 出典 |
| --- | --- | --- | --- |
| SVG（MathJax 出力） | 512 件、8 MiB | `display|inline` + `\0` + 正規化済み LaTeX | `svg-renderer.ts:15, 240, 250` |
| PNG ラスタ | 256 件、64 MiB | `display|inline`, 色, `maxWidthCells`, `maxHeightCells`, `cellWidthPx`, `cellHeightPx`, `fit-height|width-only`, LaTeX を `\0` 連結 | `svg-renderer.ts:16, 241, 302-311` |
| 部品ごとの変換結果 | `WeakMap`（件数上限なし、部品の寿命に従う） | `Markdown` インスタンス → `{source, layoutKey}` 一致で再利用。`layoutKey` に幅・パディング・色・プロトコル・セル寸法 | `markdown-patch.ts:77, 99, 104-105` |

- プロトコルは PNG キーには入らず、部品ごとの `layoutKey` にだけ入る。
- 負のキャッシュ: 失敗も `FormulaRenderFailure`（`code`, `message`; コード一覧は 57-68 行）として同じキャッシュに入れる。SVG 側は `invalid-svg` / `invalid-dimensions` / `tex-error`（260-281 行）、PNG 側は `rememberFailure`（317-320 行）経由で `raster-limit` / `height-limit` / `empty-raster` / `clipped-raster` / `png-limit` / `raster-error`。
- 重み: 文字列は `length * 2`、失敗は `message.length * 2 + 64`（109-111 行）。PNG は `png.byteLength + base64Data.length + 128`（442 行）。
- 追い出し: `lru-cache.ts:54-62`。件数超過またはバイト超過の間、最古のキーから削除。
- その他の上限: 入力 20,000 文字、ラスタ 4096×4096 px、PNG 12 MiB（11-14 行）。`/math-render clear` で SVG・PNG・変換の三つを全消去（`index.ts:56-61`）。

### A5. 依存関係とインストールサイズ

`pi-math/package.json`:

- `dependencies`: `@resvg/resvg-js ^2.6.2`, `mathjax-full ^3.2.2`
- `peerDependencies`: `@earendil-works/pi-coding-agent "*"`, `@earendil-works/pi-tui "*"`
- `devDependencies`: `@earendil-works/pi-coding-agent ^0.80.6`, `@earendil-works/pi-tui ^0.80.6`, `tsx`, `typescript`, `@types/node`
- `engines`: `node >=22.19.0`
- `package-lock.json` の解決版: `mathjax-full 3.2.2`（2797-2798 行）、`@resvg/resvg-js 2.6.2`（2459-2460 行）

`npm view` の結果（2026-08-28）:

| パッケージ | 版 | `dist.unpackedSize` | 最終更新 | ライセンス | 備考 |
| --- | --- | ---: | --- | --- | --- |
| `mathjax-full` | 3.2.2 | 34,300,253 B（約 34.3 MB） | 2025-10-17 | Apache-2.0 | 依存 `esm`, `mhchemparser`, `mj-context-menu`, `speech-rule-engine`。インストール時に「Version 4 replaces this package with the scoped package @mathjax/src」の deprecated 警告 |
| `mathjax` | 4.1.3 | 19,971,291 B（約 20.0 MB） | 2026-07-03 | Apache-2.0 | pi-math は未使用（参考） |
| `@resvg/resvg-js` | 2.6.2 | 44,489 B | 2026-01-28 | MPL-2.0 | JS ラッパのみ。`engines.node >= 10` |
| `@resvg/resvg-js-linux-x64-gnu` | 2.6.2 | 4,384,036 B | — | — | `os: linux`, `cpu: x64`, `libc: glibc` |
| `@resvg/resvg-js-linux-x64-musl` | 2.6.2 | 4,379,792 B | — | — | `libc: musl` |
| `@resvg/resvg-js-linux-arm64-gnu` | 2.6.2 | 3,867,871 B | — | — | |
| `@resvg/resvg-js-darwin-arm64` | 2.6.2 | 3,538,730 B | — | — | |
| `@resvg/resvg-js-darwin-x64` | 2.6.2 | 3,871,991 B | — | — | |
| `@resvg/resvg-js-win32-x64-msvc` | 2.6.2 | 4,519,193 B | — | — | |

ネイティブバイナリの配布方法: `@resvg/resvg-js` は `optionalDependencies` に 12 個のプラットフォーム別パッケージ（`darwin-x64`, `darwin-arm64`, `android-arm64`, `linux-x64-gnu`, `linux-x64-musl`, `win32-x64-msvc`, `linux-arm64-gnu`, `win32-ia32-msvc`, `android-arm-eabi`, `linux-arm64-musl`, `win32-arm64-msvc`, `linux-arm-gnueabihf`）を列挙し、各パッケージの `os` / `cpu` / `libc` フィールドで npm が該当するものだけを取り込む方式（`npm view @resvg/resvg-js optionalDependencies` と各パッケージの `os`/`cpu`/`libc`）。ビルドスクリプトは走らず、`.node` ファイルがそのまま入る。

実測（作業木で `npm install --omit=dev --ignore-scripts`、Linux x64）: 10 パッケージ追加、`node_modules` 合計 55 MB。内訳は `mathjax-full` 41 MB、`speech-rule-engine` 8.3 MB、`@resvg/resvg-js-linux-x64-gnu` 4.2 MB（`resvgjs.linux-x64-gnu.node` 4,383,216 B）、`mj-context-menu` 608 KB、`mhchemparser` 312 KB、`esm` 316 KB。

MathJax の初期化は `svg-renderer.ts:205-239`。`AllPackages` から `html`, `noerrors`, `noundefined` を外し、`SafeHandler` で URL や style を禁止、`tags: "none"`、`maxBuffer` 20,000、`maxMacros` 1,000。SVG 出力は `fontCache: "none"`。`<text>` 要素を含む SVG のときだけ Resvg にシステムフォント探索を許す（389-398 行）。実行時にネットワークも子プロセスも使わない（README「Features」節、`docs/ARCHITECTURE.md`「Initialization and runtime」節）。

### A6. `pi` manifest とテスト

- manifest: `package.json` の `"pi": { "extensions": ["./src/index.ts"] }`。`main` と `exports` も `./src/index.ts` で、`files` は `src/*.ts`, `docs/images/*.png`, `docs/*.md`, `README.md`, `LICENSE`。ビルド成果物を持たず TypeScript ソースを直接配布する。README「Installation」節は `~/.pi/agent/extensions/pi-math` への git clone と `npm install --omit=dev` を案内しており、npm 公開を前提にした手順は書かれていない。
- テスト方法: `npm test` = `node --import tsx --test test/*.test.ts`（Node 組み込みテストランナー）。`npm run typecheck` = `tsc --noEmit`、`npm run check` は両方。`npm run visual -- <fixture>` で実端末に描画する視覚確認スクリプト（`test/visual-fixture.ts`、`MATH_WIDTH` で幅指定）。
- テスト数: `test(` の数は合計 31（`transform` 13、`renderer` 9、`kitty-graphics` 3、`lru-cache` 2、`config` 2、`extension` 1、`image-layout` 1）。
- 端末の模擬: `test/extension.test.ts:58-59` で pi-tui の `setCapabilities({ images: "kitty", ... })` と `setCellDimensions({ widthPx: 9, heightPx: 18 })` を呼び、`ExtensionAPI` は `on` と `registerCommand` だけ持つモック（68-77 行）。`renderer.test.ts` は MathJax と Resvg を実際に動かす。
- `tsconfig.json`: `module: NodeNext`, `strict`, `noEmit`, `verbatimModuleSyntax`。

### A7. ライセンス表記

- `pi-math/LICENSE`: MIT License、`Copyright (c) 2026 Fadouse`。`package.json` の `license` も `MIT`。README 末尾に MathJax（Apache-2.0）と Resvg JS（MPL-2.0）の表記あり。
- GitHub メタデータ（`gh repo view`）: 作成 2026-07-14、最終 push 2026-07-14、スター 3。リポジトリの説明文は「Render LaTeX formulas as responsive Unicode terminal layouts in the Pi TUI.」で、現行 README の「real, transparent terminal images」「no Unicode approximation path」と食い違う。推測: 当初は Unicode 整形方式で始まり、同日中に画像方式へ転換した名残。

## B. Pi 0.84.3 の描画 API

### B1. `pi.registerMarkdownTransformer(transformer)`

仕様は `docs/extensions.md:1579-1598`、型は `pi-coding-agent/dist/core/extensions/types.d.ts:865-870`。

- シグネチャ: `(markdown: string, context: MarkdownTransformContext) => string`。`context` は `messageType: "user" | "assistant" | "assistant-thinking"`、`isStreaming: boolean`、`availableWidth: number`（変換後 Markdown に使える正確な端末列数）。
- 連鎖: 拡張の読み込み順に実行され、前の変換結果を次が受け取る。最後に Pi の組み込みレンダラーが描画する（`docs/extensions.md:1581`）。実装 `pi-coding-agent/dist/modes/interactive/components/markdown-transform.js:4-18` では、例外は握りつぶして次へ進み、戻り値が文字列でなければ無視する。
- 実行順の先頭は Pi 組み込みの Mermaid 変換: `pi-coding-agent/dist/modes/interactive/interactive-mode.js:1589-1591` `[this.mermaidMarkdownTransformer, ...extensionRunner.getMarkdownTransformers()]`。
- 1 拡張につき 1 つ: `pi-coding-agent/dist/core/extensions/loader.js:281` は `extension.markdownTransformer = transformer` と代入し、`runner.js:391` は拡張ごとに 0 または 1 個を集める。推測: 同じ拡張が複数回登録すると後勝ちで上書きされる。
- 同期・表示専用・実行タイミング: 「display-only で、元のメッセージはセッションにもモデル文脈にも残る。新規ユーザーメッセージ、アシスタントのストリーミング更新、復元されたセッションメッセージ、端末幅変更のたびに走るので、同期かつ軽量に保つこと」（`docs/extensions.md:1598`）。呼び出し元は `Markdown` 部品の `render()` 内で、`options.transform?.(this.text, contentWidth)` として幅を渡す（`pi-tui/dist/components/markdown.js:186`）。
- 適用範囲: `UserMessageComponent`（`user-message.js:35`、`isStreaming` は常に `false`）と `AssistantMessageComponent`（`assistant-message.js:83, 117`、本文と thinking）。`CustomMessageComponent` の既定描画（`custom-message.js:82`）とツール結果（B4）には適用されない。
- 追加バージョン: 0.84.0（`CHANGELOG.md:263`、PR #7231）。

### B2. `Image` コンポーネントと画像設定

- 公開 API: `docs/tui.md:271-283`。`new Image(base64Data, mimeType, theme: ImageTheme, options?: ImageOptions, dimensions?)`。`ImageTheme = { fallbackColor }`、`ImageOptions = { maxWidthCells?, maxHeightCells?, filename?, imageId? }`（`pi-tui/dist/components/image.d.ts`）。対応端末は「Kitty, iTerm2, Ghostty, WezTerm, Warp」（`docs/tui.md:273`）。対応形式は PNG, JPEG, GIF, WebP で、寸法はヘッダから自動取得（pi-tui `README.md` の Image 節）。
- 描画ロジック: `pi-tui/dist/components/image.js:28-80`。幅は `min(width - 2, maxWidthCells ?? 60)`、高さ上限は既定でアスペクト比から算出。Kitty では `allocateImageId()` で ID を確保し、`renderImage` の結果を先頭行 + 空行 `rows-1` 本で返す。iTerm2 では空行の後に `CSI nA` で戻って描く。`renderImage` が `null` を返したときは `imageFallback` のテキストを `fallbackColor` で描く（76-79 行）。
- 低レベル API: `renderImage(base64Data, imageDimensions, options)`（`pi-tui/dist/terminal-image.js:441-475`）。Kitty なら `encodeKitty`（`imageId` があれば `registerKittyImageMetadata` で行消去時の解放対象に登録）、iTerm2 なら `encodeITerm2`（`height: "auto"`）。どちらでもなければ `null`。
- 設定: `docs/settings.md:177-185`。`terminal.showImages`（既定 `true`）、`terminal.imageWidthCells`（既定 `60`）、`images.autoResize`（既定 `true`、2000×2000 に縮小、ツール結果の画像にも適用）、`images.blockImages`（既定 `false`）。`/show-images` コマンドで切り替え可能（`CHANGELOG.md:5093`）。
- ツール結果内の画像: `pi-coding-agent/dist/modes/interactive/components/tool-execution.js:286-303`。結果 `content` の `type: "image"` ブロックを、`getCapabilities().images && this.showImages` のときだけ `Image` 部品として追加。Kitty では PNG 以外を `convertToPng` で変換し、変換できなければ表示しない（295-296 行）。幅は `terminal.imageWidthCells`。
- 代替画面（fullscreen）での制約: `TuiAltScreen` は iTerm2 で画像をテキストのプレースホルダとして描く（pi-tui `README.md`「Alternate-screen image compatibility」節）。

### B3. 端末の画像能力検出

実装は `pi-tui/dist/terminal-image.js` の `detectCapabilities`（35-90 行）。結果は `getCapabilities()`（91-96 行）でプロセス内にキャッシュされ、`resetCapabilitiesCache()` / `setCapabilities()`（97-103 行）で上書きできる。

| 判定順 | 条件 | `images` | 出典（行） |
| --- | --- | --- | --- |
| 1 | `process.env.TMUX` または `TERM` が `tmux` で始まる | `null`（「画像プロトコルは tmux 下で信頼できない」とコメント） | 42-46 |
| 2 | `TERM` が `screen` で始まる | `null` | 47-50 |
| 3 | `KITTY_WINDOW_ID` または `TERM_PROGRAM === "kitty"` | `"kitty"` | 51-53 |
| 4 | `TERM_PROGRAM === "ghostty"`、`TERM` に `ghostty`、`GHOSTTY_RESOURCES_DIR` | `"kitty"` | 54-56 |
| 5 | `WEZTERM_PANE` または `TERM_PROGRAM === "wezterm"` | `"kitty"` | 57-59 |
| 6 | `TERM_PROGRAM === "warpterminal"`、`WARP_SESSION_ID`、`WARP_TERMINAL_SESSION_UUID` | `"kitty"` | 60-63 |
| 7 | `ITERM_SESSION_ID` または `TERM_PROGRAM === "iterm.app"` | `"iterm2"` | 64-66 |
| 8 | `WT_SESSION` / `TERM_PROGRAM === "vscode"` / `"alacritty"` / JetBrains / Windows コンソール / 不明 | `null` | 67-89 |

- tmux 判定は Kitty 判定より先に来るため、Kitty の中で tmux を使っていても `images: null` になる。`docs/tmux.md` はキー入力（extended-keys）の設定だけを扱い、画像には触れていない。
- セル寸法: `getCellDimensions()` の既定は `{ widthPx: 9, heightPx: 18 }` で、TUI 起動時に端末へ問い合わせて更新する（`terminal-image.js:6-13`、`CHANGELOG.md:2189` は `CSI 6 ; height ; width t` 応答の扱いに言及）。
- 画像行の識別と Kitty 画像の解放: `isImageLine`（106-113 行）は `ESC _ G` と `ESC ] 1337;File=` を探す。`registerKittyImageMetadata`（195-199 行）は 1000 件を超えると古いものから捨てる。

### B4. ツール結果とカスタムメッセージの描画差し替え

qni-cli のツール結果を数式として描画したい場合に関係する API を列挙する。

1. `pi.registerTool({ ..., renderCall, renderResult, renderShell })`
   - 仕様: `docs/extensions.md:1347-1396`（概要）、`2220-2343`（詳細）。型: `types.d.ts:360-376`。
   - `renderResult(result, { expanded, isPartial }, theme, context)` は `Component` を返す。`context` には `args`, `state`, `lastComponent`, `invalidate()`, `toolCallId`, `cwd`, `executionStarted`, `argsComplete`, `isPartial`, `expanded`, `showImages`, `isError` が入る（`docs/extensions.md:2244-2249`、`types.d.ts:325-338`）。
   - `renderShell: "self"` で既定の `Box` 枠を外し、枠・余白・背景を自前で描ける（`docs/extensions.md:2228-2242`）。
   - 既定の描画: `renderResult` が無い、または例外を投げると `content` の生テキストを表示する（`docs/extensions.md:2339-2343`）。実装は `tool-execution.js:115-123` で、`Text` 部品に `theme.fg("toolOutput", line)` を掛けたもの。`Markdown` 部品は使わないので、ツール結果テキスト内の `$...$` は B6 の LaTeX 描画を通らない。
   - 返せる部品に制限はなく、pi-tui が export する `Markdown`（`pi-tui/dist/index.js:13`）や `Image`（同 10 行）も返せる（「A defined `renderCall` or `renderResult` must return a `Component`」`docs/extensions.md:2224`）。
2. 組み込みツールの上書き: `docs/extensions.md:2060-2091`。同名で `registerTool` すると `read`, `bash`, `powershell`, `edit`, `write`, `grep`, `find`, `ls` を差し替えられる。描画スロットは個別に継承され、`renderResult` だけ定義して実行は組み込みのままにできる（2077 行）。ただし結果の形（`details` 型）を組み込みと一致させる必要がある（2081 行）。qni-cli のツールは組み込みではないので、この節は `bash` 経由で qni を呼ぶ場合にだけ関係する。
3. `pi.registerMessageRenderer(customType, renderer)`: `docs/extensions.md:1575-1577, 2827-2865`。`pi.sendMessage({ customType, content, display, details })` で送ったカスタムメッセージ（モデル文脈に入る）の描画を差し替える。`options` は `{ expanded, outputPad }`（`types.d.ts:860-863`）。レンダラー未登録時の既定描画は `Markdown` 部品（`custom-message.js:82`）なので、B6 の LaTeX→Unicode 描画がそのまま効く。
4. `pi.registerEntryRenderer(customType, renderer)`: `docs/extensions.md:1600-1618`。`pi.appendEntry()` で追加した、モデル文脈に入らない TUI 専用エントリの描画。`options` は `{ expanded }`。
5. ツール結果に画像を含める: `execute` が返す `content` に `{ type: "image", data, mimeType }` を入れると、B2 の通り `terminal.showImages` と端末能力に応じて自動描画される（`tool-execution.js:286-303`）。`images.autoResize` の対象にもなる（`docs/settings.md:184`）。
6. `pi.registerMarkdownTransformer`（B1）はユーザー／アシスタント本文専用で、ツール結果には効かない。

`ctx.mode === "tui"` のときだけ TUI 部品が使える（`docs/extensions.md:2907-2916`）。

### B5. パッケージの依存規則と `pi install` 時の挙動

`docs/packages.md:167-185` と `docs/extensions.md:139-151`:

- 第三者の実行時依存は `dependencies` に置く。`pi install`（npm / git）は `npm install` を実行するので自動で入る。
- Pi が同梱するコアパッケージ `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox` を import するなら `peerDependencies` に `"*"` で書き、バンドルしない（pi-math はこの規則に従っている）。
- 他の pi パッケージを取り込むときは `dependencies` と `bundledDependencies` の両方に書き、`node_modules/` 経由のパスで manifest から参照する。Pi はパッケージごとに別のモジュールルートで読み込む。
- インストールは本番用（`npm install --omit=dev`）なので `devDependencies` は実行時に使えない。`npmCommand` を設定している場合、git パッケージは互換性のため素の `install` になる（`docs/extensions.md:149`）。
- 置き場所: npm は `~/.pi/agent/npm/`（プロジェクトは `.pi/npm/`）、git は `~/.pi/agent/git/<host>/<path>`。git は固定 ref を再調整するたびに reset / clean し、`package.json` があれば `npm install`（`docs/packages.md:93`）。
- manifest が無ければ `extensions/`, `skills/`, `prompts/`, `themes/` を自動探索（`docs/packages.md:160-165`）。
- 現在の qni-cli の `package.json` は `"pi": { "skills": ["./skills/qni-cli"] }` だけで拡張を登録していない。

### B6. 追加発見: Pi 0.84.0 以降の組み込み LaTeX→Unicode 描画

pi-math の想定（Pi 0.80.6）と異なり、Pi 0.84.0 で Markdown 内の LaTeX を Unicode 文字で整形する機能が Pi 本体に入っている。

- 変更履歴: `CHANGELOG.md:178`「Mermaid and LaTeX rendering — Render Mermaid diagrams and terminal-friendly Unicode math in interactive transcripts」、同 274 行「Added inherited terminal-friendly Unicode rendering for LaTeX expressions in Markdown」（0.84.0、2026-08-06）。0.84.1 / 0.84.2 / 0.84.3 でも間隔や行列、引数の解析修正が続いている（120, 137, 170 行）。
- 実装: `pi-tui/dist/latex.js`（1,270 行）。公開関数は `renderLatex(source, { display?: boolean }): string | undefined`（`pi-tui/dist/latex.d.ts`）。対応しない構文やおかしな入力では `undefined` を返す。`pi-tui/dist/index.js:28` で export されているので拡張から直接呼べる。
- Markdown への組み込み: `pi-tui/dist/components/markdown.js:84-118` が marked 拡張として `$$...$$` / `\[...\]`（ブロック）と `$...$` / `\(...\)`（インライン）をトークン化する。ブロックは `renderLatex(text, { display: true })`、インラインは `renderLatex(text)` で描き、`undefined` なら原文を表示（369-373, 492-497 行）。`MarkdownOptions.renderLatex`（既定 `true`）で無効化できる（`markdown.d.ts`）。ストリーミング途中で閉じていない数式は `pending` 扱いで原文表示。
- 通貨との誤認回避: `markdown.js:60-68`。閉じ `$` の直後が数字、開き直後が空白、中にバッククォート、`$VAR` 形の識別子などは数式にしない。
- 設定: `docs/settings.md:265-270` の Markdown 設定は `markdown.codeBlockIndent` と `markdown.mermaid` だけで、LaTeX 描画を切る設定キーは無い。`docs/tui.md` と `docs/settings.md` に `renderLatex` の記述は無く、pi-tui 同梱 `README.md` の Markdown 節にも LaTeX の記述は無い（CHANGELOG が参照する `../tui/README.md#markdown` は npm 配布物には含まれていない）。

量子回路でよく使う式を `renderLatex` に通した結果（`node --input-type=module` で `pi-tui/dist/index.js` を直接 import して実行）:

| 入力 | インライン出力 | ディスプレイ出力 |
| --- | --- | --- |
| `\|\psi\rangle = \alpha\|0\rangle + \beta\|1\rangle` | `\|ψ⟩ = α\|0⟩ + β\|1⟩` | 同左 |
| `\ket{\psi} = \frac{1}{\sqrt{2}}(\ket{0}+\ket{1})` | `undefined`（`\ket` 非対応） | `undefined` |
| `\frac{1}{\sqrt{2}}(\|0\rangle + \|1\rangle)` | `1/(√2)(\|0⟩ + \|1⟩)` | 3 行（`1` / `── (\|0⟩ + \|1⟩)` / `√2`） |
| `H = \frac{1}{\sqrt{2}}\begin{pmatrix}1&1\\1&-1\end{pmatrix}` | 2 行（`⎛ 1 │ 1  ⎞` / `⎝ 1 │ -1 ⎠` を含む） | 分数を縦積みした 3 行 |
| `e^{i\pi}+1=0` | `e^(iπ)+1 = 0` | 同左 |
| `\|00\rangle \otimes \|1\rangle` | `\|00⟩ ⊗ \|1⟩` | 同左 |
| `P(0)=\|\alpha\|^2 = \frac{1}{2}` | `P(0) = \|α\|² = 1/2` | 分数を縦積みした 3 行 |
| `\langle 0\|\psi\rangle` | `⟨ 0\|ψ⟩`（`⟨` の後に空白が入る） | 同左 |
| `\sum_{k=0}^{2^n-1} a_k \|k\rangle` | `∑ₖ₌₀^(2ⁿ-1) aₖ \|k⟩` | 上下限を縦に置いた 3 行 |
| `\text{amp}=0.5` | `amp = 0.5` | 同左 |
| `\boxed{x}` | `[x]` | 同左 |

（表中の `\|` は表記上のエスケープで、実際の入出力は `|`。）

## C. Unicode テキストで数式を整形する Node.js ライブラリ候補

`npm view` と `npm search "latex unicode"` で確認した（2026-08-28）。

| パッケージ | 版 | 最終更新 | `dist.unpackedSize` | 内容 |
| --- | --- | --- | ---: | --- |
| `@earendil-works/pi-tui` の `renderLatex` | 0.84.3 | 2026-08-24 | （Pi 同梱） | B6 の通り。Pi 拡張からは peer 依存として追加コスト無しで使える |
| `unicodeit` | 0.7.5 | 2023-03-12 | 298,874 B | 「Converts LaTeX tags to unicode」。記号置換が中心。依存に `typeahead`（ブラウザ向け UI 補完）を含む。MIT |
| `latex2unicode` | 0.1.0 | 2026-08-06 | 667,133 B | 「Convert LaTeX math expressions to readable Unicode text」。公開版は 1 つだけ、`repository` フィールド無し、メンテナ 1 名。MIT |
| `latex-math` | 0.0.2 | 2025-03-24 | 554,880 B | LaTeX 数式を AST にする解析器のみ（`unified` 依存）。整形器ではない |
| `mathup` | 1.0.2 | 2026-06-24 | 1,798,379 B | 独自記法→MathML。Unicode テキスト出力ではない |
| `asciimath` | 0.0.1 | 2026-05-14 | 808,619 B | AsciiMath→MathML（ブラウザ向け） |
| `latex-to-unicode` | 0.1.0 | 2022-06-19 | （未記載） | 説明のみで詳細不明 |
| `unicode-math` | 0.2.0 | 2022-06-28 | （未記載） | 「Unicode values for LaTeX math symbols」（記号表） |

npm に見つからなかった名前: `utftex`, `tex-to-unicode`, `tex2unicode`, `unicode-tex`, `latex-unicode`, `unimath`, `mathtext`, `asciimath-to-unicode`, `unicode-it`（いずれも 404）。`utftex` は C 言語のコマンドラインツール（libtexprintf）として知られているが、本調査では npm 以外を確認していない（推測）。

結論: 縦積み分数・行列・上下限まで含めて TeX を Unicode の複数行に整形する Node.js ライブラリで、活発に保守されているものは npm 上に見つからず。実質的な候補は Pi 同梱の `renderLatex` のみ。

## D. 拡張が Pi の中から端末へ問い合わせて返事を読めるか

多重化ソフト（tmux など）が画像を通すかどうかを、環境変数ではなく端末への問い合わせで確かめられるかを調べた。

### D1. `detectCapabilities()` は環境変数だけで判定する

`pi-tui/dist/terminal-image.js:35-90` の `detectCapabilities` が参照するのは `process.env` の `TERM_PROGRAM`, `TERMINAL_EMULATOR`, `TERM`, `COLORTERM`（36-40 行）、`TMUX`, `KITTY_WINDOW_ID`, `GHOSTTY_RESOURCES_DIR`, `WEZTERM_PANE`, `WARP_SESSION_ID`, `WARP_TERMINAL_SESSION_UUID`, `ITERM_SESSION_ID`, `WT_SESSION`（44-67 行）と `process.platform`（41 行）のみ。端末へエスケープシーケンスを送る箇所は無い。唯一の外部呼び出しは tmux 下での `probeTmuxHyperlinks`（19-34 行）で、これは `execSync("tmux display-message -p '#{client_termfeatures}'")` という子プロセス実行であり、しかもハイパーリンク可否の判定にしか使わず、`images` は tmux 下では無条件に `null`（44-46 行）。結果は `getCapabilities()`（91-96 行）でプロセス内にキャッシュされる。

### D2. Pi がセル寸法を端末へ問い合わせて返事を読む箇所

Pi 本体は画像描画用のセル寸法についてだけ端末へ問い合わせている。

- 送信: `pi-tui/dist/tui.js:471-479` `queryCellSize()`。`getCapabilities().images` が偽なら何もせず（472-475 行）、真なら `this.terminal.write("\x1b[16t")`（CSI 16 t、478 行）。呼び出しは `start()` の末尾 444 行で、端末開始直後に一度だけ。
- 受信: `tui.js:657-673` `consumeCellSizeResponse(data)`。stdin から来た 1 シーケンスを正規表現 `/^\x1b\[6;(\d+);(\d+)t$/`（CSI 6 ; height ; width t）で照合し、一致すれば `setCellDimensions({ widthPx, heightPx })`（669 行、`terminal-image.js:11-13`）を呼んで全部品を無効化・再描画する。照合しなければ `false` を返し、通常の入力として流れる。
- 受信経路: `tui.js:438` で `terminal.start((data) => this.handleTerminalInput(data), ...)`。`handleTerminalInput` は入力リスナー（560-574 行）→ セル寸法応答の消費（576-578 行）→ デバッグキー → フォーカス中の部品の `handleInput(data)`（616-621 行）の順に処理する。
- 同じ仕組みの他の問い合わせ: `queryTerminalBackgroundColor`（OSC 11 `\x1b]11;?\x07`、`tui.js:911`、タイムアウト付き Promise）と `queryTerminalColorScheme`（DSR `\x1b[?996n`、`tui.js:937`、応答 `CSI ? 997 ; 1|2 n`）。どちらも `TuiBase` の public メソッド（`pi-tui/dist/tui.d.ts:292-307`）。Kitty キーボードプロトコルの判定も `terminal.js:168-192` で「フラグ要求 → CSI ? u → DA1」を送り、応答を `parseKeyboardProtocolNegotiationSequence` で読む問い合わせ方式。
- stdin の分割: `pi-tui/dist/stdin-buffer.js:28-70` `isCompleteSequence` は CSI / OSC / DCS / APC / SS3 を区別して 1 シーケンスずつ切り出す。APC（`ESC _ ... ESC \`）は「Kitty graphics responses を含む」と明記され（53-54 行、139-152 行）、`ESC \` で終端するまで待つ。つまり Kitty グラフィックスの応答は分割されずに 1 つの `data` として `handleTerminalInput` に届く。
- 変更履歴: `CHANGELOG.md:2189`「TUI cell size response handling to consume only exact `CSI 6 ; height ; width t` replies」。Kitty グラフィックスの問い合わせ（`a=q`）を Pi が送った形跡は CHANGELOG と `pi-tui/dist` のどちらにも無い。

### D3. 拡張が生の端末応答を受け取れる経路

あり。ただし Pi の拡張 API（`docs/extensions.md`）には文書化されておらず、pi-tui の `TUI` オブジェクトを介した経路になる。

- `TUI` オブジェクトの入手: 拡張は `ctx.ui.custom((tui, theme, keybindings, done) => ...)`（`docs/extensions.md:2711-2737`、型 `types.d.ts:117`）、`ctx.ui.setWidget(key, (tui, theme) => ...)`（`types.d.ts:98`）、`ctx.ui.setHeader` / `setFooter`（同 107, 111 行）、`ctx.ui.setEditorComponent((tui, theme, keybindings) => ...)`（同 63 行）の各ファクトリ引数として `TUI` を受け取る。`docs/extensions.md:2733` は `tui` を「TUI instance (for screen dimensions, focus management)」と説明している。
- 送信: `TUI.terminal: Terminal`（`pi-tui/dist/tui.d.ts:147`）は public で、`Terminal.write(data: string)`（`terminal.d.ts`）で任意のバイト列を出せる。
- 受信 (a) `tui.addInputListener(listener)`（`tui.d.ts:165-166`, `tui.js:447-455`）: 全入力を、セル寸法応答の消費やフォーカス部品への配送より前に受け取る（`tui.js:560-574`）。戻り値 `{ consume?: boolean, data?: string } | undefined`（`tui.d.ts:32-36`）で、`consume: true` を返せばその入力は他へ流れない。解除関数を返す。pi-tui 同梱 `README.md:44-49` に Ctrl+C を横取りする例があるが、Pi の `docs/tui.md` / `docs/extensions.md` には記載が無い。
- 受信 (b) フォーカス中の部品の `handleInput(data: string)`（`tui.d.ts:20`、`tui.js:616-621`）: `ctx.ui.custom` で返した部品がフォーカスを持つ間だけ届く。入力リスナーとセル寸法応答が先に消費したものは届かない。
- 制約: (1) `ctx.mode === "tui"` のときだけ（`docs/extensions.md:952, 2916`）。(2) `TUI` を得るには上記のいずれかの UI ファクトリを使う必要があり、拡張のロード時点や `session_start` の `ctx` から直接 `TUI` を取る API は `types.d.ts` に無い。(3) 応答のタイムアウトや DA1 との突き合わせは自前で書く（Pi 内部の `queryTerminalColorScheme` が `setTimeout` と解除関数で行っているのと同じ形、`tui.js:918-942`）。(4) `addInputListener` は「プロセス全体の入力を横取りする」もので、`consume` を誤ると通常のキー入力を奪う。(5) `pi.on("input")` イベント（`docs/extensions.md:891-940`）はユーザーが送信した本文テキストを扱うもので、エスケープシーケンスは来ない。

### D4. Kitty グラフィックスの問い合わせと応答形式（プロトコル仕様）

出典: https://sw.kovidgoyal.net/kitty/graphics-protocol/（2026-08-28 取得）。

- 問い合わせ: 「you can use the _query action_, set `a=q`. Then the terminal emulator will try to load the image and respond with either OK or an error, as above, but it will not replace an existing image with the same id, nor will it store the image.」例: `<ESC>_Gi=31,s=1,v=1,a=q,t=d,f=24;AAAA<ESC>\`。
- 応答: 成功 `<ESC>_Gi=31;OK<ESC>\`。失敗は `<ESC>_Gi=<id>;<エラーコード>:<メッセージ><ESC>\` の形で、仕様が挙げるコードに `EINVAL`, `ENOENT`, `EBADF`, `ETOODEEP`, `ECYCLE`, `ENOPARENT` がある（例: 「`<ESC>_Gi=<id>;ENOENT:<some detailed error msg><ESC>\` when the image with the specified id was not found」）。
- 検出手順の推奨: 「To check if a terminal emulator supports the graphics protocol the best way is to send the above _query action_ followed by a request for the primary device attributes. If you get back an answer for the device attributes without getting back an answer for the _query action_ the terminal emulator does not support the graphics protocol.」
- 応答抑制: `q` キーは「Set it to `1` to suppress `OK` responses and to `2` to suppress failure responses」。pi-math は送信時に `q=2` を付けている（`kitty-graphics.ts:72, 91`）ので、pi-math 自身の画像送信に対する応答は原則返らない。
- 多重化ソフトについて: 仕様は Unicode placeholder 方式を「allows using images inside any host application that supports Unicode, foreground colors (tmux, vim, weechat, etc.), and a way to pass escape codes through to the underlying terminal」と説明している。tmux が応答を落とすという明文は、取得したページ内には見つからなかった。

### D5. pi-math の扱い

pi-math は問い合わせをしない。`src/` に `a=q` や応答読み取りは無く、`ESC _ G` を書く箇所は送信の 3 か所だけ（`kitty-graphics.ts:80, 89, 91`）。判定は (1) pi-tui の `getCapabilities().images`（`markdown-patch.ts:82`, `image-layout.ts:38, 66`）と (2) 自前の環境変数判定 `kittyPlaceholderSupport`（`kitty-graphics.ts:43-56`）の二段で、どちらも環境変数由来。多重化ソフトが画像を通さない場合は、pi-tui が tmux / screen で `images: null` を返すことに依存して原文表示に落ちる（README「Requirements」節「Pi intentionally disables terminal images inside tmux and screen」）。tmux の `allow-passthrough` を有効にした環境でも Kitty 判定に到達しない。

### D6. `setCapabilities()` / `resetCapabilitiesCache()` は公開 API か

公開されている。`pi-tui/dist/index.js:36` の export 一覧に `detectCapabilities`, `getCapabilities`, `resetCapabilitiesCache`, `setCapabilities`, `setCellDimensions` が含まれる。実装は `terminal-image.js:97-103` で、`setCapabilities(caps)` はモジュール変数 `cachedCapabilities` を置き換え、`resetCapabilitiesCache()` は `null` に戻して次回 `getCapabilities()` で再判定させる。コメントは「Useful in tests to exercise both code paths」で、Pi の `docs/` には記載が無い。

拡張から呼んだ場合の効果: Pi 本体は `getCapabilities()` を描画のたびに呼ぶ（`tool-execution.js:288`、`image.js:36`、`renderImage` の `terminal-image.js:442`）ので、上書きは Pi 全体の画像判定に即時に効く。一方、`queryCellSize()` は `start()` 時に一度しか走らず（`tui.js:444`）、Pi 本体が `setCapabilities` / `resetCapabilitiesCache` を呼ぶ箇所は `pi-coding-agent/dist` に無い（grep 結果 0 件）ため、拡張のロード後に `images` を `null` から `"kitty"` へ変えてもセル寸法は既定の 9×18 px のまま（`terminal-image.js:7`）になる。pi-math のテスト（`test/extension.test.ts:58-59`）はこの二つを組で呼んでいる。

## E. 公開 API だけで本文の画像化は可能か

前提: 「非公開 API（`Markdown.prototype.render` の差し替えなど）は使わない」。ここでの「公開 API」は、(1) `docs/extensions.md` / `docs/tui.md` に記載された拡張 API、(2) `@earendil-works/pi-tui` の `dist/index.js` が export し `.d.ts` に型がある関数・クラス、の二段階に分けて扱う。(2) だけに該当するものは「型定義上は公開だが文書化されていない」と明記する。以下、実験出力中のエスケープ文字（U+001B）は `ESC` と表記する。

### E1. Kitty Unicode placeholder 方式の可否

仕組み（Kitty 仕様 https://sw.kovidgoyal.net/kitty/graphics-protocol/ の「Unicode placeholders」節、2026-08-28 取得）: 画像を `U=1` で仮想配置しておき（「create a _virtual image placement_ by specifying `U=1` and the desired number of lines and columns」）、以後は U+10EEEE を「encoding the image ID in its foreground color」で並べる。「Since this character is just normal text, Unicode aware application will move it around as needed when they redraw their screens, thereby automatically moving the displayed image as well, even though they know nothing about the graphics protocol.」ID は「8-bit IDs in 256 color mode or 24-bit IDs in true color mode」、配置 ID は「using the underline color (if it's omitted or zero, the terminal may choose any virtual placement of the given image)」。行・列はダイアクリティカルで指定し、省略時は左隣から継承する（「If no diacritics are present, and the previous placeholder cell has the same foreground and underline colors, then the row of the current cell will be the row of the cell to the left, the column will be the column of the cell to the left plus one, ...」）。

この文字列を `registerMarkdownTransformer` の戻り値に埋め込んだ場合の pi-tui `Markdown` 部品の挙動を、コードと実験（E5）で確認した。

(a) 生の ANSI SGR は素通しする（確認済み）。

- `marked` の字句解析後、`text` トークンは `token.text` をそのまま `applyText` に渡す（`pi-tui/dist/components/markdown.js:503-510`）。制御文字を除去・エスケープする処理は `render()`（180-262 行）にも `renderInlineTokens()`（482 行以降）にも無い。タブを 3 空白にする置換だけがある（197 行）。
- 実験（E5 実験 1・3）: `ESC[38;5;42m` + U+10EEEE×5 + `ESC[39m` を含む段落は、出力行にそのまま現れた。`ESC[58;2;r;g;bm`（下線色）と `ESC[39;59m` も残った。
- TUI 側の後処理 `applyLineResets`（`pi-tui/dist/tui.js:851-858`）は各行末に `ESC[0m ESC]8;;BEL` を付けるだけで、`normalizeTerminalOutput`（`utils.js:332-354`）はタイ・ラオ文字とタブ以外に触れない。実験で placeholder 行・APC 行とも不変だった。

(b) U+10EEEE と結合文字の幅は 1 セル（確認済み）。

- `visibleWidth`（`utils.js:204-254`）は `extractAnsiCode`（356-395 行）で CSI（`m`/`G`/`K`/`H`/`J` 終端）、OSC、APC（`ESC _ ... ESC \`）を取り除いた後、`Intl.Segmenter` の書記素単位で `graphemeWidth`（144-203 行）を足す。`graphemeWidth` は基底文字の `eastAsianWidth`（`get-east-asian-width`）を使い、私用領域の U+10EEEE は 1、後続の結合文字は幅に加算しない。
- 実験: `visibleWidth(U+10EEEE) = 1`、`visibleWidth(U+10EEEE U+0305 U+0305) = 1`、5 セル分の列は 5。
- APC 転送シーケンス全体は幅 0 と数えられる（実験 2: `w=0`）。

(c) 段落の折り返しでプレースホルダー列が分断される条件（確認済み）。

- 折り返しは `wrapTextWithAnsi`（`utils.js:757-777`）→ `wrapSingleLine`（778-848 行）で、`splitIntoTokensWithAnsi` が空白区切りの「語」と 1 文字ずつの「CJK 文字」にトークン化する。`cjkBreakRegex`（45 行、`Script_Extensions` が Han/Hiragana/Katakana/Hangul/Bopomofo）に一致する書記素は 1 つずつ独立トークンになり（707-712 行）、語の途中でも折り返せる。
- Kitty の行ダイアクリティカル表の 0 番目 U+0305（COMBINING OVERLINE）は `cjkBreakRegex` に一致する（実験 `wrap-check.mjs`: `cjkBreakRegex U+0305: true`）。そのため「U+10EEEE + U+0305 + 列ダイアクリティカル」の各クラスタは CJK 扱いになり、列が行末で 1 セル単位に分断される（実験 1: 幅 16 で `The state is ` + 3 セル / 次行に 2 セル）。分断された次行の先頭には `AnsiCodeTracker` が前景色 `ESC[38;5;42m` を付け直す（`utils.js:820-833`）ので、色情報は残る。
- ダイアクリティカル無し（U+10EEEE のみ）の列は 1 語として扱われ、幅に収まらなければ列ごと次行へ送られる（実験 `wrap-check.mjs`）。列の幅が `availableWidth` を超える場合は `breakLongWord`（862-930 行）で書記素単位に分断される。
- 分断されたとき Kitty 側がどう描くかはこの調査では未検証（実端末で確認していない）。仕様上、行・列ダイアクリティカルが明示されていれば各セルは独立に位置を持つので、ダイアクリティカル付きなら分断後も各セルが対応する画像領域を描く見込み（推測）。省略形（継承に依存）で分断されると、次行の先頭セルは「左隣」を持たないため位置情報を失う（仕様の継承規則から導かれる帰結。推測）。

(d) 自前の SGR がテーマ色に上書きされるか（確認済み: されないが、自前のリセットが本文の色を消す）。

- アシスタント本文の `Markdown` は `defaultTextStyle` を渡さずに生成される（`pi-coding-agent/dist/modes/interactive/components/assistant-message.js:82`: `new Markdown(content.text.trim(), this.outputPad, 0, this.markdownTheme, undefined, { transform })`）。`applyDefaultStyle`（`markdown.js:265-287`）は `defaultTextStyle` が無ければ何もしない。したがって本文中の SGR は前後にテーマ色を挟まれず、そのまま出る（実験 3）。
- thinking ブロックは `color: theme.fg("thinkingText")` 付きで生成される（`assistant-message.js:113-119`）。この場合 `applyDefaultStyle` が text トークン全体を `ESC[38;2;...m ... ESC[39m` で包むため、自前の `ESC[39m` 以降の同一トークン内の文字はテーマ色を失う（実験 1 `inSentence`: 列の後の `and then more words` に色プレフィックスが無い）。
- 太字などのテーマ関数はトークン単位で `ESC[1m ... ESC[22m` を付けるだけで前景色には触れない（実験 3）。

### E2. 画像データの転送経路と文書化の範囲

placeholder を描くには、先に画像を `a=T,U=1` で端末へ転送しておく必要がある。拡張が端末に生バイトを書ける経路は次の 3 つ。

1. 部品の `render(width)` が返す行に APC を含める。TUI は行文字列をそのまま端末に書く（`pi-tui/dist/tui-main-screen.js:189-203, 385-432`）。`Image` 部品自体がこの経路で画像を出しており（`components/image.js:42-74`）、拡張が返す `Component`（`renderResult`、`registerEntryRenderer`、`ctx.ui.setWidget`、`ctx.ui.custom`）でも同じ。`docs/extensions.md:2224` は「A defined `renderCall` or `renderResult` must return a `Component`」、`docs/tui.md:310-327` は「Each line from `render()` must not exceed the `width` parameter」を定めるだけで、行の中身に制限は書かれていない。**文書化された API の範囲内**だが、「画像行を書いてよい」とは明記されていない。
2. `registerMarkdownTransformer` の戻り値に APC を含める。Markdown 部品は `isImageLine(line)`（`ESC _ G` または `ESC ] 1337;File=` を含む行、`terminal-image.js:106-113`）を折り返し・余白付与の対象から外す（`markdown.js:214-216, 226-229`）。実験 2 で、転送 APC だけの段落は `w=0 image=true` の 1 行として出力され、`marked` による改変は無かった（`_G` が強調記法として解釈されることも無い: `underscoreCheck` で `_x_` だけが斜体になった）。`docs/extensions.md:1579-1598` は戻り値を「transformed Markdown」とだけ定めており、制御シーケンスの可否には触れていない。
3. `tui.terminal.write(data)`。`TUI.terminal: Terminal` は `pi-tui/dist/tui.d.ts:147` で public、`Terminal.write` は `terminal.d.ts` と pi-tui 同梱 `README.md:664-680` に記載。しかし Pi の拡張ドキュメントで `tui` 引数に触れるのは `docs/extensions.md:2733`「`tui` - TUI instance (for screen dimensions, focus management)」と `docs/tui.md:98` の `tui.requestRender()` だけで、`tui.terminal` や `write` は `docs/extensions.md` / `docs/tui.md` のどこにも出てこない（grep 0 件）。**型定義上は公開だが文書化されていない。**

いずれの経路でも、tmux / screen 下では pi-tui の `getCapabilities().images` が `null` になり、`Image` 部品と `renderImage` は画像を出さない（B3）。経路 1・2 で自前の APC を書くこと自体は能力判定を経由しないが、tmux が APC を外側端末へ通すかどうかはこの調査の範囲外（未確認）。

TUI 側の Kitty 画像追跡（確認済み、経路 1・2 に共通して効く）:

- `tui-main-screen.js:7-36` `parseKittyImageHeader` は、行の**最初の** `ESC _ G` ヘッダから `i=`（画像 ID）と `r=`（行数）を読む。`U=1` の有無は見ない。
- 差分描画時、変更範囲の旧行に含まれていた ID は `deleteKittyImage(id)` = `ESC _ G a=d,d=I,i=<id>,q=2 ESC \`（`terminal-image.js:161-163`）で削除される（`deleteChangedKittyImages`、`tui-main-screen.js:139-152`、呼び出し 349 行）。`d=I` は画像データごと消し、Kitty 仕様では「d key is equal to `i`, `I`, `r`, `R`, `n` or `N`」のとき仮想配置も削除対象。全面再描画（幅・高さ変更など、`fullRender(true)`、178-184 行）では前回の全 ID を削除してから全行を再送する。つまり転送 APC を含む行が再描画範囲に入るたびに削除→再転送が起き、その行が描画から消えれば仮想配置も消える。
- `r=` が 2 以上の行は複数行画像として扱われ、直後の空行が「予約行」に組み込まれる（`getKittyImageReservedRows`、109-122 行）。仮想配置の転送を 1 行に置く場合、`r=` の値がそのまま予約行数になる。

### E3. Markdown 部品の LaTeX 描画を差し替える公式の口

- `MarkdownOptions`（`pi-tui/dist/components/markdown.d.ts`）: `preserveOrderedListMarkers`, `preserveBackslashEscapes`, `transform`, `renderLatex?: boolean`（「Render supported LaTeX math expressions as Unicode text (default: true)」）。真偽値のみで、描画関数を差し込む口は無い。
- `renderLatex(source, { display?: boolean })`（`pi-tui/dist/latex.d.ts`）: 引数は文字列と `display` だけ。
- Pi 側の設定: `docs/settings.md:265-270` の Markdown 設定は `markdown.codeBlockIndent` と `markdown.mermaid` のみ。LaTeX の有効・無効や描画方式を選ぶ設定キーは無い。
- アシスタント本文の `Markdown` 生成箇所（`assistant-message.js:82-84`）は `options` に `transform` しか渡さないため、拡張から `renderLatex: false` を指定する手段も無い。
- `CHANGELOG.md`: 0.84.0 の「Mermaid and LaTeX rendering」（178 行）、「Added inherited terminal-friendly Unicode rendering for LaTeX expressions in Markdown」（274 行）、0.84.1〜0.84.3 の修正（120, 137, 170 行）。いずれも差し替え口には触れていない。
- 順序の事実: `transform` は字句解析の前に走る（`markdown.js:186` → `199`）。変換後の Markdown に `$...$` が残っていれば Pi 組み込みの Unicode 整形が適用され、残っていなければ適用されない（実験 3: ストリーミング中に変換をスキップした場合 `$|0\rangle$` は `|0⟩` になり、`$plain:|0>$` は `plain:|0 >` になった）。

結論: **なし**。`registerMarkdownTransformer` で `$...$` を先に別の文字列へ置き換えることで組み込み描画を回避する、という間接的な方法だけが公開 API の範囲にある。

### E4. 代替案の実現性

(i) イベントで LaTeX を検出し、`pi.appendEntry` + `registerEntryRenderer` で画像エントリを追加する方式

- イベントと引数: `message_end`（`docs/extensions.md:597-631`）は `event.message` を持ち、user / assistant / toolResult で発火。`turn_end`（583-596 行）は `event.turnIndex`, `event.message`, `event.toolResults`。`agent_end` は `event.messages`（`agent-session.js:449`）。
- 発火順序（`pi-coding-agent/dist/core/agent-session.js:366-381`）: 拡張への `message_end` 通知（`_emitExtensionEvent`）→ TUI などのリスナーへ通知（`_emit`）→ `sessionManager.appendMessage`。TUI の `message_end` 処理（`interactive-mode.js:2650-2688`）が `streamingComponent = undefined` にするのは 2684 行で、拡張ハンドラの実行より後。
- `appendEntry` の実装（`agent-session.js:1954-1960`）: `sessionManager.appendCustomEntry`（`session-manager.js:820-830`、`data` ごとセッションファイルに永続化）→ `entry_appended` を emit → TUI の `addCustomEntryToChat`（`interactive-mode.js:2591-2595, 2895-2913`）。`streamingComponent` が存在すれば**その直前に**挿入し（2904-2909 行）、無ければ末尾に追加する。
- したがって、拡張の `message_end` ハンドラ内で `appendEntry` すると、まだ `streamingComponent` が残っているため画像エントリはアシスタント本文の**上**に入る（コード上の帰結。TTY での目視は未実施）。`turn_end` / `agent_end`（`agent-session.js:459-467, 449`）の時点では TUI 側の `message_end` 処理が終わって `streamingComponent` は解除済みなので、末尾（本文の下）に追加される。
- レンダラーは `(entry, { expanded }, theme) => Component | undefined`（`types.d.ts:871-875`）。`Image` 部品を返せる（`tool-execution.js:300` と同じ構成）。`CustomEntryComponent`（`custom-entry.js:31-52`）は先頭に `Spacer(1)` を付けて描く。
- エントリはセッションに永続化され、復元時にも `addCustomEntryToChat` で再描画される（`interactive-mode.js:3005`）。`data` に PNG の base64 を入れればセッションファイルに画像が残り、入れなければ復元時にレンダラー側で再生成が必要になる。
- 既存の Markdown 本文の表示を隠す公式手段: `docs/extensions.md` に「メッセージを非表示にする」API は無い（grep `hide|hidden|display: false` は `setWorkingVisible`, `setWorkingIndicator`, オーバーレイの `setHidden` のみ）。`message_end` の戻り値 `{ message }` は「replace the finalized message」（`docs/extensions.md:601`）で、`_replaceMessageInPlace`（`agent-session.js:489-500`）によりセッション履歴とモデル文脈の両方が置き換わる。表示専用ではない。`registerMarkdownTransformer` で本文から数式部分を消す（空文字や短い印に置換する）ことは表示専用で可能。

(ii) `ctx.ui.custom` のオーバーレイに数式画像を並べる方式

- API: `ctx.ui.custom(factory, { overlay: true, overlayOptions })`（`docs/extensions.md:2743-2775`、実験的機能と明記）。`done()` を呼ぶまで表示され、`custom()` は Promise を返す。
- オーバーレイ合成（`pi-tui/dist/tui.js:74-95` `compositeTuiLine`）: 下地行が画像行ならオーバーレイを描かず下地を返す（75 行）。オーバーレイ行は `sliceWithWidth` で幅に切り詰めてから下地に埋め込む。実験 2 で、APC 転送 + placeholder を含むオーバーレイ行を合成したところ、APC も placeholder も残った（`contains APC? true contains placeholders? true w= 40`）。placeholder だけの行は前後に `ESC[0m ESC]8;;BEL` を挟んで埋め込まれた。
- `Image` 部品をオーバーレイ内で使った場合の実端末での見え方は未検証。fullscreen（`TuiAltScreen`）では iTerm2 の画像はテキストのプレースホルダになる（pi-tui `README.md`「Alternate-screen image compatibility」節）。

### E5. 実験

場所: `/tmp/claude-1000/-home-yasuhito-Work-qni-cli/13e30860-9dac-43f2-a63f-e906d311c5ab/scratchpad/pubapi-experiment/`。Pi 本体は起動せず、pi-tui 0.84.3 の `dist/` と pi-coding-agent 0.84.3 の `dist/modes/interactive/components/markdown-transform.js` を Node 26.7.0 から直接呼んだ。Markdown 部品の引数は Pi のアシスタント本文と同じ（`paddingX = 1`, `paddingY = 0`, `defaultTextStyle = undefined`, `options.transform`）。

最小拡張 `.pi/extensions/placeholder-math.ts`（`package.json` の `pi.extensions` に登録）:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PLACEHOLDER = String.fromCodePoint(0x10eeee);

export default function placeholderMathExtension(pi: ExtensionAPI): void {
  pi.registerMarkdownTransformer((markdown, { messageType, isStreaming }) => {
    if (messageType !== "assistant" || isStreaming) return markdown;
    return markdown.replace(/\$([^$\n]+)\$/g, (_match, latex: string) =>
      latex.startsWith("plain:")
        ? `[${latex.slice(6)}]`
        : `\x1b[38;5;42m${PLACEHOLDER.repeat(5)}\x1b[39m`,
    );
  });
}
```

実験 3 `run-extension-transformer.mjs`（拡張を読み込み、`registerMarkdownTransformer` に渡された関数を `createMarkdownTransform("assistant", isStreaming, [transformer])` 経由で適用）:

```js
import { Markdown, visibleWidth } from ".../pi-tui/dist/index.js";
import { createMarkdownTransform } from ".../pi-coding-agent/dist/modes/interactive/components/markdown-transform.js";
import extension from "./.pi/extensions/placeholder-math.ts";

let transformer;
extension({ registerMarkdownTransformer: (fn) => { transformer = fn; } });
const source = "The state is $|0\\rangle$ and the plain one is $plain:|0>$ in **bold** text that goes on long enough to wrap around.";
for (const [label, isStreaming] of [["final", false], ["streaming", true]]) {
  const md = new Markdown(source, 1, 0, theme, undefined,
    { transform: createMarkdownTransform("assistant", isStreaming, [transformer]) });
  for (const line of md.render(40)) console.log(`w=${visibleWidth(line)} ${JSON.stringify(line)}`);
}
```

出力（`ESC` は U+001B）:

```text
transformer registered: function
--- final (isStreaming=false), width=40
  w=40 " The state is ESC[38;5;42m􎻮􎻮􎻮􎻮􎻮ESC[39m and the plain one   "
  w=40 " is [|0>] in ESC[1mboldESC[22m text that goes on     "
  w=40 " long enough to wrap around.            "
--- streaming (isStreaming=true), width=40
  w=40 " The state is |0⟩ and the plain one is  "
  w=40 " plain:|0 > in ESC[1mboldESC[22m text that goes on   "
  w=40 " long enough to wrap around.            "
```

実験 1 `markdown-placeholder.mjs`（幅計算と折り返し。`defaultTextStyle.color` を付けて thinking 相当の条件も見る）の要点:

```text
visibleWidth(U+10EEEE) = 1
visibleWidth(U+10EEEE + U+0305 + U+0305) = 1
visibleWidth(sgr256_noDiacritics) = 5
visibleWidth(sgr256_withDiacritics) = 5
--- inSentence (width=40)  ※ defaultTextStyle.color あり
  w=40 "ESC[38;2;200;200;200mThe state is ESC[38;5;42m􎻮̅̅􎻮̅̍􎻮̅̎􎻮̅̐􎻮̅̒ESC[39m and then more words  "
  w=40 "follow here.ESC[39m                            "
--- inSentence narrow (width=16)
  w=16 "ESC[38;2;200;200;200mThe state is ESC[38;5;42m􎻮̅̅􎻮̅̍􎻮̅̎"
  w=16 "ESC[38;5;42m􎻮̅̐􎻮̅̒ESC[39m and then more"
  w=16 "words follow    "
  w=16 "here.ESC[39m           "
```

実験 2 `markdown-transmission.mjs`（転送 APC を Markdown に埋めた場合。1×1 の透明 PNG、`i=42`）の要点:

```text
--- virtualTransmissionAsParagraph (width=40)
  w=0  image=true  "ESC_Ga=T,f=100,q=2,U=1,i=42,c=5,r=1;iVBORw0K...ErkJggg==ESC\"
  w=40 image=false "                                        "
  w=40 image=false " The state is ESC[38;5;42m􎻮̅̅􎻮̅̍􎻮̅̎􎻮̅̐􎻮̅̒ESC[39m here.               "
--- virtualTransmissionInline (width=40)   ※ 転送 APC と本文を同じ段落に置いた場合
  w=24 image=true  "ESC_Ga=T,...ESC\The state is ESC[38;5;42m􎻮̅̅...ESC[39m here."
--- underscoreCheck (width=40)
  w=8  image=true  "a ESC_Ga=T,...ESC\ b ESC[3mxESC[23m c"
normalizeTerminalOutput(placeholder line) unchanged?  true
normalizeTerminalOutput(virtual line) unchanged?  true
compositeTuiLine(base, overlay=APC+placeholders): contains APC? true contains placeholders? true w= 40
```

`wrap-check.mjs`（折り返し規則）:

```text
cjkBreakRegex U+10EEEE: false
cjkBreakRegex U+0305: true  cluster: true      ※ 行ダイアクリティカル 0 番
noDia  w16: ["The state is","ESC[38;5;42m􎻮􎻮􎻮􎻮􎻮ESC[39m and more"]
withDia w16: ["The state is ESC[38;5;42m􎻮̅̅􎻮̅̍􎻮̅̎","ESC[38;5;42m􎻮̅̐􎻮̅̒ESC[39m and more"]
```

実験で確認できたこと:

- `marked` と Markdown 部品は SGR、下線色 SGR、APC 転送シーケンス、U+10EEEE、結合ダイアクリティカルのいずれも改変しない。
- U+10EEEE（結合文字付きでも）は 1 セルと数えられ、APC は 0 セル。行幅は `availableWidth` ちょうどに収まる。
- ダイアクリティカル付きの列は 1 セル単位で折り返され、無しの列は 1 語として折り返される。折り返し後の行頭には前景色 SGR が付け直される。
- 転送 APC を独立した段落に置くと、幅 0 の「画像行」+ 空行が本文の前に入る。本文と同じ段落に置くと、その段落全体が画像行扱いになり折り返されない。
- 実端末（Kitty / Ghostty）での表示は未検証。herdr 環境では画像が無効なため目視できない。

### E6. 結論

**条件付きで可能**。根拠: (1) `registerMarkdownTransformer` は公式 API で、その戻り値に含めた SGR・U+10EEEE・結合文字・APC を Markdown 部品はそのまま端末行に出す（E1、E5 で確認）。(2) 画像転送は、同じ transformer の戻り値に APC 行として含めるか、`renderResult` / `registerEntryRenderer` / `ctx.ui.setWidget` / `ctx.ui.custom` が返す `Component` の `render()` 行に含めることで、文書化された API の範囲内で端末に届く（E2）。(3) `Markdown.prototype` の書き換えは不要。

条件:

1. 端末が Kitty Unicode placeholder に対応していること（Kitty / Ghostty。pi-math も同じ判定を環境変数で行う、`kitty-graphics.ts:43-56`）。iTerm2 にはこの方式は無く、tmux / screen 下では pi-tui が画像を無効にする（B3）。
2. 画像データの転送行を、placeholder を含む本文より前に、かつ本文と同じ再描画範囲で出すこと。TUI は行の最初の `ESC _ G` から `i=` を読み、その行が再描画範囲に入るたびに `d=I` で削除して再送し、行が消えれば仮想配置も消える（E2）。transformer の戻り値に転送行を含める場合、独立段落なら幅 0 の行と空行が 1 組増え、本文と同じ段落なら折り返しが無効になる（E5 実験 2）。`r=` が 2 以上だと予約行として扱われる（`tui-main-screen.js:109-122`）。
3. placeholder 列に行・列ダイアクリティカルを付ける場合、U+0305 が CJK 扱いになり列が 1 セル単位で折り返される。付けない場合は 1 語として折り返される（E1(c)）。分断後の表示は実端末で未検証。
4. 本文用の `Markdown` は `defaultTextStyle` 無しなので自前の前景色はテーマに上書きされないが、thinking ブロック（色付き）では自前の `ESC[39m` 以降がテーマ色を失う（E1(d)）。
5. `isStreaming` 中は変換を避けるか、変換した場合も毎回の再描画で転送が繰り返されることを受け入れること（`docs/extensions.md:1598` は同期・軽量を要求）。
6. `tui.terminal.write` に頼る場合は、型定義上は公開だが `docs/` に記載が無い API に依存する（E2）。
7. ラスタ寸法の取得に使う `getCellDimensions` などは pi-tui の公開 export だが、セル寸法の問い合わせは起動時のみ（D6）。
8. 実端末での表示確認は未実施。上記はコード読解と Node 上の描画結果に基づく。

## qni-cli への示唆

設計判断に効く事実だけを列挙する（提案は書かない）。

- Pi 0.84.3 は、ユーザー／アシスタント本文とカスタムメッセージ（既定描画）に含まれる `$...$` / `$$...$$` / `\(...\)` / `\[...\]` を、拡張無しで Unicode 文字に整形する（B6）。`|0\rangle`、`\otimes`、`\frac`、`\sqrt`、`pmatrix`、`\sum` は動く。`\ket` / `\bra` は非対応で原文表示になる。
- ツール結果の既定描画は `Text` 部品で、LaTeX 整形も Markdown も通らない（B4、`tool-execution.js:115-123`）。ツール結果に数式を出すなら `renderResult` で部品を返す必要があり、`Markdown` 部品や `renderLatex` を pi-tui からそのまま使える。
- `pi.registerMarkdownTransformer` はユーザー／アシスタント本文専用で、ツール結果とカスタムメッセージには効かない（B1）。同期・軽量が要件で、幅変更やストリーミング更新のたびに再実行される。
- 端末画像は tmux / screen 下では Pi 側で完全に無効になる（`terminal-image.js:44-50`）。画像方式はこの環境で必ずテキストにフォールバックする。
- ツール結果の `content` に `type: "image"` の PNG を入れると、`terminal.showImages`（既定 true）と端末能力に応じて Pi が自動で描く（B2）。Kitty 系では PNG 以外は変換され、変換できなければ表示されない。
- pi-math の画像方式は `mathjax-full`（約 34 MB、deprecated 警告あり）と `@resvg/resvg-js`（プラットフォーム別ネイティブ `.node` 約 4 MB）に依存し、実測で `node_modules` に 55 MB を追加する（A5）。qni-cli の現在の `dependencies` は `yaml` のみ。
- pi-math は `Markdown.prototype.render` をプロセス全体で書き換える方式で、Pi 0.80.6 を対象に書かれている（A2）。Pi 0.84.x で Markdown 部品自身が LaTeX をトークン化するようになった後の共存動作は本調査では未確認（推測: pi-math はトークン化前にマーカーへ置換するため干渉しないが、画像不可時は Pi 組み込みの Unicode 整形に落ちる）。
- pi-math は Pi の設定（`terminal.showImages` など）を参照せず、独自の環境変数と `/math-render` コマンドで制御する（A3, `config.ts`）。
- Pi パッケージとしての依存規則は明確で、`@earendil-works/pi-tui` などは `peerDependencies: "*"`、第三者依存は `dependencies`、インストールは `npm install --omit=dev`（B5）。qni-cli の `package.json` は現在 `pi.skills` だけを宣言している。
- `renderLatex` の対応範囲や Markdown 内の LaTeX トークン化は `docs/` に未記載で、CHANGELOG と `pi-tui/dist` のコードだけが根拠になる（B6）。安定 API として扱う場合はこの点に注意が要る。
- Pi の画像可否判定は環境変数のみで、端末への問い合わせはしない（D1）。tmux 下では Kitty 判定より先に `images: null` が確定し、pi-math もこれに従う（D5）。
- 拡張が端末へ問い合わせて応答を読む経路は存在する（`tui.terminal.write` + `tui.addInputListener`、D3）が、`TUI` オブジェクトは UI ファクトリ引数からしか得られず、`docs/extensions.md` には未記載。Kitty の応答は APC として 1 シーケンスで届く（D2）。
- `setCapabilities()` は公開 export で、Pi 全体の画像判定を上書きできる（D6）。ただしセル寸法の問い合わせは起動時の一度だけなので、後から画像を有効化してもセル寸法は既定値のまま。
- 公開 API だけでの本文画像化は条件付きで可能（E6）。`registerMarkdownTransformer` の戻り値に含めた SGR・U+10EEEE・APC は Markdown 部品を素通りし（E5 で確認）、転送 APC を含む行は画像行として折り返し対象外になる。Kitty / Ghostty 限定、実端末未検証。
- Markdown 部品の LaTeX 描画を差し替える公式の口は無い（E3）。transformer で `$...$` を先に置き換えることでしか組み込み Unicode 整形を回避できない。
- `message_end` ハンドラ内の `appendEntry` は本文の上に入り、`turn_end` / `agent_end` では本文の下に入る（E4）。本文を表示だけ隠す公式 API は無く、`message_end` の置換はセッションとモデル文脈も書き換える。

## F. 実端末での検証結果（2026-08-28、プロトタイプ）

節 E の「条件付きで可能」を、Xvfb 上の本物の Ghostty 1.3.1 と Kitty で目視確認した。手順は `docs/research/headless-terminal-visual-check.md`、コードと画像は `prototype/qni-math` ブランチ（`ANSWERS.md` の追補）にある。

- `registerMarkdownTransformer` の戻り値だけで、インライン数式と表示数式の画像が Ghostty / Kitty の Pi 本文に表示された。ストリーミング中は閉じた数式から順に画像化され、完了後に残像は出ない。非公開 API は使っていない。
- 成立条件が二つ見つかった。
  1. 転送 APC（`a=t` と `a=p,U=1`）は、メッセージ先頭の **1 行**にすべてまとめる。数式ごとに別行に置くと、pi-tui の再描画で「転送行数 − 1」行ぶん内容がずれ、前の描画が残る。末尾に置くとさらに悪い。
  2. プレースホルダーの色指定は前景色 `ESC[38;2;r;g;b m` だけにする。下線色 `ESC[58;2;...m` を付けると、pi-tui が折り返し行の先頭で SGR を付け直す際に `58;2;r;g;b` を理解できず、末尾の引数を `ESC[2;<b>m`（明るい背景色）として再発行し、行全体に色の帯が出る。
- U+10EEEE と結合文字の桁送りは、Ghostty / Kitty ともに 1 セル（`CSI 6n` で実測）。pi-tui の幅計算と一致する。
- インライン数式は 1 行高に収める。2 行にすると本文と重なる。
- ツール結果ブロックは `registerTool` の `renderResult` で `Image` 部品を返す方式で成立する。
