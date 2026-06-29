# Ruby fallback 削除前の準備状況棚卸し

作成日: 2026-06-29
関連: #83, #271, #272, #273, #274

## 結論

#83 の Ruby fallback / Ruby 実行時依存削除には、まだ入らない。

公開コマンド本体は TypeScript 実装または維持する非 Ruby 補助プログラム境界へ移行済みだが、次の理由で #83 の削除条件は未達である。

- dispatcher-level の Ruby fallback と `QNI_USE_RUBY=1` がまだ残っている。
- `README.md`、`.github/workflows/ci.yml`、`Rakefile` は通常の開発・検証経路として Ruby / Bundler を要求している。
- `Gemfile`、`bin/qni`、`lib/qni/**`、Ruby テスト群が Ruby 基準実装・履歴検証用に残っている。
- npm 配布で Ruby fallback を使わないリリースサイクルをまだ完了していない。

この棚卸し中に、Ruby fallback 削除前の小さな阻害要因として `qni clear` と最上位ヘルプを切り出した。

- #272: `qni clear` を TypeScript route に移行する。
- #273: `qni` / `qni --help` / `qni -h` / `qni help ...` を TypeScript route に移行する。

その後、#274 でコマンド内部の Ruby fallback 分岐もなくした。

## 公開コマンドと現在の境界

| 経路 | 現在の境界 | #83 前の扱い |
| --- | --- | --- |
| `qni`, `qni --help`, `qni -h` | TypeScript route | `QNI_USE_RUBY=1` の強制 fallback は #83 まで残す。 |
| `qni help ...` | TypeScript route | 既存仕様どおり失敗する。 |
| `qni add` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni benchmark` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni bloch` | TypeScript 実装 + Python 画像補助プログラム | Python 補助プログラムは維持する非 Ruby 境界。 |
| `qni clear` | TypeScript route | #272 で移行。 |
| `qni expect` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni export` | TypeScript 実装 + `pdflatex` / `pdftocairo` / Python 補助プログラム | 外部ツールと Python 補助プログラムは維持する非 Ruby 境界。 |
| `qni gate` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni rm` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni run` | TypeScript 数値実行 + Python 記号計算補助プログラム | Python 補助プログラムは維持する非 Ruby 境界。 |
| `qni state` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni variable` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| `qni view` | TypeScript 実装 | Ruby fallback 削除の直接阻害要因なし。 |
| 未知の最上位コマンド | TypeScript エラー | Ruby fallback 削除の直接阻害要因なし。 |

## 残っている Ruby fallback / Ruby 実行時依存の参照

### 実行時 fallback

- `src/dispatcher.ts`
  - `QNI_USE_RUBY=1` の場合だけ `runRubyFallbackSync` を呼ぶ。
- `src/process/process_compatibility.ts`
  - `QNI_USE_RUBY=1` 判定、`bundle exec bin/qni` 呼び出し、同期・非同期 fallback 実行を保持している。

`src/commands/**/*.ts` からは `runRubyFallbackSync` の参照を削除済みである。

### Ruby 実装・検証資産

- `Gemfile`, `Gemfile.lock`
- `Rakefile`
- `bin/qni`
- `lib/qni/**`
- `test/**/*.rb`
- `.rubocop.yml`, `.reek.yml` など Ruby 品質チェック設定

これらは #83 でまとめて消すのではなく、Node ベース全体チェックとリリース検証が整ってから、最終片付けとして扱う。

### CI とドキュメント

- `.github/workflows/ci.yml`
  - Ruby セットアップ、Bundler キャッシュ、`bundle exec rake check` を使っている。
- `README.md`
  - `qni-cli` を Ruby CLI と説明している。
  - セットアップで Ruby 依存のインストールを案内している。
  - Quick Start と例が `bundle exec bin/qni` 前提になっている。
  - `QNI_USE_RUBY=1` の運用説明が残っている。
- `docs/benchmark.md`
  - 開発中は `qni` を `bundle exec bin/qni` に読み替える説明がある。

履歴として残す古い計画書や仕様書には Ruby への言及が多いが、#83 の通常利用手順から Ruby を外す対象は、まず README、CI、現在の利用ドキュメントに絞る。

## #83 に進む前のチェックリスト

- [x] #274 を完了し、`src/commands/**/*.ts` から `runRubyFallbackSync` import をなくす。
- [x] 未知の最上位コマンドを TypeScript 側で処理し、dispatcher が通常入力で Ruby に委譲しないことを確認する。
- [x] `QNI_USE_RUBY=1` なしの npm エントリーポイントで cucumber-js Markdown 機能ファイルが通ることを確認する。
- [ ] Node ベースの全体チェックを定義する。少なくとも `npm run build`、`npm run test:ts`、`npm run cucumber` を含める。
- [ ] `bundle exec rake check` を最終 cleanup 前の履歴検証として残すのか、Node ベース全体チェックへ置き換えるのかを決める。
- [ ] README の通常セットアップ・Quick Start・開発手順を npm / Node 経路へ更新する。
- [ ] CI を Node ベースの通常検証へ切り替える。Ruby 基準比較を残す場合は、通常利用経路とは分ける。
- [ ] Ruby 基準比較の最終アーカイブまたは参照先を残す。
- [ ] npm 配布で Ruby fallback を使わないリリースサイクルを1回完了する。
- [ ] rollback plan と release note の要点を用意する。

## #83 で削除する候補

- dispatcher の Ruby fallback 経路。
- `QNI_USE_RUBY` override。
- `src/process/process_compatibility.ts` の Ruby fallback 専用 API。
- `bin/qni`、`lib/qni/**`、Ruby テスト、Ruby 品質チェック設定。
- README と現在の利用ドキュメントに残る Ruby 通常経路の説明。

Python 補助プログラム、`pdflatex`、`pdftocairo` は Ruby fallback ではないため、#83 の削除対象ではない。

## 検証コマンド

棚卸し・移行作業では次を使う。

```bash
npm run build
npm run test:ts
npm run cucumber
bundle exec rake check
rg -n "runRubyFallback|QNI_USE_RUBY|bundle exec bin/qni|bundle exec rake|Gemfile|bin/qni|lib/qni|ruby/setup-ruby" README.md docs src test features package.json .github Gemfile Rakefile bin lib
```

このレポートを追加した変更では、最終確認として `bundle exec rake check` を実行する。
