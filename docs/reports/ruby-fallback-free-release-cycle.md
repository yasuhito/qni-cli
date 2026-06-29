# Ruby fallback なし npm リリースサイクル記録

## 状態

status: passed

この記録は #83 の削除条件である「Ruby fallback を使わない npm リリースサイクルを 1 回完了した」ことを保存するためのものです。

## 対象リリース

- npm パッケージバージョン: `0.0.0`
- git タグ: 未作成
- リリース候補または公開済みパッケージ: `npm pack` で作成した `qni-cli-0.0.0.tgz`
- リリース日: 2026-06-29
- 検証者: yasuhito
- 検証対象コミット: `1b3ffef22cad4377fb6e2e006ada55c822500579`

## 完了条件

- [x] npm 経路でパッケージをインストールできる。
- [x] `bundle` を失敗させる shim がある状態で、代表コマンドが成功する。
- [x] `qni --help` が成功する。
- [x] `qni add H --qubit 0 --step 0` が成功する。
- [x] `qni run` が成功する。
- [x] `qni benchmark run` が成功する。
- [x] リリースサイクル中に `QNI_USE_RUBY=1` が不要だった。
- [x] リリースサイクル中に `bundle exec bin/qni` が不要だった。
- [x] 問題があった場合、回避策または修正課題が記録されている。

## 検証コマンド

2026-06-29T22:23:16Z に次を実行し、すべて成功しました。

```bash
npm run check
npm run smoke:package
npm run archive:ruby-comparison
bundle exec rake check
```

主な出力:

```text
npm run check: passed
npm run smoke:package: package smoke passed: qni-cli-0.0.0.tgz
npm run archive:ruby-comparison: Ruby comparison archive passed: 14 case(s)
bundle exec rake check: 65 runs, 185 assertions, 0 failures, 0 errors, 0 skips
```

## 証跡

`npm run smoke:package` は、生成した npm パッケージを一時プロジェクトへインストールし、`bundle` を失敗させる shim を `PATH` 先頭に置いた状態で代表コマンドを実行します。検証中に Ruby fallback が呼ばれた場合は `Ruby fallback unexpectedly invoked: bundle $*` で失敗します。

この検証では次の代表経路が npm パッケージから成功しました。

- `qni --help`
- `qni add H --qubit 0 --step 0`
- `qni run`
- `qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md ...`

同じ検証列で Ruby 比較アーカイブも再生成し、14 件すべてが成功しました。

- `docs/reports/ruby-comparison-archive.md`
- `docs/reports/ruby-comparison-archive.json`

## 判定

Ruby fallback なし npm リリースサイクルは完了しました。#83 の Ruby fallback 削除に進む条件のうち、リリースサイクルに関する blocker は解消済みです。
